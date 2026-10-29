"""Create a new local-only static delivery candidate with unchanged serving paths.

This is not a publisher. Media and opaque runtime rights still require the
separate delivery preflight, and objects must be served at the same origin.
"""
import argparse
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import shutil
import subprocess

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('candidate_delivery_audit', ROOT / 'scripts/static-delivery-audit.py')
AUDIT = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(AUDIT)


def checked_roots(source, output, max_site_bytes):
    source, output = Path(source), Path(output)
    if source.is_symlink() or not source.is_dir():
        raise ValueError('The source must be a real static build directory.')
    if output.is_symlink() or output.exists():
        raise ValueError('The candidate output must not already exist.')
    source, output = source.resolve(), output.resolve()
    if source.is_relative_to(output) or output.is_relative_to(source):
        raise ValueError('Source and candidate directories must not overlap.')
    if not isinstance(max_site_bytes, int) or isinstance(max_site_bytes, bool) or max_site_bytes < 1:
        raise ValueError('The site file limit must be a positive integer.')
    return source, output


def input_files(source, max_site_bytes):
    """Check every input before creating a candidate or copying any bytes."""
    files, excluded = [], []
    for directory, dirs, names in os.walk(source, followlinks=False):
        for name in sorted(dirs + names):
            path = Path(directory) / name
            relative = path.relative_to(source).as_posix()
            if path.is_symlink():
                raise ValueError(f'Symlinks are not candidate inputs: {relative}')
            if not path.is_file():
                continue
            if '\\' in relative or any(ord(character) < 32 for character in relative):
                raise ValueError('Candidate inputs must have safe relative serving paths.')
            size = path.stat().st_size
            if path.suffix.lower() == '.json' and size > AUDIT.PAGES_MAX_BYTES:
                raise ValueError(f'Large JSON requires private-data review: {relative}')
            if AUDIT.private_artifact(relative) or AUDIT.manuscript_json(path, size):
                raise ValueError(f'Private artifacts are not candidate inputs: {relative}')
            record = {'path': relative, 'bytes': size, 'sha256': AUDIT.digest(path)}
            if relative == 'runtime.zip':
                excluded.append({**record, 'reason': 'download-only-archive'})
            else:
                files.append({**record, 'tier': 'objects' if size > max_site_bytes else 'site'})
    return sorted(files, key=lambda item: item['path']), excluded


def source_commit():
    try:
        result = subprocess.run(['git', 'rev-parse', '--verify', 'HEAD'], cwd=ROOT,
                                stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, check=False)
    except OSError:
        return None
    return result.stdout.decode().strip() if result.returncode == 0 else None


def publication_audit(source):
    registry = ROOT / 'packages/asset-registry/src'
    catalog = json.loads((registry / 'catalog.json').read_text())
    provenance = json.loads((registry / 'media-provenance.json').read_text())['entries']
    return AUDIT.audit(source, catalog=catalog, provenance=provenance,
                       tracked=AUDIT.tracked_sources())


def verify_audit_inputs(records, report):
    audited = {item['path']: item for item in report['files']}
    for record in records:
        observed = audited.get(record['path'])
        if not observed or any(observed[key] != record[key] for key in ('sha256', 'bytes')):
            raise ValueError('Source inventory changed between planning and publication audit.')


def copy_verified(source, output, files):
    for record in files:
        original = source / record['path']
        destination = output / record['tier'] / record['path']
        # Validate again after planning: a changed build must not silently turn
        # into a different candidate or a symlink read outside its source root.
        if original.is_symlink() or not original.resolve().is_relative_to(source):
            raise ValueError('A source changed to an unsafe path while preparing the candidate.')
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(original, destination)
        if destination.stat().st_size != record['bytes'] or AUDIT.digest(destination) != record['sha256']:
            raise ValueError('Source bytes changed or copy verification failed.')


def prepare(source, output, *, max_site_bytes=AUDIT.PAGES_MAX_BYTES, pages_only=False):
    source, output = checked_roots(source, output, max_site_bytes)
    files, excluded = input_files(source, max_site_bytes)
    oversized = next((item for item in files if item['tier'] == 'objects'), None)
    if pages_only and oversized:
        raise ValueError(f"Pages-only candidate exceeds the file limit: {oversized['path']} ({oversized['bytes']} bytes; limit {max_site_bytes}).")
    report = publication_audit(source)
    verify_audit_inputs(files + excluded, report)
    report_bytes = (json.dumps(report, ensure_ascii=False, indent=2) + '\n').encode('utf-8')
    manifest = {
        'formatVersion': 1,
        'localOnly': True,
        'preflightApproval': False,
        'passesPreflight': report['summary']['passesPreflight'],
        'sourcePreflightReport': 'publication-audit.json',
        'sourceAuditSha256': hashlib.sha256(report_bytes).hexdigest(),
        'note': 'Local execution candidate only. Unknown media/runtime rights are preserved, not approved. Serve both tiers at their original same-origin paths.',
        'sourceCommit': source_commit(),
        'sourceCommitMeaning': 'Repository HEAD, not proof that the input build matches that commit.',
        'tierLimits': {'siteMaxFileBytes': max_site_bytes, 'reference': 'https://developers.cloudflare.com/pages/platform/limits/'},
        'files': files,
        'excluded': excluded,
    }
    # mkdir is the ownership boundary; never clean an existing or competing tree.
    output.parent.mkdir(parents=True, exist_ok=True)
    output.mkdir(exist_ok=False)
    try:
        (output / 'site').mkdir()
        (output / 'objects').mkdir()
        copy_verified(source, output, files)
        (output / 'publication-audit.json').write_bytes(report_bytes)
        (output / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    except BaseException:
        shutil.rmtree(output)
        raise
    return manifest


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=ROOT / 'apps/web/out')
    parser.add_argument('--output', type=Path, required=True, help='New local-only candidate directory. Never overwritten.')
    parser.add_argument('--max-site-bytes', type=int, default=AUDIT.PAGES_MAX_BYTES)
    parser.add_argument('--pages-only', action='store_true', help='Reject serving files larger than the Pages limit instead of creating object-tier files.')
    args = parser.parse_args(argv)
    try:
        manifest = prepare(args.root, args.output, max_site_bytes=args.max_site_bytes, pages_only=args.pages_only)
    except (ValueError, OSError) as issue:
        parser.error(str(issue))
    print(json.dumps({'localOnly': True, 'preflightApproval': False,
                      'files': len(manifest['files']), 'excluded': len(manifest['excluded']),
                      'objectFiles': sum(item['tier'] == 'objects' for item in manifest['files'])}))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
