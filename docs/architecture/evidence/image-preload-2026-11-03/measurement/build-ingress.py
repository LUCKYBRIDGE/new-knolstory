"""Build only the approved ingress source and exact sealed static serving files.

Stream the Docker context instead of creating another full 598MB host copy.
No API image, credentials, user manuscripts or working-tree experiments enter it.
"""
import hashlib
import io
import json
from pathlib import Path, PurePosixPath
import shutil
import subprocess
import tarfile

ROOT = Path(__file__).resolve().parents[5]
COMMIT = '22793422a8a734f93791fbed478681b2c2a59c1b'
SOURCE = ROOT / '.cache/image-preload-release-source'
CANDIDATE = ROOT / '.cache/pages-candidate-image-preload-20261103'
TAG = 'knolstory-next-ingress:image-preload-20261103-2279342'


def main():
    observed = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=SOURCE).decode().strip()
    if observed != COMMIT:
        raise ValueError('Ingress build source is not the approved commit.')
    manifest = json.loads((CANDIDATE / 'manifest.json').read_text())
    rows = [row for row in manifest['files'] if row['tier'] == 'site']
    if shutil.disk_usage(ROOT).free < sum(row['bytes'] for row in rows) + 1024 ** 3:
        raise ValueError('Insufficient room for the new image plus1GiB reserve.')
    files = []
    for name in ['server/Dockerfile.ingress', 'server/operations/production-ingress.mjs']:
        path = SOURCE / name
        sealed = subprocess.check_output(['git', 'show', COMMIT + ':' + name], cwd=ROOT)
        if path.read_bytes() != sealed:
            raise ValueError('The isolated source file differs from its commit.')
        files.append((name, path, hashlib.sha256(sealed).hexdigest(), len(sealed)))
    for row in rows:
        name = row['path']
        if PurePosixPath(name).is_absolute() or '..' in PurePosixPath(name).parts:
            raise ValueError('Invalid candidate serving path.')
        path = CANDIDATE / 'site' / name
        if path.is_symlink() or not path.is_file() or path.stat().st_size != row['bytes']:
            raise ValueError('Candidate file metadata changed.')
        files.append(('apps/web/out/' + name, path, row['sha256'], row['bytes']))
    child = subprocess.Popen(['docker', 'build', '--network=none', '--pull=false',
                              '--file', 'server/Dockerfile.ingress', '--tag', TAG, '-'], stdin=subprocess.PIPE)
    try:
        with tarfile.open(fileobj=child.stdin, mode='w|') as archive:
            directories = {str(parent) for name, _, _, _ in files for parent in PurePosixPath(name).parents if str(parent) != '.'}
            for name in sorted(directories, key=lambda value: (value.count('/'), value)):
                info = tarfile.TarInfo(name + '/'); info.type = tarfile.DIRTYPE; info.mode = 0o755
                archive.addfile(info)
            for name, path, expected, size in files:
                data = path.read_bytes()
                if len(data) != size or hashlib.sha256(data).hexdigest() != expected:
                    raise ValueError('Candidate bytes changed before streamed image creation.')
                info = tarfile.TarInfo(name); info.size = size; info.mode = 0o644
                archive.addfile(info, io.BytesIO(data))
        child.stdin.close()
        if child.wait(timeout=180) != 0:
            raise RuntimeError('The isolated ingress image build failed.')
    except BaseException:
        child.kill(); child.wait(); raise
    image = subprocess.check_output(['docker', 'image', 'inspect', '--format', '{{.Id}}', TAG]).decode().strip()
    output = {'sourceCommit': COMMIT, 'imageTag': TAG, 'imageDigest': image,
              'staticFiles': len(rows), 'staticBytes': sum(row['bytes'] for row in rows),
              'sourceFiles': {name: digest for name, _, digest, _ in files[:2]},
              'scope': 'Only approved source plus exact candidate bytes; streamed context; no API, secrets, external registry push or activation.'}
    (ROOT / '.cache/image-preload-ingress-build.json').write_text(json.dumps(output, indent=2) + '\n')
    print(json.dumps(output))


if __name__ == '__main__':
    main()
