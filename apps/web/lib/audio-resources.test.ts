import { describe, it, expect } from 'vitest';
import { AUDIO_CATALOG } from '@knolstory/asset-registry';
import { audioResourceAsset, validateAudioResource } from './audio-resources';
import {portableStory} from './story-archive';
import {createBlankStoryProject} from '@knolstory/runtime-core';
import {unknownUploadProvenance} from './media-provenance';
const id=`audio:custom:${'a'.repeat(64)}:wav`;
const data=btoa('RIFF0000WAVE0000');
describe('portable audio resource boundaries',()=>{
  it('validates supported signature and creates safe virtual asset',()=>{
    const resource=validateAudioResource({id,name:'내 음악',mime:'audio/wav',kind:'music',data});
    expect(audioResourceAsset(resource).runtimePath).toBe(`assets/audio/${'a'.repeat(64)}.wav`);
  });
  it('rejects invalid names, paths, payloads, MIME and signatures before writing',()=>{
    for(const patch of [{id:'../../audio.wav'},{name:''},{name:'x'.repeat(201)},{kind:'background'},{mime:'text/html'},{data:'<script>'},{data:btoa('HTML')}]) expect(()=>validateAudioResource({id,name:'소리',mime:'audio/wav',kind:'sound',data,...patch})).toThrow();
    expect(()=>validateAudioResource(null)).toThrow();
    expect(()=>validateAudioResource({id,name:'소리',mime:'audio/wav',kind:'sound',data:'A'})).toThrow();
  });
  it('supports OGG and MP3 signatures',()=>{
    expect(validateAudioResource({id:id.replace(':wav',':ogg'),name:'음악',kind:'music',mime:'audio/ogg',data:btoa('OggS0000')}).mime).toBe('audio/ogg');
    expect(validateAudioResource({id:id.replace(':wav',':mp3'),name:'음악',kind:'music',mime:'audio/mpeg',data:btoa('ID30000')}).mime).toBe('audio/mpeg');
  });
});

