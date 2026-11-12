import {test,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,realpath,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {createServer,request} from 'node:http';
import {createClientProofGateway,listenClientProofGateway,loadClientProofGatewayConfig} from './client-proof-gateway.mjs';
import {CLIENT_BUCKET_HEADER,createClientBucketVerifier} from '../http/client-bucket-proof.mjs';
const origin='https://story.knolquiz.com',alias='https://story-next.knolquiz.com',key='ab'.repeat(32),cleanups=[];
afterEach(async()=>{for(const fn of cleanups.splice(0).reverse())await fn();});
const close=server=>new Promise(resolve=>{if(!server.listening)return resolve();server.closeAllConnections();server.close(resolve);});
async function fixture(options={}){
 const root=await realpath(await mkdtemp(join(tmpdir(),'kg-')));cleanups.push(()=>rm(root,{recursive:true}));
 const seen=[],upstream=createServer(options.reply??((req,res)=>{
  const chunks=[];req.on('data',chunk=>chunks.push(chunk));req.on('end',()=>{seen.push({method:req.method,url:req.url,headers:req.headers,body:Buffer.concat(chunks).toString()});res.writeHead(207,{'set-cookie':'sid=kept; Secure; HttpOnly','x-request-id':'fixture',range:'bytes=1-3',[CLIENT_BUCKET_HEADER]:'must-not-leak'});res.end('streamed');});
 }));await new Promise(resolve=>upstream.listen(0,'127.0.0.1',resolve));cleanups.push(()=>close(upstream));
 const config={socketPath:join(root,'g.sock'),key,origin,aliasOrigin:alias,upstreamOrigin:`http://127.0.0.1:${upstream.address().port}`,timeoutMs:100,...options.config};
 const server=await createClientProofGateway(config);cleanups.push(()=>close(server));await listenClientProofGateway(server,config);
 const send=(path,headers={},method='GET',body='')=>new Promise((resolve,reject)=>{
  const req=request({socketPath:config.socketPath,path,method,headers:{host:'story.knolquiz.com',...headers}},res=>{const chunks=[];res.on('data',chunk=>chunks.push(chunk));res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:Buffer.concat(chunks).toString()}));res.on('error',reject);});req.on('error',reject);req.end(body);
 });return {config,server,send,seen,upstream,root};
}
test('gateway config requires explicit private key/socket and loopback destination',()=>{
 const env={KNOLSTORY_INGRESS_SOCKET:'/private/g.sock',KNOLSTORY_CLIENT_PROOF_KEY_FILE:'/private/key'};
 assert.equal(loadClientProofGatewayConfig(env,()=>key).upstreamOrigin,'http://127.0.0.1:15501');
 for(const value of [{},{...env,KNOLSTORY_INGRESS_SOCKET:undefined},{...env,KNOLSTORY_CLIENT_PROOF_KEY_FILE:undefined},{...env,KNOLSTORY_PROOF_GATEWAY_ORIGIN:'http://evil.test:15501'},{...env,KNOLSTORY_PROOF_GATEWAY_ORIGIN:'http://127.0.0.1:15501/x'},{...env,KNOLSTORY_PUBLIC_ORIGIN:'https://evil.test'}])assert.throws(()=>loadClientProofGatewayConfig(value,()=>key),/Invalid client proof gateway configuration/);
 assert.throws(()=>loadClientProofGatewayConfig(env,()=>{throw Error('private path or key');}),error=>error.message==='Invalid client proof gateway configuration.');
});
test('canonical API signs the CF claim and streams method, target, body and cookies',async()=>{
 const {config,send,seen}=await fixture();
 const response=await send('/api/v1/documents?q=1',{'cf-connecting-ip':'192.0.2.1','x-real-ip':'198.51.100.2',[CLIENT_BUCKET_HEADER]:'forged',cookie:'sid=existing','content-type':'application/json','x-csrf-token':'existing'},'POST','{"draft":"kept"}');
 assert.equal(response.status,207);assert.equal(response.body,'streamed');assert.equal(response.headers[CLIENT_BUCKET_HEADER],undefined);assert.match(response.headers['set-cookie'][0],/sid=kept/);
 assert.equal(seen[0].body,'{"draft":"kept"}');assert.equal(seen[0].headers.cookie,'sid=existing');assert.equal(seen[0].headers['x-csrf-token'],'existing');
 const proof=seen[0].headers[CLIENT_BUCKET_HEADER];assert.notEqual(proof,'forged');
 const verify=createClientBucketVerifier({origin,key});assert.ok(verify({...seen[0],headers:seen[0].headers}));
 assert.equal(config.upstreamOrigin.startsWith('http://127.0.0.1:'),true);
});
test('static and alias requests keep their Host and cannot inherit a proof',async()=>{
 const {send,seen}=await fixture();
 await send('/runtime/renpy.data',{range:'bytes=1-3',[CLIENT_BUCKET_HEADER]:'forged'},'HEAD');
 assert.equal(seen[0].headers.range,'bytes=1-3');assert.equal(seen[0].method,'HEAD');assert.equal(seen[0].headers[CLIENT_BUCKET_HEADER],undefined);
 await send('/api/v1/me',{host:'story-next.knolquiz.com','cf-connecting-ip':'192.0.2.1',[CLIENT_BUCKET_HEADER]:'forged'});
 assert.equal(seen[1].headers.host,'story-next.knolquiz.com');assert.equal(seen[1].headers[CLIENT_BUCKET_HEADER],undefined);
});
test('invalid Host, targets and missing, duplicate or invalid client claims do not reach ingress',async()=>{
 const {send,seen}=await fixture();
 for(const headers of [{},{'cf-connecting-ip':'bad'},{'cf-connecting-ip':['192.0.2.1','198.51.100.1']},{host:'evil.test','cf-connecting-ip':'192.0.2.1'}])assert.equal((await send('/api/v1/me',headers)).status,400);
 for(const path of ['//evil.test/','/api/%ZZ','/api/%0a'])assert.equal((await send(path,{'cf-connecting-ip':'192.0.2.1'})).status,400);
 assert.equal(seen.length,0);
});
test('gateway factory cannot become a TCP signer; upstream failure stays explicit',async()=>{
 const {config,upstream,send}=await fixture();
 await close(upstream);assert.equal((await send('/')).status,502);
 const tcp=await createClientProofGateway({...config,socketPath:config.socketPath+'2'});cleanups.push(()=>close(tcp));
 await new Promise(resolve=>tcp.listen(0,'127.0.0.1',resolve));
 const status=await new Promise((resolve,reject)=>{const req=request({host:'127.0.0.1',port:tcp.address().port,path:'/api/v1/me',headers:{host:'story.knolquiz.com','cf-connecting-ip':'192.0.2.1'}},res=>{res.resume();res.on('end',()=>resolve(res.statusCode));});req.on('error',reject);req.end();});assert.equal(status,503);
});

