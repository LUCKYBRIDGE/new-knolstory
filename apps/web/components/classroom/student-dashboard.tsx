'use client';
import {useCallback,useEffect,useState} from 'react';
import {assignmentList,submissionMine,submissionPut,ClassroomError,describeEditingPermissions,type Assignment,type ClassroomMe} from '../../lib/classroom-api';
import {downloadSubmissionFile,formatSubmittedAt,listLocalWorks,localWorkSnapshot,type LocalWorkChoice} from '../../lib/classroom-local';
import type {AccountSession} from '../../lib/account-api';
import {BUILTIN_WORKS} from '../../lib/builtin-works';
import {ClassroomBook} from './classroom-art';
import {StudentMissions} from './student-missions';
import styles from './classroom.module.css';
export function StudentDashboard({me,session}:{me:ClassroomMe;session:AccountSession}){
 const student=me.student!;
 const [assignments,setAssignments]=useState<Assignment[]|null>(null),[works,setWorks]=useState<LocalWorkChoice[]>([]),[error,setError]=useState('');
 const load=useCallback(async()=>{
  try{setWorks(listLocalWorks());setAssignments(await assignmentList());setError('');}
  catch(issue){setError(issue instanceof ClassroomError?issue.message:'과제와 기기의 작품을 불러오지 못했어요.');}
 },[]);
 useEffect(()=>{const timer=window.setTimeout(()=>{void load();},0);return()=>window.clearTimeout(timer);},[load]);
 const limits=describeEditingPermissions(student.permissions);
 return <>
  <section className={styles.studentBanner} aria-label="내 정보"><div className={styles.studentNumber} aria-hidden="true">{student.number}<small>번</small></div><div><span className={styles.eyebrow}>나의 이야기 자리</span><h2>{student.className} {student.number}번 {student.name}</h2>
   <p className={styles.hint}>내 작품은 이 기기에 있어요. 과제를 낼 때 선생님께 보내져요.</p></div></section>
  <details className={`${styles.card} ${styles.permissionNote}`}><summary>내가 고칠 수 있는 것</summary>
   {limits.length?<ul className={styles.rowsList}>{limits.map(line=><li key={line}>{line}</li>)}</ul>:<p className={styles.hint}>모두 고칠 수 있어요.</p>}</details>
  <StudentMissions accountId={session.accountId} csrf={session.csrf}/>
  <section aria-label="과제"><h2 className={styles.studentTasksTitle}>나의 과제</h2>
   {error&&<div role="alert"><p className={styles.error}>{error}</p><button className={styles.btn} onClick={()=>void load()}>다시 불러오기</button></div>}
   {assignments===null&&!error?<p className={styles.hint} role="status">불러오는 중이에요.</p>:assignments===null?null:assignments.length===0?<p className={styles.card}>아직 과제가 없어요.</p>
    :<div className={styles.studentTaskGrid}>{(['knolstory','shortstory'] as const).map(format=>{
     const tasks=assignments.filter(item=>item.format===format),opened=tasks.filter(item=>item.open),closed=tasks.filter(item=>!item.open);
     const cards=(items:Assignment[])=><ul className={styles.list}>{items.map(item=><li key={item.id} className={styles.assignmentCard} data-format={format}><AssignmentCard assignment={item} works={works.filter(work=>work.key.startsWith('shortstory:')===(format==='shortstory'))} accountId={session.accountId} csrf={session.csrf} onDone={load} canCreate={student.permissions.newWorks} forcedStoryKey={student.permissions.forcedStoryKey}/></li>)}</ul>;
     return <section className={styles.typeSection} key={format} data-format={format} aria-label={format==='knolstory'?'놀스토리 과제':'숏스토리 과제'}><div className={styles.typeHeading}><ClassroomBook format={format}/><div><h3>{format==='knolstory'?'놀스토리':'숏스토리'}</h3><p>{format==='knolstory'?'장면과 대사로 펼치는 이야기':'삽화와 글로 엮는 그림책'}</p></div><span className={styles.taskCount}>{opened.length}<small>개</small></span></div>{opened.length?cards(opened):<p className={styles.hint}>열린 과제가 없어요.</p>}{closed.length>0&&<details><summary>마감된 과제 {closed.length}개</summary>{cards(closed)}</details>}</section>;
    })}</div>}
  </section>
 </>;
}
function AssignmentCard({assignment,works,csrf,onDone,canCreate,forcedStoryKey,accountId}:{assignment:Assignment;works:LocalWorkChoice[];csrf:string;onDone:()=>Promise<void>;canCreate:boolean;forcedStoryKey:string|null;accountId:string}){
 const [key,setKey]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[error,setError]=useState('');
 const submitted=assignment.submittedAt;
 const [draftKey,setDraftKey]=useState('');
 useEffect(()=>{
  const timer=window.setTimeout(()=>{
   try{const saved=localStorage.getItem(`knolstory-class-task:${accountId}:${assignment.id}`);
   if(saved&&works.some(work=>work.key===saved)){setDraftKey(saved);setKey(saved);}}catch{setError('기기의 과제 작성본을 확인하지 못했어요. 작품을 직접 골라 제출해 주세요.');}
  },0);
  return()=>window.clearTimeout(timer);
 },[accountId,assignment.id,works]);

 const baseWork=BUILTIN_WORKS.find(work=>work.id===assignment.storyKey);
 async function download(){
  if(busy)return;
  setBusy(true);setError('');setNotice('');
  try{
   const saved=await submissionMine(assignment.id);
   if(!saved)throw Error('제출본을 찾지 못했어요.');
   await downloadSubmissionFile(saved.document,assignment.title);
  }catch(issue){setError(issue instanceof ClassroomError?issue.message:'제출본 파일을 받지 못했어요.');}
  finally{setBusy(false);}
 }

 async function submit(){
  if(!assignment.open||!key||busy)return;setBusy(true);setNotice('');setError('');
  try{const snapshot=await localWorkSnapshot(key);await submissionPut(assignment.id,snapshot,csrf);setNotice('제출했어요.');await onDone();}
  catch(issue){setError(issue instanceof ClassroomError?issue.message:issue instanceof Error?issue.message:'제출하지 못했어요.');}
  finally{setBusy(false);}
 }
 return <>
  <div className={styles.taskHeading}><h4>{assignment.title}</h4><span className={assignment.open?styles.badge:`${styles.badge} ${styles.off}`}>{assignment.open?'열림':'닫힘'}</span></div>
  {assignment.description&&<p className={styles.hint}>{assignment.description}</p>}
  {baseWork&&<p className={styles.hint}>바탕 작품 · {baseWork.title}</p>}
  <p className={styles.submissionStatus}><span className={submitted?styles.badge:`${styles.badge} ${styles.off}`}>{submitted?`제출함 · ${formatSubmittedAt(submitted)}`:'아직 안 냈어요'}</span></p>
  {submitted&&<button className={styles.btn} disabled={busy} onClick={()=>void download()}>내 제출본 파일 받기</button>}
  {assignment.open&&(draftKey||canCreate||assignment.storyKey||forcedStoryKey)&&<p><a className={`${styles.btn} ${styles.primary}`} href={`${assignment.format==='shortstory'?'/shortstory':'/'}?${new URLSearchParams({...(assignment.format==='shortstory'?{mode:'library'}:{view:'editor'}),classTask:assignment.id})}`}>{draftKey?'이어서 쓰기':'과제 쓰기'}</a></p>}
  {!assignment.open?<p className={styles.hint}>제출이 마감됐어요.</p>:works.length===0?<p className={styles.hint}>{canCreate||assignment.storyKey||forcedStoryKey?'이야기를 쓴 뒤 이곳에서 제출해 주세요.':'제출할 작품이 없어요. 선생님께 과제 시작 방법을 확인해 주세요.'}</p>
   :<div className={styles.submitRow}><label className={styles.field}>제출할 작품<select value={key} onChange={event=>setKey(event.target.value)}><option value="">작품을 골라 주세요</option>{works.map(work=><option key={work.key} value={work.key}>{work.title}</option>)}</select></label>
    <button className={`${styles.btn} ${styles.primary}`} disabled={!key||busy} onClick={()=>void submit()}>{submitted?'다시 제출':'제출'}</button></div>}
  {notice&&<p className={styles.notice} role="status">{notice}</p>}{error&&<p className={styles.error} role="alert">{error}</p>}
 </>;
}
