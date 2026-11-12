"""Inspect exact images and start only portless fixture services; never use production keys or DB."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tempfile
import time
import uuid

ROOT=Path(__file__).resolve().parents[5]
BASE=Path(__file__).resolve().parents[1]
LABEL='com.knolstory.candidate-proof-probe'

def run(args, data=None, timeout=45):
    value=subprocess.run(args,input=data,stdout=subprocess.PIPE,stderr=subprocess.PIPE,timeout=timeout)
    if value.returncode:
        diagnostic=ROOT/'.cache'/('proof-candidate-command-failed-'+uuid.uuid4().hex+'.log')
        fd=os.open(diagnostic,os.O_CREAT|os.O_EXCL|os.O_WRONLY,0o600)
        with os.fdopen(fd,'wb')as output:output.write(value.stdout+value.stderr)
        raise RuntimeError('Candidate fixture command failed; private diagnostics retained.')
    return value.stdout

def inspect(name):return json.loads(run(['docker','inspect',name]))[0]

def main():
    ledger=json.loads((ROOT/'.cache/proof-image-candidates-private.json').read_text())
    if ledger['state']!='built':raise ValueError('Candidate build not terminal-success.')
    images=ledger['images'];before=json.loads((ROOT/'.cache/proof-candidate-production-before-private.json').read_text())
    if any(image in [r['Image']for r in before.values()]for image in images.values()):raise ValueError('Candidate must be separate from running images.')
    marker=uuid.uuid4().hex;prefix='knol-proof-candidate-'+marker[:12];network=prefix+'-net'
    fixture=Path(tempfile.mkdtemp(prefix='proof-key-fixture-',dir=ROOT/'.cache'));fixture.chmod(0o700)
    fixtures={'key':'ab'*32,'db-password':'fixture-password','csrf':'cd'*32}
    for name,value in fixtures.items():
        fd=os.open(fixture/name,os.O_CREAT|os.O_EXCL|os.O_WRONLY,0o600)
        with os.fdopen(fd,'w')as output:output.write(value+'\n')
    owned=[];network_created=False;report={'scope':'Exact candidate images, fixture key only, private internal network/no host ports; no production DB/provider/auth startup.','runId':marker,'candidateImageIds':dict(images)}
    def create(name,image,args,command=()):
        run(['docker','create','--name',name,'--label',LABEL+'='+marker,'--read-only','--user',str(os.getuid())+':'+str(os.getgid()),'--cap-drop','ALL','--security-opt','no-new-privileges','--memory','256m','--pids-limit','64','--cpus','1',*args,image,*command])
        owned.append(name);value=inspect(name)
        if value['Image']!=image or value['Config']['Labels'].get(LABEL)!=marker or value['HostConfig'].get('PortBindings')or not value['HostConfig']['ReadonlyRootfs']or value['Config']['User']!=str(os.getuid())+':'+str(os.getgid()):raise ValueError('Candidate fixture boundary differs.')
        return value
    def image_json(service,script):
        name=prefix+'-inspect-'+service
        create(name,images[service],['--network','none','--entrypoint','node'],['--input-type=module','-e',script])
        value=inspect(name)
        if value['Image']!=images[service]or value['Config']['Labels'].get(LABEL)!=marker or value['HostConfig']['NetworkMode']!='none'or value['HostConfig'].get('PortBindings')or value['Mounts']:raise ValueError('Invalid image inspection boundary.')
        output=run(['docker','start','-a',name],timeout=60)
        if inspect(name)['State']['ExitCode']!=0:raise ValueError('Image inspection failed.')
        return json.loads(output)
    try:
        api=image_json('api','import{readFile}from"node:fs/promises";import{createHash}from"node:crypto";const main=await readFile("/app/main.mjs");const names=["main.mjs","migrate.mjs",...'+json.dumps([p.name for p in sorted((ROOT/'server/migrations').glob('*.sql'))])+'];const hashes={};for(const n of names)hashes[n]=createHash("sha256").update(await readFile("/app/"+n)).digest("hex");console.log(JSON.stringify({version:process.version,proofIncluded:main.includes(Buffer.from("knolstory-rate-client-proof-v1")),hashes}));')
        ingress=image_json('ingress','import{readdir,lstat,readFile}from"node:fs/promises";import{createReadStream}from"node:fs";import{createHash}from"node:crypto";const rows=[];async function visit(base,rel=""){for(const n of await readdir(base+"/"+rel)){const p=rel?rel+"/"+n:n,s=await lstat(base+"/"+p);if(s.isSymbolicLink())throw Error("Symlink");if(s.isDirectory())await visit(base,p);else if(s.isFile()){const h=createHash("sha256");for await(const c of createReadStream(base+"/"+p))h.update(c);rows.push({path:p,bytes:s.size,sha256:h.digest("hex")});}}}await visit("/site");rows.sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);const hashes={};for(const n of ["operations/production-ingress.mjs","operations/trusted-ingress-socket.mjs","http/client-bucket-proof.mjs"])hashes[n]=createHash("sha256").update(await readFile("/app/"+n)).digest("hex");console.log(JSON.stringify({version:process.version,rows,hashes}));')
        expected=json.loads((ROOT/'.cache/pages-candidate-image-preload-20261103/manifest.json').read_text())['files']
        expected=sorted([{'path':r['path'],'bytes':r['bytes'],'sha256':r['sha256']}for r in expected],key=lambda row:row['path'])
        if ingress['rows']!=expected or not api['proofIncluded']or any(v['version']!='v22.23.4'for v in [api,ingress]):raise ValueError('Candidate image code/runtime/static identity differs.')
        for name,value in ingress['hashes'].items():
            if hashlib.sha256((ROOT/'server'/name).read_bytes()).hexdigest()!=value:raise ValueError('Candidate transport differs from current reviewed sources.')
        for name,value in api['hashes'].items():
            if name.endswith('.sql')and hashlib.sha256((ROOT/'server/migrations'/name).read_bytes()).hexdigest()!=value:raise ValueError('Migration input changed.')
        run(['docker','network','create','--internal','--label',LABEL+'='+marker,network]);network_created=True
        net=json.loads(run(['docker','network','inspect',network]))[0]
        if not net['Internal']or net['Labels'].get(LABEL)!=marker:raise ValueError('Invalid internal fixture network.')
        common=['--network',network,'--init','--mount','type=bind,src='+str(fixture/'key')+',dst=/run/proof/key,readonly']
        api_name=prefix+'-api';api_env={'PORT':'4000','KNOLSTORY_BIND_HOST':'0.0.0.0','KNOLSTORY_AUTH_ORIGIN':'https://story.knolquiz.com','PGHOST':'127.0.0.1','PGPORT':'1','PGDATABASE':'knolstory_next_fixture','PGUSER':'knolstory_fixture','PGPASSWORD_FILE':'/run/proof/db-password','KNOLSTORY_CSRF_SECRET_FILE':'/run/proof/csrf','KNOLSTORY_CLIENT_PROOF_KEY_FILE':'/run/proof/key'}
        api_args=[*common,'--network-alias','api','--mount','type=bind,src='+str(fixture/'db-password')+',dst=/run/proof/db-password,readonly','--mount','type=bind,src='+str(fixture/'csrf')+',dst=/run/proof/csrf,readonly']
        api_args += [item for k,v in api_env.items()for item in ['--env',k+'='+v]]
        create(api_name,images['api'],api_args);run(['docker','start',api_name])
        ready=False
        for _ in range(20):
            v=subprocess.run(['docker','exec',api_name,'node','-e','fetch("http://127.0.0.1:4000/health/live").then(r=>process.exit(r.status===200?0:1)).catch(()=>process.exit(1));'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,timeout=5)
            if v.returncode==0:ready=True;break
            time.sleep(0.1)
        if not ready:raise ValueError('Fixture API did not start.')
        ingress_name=prefix+'-ingress';ingress_env={'KNOLSTORY_PUBLIC_ORIGIN':'https://story.knolquiz.com','KNOLSTORY_REDIRECT_FROM_ORIGIN':'https://story-next.knolquiz.com','KNOLSTORY_API_ORIGIN':'http://api:4000','KNOLSTORY_INGRESS_HOST':'0.0.0.0','KNOLSTORY_INGRESS_PORT':'8080','KNOLSTORY_STATIC_ROOT':'/site','KNOLSTORY_CLIENT_PROOF_KEY_FILE':'/run/proof/key'}
        create(ingress_name,images['ingress'],[*common,*[item for k,v in ingress_env.items()for item in ['--env',k+'='+v]]]);run(['docker','start',ingress_name])
        probe='''import{request}from"node:http";import{readFile}from"node:fs/promises";import{createClientBucketSigner,CLIENT_BUCKET_HEADER}from"/app/http/client-bucket-proof.mjs";const key=(await readFile("/run/proof/key","utf8")).trim(),sign=createClientBucketSigner({key,origin:"https://story.knolquiz.com"});const out={};async function query(base,path,signed,extra={}){const h={host:"story.knolquiz.com",...extra};if(signed)h[CLIENT_BUCKET_HEADER]=sign({method:"GET",url:path},"192.0.2.1");return await new Promise((done,fail)=>{const req=request(base+path,{headers:h,method:"GET"},res=>{if(res.headers[CLIENT_BUCKET_HEADER]!==undefined){res.resume();fail(Error("Proof leaked"));return;}res.resume();res.once("end",()=>done(res.statusCode));});req.once("error",fail);req.end();});}for(const p of ["/api/v1/me","/api/v1/documents"]){out[p]={relayMissing:await query("http://127.0.0.1:8080",p,false),relayValid:await query("http://127.0.0.1:8080",p,true),apiMissing:await query("http://api:4000",p,false),apiValid:await query("http://api:4000",p,true)};}out.static=await query("http://127.0.0.1:8080","/",false);out.alias=await query("http://127.0.0.1:8080","/",false,{host:"story-next.knolquiz.com"});out.ready=await query("http://api:4000","/health/ready",false);console.log(JSON.stringify(out));'''
        result=json.loads(run(['docker','exec',ingress_name,'node','--input-type=module','-e',probe]))
        report['checksObserved']=result
        for path in ['/api/v1/me','/api/v1/documents']:
            if result[path]!={'relayMissing':403,'relayValid':401,'apiMissing':403,'apiValid':401}:raise ValueError('Candidate proof/auth boundary differs.')
        if result['static']!=200 or result['alias']!=308 or result['ready']!=503:raise ValueError('Candidate static/alias/isolated DB boundary differs.')
        current=json.loads(run(['docker','inspect',*before]))
        if {name:{'Id':row['Id'],'Image':row['Image']}for name,row in zip(before,current)}!=before:raise ValueError('Production changed during candidate probes.')
        report.update({'success':True,'nodeVersion':api['version'],'staticFiles':len(expected),'staticBytes':sum(r['bytes']for r in expected),'allStaticHashesMatch':True,'transportSourceHashesMatch':True,'migrationSqlHashesMatch':True,'apiCodeHashes':api['hashes'],'result':result,'candidateUid':os.getuid(),'noHostPorts':True,'internalNetworkOnly':True,'productionContainersUnchanged':True,'limits':['Fixture-only secret files and unauthenticated401 paths; no DB, OAuth/provider login, session/upload success or production-key equality proven.','Readiness503 expected because fixture DB is absent; this is not a service-ready or deploy claim.','No host UDS or actual Cloudflare headers tested by this probe.']})
    finally:
        removed=0
        for name in reversed(owned):
            value=inspect(name)
            if value['Config']['Labels'].get(LABEL)!=marker:raise ValueError('Refuse unrelated container cleanup.')
            run(['docker','rm','-f',name]);removed+=1
        if network_created:
            value=json.loads(run(['docker','network','inspect',network]))[0]
            if value['Labels'].get(LABEL)!=marker:raise ValueError('Refuse unrelated network cleanup.')
            run(['docker','network','rm',network])
        for name in fixtures:(fixture/name).unlink()
        fixture.rmdir()
        report['cleanup']={'ownedContainersRemoved':removed,'ownedNetworkRemoved':network_created,'fixtureSecretsRemoved':True}
        output='candidate-images-probe-2026-11-04.json'if report.get('success')else 'candidate-images-probe-failed-'+marker+'.json'
        (BASE/output).write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps({'success':True,'staticFiles':len(expected),'proofMissing403':True,'proofValidUnauthenticated401':True,'fixtureCleaned':True}))

if __name__=='__main__':main()
