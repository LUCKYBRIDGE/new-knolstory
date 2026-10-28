"""Branded boot shell must preserve Ren'Py's engine-owned integration points."""
import importlib.util
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location('runtime_loading', ROOT / 'spikes/renpy-web/loading.py')
loading = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(loading)


class RuntimeLoadingTests(unittest.TestCase):
    def test_replaces_only_presplash_and_preserves_engine_controls(self):
        source = '<html><head></head><body><img id="presplash" src="web-presplash.jpg"><div id="overlayDiv"></div><div id="statusDiv"><div id="statusTextDiv"></div><progress id="statusProgress"></progress></div><script src="renpy-pre.js"></script></body></html>'
        result = loading.brand_loading_html(source)
        self.assertNotIn('web-presplash.jpg', result)
        self.assertIn('이야기 무대를 준비하고 있어요', result)
        self.assertEqual(result.count('id="presplash"'), 1)
        self.assertIn('href="knol-loading.css"', result)
        for point in ['overlayDiv', 'statusDiv', 'statusTextDiv', 'statusProgress']:
            self.assertIn(f'id="{point}"', result)
        self.assertIn('<script src="renpy-pre.js"></script>', result)

    def test_changed_sdk_template_fails_loudly(self):
        for source in ['<head></head>', '<img id="presplash" src="web-presplash.jpg">']:
            with self.subTest(source=source), self.assertRaisesRegex(ValueError, 'Ren.Py'):
                loading.brand_loading_html(source)

    def test_duplicate_presplash_is_rejected(self):
        with self.assertRaisesRegex(ValueError, 'Ren.Py'):
            loading.brand_loading_html('<head></head>' + '<img id="presplash" src="web-presplash.jpg">' * 2)


if __name__ == '__main__':
    unittest.main()
