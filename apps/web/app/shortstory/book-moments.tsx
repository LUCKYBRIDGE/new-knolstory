'use client';
import {useEffect,useRef,useState,type ReactNode} from 'react';
import type {StoryProject} from '@knolstory/story-domain';
import {BookCover} from '../../components/book-cover';
import styles from './book-moments.module.css';

/**
 * Opening and closing a picture book.
 *
 * The hard cover swings on its spine (left edge), the way a real board book opens, then the first page settles in.
 * At the end the cover swings back over the last page and the closed book rests while ‘끝’ and the author's note appear.
 * No animation library: a 3D hinge (perspective + transform-origin + backface-visibility, as hard-cover page-flip engines
 * such as StPageFlip do) driven by the Web Animations API. Tapping again finishes the motion at once, and
 * `prefers-reduced-motion` gets a plain fade.
 */
const EASE_OPEN='cubic-bezier(.62,.04,.3,1)',EASE_SETTLE='cubic-bezier(.2,.8,.2,1)';
const reducedMotion=()=>typeof window!=='undefined'&&!!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function Inside({art,text}:{art?:string;text?:string}){
 return <div className={styles.inside} aria-hidden="true">{art?<img src={art} alt=""/>:null}{text?<p className={styles.insideText}>{text}</p>:null}<span className={styles.gutter}/></div>;
}

export function BookOpening({cover,edition,title,author,description,credit,firstArt,firstText,onOpen,extra}:{cover:StoryProject;edition:'original'|'own';title:string;author:string;description:string;credit?:string;firstArt?:string;firstText?:string;onOpen:()=>void;extra?:ReactNode}){
 const leaf=useRef<HTMLDivElement>(null),book=useRef<HTMLDivElement>(null),start=useRef<HTMLButtonElement>(null);
 const running=useRef<Animation[]>([]);
 const [opening,setOpening]=useState(false);
 useEffect(()=>{start.current?.focus({preventScroll:true});},[]);
 const open=()=>{
  if(opening){running.current.forEach(animation=>animation.finish());return;}
  setOpening(true);
  if(reducedMotion()||!leaf.current?.animate||!book.current){onOpen();return;}
  const swing=leaf.current.animate([{transform:'rotateY(0deg)'},{transform:'rotateY(-172deg)'}],{duration:900,easing:EASE_OPEN,fill:'forwards'});
  // The open book moves right by half a cover so the spread stays centred, and comes a little closer.
  const travel=book.current.animate([{transform:'translateX(0) scale(1)'},{transform:'translateX(50%) scale(1.04)'}],{duration:900,easing:EASE_OPEN,fill:'forwards'});
  running.current=[swing,travel];
  void Promise.all([swing.finished,travel.finished]).then(onOpen,onOpen);
 };
 return <section className={styles.stage} aria-label="이 그림책" data-book-moment="cover" onKeyDown={event=>{if(event.key==='ArrowRight'){event.preventDefault();open();}}}>
  <div className={styles.scene} onClick={open}>
   <div ref={book} className={styles.book}>
    <Inside art={firstArt} text={firstText}/>
    <div ref={leaf} className={styles.leaf}>
     <div className={styles.front} aria-hidden="true"><BookCover project={cover} edition={edition}/><span className={styles.shade}/></div>
     <div className={styles.back} aria-hidden="true"/>
    </div>
   </div>
  </div>
  <div className={styles.caption} data-leaving={opening||undefined}>
   <h2>{title||'제목 없는 그림책'}</h2>
   {author&&<p className={styles.author}>{author} 지음</p>}
   {description&&<p className={styles.description}>{description}</p>}
   {credit&&<p className={styles.credit}>{credit}</p>}
   <div className={styles.actions}><button ref={start} type="button" className={styles.primary} onClick={open}>책 펼치기</button>{extra}</div>
  </div>
 </section>;
}

export function BookClosing({cover,edition,title,lastArt,lastText,note,onRestart,onBack,extra}:{cover:StoryProject;edition:'original'|'own';title:string;lastArt?:string;lastText?:string;note:string;onRestart:()=>void;onBack:()=>void;extra?:ReactNode}){
 const leaf=useRef<HTMLDivElement>(null),book=useRef<HTMLDivElement>(null),heading=useRef<HTMLHeadingElement>(null);
 const running=useRef<Animation[]>([]);
 const [settled,setSettled]=useState(false);
 useEffect(()=>{
  const done=()=>{setSettled(true);heading.current?.focus({preventScroll:true});};
  if(reducedMotion()||!leaf.current?.animate||!book.current){done();return;}
  const swing=leaf.current.animate([{transform:'rotateY(-172deg)'},{transform:'rotateY(0deg)'}],{duration:950,easing:EASE_OPEN,fill:'forwards'});
  const travel=book.current.animate([{transform:'translateX(50%) scale(1.04)'},{transform:'translateX(0) scale(1)'}],{duration:950,easing:EASE_OPEN,fill:'forwards'});
  // Once shut, the book settles onto the table: a slight drop and a softer shadow.
  const rest=book.current.animate([{filter:'drop-shadow(0 18px 26px #2a1a0a33)'},{filter:'drop-shadow(0 8px 12px #2a1a0a26)'}],{duration:500,delay:900,easing:EASE_SETTLE,fill:'forwards'});
  running.current=[swing,travel,rest];
  void Promise.all([swing.finished,travel.finished]).then(done,done);
  return()=>running.current.forEach(animation=>animation.cancel());
 },[]);
 const skip=()=>running.current.forEach(animation=>animation.finish());
 return <section className={styles.stage} aria-label="그림책 끝" data-book-moment="end">
  <div className={styles.scene} onClick={skip}>
   <div ref={book} className={styles.book}>
    <Inside art={lastArt} text={lastText}/>
    <div ref={leaf} className={styles.leaf} style={{transform:'rotateY(-172deg)'}}>
     <div className={styles.front} aria-hidden="true"><BookCover project={cover} edition={edition}/><span className={styles.shade}/></div>
     <div className={styles.back} aria-hidden="true"/>
    </div>
   </div>
  </div>
  <div className={styles.caption} data-arriving={!settled||undefined}>
   <h2 ref={heading} tabIndex={-1} className={styles.end}>끝</h2>
   <p className={styles.author}>{title||'제목 없는 그림책'}</p>
   {note.trim()&&<figure className={styles.note}><figcaption>작가의 말</figcaption><p>{note}</p></figure>}
   <div className={styles.actions}><button type="button" className={styles.primary} onClick={onRestart}>처음부터 다시 읽기</button><button type="button" onClick={onBack}>‹ 마지막 쪽으로</button>{extra}</div>
  </div>
 </section>;
}
