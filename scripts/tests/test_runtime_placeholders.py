"""game.zip placeholders become 64-colour PNGs; every other entry keeps its bytes and metadata."""
import importlib.util
import io
from pathlib import Path
import random
import tempfile
import unittest
import zipfile

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location('runtime_placeholders', ROOT / 'spikes/renpy-web/placeholders.py')
placeholders = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(placeholders)


def noisy_png(mode: str, size=(50, 28), seed=7) -> bytes:
    generator = random.Random(seed)
    image = Image.new(mode, size)
    channels = len(mode)
    image.putdata([tuple(generator.randrange(256) for _ in range(channels)) for _ in range(size[0] * size[1])])
    if mode == 'RGBA':
        image.putpixel((0, 0), (10, 20, 30, 0))
    buffer = io.BytesIO()
    image.save(buffer, 'PNG', optimize=True)
    return buffer.getvalue()


ENTRIES = [
    ('game/', b'', zipfile.ZIP_STORED),
    ('game/script.rpyc', b'compiled script ' * 400, zipfile.ZIP_DEFLATED),
    ('game/gui/frame.png', noisy_png('RGB', seed=3), zipfile.ZIP_DEFLATED),
    ('_placeholders/assets/background.webp', noisy_png('RGB'), zipfile.ZIP_STORED),
    ('_placeholders/assets/character.webp', noisy_png('RGBA', size=(25, 37)), zipfile.ZIP_STORED),
]


def archive(path: Path, entries=ENTRIES):
    with zipfile.ZipFile(path, 'w') as target:
        for index, (name, data, compression) in enumerate(entries):
            info = zipfile.ZipInfo(name, date_time=(2026, 10, 31, 12, index, 0))
            info.external_attr = 0o644 << 16
            target.writestr(info, data, compress_type=compression)


class PlaceholderTests(unittest.TestCase):
    def test_placeholders_shrink_and_other_entries_keep_bytes(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'game.zip'
            archive(path)
            with zipfile.ZipFile(path) as before:
                old = {info.filename: (before.read(info), info.date_time, info.compress_type, info.external_attr) for info in before.infolist()}
            summary = placeholders.shrink_placeholders(path)
            self.assertEqual(summary['placeholders'], 2)
            self.assertLess(summary['bytesAfter'], summary['bytesBefore'])
            with zipfile.ZipFile(path) as after:
                self.assertEqual([info.filename for info in after.infolist()], [name for name, _, _ in ENTRIES])
                for info in after.infolist():
                    data, date_time, compression, attributes = old[info.filename]
                    self.assertEqual((info.date_time, info.compress_type, info.external_attr), (date_time, compression, attributes), info.filename)
                    if not info.filename.startswith('_placeholders/'):
                        self.assertEqual(after.read(info), data, info.filename)
                        continue
                    with Image.open(io.BytesIO(after.read(info))) as image, Image.open(io.BytesIO(data)) as original:
                        self.assertEqual((image.format, image.mode), ('PNG', 'P'))
                        self.assertEqual(image.size, original.size)
                        new, old_pixels = list(image.convert('RGBA').getdata()), list(original.convert('RGBA').getdata())
                        self.assertLessEqual(len({pixel[:3] for pixel in new if pixel[3] > 0}), 64)
                        for before_pixel, after_pixel in zip(old_pixels, new):
                            if before_pixel[3] in (0, 255):
                                self.assertEqual(after_pixel[3], before_pixel[3], 'fully transparent or opaque stays so')
                        if original.mode == 'RGBA':
                            self.assertEqual(new[0][3], 0, 'the transparent pixel stays transparent')
            self.assertEqual(sorted(item.name for item in Path(folder).iterdir()), ['game.zip'])

    def test_a_placeholder_that_is_not_png_stops_the_build_and_keeps_the_archive(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'game.zip'
            buffer = io.BytesIO()
            Image.new('RGB', (8, 8)).save(buffer, 'WEBP')
            archive(path, [*ENTRIES, ('_placeholders/assets/odd.webp', buffer.getvalue(), zipfile.ZIP_STORED)])
            original = path.read_bytes()
            with self.assertRaises(ValueError):
                placeholders.shrink_placeholders(path)
            self.assertEqual(path.read_bytes(), original)


if __name__ == '__main__':
    unittest.main()
