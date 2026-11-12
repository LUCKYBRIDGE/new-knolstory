"""Rebuild roles only on a new inactive restore. Never execute migration or data SQL on production."""
import datetime
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import time
import uuid

ROOT=Path(__file__).resolve().parents[5]
BASE=Path(__file__).resolve().parents[1]
LABEL='com.knolstory.role-restore-audit'
SOURCES=('knolstory-next-production-api-1','knolstory-next-production-db-1','knolstory-next-production-ingress-1')
PRIVATE_LOG_DIRECTORY=None
RUNNER_MOUNTS=('/etc/hosts','/run/knolstory-production','/run/knolstory-production-owner')


def run(args,data=None,timeout=45):
    result=subprocess.run(args,input=data,stdout=subprocess.PIPE,stderr=subprocess.PIPE,timeout=timeout)
    if result.returncode:
        if PRIVATE_LOG_DIRECTORY is not None:
            diagnostic=PRIVATE_LOG_DIRECTORY/('command-failure-'+uuid.uuid4().hex+'.log')
            descriptor=os.open(diagnostic,os.O_CREAT|os.O_EXCL|os.O_WRONLY,0o600)
            with os.fdopen(descriptor,'wb')as output:output.write(result.stdout+result.stderr)
        raise RuntimeError('Isolated role restore command failed; private diagnostics not published.')
    return result.stdout


def inspect(name):return json.loads(run(['docker','inspect',name]))[0]


def host_path(value):
    if sys.platform=='darwin'and value.startswith('/host_mnt/'):value=value[len('/host_mnt'):]
    return str(Path(value).resolve())


def check_target(value,run_id,image,source_ids,owner_source=None):
    host=value['HostConfig'];tmpfs={'/var/lib/postgresql/data','/var/run/postgresql','/tmp'}
    binds=[row for row in value.get('Mounts',[])if row['Type']=='bind']
    if (value['Id']in source_ids or value['Name']!='/knolstory-role-restore-'+run_id or value['Image']!=image
            or value['Config']['Labels'].get(LABEL)!=run_id or host['NetworkMode']!='none'
            or not host['ReadonlyRootfs']or host.get('PortBindings')or set(host.get('Tmpfs',{}))!=tmpfs
            or len(binds)!=1 or binds[0]['Destination']!='/run/knolstory-production-owner'or binds[0]['RW']
            or owner_source is None or host_path(binds[0]['Source'])!=host_path(str(owner_source))
            or any(row['Type']not in ('bind','tmpfs')or(row['Type']=='tmpfs'and row['Destination']not in tmpfs)for row in value.get('Mounts',[]))):raise ValueError('Invalid isolated target boundary.')


def check_runner(value,run_id,image,target_id,expected_sources=None):
    host=value['HostConfig'];mounts=value['Mounts'];user=str(os.getuid())+':'+str(os.getgid())
    if (value['Image']!=image or value['Config']['Labels'].get(LABEL)!=run_id or value['Config'].get('User')!=user
            or host['NetworkMode']!='container:'+target_id or not host['ReadonlyRootfs']or host.get('PortBindings')
            or 'ALL'not in host.get('CapDrop',[])or not any(x.startswith('no-new-privileges')for x in host.get('SecurityOpt',[]))
            or expected_sources is None or len(mounts)!=3 or set(x['Destination']for x in mounts)!=set(RUNNER_MOUNTS)
            or any(x['RW']or x['Type']!='bind'or host_path(x['Source'])!=host_path(str(expected_sources[x['Destination']]))for x in mounts)):raise ValueError('Invalid isolated runner boundary.')


