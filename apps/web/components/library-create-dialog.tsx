'use client';
import {useEffect,useRef} from 'react';
import {NewStoryForm} from './new-story-form';
import {trapDialogTab} from '../lib/dialog-keyboard';
import styles from './local-bookshelf.module.css';

/**
 * Making or bringing in a work starts from the ‘내 작품’ shelf (2026-11-23), not from the library
 * header: a new title, a 작품 파일, or the picture-book storage where 숏스토리 live. The sheet stays
 * mounted so a half-written title survives closing and reopening, and Escape while Hangul is being
 * composed belongs to the input method.
 */
export function LibraryCreateDialog({open,disabled,onCreate,onImport,onClose}:{open:boolean;disabled:boolean;onCreate:(title:string)=>boolean;onImport:(file:File)=>void;onClose:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null),composing=useRef(false);
 useEffect(()=>{
  const node=dialog.current;if(!node||!open)return;
  const opener=document.activeElement as HTMLElement|null;
  if(!node.open)node.showModal();
  node.querySelector<HTMLInputElement>('input:not([type=file])')?.focus();
  return()=>{if(node.open)node.close();if(opener?.isConnected)opener.focus();};
 },[open]);
 return <dialog ref={dialog} className={styles.createDialog} aria-labelledby="library-create-title"
  onCancel={event=>{event.preventDefault();if(composing.current)return;onClose();}}
  onKeyDown={event=>trapDialogTab(event,dialog.current)}
  onCompositionStart={()=>{composing.current=true;}} onCompositionEnd={()=>{composing.current=false;}} onBlurCapture={()=>{composing.current=false;}}>
  <header><h2 id="library-create-title">새 작품</h2><button type="button" className={styles.dialogClose} aria-label="새 작품 닫기" onClick={onClose}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17"/></svg></button></header>
  <NewStoryForm disabled={disabled} onCreate={title=>{const made=onCreate(title);if(made)onClose();return made;}} onCancel={onClose}/>
  <div className={styles.createMore}>
   <label className={styles.import}>작품 파일 가져오기<input type="file" accept=".knolstory" aria-label="서재 작품 파일 가져오기" disabled={disabled} onChange={event=>{const file=event.target.files?.[0];event.target.value='';if(file){onClose();onImport(file);}}}/></label>
   <a className={styles.pictureShelf} href="/shortstory?mode=library">그림책 보관함</a>
  </div>
 </dialog>;
}
