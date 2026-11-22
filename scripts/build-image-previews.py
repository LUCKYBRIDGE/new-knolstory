"""Build small WebP previews for every registered catalogue image.

Picker, shelf and page-list cards show these instead of the original image. The
previews are derived build files (not committed): each one is named by the
source revision, and a manifest binds preview bytes to the exact source bytes so
the static delivery audit can inherit the source's rights record.

Default mode skips what it cannot make (missing private media or Pillow) so a
public checkout can still start the dev server; cards then fall back to the
original image. ``--strict`` (used by the release build) fails instead.
"""
import argparse
import hashlib
import io
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REGISTRY = ROOT / 'packages/asset-registry/src'
PUBLIC = ROOT / 'apps/web/public'
GENERATOR = 'scripts/build-image-previews.py'


def config():
    value = json.loads((REGISTRY / 'image-previews.json').read_text())
    directory = value['directory']
    if not directory.startswith('assets/previews/') or '..' in Path(directory).parts:
        raise ValueError('Preview directory must stay under assets/previews/.')
    if value['manifest'] != f'{directory}/manifest.json':
        raise ValueError('Preview manifest must live in the preview directory.')
    return value


def digest(data):
    return hashlib.sha256(data).hexdigest()


def preview_name(settings, revision):
    return f"{settings['directory']}/{revision[:settings['hashLength']]}.webp"


def sources(catalog, settings):
    """Unique catalogue sources keyed by preview path (same bytes share a preview)."""
    rows = {}
    for asset in catalog:
        source = asset['src'].lstrip('/')
        if not source.startswith('assets/') or '..' in Path(source).parts or '?' in source:
            raise ValueError(f"Unexpected catalogue image path: {asset['src']}")
        preview = preview_name(settings, asset['revision'])
        row = rows.setdefault(preview, {'preview': preview, 'source': source, 'sourceSha256': asset['revision'], 'assetIds': []})
        if row['sourceSha256'] != asset['revision']:
            raise ValueError(f'Preview name collision: {preview}')
        row['assetIds'].append(asset['id'])
    return [rows[key] for key in sorted(rows)]


def render(image_module, data, settings):
    with image_module.open(io.BytesIO(data)) as image:
        image.load()
        mode = 'RGBA' if image.mode in {'RGBA', 'LA', 'PA'} or 'transparency' in image.info else 'RGB'
        image = image.convert(mode)
        image.thumbnail((settings['maxWidth'], settings['maxHeight']), image_module.Resampling.LANCZOS, reducing_gap=2.0)
        output = io.BytesIO()
        # exact=False lets the encoder discard colour under fully transparent pixels.
        image.save(output, 'WEBP', quality=settings['quality'], method=settings['method'], exact=False)
        return output.getvalue(), image.size


def build(*, strict=False, public=PUBLIC, catalog=None, log=print):
    settings = config()
    catalog = json.loads((REGISTRY / 'catalog.json').read_text()) if catalog is None else catalog
    rows = sources(catalog, settings)
    directory = public / settings['directory']
    manifest_path = public / settings['manifest']
    try:
        from PIL import Image
    except ImportError:
        if strict:
            raise
        log('Pillow is not installed; image previews skipped (cards fall back to originals).')
        return {'built': 0, 'reused': 0, 'skipped': len(rows)}
    previous = {}
    if manifest_path.is_file():
        try:
            stored = json.loads(manifest_path.read_text())
            if stored.get('settings') == settings:
                previous = {entry['preview']: entry for entry in stored.get('entries', [])}
        except (ValueError, KeyError, TypeError):
            previous = {}
    directory.mkdir(parents=True, exist_ok=True)
    entries, missing, built, reused = [], [], 0, 0
    for row in rows:
        source_path = public / row['source']
        target = public / row['preview']
        old = previous.get(row['preview'])
        if old and old.get('sourceSha256') == row['sourceSha256'] and target.is_file() and digest(target.read_bytes()) == old.get('sha256'):
            entries.append({**old, 'source': row['source'], 'assetIds': row['assetIds']})
            reused += 1
            continue
        if not source_path.is_file():
            missing.append(row['source'])
            continue
        data = source_path.read_bytes()
        if digest(data) != row['sourceSha256']:
            raise ValueError(f"Catalogue revision does not match source bytes: {row['source']}")
        output, (width, height) = render(Image, data, settings)
        target.write_bytes(output)
        entries.append({'preview': row['preview'], 'sha256': digest(output), 'bytes': len(output), 'width': width, 'height': height,
                        'source': row['source'], 'sourceSha256': row['sourceSha256'], 'assetIds': row['assetIds']})
        built += 1
    if missing and strict:
        raise FileNotFoundError(f'{len(missing)} catalogue images are missing; first: {missing[0]}')
    wanted = {entry['preview'] for entry in entries}
    for stale in directory.glob('*.webp'):
        if f"{settings['directory']}/{stale.name}" not in wanted:
            stale.unlink()
    manifest = {'version': 1, 'generator': GENERATOR, 'settings': settings,
                'policy': 'Each preview is a downscaled copy of the named source bytes and inherits that source rights record.',
                'entries': entries}
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=1) + '\n')
    total = sum(entry['bytes'] for entry in entries)
    log(f'Image previews: {len(entries)} ready ({built} built, {reused} reused, {len(missing)} missing source), {total / 1048576:.1f} MiB.')
    return {'built': built, 'reused': reused, 'skipped': len(missing)}


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--strict', action='store_true', help='Fail when Pillow or any catalogue source image is missing.')
    args = parser.parse_args(argv)
    try:
        build(strict=args.strict)
    except (ValueError, OSError, ImportError) as issue:
        print(f'Image preview build failed: {issue}', file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
