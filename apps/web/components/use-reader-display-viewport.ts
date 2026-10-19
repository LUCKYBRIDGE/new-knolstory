'use client';
import {useEffect,useState} from 'react';
import {readerDisplayViewport,type ReaderDisplayViewport} from '../lib/reader-display-viewport';
/** One visible display rectangle shared by the native frame and its host controls. */
export function useReaderDisplayViewport(enabled:boolean){
 const [rect,setRect]=useState<ReaderDisplayViewport>();
 useEffect(()=>{
  if(!enabled)return;
  const visual=window.visualViewport;
  const update=()=>{
   const next=readerDisplayViewport({width:document.documentElement.clientWidth,height:window.innerHeight},visual);
   setRect(previous=>previous?.width===next?.width&&previous?.height===next?.height&&previous?.left===next?.left&&previous?.top===next?.top?previous:next);
  };
  update();window.addEventListener('resize',update);document.addEventListener('fullscreenchange',update);
  visual?.addEventListener('resize',update);visual?.addEventListener('scroll',update);
  return()=>{window.removeEventListener('resize',update);document.removeEventListener('fullscreenchange',update);visual?.removeEventListener('resize',update);visual?.removeEventListener('scroll',update);};
 },[enabled]);
 return enabled?rect:undefined;
}
