import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

SPEC = importlib.util.spec_from_file_location('restore', Path(__file__).parents[1] / 'restore-legacy-media.py')
RESTORE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(RESTORE)


class LegacyRoomRestoreTests(unittest.TestCase):
    def setup_root(self, root, filename='apps/web/public/assets/legacy-ui/room.webp'):
        folder = root / 'packages/asset-registry/src'
        folder.mkdir(parents=True)
        (folder / 'catalog.json').write_text('[]')
        (folder / 'media-provenance.json').write_text('{"entries":[]}')
        (folder / 'legacy-ui-media.json').write_text(json.dumps({'entries': [{
            'file': filename, 'sourcePath': 'public/library/parquet-room-clear.webp',
            'sha256': hashlib.sha256(b'fixed room').hexdigest(),
        }]}))

    def test_exact_baseline_room_bytes_are_restored(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            self.setup_root(root)
            commands = []
            def git(args, **kwargs):
                commands.append(args)
                return subprocess.CompletedProcess(args, 0, b'fixed room', b'')
            with patch.object(RESTORE, 'ROOT', root), patch.object(RESTORE.subprocess, 'run', git):
                RESTORE.restore(Path('authorized checkout'))
            self.assertEqual((root / 'apps/web/public/assets/legacy-ui/room.webp').read_bytes(), b'fixed room')
            self.assertIn(RESTORE.BASELINE + ':public/library/parquet-room-clear.webp', commands[-1])

    def test_wrong_hash_does_not_overwrite_existing_room(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            self.setup_root(root)
            target = root / 'apps/web/public/assets/legacy-ui/room.webp'
            target.parent.mkdir(parents=True)
            target.write_bytes(b'preserved')
            with patch.object(RESTORE, 'ROOT', root), patch.object(RESTORE.subprocess, 'run', return_value=subprocess.CompletedProcess([], 0, b'wrong', b'')):
                with self.assertRaisesRegex(SystemExit, 'mismatched'):
                    RESTORE.restore(Path('authorized checkout'))
            self.assertEqual(target.read_bytes(), b'preserved')

    def test_room_destination_cannot_escape_the_local_ui_folder(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            self.setup_root(root, '../outside.webp')
            with patch.object(RESTORE, 'ROOT', root), patch.object(RESTORE.subprocess, 'run', return_value=subprocess.CompletedProcess([], 0, b'fixed room', b'')):
                with self.assertRaisesRegex(SystemExit, 'Invalid'):
                    RESTORE.restore(Path('authorized checkout'))
            self.assertFalse((root.parent / 'outside.webp').exists())


class DerivedCharacterRestoreTests(unittest.TestCase):
    def test_derived_catalog_recreates_from_exact_original_without_rewriting_original(self):
        import io
        from PIL import Image, ImageDraw
        spec = importlib.util.spec_from_file_location('padding_restore_fixture', Path(__file__).parents[1] / 'prepare-character-stature-assets.py')
        padding = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(padding)
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            LegacyRoomRestoreTests().setup_root(root)
            registry = root / 'packages/asset-registry/src'
            (registry / 'legacy-ui-media.json').write_text('{"entries":[]}')
            original = root / 'apps/web/public/assets/legacy-18da4fc/child.webp'
            original.parent.mkdir(parents=True)
            image = Image.new('RGBA', (800, 1200))
            ImageDraw.Draw(image).rectangle((200, 120, 599, 1149), fill=(10, 100, 200, 255))
            image.save(original, lossless=True)
            original_bytes = original.read_bytes()
            sha = hashlib.sha256(original_bytes).hexdigest()
            (registry / 'catalog.json').write_text(json.dumps([{'id': 'child', 'src': '/assets/legacy-18da4fc/child.webp', 'revision': sha, 'sourcePath': 'public/story-assets/child.webp', 'geometry': padding.geometry(image), 'metadata': {}}]))
            plan = [{'id': 'child', 'source': 'assets/legacy-18da4fc/child.webp', 'sourceSha256': sha, 'scale': .72}]
            padding.prepare(root, plan=plan)
            record = json.loads((registry / 'catalog.json').read_text())[0]
            output = root / 'apps/web/public' / record['src'].lstrip('/')
            expected = output.read_bytes()
            output.unlink()
            original.unlink()
            before = (registry / 'catalog.json').read_bytes()
            with patch.object(RESTORE, 'ROOT', root), patch.object(RESTORE.subprocess, 'run', return_value=subprocess.CompletedProcess([], 0, original_bytes, b'')):
                RESTORE.restore(Path('authorized checkout'))
            self.assertEqual(original.read_bytes(), original_bytes)
            self.assertEqual(output.read_bytes(), expected)
            self.assertEqual((registry / 'catalog.json').read_bytes(), before)

    def test_derived_original_symlink_is_rejected_without_overwriting_its_target(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            LegacyRoomRestoreTests().setup_root(root)
            private = root / 'private.webp'
            private.write_bytes(b'protected private image')
            source = root / 'apps/web/public/assets/legacy-18da4fc/child.webp'
            source.parent.mkdir(parents=True)
            source.symlink_to(private)
            catalog = [{'id': 'child', 'src': '/assets/characters/stature-v2/child.webp', 'revision': 'a' * 64, 'sourcePath': 'public/story-assets/child.webp', 'metadata': {'statureTransform': {'source': 'assets/legacy-18da4fc/child.webp', 'sourceSha256': hashlib.sha256(b'restored').hexdigest(), 'scale': .72}}}]
            (root / 'packages/asset-registry/src/catalog.json').write_text(json.dumps(catalog))
            with patch.object(RESTORE, 'ROOT', root), patch.object(RESTORE.subprocess, 'run', return_value=subprocess.CompletedProcess([], 0, b'restored', b'')):
                with self.assertRaisesRegex(SystemExit, 'symlink'):
                    RESTORE.restore(Path('authorized checkout'))
            self.assertEqual(private.read_bytes(), b'protected private image')
            self.assertTrue(source.is_symlink())

    def test_derived_original_hardlink_is_rejected_without_modifying_another_file(self):
        import os
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            LegacyRoomRestoreTests().setup_root(root)
            private = root / 'private.webp'
            private.write_bytes(b'protected private image')
            source = root / 'apps/web/public/assets/legacy-18da4fc/child.webp'
            source.parent.mkdir(parents=True)
            os.link(private, source)
            catalog = [{'id': 'child', 'src': '/assets/characters/stature-v2/child.webp', 'revision': 'a' * 64, 'sourcePath': 'public/story-assets/child.webp', 'metadata': {'statureTransform': {'source': 'assets/legacy-18da4fc/child.webp', 'sourceSha256': hashlib.sha256(b'restored').hexdigest(), 'scale': .72}}}]
            (root / 'packages/asset-registry/src/catalog.json').write_text(json.dumps(catalog))
            with patch.object(RESTORE, 'ROOT', root), patch.object(RESTORE.subprocess, 'run', return_value=subprocess.CompletedProcess([], 0, b'restored', b'')):
                with self.assertRaisesRegex(SystemExit, 'hardlink'):
                    RESTORE.restore(Path('authorized checkout'))
            self.assertEqual(private.read_bytes(), b'protected private image')
            self.assertEqual(source.read_bytes(), b'protected private image')

    def test_invalid_derived_source_path_is_rejected(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            LegacyRoomRestoreTests().setup_root(root)
            catalog = [{'id': 'child', 'src': '/assets/characters/stature-v2/child.webp', 'revision': 'a' * 64, 'sourcePath': 'anything', 'metadata': {'statureTransform': {'source': '../private.webp', 'sourceSha256': 'b' * 64, 'scale': .72}}}]
            (root / 'packages/asset-registry/src/catalog.json').write_text(json.dumps(catalog))
            with patch.object(RESTORE, 'ROOT', root), patch.object(RESTORE.subprocess, 'run', return_value=subprocess.CompletedProcess([], 0, b'ignored', b'')):
                with self.assertRaisesRegex(SystemExit, 'Invalid'):
                    RESTORE.restore(Path('authorized checkout'))


if __name__ == '__main__':
    unittest.main()
