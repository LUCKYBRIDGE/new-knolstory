'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {chapterLabel,type StoryProject} from '@knolstory/story-domain';
import {chapterMovePlaces,moveStoryChapter} from '@knolstory/runtime-core';
import {trapDialogTab} from '../lib/dialog-keyboard';
import base from './authoring-import-dialog.module.css';
import surface from './story-dialog-surface.module.css';
import styles from './story-structure-controls.module.css';

const sorted=(project:StoryProject)=>[...project.chapters].sort((a,b)=>a.order-b.order);
const cutText=(text:string)=>text.trim()?(text.trim().length>18?`${text.trim().slice(0,18)}…`:text.trim()):'빈 컷';

/**
 * ‘장 순서 바꾸기’: every chapter in reading order, moved one place at a time or to a chosen place.
 * Each change is shown at once; ‘닫기’ keeps it, ‘처음대로’ puts the order back as it was when opened.
 */
export function ChapterOrderDialog({project,currentChapterId,onChange,onClose}:{project:StoryProject;currentChapterId:string;onChange:(next:StoryProject,done:string)=>void;onClose:()=>void}){
 const ref=useRef<HTMLDialogElement>(null);
 const [opened]=useState(project);
 const [selected,setSelected]=useState(currentChapterId);
 const [place,setPlace]=useState('');
 const [message,setMessage]=useState('');
 useEffect(()=>{const dialog=ref.current,opener=document.activeElement as HTMLElement|null;dialog?.showModal();return()=>{dialog?.close();if(opener?.isConnected)opener.focus();};},[]);
 const chapters=sorted(project);
 const move=(chapterId:string,afterChapterId:string|null)=>{
  const name=chapterLabel(project.chapters.find(chapter=>chapter.id===chapterId)!);
  try{const next=moveStoryChapter(project,chapterId,afterChapterId);const now=chapterLabel(next.chapters.find(chapter=>chapter.id===chapterId)!);
   onChange(next,`‘${name}’을 옮겼어요. 지금은 ${now.split(' · ')[0]}이에요.`);setMessage(`‘${name}’을 옮겼어요. 지금은 ${now.split(' · ')[0]}이에요.`);setPlace('');}
  catch(issue){setMessage(issue instanceof Error?issue.message:'옮기지 못했어요.');}
 };
 const step=(index:number,direction:-1|1)=>{
  const chapter=chapters[index]!;
  // Up: after the chapter two places before (or first). Down: after the next chapter.
  const after=direction<0?(index>=2?chapters[index-2]!.id:null):chapters[index+1]!.id;
  move(chapter.id,after);
 };
 const places=useMemo(()=>chapterMovePlaces(project,selected),[project,selected]);
 const changed=sorted(opened).map(chapter=>chapter.id).join('\n')!==chapters.map(chapter=>chapter.id).join('\n');
 return <dialog ref={ref} className={`${base.dialog} ${surface.surface} ${styles.dialog}`} aria-label="장 순서 바꾸기" onCancel={event=>{event.preventDefault();event.stopPropagation();onClose();}} onKeyDown={event=>trapDialogTab(event,ref.current)}>
  <h2>장 순서 바꾸기</h2>
  <p>장을 옮기면 읽는 순서도 바뀌어요. 선택지나 도착 컷으로 이은 연결은 그대로예요. 읽을 때 닿지 않는 컷이 생기는 자리로는 옮기지 않아요.</p>
  <ol className={styles.chapterList}>
   {chapters.map((chapter,index)=>{
    const cuts=project.lines.filter(line=>line.chapterId===chapter.id).length;
    return <li key={chapter.id} aria-current={chapter.id===selected?'true':undefined}>
     <button type="button" className={styles.pickChapter} onClick={()=>{setSelected(chapter.id);setPlace('');setMessage('');}} aria-pressed={chapter.id===selected}><b>{chapterLabel(chapter)}</b><small>{cuts}컷</small></button>
     <span className={styles.steps}>
      <button type="button" disabled={index===0} aria-label={`${chapterLabel(chapter)} 위로`} onClick={()=>step(index,-1)}>위로</button>
      <button type="button" disabled={index===chapters.length-1} aria-label={`${chapterLabel(chapter)} 아래로`} onClick={()=>step(index,1)}>아래로</button>
     </span>
    </li>;
   })}
  </ol>
  <div className={styles.placeRow}>
   <label>{chapterLabel(project.chapters.find(chapter=>chapter.id===selected)??chapters[0]!).split(' · ')[0]}을 옮길 자리
    <select aria-label="고른 장을 옮길 자리" value={place} onChange={event=>setPlace(event.target.value)}>
     <option value="">자리 고르기</option>
     {places.map(option=><option key={option.afterChapterId??'first'} value={option.afterChapterId??'first'} disabled={!option.ok}>{option.label}{option.ok?'':' · 옮길 수 없어요'}</option>)}
    </select></label>
   <button type="button" disabled={!place} onClick={()=>move(selected,place==='first'?null:place)}>이 자리로 옮기기</button>
  </div>
  <p role="status" className={styles.message}>{message}</p>
  <div className={base.actions}>
   <button type="button" disabled={!changed} onClick={()=>{onChange(opened,'장 순서를 처음대로 되돌렸어요.');setMessage('장 순서를 처음대로 되돌렸어요.');}}>처음대로</button>
   <button type="button" className={base.primary} onClick={onClose}>닫기</button>
  </div>
 </dialog>;
}

/** Moves the current cut to any place: a chapter, then which cut it goes after. */
export function MoveCutControl({project,lineId,onMove}:{project:StoryProject;lineId:string;onMove:(chapterId:string,afterLineId:string|null)=>void}){
 const line=project.lines.find(item=>item.id===lineId)!;
 const [chapterId,setChapterId]=useState(line.chapterId);
 const [after,setAfter]=useState('');
 const cuts=project.lines.filter(item=>item.chapterId===chapterId&&item.id!==lineId).sort((a,b)=>a.order-b.order);
 const here=project.lines.filter(item=>item.chapterId===line.chapterId).sort((a,b)=>a.order-b.order);
 const currentAfter=here[here.findIndex(item=>item.id===lineId)-1]?.id??'first';
 const unchanged=chapterId===line.chapterId&&after===currentAfter;
 return <div className={styles.moveCut}>
  <label>옮길 장<select aria-label="현재 컷을 옮길 장" value={chapterId} onChange={event=>{setChapterId(event.target.value);setAfter('');}}>
   {sorted(project).map(chapter=><option key={chapter.id} value={chapter.id}>{chapterLabel(chapter)}{chapter.id===line.chapterId?' (지금 장)':''}</option>)}
  </select></label>
  <label>옮길 자리<select aria-label="현재 컷을 옮길 자리" value={after} onChange={event=>setAfter(event.target.value)}>
   <option value="">자리 고르기</option>
   <option value="first">맨 앞</option>
   {cuts.map(cut=><option key={cut.id} value={cut.id}>{cut.order}컷 뒤 · {cutText(cut.text)}</option>)}
  </select></label>
  <button type="button" disabled={!after||unchanged} onClick={()=>{onMove(chapterId,after==='first'?null:after);setAfter('');}}>이 자리로 옮기기</button>
 </div>;
}
