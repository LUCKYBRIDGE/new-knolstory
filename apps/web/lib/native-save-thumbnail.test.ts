import {describe,it,expect,vi} from 'vitest';
import {captureNativeSaveThumbnail} from './native-save-thumbnail';
const url='data:image/webp;base64,UklGRgAAAABXRUJQ';
function frame(blank=false){
 const pixels=new Uint8ClampedArray(16*16*4);for(let i=0;i<pixels.length;i+=4){pixels[i]=blank?0:i%251;pixels[i+1]=blank?0:123;pixels[i+2]=blank?0:85;pixels[i+3]=255;}
 const context={drawImage:vi.fn(),getImageData:()=>({data:pixels})},canvas={width:1920,height:1080,getBoundingClientRect:()=>({width:1920,height:1080})};
 const doc={querySelector:()=>canvas,createElement:()=>({width:0,height:0,getContext:()=>context,toDataURL:()=>url})};
 return {contentDocument:doc,contentWindow:{requestAnimationFrame:(callback:()=>void)=>{callback();return 1;}}} as unknown as HTMLIFrameElement;
}
describe('actual native capture',()=>{
 it('captures a bounded thumbnail from the native canvas',async()=>{expect(await captureNativeSaveThumbnail(frame(),()=>true)).toEqual({dataUrl:url,width:320,height:180});});
 it('falls back for absent, blank or inaccessible canvas',async()=>{
  expect(await captureNativeSaveThumbnail(null,()=>true)).toBeUndefined();expect(await captureNativeSaveThumbnail(frame(true),()=>true)).toBeUndefined();
  const inaccessible={get contentDocument(){throw Error('origin');}} as unknown as HTMLIFrameElement;expect(await captureNativeSaveThumbnail(inaccessible,()=>true)).toBeUndefined();
 });
 it('aborts stale capture rather than binding pixels to a different scene',async()=>{
  await expect(captureNativeSaveThumbnail(frame(),()=>false)).rejects.toThrow('장면');let checks=0;await expect(captureNativeSaveThumbnail(frame(),()=>++checks<2)).rejects.toThrow('장면');
 });
 it('retries a temporarily blank native frame within a bounded number of attempts',async()=>{
  const current=frame();const doc=current.contentDocument!;const template=doc.createElement('canvas'),context=template.getContext('2d')!,read=context.getImageData.bind(context);let calls=0;
  Object.defineProperty(doc,'createElement',{value:()=>{return {...template,getContext:()=>({...context,getImageData:()=>++calls<3?{data:new Uint8ClampedArray(16*16*4)}:read(0,0,16,16)})};}});
  expect(await captureNativeSaveThumbnail(current,()=>true)).toMatchObject({width:320,height:180});expect(calls).toBe(3);
 });
});
