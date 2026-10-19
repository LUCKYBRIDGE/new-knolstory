import {createServer,request} from 'node:http';
import {open,lstat,realpath} from 'node:fs/promises';
import {isAbsolute,join,resolve} from 'node:path';
import {pipeline} from 'node:stream';
import {pathToFileURL} from 'node:url';

const hopHeaders=['connection','keep-alive','proxy-authenticate','proxy-authorization','te','trailer','transfer-encoding','upgrade'];
const mediaTypes={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.wasm':'application/wasm','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.ico':'image/x-icon','.ogg':'audio/ogg','.mp3':'audio/mpeg','.wav':'audio/wav','.woff2':'font/woff2','.ttf':'font/ttf','.txt':'text/plain; charset=utf-8','.webm':'video/webm','.mp4':'video/mp4'};
function cleanHeaders(input){
 const nominated=String(input.connection??'').split(',').map(value=>value.trim().toLowerCase());
 return Object.fromEntries(Object.entries(input).filter(([name])=>!hopHeaders.includes(name)&&!nominated.includes(name)&&!name.startsWith('x-forwarded-')&&name!=='forwarded'));
}
function validateOrigin(value,api=false){
 const url=new URL(value);
 const valid=api?url.protocol==='http:'&&['127.0.0.1','[::1]','api'].includes(url.hostname):url.protocol==='https:'&&/^story(?:-[a-z0-9]+(?:-[a-z0-9]+)*)?\.knolquiz\.com$/.test(url.hostname)&&url.port==='';
 if(!valid||url.origin!==value||url.username||url.password)throw Error('Invalid production ingress origin.');
 return url;
}
function validateConfig(config){
 validateOrigin(config.publicOrigin);validateOrigin(config.apiOrigin,true);
 if(config.redirectFromOrigin!==undefined){
  validateOrigin(config.redirectFromOrigin);
  if(config.redirectFromOrigin===config.publicOrigin)throw Error('Invalid production ingress redirect origin.');
 }
 if(!isAbsolute(config.staticRoot)||!['127.0.0.1','0.0.0.0'].includes(config.host??'127.0.0.1')||!Number.isSafeInteger(config.timeoutMs??30000)||(config.timeoutMs??30000)<1||(config.timeoutMs??30000)>300000)throw Error('Invalid production ingress configuration.');
 return config;
}
export function loadProductionIngressConfig(env=process.env){
 const port=Number(env.KNOLSTORY_INGRESS_PORT??15501);
 if(!Number.isSafeInteger(port)||port<1||port>65535||!/^\d+$/.test(env.KNOLSTORY_INGRESS_PORT??'15501')||!env.KNOLSTORY_STATIC_ROOT)throw Error('Invalid production ingress configuration.');
 return validateConfig({port,host:env.KNOLSTORY_INGRESS_HOST??'127.0.0.1',staticRoot:env.KNOLSTORY_STATIC_ROOT,publicOrigin:env.KNOLSTORY_PUBLIC_ORIGIN??'https://story.knolquiz.com',apiOrigin:env.KNOLSTORY_API_ORIGIN??'http://127.0.0.1:15400',timeoutMs:30000,...(env.KNOLSTORY_REDIRECT_FROM_ORIGIN===undefined||env.KNOLSTORY_REDIRECT_FROM_ORIGIN===''?{}:{redirectFromOrigin:env.KNOLSTORY_REDIRECT_FROM_ORIGIN})});
}
function reject(res,status,headers={}){res.writeHead(status,{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers});res.end();}
function safePath(raw){
 const pathname=raw.split('?')[0];
 if(/%(?:2f|5c)/i.test(pathname))return null;
 let decoded;try{decoded=decodeURIComponent(pathname);}catch{return null;}
 if(/[\x00-\x1f\x7f\\]/.test(decoded)||decoded.split('/').some(part=>part.startsWith('.')&&part!==''))return null;
 return decoded;
}
async function openStatic(root,pathname){
 const segments=pathname.split('/').filter(Boolean);
 // The export is mounted read-only in production. Reject symlinks at every path
 // component, including links inside the export pointing back into it.
 for(let index=0;index<segments.length;index++){
  try{if((await lstat(join(root,...segments.slice(0,index+1)))).isSymbolicLink())return null;}
  catch(error){if(error.code==='ENOENT'||error.code==='ENOTDIR')break;throw error;}
 }
 const base=join(root,...segments);
 const candidates=pathname.endsWith('/')?[join(base,'index.html')]:[base,`${base}.html`,join(base,'index.html')];
 for(const candidate of candidates){
  let file;
  try{
   if(!(await lstat(candidate)).isFile())continue;
   file=await open(candidate,'r');
   const stat=await file.stat();
   return {file,stat,path:candidate};
  }catch(error){await file?.close();if(!['ENOENT','ENOTDIR'].includes(error.code))throw error;}
 }
 return null;
}
function parseRange(value,size){
 const match=/^bytes=(\d*)-(\d*)$/.exec(value);
 if(!match||(!match[1]&&!match[2])||size===0)return null;
 let start=match[1]?Number(match[1]):Math.max(0,size-Number(match[2]));
 const end=match[1]&&match[2]?Math.min(size-1,Number(match[2])):size-1;
 if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=size)return null;
 return {start,end};
}
async function serveStatic(req,res,root,pathname){
 if(!['GET','HEAD'].includes(req.method)){reject(res,405,{Allow:'GET, HEAD'});return;}
 let opened;
 try{
  opened=await openStatic(root,pathname);
  if(!opened){reject(res,404);return;}
  if(res.destroyed){await opened.file.close();return;}
  const {size}=opened.stat;
  const range=req.headers.range?parseRange(req.headers.range,size):{start:0,end:size-1};
  if(!range){await opened.file.close();reject(res,416,{'Content-Range':`bytes */${size}`});return;}
  const extension=/\.[^.\/]+$/.exec(opened.path)?.[0]??'';
  const headers={'Content-Type':mediaTypes[extension]??'application/octet-stream','Content-Length':req.headers.range?range.end-range.start+1:size,'Accept-Ranges':'bytes','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'};
  if(req.headers.range)headers['Content-Range']=`bytes ${range.start}-${range.end}/${size}`;
  res.writeHead(req.headers.range?206:200,headers);
  if(req.method==='HEAD'||size===0){await opened.file.close();res.end();return;}
  pipeline(opened.file.createReadStream(range),res,()=>{});
 }catch{
  await opened?.file.close().catch(()=>{});
  if(res.headersSent)res.destroy();else reject(res,500);
 }
}
function proxyApi(req,res,api,publicHost,timeoutMs){
 let timedOut=false;
 const fail=()=>{if(res.destroyed||res.writableEnded)return;if(res.headersSent){res.destroy();return;}reject(res,timedOut?504:502);};
 const upstream=request({hostname:api.hostname.replace(/^\[|\]$/g,''),port:api.port||80,path:req.url,method:req.method,headers:{...cleanHeaders(req.headers),host:publicHost}},response=>{
  res.writeHead(response.statusCode??502,cleanHeaders(response.headers));
  pipeline(response,res,error=>{if(error)upstream.destroy();});
 });
 upstream.setTimeout(timeoutMs,()=>{timedOut=true;upstream.destroy();fail();});
 upstream.on('error',fail);req.on('aborted',()=>upstream.destroy());res.on('close',()=>{if(!res.writableFinished)upstream.destroy();});
 pipeline(req,upstream,error=>{if(error)fail();});
}
/** Trusted immutable static export plus streaming same-origin API ingress. */
export async function createProductionIngress(config){
 validateConfig(config);
 const root=resolve(config.staticRoot);
 if(await realpath(root)!==root||(await lstat(root)).isSymbolicLink()||!(await lstat(join(root,'index.html'))).isFile())throw Error('Invalid production static export.');
 const publicOrigin=validateOrigin(config.publicOrigin),api=validateOrigin(config.apiOrigin,true);
 const redirectHost=config.redirectFromOrigin===undefined?undefined:validateOrigin(config.redirectFromOrigin).host;
 const server=createServer((req,res)=>{
  if((req.headers.host!==publicOrigin.host&&(!redirectHost||req.headers.host!==redirectHost))||!req.url?.startsWith('/')||req.url.startsWith('//')||req.url.length>8192){reject(res,400);return;}
  const pathname=safePath(req.url);
  if(pathname===null){reject(res,400);return;}
  if(redirectHost&&req.headers.host===redirectHost){
   if(!['GET','HEAD'].includes(req.method)){reject(res,400);return;}
   reject(res,308,{Location:`${publicOrigin.origin}${req.url}`});return;
  }
  if(pathname.startsWith('/api/')){
   // Encoded route names cannot bypass the API/static boundary.
   if(!req.url.startsWith('/api/')){reject(res,400);return;}
   proxyApi(req,res,api,publicOrigin.host,config.timeoutMs??30000);
  }else void serveStatic(req,res,root,pathname);
 });
 server.on('upgrade',(_req,socket)=>socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\nContent-Length: 0\r\n\r\n'));
 server.headersTimeout=10000;server.requestTimeout=300000;server.maxHeadersCount=100;
 return server;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{
  const config=loadProductionIngressConfig(),server=await createProductionIngress(config);
  server.on('error',()=>{console.error('Production ingress listener failed.');process.exitCode=1;});
  server.listen(config.port,config.host,()=>console.info('Production ingress listening.'));
  let stopping=false;
  const stop=()=>{if(stopping)return;stopping=true;server.close(()=>process.exit(0));server.closeIdleConnections();setTimeout(()=>{server.closeAllConnections();process.exit(1);},10000).unref();};
  process.once('SIGTERM',stop);process.once('SIGINT',stop);
 }catch{console.error('Invalid production ingress configuration.');process.exitCode=1;}
}
