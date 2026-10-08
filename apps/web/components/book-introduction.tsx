"use client";
/* eslint-disable @next/next/no-img-element -- existing authorized local cover artwork. */
import {useState} from 'react';
import type {BookshelfWork} from './local-bookshelf';
import {BookCover} from './book-cover';
import {resolveBookCover} from '../lib/book-cover';
import styles from './book-entry.module.css';
export function BookIntroduction({works,onLibrary,onBook,disabled,notice}:{works:readonly BookshelfWork[];onLibrary:()=>void;onBook:(key:string)=>void;disabled:boolean;notice?:string}){
 const examples=works.filter(work=>work.kind==='example');
 const [selected,setSelected]=useState(0);
 const featured=examples[selected%Math.max(1,examples.length)];
 const art=featured?resolveBookCover(featured.project):undefined;
 return <main className={styles.introduction} aria-label="책 소개">
  <section className={styles.poster} aria-label="놀스토리 소개">
   <header className={styles.brand}><span aria-hidden="true">✧</span> 놀스토리<small>이야기로 만나는 더 넓은 세상</small></header>
   <div className={styles.posterCopy}><p className={styles.eyebrow}>읽고, 선택하고, 새롭게 쓰는 이야기</p><h1>한 권의 책에서<br/>나의 이야기가 시작돼요.</h1><p>익숙한 이야기를 새로운 마음으로 읽어 보세요.<br/>선택에 따라 달라지는 길에서 나만의 다음 장을 써 보세요.</p>
    <nav className={styles.mainMenu} aria-label="놀스토리 메인 메뉴"><button disabled={disabled} onClick={onLibrary}>서재로 가기 <span aria-hidden="true">→</span></button><a href="/shortstory">숏스토리 그림책 보기 <span aria-hidden="true">↗</span></a></nav>
   </div>
   {featured&&<div className={styles.posterScene}>
    <div className={styles.sceneArt} aria-hidden="true">{art?.background&&<img className={styles.sceneBackground} src={art.background.src} alt=""/>}{art?.character&&<img className={styles.sceneCharacter} src={art.character.src} alt=""/>}</div>
    <div className={styles.featuredCopy}><small>오늘 펼쳐 볼 이야기</small><h2>{featured.project.title}</h2><p>{featured.project.cover?.subtitle||featured.project.description}</p><button disabled={disabled} onClick={()=>onBook(featured.key)}>이야기 읽기</button><button className={styles.nextStory} aria-label="다른 이야기 표지로 바꾸기" onClick={()=>setSelected(index=>(index+1)%examples.length)}>↻</button></div>
   </div>}
  </section>
  {notice&&<p className={styles.notice} role="status">{notice}</p>}
  <section className={styles.catalog} aria-label="소개하는 기존 작품"><header><p className={styles.eyebrow}>우리에게 익숙한 네 이야기, 서로 다른 여덟 권</p><h2>함께 읽을 책</h2><p>원작의 마음을 만나고, 놀스토리에서 새로운 갈래를 골라 보세요.</p></header><div className={styles.books}>{works.filter(w=>w.kind==='original'||w.kind==='example').map(work=><article className={styles.introBook} key={work.key} aria-label={`${work.kind==='original'?'원작':'놀스토리'} · ${work.project.title}`}>
   <button className={styles.bookButton} disabled={disabled} aria-label={`${work.project.title} 표지 보기`} onClick={()=>onBook(work.key)}><BookCover project={work.project} compact edition={work.kind==='original'?'original':'knolstory'}/></button><div><p className={styles.kind}>{work.kind==='original'?'원작':'놀스토리 · 선택하며 읽기'}</p><h3>{work.project.title}</h3><p>{work.project.description}</p><button disabled={disabled} onClick={()=>onBook(work.key)}>책 표지와 소개 보기</button></div>
  </article>)}</div></section>
 </main>;
}
