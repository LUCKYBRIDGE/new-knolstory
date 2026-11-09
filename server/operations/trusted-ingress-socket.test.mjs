import {test,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {createServer,request} from 'node:http';
import {mkdtemp,writeFile,mkdir,chmod,lstat,symlink,rm,realpath} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createProductionIngress,loadProductionIngressConfig,listenProductionIngress} from './production-ingress.mjs';
import {createClientBucketVerifier,CLIENT_BUCKET_HEADER} from '../http/client-bucket-proof.mjs';
import {listenProtectedSocket} from './trusted-ingress-socket.mjs';
const cleanups=[];
afterEach(async()=>{for(const cleanup of cleanups.splice(0).reverse())await cleanup();});
const key='ab'.repeat(32),origin='https://story.knolquiz.com';
async function close(server){if(server.listening)await new Promise(resolve=>{server.close(resolve);server.closeAllConnections();});}
async function setup(){
 const root=await realpath(await mkdtemp(join(tmpdir(),'knol-uds-')));cleanups.push(()=>rm(root,{recursive:true,force:true}));
 await chmod(root,0o700);await writeFile(join(root,'index.html'),'STATIC');
 const seen=[];const api=createServer((req,res)=>{seen.push({method:req.method,url:req.url,headers:req.headers});res.writeHead(200,{[CLIENT_BUCKET_HEADER]:'must-not-leak'});res.end('API');});
 await new Promise(resolve=>api.listen(0,'127.0.0.1',resolve));cleanups.push(()=>close(api));
 const config={staticRoot:root,publicOrigin:origin,apiOrigin:`http://127.0.0.1:${api.address().port}`,trustedClient:{socketPath:join(root,'ingress.sock'),key}};
 const server=await createProductionIngress(config);cleanups.push(()=>close(server));
 const get=(headers={},path='/api/v1/me',tcpPort)=>new Promise((resolve,reject)=>{
  const req=request({...tcpPort?{host:'127.0.0.1',port:tcpPort}:{socketPath:config.trustedClient.socketPath},path,headers:{host:'story.knolquiz.com',...headers}},res=>{let body='';res.on('data',chunk=>body+=chunk);res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body}));});req.on('error',reject);req.end();
 });
 return {root,config,server,get,seen};
}
test('trusted signing config requires strict key file; key-only relay and default TCP remain distinct',()=>{
 const base={KNOLSTORY_STATIC_ROOT:'/site'};
 assert.equal(loadProductionIngressConfig(base).trustedClient,undefined);
 const env={...base,KNOLSTORY_INGRESS_SOCKET:'/run/private/ingress.sock',KNOLSTORY_CLIENT_PROOF_KEY_FILE:'/private/key'};
 assert.equal(loadProductionIngressConfig(env,()=>key+'\n').trustedClient.key,key);
 for(const input of [{...base,KNOLSTORY_INGRESS_SOCKET:env.KNOLSTORY_INGRESS_SOCKET},{...env,KNOLSTORY_INGRESS_SOCKET:'relative'}])assert.throws(()=>loadProductionIngressConfig(input,()=>key),/Invalid production ingress configuration/);
 for(const value of ['','x'.repeat(64),'ab'.repeat(31),key+'\nvalue'])assert.throws(()=>loadProductionIngressConfig(env,()=>value),/Invalid production ingress configuration/);
 assert.throws(()=>loadProductionIngressConfig(env,()=>{throw Error('/private/key value');}),error=>!error.message.includes('/private/key'));
});
test('actual protected Unix listener signs one CF client, replaces spoofed proof, never leaks proof',async()=>{
 const {server,config,get,seen}=await setup();await listenProductionIngress(server,config);
 assert.equal((await lstat(config.trustedClient.socketPath)).mode&0o777,0o600);
 const response=await get({'cf-connecting-ip':'192.0.2.10',[CLIENT_BUCKET_HEADER]:'forged','x-real-ip':'198.51.100.20','x-forwarded-for':'203.0.113.1'});
 assert.equal(response.status,200);assert.equal(response.headers[CLIENT_BUCKET_HEADER],undefined);
 const received=seen[0];assert.notEqual(received.headers[CLIENT_BUCKET_HEADER],'forged');assert.equal(received.headers['x-forwarded-for'],undefined);
 const verify=createClientBucketVerifier({key,origin});const bucket=verify(received);
 assert.ok(bucket);assert.equal(verify({...received,headers:{...received.headers,[CLIENT_BUCKET_HEADER]:'forged'}}),null);
 assert.equal((await get({},'/')).body,'STATIC');
});
test('Unix rejects missing, multiple or invalid CF claim and never calls API',async()=>{
 const {server,config,get,seen}=await setup();await listenProductionIngress(server,config);
 for(const claims of [{},{'cf-connecting-ip':'bad'},{'cf-connecting-ip':'192.0.2.1, 192.0.2.2'},{'cf-connecting-ip':['192.0.2.1','192.0.2.2']}])assert.equal((await get(claims)).status,400);
 assert.equal(seen.length,0);
});
test('trusted factory accidentally bound to TCP cannot act as signer',async()=>{
 const {server,get,seen}=await setup();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 assert.equal((await get({'cf-connecting-ip':'192.0.2.1',[CLIENT_BUCKET_HEADER]:'forged'},'/api/v1/me',server.address().port)).status,503);assert.equal(seen.length,0);
});
test('existing file, existing socket, symlink and insecure parent are never replaced',async()=>{
 const {server,config,root}=await setup();const path=config.trustedClient.socketPath;
 await writeFile(path,'owned');await assert.rejects(()=>listenProductionIngress(server,config));assert.equal((await lstat(path)).isFile(),true);await rm(path);
 await symlink(join(root,'index.html'),path);await assert.rejects(()=>listenProductionIngress(server,config));assert.equal((await lstat(path)).isSymbolicLink(),true);await rm(path);
 const prior=createServer();await new Promise(resolve=>prior.listen(path,resolve));cleanups.push(()=>close(prior));await assert.rejects(()=>listenProductionIngress(server,config));assert.equal(prior.listening,true);await close(prior);
 await chmod(root,0o750);await assert.rejects(()=>listenProductionIngress(server,config));assert.equal((await lstat(root)).mode&0o777,0o750);await chmod(root,0o700);
 const other=join(root,'linked');await symlink(root,other);await assert.rejects(()=>createProductionIngress({...config,trustedClient:{...config.trustedClient,socketPath:join(other,'nested.sock')}}));
 await mkdir(join(root,'nested'));await chmod(join(root,'nested'),0o700);
 await assert.rejects(()=>createProductionIngress({...config,trustedClient:{...config.trustedClient,socketPath:join(root,'nested','x'.repeat(110))}}));
});
test('default TCP strips inherited and response proof without enabling signing',async()=>{
 const {config,seen}=await setup();
 const plain=await createProductionIngress({...config,trustedClient:undefined});cleanups.push(()=>close(plain));
 await listenProductionIngress(plain,{...config,trustedClient:undefined,port:0,host:'127.0.0.1'});
 const response=await new Promise((resolve,reject)=>{const req=request({host:'127.0.0.1',port:plain.address().port,path:'/api/v1/me',headers:{host:'story.knolquiz.com',[CLIENT_BUCKET_HEADER]:'forged','cf-connecting-ip':'192.0.2.1'}},res=>{res.resume();res.on('end',()=>resolve(res));});req.on('error',reject);req.end();});
 assert.equal(response.statusCode,200);assert.equal(response.headers[CLIENT_BUCKET_HEADER],undefined);assert.equal(seen[0].headers[CLIENT_BUCKET_HEADER],undefined);
});

