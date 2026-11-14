'use client';
import {useEffect,useRef} from 'react';
import {trapDialogTab} from '../lib/dialog-keyboard';
import styles from './authoring-import-dialog.module.css';
export function PersonalLibraryTools({pendingTitle,onCancel,onConfirm}:{pendingTitle?:string;onCancel:()=>void;onConfirm:()=>void}){
 return <>{pendingTitle&&<DeleteConfirmation title={pendingTitle} onCancel={onCancel} onConfirm={onConfirm}/>}</>;
}
function DeleteConfirmation({title,onCancel,onConfirm}:{title:string;onCancel:()=>void;onConfirm:()=>void}){
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const opener=document.activeElement as HTMLElement|null;const dialog=ref.current;dialog?.showModal();return()=>{dialog?.close();if(opener?.isConnected&&opener!==document.body)opener.focus();else document.querySelector<HTMLElement>('[aria-label="로컬 서재"] button')?.focus();};},[]);
 return <dialog className={styles.dialog} ref={ref} onKeyDown={event=>trapDialogTab(event,ref.current)} onCancel={event=>{event.preventDefault();event.stopPropagation();onCancel();}} aria-label="내 작품 삭제 확인"><div><h2>내 작품을 삭제할까요?</h2><p className={styles.title}>{title}</p><p>기본 제공 작품은 보존돼요. 최근 삭제한 내 작품 한 권은 서재의 ‘책 분류 → 삭제한 작품’에서 되살릴 수 있어요.</p><div className={styles.actions}><button onClick={onCancel} autoFocus>취소</button><button className={styles.danger} onClick={onConfirm}>삭제 확인</button></div></div></dialog>;
}
