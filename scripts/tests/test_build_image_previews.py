import hashlib
import importlib.util
import io
import json
import tempfile
import unittest
from pathlib import Path

from PIL import Image

SPEC = importlib.util.spec_from_file_location('build_image_previews', Path(__file__).resolve().parents[1] / 'build-image-previews.py')
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class BuildImagePreviewTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.public = Path(self.temp.name) / 'public'
        self.settings = MODULE.config()

    def image(self, name, size, mode='RGB'):
        path = self.public / name
        path.parent.mkdir(parents=True, exist_ok=True)
        output = io.BytesIO()
        Image.new(mode, size, (120, 80, 40, 128) if mode == 'RGBA' else (120, 80, 40)).save(output, 'WEBP', lossless=True)
        path.write_bytes(output.getvalue())
        return {'id': name, 'src': '/' + name, 'revision': hashlib.sha256(output.getvalue()).hexdigest()}

    def build(self, catalog, **kwargs):
        return MODULE.build(public=self.public, catalog=catalog, log=lambda _message: None, **kwargs)

    def manifest(self):
        return json.loads((self.public / self.settings['manifest']).read_text())

    def test_previews_fit_the_box_keep_alpha_and_bind_source_bytes(self):
        background = self.image('assets/bg.webp', (1600, 900))
        actor = self.image('assets/actor.webp', (800, 1200), 'RGBA')
        self.assertEqual(self.build([background, actor])['built'], 2)
        entries = {entry['source']: entry for entry in self.manifest()['entries']}
        for asset in (background, actor):
            entry = entries[asset['src'][1:]]
            self.assertEqual(entry['preview'], f"{self.settings['directory']}/{asset['revision'][:16]}.webp")
            self.assertEqual(entry['sourceSha256'], asset['revision'])
            data = (self.public / entry['preview']).read_bytes()
            self.assertEqual(entry['sha256'], hashlib.sha256(data).hexdigest())
            with Image.open(io.BytesIO(data)) as preview:
                self.assertLessEqual(preview.width, self.settings['maxWidth'])
                self.assertLessEqual(preview.height, self.settings['maxHeight'])
                self.assertEqual(preview.size, (entry['width'], entry['height']))
                if asset is actor:
                    self.assertEqual(preview.mode, 'RGBA')
        self.assertEqual(entries['assets/bg.webp']['width'], self.settings['maxWidth'])
        self.assertEqual(entries['assets/actor.webp']['height'], self.settings['maxHeight'])

    def test_unchanged_previews_are_reused_and_stale_ones_removed(self):
        first, second = self.image('assets/a.webp', (640, 360)), self.image('assets/b.webp', (480, 360))
        self.build([first, second])
        self.assertEqual(self.build([first, second]), {'built': 0, 'reused': 2, 'skipped': 0})
        self.build([first])
        names = sorted(path.name for path in (self.public / self.settings['directory']).glob('*.webp'))
        self.assertEqual(names, [first['revision'][:16] + '.webp'])

    def test_strict_mode_rejects_missing_or_changed_sources(self):
        asset = self.image('assets/a.webp', (640, 360))
        missing = {'id': 'gone', 'src': '/assets/gone.webp', 'revision': 'f' * 64}
        self.assertEqual(self.build([asset, missing])['skipped'], 1)
        with self.assertRaises(FileNotFoundError):
            self.build([asset, missing], strict=True)
        with self.assertRaises(ValueError):
            self.build([{**asset, 'revision': '0' * 64}])


if __name__ == '__main__':
    unittest.main()
