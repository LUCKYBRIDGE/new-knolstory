import functools
import hashlib
from http.server import ThreadingHTTPServer
from pathlib import Path
import sys
import tempfile
import threading
import unittest
import urllib.error
import urllib.request
sys.path.insert(0, str(Path(__file__).resolve().parent))
from static_release import backup_release, restore_release, restore_root
from serve_static_restore import configured_handler


class RestorePreviewTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        source = Path(self.tmp.name).resolve() / 'out'
        source.mkdir()
        (source / 'index.html').write_bytes(b'<html>restored</html>')
        (source / 'shortstory.html').write_bytes(b'<html>picture book</html>')
        base = source.parent / 'private'
        backup = backup_release(source, base)
        restored = restore_release(backup['run'], backup['manifestSha256'], base)
        self.root = restore_root(restored['restoreRun'], base)
        self.sha = backup['manifestSha256']
        handler = configured_handler(self.root, self.sha, restored['restoreRun'])
        self.server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(handler, directory=str(self.root / 'files')))
        thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        thread.start()
        self.addCleanup(lambda: (self.server.shutdown(), self.server.server_close(), thread.join()))
        self.origin = 'http://127.0.0.1:' + str(self.server.server_port)

    def test_only_verified_files_receive_provenance_headers(self):
        for route, expected in [('/', b'<html>restored</html>'), ('/shortstory', b'<html>picture book</html>'), ('/shortstory/', b'<html>picture book</html>')]:
            with urllib.request.urlopen(self.origin + route) as response:
                self.assertEqual(response.read(), expected)
                self.assertEqual(response.headers['X-Knolstory-Restored-Manifest'], self.sha)
        (self.root / 'files' / 'unlisted.txt').write_text('not in release')
        with self.assertRaises(urllib.error.HTTPError) as caught:
            urllib.request.urlopen(self.origin + '/unlisted.txt')
        self.assertEqual(caught.exception.code, 404)
        self.assertIsNone(caught.exception.headers.get('X-Knolstory-Restored-Manifest'))

    def test_post_start_mutation_is_rejected_before_any_payload_is_served(self):
        (self.root / 'files' / 'index.html').write_bytes(b'<html>changed</html>')
        with self.assertRaises(urllib.error.HTTPError) as caught:
            urllib.request.urlopen(self.origin + '/')
        self.assertEqual(caught.exception.code, 409)
        self.assertIsNone(caught.exception.headers.get('X-Knolstory-Restored-Manifest'))

    def test_post_start_symlink_and_untrusted_manifest_are_rejected(self):
        path = self.root / 'files' / 'index.html'
        path.unlink()
        outside = Path(self.tmp.name).resolve() / 'outside.txt'
        outside.write_text('not served')
        path.symlink_to(outside)
        with self.assertRaises(urllib.error.HTTPError) as caught:
            urllib.request.urlopen(self.origin + '/')
        self.assertEqual(caught.exception.code, 409)
        with self.assertRaises(ValueError):
            configured_handler(self.root, hashlib.sha256(b'untrusted').hexdigest(), 'wrong')


if __name__ == '__main__':
    unittest.main()
