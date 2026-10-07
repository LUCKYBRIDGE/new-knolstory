"use client";
import type {StoryProject} from '@knolstory/story-domain';
import {BookCover} from './book-cover';
import styles from './book-entry.module.css';
export function BookStart({project,canResume,onStart,onResume,onLibrary,onPrepare,onEdit}:{project:StoryProject;canResume:boolean;onStart:()=>void;onResume:()=>void;onLibrary:()=>void;onPrepare:()=>void;onEdit:()=>void}){
 return <main className={styles.start} aria-label="책 표지와 소개">
  <header className={styles.startHeader}><strong>놀스토리</strong><button onClick={onLibrary}>서재로</button></header>
  <div className={styles.startContent}><BookCover project={project}/><section className={styles.bookDetails}><p>이야기 시작</p><h1>{project.title}</h1>{project.cover?.subtitle&&<p>{project.cover.subtitle}</p>}<p>{project.description||'이 책의 이야기를 만나 보세요.'}</p>{project.cover?.author&&<p>지은이 · {project.cover.author}</p>}{project.cover?.authorNote&&<details><summary>작가의 말</summary><p>{project.cover.authorNote}</p></details>}
   <div className={styles.startActions}><button disabled={!project.lines.length} onClick={onStart}>처음부터 읽기</button><button disabled={!canResume} onClick={onResume}>이어읽기</button></div>
   <p>읽기 화면에서 무대를 한 번 누르면 소리와 이야기가 시작됩니다. 읽기 저장과 지난 기록은 읽기 메뉴에서 열 수 있어요.</p>
   <div className={styles.editActions}><button onClick={onPrepare}>표지·작품 정보 편집</button><button onClick={onEdit}>대본 편집</button></div>
  </section></div>
 </main>;
}
