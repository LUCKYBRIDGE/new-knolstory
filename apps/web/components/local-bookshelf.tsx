'use client';
import {useEffect,useRef,useState,type CSSProperties,type ReactNode} from 'react';
import {findLibraryBooks,libraryPage,parseLibraryView,LIBRARY_VIEW_KEY,shelfLayoutForWidth,isPersonalLibraryKind} from '../lib/library-catalog';
import {groupBuiltinWorks,builtinShelfCoverProject,type GroupedBuiltinWork} from '../lib/builtin-works';
import {classicStories} from '@knolstory/compatibility';
import {LibraryBookFocus} from './library-book-focus';
import {BookCover} from './book-cover';
import {shelfCoverAccessibleLabel} from '../lib/shelf-cover-label';
import type {StoryProject} from '@knolstory/story-domain';
import {NewStoryForm} from './new-story-form';
import styles from './local-bookshelf.module.css';
import type {OnlineDocumentMetadata} from '../lib/document-api';
import type {OnlineShelfStatus} from '../lib/unified-library';
import {LibraryStorageBadge,StorageIcon} from './library-storage';
import {OnlineBookFocus} from './online-book-focus';
export type BookshelfOnline={records:readonly OnlineDocumentMetadata[];byLocalKey:Record<string,OnlineShelfStatus>;header?:ReactNode;onOpen:(record:OnlineDocumentMetadata)=>void;renderLocalActions:(work:BookshelfWork)=>ReactNode;renderRemoteActions:(record:OnlineDocumentMetadata)=>ReactNode;busy:boolean;more?:boolean;onMore:()=>void};
export type BookshelfWork={key:string;project:StoryProject;kind:'own'|'imported'|'example'|'original';canResume:boolean};
export type BookshelfBook=GroupedBuiltinWork<BookshelfWork>;
export type BookshelfIntent='edit'|'start'|'resume'|'prepare'|'cover';
export type LocalBookshelfProps={online?:BookshelfOnline;accountMenu?:ReactNode;navigation?:ReactNode;works:readonly BookshelfWork[];onOpen:(key:string,intent:BookshelfIntent)=>void;onCreate:(title:string)=>boolean|void;onImport:(file:File)=>void;disabled?:boolean;notice?:string;onExport?:(key:string)=>void;onDelete?:(key:string)=>void;onDuplicate?:(key:string)=>void;onIntroduction?:()=>void;deleted?:{title:string};onRestore?:()=>void};
const sections=[{kind:'builtin',title:'기본 작품'},{kind:'own',title:'내 작품'}] as const;
export function LocalBookshelf({online,accountMenu,navigation,works,onOpen,onCreate,onImport,disabled=false,notice,onIntroduction,onExport,onDelete,onDuplicate,deleted,onRestore}:LocalBookshelfProps){
 const room=useRef<HTMLElement>(null),cases=useRef<HTMLDivElement>(null),tools=useRef<HTMLDetailsElement>(null),composing=useRef(false);
 useEffect(()=>{const dismiss=(event:PointerEvent)=>{if(tools.current?.open&&event.target instanceof Node&&!tools.current.contains(event.target))tools.current.open=false;};const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'&&!event.isComposing&&event.keyCode!==229&&!composing.current&&tools.current?.open){tools.current.open=false;tools.current.querySelector<HTMLElement>('summary')?.focus();}};document.addEventListener('pointerdown',dismiss);document.addEventListener('keydown',escape);return()=>{document.removeEventListener('pointerdown',dismiss);document.removeEventListener('keydown',escape);};},[]);
 const [layout,setLayout]=useState(()=>shelfLayoutForWidth(1000));
 const [initialView]=useState(()=>{try{return parseLibraryView(typeof window==='undefined'?null:sessionStorage.getItem(LIBRARY_VIEW_KEY));}catch{return parseLibraryView(null);}});
 const [filter,setFilter]=useState(initialView.filter),[query,setQuery]=useState(initialView.query),[pages,setPages]=useState(initialView.pages),[selected,setSelected]=useState<string|null>(null),[selectedRemote,setSelectedRemote]=useState<string|null>(null);
 useEffect(()=>{try{sessionStorage.setItem(LIBRARY_VIEW_KEY,JSON.stringify({version:1,filter,query,pages}));}catch{/* Optional browsing preferences never prevent using the library. */}},[filter,query,pages]);
 useEffect(()=>{
  const root=room.current,rack=cases.current;if(!root||!rack)return;
  const fit=()=>{const next=shelfLayoutForWidth(rack.clientWidth);setLayout(current=>current.columns===next.columns?current:next);const floor=rack.getBoundingClientRect().bottom-root.getBoundingClientRect().top;root.style.setProperty('--room-image-height',`${floor/.805}px`);};
  const observer=new ResizeObserver(fit);observer.observe(rack);observer.observe(root);fit();return()=>observer.disconnect();
 },[]);
 const grouped=groupBuiltinWorks(works);
 const sectionOf=(work:BookshelfBook)=>work.builtin||work.kind==='original'||work.kind==='example'?'builtin':isPersonalLibraryKind(work.kind)?'own':work.kind;
 const ordered=sections.flatMap(section=>grouped.filter(work=>sectionOf(work)===section.kind));
 const localVisible=findLibraryBooks(ordered.filter(work=>filter==='all'||sectionOf(work)===filter||(sectionOf(work)==='builtin'&&(filter==='original'||filter==='example'))),query);
 const needle=query.normalize('NFC').trim().toLocaleLowerCase('ko-KR');
 const remoteVisible=(filter==='all'||filter==='own')?(online?.records??[]).filter(record=>record.title.normalize('NFC').toLocaleLowerCase('ko-KR').includes(needle)):[];
 const visible=[...localVisible.map(work=>({kind:'local' as const,key:work.key,work})),...remoteVisible.map(record=>({kind:'remote' as const,key:record.recordId,record}))];
 const pageKey=filter,pagination=libraryPage(visible,pages[pageKey]??0,layout.capacity);
 const occupiedRows=Math.max(2,Math.min(layout.rows,Math.ceil(pagination.items.length/layout.columns))),displaySlots=occupiedRows*layout.columns;
 const selectedWork=localVisible.find(work=>work.key===selected),selectedOnline=remoteVisible.find(record=>record.recordId===selectedRemote);
 // Clear a removed card selection so restoring that record does not reopen its dialog.
 if(selectedRemote!==null&&!selectedOnline)setSelectedRemote(null);
 function moveSelection(delta:number){const index=visible.findIndex(entry=>entry.kind==='local'?entry.key===selected:entry.key===selectedRemote);const next=visible[(index+delta+visible.length)%visible.length];if(next?.kind==='local'){setSelected(next.key);setSelectedRemote(null);}else if(next){setSelected(null);setSelectedRemote(next.key);}}
 return <main ref={room} className={styles.library} aria-label="놀스토리 서재">
  {navigation&&<div className={styles.serviceNavigation}>{navigation}</div>}
  <header className={styles.header}>
   <h1>놀스토리 서재</h1>
   <div className={styles.headerTools}>
    {accountMenu}
    {onIntroduction&&<button className={styles.introLink} onClick={onIntroduction}>책 소개</button>}
    <label className={styles.classification}><span className={styles.semantic}>책 분류</span><select aria-label="책 분류" value={filter} onChange={event=>{setFilter(event.target.value);if(tools.current)tools.current.open=false;}}><option value="all">모든 작품</option>{sections.map(section=><option key={section.kind} value={section.kind}>{section.title}</option>)}{onRestore&&<option value="deleted">삭제한 작품</option>}</select></label>
    <details ref={tools} onBlurCapture={()=>{composing.current=false;}} onCompositionStart={()=>{composing.current=true;}} onCompositionEnd={()=>{composing.current=false;}} onToggle={event=>{if(!event.currentTarget.open)composing.current=false;}} className={styles.tools} data-testid="library-tools"><summary>책 찾기·추가</summary><div className={styles.toolsPanel}>
     <label className={styles.search}>책 찾기<input type="search" maxLength={200} placeholder="제목이나 지은이" value={query} onKeyDown={event=>{if(event.key==='Enter'&&!event.nativeEvent.isComposing&&event.nativeEvent.keyCode!==229){event.preventDefault();if(tools.current)tools.current.open=false;tools.current?.querySelector<HTMLElement>('summary')?.focus();}}} onChange={event=>setQuery(event.target.value)}/></label>
     <NewStoryForm disabled={disabled} onCreate={title=>onCreate(title)!==false}/>
     <label className={styles.import}>작품 파일 가져오기<input type="file" accept=".knolstory" aria-label="서재 작품 파일 가져오기" disabled={disabled} onChange={event=>{const file=event.target.files?.[0];if(file)onImport(file);event.target.value='';}}/></label>
     <a href="/shortstory?mode=library">숏스토리 그림책 열기</a><p>다른 기기에서 보려면 작품을 작품 파일로 저장해 두세요.</p>
    </div></details>
   </div>
  </header>
  {online?.header}
  {notice&&<p className={styles.notice} role="status">{notice}</p>}
  <div ref={cases} className={styles.bookcases} style={{'--shelf-columns':layout.columns,'--shelf-rows':occupiedRows,'--shelf-capacity-rows':layout.rows} as CSSProperties}>
   <span className={styles.topPlant} aria-hidden="true"/><span className={`${styles.upright} ${styles.uprightLeft}`} data-cabinet-upright aria-hidden="true"/><span className={`${styles.upright} ${styles.uprightRight}`} data-cabinet-upright aria-hidden="true"/>
   <div className={styles.grid} data-shelf-room="warm" data-columns={layout.columns} data-rows={occupiedRows} data-capacity={layout.capacity}>
    {sections.filter(section=>filter==='all'||filter===section.kind||section.kind==='builtin'&&(filter==='original'||filter==='example')).map(section=><section key={section.kind} className={styles.collection} aria-label={section.title}>
     <h2 className={styles.semantic}>{section.title}</h2>
     {pagination.items.filter(entry=>(entry.kind==='remote'?'own':sectionOf(entry.work))===section.kind).map(entry=>{
      if(entry.kind==='remote'){const record=entry.record;return <article key={`remote:${record.recordId}`} className={styles.card} data-shelf-book="true" data-online-record={record.recordId} aria-label={`내 작품 · ${record.title}`}><span className={styles.plank} aria-hidden="true"/><button className={styles.cover} aria-label={`${record.title} 책 표지와 소개 보기 · 온라인에 있음`} disabled={disabled} onClick={()=>{setSelected(null);setSelectedRemote(record.recordId);}}><span className={styles.remoteCover} aria-hidden="true"><StorageIcon online/><strong>{record.title}</strong><small>놀스토리</small></span><LibraryStorageBadge compact status={{kind:'remote',label:'온라인에 있음',record}}/></button></article>;}
      const work=entry.work,status=online?.byLocalKey[work.key];return <article key={work.key} className={styles.card} data-shelf-book="true" data-work-id={work.builtin?.id} aria-label={`${section.title} · ${work.builtin?.title??work.project.title}`}>
       <span className={styles.plank} aria-hidden="true"/>
       <button className={styles.cover} data-shelf-cover="true" aria-label={`${shelfCoverAccessibleLabel(work.builtin?.title??work.project.title,builtinShelfCoverProject(work,classicStories),work.kind==='example'?'knolstory':work.kind)}${status?` · ${status.label}`:''}`} disabled={disabled} onClick={()=>{setSelectedRemote(null);setSelected(work.key);}}><span aria-hidden="true"><BookCover project={builtinShelfCoverProject(work,classicStories)} compact edition={work.kind==='example'?'knolstory':work.kind}/></span>{status&&<LibraryStorageBadge compact status={status}/>}</button>
       <div className={styles.semantic}><h3>{work.builtin?.title??work.project.title}</h3><p>{work.project.description}</p><p>지은이 · {work.project.cover?.author||'아직 정하지 않았어요'}</p><p>최근 수정 · {work.project.updatedAt||'수정 시점 정보 없음'}</p></div>
      </article>;
     })}
    </section>)}
    {Array.from({length:displaySlots-pagination.items.length},(_,index)=><div key={`empty-${index}`} className={styles.emptySlot} aria-hidden="true"><span className={styles.plank}/></div>)}
    {Array.from({length:occupiedRows},(_,index)=><span key={`rail-${index}`} className={styles.rail} style={{'--shelf-index':index+1} as CSSProperties} data-cabinet-rail aria-hidden="true"/>)}
    {!visible.length&&<div className={styles.emptyMessage} data-empty-shelf>
     {filter==='deleted'?<><p>{deleted?`최근 삭제한 작품 · ${deleted.title}`:'삭제한 작품이 없어요.'}</p><small>가장 최근에 삭제한 내 작품 한 권을 되살릴 수 있어요.</small>{deleted&&<button type="button" disabled={disabled} onClick={()=>{onRestore?.();setFilter('own');}}>{deleted.title} 복구</button>}</>:<>
     <p>{query.trim()?'찾는 제목의 책이 없어요.':filter==='own'?'아직 내 작품이 없어요.':'이 자리는 새로운 이야기를 기다리고 있어요.'}</p>
     {query.trim()?<button type="button" onClick={()=>setQuery('')}>검색 지우기</button>
      :filter==='own'?<button type="button" disabled={disabled} onClick={()=>{if(tools.current){tools.current.open=true;tools.current.querySelector<HTMLButtonElement>('button[aria-expanded]')?.focus();}}}>새 이야기 만들기</button>
      :null}
     </>}
     {filter!=='all'&&!query.trim()&&<button type="button" onClick={()=>setFilter('all')}>모든 작품 보기</button>}
    </div>}
   </div>
   <div className={styles.drawer} role="group" aria-label="책장 서랍" data-drawer-face><span className={styles.drawerHandle} aria-hidden="true"/><nav className={styles.paging} aria-label={`${filter==='all'?'서재':filter==='deleted'?'삭제한 작품':sections.find(section=>section.kind===filter)?.title} 선반 페이지`}><button aria-label="이전 선반" disabled={pagination.page===0} onClick={()=>setPages(current=>({...current,[pageKey]:pagination.page-1}))}>‹</button><span role="status">{pagination.page+1} / {pagination.pages} 선반 · {visible.length}권</span><button aria-label="다음 선반" disabled={pagination.page===pagination.pages-1} onClick={()=>setPages(current=>({...current,[pageKey]:pagination.page+1}))}>›</button></nav></div><span className={styles.base} data-cabinet-base aria-hidden="true"/>
  </div>
  {online?.more&&<div className={styles.loadMore}><button disabled={online.busy||disabled} onClick={online.onMore}>온라인 작품 더 불러오기</button></div>}
  <div className={`${styles.foreground} ${styles.foregroundLeft}`} aria-hidden="true"/><div className={`${styles.foreground} ${styles.foregroundRight}`} aria-hidden="true"/>
  <footer className={styles.roomFooter}>─ ◇ ─<p>오늘도, 새로운 이야기가 기다리고 있어요.</p><small>© 놀퀴즈</small></footer>
  {selectedWork&&<LibraryBookFocus works={localVisible} selected={selectedWork} onMove={moveSelection} count={visible.length} onlineTools={online?.renderLocalActions(selectedWork)} onSelect={setSelected} onClose={()=>setSelected(null)} onOpen={(key,intent)=>{setSelected(null);onOpen(key,intent);}} disabled={disabled} onExport={onExport} onDelete={onDelete} onDuplicate={onDuplicate}/>}
  {selectedOnline&&online&&<OnlineBookFocus record={selectedOnline} onClose={()=>setSelectedRemote(null)} onOpen={()=>online.onOpen(selectedOnline)} disabled={disabled||online.busy} actions={online.renderRemoteActions(selectedOnline)} onMove={moveSelection} count={visible.length}/>}
 </main>;
}
