"""Fail closed for original, bundled and SDK-progressive service audio bytes."""
import argparse
import hashlib
import json
import re
from urllib.parse import urlparse
from pathlib import Path, PurePosixPath
import zipfile

ROOT = Path(__file__).resolve().parents[1]
EXTENSIONS = {'.wav', '.ogg', '.mp3'}
# Pinned Ren'Py 8.5.3 internal silence, never exposed as author-selectable assets.
# Its distribution license stays in the SDK package at renpy/LICENSE.txt.
ENGINE_SILENCE = {
    'renpy/common/_silence.ogg': 'ee71d750d0e88fb2ea041bff91eb09dd77dec937d6c8b61f3e06897c7fe222b0',
    'renpy/common/_dl_silence.ogg': 'c684c5924391a21e0a6dd6265e6056e35c657f39cdb55985d7685db95553c770',
}

def evidence_exists(root, name):
    if not isinstance(name, str) or PurePosixPath(name).is_absolute():
        return False
    path = (root / name).resolve()
    return path.is_relative_to(root.resolve()) and path.is_file()

def runtime_audio_errors(public, approvals, expected):
    """Native delivery may be bundled or SDK-progressive, never host-on-demand."""
    runtime = public / 'runtime'
    zipped = runtime / 'game.zip'
    loose = list((runtime / 'game').rglob('*')) if (runtime / 'game').exists() else []
    loose_audio = [path for path in loose if path.is_file() and path.suffix.lower() in EXTENSIONS]
    if not zipped.exists():
        return ['Native progressive audio requires its runtime archive/index.'] if loose_audio else []
    errors, found, members, remote = [], set(), set(), set()
    packaged = {row['src'] for row in approvals['assets'] if isinstance(row, dict) and isinstance(row.get('src'), str) and row.get('delivery', 'package') == 'package'}
    with zipfile.ZipFile(zipped) as archive:
        index = 'game/renpyweb_remote_files.txt'
        if archive.namelist().count(index) > 1:
            errors.append('Duplicate runtime progressive index.')
        lines = archive.read(index).decode('utf-8').splitlines() if index in archive.namelist() else []
        if len(lines) % 2:
            errors.append('Malformed runtime progressive index.')
        for name, kind in zip(lines[::2], lines[1::2]):
            if PurePosixPath(name).suffix.lower() not in EXTENSIONS:
                continue
            if (not name.startswith('assets/audio/') or name.startswith('/') or
                    '..' in PurePosixPath(name).parts or '\\' in name or
                    name != PurePosixPath(name).as_posix() or kind != 'music -'):
                errors.append(f'Unsafe progressive audio entry: {name}')
                continue
            source = '/' + name
            if source in remote:
                errors.append(f'Duplicate progressive audio entry: {name}')
            remote.add(source)
            path = runtime / 'game' / name
            if (source not in packaged or not path.is_file() or path.is_symlink() or
                    not path.resolve().is_relative_to(runtime.resolve()) or
                    any(parent.is_symlink() for parent in path.parents if parent == runtime or runtime in parent.parents)):
                errors.append(f'Unapproved or missing progressive audio: {name}')
            elif hashlib.sha256(path.read_bytes()).hexdigest() != expected.get(source):
                errors.append(f'Changed progressive audio: {name}')
        actual_remote = {'/' + path.relative_to(runtime / 'game').as_posix() for path in loose_audio}
        if actual_remote != remote:
            errors.append('Runtime progressive audio files differ from the index.')
        for info in archive.infolist():
            name = info.filename
            if PurePosixPath(name).suffix.lower() not in EXTENSIONS:
                continue
            if name in members:
                errors.append(f'Duplicate runtime audio member: {name}')
            members.add(name)
            if name in ENGINE_SILENCE:
                if hashlib.sha256(archive.read(info)).hexdigest() != ENGINE_SILENCE[name] or 'renpy/LICENSE.txt' not in archive.namelist():
                    errors.append(f'Changed or unlicensed engine silence: {name}')
                continue
            source = name.removeprefix('game')
            found.add(source)
            if source not in packaged or hashlib.sha256(archive.read(info)).hexdigest() != expected.get(source):
                errors.append(f'Unapproved runtime audio: {name}')
        if found & remote:
            errors.append('Audio is duplicated in bundled and native progressive delivery.')
        if found | remote != packaged:
            errors.append('Runtime audio set differs from approved originals; rebuild runtime.')
    return errors

