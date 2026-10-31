type SeekableWindow=Readonly<{length:number;end:(index:number)=>number}>;
/** Preview transport only: no authored bytes or references are changed.
 * A host that ignores Range (Cloudflare Pages) reports a seekable window of [0,0] for WAV/MP3 and an
 * unbounded duration for OGG; an in-memory copy restores seeking and a finite duration. */
export function auditionNeedsBufferedSource(src:string,ranged:boolean,duration:number,seekable:SeekableWindow){
 if(!(src.startsWith('/')&&!src.startsWith('//')||/^https?:\/\//.test(src)))return false;
 if(!Number.isFinite(duration))return true;
 return ranged&&(seekable.length===0||seekable.end(seekable.length-1)<duration-.05);
}
type Options=Readonly<{fetcher?:typeof fetch;createURL?:(blob:Blob)=>string;revokeURL?:(url:string)=>void;maxBytes?:number}>;
async function boundedAudio(src:string,signal:AbortSignal,fetcher:typeof fetch,maxBytes:number){
 const response=await fetcher(src,{signal,credentials:'same-origin',redirect:'error'});
 const advertised=Number(response.headers.get('Content-Length'));
 if(!response.ok||advertised>maxBytes||/^(text\/html|application\/json)/i.test(response.headers.get('Content-Type')??''))throw Error('Audio preview source is unavailable.');
 if(!response.body)throw Error('Audio preview source is empty.');
 const reader=response.body.getReader(),chunks:Uint8Array<ArrayBuffer>[]= [];
 let size=0;
 try{
  while(true){const next=await reader.read();if(next.done)break;size+=next.value.byteLength;if(size>maxBytes){await reader.cancel();throw Error('Audio preview source exceeds its size limit.');}chunks.push(new Uint8Array(next.value));}
 }finally{reader.releaseLock();}
 if(signal.aborted)throw new DOMException('Preview cancelled','AbortError');
 return new Blob(chunks,{type:response.headers.get('Content-Type')??'application/octet-stream'});
}
export function createAuditionSourceBuffer(options:Options={}){
 const fetcher=options.fetcher??fetch,createURL=options.createURL??(blob=>URL.createObjectURL(blob)),revokeURL=options.revokeURL??(url=>URL.revokeObjectURL(url)),maxBytes=options.maxBytes??25*1024*1024;
 type Entry={src:string;controller:AbortController;promise:Promise<string>;url?:string};
 let current:Entry|undefined;
 function dispose(){const old=current;current=undefined;if(old){old.controller.abort();if(old.url)revokeURL(old.url);}}
 function load(src:string):Promise<string>{
  if(current?.src===src)return current.promise;
  dispose();const controller=new AbortController();
  const entry:Entry={src,controller,promise:Promise.resolve('')};current=entry;
  entry.promise=boundedAudio(src,controller.signal,fetcher,maxBytes).then(blob=>{
   if(current!==entry||controller.signal.aborted)throw new DOMException('Preview cancelled','AbortError');
   const url=createURL(blob);entry.url=url;return url;
  }).catch(error=>{if(current===entry)current=undefined;throw error;});
  return entry.promise;
 }
 return {load,dispose,cancelPending(){if(current&&!current.url)dispose();}};
}
