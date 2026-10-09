"use client";
import type {StoryProject} from '@knolstory/story-domain';
import {BookCover, BOOK_EDITION_LABELS, type BookEdition} from './book-cover';
import styles from './book-start.module.css';
export function BookStart({project,canResume,onStart,onResume,onLibrary,onPrepare,onEdit,edition='own'}:{project:StoryProject;canResume:boolean;onStart:()=>void;onResume:()=>void;onLibrary:()=>void;onPrepare:()=>void;onEdit:()=>void;edition?:BookEdition}){
 return <main className={styles.start} aria-label="책 표지와 소개">
  <header className={styles.startHeader}><strong><span aria-hidden="true">✧</span> 놀스토리</strong><button type="button" onClick={onLibrary}><span aria-hidden="true">← </span>서재로</button></header>
  <div className={styles.startContent}>
   <figure className={styles.showcase}>
    <div className={styles.coverStand}><BookCover project={project} edition={edition}/></div>
    <div className={styles.pedestal} aria-hidden="true"/>
    <figcaption>{BOOK_EDITION_LABELS[edition]} <span aria-hidden="true">·</span> 책을 펼칠 시간</figcaption>
   </figure>
   <section className={styles.bookDetails} aria-labelledby="book-start-title">
    <p className={styles.eyebrow}>{BOOK_EDITION_LABELS[edition]} <span aria-hidden="true">/</span> 이야기 시작</p>
    <h1 id="book-start-title">{project.title||'제목을 기다리는 이야기'}</h1>
    {project.cover?.subtitle&&<p className={styles.subtitle}>{project.cover.subtitle}</p>}
    <p className={styles.description}>{project.description||'이 책의 이야기를 만나 보세요.'}</p>
    {project.cover?.author&&<p className={styles.author}>지은이 · {project.cover.author}</p>}
    {project.cover?.authorNote&&<details className={styles.authorNote}><summary>작가의 말</summary><p>{project.cover.authorNote}</p></details>}
    <div className={styles.startActions}>
     <button type="button" className={!canResume?styles.primary:undefined} disabled={!project.lines.length} onClick={onStart} aria-label="처음부터 읽기"><strong>처음부터 읽기</strong><small>첫 장부터 이야기를 펼쳐요</small></button>
     <button type="button" className={canResume?styles.primary:undefined} disabled={!canResume} onClick={onResume} aria-label="이어읽기"><strong>이어읽기</strong><small>{canResume?'읽던 장면에서 다시 만나요':'읽기 시작 후 이어갈 수 있어요'}</small></button>
    </div>
    <p className={styles.readingHint}>읽기 화면에서 무대를 한 번 누르면 소리와 이야기가 시작됩니다. 읽기 저장과 지난 기록은 읽기 메뉴에서 열 수 있어요.</p>
    <div className={styles.editActions} aria-label="이 책 고쳐쓰기"><span>나의 손길 더하기</span><div><button type="button" onClick={onPrepare}>표지·작품 정보 편집</button><button type="button" onClick={onEdit}>대본 편집</button></div></div>
  </section></div>
 </main>;
}
