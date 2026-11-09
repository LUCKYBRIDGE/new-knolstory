"""Measure actual Docker VM Unix-volume permissions without production resources.

Only task-created volume/containers are initialized or removed. No host ports,
external networking, API/DB/private mounts, registry pushes, keys or configuration.
"""
import datetime
import hashlib
import json
from pathlib import Path
import subprocess
import tempfile
import time
import uuid

ROOT = Path(__file__).resolve().parents[5]
MEASUREMENT = Path(__file__).resolve().parent
IMAGE = 'knolstory-next-ingress:image-preload-20261103-2279342'
LABEL = 'knolstory.measurement=rate-socket-boundary'


def command(args, check=True):
    result = subprocess.run(['docker', *args], capture_output=True, text=True, timeout=45)
    if check and result.returncode:
        raise RuntimeError('Isolated Docker measurement failed: ' + result.stderr.strip()[:500])
    return result


def main():
    run_id = uuid.uuid4().hex
    prefix = 'knolstory-rate-socket-' + run_id
    volume = prefix + '-volume'
    containers = []
    created_volume = False
    report = {'runId': run_id, 'checkedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
              'scope': 'Actual local Docker VM shared named volume and Linux UID permissions; not cloudflared process authentication or production activation.',
              'productionChanges': False, 'hostPorts': [], 'containerNetwork': 'none'}
    source_names = ['server/operations/production-ingress.mjs', 'server/operations/trusted-ingress-socket.mjs', 'server/http/client-bucket-proof.mjs']
    report['sourceSha256'] = {name: hashlib.sha256((ROOT / name).read_bytes()).hexdigest() for name in source_names}
    try:
        if command(['volume', 'ls', '--format', '{{.Name}}']).stdout.splitlines().count(volume):
            raise RuntimeError('Refusing an existing volume name.')
        image = json.loads(command(['image', 'inspect', IMAGE]).stdout)[0]['Id']
        report['runtimeImageDigest'] = image
        command(['volume', 'create', '--label', LABEL, volume]); created_volume = True
        with tempfile.TemporaryDirectory(prefix='rate-socket-fixture-', dir=ROOT / '.cache') as temporary:
            fixture = Path(temporary); fixture.chmod(0o755); (fixture / 'index.html').write_text('Isolated export fixture')
            def run_args(suffix, user, readonly_volume=True):
                name = prefix + '-' + suffix
                if command(['ps', '-a', '--filter', 'name=^/' + name + '$', '--format', '{{.Names}}']).stdout.strip():
                    raise RuntimeError('Refusing an existing container name.')
                containers.append(name)
                return ['run', '--pull=never', '--name', name, '--label', LABEL, '--network', 'none', '--user', user,
                        '--read-only', '--cap-drop=ALL', '--security-opt', 'no-new-privileges:true',
                        '--mount', f'type=volume,src={volume},dst=/shared' + (',readonly' if readonly_volume else '')]
            init = run_args('init', '0:0', False)
            init += ['--cap-add=CHOWN', image, 'node', '-e', "const f=require('fs');f.chmodSync('/shared',0o755);f.mkdirSync('/shared/private',{mode:0o700});f.chownSync('/shared/private',1000,1000);"]
            command(init)
            mounts = []
            for name in source_names:
                mounts += ['--mount', f'type=bind,src={ROOT / name},dst=/source/{name},readonly']
            mounts += ['--mount', f'type=bind,src={MEASUREMENT},dst=/measurement,readonly']
            mounts += ['--mount', f'type=bind,src={fixture},dst=/fixture,readonly']
            server = run_args('server', '1000:1000', False)
            command([*server, '-d', *mounts, image, 'node', '/measurement/docker-socket-server.mjs'])
            deadline = time.monotonic() + 20
            ready = None
            while time.monotonic() < deadline:
                logs = command(['logs', prefix + '-server']).stdout
                for line in logs.splitlines():
                    try:
                        value = json.loads(line)
                    except json.JSONDecodeError:
                        continue
                    if value.get('stage') == 'ready':
                        ready = value
                if ready:
                    break
                state = command(['inspect', '--format', '{{.State.Running}}', prefix + '-server']).stdout.strip()
                if state != 'true':
                    raise RuntimeError('Isolated socket fixture stopped: ' + command(['logs', prefix + '-server'], check=False).stderr[:500])
                time.sleep(0.2)
            if not ready:
                raise RuntimeError('Isolated socket fixture readiness timed out.')
            report['server'] = ready
            client_mount = ['--mount', f'type=bind,src={MEASUREMENT / "docker-socket-client.mjs"},dst=/client.mjs,readonly']
            report['allowedClient'] = json.loads(command([*run_args('allowed', '1000:1000'), *client_mount, image, 'node', '/client.mjs']).stdout)
            report['deniedClient'] = json.loads(command([*run_args('denied', '1001:1001'), *client_mount, image, 'node', '/client.mjs']).stdout)
            report['success'] = report['allowedClient']['allProofsVerified'] and report['deniedClient']['socketDenied']
            report['limits'] = ['Two containers sharing UID1000 are both trusted principals; this does not identify the cloudflared binary.',
                                'Only source-mounted runtime was used; the modified ingress Dockerfile was not built.',
                                'No Cloudflare/Tunnel header provenance or real production UID/volume configuration was activated.']
    except BaseException as error:
        report['success'] = False
        report['failure'] = str(error)
        raise
    finally:
        cleaned = []
        for name in reversed(containers):
            listed = command(['ps', '-a', '--filter', 'name=^/' + name + '$', '--format', '{{.Names}}']).stdout.strip()
            if listed:
                labels = command(['inspect', '--format', '{{index .Config.Labels "knolstory.measurement"}}', name]).stdout.strip()
                if labels != 'rate-socket-boundary':
                    raise RuntimeError('Refusing cleanup of an unexpectedly owned container.')
                command(['rm', '-f', name]); cleaned.append(name)
        if created_volume:
            labels = command(['volume', 'inspect', '--format', '{{index .Labels "knolstory.measurement"}}', volume]).stdout.strip()
            if labels != 'rate-socket-boundary':
                raise RuntimeError('Refusing cleanup of an unexpectedly owned volume.')
            command(['volume', 'rm', volume])
        report['cleanup'] = {'containersRemoved': len(cleaned), 'volumeRemoved': created_volume, 'names': cleaned,
                             'preexistingResourcesChanged': False}
        path = MEASUREMENT.parent / 'docker-socket-boundary.json'
        if path.exists():
            path = ROOT / '.cache' / ('docker-socket-boundary-' + run_id + '.json')
        path.write_text(json.dumps(report, indent=2) + '\n')
        print(json.dumps({'report': str(path.relative_to(ROOT)), 'success': report.get('success'), 'cleanup': report['cleanup']}))


if __name__ == '__main__':
    main()
