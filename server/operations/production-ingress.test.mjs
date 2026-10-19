import {test,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,mkdir,symlink,rm,realpath} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {createServer,request} from 'node:http';
import {createProductionIngress,loadProductionIngressConfig} from './production-ingress.mjs';
const cleanups=[];
afterEach(async()=>{for(const fn of cleanups.splice(0).reverse())await fn();});
async function listen(server){await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));cleanups.push(()=>new Promise(resolve=>{server.close(resolve);server.closeAllConnections();}));return server.address().port;}
async function fixture(options={}){
 const root=await realpath(await mkdtemp(join(tmpdir(),'knol-ingress-')));cleanups.push(()=>rm(root,{recursive:true,force:true}));
 await mkdir(join(root,'book'));await writeFile(join(root,'index.html'),'HOME');await writeFile(join(root,'book.html'),'PAGE');await writeFile(join(root,'book','index.html'),'INDEX');
 for(const extension of ['wasm','js','data'])await writeFile(join(root,`runtime.${extension}`),'0123456789');
 await symlink('/etc/passwd',join(root,'escape'));await symlink(root,join(root,'loop'));
 const api=createServer(options.api??((req,res)=>{req.pipe(res);}));const apiPort=await listen(api);
 const ingress=await createProductionIngress({staticRoot:root,publicOrigin:'https://story.knolquiz.com',apiOrigin:`http://127.0.0.1:${apiPort}`,timeoutMs:100,...options.config});
 const port=await listen(ingress);
 const get=(path,headers={},method='GET')=>new Promise((resolve,reject)=>{const req=request({host:'127.0.0.1',port,path,method,headers:{host:'story.knolquiz.com',...headers}},res=>{const chunks=[];res.on('data',chunk=>chunks.push(chunk));res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:Buffer.concat(chunks).toString()}));res.on('error',reject);});req.on('error',reject);req.end();});
 return {get,api,root};
}
test('configuration rejects unsafe origins, paths, ports and timeouts',async()=>{
 assert.equal(loadProductionIngressConfig({KNOLSTORY_STATIC_ROOT:'/tmp/web'}).port,15501);
 assert.equal(loadProductionIngressConfig({KNOLSTORY_STATIC_ROOT:'/web',KNOLSTORY_INGRESS_HOST:'0.0.0.0',KNOLSTORY_API_ORIGIN:'http://api:4000',KNOLSTORY_PUBLIC_ORIGIN:'https://story-next.knolquiz.com'}).host,'0.0.0.0');
 for(const env of [{},{KNOLSTORY_STATIC_ROOT:'relative'},{KNOLSTORY_STATIC_ROOT:'/tmp',KNOLSTORY_INGRESS_PORT:'0'},{KNOLSTORY_STATIC_ROOT:'/tmp',KNOLSTORY_PUBLIC_ORIGIN:'https://evil.test'}])assert.throws(()=>loadProductionIngressConfig(env));
 for(const config of [{apiOrigin:'https://example.com'},{apiOrigin:'http://other:4000'},{publicOrigin:'http://story.knolquiz.com'},{timeoutMs:0},{host:'10.0.0.1'},{staticRoot:'/not-a-real-export'}])await assert.rejects(()=>createProductionIngress({staticRoot:'/tmp',publicOrigin:'https://story-knol.knolquiz.com',apiOrigin:'http://127.0.0.1:15400',...config}));
});
test('static routes, HEAD, MIME, ranges and missing paths',async()=>{
 const {get}=await fixture();
 for(const [path,body] of [['/','HOME'],['/book','PAGE'],['/book/','INDEX']])assert.equal((await get(path)).body,body);
 assert.equal((await get('/runtime.js')).headers['content-type'],'text/javascript; charset=utf-8');assert.equal((await get('/runtime.wasm')).headers['content-type'],'application/wasm');assert.equal((await get('/runtime.data')).headers['content-type'],'application/octet-stream');
 const head=await get('/runtime.data',{},'HEAD');assert.equal(head.body,'');assert.equal(head.headers['content-length'],'10');
 for(const [range,body]of [['bytes=2-4','234'],['bytes=7-','789'],['bytes=-3','789']]){const res=await get('/runtime.data',{range});assert.equal(res.status,206);assert.equal(res.body,body);}
 for(const range of ['bytes=99-','bytes=3-1','bytes=0-1,3-4','bytes=-0','bad'])assert.equal((await get('/runtime.data',{range})).status,416);
 assert.equal((await get('/missing')).status,404);assert.equal((await get('/',{},'POST')).status,405);
});
test('alternate origin accepts only a distinct approved HTTPS origin',()=>{
 const base={KNOLSTORY_STATIC_ROOT:'/tmp/web'};
 assert.equal(loadProductionIngressConfig({...base,KNOLSTORY_REDIRECT_FROM_ORIGIN:''}).redirectFromOrigin,undefined);
 assert.equal(loadProductionIngressConfig({...base,KNOLSTORY_REDIRECT_FROM_ORIGIN:'https://story-next.knolquiz.com'}).redirectFromOrigin,'https://story-next.knolquiz.com');
 for(const origin of ['https://story.knolquiz.com','http://story-next.knolquiz.com','https://evil.test','https://story-next.knolquiz.com/path','https://story-next.knolquiz.com:443','https://user@story-next.knolquiz.com'])assert.throws(()=>loadProductionIngressConfig({...base,KNOLSTORY_REDIRECT_FROM_ORIGIN:origin}));
});
test('alternate host redirects safe GET and HEAD to canonical origin without forwarding writes',async()=>{
 let apiRequests=0;
 const {get}=await fixture({config:{redirectFromOrigin:'https://story-next.knolquiz.com'},api:(_req,res)=>{apiRequests++;res.end('API');}});
 for(const method of ['GET','HEAD']){
  const response=await get('/book/%ED%95%9C?next=https%3A%2F%2Fevil.test&x=1',{host:'story-next.knolquiz.com'},method);
  assert.equal(response.status,308);assert.equal(response.headers.location,'https://story.knolquiz.com/book/%ED%95%9C?next=https%3A%2F%2Fevil.test&x=1');assert.equal(response.headers['cache-control'],'no-store');assert.equal(response.body,'');
 }
 for(const method of ['POST','PUT','DELETE'])assert.equal((await get('/api/v1/auth/logout',{host:'story-next.knolquiz.com'},method)).status,400);
 for(const path of ['//evil.test/','/%2f%2fevil.test','/../evil','/%0d%0aLocation:evil'])assert.equal((await get(path,{host:'story-next.knolquiz.com'})).status,400);
 assert.equal((await get('/',{host:'story-next.knolquiz.com:443'})).status,400);
 assert.equal((await get('/')).body,'HOME');assert.equal(apiRequests,0);
});
test('host, traversal, encoded separators, hidden files and symlinks fail closed',async()=>{
 const {get}=await fixture();assert.equal((await get('/',{host:'evil.test'})).status,400);
 for(const path of ['//evil','/../etc/passwd','/%2e%2e/etc/passwd','/%2fetc/passwd','/%5cetc','/%00','/%ZZ','/.env','/escape','/loop/index.html'])assert.ok([400,404].includes((await get(path)).status),path);
});
test('API preserves streaming status, cookies and security headers while stripping proxy headers',async()=>{
 let received;
 const {get}=await fixture({api:(req,res)=>{received=req.headers;res.writeHead(429,{'X-Request-Id':'observed-id','Retry-After':'5','Cache-Control':'no-store','Set-Cookie':'sid=test; Secure; HttpOnly',Connection:'x-hop','x-hop':'secret'});res.write('first');setTimeout(()=>res.end('second'),10);}});
 const res=await get('/api/v1/auth/me',{origin:'https://story.knolquiz.com',cookie:'sid=private',forwarded:'evil','x-forwarded-for':'evil',connection:'x-strip','x-strip':'evil'});
 assert.equal(res.status,429);assert.equal(res.body,'firstsecond');assert.equal(res.headers['x-request-id'],'observed-id');assert.equal(res.headers['retry-after'],'5');assert.equal(res.headers['cache-control'],'no-store');assert.ok(res.headers['set-cookie'][0].includes('Secure'));assert.equal(res.headers['x-hop'],undefined);
 assert.equal(received.host,'story.knolquiz.com');assert.equal(received.origin,'https://story.knolquiz.com');assert.equal(received.cookie,'sid=private');for(const name of ['forwarded','x-forwarded-for','x-strip'])assert.equal(received[name],undefined);
});
test('API unavailable and timeout fail closed without fabricated observation',async()=>{
 const {get,api}=await fixture();await new Promise(resolve=>api.close(resolve));assert.equal((await get('/api/v1/test')).status,502);
 const stalled=await fixture({api:()=>{},config:{timeoutMs:20}});const res=await stalled.get('/api/v1/test');assert.equal(res.status,504);assert.equal(res.headers['x-request-id'],undefined);
});
test('partial upstream response is terminated and cannot become success',async()=>{
 const {get}=await fixture({api:(_req,res)=>{res.writeHead(200);res.write('partial');setTimeout(()=>res.destroy(),10);}});
 await assert.rejects(()=>get('/api/v1/test'));
});

