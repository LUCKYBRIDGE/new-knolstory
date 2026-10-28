'use client';
import {useEffect,useLayoutEffect,useRef,type RefObject} from 'react';
import {beginTimelinePinch,moveTimelinePinch,type TimelinePinch} from '../lib/timeline-pinch';
type Options={zoom:number;minZoom:number;labelWidth:number;enabled:boolean;context:string;onZoom:(value:number)=>void;onCancelEdit:()=>void};
/** Native one-finger scrolling remains available. Only a two-finger gesture is consumed. */
export function useTimelinePinch(ref:RefObject<HTMLDivElement|null>,options:Options){
 const latest=useRef(options);useLayoutEffect(()=>{latest.current=options;});
 useEffect(()=>{
  const node=ref.current;if(!node)return;
  let gesture:{start:TimelinePinch;ids:number[];width:number;height:number;left:number;top:number}|null=null;
  let consumed=false,blockClick=false,frame=0;
  const cancel=()=>{gesture=null;if(frame)cancelAnimationFrame(frame);frame=0;};
  const down=()=>{if(!consumed)blockClick=false;};
  const start=(event:TouchEvent)=>{
   if(event.touches.length<2)return;
   blockClick=true;latest.current.onCancelEdit();cancel();
   if(!latest.current.enabled||Array.from(event.touches).some(touch=>!node.contains(touch.target as Node)))return;
   event.preventDefault();consumed=true;
   if(event.touches.length!==2)return;
   const [a,b]=Array.from(event.touches),rect=node.getBoundingClientRect(),p=latest.current;
   gesture={start:beginTimelinePinch(a,b,p.zoom,node.scrollLeft,rect.left+p.labelWidth),ids:[a.identifier,b.identifier],width:rect.width,height:rect.height,left:rect.left,top:rect.top};
  };
  const move=(event:TouchEvent)=>{
   if(!consumed)return;event.preventDefault();
   if(!gesture||!latest.current.enabled||event.touches.length!==2){cancel();return;}
   const rect=node.getBoundingClientRect();
   if(rect.width!==gesture.width||rect.height!==gesture.height||rect.left!==gesture.left||rect.top!==gesture.top){cancel();return;}
   const touches=Array.from(event.touches),a=touches.find(t=>t.identifier===gesture!.ids[0]),b=touches.find(t=>t.identifier===gesture!.ids[1]);
   if(!a||!b){cancel();return;}
   const next=moveTimelinePinch(gesture.start,a,b,rect.left+latest.current.labelWidth,latest.current.minZoom);
   latest.current.onZoom(next.zoom);if(frame)cancelAnimationFrame(frame);
   frame=requestAnimationFrame(()=>{node.scrollLeft=next.scrollLeft;frame=0;});
  };
  const end=(event:TouchEvent)=>{
   if(!consumed)return;event.preventDefault();
   // Do not let a remaining finger resume the canceled item edit.
   if(event.touches.length<2)gesture=null;
   if(event.touches.length===0)consumed=false;
  };
  const interrupted=(event:TouchEvent)=>{if(consumed)event.preventDefault();cancel();consumed=event.touches.length>0;};
  const click=(event:MouseEvent)=>{if(blockClick&&event.detail!==0){event.preventDefault();event.stopImmediatePropagation();}};
  node.addEventListener('pointerdown',down,true);
  node.addEventListener('touchstart',start,{passive:false});node.addEventListener('touchmove',move,{passive:false});
  node.addEventListener('touchend',end,{passive:false});node.addEventListener('touchcancel',interrupted,{passive:false});node.addEventListener('click',click,true);
  return()=>{cancel();node.removeEventListener('pointerdown',down,true);node.removeEventListener('touchstart',start);node.removeEventListener('touchmove',move);node.removeEventListener('touchend',end);node.removeEventListener('touchcancel',interrupted);node.removeEventListener('click',click,true);};
 },[ref,options.context]);
}
