"""Build only uniquely tagged local candidates from an explicit, nonprivate input whitelist."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile

ROOT=Path(__file__).resolve().parents[5]
BASE=Path(__file__).resolve().parents[1]
STATIC=ROOT/'.cache/pages-candidate-image-preload-20261103'

def sha(path):
    value=hashlib.sha256()
    with Path(path).open('rb')as handle:
        for chunk in iter(lambda:handle.read(1024*1024),b''):value.update(chunk)
    return value.hexdigest()

def inventory(path):
    rows=[]
    for file in sorted(path.rglob('*')):
        if file.is_symlink():raise ValueError('Symlink in build input.')
        if file.is_file():rows.append({'path':file.relative_to(path).as_posix(),'bytes':file.stat().st_size,'sha256':sha(file)})
    return sorted(rows,key=lambda row:row['path'])

def main():
    if shutil.disk_usage(ROOT).free<3*1024**3:raise ValueError('Insufficient free space for bounded local candidate build.')
    pointer=ROOT/'.cache/proof-image-candidates-private.json'
    if pointer.exists():raise ValueError('Candidate ledger already exists; inspect it rather than starting over.')
    parent=Path(tempfile.mkdtemp(prefix='proof-image-build-',dir=ROOT/'.cache'));parent.chmod(0o700)
    context=parent/'context';context.mkdir(mode=0o700)
    before=json.loads((ROOT/'.cache/proof-candidate-production-before-private.json').read_text())
    expected=json.loads((STATIC/'manifest.json').read_text())['files']
    expected=sorted([{'path':r['path'],'bytes':r['bytes'],'sha256':r['sha256']}for r in expected if r['tier']=='site'],key=lambda row:row['path'])
    actual=inventory(STATIC/'site')
    if expected!=actual or len(actual)!=1564 or sum(r['bytes']for r in actual)!=598187818:raise ValueError('Previous static serving candidate differs.')
    files=['server/package.json','server/pnpm-lock.yaml','server/config.ts','server/main.ts','server/Dockerfile','server/Dockerfile.ingress','server/operations/build-api.mjs','server/operations/production-ingress.mjs','server/operations/trusted-ingress-socket.mjs']
    folders=['server/auth','server/http','server/storage','server/migrations','server/documents','packages/story-domain/src','packages/compatibility/src','packages/asset-registry/src']
    for relative in files:
        source=ROOT/relative
        if source.is_symlink()or not source.is_file():raise ValueError('Invalid whitelisted source file.')
        target=context/relative;target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(source,target)
    for relative in folders:
        inventory(ROOT/relative)
        shutil.copytree(ROOT/relative,context/relative)
    shutil.copytree(STATIC/'site',context/'apps/web/out')
    if inventory(context/'apps/web/out')!=actual:raise ValueError('Static copy differs.')
    inputs=inventory(context)
    run_id=parent.name.removeprefix('proof-image-build-')if hasattr(str,'removeprefix')else parent.name[len('proof-image-build-'):]
    tags={'api':'knolstory-next-api:proof-review-'+run_id,'ingress':'knolstory-next-ingress:proof-review-'+run_id}
    ledger={'context':str(context),'parent':str(parent),'tags':tags,'state':'prepared'}
    fd=os.open(pointer,os.O_CREAT|os.O_EXCL|os.O_WRONLY,0o600)
    with os.fdopen(fd,'w')as handle:json.dump(ledger,handle)
    (parent/'inputs.json').write_text(json.dumps(inputs));(parent/'inputs.json').chmod(0o600)
    for service,dockerfile in [('api','server/Dockerfile'),('ingress','server/Dockerfile.ingress')]:
        ledger['state']='building-'+service;pointer.write_text(json.dumps(ledger))
        with (parent/('build-'+service+'.log')).open('wb')as output:
            result=subprocess.run(['docker','build','--pull=false','--file',str(context/dockerfile),'--tag',tags[service],str(context)],stdout=output,stderr=subprocess.STDOUT,timeout=600)
        if result.returncode:raise RuntimeError('Local image build failed; exact ledger/context/log retained.')
    images={name:json.loads(subprocess.check_output(['docker','image','inspect',tag]))[0]for name,tag in tags.items()}
    current=json.loads(subprocess.check_output(['docker','inspect',*before]))
    if {name:{'Id':row['Id'],'Image':row['Image']}for name,row in zip(before,current)}!=before:raise ValueError('Production containers changed during preparation.')
    if inventory(context)!=inputs:raise ValueError('Build inputs changed while building.')
    ledger.update({'state':'built','images':{name:row['Id']for name,row in images.items()}});pointer.write_text(json.dumps(ledger))
    report={'scope':'Local candidates only; production tags/containers unchanged. Explicit copied input whitelist excludes caches, credentials and unrelated worktrees.','images':{name:{'id':row['Id'],'tag':tags[name],'architecture':row['Architecture'],'user':row['Config']['User']}for name,row in images.items()},'staticFiles':len(actual),'staticBytes':sum(r['bytes']for r in actual),'staticManifestSha256':sha(STATIC/'manifest.json'),'buildInputsSha256':hashlib.sha256(json.dumps(inputs).encode()).hexdigest(),'buildInputFiles':len(inputs),'productionContainersUnchanged':True,'inputsUnchanged':True,'limits':['Build success alone does not prove secret permissions, real auth, host routing, container-start behavior or deployment.','Context and raw build logs remain private and task-owned; candidate tags do not replace production tags.']}
    (BASE/'candidate-images-build-2026-11-04.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps({'built':list(images),'staticFiles':len(actual),'productionUnchanged':True}))

if __name__=='__main__':main()
