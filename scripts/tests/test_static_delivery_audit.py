import hashlib
import importlib.util
import json
import tempfile
import unittest
from contextlib import redirect_stderr
from io import StringIO
from unittest.mock import patch
from pathlib import Path

SPEC = importlib.util.spec_from_file_location('static_delivery_audit', Path(__file__).resolve().parents[1] / 'static-delivery-audit.py')
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class StaticDeliveryAuditTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name) / 'out'
        self.root.mkdir()

    def write(self, name, content=b'fixture'):
        path = self.root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(content)
        return path

    def audit(self, **kwargs):
        return MODULE.audit(self.root, catalog=kwargs.pop('catalog', []), provenance=kwargs.pop('provenance', []), tracked=set(), required=kwargs.pop('required', []), **kwargs)

    def record(self, name, **kwargs):
        return {'file': 'apps/web/public/' + name, 'sha256': hashlib.sha256((self.root / name).read_bytes()).hexdigest(), 'license': 'CC0-1.0', 'redistribution': 'permitted', 'commercialUse': 'permitted', 'attribution': 'not-required', 'assetIds': ['image:fixture'], 'usageReferences': [{'work': 'fixture'}], **kwargs}

    def test_verified_cc0_inventory_has_identity_hash_mime_and_usage(self):
        self.write('assets/scene.webp')
        result = self.audit(catalog=[{'id': 'image:fixture', 'src': '/assets/scene.webp'}], provenance=[self.record('assets/scene.webp')])
        self.assertEqual(result['blockers'], [])
        self.assertTrue(result['summary']['passesPreflight'])
        entry = result['files'][0]
        self.assertEqual(entry['mime'], 'image/webp')
        self.assertEqual(entry['mimeBasis'], 'extension-inferred')
        self.assertEqual(entry['assetIds'], ['image:fixture'])
        self.assertEqual(entry['usageReferences'], [{'work': 'fixture'}])
        self.assertEqual(entry['rightsStatus'], 'verified')

    def scene_approval(self, name):
        evidence = 'docs/scene-rights.json'
        proof = Path(self.temp.name) / 'repo' / evidence
        proof.parent.mkdir(parents=True, exist_ok=True)
        proof.write_text('{"review":"conditional-scene-use"}')
        row = {'id':'audio:sound:pixabay-test', 'src':'/' + name,
               'sha256': hashlib.sha256((self.root / name).read_bytes()).hexdigest(),
               'license':'Pixabay Content License', 'commercialUse':'permitted',
               'redistribution':'restricted', 'editorProvision':'scene-integrated',
               'usage':'scene-integrated', 'standaloneDownload':'prohibited',
               'preview':'scene', 'exportMode':'reference',
               'sourceUrl':'https://pixabay.com/sound-effects/test-123/', 'evidence':[evidence]}
        formal = self.record(name, assetIds=[row['id']], license=row['license'],
                             redistribution='restricted', source=row['sourceUrl'])
        approvals = {'version':2, 'scope':'common-editor-playback-and-project-file-transfer',
                     'checkedAt':'2026-10-10', 'assets':[row]}
        return row, formal, approvals

    def test_compact_usage_reference_resolves_only_from_identical_source_bytes(self):
        import copy
        self.write('assets/scene.webp', b'original bytes')
        self.write('runtime/game/assets/scene.webp', b'original bytes')
        original=self.record('assets/scene.webp',usageReferences=[{'work':'story','documentLocation':'$.lines[0]'}])
        duplicate=self.record('runtime/game/assets/scene.webp',usageReferences=[],usageReferencesFrom=original['file'])
        stored=copy.deepcopy([original,duplicate])
        result=self.audit(provenance=[original,duplicate])
        self.assertEqual(result['blockers'],[])
        row=next(item for item in result['files'] if item['path']=='runtime/game/assets/scene.webp')
        self.assertEqual(row['usageReferences'],original['usageReferences'])
        self.assertEqual([original,duplicate],stored)

    def test_missing_or_changed_usage_reference_source_blocks_publication(self):
        self.write('assets/scene.webp', b'original bytes')
        self.write('runtime/game/assets/scene.webp', b'original bytes')
        original=self.record('assets/scene.webp')
        for reference,origin in [('apps/web/public/missing.webp',original),
                                 (original['file'],{**original,'sha256':'0'*64}),
                                 (original['file'],{**original,'usageReferencesFrom':original['file']})]:
            with self.subTest(reference=reference,origin=origin):
                duplicate=self.record('runtime/game/assets/scene.webp',usageReferences=[],usageReferencesFrom=reference)
                result=self.audit(provenance=[origin,duplicate])
                self.assertIn({'path':'runtime/game/assets/scene.webp','reason':'provenance-reference-mismatch'},result['blockers'])
                self.assertFalse(result['summary']['passesPreflight'])

    def test_approved_scene_audio_keeps_its_restrictions_and_runtime_copy_identity(self):
        name='assets/audio/pixabay/test.mp3'
        self.write(name, b'scene bytes')
        row, formal, approvals=self.scene_approval(name)
        duplicate='runtime/game/' + name
        self.write(duplicate, b'scene bytes')
        copy={**formal, 'file':'apps/web/public/'+duplicate, 'derivedFrom':formal['file']}
        with patch.object(MODULE, 'ROOT', Path(self.temp.name)/'repo'):
            result=self.audit(provenance=[formal,copy], usage_scope='story-service', scene_audio_approvals=approvals)
        self.assertEqual(result['blockers'],[])
        self.assertEqual({f['rightsStatus'] for f in result['files']},{'verified-scene-use'})
        self.assertEqual({f['license'] for f in result['files']},{'Pixabay Content License'})
        self.assertEqual({f['redistribution'] for f in result['files']},{'restricted'})
        self.assertTrue(all(f['usageScope']=='scene-integrated' and f['standaloneDownload']=='prohibited' for f in result['files']))

    def test_scene_approval_does_not_authorize_standalone_or_unapproved_restricted_audio(self):
        name='assets/audio/pixabay/test.mp3'
        self.write(name)
        _, formal, approvals=self.scene_approval(name)
        with patch.object(MODULE, 'ROOT', Path(self.temp.name)/'repo'):
            for kwargs in [{}, {'usage_scope':'story-service'}, {'scene_audio_approvals':approvals},
                           {'usage_scope':'standalone-assets','scene_audio_approvals':approvals}]:
                result=self.audit(provenance=[formal],**kwargs)
                self.assertEqual(result['files'][0]['rightsStatus'],'review-required')
                self.assertEqual(result['blockers'][0]['reason'],'unverified-media-rights')

    def test_changed_or_incomplete_scene_approvals_never_clear_publication(self):
        import copy
        name='assets/audio/pixabay/test.mp3'
        self.write(name)
        _, formal, approvals=self.scene_approval(name)
        cases=[]
        for field,value in [('sha256','0'*64), ('id','audio:sound:other'), ('sourceUrl','https://example.com/other'),
                            ('standaloneDownload','permitted'), ('redistribution','permitted'),
                            ('evidence',[]), ('evidence',['../outside.json']), ('evidence',['docs/missing.json'])]:
            changed=copy.deepcopy(approvals);changed['assets'][0][field]=value;cases.append(changed)
        changed=copy.deepcopy(approvals);changed['scope']='arbitrary';cases.append(changed)
        with patch.object(MODULE, 'ROOT', Path(self.temp.name)/'repo'):
            for candidate in cases:
                with self.subTest(candidate=candidate):
                    result=self.audit(provenance=[formal],usage_scope='story-service',scene_audio_approvals=candidate)
                    self.assertEqual(result['files'][0]['rightsStatus'],'review-required')
                    self.assertTrue(result['blockers'])
            self.write(name,b'changed bytes')
            result=self.audit(provenance=[formal],usage_scope='story-service',scene_audio_approvals=approvals)
            self.assertEqual(result['blockers'][0]['reason'],'provenance-hash-mismatch')

    def test_scene_approval_does_not_clear_opaque_runtime_bundles(self):
        name='assets/audio/pixabay/test.mp3'
        self.write(name)
        _, formal, approvals=self.scene_approval(name)
        self.write('runtime/game.zip')
        with patch.object(MODULE, 'ROOT', Path(self.temp.name)/'repo'):
            result=self.audit(provenance=[formal],usage_scope='story-service',scene_audio_approvals=approvals)
        self.assertEqual(result['blockers'],[{'path':'runtime/game.zip','reason':'runtime-bundle-review-required'}])

    def test_scene_approvals_require_existing_source_audio_gate(self):
        repo=Path(self.temp.name)/'repo'
        source=repo/'packages/asset-registry/src/audio-service-approvals.json'
        source.parent.mkdir(parents=True)
        source.write_text('{"version":2,"assets":[]}')
        with patch.object(MODULE.SERVICE_AUDIO,'audit',return_value=['Changed approved bytes']) as gate:
            with self.assertRaisesRegex(ValueError,'Scene audio approval verification failed'):
                MODULE.reviewed_scene_audio_approvals(repo)
            gate.assert_called_once_with(root=repo,source_only=True)
        with patch.object(MODULE.SERVICE_AUDIO,'audit',return_value=[]) as gate:
            self.assertEqual(MODULE.reviewed_scene_audio_approvals(repo),{'version':2,'assets':[]})
            gate.assert_called_once_with(root=repo,source_only=True)
        self.assertIsNone(MODULE.reviewed_scene_audio_approvals(repo/'missing'))

    def test_missing_catalog_and_runtime_are_blocked(self):
        result = self.audit(catalog=[{'id': 'missing', 'src': '/assets/missing.webp'}], required=['runtime/renpy.wasm'])
        self.assertEqual({item['reason'] for item in result['blockers']}, {'missing-asset', 'missing-runtime'})

    def test_changed_bytes_do_not_inherit_rights(self):
        self.write('scene.webp')
        record = self.record('scene.webp')
        self.write('scene.webp', b'changed')
        result = self.audit(provenance=[record])
        self.assertIn('provenance-hash-mismatch', [item['reason'] for item in result['blockers']])
        self.assertNotEqual(result['files'][0]['rightsStatus'], 'verified')

    def test_unknown_media_and_runtime_container_require_review(self):
        self.write('scene.webp')
        self.write('runtime/game.zip')
        result = self.audit()
        self.assertEqual({item['reason'] for item in result['blockers']}, {'unverified-media-rights', 'runtime-bundle-review-required'})

    def test_transport_copy_is_reviewed_as_its_runtime_source(self):
        self.write('runtime/renpy.data', b'engine data')
        self.write('runtime/renpy.data.br', b'compressed')
        result = self.audit()
        copy = next(item for item in result['files'] if item['path'] == 'runtime/renpy.data.br')
        self.assertEqual(copy['mediaType'], 'runtime-bundle')
        self.assertEqual(copy['contentEncoding'], 'br')
        self.assertEqual(copy['transportOf'], 'runtime/renpy.data')
        self.assertEqual(copy['mime'], 'application/octet-stream')
        self.assertEqual(copy['rightsStatus'], 'review-required')
        reasons = {(item['path'], item['reason']) for item in result['blockers']}
        self.assertIn(('runtime/renpy.data.br', 'runtime-bundle-review-required'), reasons)
        self.assertNotIn('transportOf', next(item for item in result['files'] if item['path'] == 'runtime/renpy.data'))
    def test_transport_copy_without_its_source_is_blocked(self):
        self.write('runtime/renpy.wasm.br', b'compressed')
        result = self.audit()
        self.assertIn({'path': 'runtime/renpy.wasm.br', 'reason': 'missing-transport-source', 'source': 'runtime/renpy.wasm'}, result['blockers'])
        self.assertEqual(result['files'][0]['mime'], 'application/wasm')
    def test_download_only_runtime_archive_is_not_a_serving_input(self):
        self.write('runtime.zip', b'small-bundle')
        result = self.audit()
        self.assertIn('non-serving-artifact', [item['reason'] for item in result['blockers']])

    def test_pages_file_size_and_count_use_configured_limits(self):
        self.write('one.js', b'123456')
        self.write('two.js')
        result = self.audit(max_file_bytes=5, max_files=1)
        self.assertIn('pages-file-too-large', [item['reason'] for item in result['blockers']])
        self.assertIn('pages-file-count-exceeded', [item['reason'] for item in result['blockers']])

    def test_symlinks_never_read_outside_the_package(self):
        outside = Path(self.temp.name) / 'private.txt'
        outside.write_bytes(b'private')
        (self.root / 'outside.txt').symlink_to(outside)
        result = self.audit()
        self.assertEqual(result['files'], [])
        self.assertEqual(result['blockers'][0]['reason'], 'symlink-not-allowed')

    def test_private_work_and_logs_are_not_release_inputs(self):
        self.write('.env.production')
        self.write('debug.log')
        self.write('draft.knolstory')
        result = self.audit()
        self.assertEqual(len([b for b in result['blockers'] if b['reason'] == 'private-artifact']), 3)

    def test_public_audio_missing_from_build_is_blocked(self):
        result = self.audit(provenance=[{'file': 'apps/web/public/assets/audio/shared.ogg', 'assetIds': ['audio:shared']}])
        self.assertEqual(result['blockers'][0]['reason'], 'missing-media')

    def test_json_manuscript_snapshot_is_not_an_ordinary_public_manifest(self):
        self.write('snapshot.json', b'{"document":{"project":{"lines":[]}}}')
        self.write('catalog.json', b'{"assets":[]}')
        result = self.audit()
        self.assertEqual([item['path'] for item in result['blockers']], ['snapshot.json'])

    def test_direct_and_nested_authored_projects_are_blocked_without_blocking_line_metadata(self):
        snapshots = {
            'direct.json': {'id': 'work', 'lines': [{'text': 'private'}]},
            'picturebook.json': {'id': 'book', 'pages': [{'text': 'private'}]},
            'array.json': [{'wrapper': {'id': 'work', 'lines': []}}],
            'store.json': {'knolstory-next-workspace-v1': '{"document":{}}'},
            'declared.json': {'documentType': 'story-maker-project', 'schemaVersion': 8},
        }
        for name, value in snapshots.items():
            self.write(name, json.dumps(value).encode())
        self.write('manifest.json', b'{"id":"metrics","lines":24,"assets":[]}')
        self.write('graph.json', b'{"lines":[{"color":"green"}],"pages":["documentation"]}')
        result = self.audit()
        self.assertEqual({item['path'] for item in result['blockers']}, set(snapshots))

    def test_changed_license_text_does_not_clear_media_rights(self):
        repo = Path(self.temp.name) / 'repo'
        credit = 'apps/web/public/assets/licenses/OFL.txt'
        source = repo / credit
        source.parent.mkdir(parents=True)
        source.write_text('Exact original OFL text')
        self.write('assets/licenses/OFL.txt', b'Changed or incomplete license')
        self.write('font.woff2')
        record = self.record('font.woff2', license='OFL-1.1', redistribution='permitted-with-license', attribution='retain OFL', attributionEvidence=[credit])
        with patch.object(MODULE, 'ROOT', repo), patch.object(MODULE.PROVENANCE, 'ROOT', repo):
            result = self.audit(provenance=[record])
            self.assertIn('distributed-credit-hash-mismatch', [item['reason'] for item in result['blockers']])
            self.write('assets/licenses/OFL.txt', source.read_bytes())
            self.assertEqual(self.audit(provenance=[record])['blockers'], [])

    def test_cli_report_succeeds_but_check_returns_failure_and_build_stays_unchanged(self):
        repo = Path(self.temp.name) / 'repo'
        registry = repo / 'packages/asset-registry/src'
        registry.mkdir(parents=True)
        (registry / 'catalog.json').write_text('[]')
        (registry / 'media-provenance.json').write_text('{"entries":[]}')
        report = Path(self.temp.name) / 'report.json'
        with patch.object(MODULE, 'ROOT', repo), patch.object(MODULE, 'tracked_sources', return_value=set()), patch.object(MODULE.RUNTIME_REVIEW, 'ROOT', Path('/must-not-read-global-runtime')):
            self.assertEqual(MODULE.main(['--root', str(self.root), '--output', str(report)]), 0)
            self.assertTrue(report.is_file())
            self.assertEqual(MODULE.main(['--root', str(self.root), '--output', str(report), '--check']), 1)
        self.assertEqual(list(self.root.iterdir()), [])

    def test_cli_cannot_put_report_into_audited_package(self):
        with redirect_stderr(StringIO()), self.assertRaises(SystemExit) as failure:
            MODULE.main(['--root', str(self.root), '--output', str(self.root / 'report.json')])
        self.assertEqual(failure.exception.code, 2)

    def test_license_credit_must_be_in_build_not_just_source(self):
        self.write('font.woff2')
        record = self.record('font.woff2', license='OFL-1.1', redistribution='permitted-with-license', attribution='retain OFL', attributionEvidence=['apps/web/public/assets/licenses/missing.txt'])
        result = self.audit(provenance=[record])
        self.assertIn('missing-distributed-credit', [item['reason'] for item in result['blockers']])


if __name__ == '__main__':
    unittest.main()
