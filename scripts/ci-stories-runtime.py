"""Run the full native browser suite on a restricted runner with authorized media."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
ASSETS = Path('apps/web/public/assets')
INVENTORY = ROOT / 'packages/asset-registry/src/media-provenance.json'


def sha256(path):
    digest = hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


def restore_media(source):
    """Copy only missing, hash-verified source files, never replace tracked assets."""
    records = json.loads(INVENTORY.read_text())['entries']
    copies = []
    for row in records:
        path = Path(row['file'])
        if not path.is_relative_to(ASSETS):
            continue
        relative = path.relative_to(ASSETS)
        destination = ROOT / path
        candidate = destination if destination.exists() else source / relative
        base = ROOT / ASSETS if candidate == destination else source
        if (not destination.resolve().is_relative_to(ROOT / ASSETS)
                or not candidate.resolve().is_relative_to(base)
                or not candidate.is_file()
                or sha256(candidate) != row['sha256']):
            raise ValueError(f'Missing or changed authorized source media: {path}')
        if candidate != destination:
            copies.append((candidate, destination))

    for candidate, destination in copies:
        destination.parent.mkdir(parents=True, exist_ok=True)
        with candidate.open('rb') as original, destination.open('xb') as restored:
            shutil.copyfileobj(original, restored)


def safe_result(report):
    """Only test identities and statuses may leave the private runner."""
    data = json.loads(report.read_text())
    outcomes = []

    def visit(suites):
        for suite in suites:
            for spec in suite.get('specs', []):
                for test in spec['tests']:
                    if test['status'] in ('unexpected', 'flaky', 'skipped'):
                        outcomes.append({
                            'file': spec['file'],
                            'title': spec['title'],
                            'status': test['status'],
                        })
            visit(suite.get('suites', []))

    visit(data['suites'])
    return {'stats': data['stats'], 'notable': outcomes}


def write_summary(result):
    text = ['### Stories Runtime E2E']
    if 'stats' in result:
        s = result['stats']
        text.append(f"{s['expected']} passed, {s['unexpected']} failed, "
                    f"{s['skipped']} skipped, {s['flaky']} flaky in {s['duration'] / 1000:.1f} s.")
        text.extend(f"- {row['status']}: {row['file']} — {row['title']}"
                    for row in result['notable'])
    else:
        text.append(result['status'])
    text.append('Full Playwright HTML, traces and screenshots stay on the restricted runner.')
    summary = '\n'.join(text) + '\n'
    for directory in ['playwright-report', 'test-results']:
        (ROOT / directory).mkdir(exist_ok=True)
    (ROOT / 'playwright-report/stories-runtime-summary.md').write_text(summary)
    (ROOT / 'test-results/stories-runtime-summary.json').write_text(json.dumps(result, indent=2) + '\n')
    if destination := os.environ.get('GITHUB_STEP_SUMMARY'):
        with open(destination, 'a') as stream:
            stream.write(summary)


def private_directory(variable):
    configured = os.environ.get(variable)
    if not configured:
        raise ValueError(f'Restricted runner is missing {variable}.')
    path = Path(configured).resolve()
    if not path.is_dir() or path.is_relative_to(ROOT):
        raise ValueError(f'{variable} must be an existing directory outside the checkout.')
    return path


def main():
    try:
        source = private_directory('KNOL_CI_MEDIA_ROOT')
        storage = private_directory('KNOL_CI_PRIVATE_REPORT_ROOT')
        restore_media(source)
    except ValueError as error:
        write_summary({'status': str(error)})
        return 1
    except OSError:
        write_summary({'status': 'Authorized media could not be read or restored on the restricted runner.'})
        return 1

    os.umask(0o077)
    private = Path(tempfile.mkdtemp(prefix='stories-runtime-', dir=storage))
    result = {'status': 'Runtime preparation did not complete.'}
    with (private / 'run.log').open('wb') as log:
        for script in ['runtime:prepare', 'runtime:build']:
            prepared = subprocess.run(['pnpm', script], cwd=ROOT, stdout=log, stderr=subprocess.STDOUT)
            if prepared.returncode:
                write_summary(result)
                return prepared.returncode
        report = private / 'playwright.json'
        env = {
            **os.environ,
            'PLAYWRIGHT_HTML_OUTPUT_DIR': str(private / 'playwright-report'),
            'PLAYWRIGHT_JSON_OUTPUT_FILE': str(report),
            'KNOL_TEST_EVIDENCE_DIR': str(private / 'test-results/evidence'),
            'KNOL_NATIVE_EVIDENCE_DIR': str(private / 'test-results/evidence'),
        }
        run = subprocess.run(
            ['pnpm', 'exec', 'playwright', 'test', '--project=stories-runtime',
             '--workers=2', '--reporter=line,html,json', '--output', str(private / 'test-results')],
            cwd=ROOT, env=env, stdout=log, stderr=subprocess.STDOUT,
        )
    if not report.is_file():
        write_summary({'status': 'Playwright finished without a JSON report.'})
        return run.returncode or 1
    write_summary(safe_result(report))
    return run.returncode


if __name__ == '__main__':
    raise SystemExit(main())
