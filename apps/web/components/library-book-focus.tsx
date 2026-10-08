'use client';
import {useEffect,useId,useRef} from 'react';
import {trapDialogTab} from '../lib/dialog-keyboard';
import {BookCover} from './book-cover';
import type {BookshelfIntent,BookshelfWork} from './local-bookshelf';
import styles from './library-book-focus.module.css';
export function LibraryBookFocus({works,selected,onSelect,onClose,onOpen,disabled}:{works:readonly BookshelfWork[];selected:BookshelfWork;onSelect:(key:string)=>void;onClose:()=>void;onOpen:(key:string,intent:BookshelfIntent)=>void;disabled:boolean}){
 const dialog=useRef<HTMLDialogElement>(null),title=useId();
 useEffect(()=>{const opener=document.activeElement as HTMLElement|null;const node=dialog.current;node?.showModal();return()=>{node?.close();opener?.focus();};},[]);
 const index=works.findIndex(work=>work.key===selected.key);
 const move=(delta:number)=>{if(works.length>1)onSelect(works[(index+delta+works.length)%works.length].key);};
 const edition=selected.kind==='example'?'knolstory':selected.kind;
 return <dialog ref={dialog} className={styles.dialog} aria-labelledby={title} onCancel={event=>{event.preventDefault();onClose();}} onKeyDown={event=>{trapDialogTab(event,dialog.current);if(event.target instanceof HTMLInputElement||event.target instanceof HTMLTextAreaElement)return;if(event.key==='ArrowLeft'){event.preventDefault();move(-1);}if(event.key==='ArrowRight'){event.preventDefault();move(1);}}}>
  <header><p>책을 펼치면 무대가 시작돼요</p><button onClick={onClose} aria-label="서재로 돌아가기">닫기</button></header>
  <div className={styles.showcase}><button className={styles.arrow} disabled={works.length<2} onClick={()=>move(-1)} aria-label="이전 책">‹</button><figure><div className={styles.book} aria-hidden="true"><BookCover project={selected.project} edition={edition}/></div><div className={styles.pedestal} aria-hidden="true"/><figcaption>{edition==='knolstory'?'놀스토리 · 선택하며 읽기':edition==='original'?'원작':edition==='own'?'내 작품':'가져온 작품'}</figcaption></figure><button className={styles.arrow} disabled={works.length<2} onClick={()=>move(1)} aria-label="다음 책">›</button></div>
  <section className={styles.meta}><h2 id={title}>{selected.project.title}</h2><p>{selected.project.description||'나의 생각을 한 권의 이야기로 채워 보세요.'}</p>{selected.project.cover?.author&&<small>지은이 · {selected.project.cover.author}</small>}<p className={styles.modified}>최근 수정 · {Number.isNaN(Date.parse(selected.project.updatedAt))?"수정 시점 정보 없음":new Date(selected.project.updatedAt).toLocaleDateString("ko-KR")}</p></section>
  <nav className={styles.actions} aria-label="선택한 책으로 할 일"><button disabled={disabled||!selected.project.lines.length} aria-label="처음부터 읽기" onClick={()=>onOpen(selected.key,'start')}><strong>처음부터 읽기</strong><small>책 표지를 펼쳐 이야기를 만나요</small></button><button disabled={disabled||!selected.canResume} aria-label="이어읽기" onClick={()=>onOpen(selected.key,'resume')}><strong>이어읽기</strong><small>마지막으로 읽은 장면으로</small></button><button disabled={disabled} aria-label="작품 준비" onClick={()=>onOpen(selected.key,'prepare')}><strong>작품 준비</strong><small>표지·작품 정보·기획과 메모</small></button><button disabled={disabled} aria-label="편집하기" onClick={()=>onOpen(selected.key,'edit')}><strong>편집하기</strong><small>{selected.kind==='original'||selected.kind==='example'?'내 사본에서 새 이야기를 써요':'대본과 장면을 이어 써요'}</small></button></nav>
  <p className={styles.hint}>방향키로 다른 책 보기 · Escape로 서재 돌아가기</p>
 </dialog>;
}
