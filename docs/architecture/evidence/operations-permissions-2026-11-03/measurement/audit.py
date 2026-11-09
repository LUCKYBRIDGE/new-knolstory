"""Read-only catalog and private-file metadata audit. No records, password values or raw inspect output."""
import datetime
import hashlib
import json
import os
from pathlib import Path
import stat
import subprocess
import sys

ROOT=Path(__file__).resolve().parents[5]
BASE=Path(__file__).resolve().parents[1]
NAMES=('knolstory-next-production-api-1','knolstory-next-production-db-1','knolstory-next-production-ingress-1')


def command(args,data=None):
    result=subprocess.run(args,input=data,stdout=subprocess.PIPE,stderr=subprocess.PIPE,timeout=30)
    if result.returncode:raise RuntimeError('Read-only metadata audit failed; no private diagnostics published.')
    return result.stdout


def environment_summary(entries):
    values=dict(item.split('=',1)for item in entries if '='in item)
    return {'applicationRoleExpected':values.get('PGUSER')=='knolstory_next_app',
            'databaseExpected':values.get('PGDATABASE')=='knolstory_next_production',
            'rawSecretEnvironmentPresent':any(values.get(key)for key in ('PGPASSWORD','DATABASE_URL','KNOLSTORY_CSRF_SECRET','KAKAO_CLIENT_SECRET','GOOGLE_CLIENT_SECRET')),
            'dbPasswordFileConfigured':bool(values.get('PGPASSWORD_FILE')),
            'csrfFileConfigured':bool(values.get('KNOLSTORY_CSRF_SECRET_FILE'))}


def checked_metadata(value,directory,uid):
    expected=0o700 if directory else 0o600
    safe={key:value[key]for key in ('isDirectory','isFile','isSymlink','uid','gid','mode')}
    return {**safe,'privateModeExpected':not value['isSymlink'] and value['uid']==uid and value['mode']==expected and value['isDirectory' if directory else 'isFile']}


def metadata(path,directory,uid):
    info=Path(path).lstat()
    return checked_metadata({'isDirectory':stat.S_ISDIR(info.st_mode),'isFile':stat.S_ISREG(info.st_mode),
                             'isSymlink':stat.S_ISLNK(info.st_mode),'uid':info.st_uid,'gid':info.st_gid,'mode':stat.S_IMODE(info.st_mode)},directory,uid)


def catalog():
    sql=Path(__file__).with_name('privileges.sql').read_bytes()
    script='exec psql -XqAt -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1'
    return json.loads(command(['docker','exec','-i',NAMES[1],'sh','-c',script],sql).decode().strip())


def secret_mount(container,destination,files,required=()):
    matches=[row for row in container['Mounts']if row['Destination']==destination]
    if len(matches)!=1:return {'present':False,'expectedFiles':len(files),'requiredRolesPresent':False}
    mount=matches[0];parent=Path(mount['Source']);uid=os.getuid()
    if not parent.exists() and sys.platform=='darwin' and str(parent).startswith('/host_mnt/'):
        candidate=Path(str(parent)[len('/host_mnt'):])
        allowed=Path.home()/'.local/share/knolstory-next-production'
        if candidate.exists() and candidate.resolve().is_relative_to(allowed.resolve()):parent=candidate
    if not parent.exists():raise RuntimeError('Private mount host metadata is unavailable; no paths published.')
    values={role:metadata(parent/name,False,uid)for role,name in files.items() if (parent/name).exists() or (parent/name).is_symlink()}
    return {'present':True,'readOnly':not mount['RW'],'directory':metadata(parent,True,uid),'files':values,'requiredRolesPresent':all(role in values for role in required),
            'unexpectedEntryCount':sum(p.name not in files.values()for p in parent.iterdir())}


def main():
    before={name:json.loads(command(['docker','inspect',name]))[0]for name in NAMES}
    privileges_before=catalog()
    api=before[NAMES[0]];db=before[NAMES[1]]
    files={'database':'db-password','csrf':'csrf-secret','kakaoId':'kakao-client-id','kakaoSecret':'kakao-client-secret','googleId':'google-client-id','googleSecret':'google-client-secret'}
    secrets=secret_mount(api,'/run/knolstory-production',files,('database','csrf'))
    owner=secret_mount(db,'/run/knolstory-production-owner',{'ownerDatabase':'db-owner-password'},('ownerDatabase',))
    privileges_after=catalog()
    after={name:json.loads(command(['docker','inspect',name]))[0]for name in NAMES}
    report={'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),
            'scope':'Two READ ONLY transactions selecting only PostgreSQL catalog/ACL metadata; Docker configuration and lstat metadata only. No table records, secret bytes, migrations, role grants or external requests.',
            'catalog':privileges_before,'catalogStable':privileges_before==privileges_after,
            'containerIdsAndImagesStable':all(before[name]['Id']==after[name]['Id']and before[name]['Image']==after[name]['Image']for name in NAMES),
            'api':{'user':api['Config'].get('User'),'environment':environment_summary(api['Config']['Env']),
                   'onlyApplicationSecretMount':len(api['Mounts'])==1 and api['Mounts'][0]['Destination']=='/run/knolstory-production',
                   'noOwnerCredentialMount':not any(row['Destination']=='/run/knolstory-production-owner'for row in api['Mounts']),
                   'readOnlyRoot':api['HostConfig']['ReadonlyRootfs'],'hostPortBindings':len(api['HostConfig'].get('PortBindings')or {}),'secrets':secrets},
            'dbOwnerSecrets':owner,'secretValuesRead':False,'credentialPathsInPublicReport':False,
            'limits':['Catalog privilege checks are not attempted DDL/data mutation or a real app-password login.','Application row ownership is enforced by API; this audit does not prove database RLS or live OAuth.','POSIX owner/mode metadata only; not a full ACL, at-rest encryption or off-host retention audit.']}
    (BASE/'result.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps({'tables':len(privileges_before['tables']),'catalogStable':report['catalogStable'],'containersStable':report['containerIdsAndImagesStable'],'secretValuesRead':False}))


if __name__=='__main__':
    try:main()
    except Exception:
        print('Read-only permissions audit failed; raw private diagnostics were not published.',file=sys.stderr)
        sys.exit(1)