test('gateway upstream timeout does not bypass the proof path',async()=>{
 const {send}=await fixture({reply:()=>{},config:{timeoutMs:10}});
 assert.equal((await send('/')).status,504);
});
test('gateway CLI masks invalid config and shuts down its actual private socket cleanly',async()=>{
 const bad=spawn(process.execPath,['server/operations/client-proof-gateway.mjs'],{env:{...process.env,KNOLSTORY_INGRESS_SOCKET:'',KNOLSTORY_CLIENT_PROOF_KEY_FILE:'/not-a-private-file'}});
 let errors='';bad.stderr.on('data',chunk=>errors+=chunk);const [code]=await once(bad,'exit');assert.equal(code,1);assert.equal(errors.trim(),'Invalid client proof gateway configuration.');
 const {root,config}=await fixture();const keyFile=join(root,'key');await writeFile(keyFile,key+'\n',{mode:0o600});
 const child=spawn(process.execPath,['server/operations/client-proof-gateway.mjs'],{env:{...process.env,KNOLSTORY_INGRESS_SOCKET:join(root,'c.sock'),KNOLSTORY_CLIENT_PROOF_KEY_FILE:keyFile,KNOLSTORY_PUBLIC_ORIGIN:origin,KNOLSTORY_REDIRECT_FROM_ORIGIN:alias,KNOLSTORY_PROOF_GATEWAY_ORIGIN:config.upstreamOrigin}});
 cleanups.push(async()=>{if(child.exitCode===null&&child.signalCode===null){const exited=once(child,'exit');child.kill('SIGTERM');await exited;}});
 const ready=await Promise.race([once(child.stdout,'data'),once(child,'exit').then(()=>{throw Error('Gateway CLI ended before listening');})]);
 assert.match(String(ready[0]),/Client proof gateway listening/);
 const exited=once(child,'exit');child.kill('SIGTERM');assert.equal((await exited)[0],0);
});
