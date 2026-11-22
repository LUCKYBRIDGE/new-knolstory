'use client';
import {NumberedTitle} from './numbered-title';
import {useEffect,useId,useRef,useState,type ReactNode} from 'react';
import {trapDialogTab} from '../lib/dialog-keyboard';
import {BookCover} from './book-cover';
import type {BookshelfIntent,BookshelfBook,BookshelfWork} from './local-bookshelf';
import styles from './library-book-focus.module.css';

/** Online controls for a personal book, split so destructive ones sit at the bottom of ‘관리’. */
export type BookFocusOnlineTools={status?:ReactNode;manage?:ReactNode;danger?:ReactNode};
type Edition='knolstory'|'original'|'shortstory';
const EDITIONS:Record<Edition,{label:string;note:string}>={
 knolstory:{label:'놀스토리',note:'내가 고르는 대로 이야기가 달라져요'},
 original:{label:'원작',note:'원작 이야기를 그대로 읽어요'},
 shortstory:{label:'숏스토리',note:'글과 그림으로 만나는 그림책'},
};

/**
 * The book dialog answers one question — what to read — with one large action. Making and
 * managing the book live behind ‘더보기’, so readers see a cover, a summary and a single button.
 */
export function LibraryBookFocus({works,selected,onSelect,onClose,onOpen,disabled,onExport,onDelete,onDuplicate,onlineTools,onMove,count}:{onlineTools?:BookFocusOnlineTools;onMove?:(delta:number)=>void;count?:number;works:readonly BookshelfBook[];selected:BookshelfBook;onSelect:(key:string)=>void;onClose:()=>void;onOpen:(key:string,intent:BookshelfIntent)=>void;disabled:boolean;onExport?:(key:string)=>void;onDelete?:(key:string)=>void;onDuplicate?:(key:string)=>void}){
 const dialog=useRef<HTMLDialogElement>(null),more=useRef<HTMLDetailsElement>(null),title=useId();
 useEffect(()=>{const opener=document.activeElement as HTMLElement|null;const node=dialog.current;node?.showModal();return()=>{node?.close();opener?.focus();};},[]);
 const index=works.findIndex(work=>work.key===selected.key);
 const move=(delta:number)=>{if(onMove){onMove(delta);return;}if(works.length>1)onSelect(works[(index+delta+works.length)%works.length].key);};
 const builtin=selected.builtin;
 // Every book opens on its 놀스토리 edition (or the only one it has); the choice resets for the next book.
 const initial:Edition=builtin?(builtin.knolstory?'knolstory':'original'):'knolstory';
 const [choice,setChoice]=useState<{key:string;edition:Edition}>({key:selected.key,edition:initial});
 const edition=choice.key===selected.key?choice.edition:initial;
 const choose=(next:Edition)=>setChoice({key:selected.key,edition:next});
 // Closing ‘더보기’ when the book changes keeps each book's dialog starting from the same calm state.
 useEffect(()=>{if(more.current)more.current.open=false;},[selected.key]);
 const editions:Edition[]=builtin?[...(builtin.knolstory?['knolstory' as const]:[]),...(builtin.original?['original' as const]:[]),'shortstory']:[];
 const read:BookshelfWork=(edition==='original'?builtin?.original:builtin?.knolstory)??builtin?.knolstory??builtin?.original??selected;
 const coverKind=read.kind==='example'?'knolstory':read.kind;
 const editLabel=edition==='original'?'원작':'놀스토리';
 const personal=selected.kind==='own'||selected.kind==='imported';
 const modified=Date.parse(read.project.updatedAt);
 const action=(name:string)=>({'data-focus-action':name});
 return <dialog ref={dialog} className={styles.dialog} aria-labelledby={title} data-work-id={builtin?.id} data-selected-edition={edition==='shortstory'?'shortstory':coverKind} onCancel={event=>{event.preventDefault();onClose();}} onKeyDown={event=>{trapDialogTab(event,dialog.current);if(event.target instanceof HTMLInputElement||event.target instanceof HTMLTextAreaElement||event.target instanceof HTMLSelectElement)return;if(event.key==='ArrowLeft'){event.preventDefault();move(-1);}if(event.key==='ArrowRight'){event.preventDefault();move(1);}}}>
  <header><button onClick={onClose} aria-label="닫기 · 서재로 돌아가기">닫기</button></header>
  <div className={styles.showcase}><button className={styles.arrow} disabled={(count??works.length)<2} onClick={()=>move(-1)} aria-label="이전 책">‹</button><figure><div className={styles.book} aria-hidden="true"><BookCover project={builtin?{...read.project,title:builtin.title}:read.project} edition={coverKind}/></div><div className={styles.pedestal} aria-hidden="true"/>{onlineTools?.status&&<figcaption>{onlineTools.status}</figcaption>}</figure><button className={styles.arrow} disabled={(count??works.length)<2} onClick={()=>move(1)} aria-label="다음 책">›</button></div>
  <section className={styles.meta}>
   <h2 id={title}>{builtin?.title??<NumberedTitle title={selected.project.title}/>}</h2>
   {read.project.cover?.subtitle&&<p className={styles.subtitle}>{read.project.cover.subtitle}</p>}
   {read.project.description&&<p className={styles.description}>{read.project.description}</p>}
   {read.project.cover?.author&&<small>지은이 · {read.project.cover.author}</small>}
   {read.project.cover?.authorNote&&<details className={styles.authorNote}><summary>작가의 말</summary><p>{read.project.cover.authorNote}</p></details>}
  </section>
  <div className={styles.read}>
   {builtin&&<fieldset className={styles.editions}><legend>읽을 판</legend><div>{editions.map(item=><label key={item}><input type="radio" name={`${title}-edition`} value={item} checked={edition===item} onChange={()=>choose(item)}/><span>{EDITIONS[item].label}</span></label>)}</div><p>{EDITIONS[edition].note}</p></fieldset>}
   <div className={styles.readRow}>
    {builtin&&edition==='shortstory'
     ?<a className={styles.primary} {...action('shortstory-read')} href={`/shortstory/?work=${builtin.id}&mode=read`} aria-disabled={disabled} onClick={event=>{if(disabled)event.preventDefault();}}>숏스토리 읽기</a>
     :<button className={styles.primary} {...action(read.canResume?'resume':'read')} disabled={disabled||(!read.canResume&&!read.project.lines.length)} onClick={()=>onOpen(read.key,read.canResume?'resume':'start')}>{builtin?`${EDITIONS[edition].label} `:''}{read.canResume?'이어읽기':'읽기'}</button>}
    {personal&&<button className={styles.secondary} {...action('edit')} disabled={disabled} onClick={()=>onOpen(selected.key,'edit')}>편집하기</button>}
   </div>
   {read.canResume&&edition!=='shortstory'&&<button className={styles.restart} {...action('restart')} disabled={disabled||!read.project.lines.length} onClick={()=>onOpen(read.key,'start')}>처음부터 읽기</button>}
  </div>
  <details ref={more} className={styles.more} onToggle={event=>{const node=event.currentTarget;if(node.open)requestAnimationFrame(()=>node.scrollIntoView({block:'nearest'}));}}>
   <summary>더보기</summary>
   <div className={styles.sheet}>
    <section aria-label="만들기"><h3>만들기</h3>
     {builtin&&<p className={styles.sheetNote}>지금 고른 ‘{editLabel}’{edition==='original'?'으로':'로'} 내 사본을 만들어 고쳐요. 원래 책은 그대로예요.</p>}
     <div className={styles.sheetActions}>
      {builtin&&<button {...action('edit')} disabled={disabled} onClick={()=>onOpen(read.key,'edit')}>내 사본으로 편집</button>}
      <button {...action('cover')} disabled={disabled} onClick={()=>onOpen(read.key,'cover')}>책 표지 편집</button>
      <button {...action('prepare')} disabled={disabled} onClick={()=>onOpen(read.key,'prepare')}>작품 정보·기획</button>
     </div>
    </section>
    <section aria-label="관리"><h3>관리</h3>
     {onlineTools?.manage&&<div className={styles.online}>{onlineTools.manage}</div>}
     <div className={styles.sheetActions}>
      {onExport&&<button {...action('export')} disabled={disabled} onClick={()=>onExport(read.key)}>작품 파일 내보내기</button>}
      {onDuplicate&&personal&&<button {...action('duplicate')} disabled={disabled} onClick={()=>onDuplicate(selected.key)}>사본 만들기</button>}
     </div>
     {(onDelete&&personal||onlineTools?.danger)&&<div className={styles.danger}>
      {onDelete&&personal&&<button {...action('delete')} disabled={disabled} onClick={()=>onDelete(selected.key)}>이 기기에서 삭제</button>}
      {onlineTools?.danger}
     </div>}
     {personal&&!Number.isNaN(modified)&&<p className={styles.sheetNote}>최근 수정 · {new Date(modified).toLocaleDateString('ko-KR')}</p>}
    </section>
   </div>
  </details>
  <p className={styles.hint}>← → 다른 책 · Esc 닫기</p>
 </dialog>;
}
