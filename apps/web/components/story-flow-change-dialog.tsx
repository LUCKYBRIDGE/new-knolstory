'use client';
import {useEffect,useRef,type RefObject} from 'react';
import {trapDialogTab} from '../lib/dialog-keyboard';
import styles from './authoring-import-dialog.module.css';
import surface from './story-dialog-surface.module.css';
export function StoryFlowChangeDialog({warning,blocked,opener,onCancel,onConfirm}:{warning:string;blocked:boolean;opener:RefObject<HTMLElement|null>;onCancel:()=>void;onConfirm:()=>void}){
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const dialog=ref.current,origin=opener.current;dialog?.showModal();dialog?.querySelector<HTMLButtonElement>('button')?.focus();return()=>{dialog?.close();if(origin?.isConnected)origin.focus();};},[opener]);
 return <dialog ref={ref} className={`${styles.dialog} ${surface.surface}`} aria-label="진행 방식 변경 확인" onCancel={event=>{event.preventDefault();event.stopPropagation();onCancel();}} onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();onCancel();}else trapDialogTab(event,ref.current);}}>
  <h2>진행 방식을 바꿀까요?</h2><p>{warning}</p><p>장과 컷의 글은 유지됩니다.</p>{blocked&&<p role="alert">현재 원고나 편집 상태가 바뀌었어요. 취소한 뒤 다시 확인해 주세요.</p>}
  <div className={styles.actions}><button type="button" onClick={onCancel}>취소</button><button type="button" className={styles.danger} disabled={blocked} onClick={onConfirm}>진행 방식 변경</button></div>
 </dialog>;
}
