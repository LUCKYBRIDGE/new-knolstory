"""Exercise Bakssi asset registration without creating or altering repository art."""
import importlib.util
import json
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

from PIL import Image, ImageDraw

SCRIPT = Path(__file__).resolve().parents[1] / 'prepare-bakssi-assets.py'
SPEC = importlib.util.spec_from_file_location('prepare_bakssi_assets', SCRIPT)


class BakssiAssetsTest(unittest.TestCase):
    def setUp(self):
        self.pipeline = importlib.util.module_from_spec(SPEC)
        SPEC.loader.exec_module(self.pipeline)
        temporary = TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        self.art = self.root / 'assets/source/bakssi'
        self.art.mkdir(parents=True)
        self.registry = self.root / 'packages/asset-registry/src'
        self.registry.mkdir(parents=True)
        self.reference = {'id': 'reference', 'type': 'character', 'revision': 'a' * 64,
                          'geometry': {'top': .15, 'bottom': .95}}
        (self.registry / 'catalog.json').write_text(json.dumps([self.reference]))
        (self.registry / 'background-sizes.json').write_text('{}')
        (self.registry / 'characters.json').write_text('[]')
        (self.registry / 'project-media-authorization.json').write_text('{"assets":[],"evidence":[]}')
        (self.registry / 'character-emotions.json').write_text('{"characters":[]}')
        contract = self.root / 'packages/runtime-contract/src/index.ts'
        contract.parent.mkdir(parents=True)
        contract.write_text('const paths = new Set([\n  // BEGIN BAKSSI IMAGE PATHS\n  // END BAKSSI IMAGE PATHS\n]);\n')
        self.sprite_id = 'bakssi-character-bakssi'
        self.page_id = 'bakssi-shortstory-page-01'
        self.stage_id = 'bakssi-stage-courtyard-day'
        self.recipe = [
            {'id': self.sprite_id, 'role': 'character', 'label': '박씨', 'identity': 'bakssi.bakssi',
             'referenceId': 'reference', 'heightRatio': .9, 'sizeReason': '성인 키를 기준으로 조정',
             'emotionRole': 'neutral', 'prompt': 'A standing Joseon woman'},
            {'id': self.page_id, 'role': 'page', 'label': '찻잔 두 개', 'characters': ['bakssi.bakssi'],
             'prompt': 'Two cups in candlelight'},
            {'id': self.stage_id, 'role': 'stage', 'label': '피화당 마당', 'location': '피화당',
             'space': 'outdoor', 'time': '낮', 'prompt': 'Empty courtyard'},
        ]

    def record_recipe(self):
        (self.art / 'recipe.json').write_text(json.dumps({'version': 1, 'assets': self.recipe}))

    def draw_sources(self):
        sprite = Image.new('RGBA', (384, 640))
        ImageDraw.Draw(sprite).ellipse((92, 64, 291, 600), fill=(32, 24, 63, 254))
        sprite.save(self.art / (self.sprite_id + '.png'))
        for asset_id in [self.page_id, self.stage_id]:
            Image.new('RGB', (512, 288), 'blue').save(self.art / (asset_id + '.png'))

    def test_registers_sprite_stage_and_page_with_distinct_delivery(self):
        self.record_recipe()
        self.draw_sources()
        self.assertEqual(self.pipeline.prepare(self.root), 3)
        catalogue = json.loads((self.registry / 'catalog.json').read_text())
        self.assertEqual(catalogue[0], self.reference)
        sprite, page, stage = catalogue[1:]
        self.assertEqual(sprite['geometry']['width'], 800)
        self.assertEqual(sprite['geometry']['height'], 1200)
        self.assertEqual(sprite['geometry']['bottom'], .96)
        self.assertEqual(sprite['metadata']['placementReview']['referenceRevision'], 'a' * 64)
        self.assertTrue(page['metadata']['containsCharacters'])
        self.assertEqual(page['metadata']['shortStoryCollection'], 'story')
        self.assertFalse(stage['metadata']['containsCharacters'])
        paths = (self.root / 'packages/runtime-contract/src/index.ts').read_text()
        self.assertIn(stage['src'][1:], paths)
        self.assertIn(sprite['src'][1:], paths)
        self.assertNotIn(page['src'][1:], paths)
        self.assertEqual(self.pipeline.prepare(self.root, check=True), 3)

    def test_rejects_opaque_sprite_before_modifying_catalogue(self):
        self.record_recipe()
        self.draw_sources()
        Image.new('RGBA', (64, 96), (255, 255, 255, 255)).save(self.art / (self.sprite_id + '.png'))
        with self.assertRaisesRegex(ValueError, 'transparent'):
            self.pipeline.prepare(self.root)
        self.assertEqual(json.loads((self.registry / 'catalog.json').read_text()), [self.reference])

    def test_expression_uses_same_identity_and_stature_as_base_sprite(self):
        self.record_recipe()
        self.draw_sources()
        joy_id = self.sprite_id + '-joy'
        sprite = Image.new('RGBA', (384, 640))
        ImageDraw.Draw(sprite).rectangle((90, 68, 300, 600), fill=(50, 20, 34, 255))
        sprite.save(self.art / (joy_id + '.png'))
        self.assertEqual(self.pipeline.prepare(self.root), 4)
        catalogue = {row['id']: row for row in json.loads((self.registry / 'catalog.json').read_text())}
        self.assertEqual(catalogue[joy_id]['metadata']['primaryCharacterId'], 'bakssi.bakssi')
        self.assertEqual(catalogue[joy_id]['metadata']['expressions'], ['기쁨'])
        self.assertEqual(catalogue[joy_id]['geometry']['top'], catalogue[self.sprite_id]['geometry']['top'])
        self.assertEqual(self.pipeline.prepare(self.root, check=True, complete=True), 4)
        with self.assertRaisesRegex(ValueError, 'emotion source PNG missing'):
            self.pipeline.prepare(self.root, check=True, require_emotions=True)

    def test_detects_modified_master_and_never_changes_reviewed_derivative(self):
        self.record_recipe()
        self.draw_sources()
        self.pipeline.prepare(self.root)
        Image.new('RGB', (512, 288), 'green').save(self.art / (self.stage_id + '.png'))
        for check in [False, True]:
            with self.assertRaisesRegex(ValueError, 'source changed'):
                self.pipeline.prepare(self.root, check=check)

    def test_replaces_only_requested_draft_after_checking_the_prior_output(self):
        self.record_recipe()
        self.draw_sources()
        self.pipeline.prepare(self.root)
        source = self.art / (self.page_id + '.png')
        output = self.root / 'apps/web/public/assets/bakssi-v1' / (self.page_id + '.webp')
        prior = output.read_bytes()
        Image.new('RGB', (512, 288), 'green').save(source)
        output.write_bytes(b'corrupt derivative')
        with self.assertRaisesRegex(ValueError, 'prior output'):
            self.pipeline.prepare(self.root, replace_drafts=[self.page_id])
        output.write_bytes(prior)
        self.pipeline.prepare(self.root, replace_drafts=[self.page_id])
        self.assertNotEqual(output.read_bytes(), prior)
        self.assertEqual(self.pipeline.prepare(self.root, check=True), 3)
