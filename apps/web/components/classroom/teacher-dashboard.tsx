'use client';
import {useCallback,useEffect,useRef,useState,type FormEvent} from 'react';
import {classroomCreate,classroomRead,classroomUpdate,studentsCreate,ClassroomError,type Classroom,type EditingPermissions} from '../../lib/classroom-api';
import type {AccountSession} from '../../lib/account-api';
import {AssignmentsPanel} from './assignments-panel';
import {PermissionEditor} from './permission-editor';
import {StudentTable} from './student-table';
import styles from './classroom.module.css';
export function TeacherDashboard({session}:{session:AccountSession}){
 const csrf=session.csrf;
 const [classroom,setClassroom]=useState<Classroom|null|undefined>(undefined),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
 const [name,setName]=useState(''),[count,setCount]=useState('1'),[confirmCode,setConfirmCode]=useState(false);
 const alive=useRef(true);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 const run=useCallback(async<T,>(action:()=>Promise<T>):Promise<T|undefined>=>{
  setError('');
  try{return await action();}catch(issue){if(alive.current)setError(issue instanceof ClassroomError?issue.message:'처리하지 못했어요.');return undefined;}
 },[]);
 const reload=useCallback(async(next?:Classroom)=>{if(next){setClassroom(next);return;}const value=await run(()=>classroomRead());if(value!==undefined||alive.current)setClassroom(value===undefined?classroom:value);},[run,classroom]);
 useEffect(()=>{const timer=window.setTimeout(()=>{classroomRead().then(value=>{if(alive.current)setClassroom(value);}).catch(issue=>{if(alive.current){setClassroom(null);setError(issue instanceof ClassroomError?issue.message:'학급을 불러오지 못했어요.');}});},0);return()=>window.clearTimeout(timer);},[]);
 async function mutate(action:()=>Promise<Classroom>,message=''){setBusy(true);setNotice('');const next=await run(action);setBusy(false);if(next){setClassroom(next);if(message)setNotice(message);}}
 if(classroom===undefined)return <p className={styles.card} role="status">불러오는 중이에요.</p>;
 if(classroom===null)return <form className={styles.card} aria-label="학급 만들기" onSubmit={(event:FormEvent)=>{event.preventDefault();if(name.trim())void mutate(()=>classroomCreate(name.trim(),csrf));}}>
  <h2>학급 만들기</h2><p className={styles.hint}>학급을 열면 학급 코드가 만들어져요. 학급은 하나만 열 수 있어요.</p>
  <div className={styles.row}><label className={styles.field}>학급 이름<input value={name} onChange={event=>setName(event.target.value)} maxLength={30}/></label><button className={`${styles.btn} ${styles.primary}`} disabled={busy||!name.trim()}>학급 만들기</button></div>
  {error&&<p className={styles.error} role="alert">{error}</p>}
 </form>;
 const remaining=30-classroom.students.length;
 const setDefault=(value:EditingPermissions)=>void mutate(()=>classroomUpdate({defaultPermissions:value},csrf),'학급 기본값을 바꿨어요.');
 return <>
  {error&&<p className={styles.error} role="alert">{error}</p>}{notice&&<p className={styles.notice} role="status">{notice}</p>}
  <section className={styles.card} aria-label="학급"><h2>{classroom.name}</h2>
   <p className={styles.hint}>학생은 이 코드로 로그인해요.</p>
   <p><span className={styles.code} aria-label="학급 코드">{classroom.classCode}</span></p>
   {confirmCode?<div className={styles.row}><span>새 코드를 만들면 학생은 새 코드로 로그인해야 해요.</span><button className={`${styles.btn} ${styles.primary}`} onClick={()=>{setConfirmCode(false);void mutate(()=>classroomUpdate({regenerateCode:true},csrf),'학급 코드를 새로 만들었어요.');}}>새로 만들기</button><button className={styles.btn} onClick={()=>setConfirmCode(false)}>취소</button></div>
    :<button className={styles.btn} disabled={busy} onClick={()=>setConfirmCode(true)}>학급 코드 새로 만들기</button>}
  </section>
  <section className={styles.card} aria-label="학생 만들기"><h2>학생 만들기</h2>
   <p className={styles.hint}>빈 번호부터 차례로 만들어요. 지금 {classroom.students.length}명, {remaining}명 더 만들 수 있어요.</p>
   <form className={styles.row} onSubmit={event=>{event.preventDefault();const n=Number(count);if(Number.isInteger(n)&&n>=1&&n<=remaining)void mutate(()=>studentsCreate(n,csrf),`학생 ${n}명을 만들었어요.`);else setError(`1명에서 ${remaining}명 사이로 써 주세요.`);}}>
    <label className={styles.field}>만들 학생 수<input value={count} onChange={event=>setCount(event.target.value)} inputMode="numeric" size={4}/></label>
    <button className={`${styles.btn} ${styles.primary}`} disabled={busy||remaining<1}>학생 만들기</button>
   </form>
  </section>
  <section className={styles.card} aria-label="학급 기본 편집 허용"><h2>학급 기본 편집 허용</h2>
   <p className={styles.hint}>학생마다 따로 정하지 않으면 이 범위가 적용돼요.</p>
   <PermissionEditor value={classroom.defaultPermissions} onChange={setDefault} disabled={busy}/>
  </section>
  <section className={styles.card} aria-label="학생 목록"><h2>학생</h2>
   <StudentTable classroom={classroom} csrf={csrf} run={run} onChanged={next=>void reload(next)}/>
  </section>
  <AssignmentsPanel csrf={csrf} run={run}/>
 </>;
}
