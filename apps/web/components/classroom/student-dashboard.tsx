'use client';
import {useCallback,useEffect,useState} from 'react';
import {assignmentList,submissionMine,submissionPut,ClassroomError,describeEditingPermissions,type Assignment,type ClassroomMe} from '../../lib/classroom-api';
import {downloadSubmissionFile,formatSubmittedAt,listLocalWorks,localWorkSnapshot,type LocalWorkChoice} from '../../lib/classroom-local';
import type {AccountSession} from '../../lib/account-api';
import {BUILTIN_WORKS} from '../../lib/builtin-works';
import {ClassroomBook} from './classroom-art';
import {MissionCard,useStudentMissions} from './student-missions';
import {MissionSeal} from './classroom-art';
import {groupTodos,type TodoEntry,type TodoGroup} from '../../lib/student-todo';
import {editionLabel,missionKindLabel} from '../../lib/mission-api';
import {dueDateLabel,dueState} from '../../lib/due-date';
import {SeasonNote} from './season-note';
import {currentStudentNumber,studentNumberLabel} from '../../lib/student-file-prefix';
import {shareLinkHost} from '../../lib/share-link';
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
  <SeasonNote createdAt={student.classCreatedAt} audience="student"/>
  <details className={`${styles.card} ${styles.permissionNote}`}><summary>내가 고칠 수 있는 것</summary>
   {limits.length?<ul className={styles.rowsList}>{limits.map(line=><li key={line}>{line}</li>)}</ul>:<p className={styles.hint}>모두 고칠 수 있어요.</p>}</details>
  <StudentTodo key={session.accountId} accountId={session.accountId} csrf={session.csrf} assignments={assignments} assignmentError={error} onReload={load}
   card={item=><AssignmentCard assignment={item} works={works.filter(work=>work.key.startsWith('shortstory:')===(item.format==='shortstory'))} accountId={session.accountId} csrf={session.csrf} onDone={load} canCreate={student.permissions.newWorks} forcedStoryKey={student.permissions.forcedStoryKey}/>}/>
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

 async function saveFile(){
  if(!key||busy)return;setBusy(true);setError('');setNotice('');
  try{const snapshot=await localWorkSnapshot(key);await downloadSubmissionFile(snapshot,works.find(work=>work.key===key)?.title||assignment.title);setNotice('작품 파일을 이 기기에 저장했어요. 제출 링크로 들어가 올려 주세요.');}
  catch(issue){setError(issue instanceof Error?issue.message:'작품 파일을 저장하지 못했어요.');}
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
  {baseWork&&<p className={styles.hint}>바탕 작품 · {baseWork.title}{assignment.format!=='shortstory'&&` (${editionLabel(assignment.edition)})`}{assignment.startLabel&&<> · 시작 {assignment.startLabel}</>}{assignment.format!=='shortstory'&&<> · <a href={`/?${new URLSearchParams({view:'library',readWork:baseWork.id,readEdition:assignment.edition==='original'?'original':'knolstory'})}`}>작품 전체 읽기</a></>}</p>}
  {assignment.shareUrl&&<div className={styles.shareBox}>
   <strong>선생님 제출 링크로 내요</strong>
   <ol><li>아래에서 작품을 고르고 <b>작품 파일로 저장</b>을 눌러요. 파일 이름 앞에 내 번호{(()=>{const n=currentStudentNumber();return n?` ${studentNumberLabel(n)}`:'';})()}이 붙어요.</li><li><b>제출 링크 열기</b>로 들어가 저장한 파일을 올려요.</li></ol>
   <div className={styles.row}><button className={styles.btn} disabled={!key||busy} onClick={()=>void saveFile()}>작품 파일로 저장</button><a className={`${styles.btn} ${styles.primary}`} href={assignment.shareUrl} target="_blank" rel="noopener noreferrer">제출 링크 열기 ↗</a></div>
   <small>{shareLinkHost(assignment.shareUrl)}로 이동해요.</small>
  </div>}
  <p className={styles.submissionStatus}><span className={submitted?styles.badge:`${styles.badge} ${styles.off}`}>{submitted?`제출함 · ${formatSubmittedAt(submitted)}`:'아직 안 냈어요'}</span>
   {assignment.reviewStatus==='passed'&&<span className={styles.reviewChip} data-review="passed">과제 통과</span>}{assignment.reviewStatus==='revise'&&<span className={styles.reviewChip} data-review="revise">다시 써 주세요</span>}{submitted&&!assignment.reviewStatus&&<span className={styles.reviewChip}>선생님 확인 기다려요</span>}</p>
  {assignment.feedback&&<p className={styles.reviewFeedback}><b>{assignment.reviewStatus===null||assignment.reviewStatus===undefined?'지난 피드백':'선생님 피드백'}</b> {assignment.feedback}</p>}
  {submitted&&<button className={styles.btn} disabled={busy} onClick={()=>void download()}>내 제출본 파일 받기</button>}
  {assignment.open&&(draftKey||canCreate||assignment.storyKey||forcedStoryKey)&&<p><a className={`${styles.btn} ${styles.primary}`} href={`${assignment.format==='shortstory'?'/shortstory':'/'}?${new URLSearchParams({...(assignment.format==='shortstory'?{mode:'library'}:{view:'editor'}),classTask:assignment.id})}`}>{draftKey?'이어서 쓰기':'과제 쓰기'}</a></p>}
  {!assignment.open?<p className={styles.hint}>제출이 마감됐어요.</p>:works.length===0?<p className={styles.hint}>{canCreate||assignment.storyKey||forcedStoryKey?'이야기를 쓴 뒤 이곳에서 제출해 주세요.':'제출할 작품이 없어요. 선생님께 과제 시작 방법을 확인해 주세요.'}</p>
   :<div className={styles.submitRow}><label className={styles.field}>제출할 작품<select value={key} onChange={event=>setKey(event.target.value)}><option value="">작품을 골라 주세요</option>{works.map(work=><option key={work.key} value={work.key}>{work.title}</option>)}</select></label>
    <button className={`${styles.btn} ${styles.primary}`} disabled={!key||busy} onClick={()=>void submit()}>{submitted?'다시 제출':'제출'}</button></div>}
  {notice&&<p className={styles.notice} role="status">{notice}</p>}{error&&<p className={styles.error} role="alert">{error}</p>}
 </>;
}

