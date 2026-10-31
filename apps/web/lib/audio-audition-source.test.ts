import {it,expect,vi} from 'vitest';
import {auditionNeedsBufferedSource,createAuditionSourceBuffer} from './audio-audition-source';
const response=(text='audio',headers:Record<string,string>={})=>new Response(text,{headers:{'Content-Type':'audio/wav',...headers}});
const seekable=(...pairs:[number,number][])=>({length:pairs.length,end:(index:number)=>pairs[index][1]});
it('copies an HTTP preview only when the host cannot seek it or report a finite duration, never blob or data sources',()=>{
 // Chromium measurements: a Range-capable server reports [0,8]; a host ignoring Range (WAV on Cloudflare Pages) reports one window [0,0]; Pages OGG reports an unbounded duration.
 expect(auditionNeedsBufferedSource('/assets/audio/forest.wav',true,8,seekable([0,8]))).toBe(false);
 expect(auditionNeedsBufferedSource('/assets/audio/forest.wav',true,8,seekable([0,0]))).toBe(true);
 expect(auditionNeedsBufferedSource('/assets/audio/story-score/score-calm.ogg',true,Infinity,seekable([0,Infinity]))).toBe(true);
 expect(auditionNeedsBufferedSource('/assets/audio/story-score/score-calm.ogg',false,Infinity,seekable([0,Infinity]))).toBe(true);
 expect(auditionNeedsBufferedSource('https://example.com/sound.ogg',true,8,seekable())).toBe(true);
 for(const src of ['blob:private','data:audio/wav;base64,AA','//example.com/a'])expect(auditionNeedsBufferedSource(src,true,8,seekable([0,0]))).toBe(false);
 expect(auditionNeedsBufferedSource('/a.wav',false,8,seekable([0,0]))).toBe(false);
});
it('reuses one complete source and revokes its object URL only when replaced or disposed',async()=>{
 const fetcher=vi.fn<typeof fetch>(async()=>response()),createURL=vi.fn(()=>`blob:preview-${fetcher.mock.calls.length}`),revokeURL=vi.fn();
 const buffer=createAuditionSourceBuffer({fetcher,createURL,revokeURL});
 expect(await buffer.load('/a.wav')).toBe('blob:preview-1');expect(await buffer.load('/a.wav')).toBe('blob:preview-1');expect(fetcher).toHaveBeenCalledTimes(1);
 buffer.cancelPending();expect(revokeURL).not.toHaveBeenCalled();
 expect(await buffer.load('/b.wav')).toBe('blob:preview-2');expect(revokeURL).toHaveBeenCalledWith('blob:preview-1');buffer.dispose();expect(revokeURL).toHaveBeenCalledWith('blob:preview-2');
 expect(fetcher.mock.calls[0][1]).toMatchObject({credentials:'same-origin',redirect:'error'});
});
it('cancels an in-flight source and rejects late bytes without publishing an object URL',async()=>{
 let complete!:(value:Response)=>void;const createURL=vi.fn(()=> 'blob:late');
 const buffer=createAuditionSourceBuffer({fetcher:vi.fn(()=>new Promise<Response>(resolve=>{complete=resolve;})),createURL,revokeURL:vi.fn()});
 const pending=buffer.load('/a.wav');buffer.cancelPending();complete(response());await expect(pending).rejects.toMatchObject({name:'AbortError'});expect(createURL).not.toHaveBeenCalled();
});
it('bounds advertised and streamed bytes, rejects failed or HTML responses and permits retry',async()=>{
 for(const invalid of [new Response('too big',{headers:{'Content-Length':'30'}}),new Response('123456789'),new Response('no',{status:500}),response('html',{'Content-Type':'text/html'})]){
  const createURL=vi.fn(()=> 'blob:ok');const fetcher=vi.fn().mockResolvedValueOnce(invalid).mockResolvedValue(response());
  const buffer=createAuditionSourceBuffer({fetcher,createURL,revokeURL:vi.fn(),maxBytes:8});await expect(buffer.load('/a.wav')).rejects.toThrow();expect(createURL).not.toHaveBeenCalled();expect(await buffer.load('/a.wav')).toBe('blob:ok');buffer.dispose();
 }
});
it('deduplicates pending loads and invalidates a previous source before a replacement completes',async()=>{
 let complete!:(value:Response)=>void;const fetcher=vi.fn().mockImplementationOnce(()=>new Promise<Response>(resolve=>{complete=resolve;})).mockResolvedValue(response());const createURL=vi.fn(()=> 'blob:new');
 const buffer=createAuditionSourceBuffer({fetcher,createURL,revokeURL:vi.fn()});const old=buffer.load('/old.wav');expect(buffer.load('/old.wav')).toBe(old);
 expect(await buffer.load('/new.wav')).toBe('blob:new');complete(response());await expect(old).rejects.toMatchObject({name:'AbortError'});expect(createURL).toHaveBeenCalledTimes(1);
});
