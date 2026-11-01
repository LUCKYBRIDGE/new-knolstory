import {describe,it,expect,vi} from 'vitest';
import {createCooperativeWriter} from './cooperative-writer';

function lockManager(){
 type Job={options:LockOptions;callback:LockGrantedCallback<unknown>;resolve:(value:unknown)=>void;reject:(error:unknown)=>void};
 let active=false;
 const queue:Job[]=[],calls:LockOptions[]=[];
 const drain=()=>{
  if(active)return;
  const job=queue.shift();if(!job)return;
  if(job.options.signal?.aborted){job.reject(new DOMException('Aborted','AbortError'));drain();return;}
  active=true;
  void Promise.resolve().then(()=>job.callback({name:'writer',mode:'exclusive'} as Lock)).then(value=>{active=false;job.resolve(value);drain();},error=>{active=false;job.reject(error);drain();});
 };
 const request=((_name:string,options:LockOptions,callback:LockGrantedCallback<unknown>)=>{
  calls.push(options);
  return new Promise<unknown>((resolve,reject)=>{
   if(options.ifAvailable&&active){void Promise.resolve(callback(null)).then(resolve,reject);return;}
   const job={options,callback,resolve,reject};queue.push(job);
   options.signal?.addEventListener('abort',()=>{const index=queue.indexOf(job);if(index>=0){queue.splice(index,1);reject(new DOMException('Aborted','AbortError'));}},{once:true});
   drain();
  });
 }) as LockManager['request'];
 return {locks:{request},calls};
}
function channels(){
 const peers:EventTarget[]=[];
 return ()=>{
  const peer=new EventTarget();peers.push(peer);
  return {addEventListener:peer.addEventListener.bind(peer),removeEventListener:peer.removeEventListener.bind(peer),close:()=>{peers.splice(peers.indexOf(peer),1);},postMessage:(data:unknown)=>{for(const other of peers)if(other!==peer)queueMicrotask(()=>other.dispatchEvent(new MessageEvent('message',{data})));}} as Pick<BroadcastChannel,'postMessage'|'close'|'addEventListener'|'removeEventListener'>;
 };
}
describe('cooperative writer exclusion',()=>{
 it('keeps the old owner exclusive until it cooperatively releases, without a steal request',async()=>{
  const {locks,calls}=lockManager(),channel=channels(),events:string[]=[];
  const first=createCooperativeWriter({locks,name:'writer',channel:channel(),acquire:()=>events.push('first acquired'),release:()=>events.push('first released'),error:vi.fn()});
  const second=createCooperativeWriter({locks,name:'writer',channel:channel(),acquire:()=>events.push('second acquired'),release:()=>{},error:vi.fn()});
  try{
   expect(await first.claim(true)).toBe(true);
   events.push('first synchronous write');
   const next=second.claim(true);
   expect(first.isOwned()).toBe(true);expect(second.isOwned()).toBe(false);
   expect(await next).toBe(true);
   expect(events).toEqual(['first acquired','first synchronous write','first released','second acquired']);
   expect(calls.every(options=>!options.steal)).toBe(true);
  }finally{first.dispose();second.dispose();}
 });
 it('bounds waiting for an older uncooperative owner and never revokes its lock',async()=>{
  const {locks,calls}=lockManager();let release!:()=>void;
  void locks.request('writer',{},()=>new Promise<void>(resolve=>{release=resolve;}));
  await Promise.resolve();
  const acquired=vi.fn(),writer=createCooperativeWriter({locks,name:'writer',acquire:acquired,release:vi.fn(),error:vi.fn(),timeoutMs:10});
  try{expect(await writer.claim(true)).toBe(false);expect(acquired).not.toHaveBeenCalled();expect(calls.every(options=>!options.steal)).toBe(true);release();await Promise.resolve();expect(acquired).not.toHaveBeenCalled();}finally{writer.dispose();}
 });
 it('does not queue a background tab and cancels a pending foreground request on disposal',async()=>{
  const {locks,calls}=lockManager();let release!:()=>void;
  void locks.request('writer',{},()=>new Promise<void>(resolve=>{release=resolve;}));await Promise.resolve();
  const acquired=vi.fn(),writer=createCooperativeWriter({locks,name:'writer',acquire:acquired,release:vi.fn(),error:vi.fn()});
  expect(await writer.claim(false)).toBe(false);expect(calls[1]).toEqual({ifAvailable:true});
  const pending=writer.claim(true);writer.dispose();expect(await pending).toBe(false);
  release();await Promise.resolve();expect(acquired).not.toHaveBeenCalled();
 });
 it('releases a normal lock when adopting the incoming manuscript fails',async()=>{
  const {locks}=lockManager(),failure=new Error('cannot preserve draft'),error=vi.fn();
  const writer=createCooperativeWriter({locks,name:'writer',acquire:()=>{throw failure;},release:vi.fn(),error});
  try{expect(await writer.claim(true)).toBe(false);expect(writer.isOwned()).toBe(false);expect(error).toHaveBeenCalledWith(failure);}finally{writer.dispose();}
 });
});
