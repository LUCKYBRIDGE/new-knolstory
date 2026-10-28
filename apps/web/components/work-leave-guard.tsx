'use client';
import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import type {WorkLeaveTracker} from '../lib/work-leave-tracker';
import {trapDialogTab} from '../lib/dialog-keyboard';
import styles from './authoring-import-dialog.module.css';

/** Browser departures use native confirmation; SPA links need their own dialog. */
export function WorkLeaveGuard({tracker,work,ready}:{tracker:WorkLeaveTracker;work:{id:string}|null;ready:boolean}){
 const [destination,setDestination]=useState<string|null>(null);
 const [saving,setSaving]=useState(false),[notice,setNotice]=useState('');
 const dialog=useRef<HTMLDialogElement>(null),allowed=useRef(false);
 useLayoutEffect(()=>{if(ready&&work)tracker.observe(work);},[tracker,work,ready]);
 useEffect(()=>{
  if(!ready)return;
  const risky=()=>tracker.hasRisk()||!!document.querySelector('[data-unsaved-draft="true"], [aria-invalid="true"]');
  const unload=(event:BeforeUnloadEvent)=>{if(!allowed.current&&risky()){event.preventDefault();event.returnValue=true;}};
  const input=(event:Event)=>{const field=event.target;if(field instanceof Element&&(field.closest('[data-keyboard-dialog="cover"],[data-account-menu]')||/검색|찾기/.test(field.getAttribute('aria-label')??field.closest('label')?.textContent??'')))return;if(field instanceof HTMLTextAreaElement||field instanceof HTMLInputElement&&['text','number'].includes(field.type))tracker.input();};
  const navigate=(event:MouseEvent)=>{
   if(event.defaultPrevented||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
   const link=event.target instanceof Element?event.target.closest('a[href]'):null;
   if(!(link instanceof HTMLAnchorElement)||link.hasAttribute('download')||link.target&&link.target!=='_self')return;
   const url=new URL(link.href,location.href);if(!['http:','https:'].includes(url.protocol)||url.pathname===location.pathname&&url.search===location.search&&url.origin===location.origin||!risky())return;
   event.preventDefault();event.stopPropagation();setDestination(url.href);
  };
  const resourceChanged=()=>tracker.externalEdit();
  window.addEventListener('knolstory-authored-resource-change',resourceChanged);
  const navigation=(window as Window&{navigation?:EventTarget}).navigation;
  const traversal=(event:Event)=>{const target=event as Event&{navigationType:string;destination:{sameDocument:boolean;url:string}};if(target.navigationType==='traverse'&&target.destination.sameDocument&&event.cancelable&&!allowed.current&&risky()){event.preventDefault();setDestination(target.destination.url);}};
  navigation?.addEventListener('navigate',traversal);
  window.addEventListener('beforeunload',unload);document.addEventListener('input',input,true);window.addEventListener('click',navigate,true);
  return()=>{window.removeEventListener('knolstory-authored-resource-change',resourceChanged);navigation?.removeEventListener('navigate',traversal);window.removeEventListener('beforeunload',unload);document.removeEventListener('input',input,true);window.removeEventListener('click',navigate,true);};
 },[ready,tracker]);
 useEffect(()=>{
  if(!destination)return;
  const opener=document.activeElement as HTMLElement|null,modal=dialog.current;modal?.showModal();
  return()=>{modal?.close();if(opener?.isConnected)opener.focus({preventScroll:true});};
 },[destination]);
 return destination?<dialog ref={dialog} className={styles.dialog} aria-label="작업을 마치고 이동할까요?" onKeyDown={event=>trapDialogTab(event,dialog.current)} onCancel={event=>{event.preventDefault();if(!saving)setDestination(null);}}>
  <h2>작업을 마치고 이동할까요?</h2><p>작품 파일에 저장하지 않은 변경이나 아직 적용하지 않은 입력이 있어요. 이동하면 현재 작업을 잃을 수 있어요.</p><p>필요한 내용은 편집을 계속해 작품 파일로 저장해 주세요. 임시 보관과 온라인 업로드는 작품 파일 저장을 대신하지 않아요.</p>
  {notice&&<p role="status">{notice}</p>}<div className={styles.actions}><button type="button" disabled={saving} onClick={async()=>{setSaving(true);setNotice('');try{const result=await tracker.saveCurrent();if(result==='saved'&&!tracker.hasRisk()&&!document.querySelector('[data-unsaved-draft="true"], [aria-invalid="true"]')){allowed.current=true;location.assign(destination);}else setNotice(result==='download-requested'?'파일 다운로드를 요청했어요. 다운로드 완료와 내용을 확인한 뒤 이동해 주세요.':result==='saved'?'파일은 저장했지만 다른 변경이나 아직 적용하지 않은 입력이 남아 있어요. 계속 편집해 확인해 주세요.':'저장을 완료하지 못해 이동하지 않았어요. 계속 편집해 작품 파일을 저장해 주세요.');}finally{setSaving(false);}}}>{saving?'저장 중…':'저장하고 이동'}</button><button type="button" disabled={saving} autoFocus onClick={()=>setDestination(null)}>계속 편집하기</button><button type="button" className={styles.danger} disabled={saving} onClick={()=>{allowed.current=true;location.assign(destination);}}>저장하지 않고 이동</button></div>
 </dialog>:null;
}