def audit(root=ROOT, source_only=False):
    errors, expected, ids = [], {}, set()
    try:
        approvals = json.loads((root / 'packages/asset-registry/src/audio-service-approvals.json').read_text())
        if approvals.get('version') != 2 or not isinstance(approvals.get('assets'), list) or not approvals['assets']:
            return ['Missing or unsupported service audio approvals.']
        if not isinstance(approvals.get('checkedAt'), str) or not re.fullmatch(r'\d{4}-\d{2}-\d{2}', approvals['checkedAt']) or approvals.get('scope') != 'common-editor-playback-and-project-file-transfer':
            return ['Missing approval review date or common-service scope.']
        provenance = json.loads((root / 'packages/asset-registry/src/media-provenance.json').read_text())
        by_file = {item['file']: item for item in provenance['entries']}
        for row in approvals['assets']:
            if not isinstance(row, dict) or not isinstance(row.get('id'), str) or not re.fullmatch(r'(?:audio:(music|sound):[a-zA-Z0-9_-]+|audio\.cc0\.[a-z0-9_-]+\.[a-z0-9_-]+)', row['id']) or not isinstance(row.get('src'), str) or not isinstance(row.get('sha256'), str) or not re.fullmatch(r'[a-f0-9]{64}', row['sha256']):
                errors.append('Malformed audio approval ID, path or SHA256.')
                continue
            if row.get('delivery', 'package') not in ['package', 'on-demand'] or row.get('delivery') == 'on-demand' and (row.get('license') != 'CC0-1.0' or not re.fullmatch(r'/assets/audio/cc0/[a-z0-9_-]+/v[1-9][0-9]*/[a-z0-9_-]+\.(ogg|mp3|wav)', row.get('src', ''))):
                errors.append('Invalid audio delivery scope.')
                continue
            name = row.get('src', '')
            source = row.get('sourceUrl')
            parsed = urlparse(source) if isinstance(source, str) else None
            if source != 'project-authored' and (not parsed or parsed.scheme != 'https' or not parsed.hostname or parsed.username or parsed.password):
                errors.append(f'Missing or unsafe original source URL: {name}')
            parts = PurePosixPath(name).parts
            if not name.startswith('/assets/audio/') or '..' in parts or PurePosixPath(name).suffix.lower() not in EXTENSIONS:
                errors.append(f'Unsafe approved path: {name}')
                continue
            if row.get('id') in ids or name in expected:
                errors.append(f'Duplicate approval: {name}')
            ids.add(row.get('id'))
            unrestricted = row.get('license') == 'CC0-1.0' and row.get('usage') == 'unrestricted' and row.get('redistribution') == 'permitted' and row.get('editorProvision') == 'permitted' and row.get('standaloneDownload') == 'permitted' and row.get('preview') == 'asset'
            scene_only = row.get('license') == 'Pixabay Content License' and row.get('usage') == 'scene-integrated' and row.get('redistribution') == 'restricted' and row.get('editorProvision') == 'scene-integrated' and row.get('standaloneDownload') == 'prohibited' and row.get('preview') == 'scene'
            if row.get('commercialUse') != 'permitted' or row.get('exportMode') != 'reference' or not (unrestricted or scene_only):
                errors.append(f'Unconfirmed or contradictory scoped service rights: {name}')
            evidence = row.get('evidence')
            if not isinstance(evidence, list) or not evidence or not all(evidence_exists(root, item) for item in evidence):
                errors.append(f'Missing rights evidence: {name}')
            formal = by_file.get('apps/web/public' + name)
            if not formal or row['id'] not in formal.get('assetIds', []) or formal.get('sha256') != row['sha256'] or formal.get('license') != row['license'] or (source != 'project-authored' and formal.get('source') != source) or any(formal.get(key) != row.get(key) for key in ['commercialUse', 'redistribution']):
                errors.append(f'Approval disagrees with formal source/hash/rights: {name}')
            expected[name] = row.get('sha256')
            path = root / 'apps/web/public' / name.lstrip('/')
            if not path.resolve().is_relative_to((root / 'apps/web/public').resolve()) or not path.is_file():
                errors.append(f'Missing or escaped approved original: {name}')
            elif hashlib.sha256(path.read_bytes()).hexdigest() != row.get('sha256'):
                errors.append(f'Changed approved bytes: {name}')
        public = root / 'apps/web/public'
        for path in public.rglob('*'):
            if path.is_file() and path.suffix.lower() in EXTENSIONS and path.relative_to(public).parts[0] != 'runtime':
                name = '/' + path.relative_to(public).as_posix()
                if name not in expected:
                    errors.append(f'Unapproved public audio: {name}')
        if not source_only:
            errors.extend(runtime_audio_errors(public, approvals, expected))
    except (OSError, ValueError, TypeError, AttributeError, zipfile.BadZipFile) as cause:
        errors.append(f'Cannot verify service audio: {cause}')
    return errors

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-only', action='store_true', help='Before rebuilding the generated runtime.')
    args = parser.parse_args()
    problems = audit(source_only=args.source_only)
    if problems:
        raise SystemExit('\n'.join(problems))
    print('Service audio: reviewed scope records and original/runtime hashes verified.')
