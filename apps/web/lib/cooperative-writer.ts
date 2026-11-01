type Channel=Pick<BroadcastChannel,'postMessage'|'close'|'addEventListener'|'removeEventListener'>;
type Options=Readonly<{
 locks:Pick<LockManager,'request'>;
 name:string;
 acquire:()=>void;
 release:()=>void;
 error:(error:unknown)=>void;
 channel?:Channel;
 timeoutMs?:number;
}>;

/** Normal Web Locks remain exclusive until the old callback returns. A cooperative message asks the
 * owner to finish and release; it never revokes a lock while that owner's JavaScript is still running.
 * An old/suspended tab or unsupported messaging leaves the requester waiting only for a bounded time. */
export function createCooperativeWriter(options:Options){
 let disposed=false,owned=false,unlock:(()=>void)|undefined;
 let pending:{promise:Promise<boolean>;finish:(value:boolean)=>void;abort:AbortController}|undefined;
 const release=()=>{
  const waiting=pending;pending=undefined;waiting?.abort.abort();waiting?.finish(false);
  if(owned){owned=false;options.release();}
  const finish=unlock;unlock=undefined;finish?.();
 };
 const requestRelease=(event:MessageEvent)=>{if(event.data==='request-writer'&&owned)release();};
 options.channel?.addEventListener('message',requestRelease);
 function claim(wait:boolean):Promise<boolean>{
  if(disposed)return Promise.resolve(false);
  if(owned)return Promise.resolve(true);
  if(pending)return pending.promise;
  const abort=new AbortController();
  let finish!:(value:boolean)=>void;
  const promise=new Promise<boolean>(resolve=>{finish=resolve;});
  const current={promise,finish:(value:boolean)=>done(value),abort};pending=current;
  let timer:ReturnType<typeof setTimeout>|undefined,repeat:ReturnType<typeof setInterval>|undefined;
  const done=(value:boolean)=>{clearTimeout(timer);clearInterval(repeat);if(pending===current)pending=undefined;finish(value);};
  const notify=()=>{try{options.channel?.postMessage('request-writer');}catch{/* A normal lock still protects the data when messaging is unavailable. */}};
  if(wait){timer=setTimeout(()=>{abort.abort();done(false);},options.timeoutMs??2500);repeat=setInterval(notify,250);}
  try{
   void options.locks.request(options.name,wait?{signal:abort.signal}:{ifAvailable:true},async lock=>{
    if(disposed||abort.signal.aborted||pending!==current){done(false);return;}
    if(!lock){done(false);return;}
    try{options.acquire();}catch(error){options.error(error);done(false);return;}
    owned=true;
    const held=new Promise<void>(resolve=>{unlock=resolve;});
    done(true);
    await held;
   }).catch(error=>{if(!abort.signal.aborted&&!disposed)options.error(error);done(false);});
   if(wait)notify();
  }catch(error){options.error(error);done(false);}
  return promise;
 }
 return {claim,release,isOwned:()=>owned,dispose(){disposed=true;release();options.channel?.removeEventListener('message',requestRelease);options.channel?.close();}};
}
