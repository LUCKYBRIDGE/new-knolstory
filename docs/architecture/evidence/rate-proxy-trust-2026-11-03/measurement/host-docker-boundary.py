"""Actual native private UDS -> loopback Docker ingress -> isolated API proof fixture.

Never reads production config, secrets, manuscripts, mounts or connections. Creates
only UUID-labelled resources, copies exact current ingress source into a tiny image,
and removes its own containers/network/native child in finally. The fixture key is
public test data in a private temporary file, never printed in logs or the report.
"""
import datetime
import hashlib
import http.client
import json
import os
from pathlib import Path
import socket
import stat
import subprocess
import tempfile
import time
import uuid

ROOT=Path(__file__).resolve().parents[5]
EVIDENCE=ROOT/'docs/architecture/evidence/rate-proxy-trust-2026-11-03'
RUN=str(uuid.uuid4())
LABEL='knolstory-rate-host-fixture='+RUN
IMAGE='knolstory-next-ingress:host-proof-fixture-'+RUN[:8]
NETWORK='knol-host-proof-'+RUN[:8]
EDGE='knol-host-proof-edge-'+RUN[:8]
API='knol-host-proof-api-'+RUN[:8]
INGRESS='knol-host-proof-ingress-'+RUN[:8]
BASE='node:22-bookworm-slim'


def command(args,**kwargs):
    result=subprocess.run(args,stdout=subprocess.PIPE,stderr=subprocess.PIPE,timeout=120,**kwargs)
    if result.returncode:
        raise RuntimeError('Owned local fixture command failed: '+args[0]+' '+args[1])
    return result.stdout


def docker(*args):
    return command(['docker',*args])


def production_ids():
    rows=docker('ps','--filter','name=knolstory-next-production-','--format','{{.Names}} {{.ID}}').decode().splitlines()
    return sorted(rows)


def body_json(container,path):
    # The only host in this executable fixture request is the container's own loopback.
    script="fetch('http://127.0.0.1:4000"+path+"').then(async r=>{if(!r.ok)process.exit(1);console.log(await r.text())}).catch(()=>process.exit(1))"
    return json.loads(docker('exec',container,'node','-e',script))


class UnixConnection(http.client.HTTPConnection):
    def __init__(self,path):
        super().__init__('localhost',timeout=5)
        self.path=path
    def connect(self):
        self.sock=socket.socket(socket.AF_UNIX,socket.SOCK_STREAM)
        self.sock.settimeout(self.timeout)
        self.sock.connect(self.path)


def exchange(connection,path='/',method='GET',headers=()):
    connection.putrequest(method,path,skip_host=True,skip_accept_encoding=True)
    connection.putheader('Host','story.knolquiz.com')
    for name,value in headers:
        connection.putheader(name,value)
    connection.endheaders()
    response=connection.getresponse()
    result={'status':response.status,'body':response.read().decode(),'headers':dict(response.getheaders())}
    connection.close()
    return result


