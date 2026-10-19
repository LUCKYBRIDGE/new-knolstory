'use client';
import {useEffect,useRef} from 'react';
import styles from './editor-view-switch.module.css';
type View='cut'|'writer';
type Snapshot={scroll:number;page:number;label:string|null;start:number;end:number};
type Props={view:View;workId:string;lineId:string;composing:boolean;beforeSwitch:()=>void;onSwitch:(view:View)=>void;onError:(issue:unknown)=>void};
/** View/cursor history belongs to this mounted editor, never the authored document. */
export function EditorViewSwitch(p:Props){
 const root=useRef<HTMLDivElement>(null),history=useRef(new Map<string,Snapshot>()),pending=useRef<Snapshot|null>(null),captured=useRef(false),requested=useRef(false);
 const key=(view:View)=>`${p.workId}/${p.lineId}/${view}`;
 function remember(){
  const panel=root.current?.closest<HTMLElement>('[data-editor-inputs]');if(!panel)return;
  const active=document.activeElement;
  const text=active instanceof HTMLTextAreaElement&&panel.contains(active)?active:panel.querySelector<HTMLTextAreaElement>('[data-writer-current="true"] textarea, #story-line-text');
  if(text)history.current.set(key(p.view),{scroll:panel.scrollTop,page:window.scrollY,label:text.getAttribute('aria-label'),start:text.selectionStart,end:text.selectionEnd});
 }
 function change(view:View){
  if(view===p.view||p.composing){captured.current=false;return;}
  try{p.beforeSwitch();}catch(issue){captured.current=false;p.onError(issue);return;}
  if(!captured.current)remember();captured.current=false;
  pending.current=history.current.get(key(view))??null;requested.current=true;p.onSwitch(view);
 }
 useEffect(()=>{
  if(!requested.current)return;requested.current=false;
  const snapshot=pending.current;pending.current=null;
  const frame=requestAnimationFrame(()=>{
   const panel=root.current?.closest<HTMLElement>('[data-editor-inputs]');if(!panel)return;
   const text=snapshot?.label?[...panel.querySelectorAll<HTMLTextAreaElement>('textarea')].find(node=>node.getAttribute('aria-label')===snapshot.label):panel.querySelector<HTMLTextAreaElement>('[data-writer-current="true"] textarea, #story-line-text');
   if(text){let parent=text.parentElement;while(parent&&parent!==panel){if(parent instanceof HTMLDetailsElement)parent.open=true;parent=parent.parentElement;}text.focus({preventScroll:true});if(snapshot)text.setSelectionRange(snapshot.start,snapshot.end);}
   if(snapshot){panel.scrollTop=snapshot.scroll;window.scrollTo({top:snapshot.page,behavior:'instant'});}
  });return()=>cancelAnimationFrame(frame);
 },[p.view,p.lineId,p.workId]);
 return <div ref={root} role="group" aria-label="글 편집 보기" className={styles.switch} onPointerDownCapture={()=>{remember();captured.current=true;}}>
  <button type="button" aria-pressed={p.view==='cut'} disabled={p.composing} onClick={()=>change('cut')}>현재 컷 쓰기</button>
  <button type="button" aria-pressed={p.view==='writer'} disabled={p.composing} onClick={()=>change('writer')}>장 전체 글 고치기</button>
 </div>;
}
