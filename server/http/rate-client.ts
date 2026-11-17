import type {IncomingMessage} from 'node:http';
import {isIP} from 'node:net';
import {CLIENT_BUCKET_HEADER,createClientBucketVerifier} from './client-bucket-proof.mjs';

/** A signed value chooses a rate bucket only. Session and CSRF checks remain mandatory. */
/** Set only by the production ingress, which strips any client-sent copy. */
export const CLIENT_IP_HEADER='x-knolstory-client-ip';
export function createRateClientResolver(options:Readonly<{origin:string;key?:string;clock?:()=>number;trustClientIp?:boolean}>){
 const verify=options.key===undefined?undefined:createClientBucketVerifier({key:options.key,origin:options.origin,clock:options.clock});
 return (req:IncomingMessage):string|null=>{
  if(!verify){
   if(options.trustClientIp){
    const values=req.rawHeaders.filter((value,index)=>index%2===0&&value.toLowerCase()===CLIENT_IP_HEADER),ip=req.headers[CLIENT_IP_HEADER];
    if(values.length===1&&typeof ip==='string'&&isIP(ip))return 'ip:'+ip;
   }
   return 'socket:'+(req.socket.remoteAddress??'unknown');
  }
  const duplicates=req.rawHeaders.filter((value,index)=>index%2===0&&value.toLowerCase()===CLIENT_BUCKET_HEADER).length;
  if(duplicates>1)return null;
  const bucket=verify(req);
  return bucket===null?null:'proof:'+bucket;
 };
}