def main():
    if os.getuid()!=501:
        raise RuntimeError('This measurement requires the observed native host UID501.')
    cache=ROOT/'.cache'/('host-docker-proof-'+RUN)
    cache.mkdir(mode=0o700)
    native=Path(tempfile.mkdtemp(prefix='knol-host-proof-',dir='/private/tmp')).resolve()
    native.chmod(0o700)
    socket_path=native/'edge.sock'
    key=cache/'fixture-key';key.write_text('ab'*32);key.chmod(0o600)
    context=cache/'context';context.mkdir(mode=0o700)
    copied=['server/Dockerfile.ingress','server/operations/production-ingress.mjs','server/operations/trusted-ingress-socket.mjs','server/http/client-bucket-proof.mjs']
    source_hashes={}
    for name in copied:
        source=ROOT/name;target=context/name;target.parent.mkdir(parents=True,exist_ok=True)
        data=source.read_bytes();target.write_bytes(data);source_hashes[name]=hashlib.sha256(data).hexdigest()
    site=context/'apps/web/out';site.mkdir(parents=True)
    (site/'index.html').write_text('HOST-DOCKER-STATIC-FIXTURE')
    (site/'range.bin').write_bytes(b'0123456789')
    gateway_hashes={name:hashlib.sha256((ROOT/name).read_bytes()).hexdigest() for name in ['server/operations/client-proof-gateway.mjs','server/operations/trusted-ingress-socket.mjs','server/http/client-bucket-proof.mjs','server/operations/production-ingress.mjs']}
    before=production_ids()
    owned_containers={};owned_networks={};child=None;child_log=None
    report={'run':RUN,'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'scope':'Native UID501 private UDS -> ephemeral127.0.0.1 Docker ingress port on fresh edge bridge -> fresh internal-network-only API; actual shared verifier, synthetic two-request limiter; no OAuth/DB or native cloudflared process.','sourceSha256':source_hashes,'gatewaySourceSha256':gateway_hashes,'localOnly':True}
    failure=None
    try:
        with (cache/'build.log').open('wb') as log:
            built=subprocess.run(['docker','build','--network=none','--pull=false','--label',LABEL,'--file','server/Dockerfile.ingress','--tag',IMAGE,'.'],cwd=context,stdout=log,stderr=subprocess.STDOUT,timeout=120)
            if built.returncode:raise RuntimeError('Exact-source fixture ingress image build failed.')
        report['imageDigest']=docker('image','inspect','--format','{{.Id}}',IMAGE).decode().strip()
        owned_networks[NETWORK]=docker('network','create','--internal','--label',LABEL,NETWORK).decode().strip()
        owned_networks[EDGE]=docker('network','create','--label',LABEL,EDGE).decode().strip()
        fixture=EVIDENCE/'measurement/host-docker-api-fixture.mjs'
        common=['--label',LABEL,'--network',NETWORK,'--user','501:20','--read-only','--cap-drop=ALL','--security-opt=no-new-privileges','--mount','type=bind,src='+str(key)+',dst=/run/fixture-proof-key,readonly']
        owned_containers[API]=docker('create',*common,'--name',API,'--network-alias','api','--mount','type=bind,src='+str(fixture)+',dst=/run/fixture-api.mjs,readonly',IMAGE,'node','/run/fixture-api.mjs').decode().strip()
        docker('start',API)
        owned_containers[INGRESS]=docker('create',*common,'--name',INGRESS,'--publish','127.0.0.1::8080','--env','KNOLSTORY_INGRESS_HOST=0.0.0.0','--env','KNOLSTORY_INGRESS_PORT=8080','--env','KNOLSTORY_PUBLIC_ORIGIN=https://story.knolquiz.com','--env','KNOLSTORY_REDIRECT_FROM_ORIGIN=https://story-next.knolquiz.com','--env','KNOLSTORY_API_ORIGIN=http://api:4000','--env','KNOLSTORY_STATIC_ROOT=/site','--env','KNOLSTORY_CLIENT_PROOF_KEY_FILE=/run/fixture-proof-key',IMAGE).decode().strip()
        docker('network','connect',EDGE,INGRESS)
        docker('start',INGRESS)
        time.sleep(.5)
        info=json.loads(docker('inspect',INGRESS))[0]
        report['publicationObserved']={'ports':info['NetworkSettings']['Ports'],'requestedBindings':info['HostConfig']['PortBindings'],'state':info['State']['Status']}
        bindings=info['NetworkSettings']['Ports']['8080/tcp']
        if len(bindings)!=1 or bindings[0]['HostIp']!='127.0.0.1':raise RuntimeError('Fixture ingress publication is not loopback-only.')
        port=int(bindings[0]['HostPort'])
        if not 1<=port<=65535:raise RuntimeError('Invalid ephemeral fixture port.')
        # Every native TCP request in this measurement targets only127.0.0.1.
        def tcp(path='/',method='GET',headers=()):
            destination='127.0.0.1'
            assert destination in ['127.0.0.1','localhost']
            return exchange(http.client.HTTPConnection(destination,port,timeout=5),path,method,headers)
        deadline=time.monotonic()+15
        while True:
            try:
                if body_json(API,'/health/live')['live'] and tcp()['status']==200:break
            except (RuntimeError,OSError,http.client.HTTPException):pass
            if time.monotonic()>deadline:raise RuntimeError('Fresh Docker fixture failed to become ready.')
            time.sleep(.2)
        rejected=tcp('/api/v1/me',headers=[('CF-Connecting-IP','192.0.2.10'),('X-Knolstory-Client-Proof','forged-fixture-proof')])
        if rejected['status']!=403 or body_json(API,'/measurement')['total']!=0:raise RuntimeError('Direct Docker TCP can bypass proof relay validation.')
        environment=dict(os.environ,KNOLSTORY_INGRESS_SOCKET=str(socket_path),KNOLSTORY_CLIENT_PROOF_KEY_FILE=str(key),KNOLSTORY_PUBLIC_ORIGIN='https://story.knolquiz.com',KNOLSTORY_REDIRECT_FROM_ORIGIN='https://story-next.knolquiz.com',KNOLSTORY_PROOF_GATEWAY_ORIGIN='http://127.0.0.1:'+str(port))
        child_log=(cache/'native-gateway.log').open('wb')
        child=subprocess.Popen(['node','server/operations/client-proof-gateway.mjs'],cwd=ROOT,env=environment,stdout=child_log,stderr=subprocess.STDOUT)
        deadline=time.monotonic()+10
        while not socket_path.exists():
            if child.poll() is not None:raise RuntimeError('Native private UDS gateway exited before readiness.')
            if time.monotonic()>deadline:raise RuntimeError('Native private UDS gateway readiness expired.')
            time.sleep(.05)
        sock=socket_path.stat();parent=native.stat()
        if not stat.S_ISSOCK(sock.st_mode) or sock.st_uid!=501 or sock.st_mode&0o777!=0o600 or parent.st_mode&0o777!=0o700:raise RuntimeError('Native socket ownership/modes differ from protected boundary.')
        def uds(path='/',method='GET',headers=()):
            return exchange(UnixConnection(str(socket_path)),path,method,headers)
        results={}
        for label,ip in [('clientA','192.0.2.10'),('clientB','198.51.100.20')]:
            statuses=[uds('/api/v1/me',headers=[('CF-Connecting-IP',ip),('X-Knolstory-Client-Proof','forged-fixture-proof')])['status'] for _ in range(3)]
            if statuses!=[200,200,429]:raise RuntimeError('Native-to-Docker clients did not get independent stable rate buckets.')
            results[label]=statuses
        measured=body_json(API,'/measurement')
        missing=uds('/api/v1/me')['status']
        duplicate=uds('/api/v1/me',headers=[('CF-Connecting-IP','192.0.2.10'),('CF-Connecting-IP','198.51.100.20')])['status']
        if missing!=400 or duplicate!=400 or body_json(API,'/measurement')!=measured:raise RuntimeError('Missing or duplicate CF claim reached the API fixture.')
        static=uds();head=uds(method='HEAD');ranged=uds('/range.bin',headers=[('Range','bytes=2-4')])
        # Alias uses a separate raw request so there is exactly one Host header.
        alias_connection=UnixConnection(str(socket_path));alias_connection.putrequest('GET','/range.bin',skip_host=True,skip_accept_encoding=True);alias_connection.putheader('Host','story-next.knolquiz.com');alias_connection.endheaders();alias=alias_connection.getresponse();alias_status=alias.status;alias_location=alias.getheader('location');alias.read();alias_connection.close()
        if static['status']!=200 or static['body']!='HOST-DOCKER-STATIC-FIXTURE' or head['status']!=200 or head['body']!='' or ranged['status']!=206 or ranged['body']!='234' or alias_status!=308 or alias_location!='https://story.knolquiz.com/range.bin':raise RuntimeError('Static/HEAD/range/alias boundary changed through native gateway.')
        if measured['uid']!=501 or measured['keyUid']!=501 or measured['keyMode']!=0o600 or not measured['keyRead'] or measured['bucketCounts']!=[3,3] or measured['invalid']!=0:raise RuntimeError('API fixture key permissions or proof verification differ.')
        ingress_read=json.loads(docker('exec',INGRESS,'node','-e',"const fs=require('fs');const p='/run/fixture-proof-key',s=fs.statSync(p);console.log(JSON.stringify({uid:process.getuid(),keyUid:s.uid,keyMode:s.mode&511,keyRead:/^[a-f0-9]{64}$/.test(fs.readFileSync(p,'utf8').trim())}))"))
        if ingress_read!={'uid':501,'keyUid':501,'keyMode':384,'keyRead':True}:raise RuntimeError('Docker ingress cannot use native UID501 private key read-only.')
        containment={}
        for name in owned_containers:
            meta=json.loads(docker('inspect',name))[0]
            if not meta['HostConfig']['ReadonlyRootfs'] or meta['HostConfig']['CapDrop']!=['ALL'] or 'no-new-privileges' not in meta['HostConfig']['SecurityOpt'] or set(meta['NetworkSettings']['Networks'])!=({NETWORK} if name==API else {NETWORK,EDGE}):raise RuntimeError('Fixture container escaped intended containment.')
            containment[name]={'readOnlyRoot':True,'capDropAll':True,'noNewPrivileges':True,'onlyFreshTaskNetworks':True,'onlyInternalNetwork':name==API,'user':meta['Config']['User']}
        report['networkBoundary']={'apiServiceInternal':True,'ingressEdgeBridgeInternal':False,'ingressEdgeEgressCapable':True,'onlyScriptedHostTcpDestination':'127.0.0.1','onlyScriptedContainerApiTarget':'api:4000','noExternalDestinationRequested':True,'notPacketCaptureEvidence':True}
        if any(hashlib.sha256((ROOT/name).read_bytes()).hexdigest()!=digest for name,digest in gateway_hashes.items()):raise RuntimeError('Native gateway source changed during measurement.')
        report.update(success=True,native={'uid':os.getuid(),'gid':os.getgid(),'parentMode':'0700','socketMode':'0600','socketUid':sock.st_uid},publishedIngress={'hostIp':'127.0.0.1','ephemeralPort':port,'proofRequiredOnTcp':True,'forgedDirectProofStatus':403},clients=results,untrustedClaims={'missingStatus':missing,'duplicateStatus':duplicate,'rejectedBeforeApi':True,'incomingForgedProofReplaced':True},apiFixture=measured,ingressKeyRead=ingress_read,static={'GET':static['status'],'HEAD':head['status'],'range':ranged['status'],'rangeBodyMatched':True,'aliasRedirect':alias_status,'aliasLocation':alias_location},containment=containment,productionContainerIdsUnchanged=production_ids()==before)
        if not report['productionContainerIdsUnchanged']:raise RuntimeError('Production container inventory changed concurrently; cannot claim unchanged.')
    except BaseException as error:
        failure=error;report.update(success=False,error=str(error))
    finally:
        cleanup={}
        if child is not None:
            if child.poll() is None:
                child.terminate()
                try:child.wait(timeout=12)
                except subprocess.TimeoutExpired:child.kill();child.wait(timeout=5)
            cleanup['nativeGatewayStopped']=child.poll() is not None
        if child_log is not None:child_log.close()
        for name,identifier in owned_containers.items():
            current=json.loads(docker('inspect',name))[0]
            if current['Id']!=identifier or current['Config']['Labels'].get('knolstory-rate-host-fixture')!=RUN:raise RuntimeError('Owned fixture container identity changed; cleanup requires manual review.')
            docker('rm','--force',name)
        for name,identifier in owned_networks.items():
            network=json.loads(docker('network','inspect',name))[0]
            if network['Id']!=identifier or network['Labels'].get('knolstory-rate-host-fixture')!=RUN:raise RuntimeError('Owned fixture network identity changed; cleanup requires manual review.')
            docker('network','rm',name)
        remaining=docker('ps','--all','--filter','label='+LABEL,'--format','{{.ID}}').decode().strip()
        networks=docker('network','ls','--filter','label='+LABEL,'--format','{{.ID}}').decode().strip()
        cleanup.update(ownedContainersRemoved=not remaining,ownedNetworkRemoved=not networks)
        if socket_path.exists():socket_path.unlink()
        native.rmdir();cleanup['ownedNativeSocketAndParentRemoved']=not native.exists()
        key.unlink();cleanup['fixtureKeyRemoved']=not key.exists()
        report['cleanup']=cleanup
        report['limits']=['API fixture uses the actual shared verifier and a synthetic rate limiter; no production sessions, OAuth, database, account or document routes.','Native host gateway used actual UID501 and a private UDS, but no actual cloudflared process was invoked and no tunnel configuration changed.','CF headers are synthetic test inputs; edge authenticity and privileged same-UID callers remain separate activation-review conditions.','The fixture ingress also joined a new egress-capable edge bridge because Docker did not publish ports for internal-only topology; API joined only a fresh internal service network. No scripted external request was performed; this is not packet-capture evidence.',
        'No Pages or fail-open deployment; static fixture only; no claim of all runtime/media bytes.']
        report['rawLocalDirectory']=str(cache.relative_to(ROOT))
        (cache/'result.json').write_text(json.dumps(report,indent=2)+'\n')
        output=EVIDENCE/('host-docker-boundary.json' if report.get('success') else 'host-docker-boundary-failure-'+RUN[:8]+'.json')
        output.write_text(json.dumps(report,indent=2)+'\n')
        print(json.dumps({'success':report.get('success'),'report':str(output.relative_to(ROOT)),'cleanup':cleanup}))
    if failure:raise failure


if __name__=='__main__':main()
