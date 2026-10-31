"""Smaller progressive-image placeholders in game.zip.

The Ren'Py web build stores a 1/32 pixellated PNG for every progressive image under _placeholders/
(SDK launcher/game/web.rpy). Ren'Py shows it, stretched, until the real image has arrived, and decodes
it as PNG (SDK renpy/display/im.py loads it as 'use_png_format.png'), so the files must stay PNG.
Saving them with a 64-colour palette keeps the same blurry preview at about a third of the size
(user decision 2026-11-01). Every other entry keeps its bytes, name, order, date and attributes;
deflated entries are compressed again because Python's zipfile cannot copy them raw.
"""
import io
from pathlib import Path
import zipfile

PREFIX = '_placeholders/'
COLOURS = 64


def _palette_png(data: bytes, colours: int) -> bytes:
    from PIL import Image  # Pillow is pinned for the script tests (CI) and the runtime build.
    with Image.open(io.BytesIO(data)) as image:
        if image.format != 'PNG':
            raise ValueError('A Ren\'Py placeholder is not a PNG; review the SDK web build.')
        rgba = image.convert('RGBA')
    quantized = rgba.quantize(colors=colours, method=Image.Quantize.FASTOCTREE).convert('RGBA')
    # Fully transparent and fully opaque pixels keep their exact alpha: one preview pixel covers a 32x32
    # block of the stretched picture, so a stray alpha would show as a faint square.
    pixels = []
    for (red, green, blue, alpha), original in zip(quantized.getdata(), rgba.getdata()):
        if original[3] == 0:
            pixels.append((0, 0, 0, 0))
        else:
            pixels.append((red, green, blue, 255 if original[3] == 255 else alpha))
    palette = sorted(set(pixels))
    if len(palette) > 256:
        raise ValueError('Placeholder palette does not fit in 8 bits.')
    position = {colour: index for index, colour in enumerate(palette)}
    indexed = Image.new('P', rgba.size)
    indexed.putdata([position[pixel] for pixel in pixels])
    indexed.putpalette([value for colour in palette for value in colour], rawmode='RGBA')
    buffer = io.BytesIO()
    indexed.save(buffer, 'PNG', optimize=True)
    smaller = buffer.getvalue()
    return smaller if len(smaller) < len(data) else data


def shrink_placeholders(archive: Path, colours: int = COLOURS) -> dict:
    """Rewrite game.zip in place; returns the placeholder count and bytes before and after."""
    archive = Path(archive)
    partial = archive.with_name(archive.name + '.tmp')
    count = before = after = 0
    with zipfile.ZipFile(archive) as source, zipfile.ZipFile(partial, 'w') as target:
        for info in source.infolist():
            data = source.read(info)
            if info.filename.startswith(PREFIX) and not info.is_dir():
                count += 1
                before += len(data)
                data = _palette_png(data, colours)
                after += len(data)
            target.writestr(info, data, compress_type=info.compress_type, compresslevel=9 if info.compress_type == zipfile.ZIP_DEFLATED else None)
    with zipfile.ZipFile(partial) as check:
        if check.testzip() is not None:
            raise ValueError('The rewritten game.zip failed its CRC check.')
    partial.replace(archive)
    return {'placeholders': count, 'bytesBefore': before, 'bytesAfter': after}
