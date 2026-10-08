import importlib.util
from pathlib import Path
import tempfile
import unittest

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


if __name__ == '__main__':
    unittest.main()
