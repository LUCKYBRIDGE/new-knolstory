"""Validate new or replaced character sprites against their declared placement reference."""
import hashlib
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REGISTRY = Path('packages/asset-registry/src')
CANVAS = (800, 1200)
FLOOR = 1152
MIN_MARGIN = 8


def validate_sprite(asset, catalog, public):
    asset_id = asset['id']
    review = asset.get('metadata', {}).get('placementReview')
    if not isinstance(review, dict):
        raise ValueError(f'{asset_id}: add metadata.placementReview before registration')

    reference = catalog.get(review.get('referenceId'))
    if (not reference or reference is asset or reference.get('type') != 'character'
            or reference.get('revision') != review.get('referenceRevision')
            or not reference.get('geometry')):
        raise ValueError(f'{asset_id}: select an existing character reference and its revision')
    ratio = review.get('heightRatio')
    if (type(ratio) not in (int, float) or not math.isfinite(ratio) or ratio <= 0
            or not isinstance(review.get('reason'), str) or not review['reason'].strip()):
        raise ValueError(f'{asset_id}: record a positive heightRatio and the reason for that size')

    src = asset['src']
    path = (public / src.lstrip('/')).resolve()
    if not src.startswith('/assets/') or not path.is_relative_to(public.resolve()):
        raise ValueError(f'{asset_id}: character file must be under public/assets')
    if hashlib.sha256(path.read_bytes()).hexdigest() != asset['revision']:
        raise ValueError(f'{asset_id}: file revision differs from catalogue')

    from PIL import Image

    with Image.open(path) as image:
        if image.size != CANVAS or 'A' not in image.getbands():
            raise ValueError(f'{asset_id}: expected a transparent 800×1200 canvas')
        box = image.getchannel('A').point(lambda alpha: 255 if alpha >= 16 else 0).getbbox()
    width, height = CANVAS
    if not box or min(box[0], box[1], width - box[2], height - box[3]) < MIN_MARGIN:
        raise ValueError(f'{asset_id}: leave at least {MIN_MARGIN}px of transparent margin')
    left, top, right, bottom = box
    if abs(bottom - FLOOR) > 6:
        raise ValueError(f'{asset_id}: align the lower visible edge to y={FLOOR}')
    expected = dict(left=left/width, right=right/width, top=top/height, bottom=bottom/height,
                    width=width, height=height)
    if asset.get('geometry') != expected:
        raise ValueError(f'{asset_id}: registered geometry differs from image alpha bounds')

    reference_geometry = reference['geometry']
    reference_height = reference_geometry['bottom'] - reference_geometry['top']
    actual_ratio = ((bottom - top) / height) / reference_height
    if abs(actual_ratio / ratio - 1) > .08:
        raise ValueError(f'{asset_id}: measured height ratio {actual_ratio:.3f} differs from {ratio}')


def check(root=ROOT):
    registry = root / REGISTRY
    entries = json.loads((registry / 'catalog.json').read_text())
    baseline = json.loads((registry / 'character-registration-baseline.json').read_text())
    characters = {asset['id']: asset for asset in entries if asset['type'] == 'character'}
    candidates = [asset for asset in characters.values() if baseline.get(asset['id']) != asset['revision']]
    for asset in candidates:
        validate_sprite(asset, characters, root / 'apps/web/public')
    return len(candidates)


if __name__ == '__main__':
    try:
        count = check()
    except (ValueError, OSError, ZeroDivisionError) as error:
        raise SystemExit(str(error))
    print(f'Character registration: verified {count} new or replaced sprites.')
