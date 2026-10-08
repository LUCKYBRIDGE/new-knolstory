"use client";
import {useEffect,useState} from "react";
import {findLibraryBooks,libraryPage,parseLibraryView,LIBRARY_VIEW_KEY} from "../lib/library-catalog";
import {LibraryBookFocus} from "./library-book-focus";
import {BookCover} from "./book-cover";
import {type StoryProject} from "@knolstory/story-domain";
import { NewStoryForm } from "./new-story-form";
import styles from "./local-bookshelf.module.css";

export type BookshelfWork = {
  key: string;
  project: StoryProject;
  kind: "own" | "imported" | "example" | "original";
  canResume: boolean;
};
export type BookshelfIntent = "edit" | "start" | "resume" | "prepare";
export type LocalBookshelfProps = {
  works: readonly BookshelfWork[];
  onOpen: (key: string, intent: BookshelfIntent) => void;
  onCreate: (title: string) => boolean | void;
  onImport: (file: File) => void;
  disabled?: boolean;
  notice?: string;
  onIntroduction?:()=>void;
};

const sections = [
  {kind:"original",title:"원작",description:"익숙한 옛이야기의 처음을 만나요."},
  {kind:"example",title:"기본 예제",description:"내 선택으로 새로운 갈래를 여는 놀스토리예요."},
  {kind:"own",title:"내 작품",description:"이 기기에 저장한 이야기를 이어 써요."},
  {kind:"imported",title:"가져온 작품",description:"작품 파일에서 가져온 이야기를 보관하고 편집해요."},
] as const;

function modifiedTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "수정 시점 정보 없음" : new Intl.DateTimeFormat("ko-KR", {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  }).format(date);
}

