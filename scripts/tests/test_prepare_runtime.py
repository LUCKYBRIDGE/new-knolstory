import hashlib
import importlib.util
import io
import json
from pathlib import Path
import tarfile
import tempfile
import unittest
from unittest.mock import patch
import zipfile

SPEC = importlib.util.spec_from_file_location(
    'prepare_runtime', Path(__file__).resolve().parents[1] / 'prepare-runtime.py')
runtime = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(runtime)


class RuntimeSetupTests(unittest.TestCase):
    def test_verified_cache_is_reused_without_network(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / 'resource'
            target.write_bytes(b'pinned')
            with patch.object(runtime.urllib.request, 'urlopen') as request:
                runtime.fetch_verified('https://example.invalid/file', target,
                                       hashlib.sha256(b'pinned').hexdigest())
            request.assert_not_called()

    def test_bad_cache_is_rejected_and_preserved(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / 'resource'
            target.write_bytes(b'corrupt')
            with self.assertRaisesRegex(ValueError, 'checksum'):
                runtime.fetch_verified('https://example.invalid/file', target, '0' * 64)
            self.assertEqual(target.read_bytes(), b'corrupt')

    def test_bad_download_never_becomes_cached_resource(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / 'resource'
            with patch.object(runtime.urllib.request, 'urlopen',
                              return_value=io.BytesIO(b'corrupt')):
                with self.assertRaisesRegex(ValueError, 'checksum'):
                    runtime.fetch_verified('https://example.invalid/file', target, '0' * 64)
            self.assertFalse(target.exists())
            self.assertEqual(list(Path(directory).iterdir()), [])

    def test_verified_download_is_published_atomically(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / 'resource'
            with patch.object(runtime.urllib.request, 'urlopen',
                              return_value=io.BytesIO(b'pinned')):
                runtime.fetch_verified('https://example.invalid/file', target,
                                       hashlib.sha256(b'pinned').hexdigest())
            self.assertEqual(target.read_bytes(), b'pinned')
            self.assertEqual(list(Path(directory).iterdir()), [target])

    def test_tar_traversal_and_symlinks_are_rejected_before_writing(self):
        for name, kind in [('../escape', tarfile.REGTYPE),
                           ('link', tarfile.SYMTYPE)]:
            with self.subTest(name=name), tempfile.TemporaryDirectory() as directory:
                root = Path(directory)
                archive = root / 'input.tar.bz2'
                with tarfile.open(archive, 'w:bz2') as output:
                    valid = tarfile.TarInfo('valid')
                    valid.size = 2
                    output.addfile(valid, io.BytesIO(b'ok'))
                    member = tarfile.TarInfo(name)
                    member.type = kind
                    member.linkname = '../escape'
                    output.addfile(member)
                destination = root / 'output'
                destination.mkdir()
                with self.assertRaises(ValueError):
                    runtime.extract_tar(archive, destination)
                self.assertEqual(list(destination.iterdir()), [])

    def test_zip_traversal_and_symlinks_are_rejected(self):
        for name, mode in [('../escape', 0o100644), ('link', 0o120777),
                           ('C:/escape', 0o100644)]:
            with self.subTest(name=name), tempfile.TemporaryDirectory() as directory:
                root = Path(directory)
                archive = root / 'input.zip'
                with zipfile.ZipFile(archive, 'w') as output:
                    info = zipfile.ZipInfo(name)
                    info.external_attr = mode << 16
                    output.writestr(info, '../escape')
                with self.assertRaises(ValueError):
                    runtime.extract_zip(archive, root / 'output')

    def test_manifest_detects_modified_installation(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'renpy.sh').write_text('original')
            manifest = runtime.file_manifest(root)
            self.assertTrue(runtime.manifest_matches(root, manifest))
            (root / 'renpy.sh').write_text('modified')
            self.assertFalse(runtime.manifest_matches(root, manifest))

    def test_prepare_reuses_sdk_after_build_regenerates_bytecode(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            sdk = root / runtime.SDK_NAME
            bytecode = sdk / 'renpy/__pycache__/main.cpython-312.pyc'
            bytecode.parent.mkdir(parents=True)
            bytecode.write_bytes(b'bundled bytecode')
            source = sdk / 'renpy/main.py'
            source.write_text('pinned source')
            files = runtime.file_manifest(sdk)
            marker = {'resources': {name: resource[1]
                                    for name, resource in runtime.RESOURCES.items()},
                      'files': files}
            (sdk / runtime.MARKER).write_text(json.dumps(marker))
            bytecode.write_bytes(b'regenerated during normal web build')
            with patch.object(runtime, 'fetch_verified'):
                runtime.install(root)
            self.assertNotIn('renpy/__pycache__/main.cpython-312.pyc', files)
            self.assertIn('renpy/main.py', files)
            source.write_text('unexpected changed source')
            with patch.object(runtime, 'fetch_verified'):
                with self.assertRaisesRegex(ValueError, 'modified'):
                    runtime.install(root)

    def test_older_marker_ignores_only_regenerated_bytecode(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'main.py').write_text('pinned source')
            manifest = runtime.file_manifest(root)
            manifest['__pycache__/main.cpython-312.pyc'] = 'outdated-bytecode-hash'
            self.assertTrue(runtime.manifest_matches(root, manifest))
            (root / 'main.py').write_text('changed source')
            self.assertFalse(runtime.manifest_matches(root, manifest))

    def test_manifest_rejects_added_source_but_accepts_build_state(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / 'renpy/main.py'
            source.parent.mkdir()
            source.write_text('pinned source')
            manifest = runtime.file_manifest(root)
            for name in ('tmp/responsive-spike/navigation.json',
                         'launcher/game/saves/persistent', 'launcher/log.txt'):
                generated = root / name
                generated.parent.mkdir(parents=True, exist_ok=True)
                generated.write_text('generated during build')
            self.assertTrue(runtime.manifest_matches(root, manifest))
            added_source = root / 'renpy/injected.py'
            added_source.write_text('unexpected new source')
            self.assertFalse(runtime.manifest_matches(root, manifest))
            added_source.unlink()
            source.write_text('changed source')
            self.assertFalse(runtime.manifest_matches(root, manifest))

    def test_failed_staging_preserves_existing_sdk(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            sdk = root / runtime.SDK_NAME
            sdk.mkdir()
            (sdk / 'renpy.sh').write_text('previous installation')
            with patch.object(runtime, 'fetch_verified'), patch.object(
                    runtime, 'extract_tar', side_effect=ValueError('unsafe archive')):
                with self.assertRaisesRegex(ValueError, 'unsafe archive'):
                    runtime.install(root, reinstall=True)
            self.assertEqual((sdk / 'renpy.sh').read_text(), 'previous installation')
            self.assertEqual(list(root.iterdir()), [sdk])


if __name__ == '__main__':
    unittest.main()
