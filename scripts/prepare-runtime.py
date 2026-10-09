#!/usr/bin/env python3
"""Prepare the pinned shared Ren'Py Web SDK and Korean font using stdlib only."""
import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import shutil
import stat
import sys
import tarfile
import tempfile
import urllib.request
import zipfile

ROOT = Path(__file__).resolve().parents[1]
VERSION = '8.5.3'
SDK_NAME = 'renpy-' + VERSION + '-sdk'
MARKER = '.knolstory-pinned-install.json'
RESOURCES = {
    'sdk.tar.bz2': (
        'https://www.renpy.org/dl/8.5.3/renpy-8.5.3-sdk.tar.bz2',
        'eb0a9be7f0fb13632fe25ceade9a8bed5a1b4d6b6e83bd19eeeb29e1a1bb4a45'),
    'web.zip': (
        'https://www.renpy.org/dl/8.5.3/renpy-8.5.3-web.zip',
        '954db897e65f51ea63cb2fb7b203d02be0447f4e22069514020bbe6c6691fdfc'),
    'NotoSansKR.ttf': (
        'https://raw.githubusercontent.com/google/fonts/'
        '9710da1eacb3be272583c3224dcb70f9da6eadbb/ofl/notosanskr/'
        'NotoSansKR%5Bwght%5D.ttf',
        '194018e6b2b293a7964f037b25c0249ce1418bc9ab3c971060a03aa57861e252'),
}


def sha256(path):
    digest = hashlib.sha256()
    with path.open('rb') as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


def verify(path, expected):
    if path.is_symlink() or not path.is_file() or sha256(path) != expected:
        raise ValueError('Unexpected checksum for ' + path.name +
                         '; remove the invalid cached file and retry.')


def fetch_verified(url, target, expected):
    if target.exists() or target.is_symlink():
        verify(target, expected)
        print('Verified cached ' + target.name, flush=True)
        return
    target.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary = tempfile.mkstemp(prefix='.download-', dir=target.parent)
    temporary = Path(temporary)
    try:
        print('Downloading ' + target.name, flush=True)
        with os.fdopen(descriptor, 'wb') as output:
            with urllib.request.urlopen(url, timeout=120) as response:
                shutil.copyfileobj(response, output)
        verify(temporary, expected)
        temporary.replace(target)
    finally:
        temporary.unlink(missing_ok=True)


def member_path(destination, name):
    path = PurePosixPath(name)
    if (path.is_absolute() or '..' in path.parts or '\\' in name or
            ':' in name or not path.parts):
        raise ValueError('Unsafe archive path: ' + name)
    target = destination.joinpath(*path.parts)
    if not target.resolve().is_relative_to(destination.resolve()):
        raise ValueError('Archive path escapes destination: ' + name)
    return target


def extract_tar(archive, destination):
    with tarfile.open(archive, 'r:bz2') as source:
        members = source.getmembers()
        for member in members:
            member_path(destination, member.name)
            if not (member.isfile() or member.isdir()):
                raise ValueError('Unsupported archive link/device: ' + member.name)
        for member in members:
            target = member_path(destination, member.name)
            if member.isdir():
                target.mkdir(parents=True, exist_ok=True)
            else:
                target.parent.mkdir(parents=True, exist_ok=True)
                with source.extractfile(member) as content, target.open('wb') as output:
                    shutil.copyfileobj(content, output)
                target.chmod(member.mode & 0o777)


def extract_zip(archive, destination):
    with zipfile.ZipFile(archive) as source:
        for member in source.infolist():
            member_path(destination, member.filename)
            mode = member.external_attr >> 16
            if stat.S_ISLNK(mode) or (stat.S_IFMT(mode) not in (0, stat.S_IFREG, stat.S_IFDIR)):
                raise ValueError('Unsupported ZIP link/device: ' + member.filename)
        for member in source.infolist():
            target = member_path(destination, member.filename)
            if member.is_dir():
                target.mkdir(parents=True, exist_ok=True)
            else:
                target.parent.mkdir(parents=True, exist_ok=True)
                with source.open(member) as content, target.open('wb') as output:
                    shutil.copyfileobj(content, output)


