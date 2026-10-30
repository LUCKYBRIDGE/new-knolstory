import hashlib
import importlib.util
import json
import os
from unittest.mock import patch
from pathlib import Path
import tempfile
import unittest
from PIL import Image, ImageDraw

SPEC = importlib.util.spec_from_file_location('stature_assets', Path(__file__).resolve().parents[1] / 'prepare-character-stature-assets.py')
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class CharacterStatureAssetsTests(unittest.TestCase):
    def fixture(self, root):
        public = root / 'apps/web/public'
        source = public / 'assets/legacy-18da4fc/child.webp'
        source.parent.mkdir(parents=True)
        image = Image.new('RGBA', (800, 1200))
        ImageDraw.Draw(image).rectangle((200, 120, 599, 1149), fill=(30, 100, 190, 255))
        image.save(source, lossless=True)
        digest = hashlib.sha256(source.read_bytes()).hexdigest()
        registry = root / 'packages/asset-registry/src'
        registry.mkdir(parents=True)
        row = {'id': 'child', 'src': '/assets/legacy-18da4fc/child.webp', 'revision': digest,
               'sourcePath': 'public/story-assets/child.webp', 'geometry': MODULE.geometry(image),
               'metadata': {'primaryCharacterId': 'same-child', 'qualityReview': {'sha256': digest, 'decision': 'KEEP'}}}
        (registry / 'catalog.json').write_text(json.dumps([row]))
        plan = [{'id': 'child', 'source': 'assets/legacy-18da4fc/child.webp',
                 'sourceSha256': digest, 'scale': .72}]
        return public, source, row, plan

    def test_uniform_scale_keeps_canvas_and_feet_baseline_with_transparent_headroom(self):
        image = Image.new('RGBA', (800, 1200))
        ImageDraw.Draw(image).rectangle((200, 120, 599, 1149), fill=(10, 100, 200, 255))
        actual, transform = MODULE.pad_character(image, .72)
        original_box = image.getchannel('A').getbbox()
        box = actual.getchannel('A').point(lambda alpha: 255 if alpha > 16 else 0).getbbox()
        self.assertEqual(actual.size, image.size)
        self.assertEqual(box[3], original_box[3])
        self.assertAlmostEqual((box[2] - box[0]) / (box[3] - box[1]), 400 / 1030, delta=.01)
        self.assertGreater(box[1], 390)
        self.assertEqual(actual.getpixel((400, 100))[3], 0)
        self.assertEqual(transform['resizedCanvas'], [576, 864])

    def test_prepare_retains_stable_ids_source_bytes_and_review_history(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            public, original, row, plan = self.fixture(root)
            before = original.read_bytes()
            result = MODULE.prepare(root, plan=plan)
            rows = json.loads((root / 'packages/asset-registry/src/catalog.json').read_text())
            self.assertEqual(rows[0]['id'], 'child')
            self.assertEqual(rows[0]['metadata']['primaryCharacterId'], 'same-child')
            self.assertEqual(original.read_bytes(), before)
            derived = public / rows[0]['src'].lstrip('/')
            self.assertNotEqual(derived, original)
            self.assertEqual(rows[0]['revision'], hashlib.sha256(derived.read_bytes()).hexdigest())
            self.assertEqual(rows[0]['metadata']['qualityReview']['previousSourceReview'], row['metadata']['qualityReview'])
            self.assertEqual(result['transforms'][0]['sourceSha256'], row['revision'])
            snapshot = (root / 'packages/asset-registry/src/catalog.json').read_bytes()
            MODULE.prepare(root, plan=plan)
            self.assertEqual((root / 'packages/asset-registry/src/catalog.json').read_bytes(), snapshot)
            self.assertEqual(original.read_bytes(), before)

    def test_changed_source_fails_before_output_or_catalog_mutation(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            public, original, row, plan = self.fixture(root)
            snapshot = (root / 'packages/asset-registry/src/catalog.json').read_bytes()
            original.write_bytes(b'changed')
            with self.assertRaisesRegex(ValueError, 'source bytes'):
                MODULE.prepare(root, plan=plan)
            self.assertFalse((public / 'assets/characters/stature-v2').exists())
            self.assertEqual((root / 'packages/asset-registry/src/catalog.json').read_bytes(), snapshot)

    def test_restore_mode_recreates_recorded_derivative_without_rewriting_catalog(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            public, original, row, plan = self.fixture(root)
            MODULE.prepare(root, plan=plan)
            catalog_path = root / 'packages/asset-registry/src/catalog.json'
            snapshot = catalog_path.read_bytes()
            recorded = json.loads(snapshot)[0]
            derived = public / recorded['src'].lstrip('/')
            expected_bytes = derived.read_bytes()
            derived.unlink()
            MODULE.prepare(root, plan=plan, update_catalog=False)
            self.assertEqual(derived.read_bytes(), expected_bytes)
            self.assertEqual(catalog_path.read_bytes(), snapshot)

    def test_symlink_destination_cannot_overwrite_legacy_original(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            public, original, row, plan = self.fixture(root)
            snapshot = (root / 'packages/asset-registry/src/catalog.json').read_bytes()
            before = original.read_bytes()
            destination = public / 'assets/characters/stature-v2/child.webp'
            destination.parent.mkdir(parents=True)
            destination.symlink_to(original)
            with self.assertRaisesRegex(ValueError, 'symlink'):
                MODULE.prepare(root, plan=plan)
            self.assertEqual(original.read_bytes(), before)
            self.assertTrue(destination.is_symlink())
            self.assertEqual((root / 'packages/asset-registry/src/catalog.json').read_bytes(), snapshot)

    def test_symlink_parent_cannot_write_outside_the_public_tree(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            public, original, row, plan = self.fixture(root)
            before = original.read_bytes()
            snapshot = (root / 'packages/asset-registry/src/catalog.json').read_bytes()
            outside = root / 'private'
            outside.mkdir()
            parent = public / 'assets/characters'
            parent.symlink_to(outside, target_is_directory=True)
            with self.assertRaisesRegex(ValueError, 'symlink'):
                MODULE.prepare(root, plan=plan)
            self.assertEqual(list(outside.iterdir()), [])
            self.assertEqual(original.read_bytes(), before)
            self.assertEqual((root / 'packages/asset-registry/src/catalog.json').read_bytes(), snapshot)

    def test_catalog_symlink_is_rejected_without_touching_its_target(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            public, original, row, plan = self.fixture(root)
            catalog = root / 'packages/asset-registry/src/catalog.json'
            target = root / 'private-catalog.json'
            target.write_bytes(catalog.read_bytes())
            snapshot = target.read_bytes()
            catalog.unlink()
            catalog.symlink_to(target)
            with self.assertRaisesRegex(ValueError, 'symlink'):
                MODULE.prepare(root, plan=plan)
            self.assertEqual(target.read_bytes(), snapshot)
            self.assertFalse((public / 'assets/characters/stature-v2').exists())

    def test_later_invalid_output_is_preflighted_before_any_earlier_write(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            public, original, row, plan = self.fixture(root)
            bad = {**row, 'id': '../../legacy-18da4fc/child'}
            catalog = root / 'packages/asset-registry/src/catalog.json'
            catalog.write_text(json.dumps([row, bad]))
            snapshot = catalog.read_bytes()
            before = original.read_bytes()
            with self.assertRaisesRegex(ValueError, 'destination'):
                MODULE.prepare(root, plan=plan + [{**plan[0], 'id': bad['id']}])
            self.assertFalse((public / 'assets/characters/stature-v2').exists())
            self.assertEqual(original.read_bytes(), before)
            self.assertEqual(catalog.read_bytes(), snapshot)

    def test_mismatching_restore_does_not_replace_a_good_existing_derivative(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            public, original, row, plan = self.fixture(root)
            MODULE.prepare(root, plan=plan)
            catalog = root / 'packages/asset-registry/src/catalog.json'
            recorded = json.loads(catalog.read_text())
            output = public / recorded[0]['src'].lstrip('/')
            original_output = b'protected previous derivative'
            output.write_bytes(original_output)
            recorded[0]['revision'] = '0' * 64
            catalog.write_text(json.dumps(recorded))
            snapshot = catalog.read_bytes()
            with self.assertRaisesRegex(ValueError, 'differs'):
                MODULE.prepare(root, plan=plan, update_catalog=False)
            self.assertEqual(output.read_bytes(), original_output)
            self.assertEqual(catalog.read_bytes(), snapshot)

    def test_hardlinked_destination_never_truncates_original_inode(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            public, original, row, plan = self.fixture(root)
            before = original.read_bytes()
            destination = public / 'assets/characters/stature-v2/child.webp'
            destination.parent.mkdir(parents=True)
            os.link(original, destination)
            MODULE.prepare(root, plan=plan)
            self.assertEqual(original.read_bytes(), before)
            self.assertNotEqual(destination.stat().st_ino, original.stat().st_ino)

    def test_different_codec_bytes_fail_restore_before_replacing_good_output(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            public, original, row, plan = self.fixture(root)
            MODULE.prepare(root, plan=plan)
            catalog = root / 'packages/asset-registry/src/catalog.json'
            recorded = json.loads(catalog.read_text())[0]
            output = public / recorded['src'].lstrip('/')
            snapshot, good = catalog.read_bytes(), output.read_bytes()
            save = Image.Image.save
            def changed_encoding(image, stream, *args, **kwargs):
                save(image, stream, *args, **kwargs)
                stream.write(b'changed-codec-trailer')
            with patch.object(Image.Image, 'save', changed_encoding):
                with self.assertRaisesRegex(ValueError, 'differs'):
                    MODULE.prepare(root, plan=plan, update_catalog=False)
            self.assertEqual(output.read_bytes(), good)
            self.assertEqual(catalog.read_bytes(), snapshot)

    def test_invalid_scale_cannot_enlarge_or_collapse_a_character(self):
        image = Image.new('RGBA', (800, 1200))
        for scale in [0, -1, 1.1, float('nan'), True]:
            with self.assertRaises(ValueError):
                MODULE.pad_character(image, scale)


if __name__ == '__main__':
    unittest.main()
