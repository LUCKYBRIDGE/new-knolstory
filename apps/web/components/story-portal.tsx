'use client';
/* eslint-disable @next/next/no-img-element -- the first scene comes from the local asset catalog. */
import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import type {StoryProject} from '@knolstory/story-domain';
import {BookCover,type BookEdition} from './book-cover';
import styles from './story-portal.module.css';

/**
 * Stepping into a KnolStory: the book on the cover screen opens where it stands, its first scene shows inside,
 * and the camera moves into that picture until it fills the screen — then the live stage takes over.
 *
 * The stage loads underneath the whole time; if it is slower than the motion, the picture keeps drifting closer
 * (instead of a separate loading screen) and gives way the moment the stage is ready. Tapping finishes the motion,
 * and `prefers-reduced-motion` gets a short cross-fade. No animation library: a CSS 3D hinge plus the Web Animations API.
 */
type Rect=Readonly<{left:number;top:number;width:number;height:number}>;
const EASE='cubic-bezier(.62,.04,.3,1)',DIVE='cubic-bezier(.55,0,.2,1)';
const reducedMotion=()=>!!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export function StoryPortal({project,edition,from,scene,ready,onDone}:{project:StoryProject;edition:BookEdition;from:Rect;scene?:string;ready:boolean;onDone:()=>void}){
 const root=useRef<HTMLDivElement>(null),book=useRef<HTMLDivElement>(null),leaf=useRef<HTMLDivElement>(null),window_=useRef<HTMLDivElement>(null),bloom=useRef<HTMLDivElement>(null);
 const running=useRef<Animation[]>([]);
 const [phase,setPhase]=useState<'open'|'hold'|'reveal'>('open');
 const finished=useRef(false);
 useLayoutEffect(()=>{
  if(reducedMotion()||!leaf.current?.animate||!book.current||!window_.current){setPhase('hold');return;}
  const vw=innerWidth,vh=innerHeight;
  // 1) The cover swings open on its spine where it stands on the cover screen.
  const swing=leaf.current.animate([{transform:'rotateY(0deg)'},{transform:'rotateY(-172deg)'}],{duration:820,easing:EASE,fill:'forwards'});
  // 2) Then the scene inside grows from the page to the whole screen, as if we lean into it.
  const page=window_.current.getBoundingClientRect();
  const scale=Math.max(vw/page.width,vh/page.height)*1.02;
  const dx=vw/2-(page.left+page.width/2),dy=vh/2-(page.top+page.height/2);
  const dive=book.current.animate([{transform:'translate(0,0) scale(1)'},{transform:`translate(${dx}px,${dy}px) scale(${scale})`}],{duration:950,delay:700,easing:DIVE,fill:'forwards'});
  const glow=bloom.current?.animate([{opacity:0},{opacity:.38,offset:.6},{opacity:0}],{duration:900,delay:1050,easing:'ease-out',fill:'forwards'});
  running.current=[swing,dive,...(glow?[glow]:[])];
  void dive.finished.then(()=>setPhase('hold'),()=>setPhase('hold'));
  return()=>running.current.forEach(animation=>animation.cancel());
 },[]);
 // 3) Give way to the live stage as soon as it is ready (never before the motion has landed).
 useEffect(()=>{
  if(phase!=='hold'||!ready||finished.current)return;
  setPhase('reveal');
  const node=root.current;
  const end=()=>{if(finished.current)return;finished.current=true;onDone();};
  if(!node?.animate||reducedMotion()){const timer=window.setTimeout(end,180);return()=>window.clearTimeout(timer);}
  const fade=node.animate([{opacity:1},{opacity:0}],{duration:520,easing:'ease-out',fill:'forwards'});
  void fade.finished.then(end,end);
 },[phase,ready,onDone]);
 // A stage that never comes still hands over (its own loading or recovery message shows underneath).
 useEffect(()=>{const timer=window.setTimeout(()=>{if(!finished.current){finished.current=true;onDone();}},12000);return()=>window.clearTimeout(timer);},[onDone]);
 const skip=()=>{if(phase==='open')running.current.forEach(animation=>animation.finish());};
 return <div ref={root} className={styles.portal} data-phase={phase} data-story-portal onClick={skip} role="presentation">
  <div ref={book} className={styles.book} style={{left:from.left,top:from.top,width:from.width,height:from.height}}>
   <div className={styles.inside}><div ref={window_} className={styles.scene}>{scene?<img src={scene} alt=""/>:<span className={styles.blank}/>}</div></div>
   <div ref={leaf} className={styles.leaf}><div className={styles.front}><BookCover project={project} edition={edition}/></div><div className={styles.back}/></div>
  </div>
  <div ref={bloom} className={styles.bloom}/>
  {phase==='hold'&&!ready&&<p className={styles.waiting} role="status">이야기 속으로 들어가고 있어요</p>}
 </div>;
}
