'use client';
import {useEffect,useRef} from 'react';
import type {DeletedWork} from '../lib/personal-library';
import {trapDialogTab} from '../lib/dialog-keyboard';
import styles from './story-flow-map.module.css';
export function PersonalLibraryTools({deleted,pendingTitle,onRestore,onCancel,onConfirm}:{deleted?:DeletedWork;pendingTitle?:string;onRestore:()=>void;onCancel:()=>void;onConfirm:()=>void}){
 return <><details><summary>삭제한 작품 복구</summary><p>최근 삭제한 내 작품 한 권을 복구할 수 있어요. 다음 작품을 삭제하면 이전 복구 자료가 바뀝니다.</p>{deleted?<button onClick={onRestore}>{deleted.project.title} 복구</button>:<p>삭제한 작품이 없습니다.</p>}</details>{pendingTitle&&<DeleteConfirmation title={pendingTitle} onCancel={onCancel} onConfirm={onConfirm}/>}</>;
}
function DeleteConfirmation({title,onCancel,onConfirm}:{title:string;onCancel:()=>void;onConfirm:()=>void}){
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const opener=document.activeElement as HTMLElement|null;const dialog=ref.current;dialog?.showModal();return()=>{dialog?.close();if(opener?.isConnected&&opener!==document.body)opener.focus();else document.querySelector<HTMLElement>('[aria-label="로컬 서재"] button')?.focus();};},[]);
 return <dialog className={styles.dialog} ref={ref} onKeyDown={event=>trapDialogTab(event,ref.current)} onCancel={event=>{event.preventDefault();onCancel();}} aria-label="내 작품 삭제 확인"><div className={styles.body}><h2>내 작품을 삭제할까요?</h2><p>{title}</p><p>기본 제공 작품은 보존됩니다. 최근 삭제한 내 작품 한 권은 서재에서 복구할 수 있어요.</p><button onClick={onCancel} autoFocus>취소</button><button onClick={onConfirm}>삭제 확인</button></div></dialog>;
}
