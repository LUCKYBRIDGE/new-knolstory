"use client";
import {useId} from 'react';
import type {StoryProject} from '@knolstory/story-domain';
import {BookCover, BOOK_EDITION_LABELS, type BookEdition} from './book-cover';
import styles from './book-start.module.css';
export function BookStart({project,canResume,onStart,onResume,onLibrary,onMission,edition='own'}:{onMission?:()=>void;project:StoryProject;canResume:boolean;onStart:()=>void;onResume:()=>void;onLibrary:()=>void;edition?:BookEdition}){
 const id=useId(),titleId=`${id}-title`;
 // The shelf opens books straight into the story; this title page greets readers who arrive from the home screen or an assignment.
 return <main className={styles.start} aria-label="책 표지와 소개">
  <header className={styles.startHeader}><strong><span aria-hidden="true">✧</span> 놀스토리</strong><span className={styles.headerActions}>{onMission&&<button type="button" className={styles.missionReturn} onClick={onMission}><span aria-hidden="true">← </span>과제로 돌아가기</button>}<button type="button" onClick={onLibrary}><span aria-hidden="true">← </span>서재로</button></span></header>
  <div className={styles.startContent}>
   <figure className={styles.showcase}>
    <div className={styles.coverStand}><BookCover project={project} edition={edition}/></div>
    <div className={styles.pedestal} aria-hidden="true"/>
   </figure>
   <section className={styles.bookDetails} aria-labelledby={titleId}>
    <p className={styles.eyebrow}>{BOOK_EDITION_LABELS[edition]}</p>
    <h1 id={titleId}>{project.title||'제목을 기다리는 이야기'}</h1>
    {project.cover?.subtitle&&<p className={styles.subtitle}>{project.cover.subtitle}</p>}
    {project.description&&<p className={styles.description}>{project.description}</p>}
    {project.cover?.author&&<p className={styles.author}>지은이 · {project.cover.author}</p>}
    {project.cover?.authorNote&&<details className={styles.authorNote}><summary>작가의 말</summary><p>{project.cover.authorNote}</p></details>}
    <div className={styles.startActions}>
     {canResume?<>
      <button type="button" className={styles.primary} onClick={onResume} data-book-start-action="resume">이어읽기</button>
      <button type="button" className={styles.secondary} disabled={!project.lines.length} onClick={onStart} data-book-start-action="start">처음부터 읽기</button>
     </>:<button type="button" className={styles.primary} disabled={!project.lines.length} onClick={onStart} data-book-start-action="start">처음부터 읽기</button>}
    </div>
    {onMission&&<p className={styles.missionHint}>과제로 읽는 책이에요. 다 읽으면 ‘과제로 돌아가기’를 눌러 확인을 요청해요.</p>}
    <p className={styles.readingHint}>무대를 한 번 누르면 소리와 이야기가 시작돼요.</p>
  </section></div>
 </main>;
}
