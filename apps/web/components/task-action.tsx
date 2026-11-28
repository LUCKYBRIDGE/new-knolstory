'use client';
import {useMemo,useState} from 'react';
import type {AuthoringJsonbSnapshot} from '@knolstory/compatibility';
import styles from './task-action.module.css';
import {ClassroomError,draftPut,editScopeLabel,submissionPut} from '../lib/classroom-api';
import {formatSubmittedAt,snapshotWritten} from '../lib/classroom-local';
import {refreshTaskForWork,useTaskForWork} from './use-task-for-work';
import {dueDateLabel,dueState} from '../lib/due-date';
import {readTaskBaseline,workItems,writtenAmount} from '../lib/task-baseline';
import {TaskBrief} from './classroom/task-brief';

/** A "과제" button in the editor's top bar for a student writing a task copy: what to do, the
 * checklist, how much they have written so far, and — without leaving the editor (2026-11-28 사용자 결정) —
 * sharing the work as it is now with the teacher or handing it in. The task screen stays one link away. */
export function TaskAction({className,accountId,workKey,project,beforeNavigate,csrf,snapshot,disabled=false}:{className:string;accountId:string;workKey:string;project:Parameters<typeof workItems>[0];beforeNavigate?:()=>boolean;csrf?:string;snapshot?:()=>Promise<AuthoringJsonbSnapshot>;disabled?:boolean}){
 const task=useTaskForWork(accountId,workKey);
 const written=useMemo(()=>task?writtenAmount(workItems(project),readTaskBaseline(accountId,task.id)):null,[task,project,accountId]);
 const [busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[error,setError]=useState('');
 if(!task)return null;
 const passed=task.reviewStatus==='passed',canHandIn=!!snapshot&&!!csrf&&task.open&&!passed;
 async function handIn(kind:'draft'|'submit'){
  if(!task||!snapshot||!csrf||busy||disabled)return;
  setBusy(true);setNotice('');setError('');
  try{
   const copy=await snapshot(),written=snapshotWritten(copy,accountId,task.id);
   if(kind==='draft'){await draftPut(task.id,copy,csrf,fetch,written);setNotice('선생님께 중간 저장했어요. 선생님이 지금까지 쓴 작품을 볼 수 있어요.');}
   else{await submissionPut(task.id,copy,csrf,fetch,written);setNotice('제출했어요. 선생님이 확인하면 과제 화면에 알려 줘요.');}
   refreshTaskForWork();
  }catch(issue){setError(issue instanceof ClassroomError?issue.message:issue instanceof Error?issue.message:kind==='draft'?'중간 저장하지 못했어요.':'제출하지 못했어요.');}
  finally{setBusy(false);}
 }
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
   {passed?<p data-task-state>선생님이 통과시켰어요.</p>:task.submittedAt?<p data-task-state>{formatSubmittedAt(task.submittedAt)}에 냈어요.{task.reviewStatus==='revise'?' 선생님이 다시 써 달라고 했어요.':''}</p>:task.draftSavedAt?<p data-task-state>{formatSubmittedAt(task.draftSavedAt)}에 선생님께 중간 저장했어요.</p>:null}
   {canHandIn&&<div data-task-hand-in><button type="button" disabled={busy||disabled} onClick={()=>void handIn('draft')}>선생님께 중간 저장</button><button type="button" data-primary disabled={busy||disabled} onClick={()=>void handIn('submit')}>{task.submittedAt?'고쳐서 다시 내기':'제출'}</button></div>}
   {canHandIn&&<p data-task-hint>지금 쓴 그대로 보내요. 중간 저장은 아직 내지 않고 선생님께 보여 주는 거예요.</p>}
   {notice&&<p role="status">{notice}</p>}{error&&<p role="alert">{error}</p>}
   <a href="/student" onClick={event=>{if(beforeNavigate&&!beforeNavigate())event.preventDefault();}}>과제 화면 열기</a>
  </div>
 </details>;
}
