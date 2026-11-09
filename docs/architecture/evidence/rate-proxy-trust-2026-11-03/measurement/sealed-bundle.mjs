/** Local review artifact only. Never install launchd, read service keys or change production. */
import {mkdir,mkdtemp,writeFile,readFile,realpath,rm,chmod} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {homedir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {spawn,spawnSync} from 'node:child_process';
import {createServer,request} from 'node:http';
import {isDeepStrictEqual} from 'node:util';
import {prepareClientProofBundle,verifyClientProofBundle} from '../../../../../server/operations/client-proof-bundle.mjs';
import {createClientProofLaunchDraft} from '../../../../../server/operations/client-proof-launch.mjs';
const root=resolve(import.meta.dirname,'../../../../..'),evidence=resolve(import.meta.dirname,'..');
const reviewBase=join(homedir(),'.local','share','knolstory-client-proof-review');
await mkdir(reviewBase,{recursive:true,mode:0o700});
const parent=await realpath(await mkdtemp(join(reviewBase,'candidate-'))),destination=join(parent,'bundle');
const checkpoint=JSON.parse(await readFile(join(evidence,'checkpoint.json'),'utf8'));
const names=['http/client-bucket-proof.mjs','operations/client-proof-gateway.mjs','operations/production-ingress.mjs','operations/trusted-ingress-socket.mjs'];
const expectedSourceSha256=Object.fromEntries(names.map(name=>[name,checkpoint.sourceSha256['server/'+name]]));
const bundle=await prepareClientProofBundle({sourceRoot:join(root,'server'),destination,expectedSourceSha256});
const draft=await createClientProofLaunchDraft({bundleRoot:destination,expectedBundleId:bundle.manifest.bundleId,nodePath:await realpath(process.execPath),keyFile:join(parent,'future-client-proof-key'),socketPath:join(parent,'g.sock'),stdoutPath:join(parent,'stdout.log'),stderrPath:join(parent,'stderr.log')});
const plist=join(parent,'gateway-draft.plist');await writeFile(plist,draft.plist,{mode:0o600});
const lint=spawnSync('plutil',['-lint',plist],{encoding:'utf8'});if(lint.status!==0)throw Error('Local plist syntax check failed.');
const decoded=spawnSync('plutil',['-convert','json','-o','-',plist],{encoding:'utf8'});
if(decoded.status!==0)throw Error('Local plist decode failed.');
const configuration=JSON.parse(decoded.stdout);
if(!isDeepStrictEqual(configuration,draft.configuration))throw Error('Draft configuration differs.');
const fixtureKey=join(parent,'fixture-key'),socketPath=join(parent,'fixture.sock'),key='ab'.repeat(32);
await writeFile(fixtureKey,key+'\n',{mode:0o600});
const {createClientBucketVerifier,CLIENT_BUCKET_HEADER}=await import(pathToFileURL(join(destination,'http/client-bucket-proof.mjs')).href);
const verify=createClientBucketVerifier({key,origin:'https://story.knolquiz.com'});let verifiedRequest=false;
const upstream=createServer((req,res)=>{verifiedRequest=typeof req.headers[CLIENT_BUCKET_HEADER]==='string'&&verify(req)!==null;res.writeHead(verifiedRequest?200:403,{'Content-Type':'application/json'});res.end(JSON.stringify({verified:verifiedRequest}));});
let child,exited,exitResult;
const bounded=(promise,ms)=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Local fixture observation timeout')),ms);promise.then(value=>{clearTimeout(timer);resolve(value);},error=>{clearTimeout(timer);reject(error);});});
try{
 await new Promise(resolve=>upstream.listen(0,'127.0.0.1',resolve));
 child=spawn(process.execPath,[bundle.entryPath],{cwd:parent,env:{KNOLSTORY_INGRESS_SOCKET:socketPath,KNOLSTORY_CLIENT_PROOF_KEY_FILE:fixtureKey,KNOLSTORY_PUBLIC_ORIGIN:'https://story.knolquiz.com',KNOLSTORY_REDIRECT_FROM_ORIGIN:'https://story-next.knolquiz.com',KNOLSTORY_PROOF_GATEWAY_ORIGIN:'http://127.0.0.1:'+upstream.address().port}});
 exited=new Promise(resolve=>child.once('exit',(code,signal)=>resolve({code,signal})));
 await bounded(new Promise((resolve,reject)=>{let output='';child.stdout.on('data',chunk=>{output+=chunk;if(output.includes('Client proof gateway listening.'))resolve();});child.once('error',reject);exited.then(()=>reject(Error('Local gateway ended before readiness')));}),5000);
 const status=await bounded(new Promise((resolve,reject)=>{const req=request({socketPath,path:'/api/v1/me',headers:{host:'story.knolquiz.com','cf-connecting-ip':'192.0.2.1',[CLIENT_BUCKET_HEADER]:'forged'}},res=>{res.resume();res.once('end',()=>resolve(res.statusCode));});req.once('error',reject);req.end();}),3000);
 if(status!==200||!verifiedRequest)throw Error('Sealed gateway fixture did not verify.');
 child.kill('SIGTERM');exitResult=await bounded(exited,3000);if(exitResult.code!==0)throw Error('Sealed gateway shutdown failed.');
}finally{
 if(child&&child.exitCode===null&&child.signalCode===null){child.kill('SIGTERM');try{await bounded(exited,3000);}catch{child.kill('SIGKILL');await exited;}}
 upstream.closeAllConnections();await new Promise(resolve=>upstream.close(resolve));
 await rm(fixtureKey,{force:true});await rm(socketPath,{force:true});
}
await verifyClientProofBundle({destination,expectedBundleId:bundle.manifest.bundleId});
const locations=join(root,'.cache/proof-managed-private-locations.json');await writeFile(locations,JSON.stringify({parent,destination,plist,entryPath:bundle.entryPath}),{mode:0o600});await chmod(locations,0o600);
const report={checkedAt:new Date().toISOString(),scope:'Sealed local review package and uninstalled launchd draft; actual independent native CLI fixture only.',bundle:bundle.manifest,launchDraft:draft.review,plistSyntaxPassed:true,plistDecoded:true,runtime:{node:process.version,uid:process.getuid(),programAndCwdOutsideCheckout:true,environmentExplicitAndMinimal:true,requestStatus:200,verifiedWithSealedPrimitive:true,shutdown:exitResult,productionKeyUsed:false,fixtureKeyRemoved:true,nativeFixtureStopped:true},preservation:{serviceInstalled:false,launchctlInvoked:false,productionConfigChanged:false,sourceManuscriptsChanged:false},limits:['No launchd bootstrap, actual daemon restart/crash recovery or real Tunnel is proven.','KeepAlive is deliberately false; manual stale-socket verification is required before recovery.','Future key/log/socket parent permissions require activation preflight; no production key was created.','Review artifact is local and outside checkout; absolute locations remain in a private0600 cache pointer.']};
await writeFile(join(evidence,'sealed-bundle.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({bundleId:bundle.manifest.bundleId,files:4,independentRequest:200,shutdown:0,plistSyntaxPassed:true,installed:false}));
