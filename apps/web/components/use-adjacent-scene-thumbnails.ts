'use client';
import {useEffect,useMemo,useRef,useState,type RefObject} from 'react';
import {compileStoryScene} from '@knolstory/runtime-core';
import {isRuntimeEvent,type RuntimeSceneThumbnail,type RuntimeThumbnailRequest} from '@knolstory/runtime-contract';
import type {StoryProject} from '@knolstory/story-domain';
import {storySceneLayout} from '../lib/story-viewport';
export type AdjacentSceneThumbnail={status:'pending'|'unavailable';dataUrl?:never}|({status:'ready'}&RuntimeSceneThumbnail);

/** Two native snapshots, one persistent engine; never load neighbors into playback. */
export function useAdjacentSceneThumbnails(project:StoryProject,lineId:string,frame:RefObject<HTMLIFrameElement|null>,enabled:boolean,ready:boolean,composing:boolean,textScale:number){
 const cache=useRef(new Map<string,RuntimeSceneThumbnail>());
 const serial=useRef(0);
 const [published,setPublished]=useState<Record<string,AdjacentSceneThumbnail>>({});
 const targets=useMemo(()=>{
  if(!enabled)return [];
  const current=project.lines.find(line=>line.id===lineId);
  const ordered=project.lines.filter(line=>line.chapterId===current?.chapterId).sort((a,b)=>a.order-b.order);
  const index=ordered.findIndex(line=>line.id===lineId);
  return [ordered[index-1],ordered[index+1]].filter(line=>!!line).map(line=>{
   const compiled=compileStoryScene(project,line.id,0,{mode:'edit',reducedMotion:true,...storySceneLayout('edit','landscape',{width:1280,height:720}),dialogueDock:{bottomInsetPx:0,safeBottomPx:0}});
   const scene={...compiled,...(compiled.dialogueStyle?{dialogueStyle:{...compiled.dialogueStyle,fontSize:Math.min(96,Math.max(16,Math.round(compiled.dialogueStyle.fontSize*textScale)))}}:{})};
   return {lineId:line.id,scene,key:JSON.stringify([project.id,scene])};
  });
 },[project,lineId,enabled,textScale]);
 // Geometry-only scene revisions must not create another thumbnail request.
 const signature=useMemo(()=>JSON.stringify(targets),[targets]);
 useEffect(()=>{
  if(!enabled||!ready||composing||!frame.current?.contentWindow)return;
  const pending=new Map<string,typeof targets[number]>();
  let active=true;
  const receive=(event:MessageEvent)=>{
   if(!active||event.origin!==location.origin||event.source!==frame.current?.contentWindow||!isRuntimeEvent(event.data))return;
   const result=event.data;
   if(result.type!=='sceneThumbnail'&&result.type!=='sceneThumbnailFailed')return;
   const target=pending.get(result.requestId);
   if(!target||result.sceneId!==target.scene.sceneId||result.revision!==target.scene.revision)return;
   pending.delete(result.requestId);
   if(result.type==='sceneThumbnail'){
    const thumbnail={dataUrl:result.dataUrl,width:result.width,height:result.height};
    cache.current.delete(target.key);cache.current.set(target.key,thumbnail);
    while(cache.current.size>24)cache.current.delete(cache.current.keys().next().value!);
    setPublished(old=>({...old,[target.key]:{status:'ready',...thumbnail}}));
   }else setPublished(old=>({...old,[target.key]:{status:'unavailable'}}));
  };
  window.addEventListener('message',receive);
  const timer=window.setTimeout(()=>{
   setPublished(Object.fromEntries(targets.map(target=>[target.key,cache.current.has(target.key)?{status:'ready',...cache.current.get(target.key)!}:{status:'pending'}])));
   for(const target of targets){
    if(cache.current.has(target.key))continue;
    const requestId=`adjacent-${++serial.current}`;pending.set(requestId,target);
    const request:RuntimeThumbnailRequest={protocol:1,type:'renderSceneThumbnail',requestId,payload:target.scene};
    frame.current?.contentWindow?.postMessage(request,location.origin);
   }
  },180);
  const deadline=window.setTimeout(()=>{if(active)setPublished(old=>({...old,...Object.fromEntries([...pending.values()].map(target=>[target.key,{status:'unavailable'} as const]))}));pending.clear();},12000);
  return()=>{active=false;window.clearTimeout(timer);window.clearTimeout(deadline);window.removeEventListener('message',receive);};
 // targets are immutable and fully represented by signature, including the manuscript content.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[signature,enabled,ready,composing,frame]);
 return Object.fromEntries(targets.map(target=>[target.lineId,published[target.key]??{status:'pending'}])) as Record<string,AdjacentSceneThumbnail>;
}
