"""Run only the path-inspection fixture via a private temporary Node copy; never install it."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[5]
BASE = Path(__file__).resolve().parents[1]
def digest(handle):
    value = hashlib.sha256()
    for chunk in iter(lambda: handle.read(1024 * 1024), b''):
        value.update(chunk)
    return value.hexdigest()

source = Path(shutil.which('node')).resolve(strict=True)
with source.open('rb') as handle:
    source_sha = digest(handle)
parent = Path(tempfile.mkdtemp(prefix='proof-node-fixture-', dir=ROOT / '.cache'))
os.chmod(parent, 0o700)
try:
    (parent / 'bin').mkdir(mode=0o700)
    (parent / 'lib').mkdir(mode=0o700)
    library = source.parent.parent / 'lib/libnode.127.dylib'
    if library.is_file():
        shutil.copyfile(library, parent / 'lib/libnode.127.dylib')
        os.chmod(parent / 'lib/libnode.127.dylib', 0o400)
    copied = parent / 'bin/node'
    shutil.copyfile(source, copied)
    os.chmod(copied, 0o500)
    with copied.open('rb') as handle:
        if digest(handle) != source_sha:
            raise RuntimeError('Temporary runtime copy differs.')
    run = subprocess.run([str(copied), str(BASE / 'measurement/preflight-host.mjs')], cwd=ROOT, capture_output=True, timeout=30)
    if run.returncode:
        raise RuntimeError('Preflight fixture failed; no production changes requested.')
finally:
    shutil.rmtree(parent)
report_path = BASE / 'preflight-host-2026-11-04.json'
report = json.loads(report_path.read_text())
report['fixtureNodeCopySha256'] = source_sha
report['fixtureRuntimeScope'] = 'Private executable and relative libnode fixture only; other dynamically loaded Homebrew/system libraries remain unchanged and are not verified as a sealed runtime.'
report['fixtureNodeCopyRemoved'] = not parent.exists()
report['preflightSourceSha256'] = hashlib.sha256((ROOT / 'server/operations/client-proof-preflight.mjs').read_bytes()).hexdigest()
report_path.write_text(json.dumps(report, indent=2) + '\n')
print(run.stdout.decode().strip())
