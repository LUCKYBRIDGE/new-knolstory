"""Stage font for the Ren'Py presenter: the variable Noto Sans KR reduced to what the stage draws.

Ren'Py draws a variable font with its 'regular' instance when no instance is set (SDK doc/text.html,
Variable Fonts), and the presenter sets no instance, axis or bold. A static wght 400 instance therefore
draws the same glyphs with the same advances. Hanja (CJK ideographs and radicals) are left out by user
decision (2026-11-01: the service does not use Hanja); a missing character shows the .notdef box.
Hangul, jamo, Latin, symbols, kana, CJK punctuation, enclosed letters and all layout features stay.
The output is deterministic for the pinned fontTools version.
"""
from pathlib import Path

FONTTOOLS_VERSION = '4.60.2'
REGULAR = {'wght': 400}
MARK = 'KnolStory stage font: static Regular (wght 400), without Hanja'
# Hanja and their building blocks. Enclosed CJK (for example U+321C) and CJK punctuation are kept.
HANJA_RANGES = ((0x2E80, 0x2EFF), (0x2F00, 0x2FDF), (0x2FF0, 0x2FFF), (0x3400, 0x4DBF),
                (0x4E00, 0x9FFF), (0xF900, 0xFAFF), (0x20000, 0x3FFFF))


def is_hanja(codepoint: int) -> bool:
    return any(start <= codepoint <= end for start, end in HANJA_RANGES)


def _fonttools():
    try:
        import fontTools
        from fontTools import subset
        from fontTools.ttLib import TTFont
        from fontTools.varLib import instancer
    except ImportError as error:
        raise SystemExit(f'The stage font needs fontTools {FONTTOOLS_VERSION}: python3 -m pip install fonttools=={FONTTOOLS_VERSION}') from error
    if fontTools.version != FONTTOOLS_VERSION:
        raise SystemExit(f'The stage font is pinned to fontTools {FONTTOOLS_VERSION} (found {fontTools.version}); install it or review the output explicitly.')
    return TTFont, instancer, subset


def write_stage_font(source: Path, target: Path) -> dict:
    """Write the stage font and return what it keeps. Raises ValueError if a self-check fails."""
    TTFont, instancer, subset = _fonttools()
    font = TTFont(str(source), recalcTimestamp=False)
    if 'fvar' not in font or 'wght' not in {axis.axisTag for axis in font['fvar'].axes}:
        raise ValueError('Expected the variable source font with a wght axis.')
    before = font.getBestCmap()
    static = instancer.instantiateVariableFont(font, REGULAR, inplace=False, updateFontNames='STAT' in font)
    keep = sorted(codepoint for codepoint in static.getBestCmap() if not is_hanja(codepoint))
    options = subset.Options()
    options.layout_features = ['*']
    options.name_IDs = ['*']
    options.name_languages = ['*']
    options.name_legacy = True
    options.notdef_outline = True
    options.hinting = True
    options.recalc_timestamp = False
    subsetter = subset.Subsetter(options)
    subsetter.populate(unicodes=keep)
    subsetter.subset(static)
    names = static['name']
    # A modified OFL font: say so in the version and unique ID (the names carry no Reserved Font Name).
    for record in list(names.names):
        if record.nameID == 5:
            names.setName(f'{record.toUnicode()}; {MARK}', 5, record.platformID, record.platEncID, record.langID)
        elif record.nameID == 3:
            names.setName(f'{record.toUnicode()};KnolStory-stage', 3, record.platformID, record.platEncID, record.langID)
    names.removeNames(nameID=25)  # variations PostScript prefix: meaningless for a static font
    after = static.getBestCmap()
    expected = {codepoint for codepoint in before if not is_hanja(codepoint)}
    if 'fvar' in static or 'gvar' in static:
        raise ValueError('The stage font is still variable.')
    if set(after) != expected:
        raise ValueError(f'The stage font lost or kept unexpected characters ({len(set(after) ^ expected)} differ).')
    if static['OS/2'].usWeightClass != REGULAR['wght'] or static.getGlyphOrder()[0] != '.notdef':
        raise ValueError('The stage font is not the Regular instance with a .notdef glyph.')
    static.recalcTimestamp = False
    target = Path(target)
    partial = target.with_name(target.name + '.tmp')
    static.save(str(partial))
    partial.replace(target)
    return {'characters': len(after), 'hanjaRemoved': sum(1 for codepoint in before if is_hanja(codepoint)),
            'hangulSyllables': sum(1 for codepoint in after if 0xAC00 <= codepoint <= 0xD7A3), 'bytes': target.stat().st_size}
