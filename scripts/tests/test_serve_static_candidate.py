import hashlib
import importlib.util
import builtins
import io
import os
import json
from pathlib import Path
import tempfile
import threading
import unittest
from unittest.mock import patch
import urllib.error
import urllib.request

SPEC = importlib.util.spec_from_file_location('candidate_server', Path(__file__).parents[1] / 'serve-static-candidate.py')
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class CandidateServerTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.files = []
        for path, tier, data in [('index.html', 'site', b'web'), ('shortstory.html', 'site', b'book'),
                                 ('runtime/game.zip', 'objects', b'0123456789'),
                                 ('runtime/game/scene.webp', 'site', b'scene')]:
            file = self.root / tier / path
            file.parent.mkdir(parents=True, exist_ok=True)
            file.write_bytes(data)
            self.files.append({'path': path, 'tier': tier, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()})
        self.manifest()

    def manifest(self):
        (self.root / 'manifest.json').write_text(json.dumps({'formatVersion': 1, 'localOnly': True, 'files': self.files}))

    def server(self):
        server = MODULE.create_server(self.root, 0)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        self.addCleanup(lambda: (server.shutdown(), server.server_close(), thread.join()))
        return 'http://127.0.0.1:%d' % server.server_port

    def test_same_origin_routes_and_progressive_assets_do_not_need_api(self):
        url = self.server()
        for path, expected in [('/', b'web'), ('/shortstory', b'book'), ('/runtime/game/scene.webp', b'scene')]:
            with urllib.request.urlopen(url + path) as response:
                self.assertEqual(response.read(), expected)
        for path in ['/api/auth/session', '/manifest.json', '/objects/runtime/game.zip', '/runtime/', '/%2e%2e/manifest.json']:
            with self.assertRaises(urllib.error.HTTPError) as error:
                urllib.request.urlopen(url + path)
            self.assertIn(error.exception.code, [400, 404])

    def test_untrusted_host_cannot_read_the_private_preview(self):
        url = self.server()
        with self.assertRaises(urllib.error.HTTPError) as error:
            urllib.request.urlopen(urllib.request.Request(url, headers={'Host': 'attacker.example'}))
        self.assertEqual(error.exception.code, 400)

    def test_object_range_head_and_content_version_cache(self):
        url = self.server() + '/runtime/game.zip'
        digest = self.files[2]['sha256']
        with urllib.request.urlopen(urllib.request.Request(url, headers={'Range': 'bytes=2-5'})) as response:
            self.assertEqual(response.status, 206)
            self.assertEqual(response.read(), b'2345')
            self.assertEqual(response.headers['Content-Range'], 'bytes 2-5/10')
            self.assertEqual(response.headers['Cache-Control'], 'no-cache')
        with urllib.request.urlopen(urllib.request.Request(url + '?v=' + digest[:16], method='HEAD')) as response:
            self.assertEqual(response.read(), b'')
            self.assertEqual(response.headers['Content-Length'], '10')
            self.assertIn('immutable', response.headers['Cache-Control'])
            self.assertEqual(response.headers['ETag'], '"' + digest + '"')
        with urllib.request.urlopen(url + '?v=wrong') as response:
            self.assertEqual(response.headers['Cache-Control'], 'no-cache')

    def test_tampered_candidate_is_refused_before_serving(self):
        (self.root / 'objects/runtime/game.zip').write_bytes(b'tampered')
        with self.assertRaises(ValueError):
            MODULE.create_server(self.root, 0)

    def test_changed_file_after_startup_is_not_served_with_a_stale_version(self):
        url = self.server() + '/runtime/game.zip?v=' + self.files[2]['sha256'][:16]
        (self.root / 'objects/runtime/game.zip').write_bytes(b'abcdefghij')
        with self.assertRaises(urllib.error.HTTPError) as error:
            urllib.request.urlopen(url)
        self.assertEqual(error.exception.code, 409)
        self.assertNotIn('immutable', error.exception.headers.get('Cache-Control', ''))

    def assert_replacement_at_open_is_refused(self, headers):
        url = self.server() + '/runtime/game.zip?v=' + self.files[2]['sha256'][:16]
        target = self.root / 'objects/runtime/game.zip'
        replacement = self.root / 'replacement'
        replacement.write_bytes(b'abcdefghij')
        originals = (builtins.open, io.open, os.open)
        changed = []

        def wrapped(original):
            def opening(file, *args, **kwargs):
                if isinstance(file, (str, bytes, os.PathLike)) and os.path.realpath(os.fsdecode(file)) == str(target.resolve()) and not changed:
                    replacement.replace(target)
                    changed.append(True)
                return original(file, *args, **kwargs)
            return opening

        with patch('builtins.open', wrapped(originals[0])), patch('io.open', wrapped(originals[1])), patch('os.open', wrapped(originals[2])):
            with self.assertRaises(urllib.error.HTTPError) as error:
                urllib.request.urlopen(urllib.request.Request(url, headers=headers))
            self.assertEqual(error.exception.code, 409)
            self.assertNotIn('immutable', error.exception.headers.get('Cache-Control', ''))
        self.assertEqual(changed, [True])

    def test_replaced_file_between_stat_and_get_open_is_not_served(self):
        self.assert_replacement_at_open_is_refused({})

    def test_replaced_file_between_stat_and_range_open_is_not_served(self):
        self.assert_replacement_at_open_is_refused({'Range': 'bytes=2-5'})

    def test_response_keeps_the_verified_open_file_when_its_path_is_replaced(self):
        url = self.server() + '/runtime/game.zip'
        target = self.root / 'objects/runtime/game.zip'
        replacement = self.root / 'replacement'
        replacement.write_bytes(b'abcdefghij')
        original = MODULE.verified_stream

        def replaced_after_verification(row):
            stream, status = original(row)
            replacement.replace(target)
            return stream, status

        with patch.object(MODULE, 'verified_stream', side_effect=replaced_after_verification):
            with urllib.request.urlopen(urllib.request.Request(url, headers={'Range': 'bytes=2-5'})) as response:
                self.assertEqual(response.status, 206)
                self.assertEqual(response.read(), b'2345')
                self.assertEqual(response.headers['ETag'], '"' + self.files[2]['sha256'] + '"')
        self.assertEqual(target.read_bytes(), b'abcdefghij')

    def test_descriptor_content_hash_is_checked_even_with_matching_stat_identity(self):
        target = self.root / 'objects/runtime/game.zip'
        identity = MODULE.file_identity(target)
        url = self.server() + '/runtime/game.zip'
        target.write_bytes(b'abcdefghij')
        # Exercise the independent hash guard, not only inode/mtime checks.
        with patch.object(MODULE, 'status_identity', return_value=identity):
            with self.assertRaises(urllib.error.HTTPError) as error:
                urllib.request.urlopen(url)
            self.assertEqual(error.exception.code, 409)

    def test_manifest_cannot_escape_or_follow_symlinks(self):
        self.files.append({'path': '../private', 'tier': 'site', 'bytes': 0, 'sha256': '0' * 64})
        self.manifest()
        with self.assertRaises(ValueError):
            MODULE.create_server(self.root, 0)
        self.files.pop()
        (self.root / 'objects/runtime/game.zip').unlink()
        (self.root / 'objects/runtime/game.zip').symlink_to(self.root / 'site/index.html')
        self.manifest()
        with self.assertRaises(ValueError):
            MODULE.create_server(self.root, 0)


if __name__ == '__main__':
    unittest.main()