export function LocalBookshelf({ works, onOpen, onCreate, onImport, disabled = false, notice,onIntroduction }: LocalBookshelfProps) {
  const [initialView]=useState(()=>{try{return parseLibraryView(typeof window==='undefined'?null:sessionStorage.getItem(LIBRARY_VIEW_KEY));}catch{return parseLibraryView(null);}});
  const [filter,setFilter]=useState<string>(initialView.filter);
  const [query,setQuery]=useState(initialView.query);
  const [pages,setPages]=useState<Record<string,number>>(initialView.pages);
  useEffect(()=>{try{sessionStorage.setItem(LIBRARY_VIEW_KEY,JSON.stringify({version:1,filter,query,pages}));}catch{/* Browsing works when optional tab storage is unavailable. */}},[filter,query,pages]);
  const [selected,setSelected]=useState<string|null>(null);
  const selectedWork=works.find(work=>work.key===selected);
  const focusWorks=findLibraryBooks(works.filter(work=>filter==="all"||work.kind===filter),query);
  return <main className={styles.library} aria-label="로컬 서재">
    <header className={styles.header}>
      <div><p className={styles.eyebrow}>놀스토리 · 이 기기의 이야기</p><h1>내 서재</h1>
        <p>아이디어를 준비하고, 이야기를 쓰고, 다시 읽어 보세요.</p></div>
      {onIntroduction&&<button onClick={onIntroduction}>책 소개</button>}<a className={styles.shortstory} href="/shortstory">숏스토리 그림책 열기</a>
    </header>
    <nav className={styles.filters} aria-label="서재 책 분류"><button aria-pressed={filter==="all"} onClick={()=>setFilter("all")}>모든 책</button>{sections.map(section=><button key={section.kind} aria-pressed={filter===section.kind} onClick={()=>setFilter(section.kind)}>{section.kind==="example"?"놀스토리":section.title}</button>)}<label className={styles.search}>책 찾기<input type="search" maxLength={200} value={query} placeholder="제목이나 지은이" onChange={event=>setQuery(event.target.value)}/></label></nav>
    <div className={styles.create}>
      <NewStoryForm disabled={disabled} onCreate={title => onCreate(title) !== false} />
      <label className={styles.import}>작품 파일 가져오기
        <input type="file" accept=".knolstory" aria-label="서재 작품 파일 가져오기" disabled={disabled} onChange={event => {
          const file = event.target.files?.[0];
          if (file) onImport(file);
          event.target.value = "";
        }} />
      </label>
      <p>작품은 이 브라우저에 저장돼요. 다른 기기로 옮길 때는 작품 파일로 보관하세요.</p>
    </div>
    {notice && <p className={styles.notice} role="status">{notice}</p>}
    {sections.map(section => {
      const entries = findLibraryBooks(works.filter(work=>work.kind===section.kind),query);
      const pagination=libraryPage(entries,pages[section.kind]??0,8);
      if(filter!=="all"&&filter!==section.kind)return null;
      return <section className={styles.section} key={section.kind} aria-label={section.title}>
        <div className={styles.sectionHeading}><h2>{section.kind==="example"?"놀스토리":section.title} <span>{entries.length}편</span></h2><p>{section.description}</p></div>
        {entries.length === 0 ? <p className={styles.empty}>{section.kind === "own" ? "아직 내 작품이 없어요. 새 작품을 만들어 첫 이야기를 시작해 보세요." : section.kind === "imported" ? "가져온 작품이 없어요. 보관한 .knolstory 파일을 열어 보세요." : "준비된 기본 예제가 없어요."}</p> :
          <div className={styles.grid}>{pagination.items.map(work => <article className={styles.card} key={work.key} aria-label={`${section.title} · ${work.project.title}`}>
            <button className={styles.cover} aria-label={`${work.project.title} 책 표지와 소개 보기`} disabled={disabled} onClick={()=>setSelected(work.key)}><span aria-hidden="true"><BookCover project={work.project} compact edition={work.kind==="example"?"knolstory":work.kind}/></span></button>
            <div className={styles.details}><h3>{work.project.title}</h3><p className={styles.description}>{work.project.description || "아직 작품 소개가 없어요."}</p>
              {work.project.cover?.author && <p className={styles.author}>지은이 · {work.project.cover.author}</p>}
              <p className={styles.modified}>최근 수정 · {modifiedTime(work.project.updatedAt)}</p>
              <div className={styles.actions}>
                <button disabled={disabled} aria-label="편집하기" title="편집하기" onClick={() => onOpen(work.key, "edit")}>편집하기</button>
                <button disabled={disabled} aria-label="작품 준비" title="작품 준비" onClick={() => onOpen(work.key, "prepare")}>작품 준비</button>
                <button disabled={disabled || work.project.lines.length === 0} aria-label="처음부터 읽기" title="처음부터 읽기" onClick={() => onOpen(work.key, "start")}>처음부터 읽기</button>
                <button disabled={disabled || !work.canResume} aria-label="이어읽기" title="이어읽기" onClick={() => onOpen(work.key, "resume")}>이어읽기</button>
              </div>
              <p className={styles.hint}>{work.canResume ? "이어읽기는 마지막으로 읽던 위치를 열어요." : "읽은 위치가 생기면 이어읽기를 사용할 수 있어요."}</p>
            </div>
          </article>)}</div>}
        {pagination.pages>1&&<nav className={styles.paging} aria-label={`${section.title} 선반 페이지`}><button aria-label="이전 선반" disabled={pagination.page===0} onClick={()=>setPages(current=>({...current,[section.kind]:pagination.page-1}))}>←</button><span role="status">{pagination.page+1} / {pagination.pages} 선반</span><button aria-label="다음 선반" disabled={pagination.page===pagination.pages-1} onClick={()=>setPages(current=>({...current,[section.kind]:pagination.page+1}))}>→</button></nav>}
      </section>;
    })}
    {selectedWork&&<LibraryBookFocus works={focusWorks} selected={selectedWork} onSelect={setSelected} onClose={()=>setSelected(null)} onOpen={(key,intent)=>{setSelected(null);onOpen(key,intent);}} disabled={disabled}/>}
  </main>;
}
