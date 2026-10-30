"""Derive smaller child sprites on the original canvas without changing source art.

The transformation preserves legacy bytes and rights status. It does not redraw,
license, publish, crop, stretch or alpha-normalize a character to adult height.
"""
import argparse
from copy import deepcopy
import hashlib
import io
import os
import tempfile
import json
import math
from pathlib import Path
try:
    from PIL import Image, __version__ as PILLOW_VERSION, features
except ImportError as error:
    raise SystemExit("Character image preparation requires Pillow 11.3.0; install with python3 -m pip install Pillow==11.3.0.") from error

ROOT = Path(__file__).resolve().parents[1]
CATALOG = Path('packages/asset-registry/src/catalog.json')
OUTPUT = 'assets/characters/stature-v2'
ALPHA_THRESHOLD = 16
PLAN = [
    {'id': 'rabbit-turtle.character.turtle-child-unified-720x900',
     'source': 'assets/legacy-18da4fc/rabbit-turtle.character.turtle-child-unified-720x900.webp',
     'sourceSha256': '901b1552b90b631e6ecbc184328dfb8fe920f2769bab5404c3159b3accd8dbd3', 'scale': .72},
    {'id': 'rabbit-turtle.character.turtle-child-flashback',
     'source': 'assets/legacy-18da4fc/rabbit-turtle.character.turtle-child-flashback.webp',
     'sourceSha256': '66e6eaa3056ba6cca8dae8c13a9a73d247088fac03c69357b72c9de27a68792d', 'scale': .72},
    {'id': 'seonnyeo.character.classic-children',
     'source': 'assets/legacy-18da4fc/seonnyeo.character.classic-children.webp',
     'sourceSha256': 'bcf370f13f4ee617e1905df52cc34e5b3cb557b4a967c7124772371c75b7e40d', 'scale': .62},
]


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def painted_box(image):
    box = image.getchannel('A').point(lambda alpha: 255 if alpha > ALPHA_THRESHOLD else 0).getbbox()
    if box is None:
        raise ValueError('A character must contain visible pixels.')
    return box


def geometry(image):
    left, top, right, bottom = painted_box(image)
    width, height = image.size
    return {'left': left / width, 'right': right / width, 'top': top / height,
            'bottom': bottom / height, 'width': width, 'height': height}


