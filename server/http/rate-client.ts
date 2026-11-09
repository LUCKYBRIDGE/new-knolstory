import type {IncomingMessage} from 'node:http';
import {CLIENT_BUCKET_HEADER,createClientBucketVerifier} from './client-bucket-proof.mjs';

/** A signed value chooses a rate bucket only. Session and CSRF checks remain mandatory. */
export function createRateClientResolver(options:Readonly<{origin:string;key?:string;clock?:()=>number}>){
 const verify=options.key===undefined?undefined:createClientBucketVerifier({key:options.key,origin:options.origin,clock:options.clock});
 return (req:IncomingMessage):string|null=>{
  if(!verify)return 'socket:'+(req.socket.remoteAddress??'unknown');
  const duplicates=req.rawHeaders.filter((value,index)=>index%2===0&&value.toLowerCase()===CLIENT_BUCKET_HEADER).length;
  if(duplicates>1)return null;
  const bucket=verify(req);
  return bucket===null?null:'proof:'+bucket;
 };
}
