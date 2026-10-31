'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {createStorageGuard,type StorageGuard} from '../lib/storage-guard';

/** 'standby': another tab is the writer now. Nothing is wrong and nothing is shown; this tab takes the
 * writer over as soon as it is used again. 'unavailable': this browser cannot keep the collection. */
export type StorageWriterStatus='loading'|'owned'|'standby'|'unavailable';
type Options=Readonly<{
 /** Runs after this tab took the writer over and before it writes, only when another tab saved since
  * this tab last read or wrote. The host adopts that save; it must not write here. */
 onTakeover?:(raw:string|null)=>void;
}>;

/** One writer per local collection at a time (Web Lock). The tab the reader or author is using takes
 * the writer over by itself (visible, focused or touched), so several open tabs never block each other.
 * pagehide releases it for the back/forward cache; pageshow takes it again. */
export function useStorageWriter(key:string,options:Options={}){
 const guard=useRef<StorageGuard|null>(null);
 const [status,setStatus]=useState<StorageWriterStatus>('loading');
 const takeover=useRef(options.onTakeover);
 useEffect(()=>{takeover.current=options.onTakeover;});
 const claimRef=useRef<()=>Promise<boolean>>(()=>Promise.resolve(false));
 useEffect(()=>{
  let disposed=false,release:(()=>void)|undefined,generation=0,hideTimer:number|undefined,waiting:Promise<boolean>|null=null;
  const owned=()=>guard.current?.isOwned()===true;
  const stop=()=>{generation++;guard.current?.setOwned(false);release?.();release=undefined;waiting=null;};
  const acquire=(steal:boolean):Promise<boolean>=>{
   if(disposed)return Promise.resolve(false);
   if(owned())return Promise.resolve(true);
   if(waiting)return waiting;
   try{guard.current??=createStorageGuard(localStorage,key);}catch{setStatus('unavailable');return Promise.resolve(false);}
   if(!navigator.locks){setStatus('unavailable');return Promise.resolve(false);}
   const request=++generation;
   const result=new Promise<boolean>(resolve=>{
    let settled=false;
    const done=(value:boolean)=>{if(settled)return;settled=true;if(waiting===result)waiting=null;resolve(value);};
    navigator.locks.request(`${key}-writer`,steal?{steal:true}:{ifAvailable:true},async lock=>{
     if(disposed||request!==generation){done(false);return;}
     if(!lock){setStatus('standby');done(false);return;}
     try{
      const stored=localStorage.getItem(key);
      if(guard.current!.changedSince(stored))takeover.current?.(stored);
      guard.current!.resync(stored);
     }catch{guard.current!.setOwned(false);setStatus('unavailable');done(false);return;}
     guard.current!.setOwned(true);setStatus('owned');done(true);
     await new Promise<void>(resolve=>{release=resolve;});
    }).catch((error:unknown)=>{
     // AbortError: another tab took the writer over. This tab waits until it is used again.
     if(request===generation)guard.current?.setOwned(false);
     if(!disposed&&request===generation)setStatus(error instanceof DOMException&&error.name==='AbortError'?'standby':'unavailable');
     done(false);
    });
   });
   waiting=result;
   return result;
  };
  claimRef.current=()=>acquire(true);
  const visible=()=>document.visibilityState==='visible';
  const inUse=()=>{if(!owned()&&visible())void acquire(true);};
  const visibility=()=>{if(visible())inUse();};
  const hide=()=>{hideTimer=window.setTimeout(()=>{stop();if(!disposed)setStatus('loading');},0);};
  const show=(event:PageTransitionEvent)=>{if(event.persisted){window.clearTimeout(hideTimer);void acquire(visible());}};
  // Only the writer writes; a save seen while this tab is the writer means it is out of step: take the
  // writer again so that the other save is adopted first.
  const changed=(event:StorageEvent)=>{if(event.key!==key&&event.key!==null)return;if(!owned())return;stop();setStatus('standby');inUse();};
  const timer=window.setTimeout(()=>void acquire(visible()),0);
  window.addEventListener('pagehide',hide);window.addEventListener('pageshow',show);window.addEventListener('storage',changed);
  window.addEventListener('focus',inUse);document.addEventListener('visibilitychange',visibility);
  document.addEventListener('pointerdown',inUse,true);document.addEventListener('keydown',inUse,true);
  return()=>{disposed=true;window.clearTimeout(timer);window.clearTimeout(hideTimer);stop();
   window.removeEventListener('pagehide',hide);window.removeEventListener('pageshow',show);window.removeEventListener('storage',changed);
   window.removeEventListener('focus',inUse);document.removeEventListener('visibilitychange',visibility);
   document.removeEventListener('pointerdown',inUse,true);document.removeEventListener('keydown',inUse,true);};
 },[key]);
 /** Takes the writer for this tab now if it is not already. Resolves whether this tab may write. */
 const claim=useCallback(()=>claimRef.current(),[]);
 return {guard,status,claim};
}