import { beforeEach, vi } from 'vitest';
import { copyAudioWorkMetadata, listWorkAudioResources, importAudioResources, listAudioAssets, listAudioResources, registerAudioFile } from './audio-resources';
function memoryIndexedDB(initial: readonly {id:string}[] = []) {
  const stores = new Map<string,Map<string,unknown>>([['resources',new Map(initial.map(item=>[item.id,item]))],['work-metadata',new Map()]]);
  const db={close:vi.fn(),objectStoreNames:{contains:(name:string)=>stores.has(name)},createObjectStore:vi.fn(),transaction:()=>{
    const tx={oncomplete:null as null|(()=>void),onerror:null as null|(()=>void),onabort:null as null|(()=>void),objectStore:(name:string)=>{
      const records=stores.get(name)!;
      const requestFor=(result:unknown)=>{const request={result,onsuccess:null as null|(()=>void),onerror:null as null|(()=>void)};queueMicrotask(()=>request.onsuccess?.());return request;};
      return {put:(item:{id:string;workId?:string})=>{records.set(item.workId?`${item.workId}:${item.id}`:item.id,item);},get:(key:string)=>requestFor(records.get(key)),getAll:()=>requestFor([...records.values()].sort((a,b)=>(a as {id:string}).id.localeCompare((b as {id:string}).id)))};
    }};setTimeout(()=>tx.oncomplete?.(),0);return tx;
  }};
  return {open:()=>{const request={result:db,onupgradeneeded:null as null|(()=>void),onsuccess:null as null|(()=>void),onerror:null as null|(()=>void)};queueMicrotask(()=>{request.onupgradeneeded?.();request.onsuccess?.();});return request;}};
}
describe('audio file registration and portable restoration',()=>{
  beforeEach(()=>vi.stubGlobal('indexedDB',memoryIndexedDB()));
  it('preserves absent provenance without changing bytes',async()=>{
    const legacy={id,name:'기존 음원',mime:'audio/wav',kind:'sound' as const,data};
    vi.stubGlobal('indexedDB',memoryIndexedDB([legacy]));
    const resources=await listAudioResources([id]);
    expect(resources[0]).toEqual(legacy);
    expect(legacy).not.toHaveProperty('provenance');
  });
  it('deduplicates content IDs, finds custom resources and restores bytes',async()=>{
    const file=new File(['RIFF0000WAVE0000'],'morning.wav',{type:'audio/wav'});
    const asset=await registerAudioFile(file,'music');
    expect(asset.id).toMatch(/^audio:custom:[a-f0-9]{64}:wav$/);
    await registerAudioFile(file,'music');
    expect(await listAudioResources()).toHaveLength(1);
    expect(await listAudioResources([asset.id])).toHaveLength(1);
    expect(await listAudioResources(['missing'])).toEqual([]);
    expect(await listAudioAssets()).toHaveLength(AUDIO_CATALOG.length+1);
    const resources=await listAudioResources();
    vi.stubGlobal('indexedDB',memoryIndexedDB());
    await importAudioResources(resources);
    expect(await listAudioResources()).toEqual(resources);
  });
  it('keeps each work metadata and absent provenance independent for the same content ID',async()=>{
    const asset=await registerAudioFile(new File(['RIFF0000WAVE0000'],'original.wav'),'music');
    const [original]=await listAudioResources([asset.id]);
    const a={...original,name:'원작 음원',provenance:{...unknownUploadProvenance(asset.id),author:'원작 제작자'}};
    const b={...original,name:'수정 음원',kind:'sound' as const};
    await importAudioResources([a],'work-a');
    await importAudioResources([b],'work-b');
    expect(await listAudioResources([asset.id],'work-a')).toEqual([a]);
    expect(await listAudioResources([asset.id],'work-b')).toEqual([b]);
    expect(await listAudioResources([asset.id])).toEqual([original]);
    expect((await listAudioAssets('work-b')).find(item=>item.id===asset.id)?.name).toBe(b.name);
    expect(b).not.toHaveProperty('provenance');
    await copyAudioWorkMetadata('work-b','work-copy');
    expect(await listAudioResources([asset.id],'work-copy')).toEqual([b]);
    const bad={...b,id:`audio:custom:${'a'.repeat(64)}:wav`};
    await expect(importAudioResources([{...b,name:'실패해야 하는 수정'},bad],'work-b')).rejects.toThrow('자산 ID');
    expect(await listAudioResources([asset.id],'work-b')).toEqual([b]);
    expect(await listAudioResources([asset.id],'work-a')).toEqual([a]);
  });
  it('exports explicit unused attachments but does not claim foreign global resources on upload',async()=>{
    const foreign=await registerAudioFile(new File(['RIFF0000WAVEFOREIGN'],'foreign.wav'),'music');
    const own=await registerAudioFile(new File(['RIFF0000WAVEOWN'],'own.wav'),'sound','work-own');
    const resources=await listWorkAudioResources('work-own');
    expect(resources.map(item=>item.id)).toEqual([own.id]);
    expect((await listAudioAssets('work-own')).some(item=>item.id===foreign.id)).toBe(true);
    const project=createBlankStoryProject({id:'work-own',chapterId:'chapter',lineId:'line',title:'미사용 첨부'});
    expect((await portableStory(project)).audioResources).toEqual(resources);
    expect(await listWorkAudioResources('other-work')).toEqual([]);
  });
  it('retains imported attachment order and its positions across partial edits and copies',async()=>{
    await registerAudioFile(new File(['RIFF0000WAVEFIRST'],'first.wav'),'sound');
    await registerAudioFile(new File(['RIFF0000WAVESECOND'],'second.wav'),'sound');
    const reverse=[...(await listAudioResources())].sort((a,b)=>b.id.localeCompare(a.id));
    await importAudioResources(reverse,'ordered');
    expect(await listWorkAudioResources('ordered')).toEqual(reverse);
    const changed={...reverse[1],name:'둘째 수정'};
    await importAudioResources([changed],'ordered');
    const expected=[reverse[0],changed];
    expect(await listWorkAudioResources('ordered')).toEqual(expected);
    await copyAudioWorkMetadata('ordered','ordered-copy');
    expect(await listWorkAudioResources('ordered-copy')).toEqual(expected);
    const project=createBlankStoryProject({id:'ordered',chapterId:'chapter',lineId:'line',title:'순서'});
    expect((await portableStory(project)).audioResources).toEqual(expected);
  });
  it('rejects bad files and altered hashes without storing anything',async()=>{
    for(const file of [new File([],'empty.wav'),new File(['HTML'],'bad.wav'),new File(['x'],'bad.txt'),new File([new Uint8Array(5*1024*1024+1)],'big.wav')]) await expect(registerAudioFile(file,'sound')).rejects.toThrow();
    await expect(importAudioResources([{id,name:'bad',mime:'audio/wav',kind:'sound',data}])).rejects.toThrow('자산 ID');
    expect(await listAudioResources()).toEqual([]);
    await expect(importAudioResources([])).resolves.toBeUndefined();
  });
});

 describe('audio attributes per work',()=>{
 beforeEach(()=>vi.stubGlobal('indexedDB',memoryIndexedDB()));
 it('preserves attributes and renaming per work without changing bytes or another work',async()=>{
 const asset=await registerAudioFile(new File(['RIFF0000WAVE0000'],'piano.wav'),'music','a',{category:'background',tags:['피아노','여성'],originalName:'Piano',source:'Pixabay'});
 const [original]=await listAudioResources([asset.id],'a');
 expect(original.metadata).toEqual({category:'background',tags:['피아노','여성'],originalName:'Piano',source:'Pixabay'});
 await importAudioResources([{...original,name:'내 피아노',metadata:{category:'effect',tags:['학교 종'],source:'직접 녹음'}}],'b');
 expect((await listAudioResources([asset.id],'a'))[0]).toEqual(original);
 expect((await listAudioAssets('b')).find(item=>item.id===asset.id)?.metadata?.category).toBe('effect');
 await copyAudioWorkMetadata('b','copy');
 expect(await listWorkAudioResources('copy')).toEqual(await listWorkAudioResources('b'));
 expect((await listAudioResources([asset.id],'b'))[0].data).toBe(original.data);
 });
 it('rejects malformed attributes before storing resources',()=>{
 expect(()=>validateAudioResource({id,name:'소리',mime:'audio/wav',kind:'sound',data,metadata:{category:'unknown',tags:[]}})).toThrow();
 });
 });