def regenerated_bytecode(path):
    # SDK Python rewrites bundled bytecode on the first normal web build.
    # Sources, native libraries and runtime payloads remain hash checked.
    return '__pycache__' in path.parts or path.suffix in ('.pyc', '.pyo')


def generated_state(path):
    return (regenerated_bytecode(path) or path.parts[:1] == ('tmp',)
            or path.parts[:3] == ('launcher', 'game', 'saves')
            or path.as_posix() == 'launcher/log.txt')


def file_manifest(directory):
    return {path.relative_to(directory).as_posix(): sha256(path)
            for path in sorted(directory.rglob('*'))
            if path.is_file() and path.relative_to(directory).as_posix() != MARKER
            and not path.is_symlink() and not generated_state(path.relative_to(directory))}


def manifest_matches(directory, manifest):
    if not isinstance(manifest, dict) or not manifest:
        return False
    actual = set()
    for path in directory.rglob('*'):
        if path.is_symlink():
            return False
        relative = path.relative_to(directory)
        if path.is_file() and relative.as_posix() != MARKER and not generated_state(relative):
            actual.add(relative.as_posix())
    expected_files = {name for name in manifest if not generated_state(PurePosixPath(name))}
    if not expected_files or actual != expected_files:
        return False
    for name, expected in manifest.items():
        path = member_path(directory, name)
        # Also accept older markers which included regenerated state.
        if generated_state(PurePosixPath(name)):
            continue
        if path.is_symlink() or not path.is_file() or sha256(path) != expected:
            return False
    return True


def install(cache, reinstall=False):
    hashes = {name: resource[1] for name, resource in RESOURCES.items()}
    sdk = cache / SDK_NAME
    if sdk.is_symlink():
        raise ValueError('SDK destination must not be a symlink.')
    for name, (url, expected) in RESOURCES.items():
        fetch_verified(url, cache / name, expected)
    if sdk.exists() and not reinstall:
        marker_path = sdk / MARKER
        try:
            marker = json.loads(marker_path.read_text())
        except (OSError, ValueError):
            marker = {}
        if marker.get('resources') == hashes and manifest_matches(sdk, marker.get('files')):
            print('Verified pinned SDK installation.', flush=True)
            return
        raise ValueError('Existing SDK is unmarked or modified. Use --reinstall to '
                         'replace only this generated SDK after staging a verified copy.')
    with tempfile.TemporaryDirectory(prefix='.install-', dir=cache) as temporary:
        stage = Path(temporary)
        print('Extracting verified SDK and Web support.', flush=True)
        extract_tar(cache / 'sdk.tar.bz2', stage)
        staged_sdk = stage / SDK_NAME
        extract_zip(cache / 'web.zip', staged_sdk)
        for required in ('renpy.sh', 'launcher', 'web/renpy.wasm', 'web/renpy-pre.js'):
            if not (staged_sdk / required).exists():
                raise ValueError('Incomplete pinned runtime: ' + required)
        marker = {'version': VERSION, 'resources': hashes, 'files': file_manifest(staged_sdk)}
        (staged_sdk / MARKER).write_text(json.dumps(marker, sort_keys=True) + '\n')
        backup = stage / 'previous-sdk'
        if sdk.exists():
            sdk.rename(backup)
        try:
            staged_sdk.rename(sdk)
        except OSError:
            if backup.exists():
                backup.rename(sdk)
            raise
    print('Prepared Ren\'Py ' + VERSION + ' and verified Noto Sans KR.', flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--cache-dir', type=Path, default=ROOT / '.cache/renpy')
    parser.add_argument('--reinstall', action='store_true',
                        help='Replace an existing generated SDK after verification and staging.')
    args = parser.parse_args()
    if sys.platform == 'win32':
        parser.exit(1, 'Use WSL2 with Linux Python, Node and pnpm for the pinned Ren\'Py build.\n')
    if (ROOT / 'renpy/RENPY_VERSION').read_text().strip() != VERSION:
        parser.exit(1, 'Runtime version changed; review official URLs and hashes explicitly.\n')
    try:
        cache = args.cache_dir.resolve()
        cache.mkdir(parents=True, exist_ok=True)
        install(cache, args.reinstall)
    except (OSError, ValueError, tarfile.TarError, zipfile.BadZipFile) as error:
        parser.exit(1, str(error) + '\n')


if __name__ == '__main__':
    main()
