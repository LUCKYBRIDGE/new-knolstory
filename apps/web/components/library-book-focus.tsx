'use client';
import {NumberedTitle} from './numbered-title';
import {useEffect,useId,useRef,useState,type ReactNode} from 'react';
import {trapDialogTab} from '../lib/dialog-keyboard';
import {builtinShelfCoverProject} from '../lib/builtin-works';
import {classicStories} from '@knolstory/compatibility';
import {BookCover} from './book-cover';
import type {BookshelfIntent,BookshelfBook,BookshelfWork} from './local-bookshelf';
import styles from './library-book-focus.module.css';

/** Online controls for a personal book, split so destructive ones sit at the bottom of ‘관리’. */
export type BookFocusOnlineTools={status?:ReactNode;manage?:ReactNode;danger?:ReactNode};
type Edition='original'|'knolstory';
const EDITION_LABEL:Record<Edition,string>={original:'원작',knolstory:'놀스토리'};
/** How each way of reading differs, in a word or two (2026-11-23). */
const KIND:Record<Edition|'shortstory',string>={original:'전래 이야기',knolstory:'선택형 이야기',shortstory:'그림책'};

export function CloseGlyph(){return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17"/></svg>;}

/**
 * The book dialog finishes on its first screen (2026-11-23): the cover chosen on the shelf, the title,
 * one row per way of reading and 편집하기. A built-in work asks which edition to edit only after
 * 편집하기; the summary, author's note and making/managing tools follow below.
 */
export function LibraryBookFocus({works,selected,onSelect,onClose,onOpen,disabled,onExport,onDelete,onDuplicate,onlineTools,onMove,count}:{onlineTools?:BookFocusOnlineTools;onMove?:(delta:number)=>void;count?:number;works:readonly BookshelfBook[];selected:BookshelfBook;onSelect:(key:string)=>void;onClose:()=>void;onOpen:(key:string,intent:BookshelfIntent)=>void;disabled:boolean;onExport?:(key:string)=>void;onDelete?:(key:string)=>void;onDuplicate?:(key:string)=>void}){
 const dialog=useRef<HTMLDialogElement>(null),more=useRef<HTMLDetailsElement>(null),title=useId();
 useEffect(()=>{const opener=document.activeElement as HTMLElement|null;const node=dialog.current;node?.showModal();return()=>{node?.close();opener?.focus();};},[]);
 const index=works.findIndex(work=>work.key===selected.key);
 const move=(delta:number)=>{if(onMove){onMove(delta);return;}if(works.length>1)onSelect(works[(index+delta+works.length)%works.length].key);};
 const builtin=selected.builtin;
 // Choosing an edition to edit or manage never changes the cover the reader picked on the shelf.
 const [choice,setChoice]=useState<{key:string;picking:boolean;target:Edition}>({key:selected.key,picking:false,target:'knolstory'});
 const current=choice.key===selected.key?choice:{key:selected.key,picking:false,target:builtin?.knolstory?'knolstory' as const:'original' as const};
 const update=(next:Partial<typeof current>)=>setChoice({...current,...next});
 useEffect(()=>{if(more.current)more.current.open=false;},[selected.key]);
 const editions:Edition[]=builtin?[...(builtin.original?['original' as const]:[]),...(builtin.knolstory?['knolstory' as const]:[])]:[];
 const edition=(item:Edition):BookshelfWork|undefined=>item==='original'?builtin?.original:builtin?.knolstory;
 const target:BookshelfWork=(builtin?edition(current.target)??edition(editions[0]!):undefined)??selected;
 const cover=builtin?builtinShelfCoverProject(selected,classicStories):selected.project;
 const coverKind=builtin?(selected.kind==='example'?'knolstory':selected.kind):selected.kind==='example'?'knolstory':selected.kind;
 const personal=selected.kind==='own'||selected.kind==='imported';
 const modified=Date.parse(selected.project.updatedAt);
 const action=(name:string)=>({'data-focus-action':name});
 const readRow=(work:BookshelfWork,label:string,kind?:string)=><div key={work.key} className={styles.readRow} data-edition={work.kind==='example'?'knolstory':work.kind}>
  <button className={styles.readButton} {...action(work.canResume?'resume':'read')} aria-label={[label,work.canResume?'이어읽기':'읽기'].filter(Boolean).join(' ')} aria-describedby={kind&&!work.canResume?`${title}-${work.key}-kind`:undefined} disabled={disabled||(!work.canResume&&!work.project.lines.length)} onClick={()=>onOpen(work.key,work.canResume?'resume':'start')}>
   <strong>{[label,work.canResume?'이어읽기':'읽기'].filter(Boolean).join(' ')}</strong>{kind&&!work.canResume&&<small id={`${title}-${work.key}-kind`}>{kind}</small>}
  </button>
  {work.canResume&&<button className={styles.restart} {...action('restart')} aria-label={`${label?`${label} `:''}처음부터 읽기`} disabled={disabled||!work.project.lines.length} onClick={()=>onOpen(work.key,'start')}>처음부터</button>}
 </div>;
 return <dialog ref={dialog} className={styles.dialog} aria-labelledby={title} data-work-id={builtin?.id} data-cover-edition={coverKind} onCancel={event=>{event.preventDefault();if(current.picking){update({picking:false});return;}onClose();}} onKeyDown={event=>{trapDialogTab(event,dialog.current);if(event.target instanceof HTMLInputElement||event.target instanceof HTMLTextAreaElement||event.target instanceof HTMLSelectElement)return;if(event.key==='ArrowLeft'){event.preventDefault();move(-1);}if(event.key==='ArrowRight'){event.preventDefault();move(1);}}}>
  <button className={styles.close} onClick={onClose} aria-label="닫기 · 서재로 돌아가기"><CloseGlyph/></button>
  <div className={styles.showcase}><button className={styles.arrow} disabled={(count??works.length)<2} onClick={()=>move(-1)} aria-label="이전 책">‹</button><figure><div className={styles.book} aria-hidden="true"><BookCover project={cover} edition={coverKind}/></div><div className={styles.pedestal} aria-hidden="true"/>{onlineTools?.status&&<figcaption>{onlineTools.status}</figcaption>}</figure><button className={styles.arrow} disabled={(count??works.length)<2} onClick={()=>move(1)} aria-label="다음 책">›</button></div>
  <h2 id={title} className={styles.title}>{builtin?.title??<NumberedTitle title={selected.project.title}/>}</h2>
  <div className={styles.actions}>
   <div className={styles.readRows} role="group" aria-label="읽기">
    {builtin?<>
     {builtin.original&&readRow(builtin.original,'원작',KIND.original)}
     {builtin.knolstory&&readRow(builtin.knolstory,'놀스토리',KIND.knolstory)}
     <div className={styles.readRow} data-edition="shortstory"><a className={styles.readButton} {...action('shortstory-read')} href={`/shortstory/?work=${builtin.id}&mode=read`} aria-label="숏스토리 읽기" aria-describedby={`${title}-shortstory-kind`} aria-disabled={disabled} onClick={event=>{if(disabled)event.preventDefault();}}><strong>숏스토리 읽기</strong><small id={`${title}-shortstory-kind`}>{KIND.shortstory}</small></a></div>
    </>:readRow(selected,'')}
   </div>
   {builtin&&current.picking?<div className={styles.editPick} role="group" aria-label="편집할 판 고르기">
    <p>어느 판으로 내 사본을 만들까요? 원래 책은 그대로예요.</p>
    <div>{editions.map(item=><button key={item} {...action('edit')} disabled={disabled} onClick={()=>onOpen(edition(item)!.key,'edit')}>{EDITION_LABEL[item]}{item==='original'?'으로':'로'} 편집</button>)}</div>
    <button className={styles.cancelPick} onClick={()=>update({picking:false})}>취소</button>
   </div>:<button className={styles.edit} {...action(builtin?'edit-pick':'edit')} disabled={disabled} aria-expanded={builtin?false:undefined} onClick={()=>builtin?(editions.length>1?update({picking:true}):onOpen(edition(editions[0]!)!.key,'edit')):onOpen(selected.key,'edit')}>편집하기</button>}
  </div>
  <section className={styles.meta} aria-label="작품 소개">
   {target.project.cover?.subtitle&&target.project.cover.subtitle!==target.project.description&&<p className={styles.subtitle}>{target.project.cover.subtitle}</p>}
   {(builtin?target:selected).project.description&&<p className={styles.description}>{(builtin?target:selected).project.description}</p>}
   {target.project.cover?.author&&<small>지은이 · {target.project.cover.author}</small>}
   {target.project.cover?.authorNote&&<details className={styles.authorNote}><summary>작가의 말</summary><p>{target.project.cover.authorNote}</p></details>}
  </section>
  <details ref={more} className={styles.more} onToggle={event=>{const node=event.currentTarget;if(node.open)requestAnimationFrame(()=>node.scrollIntoView({block:'nearest'}));}}>
   <summary>더보기</summary>
   <div className={styles.sheet}>
    {builtin&&editions.length>1&&<fieldset className={styles.target}><legend>도구를 쓸 판</legend><div>{editions.map(item=><label key={item}><input type="radio" name={`${title}-target`} value={item} checked={current.target===item} onChange={()=>update({target:item})}/><span>{EDITION_LABEL[item]}</span></label>)}</div></fieldset>}
    <section aria-label="만들기"><h3>만들기</h3>
     {builtin&&<p className={styles.sheetNote}>표지와 정보는 ‘{EDITION_LABEL[current.target]}’ 내 사본에서 고쳐요. 원래 책은 그대로예요.</p>}
     <div className={styles.sheetActions}>
      <button {...action('cover')} disabled={disabled} onClick={()=>onOpen(target.key,'cover')}>책 표지 편집</button>
      <button {...action('prepare')} disabled={disabled} onClick={()=>onOpen(target.key,'prepare')}>작품 정보·기획</button>
     </div>
    </section>
    <section aria-label="관리"><h3>관리</h3>
     {onlineTools?.manage&&<div className={styles.online}>{onlineTools.manage}</div>}
     <div className={styles.sheetActions}>
      {onExport&&<button {...action('export')} disabled={disabled} onClick={()=>onExport(target.key)}>작품 파일 내보내기</button>}
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
