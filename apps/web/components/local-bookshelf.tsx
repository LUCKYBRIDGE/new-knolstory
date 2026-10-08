'use client';
import {useEffect,useRef,useState,type CSSProperties} from 'react';
import {findLibraryBooks,libraryPage,parseLibraryView,LIBRARY_VIEW_KEY,shelfLayoutForWidth} from '../lib/library-catalog';
import {LibraryBookFocus} from './library-book-focus';
import {BookCover} from './book-cover';
import type {StoryProject} from '@knolstory/story-domain';
import {NewStoryForm} from './new-story-form';
import styles from './local-bookshelf.module.css';
export type BookshelfWork={key:string;project:StoryProject;kind:'own'|'imported'|'example'|'original';canResume:boolean};
export type BookshelfIntent='edit'|'start'|'resume'|'prepare'|'cover';
export type LocalBookshelfProps={works:readonly BookshelfWork[];onOpen:(key:string,intent:BookshelfIntent)=>void;onCreate:(title:string)=>boolean|void;onImport:(file:File)=>void;disabled?:boolean;notice?:string;onExport?:(key:string)=>void;onIntroduction?:()=>void};
const sections=[{kind:'original',title:'원작'},{kind:'example',title:'기본 예제'},{kind:'own',title:'내 작품'},{kind:'imported',title:'가져온 작품'}] as const;
export function LocalBookshelf({works,onOpen,onCreate,onImport,disabled=false,notice,onIntroduction,onExport}:LocalBookshelfProps){
 const room=useRef<HTMLElement>(null),cases=useRef<HTMLDivElement>(null),tools=useRef<HTMLDetailsElement>(null);
 useEffect(()=>{const dismiss=(event:PointerEvent)=>{if(tools.current?.open&&event.target instanceof Node&&!tools.current.contains(event.target))tools.current.open=false;};const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'&&tools.current?.open){tools.current.open=false;tools.current.querySelector<HTMLElement>('summary')?.focus();}};document.addEventListener('pointerdown',dismiss);document.addEventListener('keydown',escape);return()=>{document.removeEventListener('pointerdown',dismiss);document.removeEventListener('keydown',escape);};},[]);
 const [layout,setLayout]=useState(()=>shelfLayoutForWidth(1000));
 const [initialView]=useState(()=>{try{return parseLibraryView(typeof window==='undefined'?null:sessionStorage.getItem(LIBRARY_VIEW_KEY));}catch{return parseLibraryView(null);}});
 const [filter,setFilter]=useState(initialView.filter),[query,setQuery]=useState(initialView.query),[pages,setPages]=useState(initialView.pages),[selected,setSelected]=useState<string|null>(null);
 useEffect(()=>{try{sessionStorage.setItem(LIBRARY_VIEW_KEY,JSON.stringify({version:1,filter,query,pages}));}catch{/* Optional browsing preferences never prevent using the library. */}},[filter,query,pages]);
 useEffect(()=>{
  const root=room.current,rack=cases.current;if(!root||!rack)return;
  const fit=()=>{const next=shelfLayoutForWidth(rack.clientWidth);setLayout(current=>current.columns===next.columns?current:next);const floor=rack.getBoundingClientRect().bottom-root.getBoundingClientRect().top;root.style.setProperty('--room-image-height',`${floor/.805}px`);};
  const observer=new ResizeObserver(fit);observer.observe(rack);observer.observe(root);fit();return()=>observer.disconnect();
 },[]);
 const ordered=sections.flatMap(section=>works.filter(work=>work.kind===section.kind));
 const visible=findLibraryBooks(ordered.filter(work=>filter==='all'||work.kind===filter),query);
 const pageKey=filter;
 const pagination=libraryPage(visible,pages[pageKey]??0,layout.capacity);
 const selectedWork=works.find(work=>work.key===selected);
 return <main ref={room} className={styles.library} aria-label="로컬 서재">
  <header className={styles.header}>
   <h1>놀스토리 서재</h1>
   <div className={styles.headerTools}>
    {onIntroduction&&<button className={styles.introLink} onClick={onIntroduction}>책 소개</button>}
    <label className={styles.classification}><span className={styles.semantic}>책 분류</span><select aria-label="책 분류" value={filter} onChange={event=>{setFilter(event.target.value);if(tools.current)tools.current.open=false;}}><option value="all">모든 책</option>{sections.map(section=><option key={section.kind} value={section.kind}>{section.kind==='example'?'놀스토리':section.title}</option>)}</select></label>
    <details ref={tools} className={styles.tools} data-testid="library-tools"><summary>작품 관리</summary><div className={styles.toolsPanel}>
     <label className={styles.search}>책 찾기<input type="search" maxLength={200} placeholder="제목이나 지은이" value={query} onKeyDown={event=>{if(event.key==='Enter'){if(tools.current)tools.current.open=false;tools.current?.querySelector<HTMLElement>('summary')?.focus();}}} onChange={event=>setQuery(event.target.value)}/></label>
     <NewStoryForm disabled={disabled} onCreate={title=>onCreate(title)!==false}/>
     <label className={styles.import}>작품 파일 가져오기<input type="file" accept=".knolstory" aria-label="서재 작품 파일 가져오기" disabled={disabled} onChange={event=>{const file=event.target.files?.[0];if(file)onImport(file);event.target.value='';}}/></label>
     <a href="/shortstory">숏스토리 그림책 열기</a><p>이 브라우저에 저장한 작품을 다른 기기로 옮길 때는 작품 파일로 보관하세요.</p>
    </div></details>
   </div>
  </header>
  {notice&&<p className={styles.notice} role="status">{notice}</p>}
  <div ref={cases} className={styles.bookcases} style={{'--shelf-columns':layout.columns,'--shelf-rows':layout.rows} as CSSProperties}>
   <span className={styles.topPlant} aria-hidden="true"/><span className={`${styles.upright} ${styles.uprightLeft}`} data-cabinet-upright aria-hidden="true"/><span className={`${styles.upright} ${styles.uprightRight}`} data-cabinet-upright aria-hidden="true"/>
   <div className={styles.grid} data-shelf-room="warm" data-columns={layout.columns} data-rows={layout.rows} data-capacity={layout.capacity}>
    {sections.filter(section=>filter==='all'||filter===section.kind).map(section=><section key={section.kind} className={styles.collection} aria-label={section.title}>
     <h2 className={styles.semantic}>{section.kind==='example'?'놀스토리':section.title}</h2>
     {pagination.items.filter(work=>work.kind===section.kind).map(work=><article key={work.key} className={styles.card} data-shelf-book="true" aria-label={`${section.title} · ${work.project.title}`}>
      <span className={styles.plank} aria-hidden="true"/>
      <button className={styles.cover} data-shelf-cover="true" aria-label={`${work.project.title} 책 표지와 소개 보기`} disabled={disabled} onClick={()=>setSelected(work.key)}><span aria-hidden="true"><BookCover project={work.project} compact edition={work.kind==='example'?'knolstory':work.kind}/></span></button>
      <div className={styles.semantic}><h3>{work.project.title}</h3><p>{work.project.description}</p><p>지은이 · {work.project.cover?.author||'아직 정하지 않았어요'}</p><p>최근 수정 · {work.project.updatedAt||'수정 시점 정보 없음'}</p></div>
     </article>)}
     {works.filter(work=>work.kind===section.kind).length===0&&<p className={styles.semantic}>{section.kind==='own'?'아직 내 작품이 없어요. 새 작품을 만들어 첫 이야기를 시작해 보세요.':section.kind==='imported'?'가져온 작품이 없어요. 보관한 .knolstory 파일을 열어 보세요.':'준비된 책이 없어요.'}</p>}
    </section>)}
    {Array.from({length:layout.capacity-pagination.items.length},(_,index)=><div key={`empty-${index}`} className={styles.emptySlot} aria-hidden="true"><span className={styles.plank}/></div>)}
    {Array.from({length:layout.rows},(_,index)=><span key={`rail-${index}`} className={styles.rail} style={{'--shelf-index':index+1} as CSSProperties} data-cabinet-rail aria-hidden="true"/>)}
    {!visible.length&&<p className={styles.emptyMessage}>이 자리는 새로운 이야기를 기다리고 있어요.</p>}
   </div>
   <div className={styles.drawer} aria-label="책장 서랍" data-drawer-face><span className={styles.drawerHandle} aria-hidden="true"/><nav className={styles.paging} aria-label={`${filter==='all'?'서재':sections.find(section=>section.kind===filter)?.title} 선반 페이지`}><button aria-label="이전 선반" disabled={pagination.page===0} onClick={()=>setPages(current=>({...current,[pageKey]:pagination.page-1}))}>‹</button><span role="status">{pagination.page+1} / {pagination.pages} 선반 · {visible.length}권</span><button aria-label="다음 선반" disabled={pagination.page===pagination.pages-1} onClick={()=>setPages(current=>({...current,[pageKey]:pagination.page+1}))}>›</button></nav></div><span className={styles.base} data-cabinet-base aria-hidden="true"/>
  </div>
  <div className={`${styles.foreground} ${styles.foregroundLeft}`} aria-hidden="true"/><div className={`${styles.foreground} ${styles.foregroundRight}`} aria-hidden="true"/>
  <footer className={styles.roomFooter}>─ ◇ ─<p>오늘도, 새로운 이야기가 기다리고 있어요.</p><small>© 놀퀴즈</small></footer>
  {selectedWork&&<LibraryBookFocus works={visible} selected={selectedWork} onSelect={setSelected} onClose={()=>setSelected(null)} onOpen={(key,intent)=>{setSelected(null);onOpen(key,intent);}} disabled={disabled} onExport={onExport}/>}
 </main>;
}
