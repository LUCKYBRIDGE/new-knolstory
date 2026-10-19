import {AUDIO_CATALOG,type AudioAsset} from '@knolstory/asset-registry';
import {isRuntimeServiceAudioPath,type RuntimeServiceAudioResource} from '@knolstory/runtime-contract';
type Entry=Readonly<{controller:AbortController;promise:Promise<RuntimeServiceAudioResource>}>;
async function digest(bytes:ArrayBuffer){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),byte=>byte.toString(16).padStart(2,'0')).join('');}
function encode(bytes:Uint8Array){let value='';for(let offset=0;offset<bytes.length;offset+=65536)value+=String.fromCharCode(...bytes.subarray(offset,offset+65536));return btoa(value);}
/** Only the current scene's registered files are cached; shared binaries never enter StoryDocument/IDB. */
export class ServiceAudioDelivery {
 private entries:ReadonlyMap<string,Entry>=new Map();
 private readonly assets:ReadonlyMap<string,AudioAsset>;
 constructor(catalog:readonly AudioAsset[]=AUDIO_CATALOG,private readonly fetcher:typeof fetch=(input,init)=>globalThis.fetch(input,init)){this.assets=new Map(catalog.filter(asset=>asset.delivery==='on-demand').map(asset=>[asset.runtimePath,asset]));}
 async load(paths:readonly string[],confirmed:ReadonlySet<string>):Promise<readonly RuntimeServiceAudioResource[]>{
  const unique=[...new Set(paths)];
  if(unique.length>10||unique.some(path=>!isRuntimeServiceAudioPath(path)||!this.assets.has(path)))throw Error('등록되지 않은 음원 경로입니다.');
  if(unique.reduce((total,path)=>total+(this.assets.get(path)!.runtimeBytes??Infinity),0)>24000000)throw Error('이 컷의 음원 파일이 재생 준비 한도를 넘었습니다.');
  const active=new Set(unique);
  for(const [path,entry] of this.entries)if(!active.has(path))entry.controller.abort();
  this.entries=new Map([...this.entries].filter(([path])=>active.has(path)));
  return Promise.all(unique.filter(path=>!confirmed.has(path)).map(path=>{
   const cached=this.entries.get(path);if(cached)return cached.promise;
   const controller=new AbortController(),promise=this.fetchAsset(this.assets.get(path)!,controller.signal);
   this.entries=new Map([...this.entries,[path,{controller,promise}]]);
   void promise.catch(()=>{if(this.entries.get(path)?.promise===promise)this.entries=new Map([...this.entries].filter(([key])=>key!==path));});
   return promise;
  }));
 }
 clear(){for(const entry of this.entries.values())entry.controller.abort();this.entries=new Map();}
 private async fetchAsset(asset:AudioAsset,signal:AbortSignal):Promise<RuntimeServiceAudioResource>{
  const response=await this.fetcher(asset.src,{signal});if(!response.ok)throw Error('등록 음원 파일을 불러오지 못했습니다.');
  const reader=response.body?.getReader();if(!reader)throw Error('등록 음원 데이터가 없습니다.');
  const chunks:Uint8Array[]=[];let length=0;
  while(true){const result=await reader.read();if(result.done)break;length+=result.value.length;if(length>(asset.runtimeBytes??0)||length>8*1024*1024){await reader.cancel();throw Error('등록 음원 크기가 변경되었습니다.');}chunks.push(result.value);}
  const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}const buffer=bytes.buffer;
  if(!bytes.length||bytes.length>8*1024*1024||bytes.length!==asset.runtimeBytes)throw Error('등록 음원 크기가 변경되었습니다.');
  if(await digest(buffer)!==asset.usagePolicy?.sha256)throw Error('등록 음원 해시가 일치하지 않습니다.');
  const magic=String.fromCharCode(...bytes.subarray(0,4));
  if(asset.mime==='audio/ogg'?magic!=='OggS':asset.mime==='audio/mpeg'?!(magic.startsWith('ID3')||bytes[0]===255&&(bytes[1]&224)===224):magic!=='RIFF')throw Error('등록 음원 파일 형식이 올바르지 않습니다.');
  return {path:asset.runtimePath,sha256:asset.usagePolicy!.sha256,mime:asset.mime,data:encode(bytes)};
 }
}
