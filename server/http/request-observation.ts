import {randomUUID} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import type {IncomingMessage,ServerResponse} from 'node:http';

export type RequestObservation=Readonly<{
 event:'http_request';requestId:string;method:string;
 route:'auth'|'documents'|'health'|'unmatched';status:number;
 outcome:'completed'|'aborted';durationMs:number;
}>;
type Options=Readonly<{clock?:()=>number;onSinkFailure?:(message:string)=>void}>;
function family(raw:string|undefined):RequestObservation['route']{
 if(!raw||raw.length>8192||!raw.startsWith('/')||raw.startsWith('//'))return 'unmatched';
 const path=raw.split('?',1)[0]!;
 if(path==='/api/v1/auth'||path.startsWith('/api/v1/auth/'))return 'auth';
 if(path==='/api/v1/documents'||path.startsWith('/api/v1/documents/'))return 'documents';
 return path==='/health/live'||path==='/health/ready'?'health':'unmatched';
}
/** Synchronous, fixed-schema lifecycle observation; never consumes request bodies. */
export function observeRequest(req:IncomingMessage,res:ServerResponse,write:(record:RequestObservation)=>void,options:Options={}):void{
 const requestId=randomUUID(),clock=options.clock??(()=>performance.now()),started=clock();
 const method=['GET','POST','PUT','PATCH','DELETE','HEAD','OPTIONS'].includes(req.method??'')?req.method!:'OTHER',route=family(req.url);
 res.setHeader('X-Request-Id',requestId);let recorded=false;
 const finish=(outcome:RequestObservation['outcome'])=>{
  if(recorded)return;recorded=true;
  const elapsed=clock()-started,durationMs=Number.isFinite(elapsed)?Math.round(Math.max(0,elapsed)*1000)/1000:0;
  const status=Number.isInteger(res.statusCode)&&res.statusCode>=100&&res.statusCode<=599?res.statusCode:500;
  try{write({event:'http_request',requestId,method,route,status,outcome,durationMs});}
  catch{
   // Observation failure must not alter a completed response or crash the process.
   try{(options.onSinkFailure??console.error)('Request observation unavailable.');}catch{/* No sensitive exception data or recursive logging. */}
  }
 };
 res.once('finish',()=>finish('completed'));res.once('close',()=>finish(res.writableFinished?'completed':'aborted'));
}
