import type {IncomingMessage,ServerResponse} from 'node:http';

/** Process-wide ceiling on large request bodies held at once. Parsing and checking a work needs
 * about ten times its raw size, so a few big uploads at the same moment could otherwise exhaust
 * the heap and stop the API for everyone. Over budget, the request waits for nothing: it gets a
 * retryable 503 and the device keeps its copy. One body is always allowed when nothing else runs. */
export function createUploadBudget(maxBytes:number){
 if(!Number.isSafeInteger(maxBytes)||maxBytes<1)throw Error('Invalid upload budget.');
 let used=0;
 return {
  get used(){return used;},
  take(bytes:number):(()=>void)|null{
   if(used>0&&used+bytes>maxBytes)return null;
   used+=bytes;let released=false;
   return ()=>{if(!released){released=true;used-=bytes;}};
  },
 };
}
export type UploadBudget=ReturnType<typeof createUploadBudget>;
/** Bodies at or under this size skip the budget: they cannot pressure memory. */
export const SMALL_UPLOAD_BYTES=256*1024;
/** Reserve the declared size (or the route limit for chunked bodies) until the response is done. */
export function reserveUpload(budget:UploadBudget|undefined,req:IncomingMessage,res:ServerResponse,limit:number):boolean{
 if(!budget)return true;
 const length=Number(req.headers['content-length']??NaN),bytes=Number.isSafeInteger(length)?length:limit;
 if(bytes<=SMALL_UPLOAD_BYTES)return true;
 const release=budget.take(bytes);
 if(!release)return false;
 res.once('close',release);res.once('finish',release);
 return true;
}
