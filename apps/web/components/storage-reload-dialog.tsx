'use client';
import {useEffect,useRef} from 'react';
import {trapDialogTab} from '../lib/dialog-keyboard';
import styles from './authoring-import-dialog.module.css';

/** Reopening reads the authoritative store; it never saves or replaces the in-memory draft. */
export function StorageReloadDialog({composing,onCancel,onConfirm}:{composing:boolean;onCancel:()=>void;onConfirm:()=>void}){
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const opener=document.activeElement as HTMLElement|null;const dialog=ref.current;dialog?.showModal();return()=>{dialog?.close();opener?.focus();};},[]);
 return <dialog ref={ref} className={styles.dialog} aria-label="저장된 보관함 다시 열기" onKeyDown={event=>trapDialogTab(event,ref.current)} onCancel={event=>{event.preventDefault();event.stopPropagation();onCancel();}}>
  <h2>저장된 보관함 다시 열기</h2>
  <p>다시 열면 이 탭의 현재 초안은 사라집니다. 필요한 초안은 취소한 뒤 작품 파일로 먼저 저장해 주세요.</p>
  <p>저장된 보관함의 원고를 다시 불러옵니다. 보관함에 있는 원고는 바뀌지 않습니다. 내려받은 파일은 직접 열어 내용이 있는지 확인해 주세요.</p>
  <div className={styles.actions}><button type="button" autoFocus onClick={onCancel}>취소</button><button type="button" className={styles.danger} disabled={composing} onClick={()=>{if(!composing)onConfirm();}}>현재 초안을 닫고 다시 열기</button></div>
 </dialog>;
}
