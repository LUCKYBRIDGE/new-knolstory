"""Verify tracked transparency repairs, or restore missing derivatives from tracked PNGs.

Never writes the catalogue or replaces an existing changed file. Paths and byte
hashes belong to the reviewed generation receipt, not a machine-local cache.
"""
import argparse
import hashlib
import io
import json
from pathlib import Path

from PIL import Image, __version__ as PILLOW_VERSION

ROOT = Path(__file__).resolve().parents[1]
RECEIPT = 'docs/architecture/evidence/transparency-repair-2026-11-11/generation.json'


def sha(data):
    return hashlib.sha256(data).hexdigest()


def prepare(root=ROOT, restore=False):
    root = Path(root).resolve()
    receipt = json.loads((root / RECEIPT).read_text())
    catalog = {a['id']: a for a in json.loads((root / 'packages/asset-registry/src/catalog.json').read_text())}
    if PILLOW_VERSION != receipt['toolchain']['pillow']:
        raise ValueError('Use the reviewed Pillow version: ' + receipt['toolchain']['pillow'])
    for row in receipt['assets']:
        paths = []
        for name, prefix in [(row['sourceFile'], 'assets/source/characters/transparency-v2/'),
                             (row['output'], 'apps/web/public/assets/characters/transparency-v2/')]:
            path = root / name
            if (not name.startswith(prefix) or '..' in Path(name).parts or '\\' in name
                    or not path.resolve().is_relative_to(root)
                    or any(p.is_symlink() for p in [path, *path.parents] if p.is_relative_to(root))):
                raise ValueError('Unsafe repair path: ' + name)
            paths.append(path)
        source, output = paths
        if sha(source.read_bytes()) != row['sourceSha256']:
            raise ValueError('Generated source changed; restore current Git checkout: ' + row['id'])
        with Image.open(source) as source_image:
            image = source_image.convert('RGBA').resize(tuple(row['canvas']), Image.Resampling.LANCZOS)
        encoded = io.BytesIO()
        image.save(encoded, 'WEBP', lossless=True, method=6)
        data = encoded.getvalue()
        if sha(data) != row['outputSha256']:
            raise ValueError('Derivative toolchain differs from reviewed bytes: ' + row['id'])
        if not output.exists() and restore:
            output.parent.mkdir(parents=True, exist_ok=True)
            with output.open('xb') as target:
                target.write(data)
        if not output.is_file() or sha(output.read_bytes()) != row['outputSha256']:
            raise ValueError('Missing or changed repair; restore current Git checkout: ' + row['id'])
        asset = catalog[row['id']]
        if (asset['revision'] != row['outputSha256'] or asset['src'] != '/' + row['output'].removeprefix('apps/web/public/')
                or asset['sourcePath'] != RECEIPT + '#' + row['id']
                or not asset['metadata'].get('generatedTransparencyRepair')):
            raise ValueError('Catalogue does not resolve the reviewed repair: ' + row['id'])
        with Image.open(output) as derivative:
            alpha = derivative.convert('RGBA').getchannel('A')
            left, top, right, bottom = alpha.point(lambda value: 255 if value >= 16 else 0).getbbox()
            width, height = derivative.size
            geometry = dict(left=left/width, right=right/width, top=top/height, bottom=bottom/height, width=width, height=height)
            if geometry != asset['geometry']:
                raise ValueError('Catalogue geometry changed: ' + row['id'])
            for point in row['transparentGapSamples']:
                if alpha.getpixel(tuple(point)) != 0:
                    raise ValueError('Background residue in reviewed negative space: ' + row['id'])
            for point in row['preservedClothingSamples']:
                if alpha.getpixel(tuple(point)) < 240:
                    raise ValueError('Clothing was incorrectly erased: ' + row['id'])
    return {'verifiedRepairs': len(receipt['assets']), 'stableIdsPreserved': True}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--restore', action='store_true', help='Recreate missing WebP derivatives only; keep existing files intact.')
    args = parser.parse_args()
    print(json.dumps(prepare(restore=args.restore)))