test('CLI starts on explicit loopback, rejects upgrades, and shuts down on signal',async()=>{
 const {root}=await fixture();
 const child=spawn(process.execPath,['server/operations/production-ingress.mjs'],{env:{...process.env,KNOLSTORY_STATIC_ROOT:root,KNOLSTORY_INGRESS_PORT:'0'}});
 const [invalidCode]=await once(child,'exit');assert.equal(invalidCode,1);
 const reserve=createServer();await new Promise(resolve=>reserve.listen(0,'127.0.0.1',resolve));const port=reserve.address().port;await new Promise(resolve=>reserve.close(resolve));
 const live=spawn(process.execPath,['server/operations/production-ingress.mjs'],{env:{...process.env,KNOLSTORY_STATIC_ROOT:root,KNOLSTORY_INGRESS_PORT:String(port)}});
 cleanups.push(async()=>{if(live.exitCode===null){live.kill('SIGKILL');await once(live,'exit');}});
 await once(live.stdout,'data');
 const status=await new Promise((resolve,reject)=>{const req=request({host:'127.0.0.1',port,path:'/_next/hmr',headers:{host:'story.knolquiz.com',Connection:'Upgrade',Upgrade:'websocket'}},res=>{res.resume();resolve(res.statusCode);});req.on('error',reject);req.end();});assert.equal(status,400);
 const exited=once(live,'exit');live.kill('SIGTERM');assert.equal((await exited)[0],0);
});
