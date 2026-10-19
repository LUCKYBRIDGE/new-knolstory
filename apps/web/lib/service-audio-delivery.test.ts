import {it,expect,vi} from 'vitest';
import {createHash} from 'node:crypto';
import {resolveAudioAsset} from '@knolstory/asset-registry';
import {ServiceAudioDelivery} from './service-audio-delivery';
const bytes=new Uint8Array([79,103,103,83]),hash=createHash('sha256').update(bytes).digest('hex');
const asset={...resolveAudioAsset('audio.cc0.oga-aquaria.tylersong3-normal')!,runtimeBytes:4,usagePolicy:{...resolveAudioAsset('audio.cc0.oga-aquaria.tylersong3-normal')!.usagePolicy!,sha256:hash}};
it('fetches only referenced catalogue bytes once, verifies hashes and reuses a pending request',async()=>{
 const fetcher=vi.fn(async()=>new Response(bytes)),store=new ServiceAudioDelivery([asset],fetcher);
 const [a,b]=await Promise.all([store.load([asset.runtimePath],new Set()),store.load([asset.runtimePath],new Set())]);expect(fetcher).toHaveBeenCalledTimes(1);expect(a).toEqual(b);expect(a[0]).toMatchObject({path:asset.runtimePath,sha256:hash,mime:'audio/ogg',data:'T2dnUw=='});
 expect(await store.load([asset.runtimePath],new Set([asset.runtimePath]))).toEqual([]);expect(fetcher).toHaveBeenCalledTimes(1);
 await expect(store.load(['assets/audio/cc0/unknown/v1/file.ogg'],new Set())).rejects.toThrow();expect(fetcher).toHaveBeenCalledTimes(1);
});
it('rejects failed requests and changed bytes instead of sending an unverified asset',async()=>{
 await expect(new ServiceAudioDelivery([asset],async()=>new Response('missing',{status:404})).load([asset.runtimePath],new Set())).rejects.toThrow();
 await expect(new ServiceAudioDelivery([asset],async()=>new Response(new Uint8Array([1,2,3,4]))).load([asset.runtimePath],new Set())).rejects.toThrow();
});
it('discards inactive files so returning to an evicted path requests it again',async()=>{
 const fetcher=vi.fn(async()=>new Response(bytes)),store=new ServiceAudioDelivery([asset],fetcher);
 await store.load([asset.runtimePath],new Set());await store.load([],new Set());await store.load([asset.runtimePath],new Set());expect(fetcher).toHaveBeenCalledTimes(2);
});
it('rejects excess streamed bytes, empty streams, wrong magic and oversized scene budgets',async()=>{
 for(const response of [new Response(new Uint8Array(5)),new Response(new Uint8Array(0)),new Response(null)])await expect(new ServiceAudioDelivery([asset],async()=>response).load([asset.runtimePath],new Set())).rejects.toThrow();
 const bad=new Uint8Array([1,2,3,4]),badHash=createHash('sha256').update(bad).digest('hex');
 await expect(new ServiceAudioDelivery([{...asset,usagePolicy:{...asset.usagePolicy,sha256:badHash}}],async()=>new Response(bad)).load([asset.runtimePath],new Set())).rejects.toThrow(/형식/);
 const huge={...asset,runtimeBytes:24000001};await expect(new ServiceAudioDelivery([huge]).load([huge.runtimePath],new Set())).rejects.toThrow(/한도/);
 const store=new ServiceAudioDelivery([asset],async()=>new Response(bytes));await store.load([asset.runtimePath],new Set());store.clear();expect(await store.load([asset.runtimePath],new Set())).toHaveLength(1);
});
it('calls the browser global fetch with its owning receiver, not the delivery instance',async()=>{
 const original=globalThis.fetch;
 globalThis.fetch=vi.fn(function(this:unknown){expect(this).toBe(globalThis);return Promise.resolve(new Response(bytes));}) as typeof fetch;
 try {expect(await new ServiceAudioDelivery([asset]).load([asset.runtimePath],new Set())).toHaveLength(1);}
 finally {globalThis.fetch=original;}
});
