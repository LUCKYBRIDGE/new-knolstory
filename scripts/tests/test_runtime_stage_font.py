"""The stage font is the static Regular instance of the variable font, without Hanja, and deterministic."""
import importlib.util
from pathlib import Path
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location('stage_font', ROOT / 'spikes/renpy-web/stage_font.py')
stage_font = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(stage_font)
try:
    import fontTools
    PINNED = fontTools.version == stage_font.FONTTOOLS_VERSION
except ImportError:
    PINNED = False

CHARACTERS = {0x41: 'A', 0xAC00: 'ga', 0x30AB: 'ka', 0x3260: 'circled', 0x4E00: 'one', 0x2F00: 'radical', 0xF900: 'compat'}


def variable_font(path: Path):
    """A small TrueType variable font: wght 100-900, default 100, every outline and advance grows with weight."""
    from fontTools.fontBuilder import FontBuilder
    from fontTools.pens.ttGlyphPen import TTGlyphPen
    from fontTools.ttLib.tables.TupleVariation import TupleVariation
    order = ['.notdef', *CHARACTERS.values()]
    builder = FontBuilder(1000, isTTF=True)
    builder.setupGlyphOrder(order)
    builder.setupCharacterMap(CHARACTERS)
    glyphs = {}
    for name in order:
        pen = TTGlyphPen(None)
        pen.moveTo((0, 0)); pen.lineTo((0, 500)); pen.lineTo((500, 500)); pen.lineTo((500, 0)); pen.closePath()
        glyphs[name] = pen.glyph()
    builder.setupGlyf(glyphs)
    builder.setupHorizontalMetrics({name: (600, 0) for name in order})
    builder.setupHorizontalHeader(ascent=800, descent=-200)
    builder.setupNameTable({'familyName': 'Stage Test', 'styleName': 'Thin', 'version': 'Version 1.000', 'uniqueFontIdentifier': '1.000;TEST;StageTest-Thin'})
    builder.setupOS2(usWeightClass=100)
    builder.setupPost()
    builder.setupFvar(axes=[('wght', 100, 100, 900, 'Weight')], instances=[{'stylename': 'Regular', 'location': {'wght': 400}}])
    # At wght 900 the top edge rises by 80 units and the advance grows by 40; at 400 (0.375) that is 30 and 15.
    rise = [(0, 0), (0, 80), (0, 80), (0, 0), (0, 0), (40, 0), (0, 0), (0, 0)]
    builder.setupGvar({name: [TupleVariation({'wght': (0, 1.0, 1.0)}, rise)] for name in order})
    builder.save(str(path))


@unittest.skipUnless(PINNED, f'needs fontTools {stage_font.FONTTOOLS_VERSION}')
class StageFontTests(unittest.TestCase):
    def test_static_regular_instance_without_hanja(self):
        from fontTools.ttLib import TTFont
        with tempfile.TemporaryDirectory() as folder:
            source, target = Path(folder) / 'variable.ttf', Path(folder) / 'stage.ttf'
            variable_font(source)
            summary = stage_font.write_stage_font(source, target)
            font = TTFont(str(target))
            self.assertNotIn('fvar', font)
            self.assertNotIn('gvar', font)
            self.assertEqual(set(font.getBestCmap()), {0x41, 0xAC00, 0x30AB, 0x3260})
            self.assertEqual(summary['hanjaRemoved'], 3)
            self.assertEqual(summary['characters'], 4)
            self.assertEqual(font['OS/2'].usWeightClass, 400)
            glyph = font['glyf'][font.getBestCmap()[0xAC00]]
            self.assertEqual(sorted({y for _, y in glyph.coordinates}), [0, 530], 'outline at the Regular weight')
            self.assertEqual(font['hmtx'][font.getBestCmap()[0x41]][0], 615, 'advance at the Regular weight')
            names = {record.nameID: record.toUnicode() for record in font['name'].names}
            self.assertTrue(names[5].endswith(stage_font.MARK))
            self.assertTrue(names[3].endswith(';KnolStory-stage'))
            self.assertNotIn(25, names)
            self.assertEqual(font.getGlyphOrder()[0], '.notdef')
            self.assertEqual(sorted(path.name for path in Path(folder).iterdir()), ['stage.ttf', 'variable.ttf'])

    def test_same_input_gives_the_same_bytes(self):
        with tempfile.TemporaryDirectory() as folder:
            source = Path(folder) / 'variable.ttf'
            variable_font(source)
            first, second = Path(folder) / 'one.ttf', Path(folder) / 'two.ttf'
            stage_font.write_stage_font(source, first)
            stage_font.write_stage_font(source, second)
            self.assertEqual(first.read_bytes(), second.read_bytes())

    def test_a_static_source_is_refused(self):
        from fontTools.ttLib import TTFont
        with tempfile.TemporaryDirectory() as folder:
            source = Path(folder) / 'variable.ttf'
            variable_font(source)
            font = TTFont(str(source))
            del font['fvar'], font['gvar']
            font.save(str(source))
            with self.assertRaises(ValueError):
                stage_font.write_stage_font(source, Path(folder) / 'stage.ttf')
            self.assertFalse((Path(folder) / 'stage.ttf').exists())


class HanjaRangeTests(unittest.TestCase):
    def test_only_ideographs_and_radicals_are_hanja(self):
        for codepoint in (0x2E80, 0x2F00, 0x2FF0, 0x3400, 0x4E00, 0x9FFF, 0xF900, 0xFAFF, 0x20000):
            self.assertTrue(stage_font.is_hanja(codepoint), hex(codepoint))
        for codepoint in (0x41, 0x3000, 0x300C, 0x3131, 0x3260, 0x3300, 0x30AB, 0xAC00, 0xD7A3, 0xFF01):
            self.assertFalse(stage_font.is_hanja(codepoint), hex(codepoint))


if __name__ == '__main__':
    unittest.main()