def pad_character(original, scale):
    if (not isinstance(scale, (int, float)) or isinstance(scale, bool) or
            not math.isfinite(scale) or scale <= 0 or scale > 1):
        raise ValueError('Child scale must be finite, greater than zero and no greater than one.')
    original = original.convert('RGBA')
    width, height = original.size
    resized_size = (round(width * scale), round(height * scale))
    if min(resized_size) < 1:
        raise ValueError('Child scale must retain nonzero image dimensions.')
    resized = original.resize(resized_size, Image.Resampling.LANCZOS)
    original_box, resized_box = painted_box(original), painted_box(resized)
    # Align the painted soles, not the transparent canvas edges. This preserves
    # the existing floor coordinate and leaves all additional room above.
    offset = ((width - resized.width) // 2, original_box[3] - resized_box[3])
    if offset[1] < 0 or offset[1] + resized.height > height:
        raise ValueError('Padded character must fit the unchanged source canvas.')
    output = Image.new('RGBA', original.size, (0, 0, 0, 0))
    output.alpha_composite(resized, offset)
    return output, {'method': 'uniform-resize-transparent-headroom', 'scale': scale,
                    'originalCanvas': list(original.size), 'resizedCanvas': list(resized.size),
                    'offset': list(offset), 'alphaThreshold': ALPHA_THRESHOLD,
                    'originalPaintedBox': list(original_box), 'paintedBox': list(painted_box(output))}


def checked_path(boundary, path, label):
    boundary, path = Path(boundary).absolute(), Path(path).absolute()
    if not path.is_relative_to(boundary):
        raise ValueError(f'Invalid {label}: destination escapes its root.')
    chain = [boundary]
    relative = path.relative_to(boundary)
    chain.extend(boundary.joinpath(*relative.parts[:index]) for index in range(1, len(relative.parts) + 1))
    if any(part.is_symlink() for part in chain):
        raise ValueError(f'Invalid {label}: symlink paths are not accepted.')
    if not path.resolve().is_relative_to(boundary.resolve()):
        raise ValueError(f'Invalid {label}: resolved destination escapes its root.')
    return path


def publish_bytes(root, path, data):
    # Inputs/directories must stay immutable while this local preparation runs.
    # A fresh same-directory file and replace never truncate a hard-linked
    # existing file or follow a final symlink when publishing bytes.
    checked_path(root, path, 'output')
    path.parent.mkdir(parents=True, exist_ok=True)
    descriptor, staged = tempfile.mkstemp(prefix='.stature-', suffix='.tmp', dir=path.parent)
    try:
        with os.fdopen(descriptor, 'wb') as stream:
            stream.write(data)
        checked_path(root, path, 'output')
        os.replace(staged, path)
    finally:
        Path(staged).unlink(missing_ok=True)


def checked_source(public, row):
    name = row['source']
    path = checked_path(public, public / name, 'character source')
    if (not name.startswith('assets/legacy-18da4fc/') or '..' in Path(name).parts or
            path.is_symlink() or not path.resolve().is_relative_to(public.resolve())):
        raise ValueError('Character source must be an exact local legacy original.')
    if digest(path) != row['sourceSha256']:
        raise ValueError('Character source bytes changed; review the new source before deriving art.')
    return path


def prepare(root=ROOT, *, plan=PLAN, update_catalog=True):
    root = Path(root).absolute()
    public = checked_path(root, root / 'apps/web/public', 'public root')
    catalog_path = checked_path(root, root / CATALOG, 'catalog')
    catalog = json.loads(catalog_path.read_text())
    by_id = {row['id']: row for row in catalog}
    # Validate all original hashes before writing any output or changing records.
    sources = [(row, checked_source(public, row)) for row in plan]
    if any(row['id'] not in by_id for row in plan):
        raise ValueError('Every transformed character must retain a registered stable ID.')
    destinations = {}
    originals = {path.resolve() for _, path in sources}
    for row, _ in sources:
        name = row['id']
        if (not isinstance(name, str) or not name or '/' in name or '\\' in name or
                name in {'.', '..'} or any(ord(character) < 32 for character in name)):
            raise ValueError('Invalid character destination ID.')
        destination = checked_path(public, public / f'{OUTPUT}/{name}.webp', 'character destination')
        if destination.resolve() in originals:
            raise ValueError('Character destination cannot replace an original source.')
        destinations[name] = destination
    replacements, transforms, staged_outputs = {}, [], []
    for row, source in sources:
        original = Image.open(source).convert('RGBA')
        output, transform = pad_character(original, row['scale'])
        relative = f"{OUTPUT}/{row['id']}.webp"
        destination = destinations[row['id']]
        encoded = io.BytesIO()
        output.save(encoded, 'WEBP', lossless=True, method=6, exact=True)
        encoded_bytes = encoded.getvalue()
        revision = hashlib.sha256(encoded_bytes).hexdigest()
        staged_outputs.append((destination, encoded_bytes))
        transform = {**transform, 'source': row['source'], 'sourceSha256': row['sourceSha256'],
                     'output': relative, 'outputSha256': revision,
                     'rights': 'inherited-from-original; no new redistribution approval',
                     'runtimeScale': 1}
        old = by_id[row['id']]
        metadata = deepcopy(old.get('metadata', {}))
        previous_review = metadata.get('qualityReview', {})
        previous_source = previous_review.get('previousSourceReview', previous_review)
        metadata['statureTransform'] = transform
        metadata['qualityReview'] = {
            'decision': previous_review.get('decision', 'KEEP'), 'sha256': revision,
            'referenceAssetId': previous_review.get('referenceAssetId', row['id']),
            'poseClass': previous_review.get('poseClass', 'standing'),
            'reason': '원본 그림의 가로·세로를 같은 비율로 줄이고 발 기준선을 유지한 투명 캔버스 파생본. 얼굴·의상·포즈·원본 파일 및 자산 ID 보존. 새 해부학적 검수나 배포 권리 승인을 뜻하지 않음.',
            'evidence': 'scripts/prepare-character-stature-assets.py',
            'previousSourceReview': previous_source,
        }
        replacements[row['id']] = {**old, 'src': '/' + relative, 'revision': revision,
                                    'geometry': geometry(output), 'metadata': metadata}
        transforms.append({'id': row['id'], **transform})
    # Validate every encoded restore candidate before replacing any good file.
    if not update_catalog:
        for row in plan:
            current = by_id[row['id']]
            expected = replacements[row['id']]
            if any(current.get(key) != expected.get(key) for key in ('src', 'revision', 'geometry')):
                raise ValueError('Restored child artifact differs from recorded catalog; review toolchain/source.')
    for destination, encoded_bytes in staged_outputs:
        publish_bytes(root, destination, encoded_bytes)
    if update_catalog:
        content = json.dumps([replacements.get(row['id'], row) for row in catalog], ensure_ascii=False, indent=2) + '\n'
        publish_bytes(root, catalog_path, content.encode('utf-8'))
    return {'version': 1, 'toolchain': {'pillow': PILLOW_VERSION, 'webpCodec': features.version('webp')}, 'transforms': transforms,
            'note': 'Derived from protected original bytes. Rights and original identity remain unchanged.'}


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=ROOT)
    parser.add_argument('--restore', action='store_true', help='Recreate and verify already-recorded derived files without editing catalog.')
    parser.add_argument('--manifest', type=Path, help='Optional portable transformation evidence JSON outside public assets.')
    args = parser.parse_args(argv)
    result = prepare(args.root, update_catalog=not args.restore)
    if args.manifest:
        args.manifest.parent.mkdir(parents=True, exist_ok=True)
        args.manifest.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'derivedCharacters': len(result['transforms']), 'originalsPreserved': True}))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
