import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

from PIL import Image

SPEC = importlib.util.spec_from_file_location('character_registration',
    Path(__file__).parents[1] / 'check-character-registration.py')
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class CharacterRegistrationTest(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        self.registry = self.root / MODULE.REGISTRY
        self.registry.mkdir(parents=True)
        self.image = self.root / 'apps/web/public/assets/child.webp'
        self.image.parent.mkdir(parents=True)
        self.reference = {'id': 'adult', 'type': 'character', 'revision': 'old',
                          'geometry': {'top': .16, 'bottom': .96}}
        self.asset = {
            'id': 'child', 'type': 'character', 'src': '/assets/child.webp',
            'metadata': {'placementReview': {'referenceId': 'adult', 'referenceRevision': 'old',
                                            'heightRatio': .625, 'reason': 'Younger child standing'}},
        }
        (self.registry / 'character-registration-baseline.json').write_text('{"adult":"old"}')

    def write(self, box, baseline=False):
        image = Image.new('RGBA', (800, 1200))
        image.paste((30, 60, 90, 255), box)
        image.save(self.image, 'WEBP', lossless=True)
        left, top, right, bottom = box
        self.asset.update(revision=hashlib.sha256(self.image.read_bytes()).hexdigest(),
                          geometry=dict(left=left/800, right=right/800, top=top/1200,
                                        bottom=bottom/1200, width=800, height=1200))
        (self.registry / 'catalog.json').write_text(json.dumps([self.reference, self.asset]))
        if baseline:
            (self.registry / 'character-registration-baseline.json').write_text(
                json.dumps({'adult': 'old', 'child': self.asset['revision']}))

    def test_accepts_reviewed_new_child_at_intended_scale(self):
        self.write((200, 552, 600, 1152))
        self.assertEqual(MODULE.check(self.root), 1)

    def test_detects_unreviewed_replacement_of_existing_id(self):
        self.write((200, 552, 600, 1152), baseline=True)
        self.assertEqual(MODULE.check(self.root), 0)
        self.asset['metadata'].pop('placementReview')
        self.write((200, 540, 600, 1152))
        with self.assertRaisesRegex(ValueError, 'placementReview'):
            MODULE.check(self.root)

    def test_rejects_clipping_wrong_floor_and_adult_sized_child(self):
        for box, message in [
            ((0, 552, 600, 1152), 'transparent margin'),
            ((200, 500, 600, 1100), 'lower visible edge'),
            ((200, 192, 600, 1152), 'height ratio'),
        ]:
            with self.subTest(box=box):
                self.write(box)
                with self.assertRaisesRegex(ValueError, message):
                    MODULE.check(self.root)
