import {createServer} from 'node:http';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {createClientBucketSigner} from '../http/client-bucket-proof.mjs';
import {validateProtectedSocket,listenProtectedSocket} from './trusted-ingress-socket.mjs';
import {proxyIngressRequest} from './production-ingress.mjs';

const invalid=()=>Error('Invalid client proof gateway configuration.');
function publicUrl(value){
 const url=new URL(value);
 if(!/^https:\/\/story(?:-[a-z0-9]+(?:-[a-z0-9]+)*)?\.knolquiz\.com$/.test(value)||url.origin!==value)throw invalid();
 return url;
}
function validate(input){
 try{
  const config={...input},upstream=new URL(config.upstreamOrigin);
  publicUrl(config.origin);
  if(config.aliasOrigin!==undefined&&(publicUrl(config.aliasOrigin).origin===config.origin))throw invalid();
  if(upstream.protocol!=='http:'||upstream.hostname!=='127.0.0.1'||upstream.origin!==config.upstreamOrigin||upstream.username||upstream.password||!upstream.port)throw invalid();
  if(typeof config.socketPath!=='string'||!/^[a-f0-9]{64}$/.test(config.key??'')||!Number.isSafeInteger(config.timeoutMs??30000)||(config.timeoutMs??30000)<1||(config.timeoutMs??30000)>300000)throw invalid();
  return config;
 }catch{throw invalid();}
}
export function loadClientProofGatewayConfig(env=process.env,read=path=>readFileSync(path,'utf8')){
 try{
  if(!env.KNOLSTORY_INGRESS_SOCKET||!env.KNOLSTORY_CLIENT_PROOF_KEY_FILE)throw invalid();
  return validate({socketPath:env.KNOLSTORY_INGRESS_SOCKET,key:read(env.KNOLSTORY_CLIENT_PROOF_KEY_FILE).trim(),origin:env.KNOLSTORY_PUBLIC_ORIGIN??'https://story.knolquiz.com',aliasOrigin:env.KNOLSTORY_REDIRECT_FROM_ORIGIN===''?undefined:env.KNOLSTORY_REDIRECT_FROM_ORIGIN??'https://story-next.knolquiz.com',upstreamOrigin:env.KNOLSTORY_PROOF_GATEWAY_ORIGIN??'http://127.0.0.1:15501',timeoutMs:30000});
 }catch{throw invalid();}
}
const reject=(res,status)=>{res.writeHead(status,{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end();};
function validTarget(raw){
 if(typeof raw!=='string'||raw.length>8192||!raw.startsWith('/')||raw.startsWith('//'))return false;
 try{return !/[\x00-\x1f\x7f\\]/.test(decodeURIComponent(raw));}catch{return false;}
}
/** Native-host UDS boundary. All bodies stream to the same Docker ingress build. */
export async function createClientProofGateway(input){
 const config=validate(input),canonical=publicUrl(config.origin).host;
 await validateProtectedSocket(config.socketPath);
 const alias=config.aliasOrigin===undefined?undefined:publicUrl(config.aliasOrigin).host;
 const upstream=new URL(config.upstreamOrigin),sign=createClientBucketSigner({key:config.key,origin:config.origin});
 const server=createServer((req,res)=>{
  if(server.address()!==config.socketPath){reject(res,503);return;}
  const host=req.headers.host;
  const hosts=req.rawHeaders.filter((value,index)=>index%2===0&&value.toLowerCase()==='host');
  if(hosts.length!==1||(host!==canonical&&host!==alias)||!validTarget(req.url)){reject(res,400);return;}
  let proof;
  if(host===canonical&&req.url.startsWith('/api/')){
   const values=req.rawHeaders.filter((value,index)=>index%2===0&&value.toLowerCase()==='cf-connecting-ip');
   if(values.length!==1||typeof req.headers['cf-connecting-ip']!=='string'){reject(res,400);return;}
   try{proof=sign(req,req.headers['cf-connecting-ip']);}catch{reject(res,400);return;}
  }
  // The streaming helper removes any inherited/response proof. Alias Host stays intact.
  proxyIngressRequest(req,res,upstream,host,config.timeoutMs??30000,proof);
 });
 server.headersTimeout=10000;server.requestTimeout=300000;server.maxHeadersCount=100;
 server.on('upgrade',(_req,socket)=>socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\nContent-Length: 0\r\n\r\n'));
 return server;
}
export async function listenClientProofGateway(server,config){await listenProtectedSocket(server,config.socketPath);}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{
  const config=loadClientProofGatewayConfig(),server=await createClientProofGateway(config);
  server.on('error',()=>{console.error('Client proof gateway listener failed.');process.exitCode=1;});
  await listenClientProofGateway(server,config);
  let stopping=false;
  const stop=()=>{if(stopping)return;stopping=true;server.close(()=>process.exit(0));server.closeIdleConnections();setTimeout(()=>{server.closeAllConnections();process.exit(1);},10000).unref();};
  process.once('SIGTERM',stop);process.once('SIGINT',stop);
  console.info('Client proof gateway listening.');
 }catch{console.error('Invalid client proof gateway configuration.');process.exitCode=1;}
}
