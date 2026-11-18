'use client';
import {useEffect,useMemo,useState} from 'react';
import type {StoryProject} from '@knolstory/story-domain';
import {assignmentList,type Assignment} from '../lib/classroom-api';
import {dueDateLabel,dueState} from '../lib/due-date';
import {readTaskBaseline,workItems,writtenAmount} from '../lib/task-baseline';
import {TaskBrief} from './classroom/task-brief';

const PREFIX='knolstory-class-task:';
/** The task this device's work belongs to, if the student started it from a task. */
function boundTask(accountId:string,workKey:string):string|null{
 try{
  for(let i=0;i<localStorage.length;i++){
   const name=localStorage.key(i);
   if(name?.startsWith(`${PREFIX}${accountId}:`)&&localStorage.getItem(name)===workKey)return name.slice(`${PREFIX}${accountId}:`.length);
  }
 }catch{/* No binding without device storage. */}
 return null;
}
/** A "과제" button in the editor's top bar for a student writing a task copy: what to do, the
 * checklist, how much they have written so far, and the way back to the task to share or hand in. */
export function TaskAction({className,accountId,workKey,project}:{className?:string;accountId:string;workKey:string;project:StoryProject}){
 const [task,setTask]=useState<Assignment|null>(null);
 useEffect(()=>{
  let live=true;
  const timer=window.setTimeout(async()=>{
   const id=boundTask(accountId,workKey);
   if(!id){if(live)setTask(null);return;}
   try{const found=(await assignmentList()).find(item=>item.id===id)??null;if(live)setTask(found);}catch{if(live)setTask(null);}
  },0);
  return()=>{live=false;window.clearTimeout(timer);};
 },[accountId,workKey]);
 const written=useMemo(()=>task?writtenAmount(workItems(project),readTaskBaseline(accountId,task.id)):null,[task,project,accountId]);
 if(!task)return null;
 const due=dueState(task.dueAt);
 return <details className={className} data-task-action>
  <summary aria-label={`과제 · ${task.title}${due?` · ${due.label}`:''}`} title={`과제 · ${task.title}`}>
   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 4h6l1 2h3v15H5V6h3z"/><path d="m9 13 2 2 4-4"/></svg>
   <span>과제{due&&due.tone!=='later'?` · ${due.label}`:''}</span>
  </summary>
  <div role="group" aria-label="이 작품의 과제">
   <strong>{task.title}</strong>
   {task.dueAt&&due&&<p data-tone={due.tone}>{due.label} · {dueDateLabel(task.dueAt)}</p>}
   <TaskBrief description={task.description} checks={task.checks} targetAmount={task.targetAmount??null} format={task.format} current={written?.amount??null} selfCheckKey={`knolstory-task-check:${accountId}:${task.id}`}/>
   {task.draftComment&&<p><b>선생님 한마디</b> {task.draftComment}</p>}
   <a href="/student">과제 화면에서 중간 저장·제출하기</a>
  </div>
 </details>;
}
