'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {createStorageGuard,type StorageGuard} from '../lib/storage-guard';
import {createCooperativeWriter} from '../lib/cooperative-writer';

/** 'standby': another tab is the writer now. Nothing is wrong and nothing is shown; this tab takes the
 * writer over as soon as it is used again. 'unavailable': this browser cannot keep the collection. */
export type StorageWriterStatus='loading'|'owned'|'standby'|'unavailable';
type Options=Readonly<{
 /** Runs after this tab took the writer over and before it writes, only when another tab saved since
  * this tab last read or wrote. The host adopts that save; it must not write here. */
 onTakeover?:(raw:string|null,beforeRaw:string|null)=>void;
}>;

/** One writer per local collection at a time (Web Lock). The tab the reader or author is using cooperatively receives
 * the writer by itself (visible, focused or touched), so several open tabs never block each other.
 * pagehide releases it for the back/forward cache; pageshow takes it again. */
export function useStorageWriter(key:string,options:Options={}){
 const guard=useRef<StorageGuard|null>(null);
 const [status,setStatus]=useState<StorageWriterStatus>('loading');
 const takeover=useRef(options.onTakeover);
 useEffect(()=>{takeover.current=options.onTakeover;});
 const claimRef=useRef<()=>Promise<boolean>>(()=>Promise.resolve(false));
 const behindRef=useRef<()=>boolean>(()=>false);
 useEffect(()=>{
  let disposed=false,hideTimer:number|undefined;
  const owned=()=>guard.current?.isOwned()===true;
  const behind=()=>{try{return !!guard.current&&guard.current.changedSince(localStorage.getItem(key));}catch{return false;}};
  behindRef.current=behind;
  let channel:BroadcastChannel|undefined;
  try{if(typeof BroadcastChannel!=='undefined')channel=new BroadcastChannel(`${key}-writer-handover`);}catch{/* Waiting still stays bounded without cross-tab messaging. */}
  const lease=navigator.locks?createCooperativeWriter({
   locks:navigator.locks,name:`${key}-writer`,channel,
   acquire:()=>{
    if(disposed)throw new DOMException('Writer disposed','AbortError');
    guard.current??=createStorageGuard(localStorage,key);
    const stored=localStorage.getItem(key);
    if(guard.current.changedSince(stored))takeover.current?.(stored,guard.current.snapshot());
    guard.current.resync(stored);guard.current.setOwned(true);setStatus('owned');
   },
   release:()=>{guard.current?.setOwned(false);if(!disposed)setStatus('standby');},
   error:()=>{guard.current?.setOwned(false);if(!disposed)setStatus('unavailable');},
  }):undefined;
  if(!lease)channel?.close();
  const stop=()=>lease?.release();
  const acquire=async(wait:boolean):Promise<boolean>=>{
   if(disposed)return false;
   try{guard.current??=createStorageGuard(localStorage,key);}catch{setStatus('unavailable');return false;}
   if(!lease){setStatus('unavailable');return false;}
   if(owned()){if(!behind())return true;stop();}
   const result=await lease.claim(wait);
   if(!result&&!disposed)setStatus(current=>current==='unavailable'?current:'standby');
   return result;
  };
  claimRef.current=()=>acquire(true);
  const visible=()=>document.visibilityState==='visible';
  const inUse=()=>{if(!owned()&&visible())void acquire(true);};
  const visibility=()=>{if(visible()){window.clearTimeout(hideTimer);inUse();}else hide();};
  const hide=()=>{hideTimer=window.setTimeout(()=>{stop();if(!disposed)setStatus('loading');},0);};
  const show=(event:PageTransitionEvent)=>{if(event.persisted){window.clearTimeout(hideTimer);void acquire(visible());}};
  // Only the writer writes; a save seen while this tab is the writer means it is out of step: take the
  // writer again so that the other save is adopted first.
  const changed=(event:StorageEvent)=>{if(event.key!==key&&event.key!==null)return;if(!owned())return;stop();setStatus('standby');inUse();};
  const timer=window.setTimeout(()=>void acquire(visible()),0);
  window.addEventListener('pagehide',hide);window.addEventListener('pageshow',show);window.addEventListener('storage',changed);
  window.addEventListener('focus',inUse);document.addEventListener('visibilitychange',visibility);
  document.addEventListener('pointerdown',inUse,true);document.addEventListener('keydown',inUse,true);
  return()=>{disposed=true;window.clearTimeout(timer);window.clearTimeout(hideTimer);stop();lease?.dispose();
   window.removeEventListener('pagehide',hide);window.removeEventListener('pageshow',show);window.removeEventListener('storage',changed);
   window.removeEventListener('focus',inUse);document.removeEventListener('visibilitychange',visibility);
   document.removeEventListener('pointerdown',inUse,true);document.removeEventListener('keydown',inUse,true);};
 },[key]);
 // Visible to checks and diagnostics only (<html data-local-writer="owned|standby|...">).
 useEffect(()=>{document.documentElement.dataset.localWriter=status;},[status]);
 /** Takes the writer for this tab now if it is not already. Resolves whether this tab may write. */
 const claim=useCallback(()=>claimRef.current(),[]);
 /** After a failed write. True when it failed only because another tab took the writer over and saved
  * before this tab heard of it: this tab then takes the writer back, adopts that save first and saves
  * again once it is 'owned' again, so the caller keeps its change and reports no failure. */
 const retryAfterTakeover=useCallback(()=>{if(!guard.current?.isOwned()||!behindRef.current())return false;void claimRef.current();return true;},[]);
 return {guard,status,claim,retryAfterTakeover};
}