def main():
    if os.getuid()==0:raise ValueError('A non-root audit principal is required.')
    run_id=uuid.uuid4().hex;name='knolstory-role-restore-'+run_id;runner=name+'-migrate';probe=name+'-probe'
    global PRIVATE_LOG_DIRECTORY
    private=ROOT/'.cache'/('role-restore-'+run_id);private.mkdir(mode=0o700);PRIVATE_LOG_DIRECTORY=private
    ledger=private/'ledger.json';ledger.write_text(json.dumps({'runId':run_id,'target':name,'runner':runner,'probe':probe,'state':'planned'}));ledger.chmod(0o600)
    source_before={n:inspect(n)for n in SOURCES};source_ids={v['Id']for v in source_before.values()}
    image=source_before[SOURCES[1]]['Image'];api_image=source_before[SOURCES[0]]['Image']
    if any(not re.fullmatch(r'sha256:[a-f0-9]{64}',v)for v in [image,api_image]):raise ValueError('Unpinned runtime image.')
    spec=importlib.util.spec_from_file_location('sealed_restore',ROOT/'docs/architecture/evidence/isolated-restore-2026-11-03/measurement/restore-backup.py');restore=importlib.util.module_from_spec(spec);spec.loader.exec_module(restore)
    sealed=json.loads((ROOT/'.cache/restore-audit-private-input.json').read_text());archive=Path(sealed['archive']);allowed=Path.home()/'.local/share/knolstory-next-production/backups'
    if archive.is_symlink()or not archive.resolve().is_relative_to(allowed.resolve())or archive.stat().st_mode&0o077:raise ValueError('Invalid private backup boundary.')
    data=archive.read_bytes()
    if len(data)!=sealed['bytes']or hashlib.sha256(data).hexdigest()!=sealed['sha256']:raise ValueError('Backup differs from the previously sealed artifact.')
    names=['migrate.mjs']+[p.name for p in sorted((ROOT/'server/migrations').glob('*.sql'))]
    actual=json.loads(run(['docker','exec',SOURCES[0],'node','--input-type=module','-e','import{readFile}from"node:fs/promises";import{createHash}from"node:crypto";const out={};for(const n of process.argv.slice(1))out[n]=createHash("sha256").update(await readFile("/app/"+n)).digest("hex");console.log(JSON.stringify(out));',*names]))
    expected={n:hashlib.sha256((ROOT/('server/dist/migrate.mjs'if n=='migrate.mjs'else 'server/migrations/'+n)).read_bytes()).hexdigest()for n in names}
    if actual!=expected:raise ValueError('Pinned migration image differs from the reviewed local build.')
    for folder in ['owner','app']:(private/folder).mkdir(mode=0o700)
    fixtures={'owner/db-owner-password':'12'*32,'app/db-password':'34'*32,'hosts':'127.0.0.1 localhost db\n::1 localhost\n'}
    for path,value in fixtures.items():(private/path).write_text(value if path=='hosts'else value+'\n');(private/path).chmod(0o600)
    created=[];report={'runId':run_id,'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'backupSha256':sealed['sha256'],'backupBytes':sealed['bytes'],'migrationImage':api_image,'postgresImage':image,'migrationFilesSha256':actual,'scope':'Canonical migration and role rebuild only on fresh network-none inactive copy; fixture passwords; no production data SQL, key changes or HTTP API startup.'}
    try:
        for owned in [name,runner,probe]:
            if run(['docker','ps','-aq','--filter','name=^/'+owned+'$']).strip():raise ValueError('Audit name collision.')
        created.append(name)
        run(['docker','create','--pull=never','--name',name,'--label',LABEL+'='+run_id,'--network','none','--read-only','--memory','384m','--cpus','0.5','--pids-limit','64','--tmpfs','/var/lib/postgresql/data:rw,size=128m','--tmpfs','/var/run/postgresql:rw,size=16m','--tmpfs','/tmp:rw,size=16m','--mount','type=bind,src='+str(private/'owner')+',dst=/run/knolstory-production-owner,readonly','-e','POSTGRES_USER=knolstory_next_owner','-e','POSTGRES_DB=knolstory_next_production','-e','POSTGRES_PASSWORD_FILE=/run/knolstory-production-owner/db-owner-password','-e','POSTGRES_HOST_AUTH_METHOD=scram-sha-256','-e','POSTGRES_INITDB_ARGS=--auth-host=scram-sha-256 --auth-local=trust',image])
        report['stage']='prestart-boundary'
        target=inspect(name);check_target(target,run_id,image,source_ids,private/'owner');target_id=target['Id']
        report['stage']='start-target'
        run(['docker','start',name])
        report['stage']='postgres-tcp-ready'
        for _ in range(30):
            ready=subprocess.run(['docker','exec',name,'pg_isready','-h','127.0.0.1','-U','knolstory_next_owner','-d','knolstory_next_production'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,timeout=5)
            if ready.returncode==0:break
            time.sleep(0.5)
        else:raise RuntimeError('Isolated database did not become ready.')
        report['stage']='logical-restore'
        run(['docker','exec','-i',name,'pg_restore','-U','knolstory_next_owner','-d','knolstory_next_production','--single-transaction','--exit-on-error','--no-owner','--no-privileges'],data)
        report['stage']='restored-inventory'
        before=restore.inventory(name)
        report['stage']='initial-role-query'
        initial_role=json.loads(restore.query(name,"SELECT json_build_object('appRoleExists',EXISTS(SELECT FROM pg_roles WHERE rolname='knolstory_next_app'));"))
        if initial_role['appRoleExists']:raise ValueError('The restored database unexpectedly includes cluster roles.')
        mounts=[item for path,dest in [('owner','/run/knolstory-production-owner'),('app','/run/knolstory-production'),('hosts','/etc/hosts')]for item in ['--mount','type=bind,src='+str(private/path)+',dst='+dest+',readonly']]
        expected_sources={'/run/knolstory-production-owner':private/'owner','/run/knolstory-production':private/'app','/etc/hosts':private/'hosts'}
        common=['--label',LABEL+'='+run_id,'--network','container:'+target_id,'--read-only','--user',str(os.getuid())+':'+str(os.getgid()),'--cap-drop','ALL','--security-opt','no-new-privileges','--memory','128m','--cpus','0.5','--pids-limit','64','--no-healthcheck',*mounts,'-e','PGHOST=db','-e','PGDATABASE=knolstory_next_production','-e','KNOLSTORY_ROLE_RESTORE_RUN_ID='+run_id,'--entrypoint','node']
        report['stage']='create-migration-runner'
        created.append(runner);run(['docker','create','--name',runner,*common,api_image,'/app/migrate.mjs'])
        check_runner(inspect(runner),run_id,api_image,target_id,expected_sources)
        catalogs=[];inventories=[]
        catalog_sql=(ROOT/'docs/architecture/evidence/operations-permissions-2026-11-03/measurement/privileges.sql').read_bytes()
        psql=['docker','exec','-i',name,'psql','-XqAt','-U','knolstory_next_owner','-d','knolstory_next_production','-v','ON_ERROR_STOP=1']
        report['stage']='canonical-role-rebuild'
        for index in range(2):
            check_target(inspect(name),run_id,image,source_ids,private/'owner');check_runner(inspect(runner),run_id,api_image,target_id,expected_sources)
            output=run(['docker','start','-a',runner]);status=inspect(runner)['State']
            log=private/('migration-'+str(index)+'.log');log.write_bytes(output);log.chmod(0o600)
            if status['Running']or status['ExitCode']!=0 or b'Production migrations and application role ready.'not in output:raise RuntimeError('Canonical isolated role rebuild failed.')
            catalogs.append(json.loads(run(psql,catalog_sql)));inventories.append(restore.inventory(name))
        report['stage']='compare-role-metadata'
        source_catalog=json.loads((ROOT/'docs/architecture/evidence/operations-permissions-2026-11-03/result.json').read_text())['catalog']
        if catalogs[0]!=catalogs[1]or catalogs[1]!=source_catalog:raise RuntimeError('Restored privilege metadata differs; no production repair attempted.')
        if before!=inventories[0]or before!=inventories[1]:raise RuntimeError('Role rebuild changed restored content/schema.')
        report['stage']='app-privilege-probe'
        created.append(probe);run(['docker','create','-i','--name',probe,*common,api_image,'--input-type=module'])
        check_runner(inspect(probe),run_id,api_image,target_id,expected_sources)
        output=run(['docker','start','-ai',probe],Path(__file__).with_name('probe.mjs').read_bytes());status=inspect(probe)['State']
        if status['ExitCode']!=0:raise RuntimeError('Isolated app privilege probe failed.')
        proof=json.loads(output);after=restore.inventory(name)
        if after!=before:raise RuntimeError('Privilege probe changed restored content/schema.')
        source_after={n:inspect(n)for n in SOURCES}
        unchanged=all(source_before[n]['Id']==source_after[n]['Id']and source_before[n]['Image']==source_after[n]['Image']for n in SOURCES)
        if not unchanged:raise RuntimeError('Production container drift; no source repair attempted.')
        report.update(success=True,roleInitiallyAbsent=True,canonicalRuns=2,privilegesMatchCurrentCatalog=True,reapplyPrivilegeMetadataEqual=True,restoredContentAndSchemaPreserved=True,tables=len(before['tables']),restoredInventory=before,privilegeProbe=proof,productionContainerIdsAndImagesUnchanged=unchanged,networkNoneTarget=True,noHostPorts=True,noApiStartup=True,fixturePasswordsOnly=True)
    except Exception as error:
        report.update(success=False,failureType=type(error).__name__,failure='Isolated verification failed; private diagnostics retained without record/credential values in public proof.')
        raise
    finally:
        removed=[]
        for owned in reversed(created):
            found=run(['docker','ps','-aq','--filter','name=^/'+owned+'$']).strip()
            if found:
                value=inspect(owned)
                if value['Id']in source_ids or value['Config']['Labels'].get(LABEL)!=run_id:raise RuntimeError('Refusing cleanup of an unowned container.')
                run(['docker','rm','-f',owned]);removed.append(owned)
        for path in ['owner/db-owner-password','app/db-password','hosts']:(private/path).unlink(missing_ok=True)
        report['cleanup']={'ownedContainersRemoved':len(removed),'remainingOwnedContainers':bool(run(['docker','ps','-aq','--filter','label='+LABEL+'='+run_id]).strip()),'fixtureSecretFilesRemoved':True,'sourceContainersNotRemoved':True}
        report['limits']=['No production role/grant/credential update; only fresh inactive copy targeted.','Role privileges rebuilt via unchanged canonical command, not an exact pg_dumpall/global-role/password restoration.','Application probe authenticates fixture pg password and zero-row/denied SQL, not OAuth, HTTP owner authorization or real provider login.','Restored old session rows stayed inactive by network/port/API isolation; no new session-fence execution claimed.']
        (BASE/('result.json'if report.get('success')else 'failure-'+run_id+'.json')).write_text(json.dumps(report,indent=2)+'\n')
        ledger.write_text(json.dumps({'runId':run_id,'state':'cleaned','success':report.get('success',False)}));ledger.chmod(0o600)
    print(json.dumps({'success':True,'canonicalRuns':2,'tables':report['tables'],'dataAndSchemaPreserved':True,'fixtureAppLogin':report['privilegeProbe']['authenticatedApp'],'cleanupComplete':not report['cleanup']['remainingOwnedContainers']}))


if __name__=='__main__':
    try:main()
    except Exception:
        print('Isolated role restore failed; source preserved and private diagnostics withheld.',file=sys.stderr)
        sys.exit(1)
