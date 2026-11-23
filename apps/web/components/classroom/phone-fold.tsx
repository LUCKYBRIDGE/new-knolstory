'use client';
import {useState,type ReactNode} from 'react';
import styles from './classroom.module.css';
const isPhone=()=>typeof window!=='undefined'&&window.matchMedia('(max-width:720px), (max-height:500px) and (orientation:landscape)').matches;
/**
 * A card section whose heading opens and closes it. Wide screens start open; phones start folded when
 * `foldOnPhone` says the section is not the next thing to do, so the work below it stays near the top.
 */
export function PhoneFold({eyebrow,title,foldOnPhone=true,children}:{eyebrow?:string;title:string;foldOnPhone?:boolean;children:ReactNode}){
 const [open,setOpen]=useState(()=>!(foldOnPhone&&isPhone()));
 return <details className={styles.composerFold} open={open} onToggle={event=>setOpen(event.currentTarget.open)}
  // A choice marked data-fold-after has opened its form elsewhere; on a phone, fold this away so that form is close.
  onClick={event=>{if((event.target as HTMLElement).closest('[data-fold-after]')&&isPhone())setOpen(false);}}>
  <summary>{eyebrow&&<span className={styles.eyebrow}>{eyebrow}</span>}<h2>{title}</h2></summary>
  {children}
 </details>;
}
