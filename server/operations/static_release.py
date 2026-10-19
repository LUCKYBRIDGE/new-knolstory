"""Private, bounded static-release copy/restore. No archive extraction or activation."""
import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import stat
import uuid

MAX_FILES = 20000
MAX_BYTES = 3 * 1024 ** 3
MAX_MANIFEST_BYTES = 8 * 1024 ** 2
CHUNK_BYTES = 1024 ** 2
RUN = re.compile(r'^[a-f0-9]{32}$')
SHA = re.compile(r'^[a-f0-9]{64}$')


def _fail():
    raise ValueError('Static release validation failed; source and partial outputs are preserved.')


def release_base():
    return Path.home() / '.local/share/knolstory-next-releases'


def _run(value):
    if not isinstance(value, str) or not RUN.fullmatch(value):
        _fail()
    return value


def restore_root(run, base=None):
    return Path(base if base is not None else release_base()) / 'restores' / _run(run)


def _safe_path(value):
    if not isinstance(value, str) or not value or '\\' in value or ':' in value or any(ord(char) < 32 or ord(char) == 127 for char in value):
        _fail()
    parts = value.split('/')
    if any(part in ('', '.', '..') for part in parts) or str(PurePosixPath(value)) != value:
        _fail()
    for part in parts:
        name = part.lower()
        if (name.startswith('.env') or name in ('.npmrc', '.pypirc', '.netrc', 'credentials.json',
                'credentials', 'id_rsa', 'id_dsa', 'id_ecdsa', 'id_ed25519')
                or name.endswith(('.pem', '.key', '.p12', '.pfx', '.keystore'))):
            _fail()
    return value


def _ancestors(path):
    # Check lexical components before any mkdir or file read, including parents
    # above the release root. Do not resolve away an explicitly supplied symlink.
    absolute = path.absolute()
    for component in reversed(absolute.parents):
        if component.exists() or component.is_symlink():
            info = component.lstat()
            if not stat.S_ISDIR(info.st_mode):
                _fail()


def _node(path, directory=False, private=False):
    info = path.lstat()
    if (not (stat.S_ISDIR(info.st_mode) if directory else stat.S_ISREG(info.st_mode))
            or (not directory and info.st_nlink != 1)):
        _fail()
    if private and stat.S_IMODE(info.st_mode) != (0o700 if directory else 0o600):
        _fail()
    return info


def _mkdir(path, fresh=False):
    if fresh:
        path.mkdir(mode=0o700)
    else:
        # Build parents individually so every newly created directory is private.
        if not path.exists():
            _mkdir(path.parent)
            path.mkdir(mode=0o700)
    _node(path, directory=True)
    # Existing user system parents need not be 0700; the release root and every
    # directory below it are checked separately before storing private bytes.


def _private_dir(path, fresh=False):
    _mkdir(path, fresh)
    _node(path, directory=True, private=True)


def _read(path, max_bytes=None, private=False):
    before = _node(path, private=private)
    fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
    with os.fdopen(fd, 'rb') as stream:
        current = os.fstat(stream.fileno())
        if (current.st_ino, current.st_dev) != (before.st_ino, before.st_dev) or current.st_nlink != 1:
            _fail()
        if max_bytes is not None and current.st_size > max_bytes:
            _fail()
        digest, total, chunks = hashlib.sha256(), 0, []
        while True:
            block = stream.read(CHUNK_BYTES)
            if not block:
                break
            total += len(block)
            if total > (MAX_BYTES if max_bytes is None else max_bytes):
                _fail()
            digest.update(block)
            if max_bytes is not None:
                chunks.append(block)
        return digest.hexdigest(), total, b''.join(chunks)


def _tree(root, private=False):
    _node(root, directory=True, private=private)
    result, total = [], 0
    def visit(folder, prefix=''):
        nonlocal total
        for item in sorted(folder.iterdir(), key=lambda path: path.name):
            name = _safe_path(prefix + item.name)
            info = item.lstat()
            if stat.S_ISDIR(info.st_mode):
                _node(item, directory=True, private=private)
                visit(item, name + '/')
            else:
                sha, size, _ = _read(item, private=private)
                total += size
                result.append({'path': name, 'sha256': sha, 'bytes': size})
                if len(result) > MAX_FILES or total > MAX_BYTES:
                    _fail()
    visit(root)
    return {'version': 1, 'files': result, 'bytes': total}


def _exclusive(path):
    return os.fdopen(os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600), 'wb')


