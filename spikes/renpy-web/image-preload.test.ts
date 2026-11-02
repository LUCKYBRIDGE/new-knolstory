import {expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {resolve} from 'node:path';
import {isRuntimeImagePreparationRequest} from '../../packages/runtime-contract/src';
const a='assets/legacy-18da4fc/a.webp',b='assets/legacy-18da4fc/b.webp',c='assets/legacy-18da4fc/c.webp';
function harness(fetcher:(url:string,options:RequestInit)=>Promise<Response>,options:{caches?:unknown;filesystemFailure?:boolean;filesystemMissing?:boolean}={}){
 const files=new Map<string,Uint8Array>(),commands:unknown[]=[],events:unknown[]=[];
 const window={Module:{FS:{mkdirTree:()=>{if(options.filesystemFailure)throw Error('native unavailable');},writeFile:(path:string,bytes:Uint8Array)=>files.set(path,bytes),unlink:(path:string)=>files.delete(path)}},KnolRuntimeContract:{isRuntimeImagePreparationRequest},fetch:fetcher} as Record<string,unknown>;
 if(options.filesystemMissing)window.Module=undefined;
 runInNewContext(readFileSync('spikes/renpy-web/image-preload.js','utf8'),{window,document:{currentScript:{src:'https://story.test/runtime/knol-image-preload.js?v=fixed'}},location:{href:'https://story.test/runtime/index.html'},URL,AbortController,Uint8Array,Response,caches:options.caches},{filename:resolve('spikes/renpy-web/image-preload.js')});
 const api=window.knolImagePreload as {prepare:(request:unknown,decode:(command:unknown)=>void,report:(event:unknown)=>void)=>boolean;status:()=>{active:string[];installed:string[];memoryBytes:number};isCurrent:(id:string)=>boolean};
 return {api,files,commands,events,prepare:(requestId:string,paths:string[],required:string[])=>api.prepare({protocol:1,type:'prepareImages',requestId,paths,required},command=>commands.push(command),event=>events.push(event))};
}
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
it('consumes complete responses before installing only required files and requesting native decode',async()=>{
 let finish!:(value:ArrayBuffer)=>void;
 const {prepare,files,commands,api}=harness(async()=>({ok:true,headers:new Headers(),arrayBuffer:()=>new Promise<ArrayBuffer>(resolve=>{finish=resolve;})}) as Response);
 prepare('one',[a],[a]);await tick();expect(commands).toEqual([]);expect(files.size).toBe(0);
 finish(new Uint8Array([1,2,3]).buffer);await tick();await tick();
 expect(files.get(`/game/${a}`)).toEqual(new Uint8Array([1,2,3]));expect(commands).toEqual([{protocol:1,type:'decodePreparedImages',requestId:'one',paths:[a]}]);expect(api.status().installed).toEqual([a]);
});
it('limits speculative downloads, cancels obsolete work and prevents stale decode acknowledgements',async()=>{
 const pending=new Map<string,{resolve:(value:Response)=>void;signal:AbortSignal}>();
 const h=harness((url,options)=>new Promise<Response>((resolve,reject)=>{pending.set(url,{resolve,signal:options.signal!});options.signal!.addEventListener('abort',()=>reject(Error('cancelled')));}));
 h.prepare('old',[a,b,c],[a]);await tick();expect(h.api.status().active).toHaveLength(2);
 h.prepare('new',[c],[c]);await tick();expect([...pending.values()].filter(item=>item.signal.aborted)).toHaveLength(2);
 pending.get(`https://story.test/runtime/game/${c}`)!.resolve(new Response(new Uint8Array([4])));await tick();await tick();
 expect(h.commands.filter((command:unknown)=>(command as {requestId:string}).requestId==='old')).toHaveLength(0);expect(h.commands).toEqual([{protocol:1,type:'decodePreparedImages',requestId:'new',paths:[c]}]);expect(h.api.isCurrent('old')).toBe(false);
});
it('keeps background failures nonblocking but reports a required download failure',async()=>{
 const h=harness(async()=>new Response('missing',{status:503}));h.prepare('background',[a],[]);await tick();await tick();expect(h.events).toEqual([]);
 h.prepare('required',[b],[b]);await tick();await tick();expect(h.events).toEqual([{protocol:1,type:'imagesPrepared',requestId:'required',ok:false,prepared:0,total:1}]);
});
it('rejects traversal before issuing any fetch',()=>{
 let calls=0;const h=harness(async()=>{calls++;return new Response();});expect(h.prepare('bad',['../private'],[])).toBe(false);expect(calls).toBe(0);
});
it('uses full cached bytes without fetching, and tolerates optional cache quota errors',async()=>{
 let fetches=0,puts=0;
 const cache={match:async()=>new Response(new Uint8Array([4,5]),{headers:{'content-type':'image/webp'}}),put:async()=>{puts++;throw Error('quota');}};
 const h=harness(async()=>{fetches++;throw Error('unexpected network');},{caches:{open:async()=>cache}});
 h.prepare('cached',[a],[a]);await tick();await tick();expect(fetches).toBe(0);expect(puts).toBeGreaterThan(0);expect(h.files.get(`/game/${a}`)).toEqual(new Uint8Array([4,5]));expect(h.commands).toHaveLength(1);
 h.prepare('memory',[a],[a]);await tick();await tick();expect(h.commands).toHaveLength(2);expect(fetches).toBe(0);
});
it('falls back from unavailable disk cache and rejects empty, oversized or uninstallable current files',async()=>{
 const denied={open:async()=>{throw Error('storage denied');}};
 for(const response of [new Response(new Uint8Array()),new Response('too big',{headers:{'content-length':String(9*1024*1024)}})]){
  const h=harness(async()=>response,{caches:denied});h.prepare('failed',[a],[a]);await tick();await tick();expect(h.events).toHaveLength(1);expect(h.commands).toEqual([]);
 }
 const h=harness(async()=>new Response(new Uint8Array([1])),{filesystemFailure:true});h.prepare('install-failed',[a],[a]);await tick();await tick();expect(h.events).toHaveLength(1);expect(h.commands).toEqual([]);
});
it('releases old native files while retaining current and immediately previous images',async()=>{
 const h=harness(async()=>new Response(new Uint8Array([1,2,3])));
 for(const [index,path] of [a,b,c].entries()){h.prepare(`step-${index}`,[path],[path]);await tick();await tick();}
 expect(h.api.status().installed).toEqual([b,c]);expect(h.files.has(`/game/${a}`)).toBe(false);
 h.prepare('disabled',[],[]);await tick();await tick();expect(h.api.status().installed).toEqual([c]);
 h.prepare('disabled-again',[],[]);await tick();await tick();expect(h.api.status().installed).toEqual([]);
});
it('bounds compressed memory and refuses a current image set above the native byte budget',async()=>{
 const paths=[a,b,c,'assets/legacy-18da4fc/d.webp'];
 const h=harness(async()=>new Response(new Uint8Array(7*1024*1024)),{caches:{open:async()=>({match:async()=>{throw Error('cache read failed');},put:async()=>{}})}});
 h.prepare('large-work',paths,[]);
 for(let round=0;round<12;round++)await tick();
 expect(h.api.status().memoryBytes).toBeLessThanOrEqual(24*1024*1024);
 expect(h.api.status().installed).toEqual([]);
 h.prepare('too-many-current-bytes',paths,paths);
 for(let round=0;round<12;round++)await tick();
 expect(h.events).toEqual([{protocol:1,type:'imagesPrepared',requestId:'too-many-current-bytes',ok:false,prepared:4,total:4}]);
});
it('checks consumed body bytes even when a server omits the content length',async()=>{
 const h=harness(async()=>new Response(new Uint8Array(8*1024*1024+1)));
 h.prepare('oversized',[a],[a]);await tick();await tick();expect(h.events).toHaveLength(1);expect(h.files.size).toBe(0);
});
it('does not acknowledge required images if the native file system has disappeared',async()=>{
 const h=harness(async()=>new Response(new Uint8Array([1])),{filesystemMissing:true});
 h.prepare('lost-native',[a],[a]);await tick();await tick();expect(h.events).toHaveLength(1);expect(h.commands).toEqual([]);
});
