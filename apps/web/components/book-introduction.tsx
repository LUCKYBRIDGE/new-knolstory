'use client';
/* eslint-disable @next/next/no-img-element -- exact owner-authorized legacy poster assets. */
import {useState} from 'react';
import type {BookshelfWork} from './local-bookshelf';
import styles from './book-entry.module.css';
const titles:Record<string,{title:string;first:string;art:string}>={onggojib:{title:'옹고집전',first:'옹고',art:'onggojib'},seonnyeo:{title:'선녀와 나무꾼',first:'선녀',art:'seonnyeo'},heungbu:{title:'흥부와 놀부',first:'흥부',art:'heungbu'},rabbit:{title:'별주부전',first:'별주',art:'rabbit'}};
function Icon({kind}:{kind:'pen'|'shelf'|'book'|'refresh'|'user'}){
 const paths={pen:'m14 5 5 5M9 15 20 4a2 2 0 0 0-3-3L6 12M9 15c-1 5-4 6-7 6 2-2 0-4 3-7 1-1 3-1 4 1Z',shelf:'M3 3v18M21 3v18M3 12h18M3 21h18M7 4v8M11 4v8M16 4l2 8M7 15v6M12 15v6M17 15v6',book:'M12 5C8 2 4 3 2 4v16c3-2 7-1 10 1 3-2 7-3 10-1V4c-2-1-6-2-10 1Zm0 0v16',refresh:'M21 12a9 9 0 0 0-15-6L3 8M3 3v5h5M3 12a9 9 0 0 0 15 6l3-2M16 21h5v-5',user:'M8 8a4 4 0 1 0 8 0 4 4 0 1 0-8 0M5 21v-3a7 7 0 0 1 14 0v3'};
 return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[kind]}/></svg>;
}
export function BookIntroduction({works,onLibrary,onBook,disabled,notice,onMyWorks}:{works:readonly BookshelfWork[];onLibrary:()=>void;onBook:(key:string)=>void;disabled:boolean;notice?:string;onMyWorks?:()=>void}){
 const examples=['onggojib','seonnyeo','heungbu','rabbit'].flatMap(key=>works.filter(work=>work.kind==='example'&&work.key===key));
 const [selected,setSelected]=useState(0);const featured=examples[selected%Math.max(1,examples.length)];const info=titles[featured?.key??'onggojib'];
 return <main className={styles.introduction} aria-label="책 소개"><section className={styles.poster} aria-label="놀스토리 소개" data-introduction-layout="legacy-poster">
  <header className={styles.brand}><div className={styles.brandTitle}><span className={styles.brandIcon} aria-hidden="true"/><h1>놀스토리</h1><button className={styles.smallButton} aria-label="내 작품 보기" disabled={disabled} onClick={onMyWorks??onLibrary}><Icon kind="user"/></button></div>
   <div className={styles.subtitle}><button className={styles.smallButton} aria-label="다른 이야기 표지로 바꾸기" disabled={disabled||examples.length<2} onClick={()=>setSelected(index=>(index+1)%examples.length)}><Icon kind="refresh"/></button><p>이야기로 만나는 <br/>더 넓은 세상</p><button className={styles.smallButton} aria-label="서재에서 책 찾기" disabled={disabled} onClick={onLibrary}><Icon kind="shelf"/></button></div>
  </header>
  <nav className={styles.mainMenu} aria-label="놀스토리 메인 메뉴"><button className={styles.createButton} disabled={disabled} onClick={onMyWorks??onLibrary}><Icon kind="pen"/><span>나만의 이야기</span></button><button disabled={disabled} onClick={onLibrary} aria-label="서재로 가기"><Icon kind="shelf"/><span>서재 입장</span></button></nav>
  <section className={styles.heading} aria-live="polite" aria-atomic="true"><svg className={styles.leaves} viewBox="0 0 48 56" aria-hidden="true"><path d="M24 54Q23 30 32 8M25 40 10 25" fill="none" stroke="#7c8c59" strokeWidth="2"/><path d="M29 26Q18 10 35 2q8 14-6 24M23 40Q6 42 5 22q17 1 18 18M26 43q0-18 19-18-1 17-19 18" fill="#96a474"/></svg><h2><span>{info.first}</span>{info.title.slice(info.first.length)}</h2><p className={styles.author}><span aria-hidden="true">✦</span> 이 이야기의 작가: 당신 <span aria-hidden="true">✦</span></p><p className={styles.description}>당신이 직접 만들어 가는 이야기</p></section>
  <div className={styles.posterScene} aria-hidden="true"><img data-intro-poster={info.art} src={`/assets/legacy-ui/intro-${info.art}.webp`} alt="" fetchPriority="high"/></div>
  <button className={styles.readButton} disabled={disabled||!featured} onClick={()=>featured&&onBook(featured.key)}><Icon kind="book"/><span>이야기 읽기</span><span aria-hidden="true">➜</span></button>
  <footer className={styles.footer}>© 놀퀴즈</footer>
  {notice&&<p className={styles.notice} role="status">{notice}</p>}
 </section></main>;
}
