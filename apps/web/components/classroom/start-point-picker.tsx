'use client';
import {useEffect,useState} from 'react';
import type {StoryProject} from '@knolstory/story-domain';
import type {BuiltinWorkId} from '../../lib/builtin-works';
import {BUILTIN_WORKS} from '../../lib/builtin-works';
import styles from './classroom.module.css';
type StartModule=typeof import('../../lib/story-start-point');
/**
 * Loads the built-in manuscript only when the teacher picks a base work, then lists where students start.
 * For an adaptation's choice point the teacher also says which paths students write.
 */
export function StartPointPicker({storyKey,edition,value,onChange}:{storyKey:BuiltinWorkId;edition:'original'|'knolstory';value:string;onChange:(value:string,label:string)=>void}){
 const [loaded,setLoaded]=useState<{project:StoryProject;start:StartModule}|null>(null),[error,setError]=useState('');
 useEffect(()=>{
  let alive=true;
  const timer=window.setTimeout(()=>{setLoaded(null);setError('');
   void Promise.all([import('@knolstory/compatibility'),import('../../lib/story-start-point')]).then(([stories,start])=>{
    if(!alive)return;
    const definition=BUILTIN_WORKS.find(work=>work.id===storyKey);
    const project=[...stories.representativeStories,...stories.classicStories].find(item=>item.project.id===(edition==='original'?definition?.originalDocumentId:definition?.knolstoryDocumentId))?.project;
    if(!project){setError('작품을 불러오지 못했어요.');return;}
    setLoaded({project,start});
   }).catch(()=>{if(alive)setError('작품을 불러오지 못했어요.');});
  },0);
  return()=>{alive=false;window.clearTimeout(timer);};
 },[storyKey,edition]);
 const options=loaded?.start.startPointOptions(loaded.project,edition)??null;
 const parsed=value&&loaded?loaded.start.parseStartPoint(value):null;
 const point=parsed?.kind==='choice'?`choice:${parsed.lineId}`:value;
 const scopes=loaded&&parsed?.kind==='choice'?loaded.start.branchScopeOptions(loaded.project,point):[];
 const choose=(next:string)=>onChange(next,next&&loaded?loaded.start.startPointLabel(loaded.project,next)??'':'');
 return <>
  <label className={styles.field}>{edition==='original'?'어느 장부터 쓸까요':'어느 분기점부터 쓸까요'}
   <select aria-label="시작 지점" value={point} disabled={!options} onChange={event=>choose(event.target.value)}>
    <option value="">처음부터 · 작품 전체를 고쳐 써요</option>
    {options?.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}
   </select>
   <span className={styles.hint}>{error||(edition==='original'?'고른 장 앞까지는 그대로 두고, 그 장부터 학생이 새로 써요.':'그 선택지까지 오는 이야기는 그대로 두고, 선택지 뒤를 학생이 새로 써요.')}</span>
  </label>
  {scopes.length>0&&<label className={styles.field}>어떤 갈래를 쓸까요
   <select aria-label="쓸 갈래" value={value} onChange={event=>choose(event.target.value)}>
    {scopes.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}
   </select>
   <span className={styles.hint}>한 갈래만 고르면 다른 갈래는 원래 이야기를 그대로 읽을 수 있어요. 새 선택지를 더하면 학생이 선택지 문구부터 정해요.</span>
  </label>}
 </>;
}
