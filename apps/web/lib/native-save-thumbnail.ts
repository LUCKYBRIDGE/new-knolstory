import {isPlayerThumbnail,type PlayerThumbnail} from './player-saves';
/** Copies native pixels only. Missing/tainted/blank canvases retain the saved text summary. */
export async function captureNativeSaveThumbnail(frame:HTMLIFrameElement|null,isCurrent:()=>boolean):Promise<PlayerThumbnail|undefined>{
 const assertCurrent=()=>{if(!isCurrent())throw Error('저장 중 장면이 바뀌었습니다. 현재 컷에서 다시 저장해 주세요.');};
 assertCurrent();if(!frame)return undefined;
 let thumbnail:PlayerThumbnail|undefined;
 try{
  const doc=frame.contentDocument,win=frame.contentWindow,source=doc?.querySelector<HTMLCanvasElement>('canvas');
  if(!doc||!win||!source||!source.width||!source.height)return undefined;
  // Capturing in the native animation frame avoids WebGL's cleared drawing buffer between frames.
  thumbnail=await new Promise<PlayerThumbnail|undefined>(resolve=>{
   let settled=false;const finish=(value?:PlayerThumbnail)=>{if(!settled){settled=true;clearTimeout(timer);resolve(value);}};
   const timer=setTimeout(()=>finish(),500);
   let attempts=0;
   const capture=()=>{
    if(settled)return;
    try{
     const ratio=Math.min(320/source.width,320/source.height,1),width=Math.max(1,Math.round(source.width*ratio)),height=Math.max(1,Math.round(source.height*ratio));
     const canvas=doc.createElement('canvas');canvas.width=width;canvas.height=height;
     const context=canvas.getContext('2d');if(!context){finish();return;}
     context.drawImage(source,0,0,width,height);
     const pixels=context.getImageData(0,0,width,height).data;
     let low=255,high=0;for(let i=0;i<pixels.length;i+=4){if(pixels[i+3]>0){low=Math.min(low,pixels[i],pixels[i+1],pixels[i+2]);high=Math.max(high,pixels[i],pixels[i+1],pixels[i+2]);}}
     if(high-low<8){if(++attempts<12){win.requestAnimationFrame(capture);return;}finish();return;}
     for(const quality of [.72,.5,.3]){const candidate={dataUrl:canvas.toDataURL('image/webp',quality),width,height};if(isPlayerThumbnail(candidate)){finish(candidate);return;}}
     finish();
    }catch{finish();}
   };
   win.requestAnimationFrame(capture);
  });
 }catch{thumbnail=undefined;}
 assertCurrent();return thumbnail;
}
