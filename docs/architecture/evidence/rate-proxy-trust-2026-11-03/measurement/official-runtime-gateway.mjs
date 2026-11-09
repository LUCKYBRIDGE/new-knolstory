/** Invoke only with the verified official Node artifact; no service or production-key operations. */
import {readFile,writeFile,mkdtemp,rm,realpath,lstat} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {spawn,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createServer,request} from 'node:http';
import {isDeepStrictEqual} from 'node:util';
import {pathToFileURL} from 'node:url';
import {inspectClientProofPaths} from '../../../../../server/operations/client-proof-preflight.mjs';
import {createClientProofLaunchDraft} from '../../../../../server/operations/client-proof-launch.mjs';
import {verifyClientProofBundle} from '../../../../../server/operations/client-proof-bundle.mjs';
const root=resolve(import.meta.dirname,'../../../../..'),base=resolve(import.meta.dirname,'..');
const runtime=JSON.parse(await readFile(join(root,'.cache/proof-official-runtime-private.json'),'utf8'));
const runtimeProof=JSON.parse(await readFile(join(base,'official-runtime-2026-11-04.json'),'utf8'));
const nodePath=await realpath(process.execPath);
if(nodePath!==runtime.nodePath||createHash('sha256').update(await readFile(nodePath)).digest('hex')!==runtimeProof.nodeSha256)throw Error('Selected reviewed runtime differs.');
const selected=JSON.parse(await readFile(join(root,'.cache/proof-managed-private-locations.json'),'utf8'));
const bundleProof=JSON.parse(await readFile(join(base,'sealed-bundle.json'),'utf8'));
const bundle=await verifyClientProofBundle({destination:selected.destination,expectedBundleId:bundleProof.bundle.bundleId});
const decoded=spawnSync('/usr/bin/plutil',['-convert','json','-o','-',selected.plist],{encoding:'utf8',timeout:5000});
if(decoded.status!==0)throw Error('Existing private draft cannot be decoded.');
const old=JSON.parse(decoded.stdout),env=old.EnvironmentVariables;
const label=old.Label,uid=process.getuid();
const serviceQueries=['gui/'+uid,'user/'+uid,'system'].map(domain=>{
 const value=spawnSync('/bin/launchctl',['print',domain+'/'+label],{encoding:'utf8',timeout:5000});
 if(value.error||value.status!==113||!value.stderr.includes('Could not find service'))throw Error('Fresh service absence not established.');
 return {domainKind:domain.split('/')[0],found:false};
});
const inspectOptions={bundleRoot:selected.destination,expectedBundleId:bundle.manifest.bundleId,nodePath,keyFile:env.KNOLSTORY_CLIENT_PROOF_KEY_FILE,socketPath:env.KNOLSTORY_INGRESS_SOCKET,stdoutPath:old.StandardOutPath,stderrPath:old.StandardErrorPath,existingServiceLabels:[]};
const proposed=await createClientProofLaunchDraft(inspectOptions);
if(!isDeepStrictEqual({...old,ProgramArguments:[nodePath,...old.ProgramArguments.slice(1)]},proposed.configuration))throw Error('Unrelated launch draft settings changed.');
const draftPath=join(runtime.parent,'gateway-official-draft.plist');
await writeFile(draftPath,proposed.plist,{mode:0o600,flag:'wx'});
const syntax=spawnSync('/usr/bin/plutil',['-lint',draftPath],{encoding:'utf8',timeout:5000});
const roundTrip=spawnSync('/usr/bin/plutil',['-convert','json','-o','-',draftPath],{encoding:'utf8',timeout:5000});
if(syntax.status!==0||roundTrip.status!==0||!isDeepStrictEqual(JSON.parse(roundTrip.stdout),proposed.configuration))throw Error('New launch draft syntax or round trip failed.');
const fixture=await realpath(await mkdtemp(join(root,'.cache/og-')));
const key='ab'.repeat(32),keyFile=join(fixture,'key'),socketPath=join(fixture,'g.sock');
let preflight;
const {createClientBucketVerifier,CLIENT_BUCKET_HEADER}=await import(pathToFileURL(join(selected.destination,'http/client-bucket-proof.mjs')).href);
const verify=createClientBucketVerifier({key,origin:'https://story.knolquiz.com'});
let verified=false,child,exited,shutdown;
const upstream=createServer((req,res)=>{verified=verify(req)!==null;res.writeHead(verified?200:403,{'Content-Type':'application/json'});res.end('{"fixture":true}');});
const bounded=(promise,ms)=>new Promise((done,fail)=>{const timer=setTimeout(()=>fail(Error('Official runtime fixture timed out.')),ms);promise.then(value=>{clearTimeout(timer);done(value);},error=>{clearTimeout(timer);fail(error);});});
let requestStatus;
try{
 await writeFile(keyFile,key+'\n',{mode:0o600,flag:'wx'});
 preflight=await inspectClientProofPaths({...inspectOptions,keyFile,socketPath,stdoutPath:join(fixture,'out'),stderrPath:join(fixture,'err')});
 await new Promise(done=>upstream.listen(0,'127.0.0.1',done));
 child=spawn(nodePath,[bundle.entryPath],{cwd:runtime.parent,env:{PATH:'/usr/bin:/bin',HOME:runtime.parent,KNOLSTORY_INGRESS_SOCKET:socketPath,KNOLSTORY_CLIENT_PROOF_KEY_FILE:keyFile,KNOLSTORY_PUBLIC_ORIGIN:'https://story.knolquiz.com',KNOLSTORY_REDIRECT_FROM_ORIGIN:'https://story-next.knolquiz.com',KNOLSTORY_PROOF_GATEWAY_ORIGIN:'http://127.0.0.1:'+upstream.address().port}});
 exited=new Promise(done=>child.once('exit',(code,signal)=>done({code,signal})));
 await bounded(new Promise((done,fail)=>{let output='';child.stdout.on('data',chunk=>{output+=chunk;if(output.includes('Client proof gateway listening.'))done();});child.once('error',fail);exited.then(()=>fail(Error('Gateway ended before ready.')));}),5000);
 requestStatus=await bounded(new Promise((done,fail)=>{const req=request({socketPath,path:'/api/v1/me',headers:{host:'story.knolquiz.com','cf-connecting-ip':'192.0.2.1',[CLIENT_BUCKET_HEADER]:'forged'}},res=>{res.resume();res.once('end',()=>done(res.statusCode));});req.once('error',fail);req.end();}),3000);
 if(requestStatus!==200||!verified)throw Error('Official runtime gateway proof not verified.');
 child.kill('SIGTERM');shutdown=await bounded(exited,3000);
 if(shutdown.code!==0)throw Error('Official runtime gateway did not stop cleanly.');
}finally{
 if(child&&child.exitCode===null&&child.signalCode===null){child.kill('SIGTERM');try{await bounded(exited,3000);}catch{child.kill('SIGKILL');await exited;}}
 upstream.closeAllConnections();await new Promise(done=>upstream.close(done));
 await rm(fixture,{recursive:true});
}
const absent=async path=>{try{await lstat(path);return false;}catch(error){if(error.code==='ENOENT')return true;throw error;}};
if(!await absent(inspectOptions.keyFile)||!await absent(inspectOptions.socketPath))throw Error('Selected future artifacts unexpectedly exist.');
await verifyClientProofBundle({destination:selected.destination,expectedBundleId:bundle.manifest.bundleId});
const report={checkedAt:new Date().toISOString(),scope:'Verified official runtime, freshly regenerated uninstalled launch draft, real fixture gateway only.',nodeVersion:process.version,nodeSha256:runtimeProof.nodeSha256,bundleId:bundle.manifest.bundleId,serviceQueries,preflight,launchDraft:proposed.review,plistSyntaxPassed:true,plistRoundTripEqual:true,onlyExecutableChanged:true,fixture:{requestStatus,signatureVerified:verified,shutdown,removed:await absent(fixture),environmentExplicitAndMinimal:true},preservation:{serviceInstalled:false,productionKeyCreated:false,productionKeyRead:false,selectedKeyAndSocketStillAbsent:true,productionConfigChanged:false,existingHomebrewPermissionsChanged:false},limits:['Actual production key/mount equality, service installation and recovery remain separately gated.','Direct dependency review trusts macOS system libraries/loader; no complete runtime memory attestation.','Fresh service absence does not lock the label or prove future launchd environment.','Fixture IP/session are synthetic; no actual Cloudflare/Tunnel UDS or provider upload proof.']};
await writeFile(join(root,'.cache/proof-official-launch-private.json'),JSON.stringify({nodePath,draftPath,bundleRoot:selected.destination,runtimeRoot:runtime.runtimeRoot,configuration:proposed.configuration}),{mode:0o600,flag:'wx'});
await writeFile(join(base,'official-runtime-gateway-2026-11-04.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({officialRuntime:true,preflight:true,requestStatus,shutdown:shutdown.code,serviceInstalled:false}));
