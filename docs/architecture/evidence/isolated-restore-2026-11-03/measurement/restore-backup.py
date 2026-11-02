"""Verify a previously sealed private backup in a new network-isolated container.

The production connection only executes read-only SQL and schema-only pg_dump.
Restoration targets a new, labelled, network-none, portless temporary container.
No archive paths, rows, credentials, sessions or raw SQL errors enter public proof.
"""
import hashlib
import argparse
import datetime
import json
import os
from pathlib import Path
import re
import subprocess
import time
import uuid

ROOT = Path(__file__).resolve().parents[5]
SOURCE = 'knolstory-next-production-db-1'
INPUT = ROOT / '.cache/restore-audit-private-input.json'
OUTPUT = Path(__file__).resolve().parents[1]
LABEL = 'com.knolstory.isolated-backup-audit'
PSQL = 'exec psql -XqAt -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1'
SCHEMA = 'exec pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --schema-only --no-owner --no-privileges --lock-wait-timeout=5s'
LIST = "SELECT json_agg(schemaname||'.'||tablename ORDER BY schemaname,tablename) FROM pg_tables WHERE schemaname NOT LIKE 'pg_%' AND schemaname<>'information_schema';"


def run(args, data=None, timeout=45):
    result = subprocess.run(args, input=data, stdout=subprocess.PIPE,
                            stderr=subprocess.PIPE, timeout=timeout)
    if result.returncode:
        # Database diagnostics can contain private records. Do not echo them.
        raise RuntimeError('Isolated backup verification command failed; no raw private output published.')
    return result.stdout


def sha(data):
    return hashlib.sha256(data).hexdigest()


def query(container, sql):
    transaction = "BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY; SET TIME ZONE 'UTC';" + sql + 'COMMIT;'
    return run(['docker', 'exec', '-i', container, 'sh', '-c', PSQL], transaction.encode()).decode().strip()


