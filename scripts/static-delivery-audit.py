"""Read-only static package inventory and conservative pre-publication checks.

Pages limits verified 2026-10-29:
https://developers.cloudflare.com/pages/platform/limits/
This does not publish files or declare runtime bundles legally cleared.
"""
import argparse
import hashlib
import importlib.util
import json
import mimetypes
import os
import subprocess
from pathlib import Path, PurePosixPath
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
PAGES_MAX_BYTES = 25 * 1024 * 1024
PAGES_MAX_FILES = 20000
REQUIRED = ['index.html', 'runtime/index.html', 'runtime/renpy.js',
            'runtime/renpy.wasm', 'runtime/renpy.data', 'runtime/game.zip']
SPEC = importlib.util.spec_from_file_location('delivery_provenance', ROOT / 'scripts/media-provenance.py')
PROVENANCE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(PROVENANCE)
BUNDLES = {'.wasm', '.data', '.zip'}
# A transport copy (for example runtime/renpy.data.br) decodes to its source file. It is classified and
# reviewed as that source, never as an ordinary web build file, and needs the source to be present.
TRANSPORT = {'.br': 'br'}
MIME = {'.wasm': 'application/wasm', '.js': 'text/javascript',
        '.data': 'application/octet-stream', '.zip': 'application/zip',
        '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg', '.wav': 'audio/wav'}


def digest(path):
    value = hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            value.update(chunk)
    return value.hexdigest()


def tracked_sources():
    result = subprocess.run(['git', 'ls-files', '-z'], cwd=ROOT, check=True,
                            stdout=subprocess.PIPE)
    return set(result.stdout.decode().split('\0')) - {''}


def source_path(name):
    return 'apps/web/public/' + name


def transport_source(name):
    path = PurePosixPath(name)
    return (path.with_suffix('').as_posix(), TRANSPORT[path.suffix.lower()]) if path.suffix.lower() in TRANSPORT else (None, None)


def media_type(path):
    source, _ = transport_source(Path(path).as_posix())
    if source is not None:
        return media_type(Path(source))
    suffix = path.suffix.lower()
    if suffix in BUNDLES and path.parts[0] == 'runtime':
        return 'runtime-bundle'
    if suffix in {'.ttf', '.woff', '.woff2', '.otf'}:
        return 'font'
    if suffix in {'.wav', '.ogg', '.mp3'}:
        return 'audio'
    if suffix in {'.mp4', '.webm'}:
        return 'video'
    if suffix in PROVENANCE.EXT:
        return 'image'
    return 'web-source-build'


def private_artifact(name):
    path = Path(name)
    return (any(part.startswith('.env') or part in {'saves', '.git', '.cache', 'test-results'}
                for part in path.parts)
            or path.suffix.lower() in {'.log', '.trace', '.network', '.knolstory', '.shortstory', '.pem', '.key', '.rpyc'}
            or path.name.lower() in {'tokens.rpy', 'credentials.json'})


def manuscript_json(path, size):
    if path.suffix.lower() != '.json' or size > PAGES_MAX_BYTES:
        return False
    try:
        value = json.loads(path.read_text())
    except (ValueError, UnicodeError):
        return False
    pending = [value]
    storage_keys = {'localStorage', 'knolstory-next-workspace-v1',
                    'knolstory-shortstory-library-v1', 'knolstory-checkpoints-v1'}
    while pending:
        item = pending.pop()
        if isinstance(item, list):
            pending.extend(item)
        elif isinstance(item, dict):
            authored_rows = any(isinstance(item.get(key), list) for key in ('lines', 'pages'))
            if isinstance(item.get('id'), str) and item['id'] and authored_rows:
                return True
            if (item.get('documentType') == 'story-maker-project' or
                    item.get('format') in ('knolstory', 'shortstory') or
                    storage_keys.intersection(item)):
                return True
            # Explicit document/project wrappers are a known archive boundary,
            # including malformed private drafts that have not acquired an ID.
            project = item.get('project')
            if isinstance(project, dict) and any(isinstance(project.get(key), list) for key in ('lines', 'pages')):
                return True
            pending.extend(child for child in item.values() if isinstance(child, (dict, list)))
    return False


