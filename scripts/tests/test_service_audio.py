import importlib.util
import json
import hashlib
from pathlib import Path
import tempfile
import unittest
import zipfile
import warnings

SCRIPT = Path(__file__).resolve().parents[1] / 'check-service-audio.py'
spec = importlib.util.spec_from_file_location('service_audio', SCRIPT)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class ServiceAudioTests(unittest.TestCase):
    def fixture(self, root):
        source = root / 'apps/web/public/assets/audio/cc0/a.ogg'
        source.parent.mkdir(parents=True)
        source.write_bytes(b'approved original')
        proof = root / 'docs/proof.md'
        proof.parent.mkdir(parents=True)
        proof.write_text('reviewed source')
        row = dict(id='audio:sound:test', src='/assets/audio/cc0/a.ogg',
                   sha256=hashlib.sha256(source.read_bytes()).hexdigest(),
                   license='CC0-1.0', usage='unrestricted', standaloneDownload='permitted', preview='asset', exportMode='reference', commercialUse='permitted',
                   redistribution='permitted', editorProvision='permitted',
                   sourceUrl='https://example.com/source', evidence=['docs/proof.md'])
        approvals = root / 'packages/asset-registry/src/audio-service-approvals.json'
        approvals.parent.mkdir(parents=True)
        approvals.write_text(json.dumps(dict(version=2, checkedAt='2026-10-10', scope='common-editor-playback-and-project-file-transfer', assets=[row])))
        (approvals.parent / 'media-provenance.json').write_text(json.dumps(dict(entries=[dict(file='apps/web/public'+row['src'], assetIds=[row['id']], source=row['sourceUrl'], sha256=row['sha256'], license=row['license'], commercialUse='permitted', redistribution='permitted')])))
        return row, approvals, source

    def test_only_approved_exact_bytes_with_rights_and_evidence_pass(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            row, approvals, source = self.fixture(root)
            self.assertEqual(module.audit(root), [])
            for key in ['commercialUse', 'redistribution', 'editorProvision']:
                approvals.write_text(json.dumps(dict(version=2, checkedAt='2026-10-10', scope='common-editor-playback-and-project-file-transfer', assets=[{**row, key:'unknown'}])))
                self.assertTrue(module.audit(root))
            approvals.write_text(json.dumps(dict(version=2, checkedAt='2026-10-10', scope='common-editor-playback-and-project-file-transfer', assets=[row])))
            source.write_bytes(b'changed source')
            self.assertTrue(module.audit(root))

    def test_extra_copied_renamed_and_missing_media_are_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            row, approvals, source = self.fixture(root)
            extra = source.parent / 'renamed.mp3'
            extra.write_bytes(source.read_bytes())
            self.assertTrue(module.audit(root))
            extra.unlink()
            source.unlink()
            self.assertTrue(module.audit(root))

    def test_path_escape_missing_proof_and_duplicate_approval_are_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            row, approvals, source = self.fixture(root)
            for rows in [[row,row],[{**row, 'src':'/assets/audio/../../outside.ogg'}],[{**row, 'evidence':['../outside.md']}],[{**row, 'evidence':[]}]]:
                approvals.write_text(json.dumps(dict(version=2, checkedAt='2026-10-10', scope='common-editor-playback-and-project-file-transfer', assets=rows)))
                self.assertTrue(module.audit(root))
            approvals.write_text(json.dumps(dict(version=2, checkedAt='2026-10-10', scope='common-editor-playback-and-project-file-transfer', assets=[row])))
            (root/'docs/proof.md').unlink()
            self.assertTrue(module.audit(root))

    def test_stale_runtime_zip_is_rejected_before_web_publication(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            row, approvals, source = self.fixture(root)
            runtime = root / 'apps/web/public/runtime/game.zip'
            runtime.parent.mkdir()
            with zipfile.ZipFile(runtime, 'w') as archive:
                archive.write(source, 'game' + row['src'])
            self.assertEqual(module.audit(root), [])
            with zipfile.ZipFile(runtime, 'a') as archive:
                archive.writestr('game/assets/audio/pixabay/excluded.mp3', b'excluded')
            self.assertTrue(module.audit(root))
            self.assertEqual(module.audit(root, source_only=True), [])

    def test_duplicate_archive_entries_cannot_hide_changed_audio(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            row, approvals, source = self.fixture(root)
            runtime = root / 'apps/web/public/runtime/game.zip'
            runtime.parent.mkdir()
            with warnings.catch_warnings(), zipfile.ZipFile(runtime, 'w') as archive:
                warnings.simplefilter('ignore', UserWarning)
                archive.writestr('game' + row['src'], b'changed first entry')
                archive.write(source, 'game' + row['src'])
            self.assertTrue(module.audit(root))

    def test_malformed_approval_and_formal_rights_mismatch_fail_closed(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            row, approvals, source = self.fixture(root)
            for patch in [{'id':None}, {'id':['audio:sound:test']}, {'sourceUrl':None}, {'sourceUrl':'javascript:alert(1)'}, {'sourceUrl':'https://wrong.example/source'}, {'sha256':'bad'}]:
                approvals.write_text(json.dumps(dict(version=2, checkedAt='2026-10-10', scope='common-editor-playback-and-project-file-transfer', assets=[{**row, **patch}])))
                self.assertTrue(module.audit(root))
            approvals.write_text(json.dumps(dict(version=2, checkedAt='2026-10-10', scope='common-editor-playback-and-project-file-transfer', assets=[row])))
            (approvals.parent / 'media-provenance.json').write_text(json.dumps(dict(entries=[])))
            self.assertTrue(module.audit(root))

    def test_scene_integrated_licence_requires_all_capability_limits(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            row, approvals, source = self.fixture(root)
            conditional = {**row, 'license':'Pixabay Content License','usage':'scene-integrated','editorProvision':'scene-integrated','redistribution':'restricted','standaloneDownload':'prohibited','preview':'scene'}
            approvals.write_text(json.dumps(dict(version=2, checkedAt='2026-10-10', scope='common-editor-playback-and-project-file-transfer', assets=[conditional])))
            formal = dict(file='apps/web/public'+row['src'], assetIds=[row['id']], source=row['sourceUrl'], sha256=row['sha256'], license=conditional['license'], commercialUse='permitted', redistribution='restricted')
            (approvals.parent/'media-provenance.json').write_text(json.dumps(dict(entries=[formal])))
            self.assertEqual(module.audit(root), [])
            for patch in [{'standaloneDownload':'permitted'},{'preview':'asset'},{'exportMode':'bytes'},{'redistribution':'permitted'},{'editorProvision':'permitted'}]:
                approvals.write_text(json.dumps(dict(version=2, checkedAt='2026-10-10', scope='common-editor-playback-and-project-file-transfer', assets=[{**conditional, **patch}])))
                self.assertTrue(module.audit(root))

    def progressive(self, root, row, source):
        runtime = root / 'apps/web/public/runtime'
        runtime.mkdir(exist_ok=True)
        path = runtime / ('game' + row['src'])
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(source.read_bytes())
        with zipfile.ZipFile(runtime / 'game.zip', 'w') as archive:
            archive.writestr('game/renpyweb_remote_files.txt', row['src'].lstrip('/') + '\nmusic -\n')
        return path

    def test_native_progressive_audio_preserves_approved_bytes_without_zip_copy(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            row, approvals, source = self.fixture(root)
            progressive = self.progressive(root, row, source)
            self.assertEqual(module.audit(root), [])
            progressive.write_bytes(b'changed progressive copy')
            self.assertTrue(module.audit(root))
            self.assertEqual(module.audit(root, source_only=True), [])

    def test_missing_unregistered_duplicate_and_escaped_progressive_audio_are_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            row, approvals, source = self.fixture(root)
            progressive = self.progressive(root, row, source)
            progressive.unlink()
            self.assertTrue(module.audit(root))
            progressive.symlink_to(source)
            self.assertTrue(module.audit(root))
            progressive.unlink()
            progressive.write_bytes(source.read_bytes())
            with zipfile.ZipFile(root / 'apps/web/public/runtime/game.zip', 'w') as archive:
                archive.writestr('game/renpyweb_remote_files.txt', '')
            self.assertTrue(module.audit(root))
            self.progressive(root, row, source)
            with zipfile.ZipFile(root / 'apps/web/public/runtime/game.zip', 'a') as archive:
                archive.write(source, 'game' + row['src'])
            self.assertTrue(module.audit(root))
            self.progressive(root, row, source)
            (progressive.parent / 'not-approved.ogg').write_bytes(source.read_bytes())
            self.assertTrue(module.audit(root))

    def test_host_on_demand_audio_cannot_be_copied_to_native_progressive_storage(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            row, approvals, source = self.fixture(root)
            replacement = source.parent / 'fixture/v1/a.ogg'
            replacement.parent.mkdir(parents=True)
            source.rename(replacement)
            row = {**row, 'src':'/assets/audio/cc0/fixture/v1/a.ogg','delivery':'on-demand'}
            approvals.write_text(json.dumps(dict(version=2, checkedAt='2026-10-10', scope='common-editor-playback-and-project-file-transfer', assets=[row])))
            formal = dict(file='apps/web/public'+row['src'], assetIds=[row['id']], source=row['sourceUrl'], sha256=row['sha256'], license=row['license'], commercialUse='permitted', redistribution='permitted')
            (approvals.parent/'media-provenance.json').write_text(json.dumps(dict(entries=[formal])))
            self.assertEqual(module.audit(root), [])
            self.progressive(root, row, replacement)
            self.assertTrue(module.audit(root))

    def test_duplicate_unsafe_progressive_index_and_bad_approval_fail_closed(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            row, approvals, source = self.fixture(root)
            self.progressive(root, row, source)
            runtime = root / 'apps/web/public/runtime/game.zip'
            for index in [row['src'].lstrip('/') + '\nmusic -\n' + row['src'].lstrip('/') + '\nmusic -\n',
                          'assets/audio/../../secret.ogg\nmusic -\n',
                          row['src'].lstrip('/') + '\nmusic -\ntruncated']:
                with zipfile.ZipFile(runtime, 'w') as archive:
                    archive.writestr('game/renpyweb_remote_files.txt', index)
                self.assertTrue(module.audit(root))
            self.progressive(root, row, source)
            approvals.write_text(json.dumps(dict(version=2, checkedAt='2026-10-10', scope='common-editor-playback-and-project-file-transfer', assets=[{**row, 'sha256':'invalid'}])))
            self.assertTrue(module.audit(root))

    def test_progressive_music_patterns_leave_short_sounds_inside_runtime_zip(self):
        rules = (SCRIPT.parents[1] / 'renpy/responsive-spike/progressive_download.txt').read_text()
        self.assertIn('+ music game/assets/audio/story-score/score-*.ogg', rules)
        self.assertIn('+ music game/assets/audio/story-score/ambience-*.ogg', rules)
        self.assertNotIn('+ music game/assets/audio/**', rules)
