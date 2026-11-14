'use client';
import {useEffect,useRef} from 'react';
import {trapDialogTab} from '../lib/dialog-keyboard';
import styles from './authoring-import-dialog.module.css';

/** Reopening reads the authoritative store; it never saves or replaces the in-memory draft. */
export function StorageReloadDialog({composing,onCancel,onConfirm,restart=false}:{restart?:boolean;composing:boolean;onCancel:()=>void;onConfirm:()=>void}){
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const opener=document.activeElement as HTMLElement|null;const dialog=ref.current;dialog?.showModal();return()=>{dialog?.close();opener?.focus();};},[]);
 const title=restart?'새 보관함 시작':'저장된 보관함 다시 열기';
 return <dialog ref={ref} className={styles.dialog} aria-label={title} onKeyDown={event=>trapDialogTab(event,ref.current)} onCancel={event=>{event.preventDefault();event.stopPropagation();onCancel();}}>
  <h2>{title}</h2>
  {restart?<p>열리지 않는 보관함은 따로 남겨 두고, 지금 작품으로 새 보관함을 시작할까요?</p>:<>
  <p>다시 열면 이 탭의 초안이 사라져요. 남기고 싶다면 취소하고 먼저 작품 파일로 저장하세요.</p>
  <p>저장된 보관함의 원고를 다시 불러와요. 보관함에 있는 원고는 바뀌지 않아요. 내려받은 파일은 직접 열어 내용이 있는지 확인해 주세요.</p></>}
  <div className={styles.actions}><button type="button" autoFocus onClick={onCancel}>취소</button><button type="button" className={styles.danger} disabled={composing} onClick={()=>{if(!composing)onConfirm();}}>{restart?'새 보관함 시작 확인':'현재 초안을 닫고 다시 열기'}</button></div>
 </dialog>;
}
