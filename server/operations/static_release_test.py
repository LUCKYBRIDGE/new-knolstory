import hashlib
import importlib.util
import json
import os
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('static_release', Path(__file__).with_name('static_release.py'))
release = importlib.util.module_from_spec(spec)
spec.loader.exec_module(release)


class StaticReleaseTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name).resolve()
        self.source = self.root / 'out'
        self.source.mkdir()
        (self.source / 'index.html').write_bytes(b'<html>original</html>')
        (self.source / 'assets').mkdir()
        (self.source / 'assets' / 'sprite.bin').write_bytes(bytes(range(256)) * 8192)
        self.base = self.root / 'private'

    def backup(self):
        return release.backup_release(self.source, self.base)

    def manifest(self, report):
        return self.base / 'backups' / report['run'] / 'manifest.json'

    def rewrite_manifest(self, report, value):
        path = self.manifest(report)
        path.write_text(json.dumps(value))
        return hashlib.sha256(path.read_bytes()).hexdigest()

    def test_roundtrip_and_private_permissions(self):
        report = self.backup()
        backup = self.manifest(report).parent
        self.assertEqual(report['files'], 2)
        self.assertEqual(report['bytes'], 2097173)
        release.verify_release(backup, report['manifestSha256'])
        restored = release.restore_release(report['run'], report['manifestSha256'], self.base)
        root = release.restore_root(restored['restoreRun'], self.base)
        release.verify_release(root, report['manifestSha256'])
        self.assertEqual((root / 'files/index.html').read_bytes(), b'<html>original</html>')
        self.assertEqual((self.source / 'index.html').read_bytes(), b'<html>original</html>')
        for item in self.base.rglob('*'):
            self.assertEqual(item.stat().st_mode & 0o777, 0o700 if item.is_dir() else 0o600)
        second = release.restore_release(report['run'], report['manifestSha256'], self.base)
        self.assertNotEqual(restored['restoreRun'], second['restoreRun'])

    def test_wrong_trust_hash_and_mutated_payload_fail(self):
        report = self.backup()
        with self.assertRaises(ValueError):
            release.restore_release(report['run'], '0' * 64, self.base)
        (self.manifest(report).parent / 'files/index.html').write_bytes(b'tampered')
        with self.assertRaises(ValueError):
            release.restore_release(report['run'], report['manifestSha256'], self.base)

    def test_rejects_links_special_nodes_and_secret_names_without_reading(self):
        for kind in ['symlink', 'hardlink', 'fifo', 'secret']:
            path = self.source / ('password.pem' if kind == 'secret' else 'bad')
            if kind == 'symlink':
                path.symlink_to(self.source / 'index.html')
            elif kind == 'hardlink':
                os.link(self.source / 'index.html', path)
            elif kind == 'fifo':
                os.mkfifo(path)
            else:
                path.write_bytes(b'not a real secret')
            with self.assertRaises(ValueError):
                self.backup()
            path.unlink()

    def test_manifest_rejects_paths_duplicates_sizes_hashes_and_unknown_fields(self):
        report = self.backup()
        original = json.loads(self.manifest(report).read_text())
        invalid = []
        for name in ['../outside', '/absolute', 'C:/drive', 'a\\b', '.env.local', 'a//b', 'a/./b', 'a/../b', 'assets/', 'a\nb', 'a\rb', 'a\tb', 'a\x7fb']:
            value = json.loads(json.dumps(original))
            value['files'][0]['path'] = name
            invalid.append(value)
        for change in [{'bytes': -1}, {'bytes': True}, {'sha256': 'bad'}, {'extra': 1}]:
            value = json.loads(json.dumps(original))
            value['files'][0].update(change)
            invalid.append(value)
        invalid += [{**original, 'version': 2}, {**original, 'extra': 1}, {**original, 'files': original['files'] * 2}]
        for value in invalid:
            sha = self.rewrite_manifest(report, value)
            with self.assertRaises(ValueError):
                release.verify_release(self.manifest(report).parent, sha)

    def test_duplicate_json_keys_extra_files_and_unsafe_modes_fail(self):
        report = self.backup()
        path = self.manifest(report)
        data = path.read_bytes()
        path.write_bytes(b'{"version":1,"version":1,"files":[],"bytes":0}')
        with self.assertRaises(ValueError):
            release.verify_release(path.parent, hashlib.sha256(path.read_bytes()).hexdigest())
        path.write_bytes(data)
        extra = path.parent / 'files/extra.txt'
        extra.write_bytes(b'extra')
        extra.chmod(0o600)
        with self.assertRaises(ValueError):
            release.verify_release(path.parent, report['manifestSha256'])
        extra.unlink()
        path.chmod(0o644)
        with self.assertRaises(ValueError):
            release.verify_release(path.parent, report['manifestSha256'])

    def test_run_and_sha_inputs_are_restricted(self):
        for run in ['../x', '', 'a' * 31, 'A' * 32]:
            with self.assertRaises(ValueError):
                release.restore_release(run, '0' * 64, self.base)
        for sha in ['', 'A' * 64, None]:
            with self.assertRaises(ValueError):
                release.verify_release(self.source, sha)

    def test_source_drift_is_detected_and_partial_backup_retained(self):
        from unittest.mock import patch
        copy = release._copy_file
        def mutate(source, target, entry):
            copy(source, target, entry)
            (self.source / 'new.txt').write_bytes(b'drift')
        with patch.object(release, '_copy_file', mutate):
            with self.assertRaises(ValueError):
                self.backup()
        self.assertTrue(list((self.base / 'backups').iterdir()))

    def test_limits_are_enforced(self):
        from unittest.mock import patch
        for name, limit in [('MAX_FILES', 1), ('MAX_BYTES', 1), ('MAX_MANIFEST_BYTES', 1)]:
            with patch.object(release, name, limit):
                with self.assertRaises(ValueError):
                    self.backup()


    def test_malformed_manifests_and_oversized_reads(self):
        report = self.backup()
        path = self.manifest(report)
        for data in [b'null', b'[]', b'not JSON', b'{"version":true,"files":[],"bytes":0}',
                     b'{"version":1,"files":[],"bytes":-1}',
                     b'{"version":1,"files":[null],"bytes":0}',
                     b'{"version":1,"files":[],"bytes":1}']:
            path.write_bytes(data)
            with self.assertRaises(ValueError):
                release.verify_release(path.parent, hashlib.sha256(data).hexdigest())
        from unittest.mock import patch
        with patch.object(release, 'MAX_MANIFEST_BYTES', 1):
            with self.assertRaises(ValueError):
                release.verify_release(path.parent, hashlib.sha256(path.read_bytes()).hexdigest())

    def test_changed_file_during_copy_and_target_collision_fail(self):
        from unittest.mock import patch
        entry = {'bytes': 1, 'sha256': '0' * 64}
        with self.assertRaises(ValueError):
            release._copy_file(self.source / 'index.html', self.root / 'partial', entry)
        entry['bytes'] = 21
        with self.assertRaises(ValueError):
            release._copy_file(self.source / 'index.html', self.root / 'partial2', entry)
        with self.assertRaises(FileExistsError):
            release._copy_file(self.source / 'index.html', self.root / 'partial', entry)
        self.base.mkdir(mode=0o755)
        with self.assertRaises(ValueError):
            self.backup()
        self.base.chmod(0o700)
        report = self.backup()
        with patch.object(release.uuid, 'uuid4') as identifier:
            identifier.return_value.hex = report['run']
            with self.assertRaises(FileExistsError):
                self.backup()

    def test_empty_release_and_cli_dispatch_use_fixed_locations(self):
        from unittest.mock import patch
        import contextlib
        import io
        empty = self.root / 'empty'
        empty.mkdir()
        report = release.backup_release(empty, self.base)
        self.assertEqual(report['files'], 0)
        self.assertEqual(release.release_base(), Path.home() / '.local/share/knolstory-next-releases')
        fake = {'run': 'a' * 32, 'manifestSha256': 'b' * 64}
        with patch.object(release, 'backup_release', return_value=fake) as backup, patch.object(release, 'restore_release', return_value={'ok': True}) as restore, contextlib.redirect_stdout(io.StringIO()) as output:
            release.main([])
            self.assertEqual(backup.call_args.args[0], Path(release.__file__).resolve().parents[2] / 'apps/web/out')
            restore.assert_called_once_with(fake['run'], fake['manifestSha256'])
            self.assertEqual(json.loads(output.getvalue()), {'ok': True})
        with patch.object(release, 'restore_release', return_value={'ok': True}) as restore, contextlib.redirect_stdout(io.StringIO()):
            release.main(['--restore-run', fake['run'], '--manifest-sha', fake['manifestSha256']])
            restore.assert_called_once_with(fake['run'], fake['manifestSha256'])
        for flags in [['--restore-run', 'a' * 32], ['--manifest-sha', 'b' * 64]]:
            with contextlib.redirect_stderr(io.StringIO()), self.assertRaises(SystemExit):
                release.main(flags)

    def test_symlink_parent_cannot_redirect_source_or_private_outputs(self):
        alias = self.root / 'alias'
        alias.symlink_to(self.root, target_is_directory=True)
        with self.assertRaises(ValueError):
            release.backup_release(alias / 'out', self.base)
        with self.assertRaises(ValueError):
            release.backup_release(self.source, alias / 'private')
        report = self.backup()
        with self.assertRaises(ValueError):
            release.verify_release(alias / 'private/backups' / report['run'], report['manifestSha256'])


if __name__ == '__main__':
    unittest.main()
