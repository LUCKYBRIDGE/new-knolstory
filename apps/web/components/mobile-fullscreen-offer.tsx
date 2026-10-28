'use client';
import {useEffect,useRef,useState} from 'react';
import {usePhoneEditor} from './use-phone-editor';
import {trapDialogTab} from '../lib/dialog-keyboard';
import styles from './authoring-import-dialog.module.css';
import surface from './story-dialog-surface.module.css';
export const FULLSCREEN_OFFER_KEY='knolstory-fullscreen-offered-v1';
export function MobileFullscreenOffer({enabled,onEnter}:{enabled:boolean;onEnter:()=>void}){
 const phone=usePhoneEditor(),seen=useRef(false),dialog=useRef<HTMLDialogElement>(null);
 const [open,setOpen]=useState(false);
 useEffect(()=>{
  if(!enabled||!phone||seen.current||!document.fullscreenEnabled||!document.documentElement.requestFullscreen)return;
  let frame=0;
  const observer=new MutationObserver(()=>schedule());
  const schedule=()=>{
   cancelAnimationFrame(frame);
   frame=requestAnimationFrame(()=>{
    if(document.querySelector('dialog[open]'))return;
    seen.current=true;observer.disconnect();
    if(document.fullscreenElement)return;
    try{if(sessionStorage.getItem(FULLSCREEN_OFFER_KEY))return;sessionStorage.setItem(FULLSCREEN_OFFER_KEY,'1');}catch{/* This visit still asks only once when session storage is unavailable. */}
    setOpen(true);
   });
  };
  observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['open']});
  schedule();return()=>{cancelAnimationFrame(frame);observer.disconnect();};
 },[enabled,phone]);
 useEffect(()=>{if(!open)return;const element=dialog.current,origin=document.activeElement as HTMLElement|null;element?.showModal();return()=>{element?.close();if(origin?.isConnected)origin.focus({preventScroll:true});};},[open]);
 if(!open)return null;
 return <dialog ref={dialog} aria-label="휴대폰 전체 화면 안내" className={`${styles.dialog} ${surface.surface}`} onCancel={event=>{event.preventDefault();setOpen(false);}} onKeyDown={event=>trapDialogTab(event,dialog.current)}>
  <h2>전체 화면으로 볼까요?</h2><p>주소창을 숨겨 이야기와 편집 공간을 넓게 사용할 수 있어요.</p><p>나중에 설정에서 켜거나 끌 수 있어요.</p>
  <div className={styles.actions}><button type="button" onClick={()=>setOpen(false)}>지금은 그대로</button><button type="button" onClick={()=>{setOpen(false);onEnter();}}>전체 화면 시작</button></div>
 </dialog>;
}
