import {test,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {createServer,request} from 'node:http';
import {mkdtemp,writeFile,realpath,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createProductionIngress,loadProductionIngressConfig} from './production-ingress.mjs';
import {CLIENT_BUCKET_HEADER,createClientBucketSigner,createClientBucketVerifier} from '../http/client-bucket-proof.mjs';
const key='ab'.repeat(32),origin='https://story.knolquiz.com';
const cleanups=[];
afterEach(async()=>{for(const cleanup of cleanups.splice(0).reverse())await cleanup();});
async function listen(server){await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));cleanups.push(()=>new Promise(resolve=>{server.close(resolve);server.closeAllConnections();}));return server.address().port;}
async function fixture(){
 const root=await realpath(await mkdtemp(join(tmpdir(),'knol-relay-')));cleanups.push(()=>rm(root,{recursive:true,force:true}));await writeFile(join(root,'index.html'),'STATIC');
 const received=[];const verify=createClientBucketVerifier({key,origin});
 const api=createServer((req,res)=>{received.push({method:req.method,url:req.url,headers:req.headers,verified:verify(req)});req.pipe(res);});
 const apiPort=await listen(api),config={staticRoot:root,publicOrigin:origin,apiOrigin:`http://127.0.0.1:${apiPort}`,clientProofKey:key,redirectFromOrigin:'https://story-next.knolquiz.com'};
 const ingress=await createProductionIngress(config),port=await listen(ingress);
 const send=({path='/api/v1/me',headers={},method='GET',body=''}={})=>new Promise((resolve,reject)=>{const req=request({host:'127.0.0.1',port,path,method,headers:{host:'story.knolquiz.com',...headers}},res=>{let data='';res.on('data',chunk=>data+=chunk);res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:data}));});req.on('error',reject);req.end(body);});
 return {received,send,config};
}
test('key-only CLI config enables relay, socket plus key enables signer, both modes cannot coexist',async()=>{
 const base={KNOLSTORY_STATIC_ROOT:'/site',KNOLSTORY_CLIENT_PROOF_KEY_FILE:'/fixture-key'};
 const relay=loadProductionIngressConfig(base,()=>key+'\n');assert.equal(relay.clientProofKey,key);assert.equal(relay.trustedClient,undefined);
 const signer=loadProductionIngressConfig({...base,KNOLSTORY_INGRESS_SOCKET:'/run/private/ingress.sock'},()=>key);assert.equal(signer.trustedClient.key,key);assert.equal(signer.clientProofKey,undefined);
 const {config}=await fixture();
 for(const value of ['','bad',key.toUpperCase()])await assert.rejects(()=>createProductionIngress({...config,clientProofKey:value}),/Invalid production ingress configuration/);
 await assert.rejects(()=>createProductionIngress({...config,trustedClient:{socketPath:'/run/private/ingress.sock',key}}),/Invalid production ingress configuration/);
});
test('valid relay proof reaches API byte-for-byte and is independently verifiable while body streams',async()=>{
 const {send,received}=await fixture(),target={method:'POST',url:'/api/v1/documents?x=1'},proof=createClientBucketSigner({key,origin})(target,'192.0.2.10');
 const response=await send({method:target.method,path:target.url,body:'streamed body',headers:{[CLIENT_BUCKET_HEADER]:proof,'cf-connecting-ip':'203.0.113.90','x-real-ip':'198.51.100.7'}});
 assert.equal(response.status,200);assert.equal(response.body,'streamed body');assert.equal(received.length,1);assert.equal(received[0].headers[CLIENT_BUCKET_HEADER],proof);assert.ok(received[0].verified);
});
test('relay rejects missing, malformed, duplicate, stale, wrong-key and changed-target proofs',async()=>{
 const {send,received}=await fixture(),target={method:'GET',url:'/api/v1/me'},proof=createClientBucketSigner({key,origin})(target,'192.0.2.10');
 for(const headers of [{},{[CLIENT_BUCKET_HEADER]:'forged'},{[CLIENT_BUCKET_HEADER]:[proof,proof]},{'cf-connecting-ip':'192.0.2.10','x-real-ip':'192.0.2.10'},{[CLIENT_BUCKET_HEADER]:createClientBucketSigner({key:'cd'.repeat(32),origin})(target,'192.0.2.10')},{[CLIENT_BUCKET_HEADER]:createClientBucketSigner({key,origin,clock:()=>Date.now()-31000})(target,'192.0.2.10')}])assert.equal((await send({headers})).status,403);
 for(const changed of [{path:'/api/v1/me?x=1'},{path:'/api/v1/documents'},{method:'POST'}])assert.equal((await send({...changed,headers:{[CLIENT_BUCKET_HEADER]:proof}})).status,403);
 assert.equal(received.length,0);
});
test('Host, path, static and alias boundaries run before proof relay',async()=>{
 const {send,received}=await fixture();
 assert.equal((await send({path:'/'})).body,'STATIC');
 assert.equal((await send({headers:{host:'evil.test'}})).status,400);
 assert.equal((await send({path:'/%61pi/v1/me'})).status,400);
 assert.equal((await send({path:'/api/v1/me',headers:{host:'story-next.knolquiz.com'}})).status,308);
 assert.equal(received.length,0);
});
