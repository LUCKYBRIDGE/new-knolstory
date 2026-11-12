'use client';
import {useEffect,useRef,type ReactNode} from 'react';
import type {OnlineDocumentMetadata} from '../lib/document-api';
import {trapDialogTab} from '../lib/dialog-keyboard';
import {LibraryStorageBadge,StorageIcon} from './library-storage';
import styles from './library-book-focus.module.css';
import shelf from './local-bookshelf.module.css';
export function OnlineBookFocus({record,onClose,onOpen,disabled,actions,onMove,count}:{record:OnlineDocumentMetadata;onClose:()=>void;onOpen:()=>void;disabled:boolean;actions?:ReactNode;onMove:(delta:number)=>void;count:number}){
 const dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const opener=document.activeElement as HTMLElement|null,node=dialog.current;node?.showModal();return()=>{node?.close();opener?.focus();};},[]);
 return <dialog ref={dialog} className={styles.dialog} aria-label={`${record.title} · 온라인 작품`} onCancel={event=>{event.preventDefault();onClose();}} onKeyDown={event=>{trapDialogTab(event,dialog.current);if(event.key==='ArrowLeft'){event.preventDefault();onMove(-1);}if(event.key==='ArrowRight'){event.preventDefault();onMove(1);}}}>
  <header><p>온라인에 보관한 내 작품</p><button onClick={onClose} aria-label="닫기 · 서재로 돌아가기">닫기</button></header>
  <div className={styles.showcase}><button className={styles.arrow} disabled={count<2} onClick={()=>onMove(-1)} aria-label="이전 책">‹</button><figure><div className={styles.book}><div className={shelf.remoteCover} aria-hidden="true"><StorageIcon online/><strong>{record.title}</strong><small>놀스토리</small></div></div><figcaption><LibraryStorageBadge status={{kind:'remote',label:'온라인에 있음',record}}/></figcaption></figure><button className={styles.arrow} disabled={count<2} onClick={()=>onMove(1)} aria-label="다음 책">›</button></div>
  <section className={styles.meta}><h2>{record.title}</h2><p>이 기기에 열면 편집하고 읽을 수 있는 사본을 만들어요.</p><p className={styles.modified}>온라인 수정 · {new Date(record.updatedAt).toLocaleDateString('ko-KR')}</p></section>
  <nav className={styles.actions} aria-label="선택한 책으로 할 일"><button disabled={disabled} onClick={onOpen}><strong>이 기기에 열기</strong><small>온라인 원본과 기존 원고를 보존해요</small></button>{actions&&<div className={styles.onlineTools}>{actions}</div>}</nav>
 </dialog>;
}
