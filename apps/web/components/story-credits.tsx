'use client';
import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import type {StoryCredits as Credits} from '../lib/story-credits';
import styles from './story-credits.module.css';

/**
 * Closing credits, the way a film ends: the stage dims, the ending's name and the title appear, the credits roll
 * slowly upward, and the last card offers what to do next. Everything is in the page for screen readers from the
 * start; only its motion is decoration. Tapping skips to the last card; hovering pauses; reduced motion shows the
 * list still.
 */
const SPEED=42; // px per second: slow enough to read a line, short enough not to keep a class waiting.

export function StoryCreditsRoll({credits,ending,onRestart,onLibrary,branching}:{credits:Credits;ending?:string;onRestart:()=>void;onLibrary:()=>void;branching:boolean}){
 const frame=useRef<HTMLDivElement>(null),roll=useRef<HTMLDivElement>(null),restart=useRef<HTMLButtonElement>(null);
 const animation=useRef<Animation|null>(null);
 const [done,setDone]=useState(false),[still,setStill]=useState(false);
 useLayoutEffect(()=>{
  const box=frame.current,content=roll.current;
  if(!box||!content||!content.animate||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches){setStill(true);setDone(true);return;}
  const distance=box.clientHeight+content.scrollHeight;
  const run=content.animate([{transform:`translateY(${box.clientHeight}px)`},{transform:`translateY(${-content.scrollHeight}px)`}],{duration:Math.min(32000,Math.max(9000,distance/SPEED*1000)),delay:1400,easing:'linear',fill:'forwards'});
  animation.current=run;
  void run.finished.then(()=>setDone(true),()=>undefined);
  return()=>run.cancel();
 },[]);
 useEffect(()=>{if(done)restart.current?.focus({preventScroll:true});},[done]);
 const skip=()=>{if(done)return;animation.current?.cancel();setDone(true);};
 return <section className={styles.credits} aria-label="엔딩 크레딧" data-story-credits data-done={done||undefined} data-still={still||undefined} onClick={skip}>
  <div ref={frame} className={styles.frame} onMouseEnter={()=>animation.current?.pause()} onMouseLeave={()=>{if(!done)animation.current?.play();}} aria-hidden={done&&!still?true:undefined}>
   <div ref={roll} className={styles.roll}>
    {ending&&<p className={styles.ending}>{ending}</p>}
    <h2 className={styles.title}>{credits.title}</h2>
    {credits.author&&<dl className={styles.block}><dt>지은이</dt><dd>{credits.author}</dd></dl>}
    {credits.sections.map(section=><dl key={section.heading} className={styles.block}><dt>{section.heading}</dt>{section.lines.map(line=><dd key={line}>{line}</dd>)}</dl>)}
    {credits.note&&<figure className={styles.note}><figcaption>작가의 말</figcaption><p>{credits.note}</p></figure>}
    <p className={styles.made}>놀스토리로 만든 이야기</p>
   </div>
  </div>
  {done&&<div className={styles.last}>
   {ending&&<p className={styles.ending}>{ending}</p>}
   <h2 className={styles.title}>{credits.title}</h2>
   {credits.author&&<p className={styles.by}>{credits.author}</p>}
   <div className={styles.actions}>
    <button ref={restart} type="button" className={styles.primary} onClick={event=>{event.stopPropagation();onRestart();}}>{branching?'다른 결말 찾아보기':'처음부터 다시 읽기'}</button>
    <button type="button" onClick={event=>{event.stopPropagation();onLibrary();}}>서재로 돌아가기</button>
   </div>
  </div>}
 </section>;
}
