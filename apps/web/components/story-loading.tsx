'use client';
import Image from 'next/image';
import {useEffect,useState} from 'react';
import stories from '../public/loading-stories.json';
import styles from './story-loading.module.css';

/** One short message at a time; keep the character while changing copy every four seconds. */
export function StoryLoading({stage=false}:{stage?:boolean}){
 const [tip,setTip]=useState<(typeof stories)[number]|null>(null);
 useEffect(()=>{
  const first=window.setTimeout(()=>setTip(stories[Math.floor(Math.random()*stories.length)]!),0);
  const rotation=window.setInterval(()=>setTip(previous=>{if(!previous)return previous;const candidates=stories.filter(item=>item.workId===previous.workId&&item.id!==previous.id);return candidates[Math.floor(Math.random()*candidates.length)]??previous;}),4000);
  return()=>{window.clearTimeout(first);window.clearInterval(rotation);};
 },[]);
 const selected=tip??stories[0]!;
 return <section className={styles.loading} data-story-loading={stage?'stage':'workspace'} aria-label={stage?'이야기 무대 준비':'화면 불러오는 중'}>
  <div className={styles.content}>
   <div className={styles.art} aria-hidden="true">{tip&&<picture><source media="(prefers-reduced-motion: reduce)" srcSet={tip.characterStillSrc}/><Image src={tip.characterSrc} width={480} height={440} unoptimized loading="eager" alt="" onLoad={event=>{event.currentTarget.hidden=false;}} onError={event=>{event.currentTarget.hidden=true;}}/></picture>}</div>
   <div className={styles.copy}>
    <p className={styles.brand}>놀스토리</p>
    <p className={styles.title} role="status">{stage?'이야기 무대를 준비하고 있어요':'이야기를 만나러 가는 중이에요'}</p>
    <p className={styles.hint}>{stage?'처음에는 조금 더 걸릴 수 있어요.':'저장된 화면을 불러오고 있어요.'}</p>
    <div className={styles.tip} data-loading-tip={selected.id}><p className={styles.label}>{selected.label}</p><p>{selected.text}</p></div>
    <span className={styles.rule} aria-hidden="true"/>
   </div>
  </div>
 </section>;
}
