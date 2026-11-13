"use client";
import {useId} from 'react';
import type {StoryProject} from '@knolstory/story-domain';
import {BookCover, BOOK_EDITION_LABELS, type BookEdition} from './book-cover';
import styles from './book-start.module.css';
export function BookStart({project,canResume,onStart,onResume,onLibrary,onMission,onPrepare,onEdit,edition='own'}:{onMission?:()=>void;project:StoryProject;canResume:boolean;onStart:()=>void;onResume:()=>void;onLibrary:()=>void;onPrepare:()=>void;onEdit:()=>void;edition?:BookEdition}){
 const id=useId(),titleId=`${id}-title`,startDescriptionId=`${id}-start-description`,resumeDescriptionId=`${id}-resume-description`;
 return <main className={styles.start} aria-label="책 표지와 소개">
  <header className={styles.startHeader}><strong><span aria-hidden="true">✧</span> 놀스토리</strong><span className={styles.headerActions}>{onMission&&<button type="button" className={styles.missionReturn} onClick={onMission}><span aria-hidden="true">← </span>과제로 돌아가기</button>}<button type="button" onClick={onLibrary}><span aria-hidden="true">← </span>서재로</button></span></header>
  <div className={styles.startContent}>
   <figure className={styles.showcase}>
    <div className={styles.coverStand}><BookCover project={project} edition={edition}/></div>
    <div className={styles.pedestal} aria-hidden="true"/>
    <figcaption>{BOOK_EDITION_LABELS[edition]} <span aria-hidden="true">·</span> 책을 펼칠 시간</figcaption>
   </figure>
   <section className={styles.bookDetails} aria-labelledby={titleId}>
    <p className={styles.eyebrow}>{BOOK_EDITION_LABELS[edition]} <span aria-hidden="true">/</span> 이야기 시작</p>
    <h1 id={titleId}>{project.title||'제목을 기다리는 이야기'}</h1>
    {project.cover?.subtitle&&<p className={styles.subtitle}>{project.cover.subtitle}</p>}
    <p className={styles.description}>{project.description||'이 책의 이야기를 만나 보세요.'}</p>
    {project.cover?.author&&<p className={styles.author}>지은이 · {project.cover.author}</p>}
    {project.cover?.authorNote&&<details className={styles.authorNote}><summary>작가의 말</summary><p>{project.cover.authorNote}</p></details>}
    <div className={styles.startActions}>
     <button type="button" className={!canResume?styles.primary:undefined} disabled={!project.lines.length} onClick={onStart} aria-label="처음부터 읽기" aria-describedby={startDescriptionId} data-book-start-action="start"><strong>처음부터 읽기</strong><small id={startDescriptionId}>첫 장부터 읽어요</small></button>
     <button type="button" className={canResume?styles.primary:undefined} disabled={!canResume} onClick={onResume} aria-label="이어읽기" aria-describedby={resumeDescriptionId} data-book-start-action="resume"><strong>이어읽기</strong><small id={resumeDescriptionId}>{canResume?'읽던 장면부터 이어서 읽어요':'아직 읽은 기록이 없어요'}</small></button>
    </div>
    {onMission&&<p className={styles.missionHint}>과제로 읽는 책이에요. 다 읽으면 ‘과제로 돌아가기’를 눌러 확인을 요청해요.</p>}
    <p className={styles.readingHint}>읽기 화면에서 무대를 한 번 누르면 소리와 이야기가 시작돼요. 진행 저장과 지난기록은 읽기 메뉴에 있어요.</p>
    <div className={styles.editActions} role="group" aria-label="이 책 고쳐쓰기"><span>나의 손길 더하기</span><div><button type="button" onClick={onPrepare}>작품 정보·기획</button><button type="button" onClick={onEdit}>편집하기</button></div></div>
  </section></div>
 </main>;
}
