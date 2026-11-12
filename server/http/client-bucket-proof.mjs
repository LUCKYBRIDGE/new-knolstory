import {createHmac,timingSafeEqual} from 'node:crypto';
import {isIP} from 'node:net';

export const CLIENT_BUCKET_HEADER='x-knolstory-client-proof';
const identityDomain='knolstory-rate-client-identity-v1';
const proofDomain='knolstory-rate-client-proof-v1';
const maximumAgeMs=30_000,futureSkewMs=5000;

function configuration(options){
 try{
  const {key,origin,clock=Date.now}=options;
  if(typeof key!=='string'||!/^[a-f\d]{64}$/i.test(key)||typeof origin!=='string'||typeof clock!=='function')throw Error();
  const url=new URL(origin);
  if(url.protocol!=='https:'||url.origin!==origin||url.username||url.password)throw Error();
  return {key:Buffer.from(key,'hex'),origin,clock};
 }catch{throw Error('Invalid client bucket configuration.');}
}
function currentTime(clock){
 const now=clock();
 if(!Number.isSafeInteger(now)||now<0)throw Error();
 return now;
}
function requestTarget(request){
 const {method,url}=request;
 if(typeof method!=='string'||!/^[A-Z]{1,16}$/.test(method)||typeof url!=='string'||url.length>8192||!url.startsWith('/')||url.startsWith('//')||/[\x00-\x20\x7f\\#]/.test(url)||/%(?![a-f\d]{2})/i.test(url))throw Error();
 return [method,url];
}
function normalizedIp(ip){
 if(typeof ip!=='string'||ip.includes('%'))throw Error();
 const family=isIP(ip);
 if(family===4)return ip;
 if(family===6)return new URL(`http://[${ip}]`).hostname.slice(1,-1);
 throw Error();
}
const mac=(key,tuple)=>createHmac('sha256',key).update(JSON.stringify(tuple)).digest('hex');

/** Selects a rate bucket only. The caller must authenticate the IP's transport provenance. */
export function createClientBucketSigner(options){
 const config=configuration(options);
 return (request,ip)=>{
  try{
   const target=requestTarget(request),issued=String(currentTime(config.clock));
   const identity=mac(config.key,[identityDomain,config.origin,normalizedIp(ip)]);
   const signature=mac(config.key,[proofDomain,config.origin,issued,identity,...target]);
   return `v1.${issued}.${identity}.${signature}`;
  }catch{throw Error('Invalid client bucket input.');}
 };
}
/** This proof does not authenticate a session, authorize a request or bypass a rate limit.
 * Reusing a proof resolves the same stable bucket, including when its timestamp changes.
 * In opt-in API wiring, a null result must reject the request rather than trust IP headers.
 */
export function createClientBucketVerifier(options){
 const config=configuration(options);
 return request=>{
  try{
   const target=requestTarget(request),value=request.headers?.[CLIENT_BUCKET_HEADER];
   if(typeof value!=='string'||value.length>256)return null;
   const match=/^v1\.(0|[1-9]\d{0,15})\.([a-f\d]{64})\.([a-f\d]{64})$/.exec(value);
   if(!match)return null;
   const [,issued,identity,signature]=match,time=Number(issued),now=currentTime(config.clock);
   if(!Number.isSafeInteger(time)||now-time>maximumAgeMs||time-now>futureSkewMs)return null;
   const expected=mac(config.key,[proofDomain,config.origin,issued,identity,...target]);
   if(!timingSafeEqual(Buffer.from(signature,'hex'),Buffer.from(expected,'hex')))return null;
   return identity;
  }catch{return null;}
 };
}
