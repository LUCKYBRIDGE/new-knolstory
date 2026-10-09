import { describe, it, expect } from 'vitest';
import { AUDIO_CATALOG } from '@knolstory/asset-registry';
import { audioResourceAsset, validateAudioResource } from './audio-resources';
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
import { importAudioResources, listAudioAssets, listAudioResources, registerAudioFile } from './audio-resources';
function memoryIndexedDB(initial: readonly {id:string}[] = []) {
  const records=new Map<string,unknown>(initial.map(item=>[item.id,item]));
  const db={close:vi.fn(),createObjectStore:vi.fn(),transaction:()=>{
    const tx={oncomplete:null as null|(()=>void),onerror:null as null|(()=>void),onabort:null as null|(()=>void),objectStore:()=>({
      put:(item:{id:string})=>{records.set(item.id,item);queueMicrotask(()=>tx.oncomplete?.());},
      getAll:()=>{const request={result:[...records.values()],onsuccess:null as null|(()=>void),onerror:null as null|(()=>void)};queueMicrotask(()=>request.onsuccess?.());return request;},
    })};return tx;
  }};
  return {open:()=>{const request={result:db,onupgradeneeded:null as null|(()=>void),onsuccess:null as null|(()=>void),onerror:null as null|(()=>void)};queueMicrotask(()=>{request.onupgradeneeded?.();request.onsuccess?.();});return request;}};
}
describe('audio file registration and portable restoration',()=>{
  beforeEach(()=>vi.stubGlobal('indexedDB',memoryIndexedDB()));
  it('defaults provenance for audio stored before rights tracking without changing bytes',async()=>{
    const legacy={id,name:'기존 음원',mime:'audio/wav',kind:'sound' as const,data};
    vi.stubGlobal('indexedDB',memoryIndexedDB([legacy]));
    const resources=await listAudioResources([id]);
    expect(resources[0]).toMatchObject({...legacy,provenance:{license:'unknown',redistribution:'unknown',commercialUse:'unknown'}});
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
  it('rejects bad files and altered hashes without storing anything',async()=>{
    for(const file of [new File([],'empty.wav'),new File(['HTML'],'bad.wav'),new File(['x'],'bad.txt'),new File([new Uint8Array(5*1024*1024+1)],'big.wav')]) await expect(registerAudioFile(file,'sound')).rejects.toThrow();
    await expect(importAudioResources([{id,name:'bad',mime:'audio/wav',kind:'sound',data}])).rejects.toThrow('자산 ID');
    expect(await listAudioResources()).toEqual([]);
    await expect(importAudioResources([])).resolves.toBeUndefined();
  });
});
