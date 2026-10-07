"use client";
import type {BookshelfWork} from './local-bookshelf';
import {BookCover} from './book-cover';
import styles from './book-entry.module.css';
export function BookIntroduction({works,onLibrary,onBook,disabled,notice}:{works:readonly BookshelfWork[];onLibrary:()=>void;onBook:(key:string)=>void;disabled:boolean;notice?:string}){
 return <main className={styles.introduction} aria-label="책 소개">
  <header className={styles.introHeader}><p>놀스토리</p><h1>책을 만나고, 이야기를 이어 가세요.</h1><p>원래 이야기를 읽거나, 선택에 따라 달라지는 놀스토리를 만나 보세요. 마음에 드는 책에서 나만의 이야기를 이어 쓸 수도 있어요.</p><button disabled={disabled} onClick={onLibrary}>서재로 가기</button><a href="/shortstory">숏스토리 그림책 보기</a></header>
  {notice&&<p role="status">{notice}</p>}
  <section aria-label="소개하는 기존 작품"><h2>함께 읽을 책</h2><div className={styles.books}>{works.filter(w=>w.kind==='original'||w.kind==='example').map(work=><article className={styles.introBook} key={work.key} aria-label={`${work.kind==='original'?'원작':'놀스토리'} · ${work.project.title}`}>
   <BookCover project={work.project} compact/><div><p>{work.kind==='original'?'원작':'놀스토리 · 선택하며 읽기'}</p><h3>{work.project.title}</h3><p>{work.project.description}</p><button disabled={disabled} onClick={()=>onBook(work.key)}>책 표지와 소개 보기</button></div>
  </article>)}</div></section>
 </main>;
}
