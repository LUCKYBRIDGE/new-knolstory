"""Activate the approved static ingress image only; retain API/DB and rollback.

Read existing mount paths/configuration in memory; never generate or publish a
credential. Use only the clean approved compose file and --no-deps ingress.
"""
import datetime
import hashlib
import http.client
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import time

ROOT = Path(__file__).resolve().parents[5]
SOURCE = ROOT / '.cache/image-preload-release-source'
NAMES = ['knolstory-next-production-db-1', 'knolstory-next-production-api-1', 'knolstory-next-production-ingress-1']


def command(args, env=None):
    result = subprocess.run(args, env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=120)
    if result.returncode:
        raise RuntimeError('Approved ingress operation failed; credential/configuration values were not printed.')
    return result.stdout


def inspect(name):
    return json.loads(command(['docker', 'inspect', name]))[0]


def env_map(container):
    return dict(value.split('=', 1) for value in container['Config']['Env'] if '=' in value)


def local(path):
    connection = http.client.HTTPConnection('127.0.0.1', 15501, timeout=3)
    try:
        connection.request('GET', path, headers={'Host': 'story.knolquiz.com'})
        response = connection.getresponse()
        return response.status, response.read()
    finally:
        connection.close()


def main():
    ci = json.loads(command(['gh', 'run', 'view', '41541314201', '--json', 'headSha,status,conclusion']))
    build = json.loads((ROOT / '.cache/image-preload-ingress-build.json').read_text())
    if ci != {'conclusion': 'success', 'headSha': build['sourceCommit'], 'status': 'completed'}:
        raise ValueError('The exact approved source must pass main CI before activation.')
    deployed = (ROOT / '.cache/image-preload-pages-deploy.log').read_text()
    if 'Deployment complete!' not in deployed:
        raise ValueError('The same candidate Pages deployment has not completed.')
    before = json.loads((ROOT / '.cache/image-preload-production-before.json').read_text())
    containers = {name: inspect(name) for name in NAMES}
    for name in NAMES:
        if containers[name]['Id'] != before['containers'][name]['id'] or containers[name]['Image'] != before['containers'][name]['image']:
            raise ValueError('Production changed since the recorded preflight; refusing to overwrite concurrent work.')
    api, db, ingress = (containers[name] for name in [NAMES[1], NAMES[0], NAMES[2]])
    api_env, ingress_env = env_map(api), env_map(ingress)
    secret = next(row['Source'] for row in api['Mounts'] if row['Destination'] == '/run/knolstory-production')
    owner = next(row['Source'] for row in db['Mounts'] if row['Destination'] == '/run/knolstory-production-owner')
    if ingress_env['KNOLSTORY_PUBLIC_ORIGIN'] != 'https://story.knolquiz.com':
        raise ValueError('The approved public origin differs from production.')
    stat = Path(secret).stat()
    environment = dict(os.environ,
                       KNOLSTORY_PRODUCTION_SECRET_DIR=secret,
                       KNOLSTORY_PRODUCTION_OWNER_DIR=owner,
                       KNOLSTORY_SECRET_UID=str(stat.st_uid), KNOLSTORY_SECRET_GID=str(stat.st_gid),
                       KNOLSTORY_AUTH_ORIGIN=ingress_env['KNOLSTORY_PUBLIC_ORIGIN'],
                       KNOLSTORY_REDIRECT_FROM_ORIGIN=ingress_env.get('KNOLSTORY_REDIRECT_FROM_ORIGIN', ''))
    for name in ['KAKAO_CLIENT_ID_FILE', 'KAKAO_CLIENT_SECRET_FILE', 'GOOGLE_CLIENT_ID_FILE', 'GOOGLE_CLIENT_SECRET_FILE']:
        environment[name] = api_env.get(name, '')
    compose = ['docker', 'compose', '--project-name', 'knolstory-next-production',
               '--file', str(SOURCE / 'server/compose.production.yml'), 'up', '-d', '--no-deps', 'ingress']
    previous = before['containers'][NAMES[2]]['image']
    expected = hashlib.sha256((ROOT / '.cache/pages-candidate-image-preload-20261103/site/index.html').read_bytes()).hexdigest()
    try:
        command(['docker', 'image', 'tag', build['imageDigest'], 'knolstory-next-ingress:production'])
        command(compose, environment)
        deadline = time.monotonic() + 30
        while True:
            try:
                status, body = local('/')
                if status == 200 and hashlib.sha256(body).hexdigest() == expected:
                    break
            except (OSError, http.client.HTTPException):
                pass
            if time.monotonic() > deadline:
                raise RuntimeError('New ingress did not serve the expected static index.')
            time.sleep(0.5)
        status, body = local('/api/v1/auth/config')
        if status != 200:
            raise RuntimeError('Existing API configuration route failed through the new ingress.')
        config = json.loads(body)
        anonymous, _ = local('/api/v1/me')
        if anonymous != 401:
            raise RuntimeError('Anonymous API authorization boundary changed.')
        after = {name: inspect(name) for name in NAMES}
        for name in NAMES[:2]:
            if after[name]['Id'] != containers[name]['Id'] or after[name]['Image'] != containers[name]['Image']:
                raise RuntimeError('API or DB container changed during ingress-only activation.')
        if after[NAMES[2]]['Image'] != build['imageDigest']:
            raise RuntimeError('Activated ingress image differs from its verified source.')
        spec = importlib.util.spec_from_file_location('static_deploy_preservation', ROOT / 'docs/architecture/evidence/isolated-restore-2026-11-03/measurement/restore-backup.py')
        module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
        database = module.inventory(module.SOURCE)
        if database != before['database']:
            raise RuntimeError('Database inventory drift requires review; no database repair or rollback is attempted.')
        report = {'checkedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
                  'sourceCommit': build['sourceCommit'], 'newImageDigest': build['imageDigest'],
                  'apiAndDatabaseContainersUnchanged': True, 'databaseInventoryUnchanged': True,
                  'databaseTables': len(database['tables']), 'indexSha256': expected,
                  'apiConfigStatus': status, 'anonymousMeStatus': anonymous,
                  'providers': config['data']['providers'], 'noCredentialValuesOrPathsPublished': True,
                  'activation': 'Existing configuration reused in memory; ingress-only no-deps replacement. No API image, migration, credential generation or secret update.'}
        (ROOT / '.cache/image-preload-ingress-activation.json').write_text(json.dumps(report, indent=2) + '\n')
        print(json.dumps(report))
    except BaseException:
        command(['docker', 'image', 'tag', previous, 'knolstory-next-ingress:production'])
        command(compose, environment)
        raise


if __name__ == '__main__':
    main()
