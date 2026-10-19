'use client';
import {useEffect,useRef,useState} from 'react';
import {createStorageGuard} from '../lib/storage-guard';
/** One active writer per local collection, including pagehide/pageshow restoration. */
export function useStorageWriter(key:string){
 const guard=useRef<ReturnType<typeof createStorageGuard>|null>(null);
 const [status,setStatus]=useState<'loading'|'owned'|'blocked'|'unavailable'>('loading');
 useEffect(()=>{
  let disposed=false,release:(()=>void)|undefined;
  let generation=0;let hideTimer:number|undefined;
  const stop=()=>{generation++;guard.current?.setOwned(false);release?.();release=undefined;};
  const acquire=()=>{
   stop();setStatus('loading');const request=generation;
   try{guard.current??=createStorageGuard(localStorage,key);}catch{setStatus('unavailable');return;}
   if(!navigator.locks){setStatus('unavailable');return;}
   void navigator.locks.request(`${key}-writer`,{ifAvailable:true},async lock=>{
    if(disposed||request!==generation)return;
    if(!lock){setStatus('blocked');return;}
    guard.current!.setOwned(true);setStatus('owned');
    await new Promise<void>(resolve=>{release=resolve;});
   }).catch(()=>{if(!disposed){guard.current?.setOwned(false);setStatus('unavailable');}});
  };
  const hide=()=>{hideTimer=window.setTimeout(()=>{stop();if(!disposed)setStatus('loading');},0);};
  const show=(event:PageTransitionEvent)=>{if(event.persisted){window.clearTimeout(hideTimer);acquire();}};
  const changed=(event:StorageEvent)=>{if(event.key!==key&&event.key!==null)return;try{guard.current?.assertWritable();}catch{stop();setStatus('blocked');}};
  const timer=window.setTimeout(acquire,0);window.addEventListener('pagehide',hide);window.addEventListener('pageshow',show);window.addEventListener('storage',changed);
  return()=>{disposed=true;window.clearTimeout(timer);window.clearTimeout(hideTimer);stop();window.removeEventListener('pagehide',hide);window.removeEventListener('pageshow',show);window.removeEventListener('storage',changed);};
 },[key]);
 return {guard,status};
}
