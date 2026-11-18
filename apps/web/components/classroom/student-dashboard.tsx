'use client';
import {useCallback,useEffect,useState} from 'react';
import {assignmentList,draftPut,submissionMine,submissionPut,ClassroomError,describeEditingPermissions,type Assignment,type ClassroomMe} from '../../lib/classroom-api';
import {downloadSubmissionFile,formatSubmittedAt,listLocalWorks,localWrittenAmount,localWorkSnapshot,snapshotWritten,type LocalWorkChoice} from '../../lib/classroom-local';
import {TaskBrief} from './task-brief';
import {documentList,documentRead} from '../../lib/document-api';
import {formatBytes} from '../../lib/online-storage';
import {withStudentTitle} from '../../lib/student-title';
import {SubmissionImport} from './submission-import';
import type {AccountSession} from '../../lib/account-api';
import {BUILTIN_WORKS} from '../../lib/builtin-works';
import {ClassroomBook} from './classroom-art';
import {MissionCard,useStudentMissions} from './student-missions';
import {MissionSeal} from './classroom-art';
import {groupTodos,type TodoEntry,type TodoGroup} from '../../lib/student-todo';
import {editionLabel,missionKindLabel} from '../../lib/mission-api';
import {dueDateLabel,dueState} from '../../lib/due-date';
import {SeasonNote} from './season-note';
import {currentStudentNumber,rememberStudentNumber,studentNumberLabel} from '../../lib/student-file-prefix';
import {shareLinkHost} from '../../lib/share-link';
import styles from './classroom.module.css';
export function StudentDashboard({me,session}:{me:ClassroomMe;session:AccountSession}){
 const student=me.student!;
 const [assignments,setAssignments]=useState<Assignment[]|null>(null),[works,setWorks]=useState<LocalWorkChoice[]>([]),[online,setOnline]=useState<OnlineChoice[]>([]),[error,setError]=useState('');
 const accountId=session.accountId;
 const load=useCallback(async()=>{
  try{setWorks(listLocalWorks());setAssignments(await assignmentList());setError('');}
  catch(issue){setError(issue instanceof ClassroomError?issue.message:'과제와 기기의 작품을 불러오지 못했어요.');}
  // Personal online works can be handed in too; the device list still works if this fails.
  try{const list=await documentList(fetch,undefined,accountId);setOnline(list.documents.filter(item=>!item.deletedAt).map(item=>({key:`online:${item.recordId}`,title:`${item.title||'제목 없는 작품'} · 내 온라인 작품`,format:item.format})));}catch{setOnline([]);}
 },[accountId]);
 const storage=me.storage;
 // Uploads and hand-ins put this number in front of the title (lib/student-title.ts).
 useEffect(()=>{rememberStudentNumber(student.number);},[student.number]);
 useEffect(()=>{const timer=window.setTimeout(()=>{void load();},0);return()=>window.clearTimeout(timer);},[load]);
 const limits=describeEditingPermissions(student.permissions);
 return <>
  <section className={styles.studentBanner} aria-label="내 정보"><div className={styles.studentNumber} aria-hidden="true">{student.number}<small>번</small></div><div><span className={styles.eyebrow}>나의 이야기 자리</span><h2>{student.className} {student.number}번 {student.name}</h2>
   <p className={styles.hint}>내 작품은 이 기기와 내 온라인 공간에 있어요. 과제를 내면 그 순간의 작품이 제출 공간에 따로 보관돼요.</p>
   {storage?.bytesLimit&&storage.submissions&&<p className={styles.hint} aria-label="내 온라인 공간">개인 {formatBytes(storage.bytes)} / {formatBytes(storage.bytesLimit)} · 제출 {formatBytes(storage.submissions.bytes)} / {formatBytes(storage.submissions.limit)}</p>}</div></section>
  <StudentTodo key={session.accountId} accountId={session.accountId} csrf={session.csrf} assignments={assignments} assignmentError={error} onReload={load}
   card={item=><AssignmentCard assignment={item} works={works.filter(work=>work.key.startsWith('shortstory:')===(item.format==='shortstory'))} online={online.filter(work=>work.format===item.format)} accountId={session.accountId} csrf={session.csrf} onDone={load} canCreate={student.permissions.newWorks} forcedStoryKey={student.permissions.forcedStoryKey}/>}/>
  {/* What to do comes first; the rules and the season's end date follow the tasks. */}
  <SeasonNote createdAt={student.classCreatedAt} audience="student"/>
  <details className={`${styles.card} ${styles.permissionNote}`}><summary>내가 고칠 수 있는 것</summary>
   {limits.length?<ul className={styles.rowsList}>{limits.map(line=><li key={line}>{line}</li>)}</ul>:<p className={styles.hint}>모두 고칠 수 있어요.</p>}</details>
 </>;
}
type OnlineChoice=Readonly<{key:string;title:string;format:'knolstory'|'shortstory'}>;
function AssignmentCard({assignment,works,online=[],csrf,onDone,canCreate,forcedStoryKey,accountId}:{assignment:Assignment;works:LocalWorkChoice[];online?:readonly OnlineChoice[];csrf:string;onDone:()=>Promise<void>;canCreate:boolean;forcedStoryKey:string|null;accountId:string}){
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

 const [from,setFrom]=useState('');
 /** The editor link for this task; `source` continues from a submission or an online work. */
 const taskHref=(source?:string)=>`${assignment.format==='shortstory'?'/shortstory':'/'}?${new URLSearchParams({...(assignment.format==='shortstory'?{mode:'library'}:{view:'editor'}),classTask:assignment.id,...(source?{from:source}:{})})}`;
 /** A copy of the chosen work as it is now: from this device, or from the personal online space. */
 async function snapshotOf(choice:string){return choice.startsWith('online:')?withStudentTitle((await documentRead(choice.slice(7),fetch,accountId)).snapshot):localWorkSnapshot(choice);}
 async function saveFile(){
  if(!key||busy)return;setBusy(true);setError('');setNotice('');
  try{const snapshot=await snapshotOf(key);await downloadSubmissionFile(snapshot,[...works,...online].find(work=>work.key===key)?.title||assignment.title);setNotice('작품 파일을 이 기기에 저장했어요. 제출 링크로 들어가 올려 주세요.');}
  catch(issue){setError(issue instanceof Error?issue.message:'작품 파일을 저장하지 못했어요.');}
  finally{setBusy(false);}
 }
 /** Shows the work as it is now to the teacher, without handing it in. */
 async function shareDraft(){
  if(!assignment.open||!key||busy)return;setBusy(true);setNotice('');setError('');
  try{const snapshot=await snapshotOf(key);await draftPut(assignment.id,snapshot,csrf,fetch,snapshotWritten(snapshot,accountId,assignment.id));setNotice('선생님께 중간 저장했어요. 선생님이 지금까지 쓴 작품을 볼 수 있어요.');await onDone();}
  catch(issue){setError(issue instanceof ClassroomError?issue.message:issue instanceof Error?issue.message:'중간 저장하지 못했어요.');}
  finally{setBusy(false);}
 }
 async function submit(){
  if(!assignment.open||!key||busy)return;setBusy(true);setNotice('');setError('');
  try{const snapshot=await snapshotOf(key);await submissionPut(assignment.id,snapshot,csrf,fetch,snapshotWritten(snapshot,accountId,assignment.id));setNotice('제출했어요. 선생님이 확인하면 여기에 알려 줘요.');await onDone();}
  catch(issue){setError(issue instanceof ClassroomError?issue.message:issue instanceof Error?issue.message:'제출하지 못했어요.');}
  finally{setBusy(false);}
 }
 const review=assignment.reviewStatus??null;
 // One phase decides what the card leads with: the work to do, the wait, a rewrite, or a pass.
 const phase=!assignment.open?'closed':review==='passed'?'passed':review==='revise'?'revise':submitted?'waiting':'working';
 const status=<span className={submitted?styles.badge:`${styles.badge} ${styles.off}`}>{!assignment.open?'닫힘':review==='passed'?'통과':review==='revise'?'다시 써 주세요':submitted?'냈어요':assignment.draftSavedAt?'작성 중':'아직 안 냈어요'}</span>;
 const due=dueState(assignment.dueAt);
 const amountKey=draftKey||(key&&!key.startsWith('online:')?key:'');
 const written=amountKey?localWrittenAmount(amountKey,accountId,assignment.id):null;
 const stage=submitted?3:assignment.draftSavedAt?2:draftKey?1:0;
 const steps=['시작하기','쓰기','선생님께 중간 저장','내기'];
 const canStart=!!(draftKey||canCreate||assignment.storyKey||assignment.template||forcedStoryKey);
 const writeLabel=review==='revise'?'고쳐 쓰기':draftKey?'이어서 쓰기':assignment.template?'선생님 양식으로 시작':'과제 쓰기';
 const brief=<TaskBrief description={assignment.description} checks={assignment.checks} targetAmount={assignment.targetAmount??null} format={assignment.format} current={written?.amount??null} selfCheckKey={`knolstory-task-check:${accountId}:${assignment.id}`}/>;
 const elsewhere=assignment.open&&!draftKey&&(!!submitted||online.length>0);
 const moreWays=!!submitted||elsewhere||!!assignment.shareUrl;
 return <>
  <div className={styles.taskHeading}><h4>{assignment.title}</h4>{status}</div>
  {assignment.dueAt&&due&&phase!=='passed'&&<p className={styles.dueLine} data-tone={due.tone}><b>{due.label}</b> {dueDateLabel(assignment.dueAt)}{due.tone==='late'&&assignment.open&&!submitted?' · 늦었지만 아직 낼 수 있어요':''}</p>}
  {phase==='revise'&&<div className={styles.taskStatus} data-tone="revise" role="status"><strong>선생님이 다시 써 달래요</strong>{assignment.feedback&&<p>{assignment.feedback}</p>}<small>고친 뒤 아래에서 ‘다시 제출’을 눌러요.</small></div>}
  {phase==='waiting'&&<div className={styles.taskStatus} data-tone="waiting" role="status"><strong>냈어요 · 선생님 확인을 기다려요</strong><small>{formatSubmittedAt(submitted)}에 냈어요. 더 고치고 싶으면 이어서 쓴 뒤 다시 낼 수 있어요.</small></div>}
  {phase==='passed'&&<div className={styles.taskStatus} data-tone="passed" role="status"><strong>과제 통과! 잘했어요</strong>{assignment.feedback&&<p>{assignment.feedback}</p>}</div>}
  {phase==='closed'&&<div className={styles.taskStatus} data-tone="closed" role="status"><strong>제출이 마감됐어요</strong>{submitted?<small>{formatSubmittedAt(submitted)}에 낸 작품이 선생님께 있어요.</small>:<small>선생님께 확인해 주세요.</small>}</div>}
  {assignment.draftComment&&phase!=='passed'&&<p className={styles.reviewFeedback} data-tone="note"><b>선생님 한마디</b> {assignment.draftComment}</p>}
  {(phase==='working'||phase==='revise')&&<ol className={styles.stageBar} aria-label="과제 단계">{steps.map((step,index)=><li key={step} data-state={index<stage?'done':index===stage?'current':'todo'} aria-current={index===stage?'step':undefined}>{step}</li>)}</ol>}
  {phase==='working'||phase==='revise'?brief:<details className={styles.taskGuide}><summary>과제 안내 다시 보기</summary>{brief}</details>}
  {baseWork&&<p className={styles.hint}>바탕 작품 · {baseWork.title}{assignment.format!=='shortstory'&&` (${editionLabel(assignment.edition)})`}{assignment.startLabel&&<> · 시작 {assignment.startLabel}</>}{assignment.format!=='shortstory'&&<> · <a href={`/?${new URLSearchParams({view:'library',readWork:baseWork.id,readEdition:assignment.edition==='original'?'original':'knolstory'})}`}>작품 전체 읽기</a></>}</p>}
  {assignment.open&&phase!=='passed'&&canStart&&<p><a className={`${styles.btn} ${styles.primary} ${styles.writeAction}`} href={taskHref()}>{writeLabel}</a></p>}
  {assignment.open&&phase!=='passed'&&(works.length===0&&online.length===0?<p className={styles.hint}>{canStart?'쓰기 화면에서 작품을 만든 뒤 이곳에서 제출해요.':'제출할 작품이 없어요. 선생님께 과제 시작 방법을 확인해 주세요.'}</p>
   :<div className={styles.handIn}>
    <label className={styles.field}>낼 작품<select aria-label="제출할 작품" value={key} onChange={event=>setKey(event.target.value)}><option value="">작품을 골라 주세요</option>{works.length>0&&<optgroup label="이 기기">{works.map(work=><option key={work.key} value={work.key}>{work.title}</option>)}</optgroup>}{online.length>0&&<optgroup label="내 온라인 작품">{online.map(work=><option key={work.key} value={work.key}>{work.title}</option>)}</optgroup>}</select></label>
    <div className={styles.handInActions}>
     <button className={styles.btn} disabled={!key||busy} onClick={()=>void shareDraft()}>선생님께 중간 저장</button>
     <button className={`${styles.btn} ${styles.primary}`} disabled={!key||busy} onClick={()=>void submit()}>{submitted?'다시 제출':'제출'}</button>
    </div>
    <p className={styles.hint}>{assignment.draftSavedAt?`${formatSubmittedAt(assignment.draftSavedAt)}에 중간 저장했어요. `:''}중간 저장은 아직 내지 않고 선생님께 보여 주는 거예요. 다 쓰면 ‘{submitted?'다시 제출':'제출'}’을 눌러요.</p>
   </div>)}
  {notice&&<p className={styles.notice} role="status">{notice}</p>}{error&&<p className={styles.error} role="alert">{error}</p>}
  {moreWays&&<details className={styles.moreWays}><summary>다른 방법</summary>
   {submitted&&<div className={styles.row}><button className={styles.btn} disabled={busy} onClick={()=>void download()}>내 제출본 파일 받기</button><SubmissionImport assignmentId={assignment.id} accountId={accountId} csrf={csrf} disabled={busy}/></div>}
   {elsewhere&&<div className={styles.continueElsewhere}><p className={styles.hint}>다른 기기에서 쓰던 작품이 있나요? 내가 낸 작품이나 내 온라인 작품에서 이어서 쓸 수 있어요.</p>
    <div className={styles.submitRow}><label className={styles.field}>이어 쓸 작품<select aria-label="이어 쓸 작품" value={from} onChange={event=>setFrom(event.target.value)}><option value="">작품을 골라 주세요</option>{submitted&&<option value="submission">내가 낸 작품</option>}{online.map(work=><option key={work.key} value={work.key}>{work.title}</option>)}</select></label>
     <a className={`${styles.btn} ${styles.primary}`} aria-disabled={!from} href={from?taskHref(from):undefined}>이 작품으로 이어 쓰기</a></div></div>}
   {assignment.shareUrl&&<div className={styles.shareBox}><strong>선생님이 정한 제출 링크로 내기</strong>
    <ol><li>위에서 낼 작품을 고르고 <b>작품 파일로 저장</b>을 눌러요. 파일 이름 앞에 내 번호{(()=>{const n=currentStudentNumber();return n?` ${studentNumberLabel(n)}`:'';})()}이 붙어요.</li><li><b>제출 링크 열기</b>로 들어가 저장한 파일을 올려요.</li></ol>
    <div className={styles.row}><button className={styles.btn} disabled={!key||busy} onClick={()=>void saveFile()}>작품 파일로 저장</button><a className={`${styles.btn} ${styles.primary}`} href={assignment.shareUrl} target="_blank" rel="noopener noreferrer">제출 링크 열기 ↗</a></div>
    <small>{shareLinkHost(assignment.shareUrl)}로 이동해요.</small></div>}
  </details>}
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
