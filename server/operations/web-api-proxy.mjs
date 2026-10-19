import {createServer,request} from 'node:http';
import {pipeline} from 'node:stream';
import {pathToFileURL} from 'node:url';
const hopHeaders=['connection','keep-alive','proxy-authenticate','proxy-authorization','te','trailer','transfer-encoding','upgrade'];
function headers(input){
 const nominated=String(input.connection??'').split(',').map(value=>value.trim().toLowerCase());
 return Object.fromEntries(Object.entries(input).filter(([name])=>!hopHeaders.includes(name)&&!nominated.includes(name)&&!name.startsWith('x-forwarded-')&&name!=='forwarded'));
}
function port(value,fallback){const number=value===undefined?fallback:Number(value);if(!Number.isSafeInteger(number)||number<1||number>65535||value!==undefined&&!/^\d+$/.test(value))throw Error('Invalid local gateway configuration.');return number;}
function loopbackOrigin(value){
 let url;try{url=new URL(value);}catch{throw Error('Invalid local gateway configuration.');}
 if(url.origin!==value||url.protocol!=='http:'||!['127.0.0.1','[::1]'].includes(url.hostname)||url.username||url.password)throw Error('Invalid local gateway configuration.');
 return url;
}
export function loadProxyConfig(env=process.env){
 const gatewayPort=port(env.KNOLSTORY_GATEWAY_PORT,15401),apiPort=port(env.KNOLSTORY_API_PORT,15400),webPort=port(env.KNOLSTORY_WEB_PORT,3000);
 if(new Set([gatewayPort,apiPort,webPort]).size!==3)throw Error('Local gateway ports must differ.');
 return {port:gatewayPort,publicOrigin:`http://127.0.0.1:${gatewayPort}`,apiOrigin:`http://127.0.0.1:${apiPort}`,webOrigin:`http://127.0.0.1:${webPort}`,timeoutMs:30000};
}
/** Local development only. Never buffer Ren'Py runtime downloads or upload bodies. */
export function createWebApiProxy(config){
 const api=loopbackOrigin(config.apiOrigin),web=loopbackOrigin(config.webOrigin),publicOrigin=loopbackOrigin(config.publicOrigin),timeoutMs=config.timeoutMs??30000;
 if(!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>300000)throw Error('Invalid local gateway configuration.');
 const server=createServer((incoming,outgoing)=>{
  let upstream,timedOut=false;
  const fail=()=>{
   if(outgoing.destroyed||outgoing.writableEnded)return;
   if(outgoing.headersSent){outgoing.destroy();return;}
   outgoing.writeHead(timedOut?504:502,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});
   outgoing.end(JSON.stringify({success:false,error:{code:timedOut?'UPSTREAM_TIMEOUT':'UPSTREAM_UNAVAILABLE'}}));
  };
  if(incoming.headers.host!==publicOrigin.host||!incoming.url||!incoming.url.startsWith('/')||incoming.url.startsWith('//')||incoming.url.length>8192){outgoing.writeHead(400);outgoing.end();return;}
  const target=incoming.url.startsWith('/api/')?api:web;
  upstream=request({hostname:target.hostname.replace(/^\[|\]$/g,''),port:target.port||80,path:incoming.url,method:incoming.method,headers:{...headers(incoming.headers),host:publicOrigin.host}},response=>{
   outgoing.writeHead(response.statusCode??502,headers(response.headers));
   pipeline(response,outgoing,error=>{if(error)upstream.destroy();});
  });
  upstream.setTimeout(timeoutMs,()=>{timedOut=true;upstream.destroy();fail();});
  upstream.on('error',fail);
  incoming.on('aborted',()=>upstream.destroy());
  outgoing.on('close',()=>{if(!outgoing.writableFinished)upstream.destroy();});
  pipeline(incoming,upstream,error=>{if(error)fail();});
 });
 const tunnels=new Set();
 server.on('upgrade',(incoming,socket,head)=>{
  let pending;
  socket.on('error',()=>{pending?.destroy();socket.destroy();});
  socket.on('close',()=>pending?.destroy());
  const reject=(status)=>{if(!socket.destroyed)socket.end(`HTTP/1.1 ${status} Gateway Rejected\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`);};
  let pathname;try{pathname=new URL(incoming.url,publicOrigin).pathname;}catch{reject(400);return;}
  if(incoming.headers.host!==publicOrigin.host||incoming.headers.origin!==publicOrigin.origin||incoming.method!=='GET'||!incoming.url?.startsWith('/')||incoming.url.startsWith('//')||incoming.url.length>8192||pathname!=='/_next/hmr'||incoming.headers.upgrade?.toLowerCase()!=='websocket'){reject(400);return;}
  pending=request({hostname:web.hostname.replace(/^\[|\]$/g,''),port:web.port||80,path:incoming.url,method:'GET',headers:{...headers(incoming.headers),host:publicOrigin.host,connection:'Upgrade',upgrade:'websocket'}});
  pending.setTimeout(timeoutMs,()=>{pending.destroy();reject(504);});
  pending.on('error',()=>reject(502));
  pending.on('response',response=>{response.resume();reject(502);});
  pending.on('upgrade',(response,upstream,upstreamHead)=>{
   pending.setTimeout(0);
   if(socket.destroyed){upstream.destroy();return;}
   if(response.statusCode!==101||response.headers.upgrade?.toLowerCase()!=='websocket'){upstream.destroy();reject(502);return;}
   tunnels.add(socket);tunnels.add(upstream);
   socket.on('close',()=>{tunnels.delete(socket);upstream.destroy();});upstream.on('close',()=>{tunnels.delete(upstream);socket.destroy();});
   socket.on('error',()=>upstream.destroy());upstream.on('error',()=>socket.destroy());
   const responseHeaders={...headers(response.headers),connection:'Upgrade',upgrade:'websocket'};
   socket.write('HTTP/1.1 101 Switching Protocols\r\n'+Object.entries(responseHeaders).flatMap(([key,value])=>(Array.isArray(value)?value:[value]).map(item=>`${key}: ${item}\r\n`)).join('')+'\r\n');
   if(upstreamHead.length)socket.write(upstreamHead);if(head.length)upstream.write(head);
   socket.pipe(upstream);upstream.pipe(socket);
  });
  pending.end();
 });
 const closeConnections=server.closeAllConnections.bind(server);
 server.closeAllConnections=()=>{for(const socket of tunnels)socket.destroy();closeConnections();};
 server.headersTimeout=10000;server.requestTimeout=300000;server.maxHeadersCount=100;
 return server;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{
  const config=loadProxyConfig(),server=createWebApiProxy(config);
  server.on('error',()=>{console.error('Local gateway listener failed.');process.exitCode=1;});
  server.listen(config.port,'127.0.0.1',()=>console.info(`Local gateway listening on ${config.publicOrigin}`));
  const stop=()=>{server.close(()=>process.exit(0));server.closeIdleConnections();setTimeout(()=>{server.closeAllConnections();process.exit(1);},10000).unref();};
  process.once('SIGTERM',stop);process.once('SIGINT',stop);
 }catch{console.error('Invalid local gateway configuration.');process.exitCode=1;}
}
