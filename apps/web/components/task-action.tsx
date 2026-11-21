'use client';
import {useMemo} from 'react';
import styles from './task-action.module.css';
import {editScopeLabel} from '../lib/classroom-api';
import {useTaskForWork} from './use-task-for-work';
import {dueDateLabel,dueState} from '../lib/due-date';
import {readTaskBaseline,workItems,writtenAmount} from '../lib/task-baseline';
import {TaskBrief} from './classroom/task-brief';

/** A "과제" button in the editor's top bar for a student writing a task copy: what to do, the
 * checklist, how much they have written so far, and the way back to the task to share or hand in. */
export function TaskAction({className,accountId,workKey,project,beforeNavigate}:{className:string;accountId:string;workKey:string;project:Parameters<typeof workItems>[0];beforeNavigate?:()=>boolean}){
 const task=useTaskForWork(accountId,workKey);
 const written=useMemo(()=>task?writtenAmount(workItems(project),readTaskBaseline(accountId,task.id)):null,[task,project,accountId]);
 if(!task)return null;
 const due=dueState(task.dueAt);
 return <details className={`${styles.taskAction} ${className}`} data-task-action>
  <summary aria-label={`과제 · ${task.title}${due?` · ${due.label}`:''}`} title={`과제 · ${task.title}`}>
   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 4h6l1 2h3v15H5V6h3z"/><path d="m9 13 2 2 4-4"/></svg>
   <span>과제{due&&due.tone!=='later'?` · ${due.label}`:''}</span>
  </summary>
  <div role="group" aria-label="이 작품의 과제">
   <strong>{task.title}</strong>
   {task.dueAt&&due&&<p data-tone={due.tone}>{due.label} · {dueDateLabel(task.dueAt)}</p>}
   <TaskBrief description={task.description} checks={task.checks} targetAmount={task.targetAmount??null} format={task.format} current={written?.amount??null} selfCheckKey={`knolstory-task-check:${accountId}:${task.id}`}/>
   {task.editScope&&<p data-task-scope><b>이 과제에서 고칠 수 있는 것</b> {editScopeLabel(task.editScope)}</p>}
   {task.draftComment&&<p><b>선생님 한마디</b> {task.draftComment}</p>}
   <a href="/student" onClick={event=>{if(beforeNavigate&&!beforeNavigate())event.preventDefault();}}>과제 화면에서 중간 저장·제출하기</a>
  </div>
 </details>;
}
