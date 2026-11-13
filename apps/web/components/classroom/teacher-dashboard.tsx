'use client';
import {useCallback,useEffect,useRef,useState,type FormEvent} from 'react';
import {classroomCreate,classroomRead,classroomUpdate,studentsCreate,ClassroomError,type Classroom,type EditingPermissions} from '../../lib/classroom-api';
import type {AccountSession} from '../../lib/account-api';
import type {ServiceSection} from '../../lib/service-navigation';
import {AssignmentsPanel} from './assignments-panel';
import {MissionsPanel} from './missions-panel';
import {PermissionEditor} from './permission-editor';
import {StudentTable} from './student-table';
import {SeasonNote} from './season-note';
import {TaskComposer,type TaskRequest} from './task-composer';
import {StudentQrPrintWorkspace} from './student-qr-print';
import styles from './classroom.module.css';
export type TeacherPanel=Exclude<ServiceSection,'library'|'admin'>;
export function TeacherDashboard({session,panel='assignments'}:{session:AccountSession;panel?:TeacherPanel}){
 const csrf=session.csrf;
 const [classroom,setClassroom]=useState<Classroom|null|undefined>(undefined),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
 const [loadFailed,setLoadFailed]=useState(false);
 const [name,setName]=useState(''),[count,setCount]=useState('1'),[confirmCode,setConfirmCode]=useState(false),[newQr,setNewQr]=useState<readonly number[]|null>(null),[taskRequest,setTaskRequest]=useState<TaskRequest|null>(null);
 const alive=useRef(true),mutation=useRef(false);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 const run=useCallback(async<T,>(action:()=>Promise<T>):Promise<T|undefined>=>{
  setError('');
  try{return await action();}catch(issue){if(alive.current)setError(issue instanceof ClassroomError?issue.message:'처리하지 못했어요.');return undefined;}
 },[]);
 const reload=useCallback(async(next?:Classroom)=>{if(next){setClassroom(next);return;}const value=await run(()=>classroomRead());if(value!==undefined||alive.current)setClassroom(value===undefined?classroom:value);},[run,classroom]);
 useEffect(()=>{const timer=window.setTimeout(()=>{classroomRead().then(value=>{if(alive.current)setClassroom(value);}).catch(issue=>{if(alive.current){setLoadFailed(true);setClassroom(undefined);setError(issue instanceof ClassroomError?issue.message:'학급을 불러오지 못했어요.');}});},0);return()=>window.clearTimeout(timer);},[]);
 async function mutate(action:()=>Promise<Classroom>,message=''){
  if(mutation.current)return false;
  mutation.current=true;setBusy(true);setNotice('');
  try{const next=await run(action);if(next){setClassroom(next);if(message)setNotice(message);}return !!next;}
  finally{mutation.current=false;setBusy(false);}
 }
 if(loadFailed)return <section className={styles.card} role="alert"><p>{error}</p><button className={styles.btn} onClick={()=>{setLoadFailed(false);void classroomRead().then(value=>setClassroom(value)).catch(()=>setLoadFailed(true));}}>다시 불러오기</button></section>;
 if(classroom===undefined)return <p className={styles.card} role="status">불러오는 중이에요.</p>;
 if(classroom===null)return <form className={styles.card} aria-label="학급 만들기" onSubmit={(event:FormEvent)=>{event.preventDefault();if(name.trim())void mutate(()=>classroomCreate(name.trim(),csrf));}}>
  <h2>학급 만들기</h2><p className={styles.hint}>학급을 열면 학생이 들어올 학급 코드가 만들어져요. 교사 한 명이 학급 하나를 열 수 있어요.</p>
  <ol className={styles.setupSteps}><li><b>학급 만들기</b><span>이름만 정하면 돼요</span></li><li><b>학생 계정 만들기</b><span>30명까지, 번호와 비밀번호가 함께 생겨요</span></li><li><b>과제 내기</b><span>제공 과제를 가져오면 바로 시작해요</span></li></ol>
  <div className={styles.row}><label className={styles.field}>학급 이름<input value={name} onChange={event=>setName(event.target.value)} maxLength={30} placeholder="예: 5학년 3반"/></label><button className={`${styles.btn} ${styles.primary}`} disabled={busy||!name.trim()}>학급 만들기</button></div>
  {error&&<p className={styles.error} role="alert">{error}</p>}
 </form>;
 const remaining=30-classroom.students.length;
 const setDefault=(value:EditingPermissions)=>void mutate(()=>classroomUpdate({defaultPermissions:value},csrf),'학급 기본값을 바꿨어요.');
 return <>
  {error&&<p className={styles.error} role="alert">{error}</p>}{notice&&<p className={styles.notice} role="status">{notice}</p>}
  <section className={styles.classBanner} aria-label="학급"><div className={styles.classIdentity}><span className={styles.eyebrow}>함께 쓰고, 함께 읽는</span><h2>{classroom.name}</h2><span className={styles.classCount}>학생 {classroom.students.length}명</span></div>
   {panel==='settings'&&<div className={styles.classAccess}><span className={styles.hint}>학생 접속 코드</span><span className={styles.code} aria-label="학급 코드">{classroom.classCode}</span>
   <details><summary>학급 코드 바꾸기</summary>{confirmCode?<div className={styles.row}><span>새 코드를 만들면 학생은 새 코드로 로그인해야 해요.</span><button className={`${styles.btn} ${styles.primary}`} disabled={busy} onClick={()=>{setConfirmCode(false);void mutate(()=>classroomUpdate({regenerateCode:true},csrf),'학급 코드를 새로 만들었어요.');}}>새로 만들기</button><button className={styles.btn} onClick={()=>setConfirmCode(false)}>취소</button></div>
    :<button className={styles.btn} disabled={busy} onClick={()=>setConfirmCode(true)}>학급 코드 새로 만들기</button>}</details></div>}
  </section>
  <SeasonNote createdAt={classroom.createdAt} audience="teacher"/>
  {panel==='assignments'&&<><TaskComposer onPick={kind=>setTaskRequest({kind,nonce:Date.now()})}/><AssignmentsPanel csrf={csrf} run={run} studentCount={classroom.students.length} request={taskRequest}/><MissionsPanel csrf={csrf} request={taskRequest}/></>}
  {panel==='students'&&<>
   <section className={styles.card} aria-label="학생 만들기"><h2>학생 만들기</h2>
    <p className={styles.hint} id="student-create-hint">{remaining>0?<>빈 번호부터 차례로 만들어요. 지금 {classroom.students.length}명, {remaining}명 더 만들 수 있어요.</>:'학급 인원 30명을 모두 만들었어요.'}</p>
    <form className={styles.row} onSubmit={event=>{event.preventDefault();const n=Number(count);if(Number.isInteger(n)&&n>=1&&n<=remaining){const before=new Set(classroom.students.map(student=>student.number));let made:Classroom|undefined;void mutate(async()=>made=await studentsCreate(n,csrf),`학생 ${n}명을 만들었어요. 바로 QR을 보여 드릴게요.`).then(done=>{if(!done)return;setCount('1');const fresh=made?.students.map(student=>student.number).filter(number=>!before.has(number))??[];if(fresh.length)setNewQr(fresh);});}else setError(`1명에서 ${remaining}명 사이로 써 주세요.`);}}>
     <label className={styles.field}>만들 학생 수<input value={count} onChange={event=>setCount(event.target.value.replace(/[^0-9]/g,''))} inputMode="numeric" size={4} disabled={remaining<1} aria-describedby="student-create-hint"/></label>
     <button className={`${styles.btn} ${styles.primary}`} disabled={busy||remaining<1}>학생 만들기</button>
    </form>
   </section>
   <section className={`${styles.card} ${styles.roster}`} aria-label="학생 목록"><h2>학생</h2>
    <StudentTable classroom={classroom} csrf={csrf} run={run} onChanged={next=>void reload(next)}/>
   </section>
   {newQr&&<StudentQrPrintWorkspace numbers={newQr} csrf={csrf} onClose={()=>{setNewQr(null);void reload();}}/>}
  </>}
  {panel==='settings'&&<>
   <ClassNameForm key={`${classroom.id}:${classroom.name}`} name={classroom.name} busy={busy} onSave={value=>void mutate(()=>classroomUpdate({name:value},csrf),'학급 이름을 바꿨어요.')}/>
   <section className={styles.card} aria-label="학급 기본 편집 허용"><h2>학급 기본 편집 허용</h2>
    <p className={styles.hint}>학생마다 따로 정하지 않으면 이 범위가 적용돼요.</p>
    <PermissionEditor value={classroom.defaultPermissions} onChange={setDefault} disabled={busy}/>
   </section>
  </>}
 </>;
}
function ClassNameForm({name,busy,onSave}:{name:string;busy:boolean;onSave:(value:string)=>void}){
 const [value,setValue]=useState(name);
 return <form className={styles.card} aria-label="학급 이름 바꾸기" onSubmit={event=>{event.preventDefault();if(value.trim()&&value.trim()!==name)onSave(value.trim());}}>
  <h2>학급 이름</h2>
  <div className={styles.row}><label className={styles.field}>학급 이름<input value={value} onChange={event=>setValue(event.target.value)} maxLength={30}/></label><button className={`${styles.btn} ${styles.primary}`} disabled={busy||!value.trim()||value.trim()===name}>이름 바꾸기</button></div>
 </form>;
}
