"""Prepare/check the authorized local eight-book test environment. No release approval."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
RUNTIME_FILES = ['index.html', 'renpy.wasm', 'renpy.js', 'renpy.data',
                 'game.zip', 'knol-bridge.js', 'runtime-contract.js']


def supported_node(value):
    match = re.fullmatch(r'v?(\d+)\.(\d+)\.(\d+)', value.strip())
    return bool(match and tuple(map(int, match.groups())) >= (22, 13, 0))


def media_errors(root, records):
    return [r['file'] for r in records if not (root / r['file']).is_file()
            or hashlib.sha256((root / r['file']).read_bytes()).hexdigest() != r['sha256']]


def runtime_errors(root):
    return [name for name in RUNTIME_FILES if not (root / name).is_file()
            or (root / name).stat().st_size == 0]


def static_runtime_errors(source, output):
    missing = runtime_errors(source) + runtime_errors(output)
    return sorted(set(missing + [name for name in RUNTIME_FILES if name not in missing
                                 and hashlib.sha256((source / name).read_bytes()).digest()
                                 != hashlib.sha256((output / name).read_bytes()).digest()]))


def tool_versions():
    errors = []
    for name in ['git', 'node', 'pnpm']:
        if not shutil.which(name):
            errors.append(f'{name} is missing from PATH')
            continue
        result = subprocess.run([name, '--version'], capture_output=True, text=True, cwd=ROOT)
        value = result.stdout.strip()
        print(f'{name}: {value}', flush=True)
        if result.returncode:
            errors.append(f'{name} --version failed')
        elif name == 'node' and not supported_node(value):
            errors.append('Node >=22.13.0 required')
        elif name == 'pnpm' and value != json.loads((ROOT / 'package.json').read_text())['packageManager'].split('@')[1]:
            errors.append('Use the pnpm version pinned by package.json (corepack enable)')
    if sys.version_info < (3, 9):
        errors.append('Python >=3.9 required')
    return errors


def prepare_commands(legacy):
    return [[sys.executable, 'scripts/restore-legacy-media.py', str(legacy)],
            ['pnpm', 'install', '--frozen-lockfile'],
            [sys.executable, 'scripts/prepare-runtime.py'],
            ['pnpm', 'exec', 'playwright', 'install', 'chromium'],
            [sys.executable, 'spikes/renpy-web/build.py'], ['pnpm', 'build']]


def run(command, env=None):
    print('+ ' + ' '.join(command), flush=True)
    subprocess.run(command, cwd=ROOT, check=True, env=env)


def doctor():
    errors = tool_versions()
    inventory = json.loads((ROOT / 'packages/asset-registry/src/media-provenance.json').read_text())
    # Build-generated duplicate/runtime media are checked by provenance after building.
    records = [r for r in inventory['entries'] if r['file'].startswith('apps/web/public/assets/')]
    missing = media_errors(ROOT, records)
    if missing:
        errors.append(f'{len(missing)} missing/changed source media; prepare with --legacy an authorized checkout. First: {missing[0]}')
    else:
        print(f'Source media: {len(records)} hashes verified')
    missing_runtime = runtime_errors(ROOT / 'apps/web/public/runtime')
    if missing_runtime:
        errors.append('Build the pinned runtime; missing: ' + ', '.join(missing_runtime))
    stale = static_runtime_errors(ROOT / 'apps/web/public/runtime', ROOT / 'apps/web/out/runtime')
    if stale:
        errors.append('Static preview runtime missing/stale; pnpm build. Files: ' + ', '.join(stale))
    if not (ROOT / 'node_modules/typescript').exists():
        errors.append('Dependencies missing; pnpm install --frozen-lockfile')
    if not (ROOT / 'apps/web/out/index.html').is_file():
        errors.append('Static app missing; pnpm build')
    if not errors:
        probe = subprocess.run(['pnpm', 'exec', 'node', '--input-type=module', '-e',
                                "import {chromium} from '@playwright/test'; const b=await chromium.launch({channel:process.env.KNOL_BROWSER_CHANNEL || undefined}); console.log('Browser: '+b.version()); await b.close();"], cwd=ROOT)
        if probe.returncode:
            errors.append('Browser launch failed; pnpm exec playwright install chromium (Linux may need install-deps chromium)')
    for error in errors:
        print('ERROR: ' + error, file=sys.stderr)
    print('Owner-authorized legacy design/resource reuse is recorded in legacy-ui-media.json. Physical school/Android hardware is not verified.')
    return 1 if errors else 0


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['prepare', 'doctor', 'verify'])
    parser.add_argument('--legacy', type=Path, help='Existing authorized story-maker checkout; never cloned automatically')
    args = parser.parse_args()
    if args.action == 'prepare':
        if args.legacy is None:
            parser.error('prepare requires --legacy (existing authorized checkout)')
        errors = tool_versions()
        if errors:
            raise SystemExit('\n'.join(errors))
        if sys.platform == 'win32':
            raise SystemExit('Run preparation inside WSL2 with Linux Node/pnpm/Python; see README.')
        for command in prepare_commands(args.legacy.resolve()):
            run(command)
        return doctor()
    if args.action == 'doctor':
        return doctor()
    if doctor():
        return 1
    for command in [[sys.executable, '-m', 'unittest', 'discover', '-s', 'scripts/tests'],
                    ['pnpm', 'typecheck'], ['pnpm', 'lint'], ['pnpm', 'test:coverage'],
                    ['pnpm', 'test:media-provenance'],
                    ['pnpm', 'exec', 'playwright', 'test', 'entry-cover.spec.ts', 'four-work-library.spec.ts', 'four-work-shortstory.spec.ts', '--project=host'],
                    ['pnpm', 'exec', 'playwright', 'test', 'entry-cover.spec.ts', '--project=stories-runtime', '--grep', 'all eight'],
                    ['pnpm', 'exec', 'playwright', 'test', 'four-work-runtime.spec.ts', '--project=stories-runtime'],
                    ['pnpm', 'exec', 'playwright', 'test', 'existing-score-runtime.spec.ts', '--project=stories-runtime', '--grep', 'heungbu: actual']]:
        environment = dict(os.environ, KNOL_TEST_STATIC='1')
        if command[-1] == 'heungbu: actual':
            environment['KNOL_COVER_ARCHIVE'] = str(ROOT / 'docs/architecture/evidence/four-work-library/entry-cover/heungbu-cover.knolstory')
        run(command, environment)
    return 0


if __name__ == '__main__':
    try:
        raise SystemExit(main())
    except (OSError, subprocess.CalledProcessError) as error:
        raise SystemExit(f'Environment preparation/check failed: {error}')
