'use client';
import {useEffect,useState} from 'react';
import type {BuiltinWorkId} from '../../lib/builtin-works';
import {BUILTIN_WORKS} from '../../lib/builtin-works';
import type {StartOption} from '../../lib/story-start-point';
import styles from './classroom.module.css';
/** Loads the built-in manuscript only when the teacher picks a base work, then lists where students start. */
export function StartPointPicker({storyKey,edition,value,onChange}:{storyKey:BuiltinWorkId;edition:'original'|'knolstory';value:string;onChange:(value:string,label:string)=>void}){
 const [options,setOptions]=useState<StartOption[]|null>(null),[error,setError]=useState('');
 useEffect(()=>{
  let alive=true;
  const timer=window.setTimeout(()=>{setOptions(null);setError('');
   void Promise.all([import('@knolstory/compatibility'),import('../../lib/story-start-point')]).then(([stories,start])=>{
    if(!alive)return;
    const definition=BUILTIN_WORKS.find(work=>work.id===storyKey);
    const project=[...stories.representativeStories,...stories.classicStories].find(item=>item.project.id===(edition==='original'?definition?.originalDocumentId:definition?.knolstoryDocumentId))?.project;
    if(!project){setError('작품을 불러오지 못했어요.');return;}
    setOptions(start.startPointOptions(project,edition));
   }).catch(()=>{if(alive)setError('작품을 불러오지 못했어요.');});
  },0);
  return()=>{alive=false;window.clearTimeout(timer);};
 },[storyKey,edition]);
 return <label className={styles.field}>{edition==='original'?'어느 장부터 쓸까요':'어느 분기점부터 쓸까요'}
  <select aria-label="시작 지점" value={value} disabled={!options} onChange={event=>onChange(event.target.value,event.target.selectedOptions[0]?.textContent??'')}>
   <option value="">처음부터 · 작품 전체를 고쳐 써요</option>
   {options?.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}
  </select>
  <span className={styles.hint}>{error||(edition==='original'?'고른 장 앞까지는 그대로 두고, 그 장부터 학생이 새로 써요.':'그 선택지까지 오는 이야기는 그대로 두고, 선택지 뒤를 학생이 새로 써요.')}</span>
 </label>;
}
