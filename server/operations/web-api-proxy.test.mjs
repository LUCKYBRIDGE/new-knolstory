import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer,request} from 'node:http';
import {once} from 'node:events';
import {createWebApiProxy,loadProxyConfig} from './web-api-proxy.mjs';
async function listen(server){server.listen(0,'127.0.0.1');await once(server,'listening');return server.address().port;}
async function gateway(config){const reservation=createServer();const port=await listen(reservation);await close(reservation);const proxy=createWebApiProxy({...config,publicOrigin:`http://127.0.0.1:${port}`});proxy.listen(port,'127.0.0.1');await once(proxy,'listening');return {proxy,port};}
async function close(server){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
test('rejects unsafe ports and permits only local targets',()=>{
 assert.throws(()=>loadProxyConfig({KNOLSTORY_API_PORT:'0'}));
 assert.throws(()=>loadProxyConfig({KNOLSTORY_WEB_PORT:'65536'}));
 assert.throws(()=>createWebApiProxy({apiOrigin:'http://example.com:15400',webOrigin:'http://127.0.0.1:3000',publicOrigin:'http://127.0.0.1:15401'}));
});
test('streams same-origin API cookies/CSRF/redirect and large Web files',async()=>{
 let received;const api=createServer((req,res)=>{let body='';req.on('data',chunk=>body+=chunk);req.on('end',()=>{received={headers:req.headers,body};res.writeHead(302,{'Location':`http://${req.headers.host}/account`,'Set-Cookie':['session=abc; HttpOnly; SameSite=Lax','flow=xyz; HttpOnly'],'Connection':'close, x-private','x-private':'must-strip'});res.end();});});
 const size=8*1024*1024;const web=createServer((_req,res)=>{res.writeHead(200,{'content-type':'application/octet-stream'});const chunk=Buffer.alloc(65536,71);let remaining=size;function write(){while(remaining){remaining-=chunk.length;if(!res.write(chunk)){res.once('drain',write);return;}}res.end();}write();});
 const apiPort=await listen(api),webPort=await listen(web);const {proxy,port}=await gateway({apiOrigin:`http://127.0.0.1:${apiPort}`,webOrigin:`http://127.0.0.1:${webPort}`,timeoutMs:5000});

 try{
  const response=await fetch(`http://127.0.0.1:${port}/api/v1/auth/google/link/start`,{method:'POST',redirect:'manual',headers:{Origin:`http://127.0.0.1:${port}`,Cookie:'session=abc','x-csrf-token':'csrf'},body:'payload'});
  assert.equal(response.status,302);assert.equal(response.headers.get('location'),`http://127.0.0.1:${port}/account`);assert.equal(response.headers.getSetCookie().length,2);assert.equal(response.headers.get('x-private'),null);
  assert.equal(received.headers.host,`127.0.0.1:${port}`);assert.equal(received.headers.origin,`http://127.0.0.1:${port}`);assert.equal(received.headers.cookie,'session=abc');assert.equal(received.headers['x-csrf-token'],'csrf');assert.equal(received.body,'payload');
  const file=await fetch(`http://127.0.0.1:${port}/runtime/large.wasm`);let bytes=0;for await(const chunk of file.body){bytes+=chunk.length;assert.ok(chunk.every(value=>value===71));}assert.equal(bytes,size);
 }finally{await Promise.all([close(proxy),close(api),close(web)]);}
});
test('upstream inactivity returns sanitized timeout',async()=>{
 const upstream=createServer(()=>{});const port=await listen(upstream);const {proxy,port:proxyPort}=await gateway({apiOrigin:`http://127.0.0.1:${port}`,webOrigin:`http://127.0.0.1:${port}`,timeoutMs:30});
 try{const response=await fetch(`http://127.0.0.1:${proxyPort}/api/pending?private=secret`);assert.equal(response.status,504);assert.equal((await response.json()).error.code,'UPSTREAM_TIMEOUT');}finally{await Promise.all([close(proxy),close(upstream)]);}
});

test('preserves API request IDs, errors and limits without trusting forwarding headers',async()=>{
 const observed=[];let status=401;
 const api=createServer((req,res)=>{observed.push(req.headers);res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Request-Id':'ca912310-1578-4e55-8157-5028693ef712','Retry-After':'60'});res.end(JSON.stringify({success:false,error:{code:status===429?'RATE_LIMITED':status===503?'AUTH_PROVIDER_NOT_CONFIGURED':'SESSION_REQUIRED'}}));});
 const apiPort=await listen(api),{proxy,port}=await gateway({apiOrigin:`http://127.0.0.1:${apiPort}`,webOrigin:`http://127.0.0.1:${apiPort}`});
 try{for(const code of [401,429,503]){status=code;const response=await fetch(`http://127.0.0.1:${port}/api/v1/documents`,{headers:{'X-Request-Id':'untrusted-client-id','X-Forwarded-For':'203.0.113.44',Forwarded:'for=203.0.113.44'}});assert.equal(response.status,code);assert.equal(response.headers.get('x-request-id'),'ca912310-1578-4e55-8157-5028693ef712');assert.equal(response.headers.get('retry-after'),'60');assert.equal(response.headers.get('cache-control'),'no-store');assert.deepEqual(await response.json(),{success:false,error:{code:code===429?'RATE_LIMITED':code===503?'AUTH_PROVIDER_NOT_CONFIGURED':'SESSION_REQUIRED'}});}
  for(const headers of observed){assert.equal(headers['x-forwarded-for'],undefined);assert.equal(headers.forwarded,undefined);}
 }finally{await Promise.all([close(proxy),close(api)]);}
});

test('an unavailable API returns only the fixed gateway error and never a forged request ID',async()=>{
 const reservation=createServer();const unavailablePort=await listen(reservation);await close(reservation);
 const {proxy,port}=await gateway({apiOrigin:`http://127.0.0.1:${unavailablePort}`,webOrigin:`http://127.0.0.1:${unavailablePort}`});
 try{const response=await fetch(`http://127.0.0.1:${port}/api/v1/documents?private=unlogged`,{headers:{'X-Request-Id':'forged-id'}});assert.equal(response.status,502);assert.equal(response.headers.get('x-request-id'),null);assert.deepEqual(await response.json(),{success:false,error:{code:'UPSTREAM_UNAVAILABLE'}});assert.equal(response.headers.get('cache-control'),'no-store');}finally{await close(proxy);}
});

test('rejects hostile Host before forwarding any request',async()=>{
 let forwarded=false;const upstream=createServer((_req,res)=>{forwarded=true;res.end('unexpected');});const upstreamPort=await listen(upstream);const {proxy,port}=await gateway({apiOrigin:`http://127.0.0.1:${upstreamPort}`,webOrigin:`http://127.0.0.1:${upstreamPort}`});
 try{const status=await new Promise((resolve,reject)=>{const req=request({hostname:'127.0.0.1',port,path:'/',headers:{Host:'attacker.example'}},res=>{res.resume();resolve(res.statusCode);});req.on('error',reject);req.end();});assert.equal(status,400);assert.equal(forwarded,false);}finally{await Promise.all([close(proxy),close(upstream)]);}
});

test('proxies only same-origin Next HMR websocket upgrades with bidirectional bytes',async()=>{
 const web=createServer();let upgraded=0,upstreamHost,upstreamOrigin;const sockets=new Set();
 web.on('upgrade',(req,socket,head)=>{upgraded++;upstreamHost=req.headers.host;upstreamOrigin=req.headers.origin;sockets.add(socket);socket.on('close',()=>sockets.delete(socket));socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n\r\n');if(head.length)socket.write(head);socket.pipe(socket);});
 const webPort=await listen(web),{proxy,port}=await gateway({apiOrigin:`http://127.0.0.1:${webPort}`,webOrigin:`http://127.0.0.1:${webPort}`});
 async function handshake(path,host=`127.0.0.1:${port}`){return new Promise((resolve,reject)=>{const req=request({hostname:'127.0.0.1',port,path,headers:{Host:host,Origin:`http://127.0.0.1:${port}`,Connection:'Upgrade',Upgrade:'websocket','Sec-WebSocket-Key':'YWJjZA==','Sec-WebSocket-Version':'13'}});req.setTimeout(500,()=>req.destroy(Error('Upgrade timed out')));req.on('upgrade',(res,socket)=>resolve({status:res.statusCode,socket}));req.on('response',res=>{res.resume();resolve({status:res.statusCode});});req.on('error',reject);req.end();});}
 try{
  const connection=await handshake('/_next/hmr?id=local');assert.equal(connection.status,101);const received=once(connection.socket,'data');connection.socket.write('ping-frame');assert.equal((await received)[0].toString(),'ping-frame');connection.socket.destroy();
  assert.equal(upstreamHost,`127.0.0.1:${port}`);assert.equal(upstreamOrigin,`http://127.0.0.1:${port}`);
  assert.equal((await handshake('/api/v1/auth/kakao/start')).status,400);assert.equal((await handshake('/_next/hmr','attacker.example')).status,400);assert.equal(upgraded,1);
 }finally{for(const socket of sockets)socket.destroy();await Promise.all([close(proxy),close(web)]);}
});

test('handles client reset while upstream websocket handshake is pending',async()=>{
 const web=createServer();const sockets=new Set();web.on('upgrade',(_req,socket)=>{sockets.add(socket);socket.on('close',()=>sockets.delete(socket));socket.on('error',()=>{});socket.on('end',()=>socket.destroy());socket.resume();setTimeout(()=>{if(!socket.destroyed)socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n\r\n');},40);});
 const webPort=await listen(web),{proxy,port}=await gateway({apiOrigin:`http://127.0.0.1:${webPort}`,webOrigin:`http://127.0.0.1:${webPort}`,timeoutMs:100});
 proxy.on('upgrade',(_req,socket)=>{setTimeout(()=>socket.emit('error',Error('simulated-client-reset')),5);});
 const req=request({hostname:'127.0.0.1',port,path:'/_next/hmr',headers:{Host:`127.0.0.1:${port}`,Origin:`http://127.0.0.1:${port}`,Connection:'Upgrade',Upgrade:'websocket'}});req.on('error',()=>{});req.on('response',res=>res.resume());req.on('upgrade',(_res,socket)=>socket.destroy());req.end();
 try{const deadline=Date.now()+1000;do{await new Promise(resolve=>setTimeout(resolve,10));}while(sockets.size>0&&Date.now()<deadline);assert.equal(sockets.size,0);}finally{req.destroy();for(const socket of sockets)socket.destroy();await Promise.all([close(proxy),close(web)]);}
});
