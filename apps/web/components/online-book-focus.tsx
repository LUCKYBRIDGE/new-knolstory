'use client';
import {useEffect,useId,useRef} from 'react';
import type {OnlineDocumentMetadata} from '../lib/document-api';
import {trapDialogTab} from '../lib/dialog-keyboard';
import {StorageIcon} from './library-storage';
import {CloseGlyph,type BookFocusOnlineTools} from './library-book-focus';
import styles from './library-book-focus.module.css';
import shelf from './local-bookshelf.module.css';
/** An online-only book has one thing to do here: bring it onto this device. Its trash action waits in ‘더보기’. */
export function OnlineBookFocus({record,onClose,onOpen,disabled,tools,onMove,count}:{record:OnlineDocumentMetadata;onClose:()=>void;onOpen:()=>void;disabled:boolean;tools?:BookFocusOnlineTools;onMove:(delta:number)=>void;count:number}){
 const dialog=useRef<HTMLDialogElement>(null),title=useId();
 useEffect(()=>{const opener=document.activeElement as HTMLElement|null,node=dialog.current;node?.showModal();return()=>{node?.close();opener?.focus();};},[]);
 return <dialog ref={dialog} className={styles.dialog} aria-labelledby={title} aria-describedby={`${title}-note`} onCancel={event=>{event.preventDefault();onClose();}} onKeyDown={event=>{trapDialogTab(event,dialog.current);if(event.key==='ArrowLeft'){event.preventDefault();onMove(-1);}if(event.key==='ArrowRight'){event.preventDefault();onMove(1);}}}>
  <button className={styles.close} onClick={onClose} aria-label="닫기 · 서재로 돌아가기"><CloseGlyph/></button>
  <div className={styles.showcase}><button className={styles.arrow} disabled={count<2} onClick={()=>onMove(-1)} aria-label="이전 책">‹</button><figure><div className={styles.book}><div className={shelf.remoteCover} aria-hidden="true"><StorageIcon online/><strong>{record.title}</strong><small>놀스토리</small></div></div><div className={styles.pedestal} aria-hidden="true"/>{tools?.status&&<figcaption>{tools.status}</figcaption>}</figure><button className={styles.arrow} disabled={count<2} onClick={()=>onMove(1)} aria-label="다음 책">›</button></div>
  <h2 id={title} className={styles.title}>{record.title}</h2>
  <div className={styles.actions}>
   <div className={styles.readRow}><button className={styles.readButton} data-focus-action="open-online" disabled={disabled} onClick={onOpen}><strong>이 기기로 가져와 열기</strong></button></div>
   <p id={`${title}-note`} className={styles.sheetNote}>이 기기에 사본을 만들어 열어요. 온라인 원본은 그대로예요.</p>
   {tools?.manage&&<div className={styles.online}>{tools.manage}</div>}
  </div>
  <section className={styles.meta} aria-label="작품 소개"><small>온라인 수정 · {new Date(record.updatedAt).toLocaleDateString('ko-KR')}</small></section>
  {tools?.danger&&<details className={styles.more}><summary>더보기</summary><div className={styles.sheet}><section aria-label="관리"><h3>관리</h3><div className={styles.danger}>{tools.danger}</div></section></div></details>}
  <p className={styles.hint}>← → 다른 책 · Esc 닫기</p>
 </dialog>;
}
