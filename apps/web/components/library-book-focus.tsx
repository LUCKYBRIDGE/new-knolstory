'use client';
import {useEffect,useId,useRef,useState} from 'react';
import {trapDialogTab} from '../lib/dialog-keyboard';
import {BookCover} from './book-cover';
import type {BookshelfIntent,BookshelfBook} from './local-bookshelf';
import styles from './library-book-focus.module.css';
export function LibraryBookFocus({works,selected,onSelect,onClose,onOpen,disabled,onExport,onDelete,onDuplicate}:{works:readonly BookshelfBook[];selected:BookshelfBook;onSelect:(key:string)=>void;onClose:()=>void;onOpen:(key:string,intent:BookshelfIntent)=>void;disabled:boolean;onExport?:(key:string)=>void;onDelete?:(key:string)=>void;onDuplicate?:(key:string)=>void}){
 const dialog=useRef<HTMLDialogElement>(null),title=useId();
 useEffect(()=>{const opener=document.activeElement as HTMLElement|null;const node=dialog.current;node?.showModal();return()=>{node?.close();opener?.focus();};},[]);
 const index=works.findIndex(work=>work.key===selected.key);
 const move=(delta:number)=>{if(works.length>1)onSelect(works[(index+delta+works.length)%works.length].key);};
 const [editionChoice,setEditionChoice]=useState<'original'|'knolstory'>('knolstory');
 const source=(editionChoice==='original'?selected.builtin?.original:selected.builtin?.knolstory)??selected.builtin?.original??selected.builtin?.knolstory??selected;
 const edition=source.kind==='example'?'knolstory':source.kind;
 return <dialog ref={dialog} className={styles.dialog} aria-labelledby={title} data-work-id={selected.builtin?.id} data-selected-edition={edition} onCancel={event=>{event.preventDefault();onClose();}} onKeyDown={event=>{trapDialogTab(event,dialog.current);if(event.target instanceof HTMLInputElement||event.target instanceof HTMLTextAreaElement||event.target instanceof HTMLSelectElement)return;if(event.key==='ArrowLeft'){event.preventDefault();move(-1);}if(event.key==='ArrowRight'){event.preventDefault();move(1);}}}>
  <header><p>책을 펼치면 무대가 시작돼요</p><button onClick={onClose} aria-label="서재로 돌아가기">닫기</button></header>
  <div className={styles.showcase}><button className={styles.arrow} disabled={works.length<2} onClick={()=>move(-1)} aria-label="이전 책">‹</button><figure><div className={styles.book} aria-hidden="true"><BookCover project={selected.builtin?{...source.project,title:selected.builtin.title}:source.project} edition={edition}/></div><div className={styles.pedestal} aria-hidden="true"/><figcaption>{edition==='knolstory'?'놀스토리 · 선택하며 읽기':edition==='original'?'원작':edition==='own'?'내 작품':'가져온 작품'}</figcaption></figure><button className={styles.arrow} disabled={works.length<2} onClick={()=>move(1)} aria-label="다음 책">›</button></div>
  <section className={styles.meta}><h2 id={title}>{selected.builtin?.title??selected.project.title}</h2><p>{source.project.description||'나의 생각을 한 권의 이야기로 채워 보세요.'}</p>{source.project.cover?.author&&<small>지은이 · {source.project.cover.author}</small>}<p className={styles.modified}>최근 수정 · {Number.isNaN(Date.parse(source.project.updatedAt))?"수정 시점 정보 없음":new Date(source.project.updatedAt).toLocaleDateString("ko-KR")}</p></section>
  {selected.builtin&&<label className={styles.editionPicker}>편집·꾸미기의 바탕 판본<select aria-label="바탕 판본" value={source.kind==='original'?'original':'knolstory'} onChange={event=>setEditionChoice(event.target.value as 'original'|'knolstory')}>
   {selected.builtin.original&&<option value="original">원작 · 내 사본으로 편집</option>}{selected.builtin.knolstory&&<option value="knolstory">놀스토리 · 내 사본으로 편집</option>}
  </select><small>읽기 기록과 저장은 판본별로 보관해요. 편집하면 선택한 판본의 내 사본을 만들어요.</small></label>}
  <nav className={styles.actions} aria-label="선택한 책으로 할 일">
   {selected.builtin?<>
    <button disabled={disabled||!selected.builtin.original?.project.lines.length} aria-label="원작 읽기" onClick={()=>{if(selected.builtin?.original)onOpen(selected.builtin.original.key,'start');}}><strong>원작 읽기</strong><small>전래 이야기의 원문을 만나요</small></button>
    <button disabled={disabled||!selected.builtin.knolstory?.project.lines.length} aria-label="놀스토리 읽기" onClick={()=>{if(selected.builtin?.knolstory)onOpen(selected.builtin.knolstory.key,'start');}}><strong>놀스토리 읽기</strong><small>선택하며 나만의 갈래를 따라가요</small></button>
    <a aria-label="숏스토리 읽기" className={styles.shortstoryLink} href={`/shortstory/?work=${selected.builtin.id}&mode=read`} aria-disabled={disabled} onClick={event=>{if(disabled)event.preventDefault();}}><strong>숏스토리 읽기</strong><small>글과 그림으로 만나는 그림책</small></a>
    {[selected.builtin.original,selected.builtin.knolstory].filter(work=>work?.canResume).map(work=>work&&<button key={work.key} disabled={disabled} aria-label={`${work.kind==='original'?'원작':'놀스토리'} 이어읽기`} onClick={()=>onOpen(work.key,'resume')}><strong>{work.kind==='original'?'원작':'놀스토리'} 이어읽기</strong><small>이 판본에서 마지막으로 읽은 장면으로</small></button>)}
   </>:<><button disabled={disabled||!selected.project.lines.length} aria-label="처음부터 읽기" onClick={()=>onOpen(selected.key,'start')}><strong>처음부터 읽기</strong><small>책 표지를 펼쳐 이야기를 만나요</small></button>{selected.canResume&&<button disabled={disabled} aria-label="이어읽기" onClick={()=>onOpen(selected.key,'resume')}><strong>이어읽기</strong><small>마지막으로 읽은 장면으로</small></button>}</>}
   <button disabled={disabled} aria-label="편집하기" onClick={()=>onOpen(source.key,'edit')}><strong>편집하기</strong><small>{selected.builtin?`${source.kind==='original'?'원작':'놀스토리'}을 바탕으로 내 사본을 만들어요`:'대본과 장면을 이어 써요'}</small></button>
   <details className={styles.tools}><summary>책 꾸미기·작품 도구</summary><div><button disabled={disabled} aria-label="책 표지 편집" onClick={()=>onOpen(source.key,'cover')}><strong>책 표지 편집</strong><small>{selected.builtin?'선택한 판본의 내 사본 표지를 꾸며요':'앞표지·책등·뒤표지를 직접 꾸며요'}</small></button><button disabled={disabled} aria-label="작품 준비" onClick={()=>onOpen(source.key,'prepare')}><strong>작품 준비</strong><small>작품 정보·기획과 메모</small></button>{onExport&&<button disabled={disabled} aria-label="파일로 보관" onClick={()=>onExport(source.key)}><strong>파일로 보관</strong><small>{selected.builtin?'선택한 판본을 작품 파일로 내려받아요':'이 책을 작품 파일로 내려받아요'}</small></button>}{onDuplicate&&(selected.kind==='own'||selected.kind==='imported')&&<button disabled={disabled} aria-label="사본 만들기" onClick={()=>onDuplicate(selected.key)}><strong>사본 만들기</strong><small>원본을 보존하고 새 책으로 복사해요</small></button>}{onDelete&&(selected.kind==='own'||selected.kind==='imported')&&<button disabled={disabled} aria-label="내 작품 삭제" onClick={()=>onDelete(selected.key)}><strong>내 작품 삭제</strong><small>삭제를 확인하고 복구할 수 있어요</small></button>}</div></details>
  </nav>
  <p className={styles.hint}>방향키로 다른 책 보기 · Escape로 서재 돌아가기</p>
 </dialog>;
}
