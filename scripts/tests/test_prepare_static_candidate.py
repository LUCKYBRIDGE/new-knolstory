import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

SPEC = importlib.util.spec_from_file_location('prepare_static_candidate', Path(__file__).resolve().parents[1] / 'prepare-static-candidate.py')
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class PrepareStaticCandidateTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.base = Path(self.temp.name)
        self.source = self.base / 'build'
        self.source.mkdir()
        self.output = self.base / 'candidate'
        audit = patch.object(MODULE, 'publication_audit', side_effect=self.report)
        audit.start()
        self.addCleanup(audit.stop)

    def write(self, name, data=b'fixture'):
        path = self.source / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
        return path

    def report(self, source):
        files, excluded = MODULE.input_files(source, MODULE.AUDIT.PAGES_MAX_BYTES)
        return {'summary': {'passesPreflight': False}, 'files': files + excluded, 'blockers': []}

    def prepare(self, **kwargs):
        return MODULE.prepare(self.source, self.output, **kwargs)

    def test_partitions_large_files_without_changing_their_paths_or_bytes(self):
        self.write('index.html', b'web')
        self.write('runtime/game.zip', b'large game')
        self.write('runtime/game/assets/picture.webp', b'pic')
        manifest = self.prepare(max_site_bytes=5)
        self.assertEqual((self.output / 'site/index.html').read_bytes(), b'web')
        self.assertEqual((self.output / 'objects/runtime/game.zip').read_bytes(), b'large game')
        self.assertEqual((self.output / 'site/runtime/game/assets/picture.webp').read_bytes(), b'pic')
        entry = next(item for item in manifest['files'] if item['path'] == 'runtime/game.zip')
        self.assertEqual(entry, {'path': 'runtime/game.zip', 'tier': 'objects', 'bytes': 10, 'sha256': hashlib.sha256(b'large game').hexdigest()})
        self.assertTrue(manifest['localOnly'])
        self.assertFalse(manifest['preflightApproval'])
        self.assertEqual(json.loads((self.output / 'manifest.json').read_text()), manifest)
        self.assertEqual((self.source / 'runtime/game.zip').read_bytes(), b'large game')

    def test_only_download_archive_is_excluded_and_progressive_game_files_remain(self):
        self.write('runtime.zip', b'full download')
        self.write('runtime/game/image.webp', b'progressive')
        manifest = self.prepare()
        self.assertEqual([item['path'] for item in manifest['excluded']], ['runtime.zip'])
        self.assertEqual(manifest['excluded'][0]['sha256'], hashlib.sha256(b'full download').hexdigest())
        self.assertEqual((self.output / 'site/runtime/game/image.webp').read_bytes(), b'progressive')
        self.assertFalse((self.output / 'site/runtime.zip').exists())
        self.assertTrue((self.source / 'runtime.zip').exists())

    def test_existing_output_is_never_overwritten_or_removed(self):
        self.output.mkdir()
        (self.output / 'mine.txt').write_bytes(b'keep')
        with self.assertRaises(ValueError):
            self.prepare()
        self.assertEqual((self.output / 'mine.txt').read_bytes(), b'keep')

    def test_overlapping_roots_are_rejected_before_creating_directories(self):
        self.output = self.source / 'candidate'
        with self.assertRaises(ValueError):
            self.prepare()
        self.assertFalse(self.output.exists())
        with self.assertRaises(ValueError):
            MODULE.prepare(self.source, self.base)

    def test_symlink_file_and_directory_are_rejected_before_any_copy(self):
        outside = self.base / 'private'
        outside.mkdir()
        (outside / 'key.txt').write_bytes(b'private')
        for directory in [False, True]:
            link = self.source / 'link'
            link.symlink_to(outside if directory else outside / 'key.txt', target_is_directory=directory)
            with self.assertRaises(ValueError):
                self.prepare()
            self.assertFalse(self.output.exists())
            link.unlink()

    def test_private_input_is_rejected_before_any_copy(self):
        for name, contents in [('draft.knolstory', b'draft'), ('snapshot.json', b'{"id":"private","lines":[]}'), ('.env', b'private')]:
            source = self.write(name, contents)
            with self.assertRaises(ValueError):
                self.prepare()
            self.assertFalse(self.output.exists())
            self.assertEqual(source.read_bytes(), contents)
            source.unlink()

    def test_failed_copy_cleans_only_its_new_output_and_preserves_source(self):
        source = self.write('index.html', b'keep original')
        with patch.object(MODULE.shutil, 'copy2', side_effect=OSError('disk full')):
            with self.assertRaises(OSError):
                self.prepare()
        self.assertFalse(self.output.exists())
        self.assertEqual(source.read_bytes(), b'keep original')

    def test_copy_content_mismatch_removes_candidate(self):
        source = self.write('index.html', b'original')
        def corrupt(_source, destination):
            destination.write_bytes(b'changed')
        with patch.object(MODULE.shutil, 'copy2', side_effect=corrupt):
            with self.assertRaises(ValueError):
                self.prepare()
        self.assertFalse(self.output.exists())
        self.assertEqual(source.read_bytes(), b'original')

    def test_changed_source_after_planning_does_not_produce_a_candidate(self):
        source = self.write('index.html', b'original')
        original_copy = MODULE.shutil.copy2
        def changed_before_copy(_source, destination):
            source.write_bytes(b'late edit')
            original_copy(source, destination)
        with patch.object(MODULE.shutil, 'copy2', side_effect=changed_before_copy):
            with self.assertRaises(ValueError):
                self.prepare()
        self.assertFalse(self.output.exists())
        self.assertEqual(source.read_bytes(), b'late edit')

    def test_uninspected_large_json_is_rejected(self):
        self.write('large.json', b'{"id":"private","lines":[]}')
        with patch.object(MODULE.AUDIT, 'PAGES_MAX_BYTES', 5):
            with self.assertRaises(ValueError):
                self.prepare()
        self.assertFalse(self.output.exists())

    def test_missing_git_is_optional_and_cli_writes_only_new_output(self):
        self.write('index.html', b'web')
        with patch.object(MODULE.subprocess, 'run', side_effect=FileNotFoundError('git')):
            self.assertIsNone(MODULE.source_commit())
        with patch.object(MODULE, 'source_commit', return_value=None):
            self.assertEqual(MODULE.main(['--root', str(self.source), '--output', str(self.output)]), 0)
        self.assertIsNone(json.loads((self.output / 'manifest.json').read_text())['sourceCommit'])

    def test_source_publication_audit_covers_both_tiers_and_stays_outside_serving_roots(self):
        self.write('runtime/game.zip', b'large-game')
        report = {**self.report(self.source), 'blockers': [{'path': 'runtime/game.zip', 'reason': 'runtime-bundle-review-required'}]}
        with patch.object(MODULE, 'publication_audit', return_value=report) as audit:
            manifest = self.prepare(max_site_bytes=5)
        audit.assert_called_once_with(self.source.resolve())
        raw = (self.output / 'publication-audit.json').read_bytes()
        self.assertEqual(json.loads(raw), report)
        self.assertEqual(manifest['sourceAuditSha256'], hashlib.sha256(raw).hexdigest())
        self.assertEqual(manifest['sourcePreflightReport'], 'publication-audit.json')
        self.assertFalse(manifest['passesPreflight'])
        self.assertFalse((self.output / 'site/publication-audit.json').exists())
        self.assertFalse((self.output / 'objects/publication-audit.json').exists())

    def test_report_hash_must_match_planned_bytes_before_candidate_creation(self):
        self.write('index.html', b'original')
        report = self.report(self.source)
        report['files'][0]['sha256'] = '0' * 64
        with patch.object(MODULE, 'publication_audit', return_value=report):
            with self.assertRaises(ValueError):
                self.prepare()
        self.assertFalse(self.output.exists())

    def test_pages_only_candidate_has_no_object_files(self):
        self.write('index.html', b'web')
        self.write('runtime/game.zip', b'game')
        manifest = self.prepare(max_site_bytes=5, pages_only=True)
        self.assertTrue(all(item['tier'] == 'site' for item in manifest['files']))
        self.assertEqual(list((self.output / 'objects').iterdir()), [])

    def test_pages_only_rejects_oversize_executable_before_any_output(self):
        source = self.write('runtime/game.zip', b'oversize')
        with self.assertRaisesRegex(ValueError, r'runtime/game\.zip.*8'):
            self.prepare(max_site_bytes=5, pages_only=True)
        self.assertFalse(self.output.exists())
        self.assertEqual(source.read_bytes(), b'oversize')

    def test_pages_only_ignores_excluded_oversize_download_archive(self):
        self.write('runtime.zip', b'large-download')
        self.write('index.html', b'web')
        manifest = self.prepare(max_site_bytes=5, pages_only=True)
        self.assertEqual([item['path'] for item in manifest['excluded']], ['runtime.zip'])
        self.assertEqual([item['tier'] for item in manifest['files']], ['site'])

    def test_cli_pages_only_rejects_before_candidate_creation(self):
        from contextlib import redirect_stderr
        from io import StringIO
        self.write('runtime/game.zip', b'oversize')
        with redirect_stderr(StringIO()), self.assertRaises(SystemExit) as failure:
            MODULE.main(['--root', str(self.source), '--output', str(self.output), '--max-site-bytes', '5', '--pages-only'])
        self.assertEqual(failure.exception.code, 2)
        self.assertFalse(self.output.exists())

    def test_output_symlink_and_invalid_limit_are_rejected(self):
        target = self.base / 'existing'
        target.mkdir()
        self.output.symlink_to(target, target_is_directory=True)
        with self.assertRaises(ValueError):
            self.prepare()
        self.assertTrue(self.output.is_symlink())
        self.output.unlink()
        with self.assertRaises(ValueError):
            self.prepare(max_site_bytes=0)
        self.assertFalse(self.output.exists())


if __name__ == '__main__':
    unittest.main()
