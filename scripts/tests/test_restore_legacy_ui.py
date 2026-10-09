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


if __name__ == '__main__':
    unittest.main()