def inventory(container):
    tables = json.loads(query(container, LIST))
    if not tables or any(not re.fullmatch(r'[a-z_][a-z0-9_]*\.[a-z_][a-z0-9_]*', table) for table in tables):
        raise ValueError('Unexpected database table identifier.')
    parts = []
    for table in tables:
        parts.append("SELECT jsonb_build_object('table','" + table + "','rows',count(*),"
                     "'sha256',encode(sha256(convert_to(COALESCE(string_agg(row_hash,'' ORDER BY row_hash),''),'UTF8')),'hex')) AS value "
                     "FROM (SELECT encode(sha256(convert_to(to_jsonb(t)::text,'UTF8')),'hex') AS row_hash FROM " + table + ' t) hashes')
    rows = json.loads(query(container, "SELECT jsonb_agg(value ORDER BY value->>'table') FROM (" + ' UNION ALL '.join(parts) + ') inventory;'))
    schema = run(['docker', 'exec', container, 'sh', '-c', SCHEMA]).decode()
    # Recent pg_dump versions generate a random client-side restrict token.
    # It is not database schema and is intentionally excluded from comparison.
    schema = '\n'.join(line for line in schema.splitlines()
                       if not line.startswith(('\\restrict ', '\\unrestrict ')))
    counts = json.loads(query(container, "SELECT json_build_object('tables',count(*) FILTER (WHERE c.relkind IN ('r','p')),"
                             "'indexes',count(*) FILTER (WHERE c.relkind='i'),'sequences',count(*) FILTER (WHERE c.relkind='S')) "
                             "FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname NOT LIKE 'pg_%' AND n.nspname<>'information_schema';"))
    return {'tables': rows, 'schemaSha256': sha(schema.encode()), 'objectCounts': counts}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--content-check', action='store_true', help='Also read restored projections through current validators; inputs remain private.')
    parser.add_argument('--fence-check', action='store_true', help='Invalidate only the new isolated copy authentication state with the unchanged canonical helper.')
    args = parser.parse_args()
    private = json.loads(INPUT.read_text())
    archive = Path(private['archive'])
    allowed = Path.home() / '.local/share/knolstory-next-production/backups'
    if archive.is_symlink() or not archive.resolve().is_relative_to(allowed.resolve()):
        raise ValueError('Backup is outside the existing private production backup directory.')
    if archive.stat().st_mode & 0o077:
        raise ValueError('Private backup permissions must not expose group/world access.')
    data = archive.read_bytes()
    if len(data) != private['bytes'] or sha(data) != private['sha256']:
        raise ValueError('Previously sealed archive bytes changed.')
    image = run(['docker', 'inspect', '--format', '{{.Image}}', SOURCE]).decode().strip()
    if not re.fullmatch(r'sha256:[a-f0-9]{64}', image):
        raise ValueError('The existing PostgreSQL image is not pinned by digest.')
    name = 'knolstory-restore-audit-' + uuid.uuid4().hex
    runner_name = name + '-fence'
    target_database = 'knolstory_next_restore_' + uuid.uuid4().hex if args.fence_check else 'postgres'
    audit_id = uuid.uuid4().hex
    if run(['docker', 'ps', '-a', '--filter', 'name=^/' + name + '$', '--format', '{{.ID}}']).strip():
        raise ValueError('Restore target already exists.')
    ledger_dir = ROOT / '.cache/restore-audit-runs'
    ledger_dir.mkdir(mode=0o700, exist_ok=True)
    ledger_path = ledger_dir / (audit_id + '.json')
    ledger = {'targetName': name, 'runnerName': runner_name if args.fence_check else None,
              'auditLabel': audit_id, 'state': 'planned', 'targetDatabase': target_database}
    descriptor = os.open(ledger_path, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    with os.fdopen(descriptor, 'w') as output:
        json.dump(ledger, output)
    source_before = inventory(SOURCE)
    creation_attempted = False
    report = {'backupSha256': private['sha256'], 'backupBytes': private['bytes'],
              'checkedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
              'postgresImageDigest': image,
              'sourceAccess': 'Read-only SQL plus schema-only pg_dump; no backup/migration/restore/data writes on production.',
              'target': 'Fresh generated network-none/portless/read-only-root PostgreSQL container with temporary memory-only data.',
              'activation': 'No API, traffic, restored credentials or source roles activated.',
              'limits': ['Logical data/schema restore only; no cluster-role/grant/secret restore.',
                         'No off-host durability/encryption/retention policy selected.',
                         'No application API/content-validator or restore-session-fence execution claimed.']}
    try:
        creation_attempted = True
        run(['docker', 'run', '--detach', '--rm', '--pull=never', '--name', name,
             '--label', LABEL + '=' + audit_id, '--network', 'none', '--read-only',
             '--memory', '256m', '--cpus', '0.5', '--pids-limit', '64',
             '--tmpfs', '/var/lib/postgresql/data:rw,size=128m',
             '--tmpfs', '/var/run/postgresql:rw,size=16m', '--tmpfs', '/tmp:rw,size=16m',
             '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', '-e', 'POSTGRES_USER=postgres',
             '-e', 'POSTGRES_DB=' + target_database, image])
        metadata = json.loads(run(['docker', 'inspect', name]))[0]
        if (metadata['HostConfig']['NetworkMode'] != 'none' or metadata['HostConfig']['PortBindings']
                or not metadata['HostConfig']['ReadonlyRootfs']
                or metadata['Config']['Labels'].get(LABEL) != audit_id):
            raise ValueError('Restore target isolation does not match the requested boundaries.')
        for _ in range(30):
            result = subprocess.run(['docker', 'exec', name, 'pg_isready', '-h', '127.0.0.1', '-U', 'postgres'],
                                    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=5)
            if result.returncode == 0:
                break
            time.sleep(0.5)
        else:
            raise RuntimeError('Temporary PostgreSQL did not become ready.')
        run(['docker', 'exec', '-i', name, 'pg_restore', '-U', 'postgres', '-d', target_database,
             '--single-transaction', '--exit-on-error', '--no-owner', '--no-privileges'], data)
        restored = inventory(name)
        if args.content_check:
            records = json.loads(query(name, "SELECT COALESCE(json_agg(json_build_object('format',format,'clientProjectId',client_project_id,'revision',revision,'projection',projection) ORDER BY scope_id,record_id),'[]') FROM knolstory_storage.records;"))
            blobs = json.loads(query(name, "SELECT COALESCE(json_agg(json_build_object('id',id,'bytes',encode(bytes,'base64')) ORDER BY id),'[]') FROM knolstory_storage.blobs;"))
            migrations = json.loads(query(name, "SELECT json_agg(json_build_object('version',version,'sha256',sha256) ORDER BY version) FROM knolstory_storage.migrations;"))
            private_dir = Path.home() / '.local/share/knolstory-next-production/audits' / audit_id
            private_dir.mkdir(mode=0o700, parents=True, exist_ok=False)
            private_input = private_dir / 'restored-records.json'
            descriptor = os.open(private_input, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
            with os.fdopen(descriptor, 'w') as output:
                json.dump({'records': records, 'blobs': blobs, 'migrations': migrations}, output)
            environment = dict(os.environ, KNOL_RESTORE_PRIVATE_RECORDS_FILE=str(private_input))
            validation = subprocess.run(['pnpm', 'exec', 'vitest', 'run', '--config',
                                         'docs/architecture/evidence/isolated-restore-2026-11-03/measurement/validate-content.vitest.config.ts'],
                                        cwd=ROOT, env=environment, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=60)
            # Keep any tool diagnostics private even if a framework prints paths.
            log = private_dir / 'validator.log'
            log.write_bytes(validation.stdout + validation.stderr)
            log.chmod(0o600)
            if validation.returncode:
                raise RuntimeError('Current validator rejected the isolated restore; private diagnostic preserved.')
            marker = next((line for line in validation.stdout.decode().splitlines() if line.startswith('{"restoredContent":')), None)
            if marker is None:
                raise RuntimeError('Canonical validation produced no bounded summary.')
            report['applicationValidation'] = json.loads(marker)
            report['limits'][-1] = 'Current canonical projections and immutable migrations validated; no authenticated API or restore-session-fence execution claimed.'
        if args.fence_check:
            api_image = run(['docker', 'inspect', '--format', '{{.Image}}', 'knolstory-next-production-api-1']).decode().strip()
            if not re.fullmatch(r'sha256:[a-f0-9]{64}', api_image):
                raise ValueError('The existing runner image must be pinned by digest.')
            helper = ROOT / 'server/operations/restore-session-fence.mjs'
            probe = Path(__file__).resolve().parent / 'fence-copy.mjs'
            # The new runner joins only the fresh restore's network-none namespace.
            # No existing API command, configuration, secrets, ports or startup are used.
            summary = run(['docker', 'run', '--rm', '--pull=never', '-i', '--name', runner_name,
                           '--label', LABEL + '=' + audit_id,
                           '--network', 'container:' + name, '--read-only',
                           '--user', 'node', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges',
                           '--memory', '128m', '--cpus', '0.5', '--pids-limit', '64',
                           '--tmpfs', '/tmp:rw,size=16m',
                           '--mount', 'type=bind,src=' + str(helper) + ',dst=/audit/restore-session-fence.mjs,readonly',
                           '-e', 'PGDATABASE=' + target_database, '--entrypoint', 'node', api_image,
                           '--input-type=module'], probe.read_bytes())
            report['authenticationFence'] = json.loads(summary)
            fenced = inventory(name)
            preserved = [row for row in restored['tables'] if row['table'] not in {'knolstory_auth.sessions', 'knolstory_auth.flows'}]
            actual = [row for row in fenced['tables'] if row['table'] not in {'knolstory_auth.sessions', 'knolstory_auth.flows'}]
            if preserved != actual or restored['schemaSha256'] != fenced['schemaSha256']:
                raise RuntimeError('Authentication maintenance changed unrelated restored data or schema.')
            report['afterFence'] = fenced
            report['authenticationFence']['unrelatedTablesAndSchemaPreserved'] = True
            report['authenticationFence']['runnerImageDigest'] = api_image
            report['authenticationFence']['sourceHelperSha256'] = sha(helper.read_bytes())
            report['limits'][-1] = 'Canonical restored-session invalidation checked on isolated copy; no authenticated HTTP/provider/traffic activation claimed.'
        source_after = inventory(SOURCE)
        report.update(sourceBefore=source_before, restored=restored, sourceAfter=source_after,
                      sourceUnchanged=source_before == source_after,
                      restoredMatchesSource=source_before == restored,
                      isolationVerified=True, restoredSessionsInactive=True)
        if source_before != source_after or source_before != restored:
            raise RuntimeError('Source drift or a restored inventory mismatch requires review; no production change performed.')
        report['status'] = 'isolated-logical-restore-matches-current-source'
    finally:
        if creation_attempted:
            for owned_name in ([runner_name, name] if args.fence_check else [name]):
                inspected = subprocess.run(['docker', 'inspect', owned_name], stdout=subprocess.PIPE,
                                           stderr=subprocess.PIPE, timeout=10)
                if inspected.returncode == 0:
                    current = json.loads(inspected.stdout)[0]
                    if current['Config']['Labels'].get(LABEL) != audit_id:
                        raise ValueError('Refusing to stop a container not owned by this exact audit.')
                    run(['docker', 'stop', '--time', '5', owned_name], timeout=15)
                else:
                    # CLI wording/capitalization/localization is not an existence API.
                    remaining = run(['docker', 'ps', '-a', '--filter', 'name=^/' + owned_name + '$', '--format', '{{.ID}}'])
                    if remaining.strip():
                        raise RuntimeError('Unable to inspect a remaining audit target; no existing container changed.')
            report['temporaryTargetStoppedAndAutoRemoved'] = True
            if args.fence_check:
                report['temporaryRunnerStoppedAndAutoRemoved'] = True
            ledger['state'] = 'owned-containers-absent-after-cleanup'
            ledger_path.write_text(json.dumps(ledger))
    OUTPUT.mkdir(parents=True, exist_ok=True)
    filename = 'database-restore-fence.json' if args.fence_check else 'database-restore-content.json' if args.content_check else 'database-restore.json'
    (OUTPUT / filename).write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps({'status': report['status'], 'tables': len(source_before['tables']),
                      'sourceUnchanged': report['sourceUnchanged'],
                      'restoredMatchesSource': report['restoredMatchesSource'],
                      'temporaryTargetStoppedAndAutoRemoved': True}))


if __name__ == '__main__':
    main()