const GROUPS:readonly {group:TodoGroup;title:string;empty:string}[]=[
 {group:'todo',title:'해야 해요',empty:'지금 할 일을 모두 끝냈어요.'},
 {group:'waiting',title:'냈어요 · 선생님 확인을 기다려요',empty:''},
 {group:'done',title:'끝났어요',empty:''},
];
/** One list for writing tasks and missions: what to do now first, nearest due date first. */
function StudentTodo({accountId,csrf,assignments,assignmentError,onReload,card}:{accountId:string;csrf:string;assignments:Assignment[]|null;assignmentError:string;onReload:()=>Promise<void>;card:(item:Assignment)=>React.ReactNode}){
 const missions=useStudentMissions();
 const [now]=useState(()=>Date.now());
 const loading=(assignments===null&&!assignmentError)||(missions.missions===null&&!missions.error);
 const groups=groupTodos(assignments??[],missions.missions??[]);
 const total=groups.todo.length+groups.waiting.length+groups.done.length,finished=groups.done.length;
 const label=(entry:TodoEntry)=>entry.type==='assignment'?`작품 쓰기 · ${entry.item.format==='shortstory'?'숏스토리':'놀스토리'}`:missionKindLabel(entry.item.kind);
 const render=(entry:TodoEntry)=>{const due=dueState(entry.item.dueAt,now);return <li key={`${entry.type}:${entry.item.id}`} className={styles.todoItem} data-todo={entry.type} data-format={entry.type==='assignment'?entry.item.format:undefined}>
  <div className={styles.todoMeta}><span className={styles.todoType} data-type={entry.type}>{label(entry)}</span>{due&&entry.item.dueAt!=null&&<span className={styles.dueChip} data-tone={due.tone} title={dueDateLabel(entry.item.dueAt)}>{due.label} · {dueDateLabel(entry.item.dueAt)}</span>}</div>
  {entry.type==='assignment'?<div className={styles.assignmentCard}>{card(entry.item)}</div>:<MissionCard accountId={accountId} csrf={csrf} mission={entry.item} onProgress={progress=>missions.setProgress(entry.item.id,progress)}/>}
 </li>;};
 return <section className={styles.todo} aria-label="할 일">
  <div className={styles.todoHead}><div><span className={styles.eyebrow}>오늘의 이야기 숙제</span><h2 className={styles.studentTasksTitle}>할 일</h2></div>
   {total>0&&<span className={styles.todoCount} aria-label={`할 일 ${total}개 가운데 ${finished}개 끝냄`}><MissionSeal small earned={finished>0&&finished===total}/><span><b>{finished}</b> / {total} 끝</span></span>}</div>
  {assignmentError&&<div role="alert"><p className={styles.error}>{assignmentError}</p><button className={styles.btn} onClick={()=>void onReload()}>다시 불러오기</button></div>}
  {missions.error&&<div role="alert"><p className={styles.error}>{missions.error}</p><button className={styles.btn} disabled={missions.loading} onClick={()=>void missions.load()}>과제 다시 불러오기</button></div>}
  {loading?<p className={styles.hint} role="status">할 일을 불러오고 있어요.</p>:total===0?<p className={styles.card}>아직 선생님이 낸 할 일이 없어요.</p>
   /* One list for all groups: a card that moves (submitted, passed) keeps its state and its message. */
   :<ul className={styles.todoList}>{GROUPS.flatMap(({group,title,empty})=>{const list=groups[group];if(!list.length&&!empty)return [];
    return [<li key={`group:${group}`} className={styles.todoGroupHead} data-group={group}><h3>{title} <small>{list.length}</small></h3>{!list.length&&<p className={styles.hint}>{empty}</p>}</li>,...list.map(render)];})}</ul>}
 </section>;
}