test('a file appearing at bind time causes refusal without deleting that file',async()=>{
 const {root}=await setup();const server=createServer();cleanups.push(()=>close(server));
 const original=server.listen.bind(server),socketPath=join(root,'raced.sock');
 server.listen=(...args)=>{void writeFile(socketPath,'concurrent owner').then(()=>original(...args));return server;};
 await assert.rejects(()=>listenProtectedSocket(server,socketPath));
 assert.equal((await lstat(socketPath)).isFile(),true);
});
test('nonsticky writable ancestors are refused even when immediate parent is private',async()=>{
 const {root,config}=await setup();const writable=join(root,'u'),privateDir=join(writable,'p');
 assert.ok(Buffer.byteLength(join(privateDir,'i.sock'))<=100);
 await mkdir(writable);await chmod(writable,0o777);await mkdir(privateDir);await chmod(privateDir,0o700);
 await assert.rejects(()=>createProductionIngress({...config,trustedClient:{...config.trustedClient,socketPath:join(privateDir,'i.sock')}}),/Invalid protected ingress socket configuration/);
 assert.equal((await lstat(writable)).mode&0o777,0o777);
 await chmod(writable,0o755);
 const allowed=await createProductionIngress({...config,trustedClient:{...config.trustedClient,socketPath:join(privateDir,'i.sock')}});cleanups.push(()=>close(allowed));
});
test('sticky writable ancestors preserve the trusted-owner private child boundary',async()=>{
 const {root,config}=await setup();const sticky=join(root,'s'),privateDir=join(sticky,'p');
 assert.ok(Buffer.byteLength(join(privateDir,'i.sock'))<=100);
 await mkdir(sticky);await chmod(sticky,0o1777);await mkdir(privateDir);await chmod(privateDir,0o700);
 const allowed=await createProductionIngress({...config,trustedClient:{...config.trustedClient,socketPath:join(privateDir,'i.sock')}});cleanups.push(()=>close(allowed));
});