def _copy_file(source, target, entry):
    before = _node(source)
    fd = os.open(source, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
    with os.fdopen(fd, 'rb') as reader:
        info = os.fstat(reader.fileno())
        if (info.st_ino, info.st_dev) != (before.st_ino, before.st_dev) or info.st_nlink != 1:
            _fail()
        with _exclusive(target) as writer:
            digest, total = hashlib.sha256(), 0
            while True:
                block = reader.read(CHUNK_BYTES)
                if not block:
                    break
                total += len(block)
                if total > entry['bytes']:
                    _fail()
                writer.write(block)
                digest.update(block)
            if total != entry['bytes'] or digest.hexdigest() != entry['sha256']:
                _fail()


def _copy_tree(source, target, manifest):
    _private_dir(target, fresh=True)
    for entry in manifest['files']:
        destination = target / entry['path']
        _mkdir(destination.parent)
        _node(destination.parent, directory=True, private=True)
        _copy_file(source / entry['path'], destination, entry)


def _manifest_bytes(manifest):
    data = (json.dumps(manifest, ensure_ascii=True, separators=(',', ':')) + '\n').encode()
    if len(data) > MAX_MANIFEST_BYTES:
        _fail()
    return data


def _unique_pairs(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            _fail()
        result[key] = value
    return result


def _parse_manifest(data):
    try:
        manifest = json.loads(data, object_pairs_hook=_unique_pairs)
    except (ValueError, UnicodeError, RecursionError):
        _fail()
    if (not isinstance(manifest, dict) or set(manifest) != {'version', 'files', 'bytes'}
            or type(manifest['version']) is not int or manifest['version'] != 1
            or not isinstance(manifest['files'], list) or len(manifest['files']) > MAX_FILES
            or type(manifest['bytes']) is not int or not 0 <= manifest['bytes'] <= MAX_BYTES):
        _fail()
    seen, total = set(), 0
    for item in manifest['files']:
        if not isinstance(item, dict) or set(item) != {'path', 'sha256', 'bytes'}:
            _fail()
        name = _safe_path(item['path'])
        if (name in seen or not isinstance(item['sha256'], str) or not SHA.fullmatch(item['sha256'])
                or type(item['bytes']) is not int or not 0 <= item['bytes'] <= MAX_BYTES):
            _fail()
        seen.add(name)
        total += item['bytes']
    if total != manifest['bytes'] or total > MAX_BYTES:
        _fail()
    return manifest


def verify_release(root, expected_sha):
    """Verify a release layout against an independently trusted manifest digest."""
    if not isinstance(expected_sha, str) or not SHA.fullmatch(expected_sha):
        _fail()
    root = Path(root)
    _ancestors(root)
    _node(root, directory=True, private=True)
    if {item.name for item in root.iterdir()} != {'manifest.json', 'files'}:
        _fail()
    digest, _, data = _read(root / 'manifest.json', MAX_MANIFEST_BYTES, private=True)
    if digest != expected_sha:
        _fail()
    manifest = _parse_manifest(data)
    actual = _tree(root / 'files', private=True)
    if sorted(actual['files'], key=lambda item: item['path']) != sorted(manifest['files'], key=lambda item: item['path']) or actual['bytes'] != manifest['bytes']:
        _fail()
    return manifest


def _new_release(base, kind):
    _ancestors(base)
    _private_dir(base)
    _private_dir(base / kind)
    run = uuid.uuid4().hex
    root = base / kind / run
    _private_dir(root, fresh=True)
    return run, root


def _report(run, manifest, digest):
    return {'run': run, 'files': len(manifest['files']), 'bytes': manifest['bytes'], 'manifestSha256': digest}


def backup_release(source, base=None):
    source = Path(source)
    _ancestors(source)
    manifest = _tree(source)
    data = _manifest_bytes(manifest)
    run, root = _new_release(Path(base if base is not None else release_base()), 'backups')
    _copy_tree(source, root / 'files', manifest)
    if _tree(source) != manifest:
        _fail()
    with _exclusive(root / 'manifest.json') as stream:
        stream.write(data)
    digest = hashlib.sha256(data).hexdigest()
    verify_release(root, digest)
    return _report(run, manifest, digest)


def restore_release(run, expected_sha, base=None):
    base = Path(base if base is not None else release_base())
    source = base / 'backups' / _run(run)
    manifest = verify_release(source, expected_sha)
    restored_run, target = _new_release(base, 'restores')
    _copy_tree(source / 'files', target / 'files', manifest)
    # Preserve the exact authenticated bytes; do not silently rewrite the manifest.
    digest, _, data = _read(source / 'manifest.json', MAX_MANIFEST_BYTES, private=True)
    if digest != expected_sha:
        _fail()
    with _exclusive(target / 'manifest.json') as stream:
        stream.write(data)
    verify_release(source, expected_sha)
    verify_release(target, expected_sha)
    return {**_report(run, manifest, expected_sha), 'restoreRun': restored_run}


def main(argv=None):
    parser = argparse.ArgumentParser(description='Private static release backup and isolated restore verification.')
    parser.add_argument('--restore-run')
    parser.add_argument('--manifest-sha')
    args = parser.parse_args(argv)
    if args.restore_run:
        if not args.manifest_sha:
            parser.error('--restore-run requires --manifest-sha')
        result = restore_release(args.restore_run, args.manifest_sha)
    else:
        if args.manifest_sha:
            parser.error('--manifest-sha requires --restore-run')
        result = backup_release(Path(__file__).resolve().parents[2] / 'apps/web/out')
        result = restore_release(result['run'], result['manifestSha256'])
    print(json.dumps(result, sort_keys=True))


if __name__ == '__main__':
    try:
        main()
    except (OSError, ValueError):
        raise SystemExit('Static release operation failed; original and partial private outputs are preserved.')
