import importlib.util
from pathlib import Path
import tempfile
import unittest
import threading
import urllib.request
from functools import partial
from http.server import ThreadingHTTPServer

SPEC = importlib.util.spec_from_file_location('preview', Path(__file__).parents[1] / 'serve-test-build.py')
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class StaticExportTests(unittest.TestCase):
    def test_page_html_wins_over_next_payload_directory(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / 'probe').mkdir()
            (root / 'probe.html').write_text('page')
            handler = object.__new__(MODULE.ExportHandler)
            handler.directory = str(root)
            for route in ['/probe', '/probe/']:
                self.assertEqual(Path(handler.translate_path(route)), root / 'probe.html')

    def test_existing_runtime_files_are_served_directly(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / 'renpy.wasm').write_bytes(b'runtime')
            (root / 'renpy.wasm.html').write_text('not runtime')
            handler = object.__new__(MODULE.ExportHandler)
            handler.directory = str(root)
            self.assertEqual(Path(handler.translate_path('/renpy.wasm')), root / 'renpy.wasm')

    def test_media_single_byte_ranges_support_real_browser_seeking(self):
        with tempfile.TemporaryDirectory() as folder:
            Path(folder,'sample.wav').write_bytes(b'0123456789')
            server=ThreadingHTTPServer(('127.0.0.1',0),partial(MODULE.ExportHandler,directory=folder))
            thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
            try:
                url='http://127.0.0.1:%s/sample.wav'%server.server_port
                for span,expected,content_range in [('bytes=2-5',b'2345','bytes 2-5/10'),('bytes=7-',b'789','bytes 7-9/10'),('bytes=-3',b'789','bytes 7-9/10')]:
                    with urllib.request.urlopen(urllib.request.Request(url,headers={'Range':span})) as response:
                        self.assertEqual(response.status,206);self.assertEqual(response.read(),expected);self.assertEqual(response.headers['Content-Range'],content_range)
                with self.assertRaises(urllib.error.HTTPError) as error:urllib.request.urlopen(urllib.request.Request(url,headers={'Range':'bytes=20-30'}))
                self.assertEqual(error.exception.code,416)
            finally:
                server.shutdown();server.server_close();thread.join()


if __name__ == '__main__':
    unittest.main()
