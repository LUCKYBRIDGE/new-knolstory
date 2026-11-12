"""Stage a signed official runtime in a new private review directory. No service installation."""
import datetime
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
from runtime_archive import reviewed_members

ROOT=Path(__file__).resolve().parents[5]
BASE=Path(__file__).resolve().parents[1]
VERSION='v22.23.4'
KEY_COMMIT='481637f813e912c4aa3622d7964ab426c97b8e8d'
ARCHIVE='node-'+VERSION+'-darwin-arm64.tar.gz'

def sha(path):
    value=hashlib.sha256()
    with Path(path).open('rb')as handle:
        for chunk in iter(lambda:handle.read(1024*1024),b''):value.update(chunk)
    return value.hexdigest()

def command(args, timeout=30):
    value=subprocess.run(args,capture_output=True,timeout=timeout)
    if value.returncode:raise RuntimeError('Runtime review command failed.')
    return value.stdout.decode()

def main():
    if os.getuid()==0 or command(['/usr/bin/uname','-m']).strip()!='arm64':raise ValueError('Unsupported review host.')
    review=Path.home()/'.local/share/knolstory-client-proof-review'
    if not review.is_dir()or review.is_symlink()or review.stat().st_uid!=os.getuid()or review.stat().st_mode&0o7777!=0o700:raise ValueError('Invalid private review parent.')
    parent=Path(tempfile.mkdtemp(prefix='official-runtime-',dir=review))
    report={'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'version':VERSION,'archive':ARCHIVE,'keyRepositoryCommit':KEY_COMMIT,'scope':'Private local runtime review only; no service registration or production key/config changes.'}
    try:
        urls={ARCHIVE:'https://nodejs.org/download/release/'+VERSION+'/'+ARCHIVE,'SHASUMS256.txt':'https://nodejs.org/download/release/'+VERSION+'/SHASUMS256.txt','SHASUMS256.txt.sig':'https://nodejs.org/download/release/'+VERSION+'/SHASUMS256.txt.sig','pubring.kbx':'https://raw.githubusercontent.com/nodejs/release-keys/'+KEY_COMMIT+'/gpg/pubring.kbx'}
        for name,url in urls.items():
            destination=parent/name
            command(['/usr/bin/curl','--fail','--silent','--show-error','--proto','=https','--tlsv1.2','--max-time','60','--max-filesize',str(80*1024*1024),'-o',str(destination),url],65)
            destination.chmod(0o400)
        (parent/'gpg-home').mkdir(mode=0o700)
        value=subprocess.run([shutil.which('gpgv'),'--homedir',str(parent/'gpg-home'),'--keyring',str(parent/'pubring.kbx'),'--status-fd','1',str(parent/'SHASUMS256.txt.sig'),str(parent/'SHASUMS256.txt')],capture_output=True,timeout=10)
        (parent/'gpg-status.log').write_bytes(value.stdout+value.stderr);(parent/'gpg-status.log').chmod(0o400)
        valid=re.findall(r'^\[GNUPG:\] VALIDSIG ([A-F0-9]{40}) ',value.stdout.decode(),re.M)
        if value.returncode or len(valid)!=1:raise ValueError('Official manifest signature did not verify.')
        rows=[row.split()for row in(parent/'SHASUMS256.txt').read_text().splitlines()if row.endswith('  '+ARCHIVE)]
        if len(rows)!=1 or len(rows[0])!=2 or not re.fullmatch('[a-f0-9]{64}',rows[0][0])or sha(parent/ARCHIVE)!=rows[0][0]:raise ValueError('Official archive checksum differs.')
        report.update({'officialUrls':urls,'signatureVerified':True,'signerFingerprint':valid[0],'archiveSha256':rows[0][0],'downloadSha256':{name:sha(parent/name)for name in urls}})
        selected=reviewed_members(parent/ARCHIVE,VERSION)
        runtime=parent/'runtime';runtime.mkdir(mode=0o700);(runtime/'bin').mkdir(mode=0o700)
        for name,data in selected.items():
            target=runtime/('bin/node'if name=='node'else 'LICENSE')
            fd=os.open(target,os.O_CREAT|os.O_EXCL|os.O_WRONLY,0o600)
            with os.fdopen(fd,'wb')as handle:handle.write(data)
            target.chmod(0o500 if name=='node'else 0o400)
        (runtime/'bin').chmod(0o500);runtime.chmod(0o500)
        node=runtime/'bin/node'
        deps=command(['/usr/bin/otool','-L',str(node)]).splitlines()[1:]
        dependencies=[row.strip().split(' (compatibility')[0]for row in deps]
        if not dependencies or any(not path.startswith(('/usr/lib/','/System/Library/'))for path in dependencies):raise ValueError('Non-system runtime dependency remains.')
        signature=subprocess.run(['/usr/bin/codesign','--verify','--strict',str(node)],capture_output=True,timeout=10)
        if signature.returncode:raise ValueError('Runtime code-signature verification failed.')
        runtime_env={'PATH':'/usr/bin:/bin','HOME':str(parent)}
        identity=subprocess.run([str(node),'-e','console.log(JSON.stringify({version:process.version,arch:process.arch,platform:process.platform,execPath:process.execPath}))'],capture_output=True,env=runtime_env,timeout=10)
        if identity.returncode:raise ValueError('Verified runtime did not execute.')
        actual=json.loads(identity.stdout)
        if actual['version']!=VERSION or actual['arch']!='arm64'or actual['platform']!='darwin'or actual['execPath']!=str(node):raise ValueError('Runtime identity differs.')
        report.update({'nodeSha256':sha(node),'licenseSha256':sha(runtime/'LICENSE'),'nodeBytes':node.stat().st_size,'dependencies':dependencies,'systemDependenciesOnly':True,'codesignStrictPassed':True,'minimalEnvironmentVersionProbe':True,'success':True,'limits':['PGP trust anchored in the pinned official Node release-key repository fetched over HTTPS, not an independent offline trust bootstrap.','System libraries and OS loader remain platform trust; direct Mach-O dependency list is not a complete loaded-image attestation.','This is a local review artifact, not a registered service or final approved runtime installation.']})
        pointer=ROOT/'.cache/proof-official-runtime-private.json'
        fd=os.open(pointer,os.O_CREAT|os.O_EXCL|os.O_WRONLY,0o600)
        with os.fdopen(fd,'w')as output:json.dump({'parent':str(parent),'nodePath':str(node),'runtimeRoot':str(runtime)},output)
        (BASE/'official-runtime-2026-11-04.json').write_text(json.dumps(report,indent=2)+'\n')
        print(json.dumps({'success':True,'version':VERSION,'signatureVerified':True,'systemDependenciesOnly':True,'serviceInstalled':False}))
    except Exception as error:
        report.update({'success':False,'failureType':type(error).__name__,'failure':str(error),'partialPrivateArtifactPreserved':True})
        (BASE/('official-runtime-failed-'+parent.name+'.json')).write_text(json.dumps(report,indent=2)+'\n')
        raise RuntimeError('Official runtime review failed; partial private artifact retained.')from None

if __name__=='__main__':main()