def local_asset_path(src):
    parsed = urlsplit(src)
    if parsed.scheme or parsed.netloc:
        return None
    name = unquote(parsed.path).lstrip('/')
    if not name or '..' in Path(name).parts or '\\' in name:
        raise ValueError('Catalog asset path must stay inside the package.')
    return name


def audit(build_root, *, catalog, provenance, tracked, required=REQUIRED,
          max_file_bytes=PAGES_MAX_BYTES, max_files=PAGES_MAX_FILES, target='free'):
    build_root = Path(build_root).resolve()
    if not build_root.is_dir():
        raise ValueError('Static build directory is missing; build the Web app first.')
    by_source = {record['file']: record for record in provenance}
    catalog_by_path = {}
    blockers, files, found, transports = [], [], set(), []

    def block(name, reason, **detail):
        blockers.append({'path': name, 'reason': reason, **detail})

    for asset in catalog:
        name = local_asset_path(asset['src'])
        if name is not None:
            catalog_by_path.setdefault(name, []).append(asset['id'])
    for directory, dirs, names in os.walk(build_root, followlinks=False):
        for name in sorted(dirs + names):
            path = Path(directory) / name
            relative = path.relative_to(build_root).as_posix()
            if path.is_symlink():
                block(relative, 'symlink-not-allowed')
                continue
            if not path.is_file():
                continue
            found.add(relative)
            size, sha = path.stat().st_size, digest(path)
            source = source_path(relative)
            transport_of, encoding = transport_source(relative)
            # A transport copy has no rights record of its own; it inherits its source's review.
            record = None if transport_of else by_source.get(source)
            kind = media_type(Path(relative))
            if transport_of:
                transports.append((relative, transport_of))
            rights = 'not-media-clearance'
            if relative == 'runtime.zip':
                block(relative, 'non-serving-artifact')
            if private_artifact(relative) or manuscript_json(path, size):
                block(relative, 'private-artifact')
            if size > max_file_bytes:
                block(relative, 'pages-file-too-large', bytes=size, limit=max_file_bytes)
            if record and record['sha256'] != sha:
                rights = 'hash-mismatch'
                block(relative, 'provenance-hash-mismatch')
            elif kind != 'web-source-build':
                credits = record.get('attributionEvidence', []) if record else []
                missing_credits, changed_credits = [], []
                for credit in credits:
                    source_credit = ROOT / credit
                    if (not credit.startswith('apps/web/public/') or '..' in Path(credit).parts or
                            not source_credit.resolve().is_relative_to((ROOT / 'apps/web/public').resolve()) or
                            not source_credit.is_file() or source_credit.is_symlink()):
                        missing_credits.append(credit)
                        continue
                    credit_path = build_root / credit.removeprefix('apps/web/public/')
                    if not credit_path.resolve().is_relative_to(build_root) or not credit_path.is_file() or credit_path.is_symlink():
                        missing_credits.append(credit)
                    elif digest(credit_path) != digest(source_credit):
                        changed_credits.append(credit)
                if missing_credits:
                    block(relative, 'missing-distributed-credit', evidence=missing_credits)
                if changed_credits:
                    block(relative, 'distributed-credit-hash-mismatch', evidence=changed_credits)
                if record and not missing_credits and not changed_credits and PROVENANCE.release_allowed(record, target):
                    rights = 'verified'
                else:
                    rights = 'review-required'
                    block(relative, 'runtime-bundle-review-required' if kind == 'runtime-bundle'
                          else 'unverified-media-rights')
            mime_name = transport_of or relative
            files.append({'path': relative, 'bytes': size, 'sha256': sha,
                          'mimeBasis': 'extension-inferred',
                          'mime': MIME.get(PurePosixPath(mime_name).suffix.lower()) or mimetypes.guess_type(mime_name)[0] or 'application/octet-stream',
                          **({'contentEncoding': encoding, 'transportOf': transport_of} if transport_of else {}),
                          'mediaType': kind,
                          'assetIds': sorted(set(catalog_by_path.get(relative, []) + (record or {}).get('assetIds', []))),
                          'usageReferences': (record or {}).get('usageReferences', []),
                          'license': (record or {}).get('license', 'not-recorded'),
                          'redistribution': (record or {}).get('redistribution', 'not-reviewed'),
                          'rightsStatus': rights,
                          'source': {'path': source if (ROOT / source).is_file() else None,
                                     'gitTracked': source in tracked,
                                     'kind': 'public-source' if (ROOT / source).is_file() else 'generated-build'}})
    for name, asset_ids in sorted(catalog_by_path.items()):
        if name not in found:
            block(name, 'missing-asset', assetIds=asset_ids)
    for source, record in sorted(by_source.items()):
        if source.startswith('apps/web/public/'):
            name = source.removeprefix('apps/web/public/')
            if name not in found and name not in catalog_by_path:
                block(name, 'missing-media', assetIds=record.get('assetIds', []))
    for name in required:
        if name not in found:
            block(name, 'missing-runtime' if name.startswith('runtime/') else 'missing-entrypoint')
    for name, transport_of in transports:
        if transport_of not in found:
            block(name, 'missing-transport-source', source=transport_of)
    if len(files) > max_files:
        block('.', 'pages-file-count-exceeded', files=len(files), limit=max_files)
    return {'version': 1, 'policy': 'Read-only evidence. Unknown rights and opaque runtime bundles block publication; a transport copy such as renpy.data.br is reviewed as its source. No network or deployment performed.',
            'limits': {'host': 'Cloudflare Pages', 'maxFileBytes': max_file_bytes, 'maxFiles': max_files,
                       'reference': 'https://developers.cloudflare.com/pages/platform/limits/'},
            'summary': {'files': len(files), 'bytes': sum(item['bytes'] for item in files),
                        'blockers': len(blockers), 'passesPreflight': not blockers},
            'files': sorted(files, key=lambda item: item['path']),
            'blockers': sorted(blockers, key=lambda item: (item['path'], item['reason']))}


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=ROOT / 'apps/web/out', help='Static build directory (read only).')
    parser.add_argument('--output', type=Path, help='Write JSON report here; default is stdout. Never writes into the build.')
    parser.add_argument('--check', action='store_true', help='Exit 1 if publication blockers exist.')
    parser.add_argument('--target', choices=['free', 'commercial'], default='free')
    parser.add_argument('--max-file-bytes', type=int, default=PAGES_MAX_BYTES)
    parser.add_argument('--max-files', type=int, default=PAGES_MAX_FILES)
    args = parser.parse_args(argv)
    if args.max_file_bytes < 1 or args.max_files < 1:
        parser.error('Limits must be positive.')
    if args.output and args.output.resolve().is_relative_to(args.root.resolve()):
        parser.error('Report output must be outside the audited package.')
    try:
        catalog = json.loads((ROOT / 'packages/asset-registry/src/catalog.json').read_text())
        provenance = json.loads((ROOT / 'packages/asset-registry/src/media-provenance.json').read_text())['entries']
        result = audit(args.root, catalog=catalog, provenance=provenance,
                       tracked=tracked_sources(), max_file_bytes=args.max_file_bytes,
                       max_files=args.max_files, target=args.target)
    except (ValueError, OSError, subprocess.CalledProcessError) as issue:
        parser.error(str(issue))
    text = json.dumps(result, ensure_ascii=False, indent=2) + '\n'
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(text)
    else:
        print(text, end='')
    return int(args.check and bool(result['blockers']))


if __name__ == '__main__':
    raise SystemExit(main())
