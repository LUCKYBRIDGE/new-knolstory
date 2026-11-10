'use client';
import {useCallback,useEffect,useState} from 'react';
import {assignmentList,submissionPut,ClassroomError,describeEditingPermissions,type Assignment,type ClassroomMe} from '../../lib/classroom-api';
import {formatSubmittedAt,listLocalWorks,localWorkSnapshot,type LocalWorkChoice} from '../../lib/classroom-local';
import type {AccountSession} from '../../lib/account-api';
import styles from './classroom.module.css';
export function StudentDashboard({me,session}:{me:ClassroomMe;session:AccountSession}){
 const student=me.student!;
 const [assignments,setAssignments]=useState<Assignment[]|null>(null),[works,setWorks]=useState<LocalWorkChoice[]>([]),[error,setError]=useState('');
 const load=useCallback(async()=>{try{setAssignments(await assignmentList());setError('');}catch(issue){setError(issue instanceof ClassroomError?issue.message:'과제를 불러오지 못했어요.');}},[]);
 useEffect(()=>{const timer=window.setTimeout(()=>{void load();try{setWorks(listLocalWorks());}catch{setError('이 기기의 작품 목록을 읽지 못했어요.');}},0);return()=>window.clearTimeout(timer);},[load]);
 const limits=describeEditingPermissions(student.permissions);
 return <>
  <section className={styles.card} aria-label="내 정보"><h2>{student.className} {student.number}번 {student.name}</h2>
   <p className={styles.hint}>내 작품은 이 기기에 있어요. 과제를 낼 때만 선생님께 보내져요.</p></section>
  <section className={styles.card} aria-label="내가 고칠 수 있는 것"><h2>내가 고칠 수 있는 것</h2>
   {limits.length?<ul className={styles.rowsList}>{limits.map(line=><li key={line}>{line}</li>)}</ul>:<p className={styles.hint}>모두 고칠 수 있어요.</p>}</section>
  <section aria-label="과제"><h2 style={{fontSize:'1.125rem'}}>열린 과제</h2>
   {error&&<p className={styles.error} role="alert">{error}</p>}
   {assignments===null?<p className={styles.hint} role="status">불러오는 중이에요.</p>:assignments.filter(item=>item.open).length===0?<p className={styles.card}>지금 열린 과제가 없어요.</p>
    :<ul className={styles.list}>{assignments.filter(item=>item.open).map(item=><li key={item.id} className={styles.card}><AssignmentCard assignment={item} works={works} csrf={session.csrf} onDone={load}/></li>)}</ul>}
  </section>
 </>;
}
function AssignmentCard({assignment,works,csrf,onDone}:{assignment:Assignment;works:LocalWorkChoice[];csrf:string;onDone:()=>Promise<void>}){
 const [key,setKey]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[error,setError]=useState('');
 const submitted=assignment.submittedAt;
 async function submit(){
  if(!key||busy)return;setBusy(true);setNotice('');setError('');
  try{const snapshot=await localWorkSnapshot(key);await submissionPut(assignment.id,snapshot,csrf);setNotice('제출했어요.');await onDone();}
  catch(issue){setError(issue instanceof ClassroomError?issue.message:issue instanceof Error?issue.message:'제출하지 못했어요.');}
  finally{setBusy(false);}
 }
 return <>
  <h3 style={{margin:'0 0 4px'}}>{assignment.title}</h3>
  {assignment.description&&<p className={styles.hint}>{assignment.description}</p>}
  <p><span className={submitted?styles.badge:`${styles.badge} ${styles.off}`}>{submitted?`제출함 · ${formatSubmittedAt(submitted)}`:'아직 안 냈어요'}</span></p>
  {works.length===0?<p className={styles.hint}>이 기기에 제출할 작품이 없어요. 서재에서 작품을 만든 뒤 와 주세요.</p>
   :<div className={styles.row}><label className={styles.field}>제출할 작품<select value={key} onChange={event=>setKey(event.target.value)}><option value="">작품을 골라 주세요</option>{works.map(work=><option key={work.key} value={work.key}>{work.title}</option>)}</select></label>
    <button className={`${styles.btn} ${styles.primary}`} disabled={!key||busy} onClick={()=>void submit()}>{submitted?'다시 제출':'제출'}</button></div>}
  {notice&&<p className={styles.notice} role="status">{notice}</p>}{error&&<p className={styles.error} role="alert">{error}</p>}
 </>;
}
