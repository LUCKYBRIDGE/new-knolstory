'use client';
/* eslint-disable @next/next/no-img-element -- static ShortStory pages and print illustration */
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { newShortStory, newShortStoryPage, decodeShortStory, encodeShortStory, exportShortStoryExcel, importShortStoryExcel, importShortStoryTable, exportShortStoryTable, serializeTableTsv, parseTableTsv, googleSheetTsvUrl, shortStoryOriginals, getShortStoryOriginal, isShortStoryWorkKey, type ShortStoryProject } from '@knolstory/compatibility';
import { resolveAsset } from '@knolstory/asset-registry';
import { AssetPickerField } from '../../components/asset-picker-field';
import { BookCover } from '../../components/book-cover';
import { BookCoverEditor } from '../../components/book-cover-editor';
import { shortStoryCoverProject, applyShortStoryCover } from '../../lib/shortstory-cover';
import { trapDialogTab } from '../../lib/dialog-keyboard';
import { SHORTSTORY_LIBRARY_KEY, SHORTSTORY_LEGACY_KEY, loadShortStoryLibrary, emptyShortStoryLibrary, addShortStoryBook, copyShortStoryBook, deleteShortStoryBook, restoreShortStoryBook, saveShortStoryLibrary, type ShortStoryLibrary } from '../../lib/shortstory-library';
import styles from './shortstory.module.css';
type Project=ShortStoryProject;
type Page=Project['pages'][number];
const originalById=(id:string)=>{const book=shortStoryOriginals.find(book=>book.id===id);return book?getShortStoryOriginal(book.key):undefined;};
function Art({page,label}:{page:Pick<Page,'backgroundId'|'leftAssetId'|'rightAssetId'>;label:string}) {
 const background=resolveAsset(page.backgroundId),left=resolveAsset(page.leftAssetId),right=resolveAsset(page.rightAssetId);
 return <div className={styles.art} role="img" aria-label={label}>
  {background&&<img className={styles.background} src={background.src} alt=""/>}
  {left&&<img className={styles.left} src={left.src} alt=""/>}{right&&<img className={styles.right} src={right.src} alt=""/>}
  {!background&&!left&&!right&&<span>그림 없는 쪽</span>}
 </div>;
}
function download(content:BlobPart,name:string,type:string) {
 const url=URL.createObjectURL(new Blob([content],{type}));const link=document.createElement('a');link.href=url;link.download=name.replace(/[\\/:*?"<>|\u0000-\u001f]/g,'_');link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function DeleteConfirmation({description,onDelete,onCancel}:{description:string;onDelete:()=>void;onCancel:()=>void}) {
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const opener=document.activeElement as HTMLElement|null;const dialog=ref.current;dialog?.showModal();return()=>{dialog?.close();if(opener?.isConnected&&opener!==document.body)opener.focus();else document.querySelector<HTMLElement>('main a')?.focus();};},[]);
 return <dialog ref={ref} className={styles.confirm} aria-label="삭제 확인" onKeyDown={event=>trapDialogTab(event,ref.current)} onCancel={event=>{event.preventDefault();onCancel();}}><p>{description}</p><button autoFocus onClick={onCancel}>취소</button><button onClick={onDelete}>삭제 확인</button></dialog>;
}
export function ShortStoryWorkspace() {
 const [library,setLibrary]=useState<ShortStoryLibrary|null>(null),[project,setProject]=useState<Project|null>(null);
 const [index,setIndex]=useState(0),[editing,setEditing]=useState(true),[coverOpen,setCoverOpen]=useState(false);
 const [notice,setNotice]=useState(''),[error,setError]=useState(''),[blocked,setBlocked]=useState(false),[sheet,setSheet]=useState(''),[busy,setBusy]=useState(false);
 const [deleteTarget,setDeleteTarget]=useState<'book'|'page'|null>(null),[deletedPage,setDeletedPage]=useState<{bookId:string;page:Page;index:number}|null>(null);
 const file=useRef<HTMLInputElement>(null),dirty=useRef(false),latest=useRef<ShortStoryLibrary|null>(null);
 useEffect(()=>{const timer=setTimeout(()=>{
  try {
   let loaded=loadShortStoryLibrary(localStorage);const params=new URLSearchParams(window.location.search),key=params.get('work');
   if(key!==null&&!isShortStoryWorkKey(key))throw Error('지원하는 네 작품의 그림책 주소를 확인해 주세요.');
   let selected:Project|undefined=isShortStoryWorkKey(key)?getShortStoryOriginal(key):loaded.books.find(book=>book.id===loaded.activeId)??originalById(loaded.activeId);
   const read=isShortStoryWorkKey(key)&&params.get('mode')!=='edit';
   if(!selected){loaded=addShortStoryBook(loaded,newShortStory());selected=loaded.books.at(-1)!;saveShortStoryLibrary(localStorage,loaded);}
   if(isShortStoryWorkKey(key)&&params.get('mode')==='edit'){loaded=copyShortStoryBook(loaded,selected);selected=loaded.books.at(-1)!;saveShortStoryLibrary(localStorage,loaded);window.history.replaceState(null,'',window.location.pathname);}
   loaded={...loaded,activeId:selected.id};latest.current=loaded;setLibrary(loaded);setProject(selected);setIndex(Math.min(loaded.positions[selected.id]??0,selected.pages.length-1));setEditing(!read&&!originalById(selected.id));
  }catch(e){setError(`보관함을 열지 못했어요. 원본을 보존하고 복구해 주세요. ${e instanceof Error?e.message:''}`);setBlocked(true);const empty=emptyShortStoryLibrary();latest.current=empty;setLibrary(empty);const key=new URLSearchParams(window.location.search).get('work');setProject(isShortStoryWorkKey(key)?getShortStoryOriginal(key):newShortStory());setEditing(false);}
 },0);return()=>clearTimeout(timer);},[]);
 useEffect(()=>{const flush=()=>{if(!latest.current||blocked)return;try{saveShortStoryLibrary(localStorage,latest.current);dirty.current=false;}catch{dirty.current=true;}};const leave=(event:BeforeUnloadEvent)=>{flush();if(dirty.current){event.preventDefault();}};window.addEventListener('pagehide',flush);window.addEventListener('beforeunload',leave);return()=>{window.removeEventListener('pagehide',flush);window.removeEventListener('beforeunload',leave);};},[blocked]);
 if(!project||!library)return <main className={styles.shell}><p>그림책을 여는 중이에요.</p></main>;
 const original=!!originalById(project.id),current=project.pages[Math.min(index,project.pages.length-1)];
 const commit=(next:ShortStoryLibrary,preserveDraft=false)=>{if(blocked)return false;try{saveShortStoryLibrary(localStorage,next);latest.current=next;setLibrary(next);dirty.current=false;setError('');setNotice('이 기기에 저장했어요.');return true;}catch{if(preserveDraft){latest.current=next;setLibrary(next);}dirty.current=true;setError('기기에 저장하지 못했어요. 파일로 보관하거나 저장을 다시 시도해 주세요. 저장할 때까지 다른 그림책으로 전환하지 않아요.');return false;}};
 const update=(next:Project,targetIndex=index)=>{if(original||blocked)return;const changed={...next,updatedAt:new Date().toISOString()};setProject(changed);commit({...library,books:library.books.map(book=>book.id===changed.id?changed:book),positions:{...library.positions,[changed.id]:targetIndex}},true);};
 const patch=(values:Partial<Page>)=>update({...project,pages:project.pages.map(page=>page.id===current.id?{...page,...values}:page)});
 const position=(target:number)=>{setIndex(target);if(!blocked)commit({...library,positions:{...library.positions,[project.id]:target}},true);};
 const switchBook=(id:string,read=false)=>{if(blocked||!commit(latest.current??library))return;const selected=library.books.find(book=>book.id===id)??originalById(id);if(!selected)return;const next={...library,activeId:id};if(!commit(next))return;setProject(selected);setIndex(Math.min(next.positions[id]??0,selected.pages.length-1));setEditing(!read&&!originalById(id));setDeletedPage(null);setDeleteTarget(null);setCoverOpen(false);window.history.replaceState(null,'',isShortStoryWorkKey(shortStoryOriginals.find(book=>book.id===id)?.key??null)?`?work=${shortStoryOriginals.find(book=>book.id===id)!.key}&mode=read`:window.location.pathname);};
 const accept=(next:Project,copy=false)=>{if(blocked||!commit(latest.current??library))return;const currentLibrary=latest.current??library;const nextLibrary=copy?copyShortStoryBook(currentLibrary,next):addShortStoryBook(currentLibrary,next);if(!commit(nextLibrary))return;setProject(nextLibrary.books.at(-1)!);setIndex(0);setEditing(true);setDeletedPage(null);setDeleteTarget(null);window.history.replaceState(null,'',window.location.pathname);setNotice(copy?'원본을 보존한 내 사본을 만들었어요.':'기존 그림책을 보존하고 새 책으로 보관했어요.');};
 const run=async(action:()=>Promise<void>)=>{setBusy(true);setError('');try{await action();}catch(e){setError(e instanceof Error?e.message:'자료를 열지 못했어요.');}finally{setBusy(false);}};
 const add=()=>{const page=newShortStoryPage();update({...project,pages:[...project.pages.slice(0,index+1),page,...project.pages.slice(index+1)].map((page,i)=>({...page,order:i+1}))},index+1);setIndex(index+1);};
 const move=(offset:number)=>{const target=index+offset;if(target<0||target>=project.pages.length)return;const pages=project.pages.filter(page=>page.id!==current.id);update({...project,pages:[...pages.slice(0,target),current,...pages.slice(target)].map((page,i)=>({...page,order:i+1}))},target);setIndex(target);};
 const removeBook=()=>{const next=deleteShortStoryBook(library,project.id);const selected=next.books[0]??getShortStoryOriginal('rabbit');if(!commit({...next,activeId:selected.id}))return;setProject(selected);setIndex(Math.min(next.positions[selected.id]??0,selected.pages.length-1));setEditing(!originalById(selected.id));setDeleteTarget(null);};
 const coverProject=shortStoryCoverProject(project),credit=shortStoryOriginals.find(book=>book.id===project.id)?.credit;
 const workspace=(<div className={styles.workspace}>
   <nav className={styles.contents} aria-label="그림책 쪽 목록"><h2>전체 구성 · {project.pages.length}쪽</h2>{project.pages.map((page,i)=><button key={page.id} aria-current={i===index?'page':undefined} onClick={()=>position(i)}>{i+1}쪽 · {page.title||'제목 없는 쪽'}</button>)}</nav>
   <section className={styles.focus} aria-label={editing?'숏스토리 쓰기':'숏스토리 읽기'}><h2>{index+1}쪽{current.title&&` · ${current.title}`}</h2><Art page={current} label={`${index+1}쪽 삽화`}/>
    {editing&&!original?<fieldset disabled={blocked}><label>이 쪽 제목<input value={current.title} onChange={event=>patch({title:event.target.value})}/></label><label>이 쪽의 이야기<textarea rows={7} value={current.text} onChange={event=>patch({text:event.target.value})}/></label><details><summary>이 쪽 그림 고르기</summary><div className={styles.metadata}><AssetPickerField label="쪽 배경" type="background" value={current.backgroundId} onChange={id=>patch({backgroundId:id})}/><AssetPickerField label="왼쪽 인물" type="character" value={current.leftAssetId} onChange={id=>patch({leftAssetId:id})}/><AssetPickerField label="오른쪽 인물" type="character" value={current.rightAssetId} onChange={id=>patch({rightAssetId:id})}/></div></details><div className={styles.actions}><button disabled={project.pages.length>=500} onClick={add}>현재 쪽 뒤에 빈 쪽 추가</button><button disabled={project.pages.length>=500} onClick={()=>{const copy={...current,id:crypto.randomUUID()};update({...project,pages:[...project.pages.slice(0,index+1),copy,...project.pages.slice(index+1)].map((page,i)=>({...page,order:i+1}))},index+1);setIndex(index+1);}}>현재 쪽 복제</button><button disabled={index===0} onClick={()=>move(-1)}>쪽 앞으로 이동</button><button disabled={index===project.pages.length-1} onClick={()=>move(1)}>쪽 뒤로 이동</button><button disabled={project.pages.length===1} onClick={()=>setDeleteTarget('page')}>현재 쪽 삭제</button>{deletedPage?.bookId===project.id&&<button onClick={()=>{const at=Math.min(deletedPage.index,project.pages.length);update({...project,pages:[...project.pages.slice(0,at),deletedPage.page,...project.pages.slice(at)].map((page,i)=>({...page,order:i+1}))},at);setIndex(at);setDeletedPage(null);}}>쪽 삭제 되돌리기</button>}</div></fieldset>:<p className={styles.storyText}>{current.text||'아직 글이 없는 쪽이에요.'}</p>}
    <nav className={styles.actions} aria-label="숏스토리 쪽 이동"><button disabled={index===0} onClick={()=>position(index-1)}>이전 쪽</button><span>{index+1} / {project.pages.length}</span><button disabled={index===project.pages.length-1} onClick={()=>position(index+1)}>다음 쪽</button></nav>
   </section>
  </div>);
 return <main className={styles.shell}>
  <header className={styles.header}><div><Link href="/">놀스토리 서재로 돌아가기</Link><h1>숏스토리 그림책</h1>{!editing&&<h2 className={styles.bookTitle}>{project.title}</h2>}<p>{original?'원본 그림책을 읽고 내 사본으로 글을 써요.':'그림과 글을 구성하고 내 그림책으로 보관해요.'}</p></div><div className={styles.actions}><button disabled={blocked} onClick={()=>{if(original)accept(project,true);else setEditing(true);}} aria-pressed={editing}>{original?'내 사본으로 쓰기':'쓰기'}</button><button onClick={()=>setEditing(false)} aria-pressed={!editing}>읽기</button></div></header>
  {error&&<p role="alert" className={styles.error}>{error}</p>}{notice&&<p role="status">{notice}</p>}
  {!editing&&workspace}
  {blocked&&<div className={styles.actions}><button onClick={()=>{const raw=localStorage.getItem(SHORTSTORY_LIBRARY_KEY)??localStorage.getItem(SHORTSTORY_LEGACY_KEY);if(raw)download(raw,'그림책-복구원본.json','application/json');}}>복구용 원본 보관</button><button onClick={()=>{if(!window.confirm('열리지 않는 보관함을 복구용으로 따로 보존하고 새 보관함을 시작할까요?'))return;try{const raw=localStorage.getItem(SHORTSTORY_LIBRARY_KEY)??localStorage.getItem(SHORTSTORY_LEGACY_KEY);if(raw)localStorage.setItem(`knolstory-shortstory-recovery-${Date.now()}`,raw);const next=addShortStoryBook(emptyShortStoryLibrary(),newShortStory());saveShortStoryLibrary(localStorage,next);latest.current=next;setLibrary(next);setProject(next.books[0]);setBlocked(false);setEditing(true);setError('');setIndex(0);}catch{setError('복구 원본 보관과 저장에 실패했어요. 파일로 먼저 보관해 주세요.');}}}>보관함 새로 시작</button></div>}
  <details className={styles.library} open><summary>그림책 보관함 · 내 그림책 {library.books.length}권</summary><div className={styles.bookList}>
   <section aria-label="기본 그림책"><h2>네 작품 원본</h2>{shortStoryOriginals.map(book=><button key={book.id} disabled={blocked} aria-pressed={project.id===book.id} onClick={()=>switchBook(book.id,true)}>{book.title} · 원본 읽기</button>)}</section>
   <section aria-label="내 그림책 목록"><h2>내 그림책</h2>{library.books.length?library.books.map(book=><button key={book.id} disabled={blocked} aria-pressed={project.id===book.id} onClick={()=>switchBook(book.id)}>{book.title}</button>):<p>원본에서 사본을 만들거나 새 그림책을 시작해요.</p>}</section>
   {!!library.deleted.length&&<section aria-label="삭제한 그림책 복구"><h2>삭제한 그림책</h2>{library.deleted.map(book=><button disabled={blocked} key={book.id} onClick={()=>{const next=restoreShortStoryBook(library,book.id);if(commit(next)){setProject(book);setIndex(Math.min(next.positions[book.id]??0,book.pages.length-1));setEditing(true);window.history.replaceState(null,'',window.location.pathname);}}}>{book.title} 복구</button>)}</section>}
  </div></details>
  <section className={styles.tools} aria-label="그림책 파일과 이름">
   <label>이야기 제목<input value={project.title} readOnly={original||!editing} disabled={blocked} onChange={event=>update({...project,title:event.target.value})}/></label>
   <label>지은이<input value={project.authorDisplayName} readOnly={original||!editing} disabled={blocked} onChange={event=>update({...project,authorDisplayName:event.target.value})}/></label>
   {original&&<p className={styles.originalNotice}>기본 제공 원본은 그대로 보존해요. <span>{credit}</span></p>}
   <div className={styles.actions}><button disabled={blocked} onClick={()=>commit(latest.current??library)}>이 기기에 저장</button><button onClick={()=>void run(async()=>download(encodeShortStory(project),`${project.title||'그림책'}.shortstory`,'application/json'))}>.shortstory로 보관</button><button disabled={busy} onClick={()=>void run(async()=>{download(new Uint8Array(await exportShortStoryExcel(project)),`${project.title||'그림책'}.xlsx`,'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');})}>Excel로 보관</button><button onClick={()=>void run(async()=>download(serializeTableTsv(exportShortStoryTable(project)),`${project.title||'그림책'}.tsv`,'text/tab-separated-values'))}>시트용 TSV 보관</button><button disabled={busy||blocked} onClick={()=>file.current?.click()}>파일 가져오기</button><button disabled={blocked} onClick={()=>accept(newShortStory())}>새 그림책</button><button disabled={blocked} onClick={()=>accept(project,true)}>내 사본 만들기</button><button onClick={()=>window.print()}>A4 인쇄</button>{!original&&<button disabled={blocked} onClick={()=>setDeleteTarget('book')}>이 그림책 삭제</button>}</div>
   <input className={styles.hidden} ref={file} type="file" accept=".shortstory,.xlsx,.tsv,.json" aria-label="숏스토리 파일 가져오기" onChange={event=>{const selected=event.target.files?.[0];event.target.value='';if(selected)void run(async()=>{if(selected.size>20*1024*1024)throw Error('20MB 이하의 그림책 파일을 선택해 주세요.');const next=selected.name.endsWith('.xlsx')?await importShortStoryExcel(new Uint8Array(await selected.arrayBuffer())):selected.name.endsWith('.tsv')?importShortStoryTable(parseTableTsv(await selected.text())):decodeShortStory(await selected.text());accept(next);});}}/>
   <details><summary>표지·소개·공개 Google 시트</summary><div className={styles.metadata}>
    <div className={styles.coverPreview}><BookCover project={coverProject} edition={original?'original':'own'}/></div>
    <div>{!original&&<button disabled={blocked} onClick={()=>setCoverOpen(true)}>표지 꾸미기</button>}
    <label>이야기 소개<textarea disabled={blocked||original||!editing} value={project.description} onChange={event=>update({...project,description:event.target.value})}/></label><label>마지막 인사<textarea disabled={blocked||original||!editing} value={project.cover.authorNote} onChange={event=>update({...project,cover:{...project.cover,authorNote:event.target.value}})}/></label>
    {!original&&editing&&<><AssetPickerField label="표지 배경" type="background" value={project.cover.backgroundId} onChange={id=>{if(!blocked)update({...project,cover:{...project.cover,backgroundId:id}});}}/><AssetPickerField label="표지 인물" type="character" value={project.cover.characterId} onChange={id=>{if(!blocked)update({...project,cover:{...project.cover,characterId:id}});}}/></>}</div>
    <label>공개 Google 시트 주소<input value={sheet} onChange={event=>setSheet(event.target.value)}/></label><button disabled={busy||blocked||!sheet.trim()} onClick={()=>void run(async()=>{const response=await fetch(googleSheetTsvUrl(sheet));if(!response.ok)throw Error('공개 시트를 읽지 못했어요. 게시 설정을 확인해 주세요.');accept(importShortStoryTable(parseTableTsv(await response.text())));})}>시트 가져오기</button>
   </div></details>
  </section>
  {deleteTarget&&<DeleteConfirmation description={deleteTarget==='book'?`‘${project.title}’ 그림책을 보관함에서 삭제할까요? 삭제한 그림책에서 복구할 수 있어요.`:`${index+1}쪽을 삭제할까요? 이 책에서 쪽 삭제 되돌리기로 복구할 수 있어요.`} onCancel={()=>setDeleteTarget(null)} onDelete={()=>{if(deleteTarget==='book'){removeBook();return;}setDeletedPage({bookId:project.id,page:current,index});update({...project,pages:project.pages.filter(page=>page.id!==current.id).map((page,i)=>({...page,order:i+1}))},Math.max(0,index-1));setIndex(Math.max(0,index-1));setDeleteTarget(null);}}/>}
  {editing&&workspace}
  <section className={styles.printBook} data-shortstory-print aria-label="A4 그림책 인쇄"><article className={styles.printCover}><div className={styles.printCoverArt}><BookCover project={coverProject} edition={original?'original':'own'}/></div><p>{project.description}</p><p>{project.authorDisplayName&&`${project.authorDisplayName} 지음`}</p></article>{project.pages.map((page,i)=><article key={page.id}><Art page={page} label={`${i+1}쪽 삽화`}/><h2>{page.title}</h2><p>{page.text}</p><small>{i+1}쪽</small></article>)}{project.cover.authorNote&&<article><h2>{project.title}</h2><p>{project.cover.authorNote}</p></article>}</section>
  {coverOpen&&!original&&<BookCoverEditor project={coverProject} onCancel={()=>setCoverOpen(false)} onApply={(cover,title)=>{update(applyShortStoryCover(project,cover,title));setCoverOpen(false);}}/>}
 </main>;
}
