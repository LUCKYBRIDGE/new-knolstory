"""Verify/recover reviewed expression sprites from tracked originals, never change the catalogue."""
import argparse
import hashlib
import io
import json
from pathlib import Path
from PIL import Image, __version__ as PILLOW_VERSION

ROOT = Path(__file__).resolve().parents[1]
RECEIPT = 'docs/architecture/evidence/character-expression-expansion-2026-11-11/generation.json'


def digest(data):
    return hashlib.sha256(data).hexdigest()


def verify(root=ROOT, restore=False):
    root = Path(root).resolve()
    data = json.loads((root / RECEIPT).read_text())
    if PILLOW_VERSION != data['toolchain']['pillow']:
        raise ValueError('Use reviewed Pillow ' + data['toolchain']['pillow'])
    catalog = {a['id']: a for a in json.loads((root / 'packages/asset-registry/src/catalog.json').read_text())}
    for row in data['assets']:
        paths = []
        for key, prefix in [('sourceFile', 'assets/source/characters/expressions-v1/'),
                            ('output', 'apps/web/public/assets/characters/expressions-v1/')]:
            name = row[key]
            path = root / name
            if (not name.startswith(prefix) or '..' in Path(name).parts or '\\' in name
                    or not path.resolve().is_relative_to(root)
                    or any(p.is_symlink() for p in [path, *path.parents] if p.is_relative_to(root))):
                raise ValueError('Unsafe source/output path: ' + name)
            paths.append(path)
        source, output = paths
        if digest(source.read_bytes()) != row['sourceSha256']:
            raise ValueError('Generated original changed: ' + row['id'])
        with Image.open(source) as original:
            resized = original.convert('RGBA').resize(tuple(row['normalization']['size']), Image.Resampling.LANCZOS)
        image = Image.new('RGBA', (800, 1200))
        image.alpha_composite(resized, tuple(row['normalization']['offset']))
        encoded = io.BytesIO()
        image.save(encoded, 'WEBP', lossless=True, method=6)
        if digest(encoded.getvalue()) != row['outputSha256']:
            raise ValueError('Derivative toolchain differs: ' + row['id'])
        if not output.exists() and restore:
            output.parent.mkdir(parents=True, exist_ok=True)
            with output.open('xb') as stream:
                stream.write(encoded.getvalue())
        if not output.is_file() or digest(output.read_bytes()) != row['outputSha256']:
            raise ValueError('Missing/changed expression; restore current checkout: ' + row['id'])
        asset = catalog[row['id']]
        if (asset['revision'] != row['outputSha256'] or asset['src'] != '/' + row['output'].removeprefix('apps/web/public/')
                or asset['sourcePath'] != RECEIPT + '#' + row['id'] or not asset['metadata'].get('generatedExpressionAsset')):
            raise ValueError('Catalogue does not resolve reviewed expression: ' + row['id'])
        alpha = image.getchannel('A')
        box = alpha.point(lambda value: 255 if value >= 16 else 0).getbbox()
        if box is None or box[0] <= 0 or box[1] <= 0 or box[2] >= 800 or box[3] >= 1200:
            raise ValueError('Visible character is clipped: ' + row['id'])
        left, top, right, bottom = box
        if asset['geometry'] != dict(left=left/800, right=right/800, top=top/1200, bottom=bottom/1200, width=800, height=1200):
            raise ValueError('Geometry differs: ' + row['id'])
        for point in row.get('transparentGapSamples', []):
            if alpha.getpixel(tuple(point)) != 0:
                raise ValueError('Opaque background residue: ' + row['id'])
    return {'verifiedExpressions': len(data['assets']), 'previousCataloguePreserved': True}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--restore', action='store_true', help='Restore missing derivatives only; preserve changed existing files.')
    args = parser.parse_args()
    print(json.dumps(verify(restore=args.restore)))
