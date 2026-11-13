'use client';
import {useCallback,useEffect,useRef,useState,type FormEvent} from 'react';
import {adminOverview,adminSetTeacherCode,generateTeacherCode,ClassroomError,type AdminOverview} from '../../lib/classroom-api';
import {formatSubmittedAt} from '../../lib/classroom-local';
import shared from './classroom.module.css';
import styles from './admin-panel.module.css';

const message=(issue:unknown,fallback:string)=>issue instanceof ClassroomError?issue.message:fallback;
const date=(value:number)=>new Date(value).toLocaleDateString('ko-KR',{year:'numeric',month:'long',day:'numeric'});

/** Admin: how the service is being used, which classes exist, and the one teacher registration code. */
export function AdminPanel({csrf}:{csrf:string}){
 const [overview,setOverview]=useState<AdminOverview|null>(null),[loadError,setLoadError]=useState('');
 const load=useCallback(async()=>{setLoadError('');try{setOverview(await adminOverview());}catch(issue){setLoadError(message(issue,'서비스 현황을 불러오지 못했어요.'));}},[]);
 useEffect(()=>{const timer=window.setTimeout(()=>void load(),0);return()=>window.clearTimeout(timer);},[load]);
 const totals=overview?{classes:overview.classrooms.length,missions:overview.classrooms.reduce((sum,row)=>sum+row.missionCount,0),passed:overview.classrooms.reduce((sum,row)=>sum+row.passedMissionCount,0)}:null;
 return <>
  <section className={styles.stats} aria-label="서비스 현황">
   {loadError?<p className={shared.error} role="alert">{loadError} <button className={shared.btn} onClick={()=>void load()}>다시 불러오기</button></p>
    :!overview||!totals?<p className={shared.hint} role="status">서비스 현황을 불러오고 있어요.</p>
    :<>
     <Stat label="교사" value={overview.accounts.teacher} note="학급을 여는 계정"/>
     <Stat label="학급" value={totals.classes} note="교사마다 하나"/>
     <Stat label="학생" value={overview.accounts.student} note="교사가 만든 계정"/>
     <Stat label="일반 회원" value={overview.accounts.member} note="카카오로 가입"/>
     <Stat label="미션 성공" value={totals.passed} note={`배정된 미션 ${totals.missions}개`}/>
    </>}
  </section>
  <div className={styles.grid}>
   <TeacherCodeCard csrf={csrf} updatedAt={overview?.teacherCodeUpdatedAt??null} onChanged={updatedAt=>setOverview(current=>current&&{...current,teacherCodeUpdatedAt:updatedAt})}/>
   <section className={shared.card} aria-label="학급 목록">
    <div className={styles.cardHead}><h2>학급</h2>{overview&&<button className={shared.btn} onClick={()=>void load()}>새로 고침</button>}</div>
    <p className={shared.hint}>교사 이름·학생 이름·비밀번호는 보이지 않아요. 학급마다 쓰임만 확인해요.</p>
    {!overview?null:overview.classrooms.length===0?<p className={styles.empty}>아직 열린 학급이 없어요. 교사 등록 코드를 선생님께 전해 주세요.</p>
     :<ul className={styles.rooms}>{overview.classrooms.map((room,index)=><li key={`${room.createdAt}-${index}`}>
      <div className={styles.roomHead}><strong>{room.name}</strong><span>{date(room.createdAt)} 개설</span></div>
      <dl className={styles.roomStats}>
       <div><dt>학생</dt><dd>{room.studentCount}<small>/30</small></dd></div>
       <div><dt>과제</dt><dd>{room.assignmentCount}{room.openAssignmentCount>0&&<small> · 열림 {room.openAssignmentCount}</small>}</dd></div>
       <div><dt>미션</dt><dd>{room.missionCount}{room.passedMissionCount>0&&<small> · 성공 {room.passedMissionCount}</small>}</dd></div>
      </dl>
     </li>)}</ul>}
   </section>
  </div>
 </>;
}

function Stat({label,value,note}:{label:string;value:number;note:string}){
 return <div className={styles.stat}><span className={styles.statLabel}>{label}</span><strong className={styles.statValue}>{value.toLocaleString('ko-KR')}</strong><span className={styles.statNote}>{note}</span></div>;
}

function TeacherCodeCard({csrf,updatedAt,onChanged}:{csrf:string;updatedAt:number|null;onChanged:(updatedAt:number|null)=>void}){
 const [code,setCode]=useState(''),[saved,setSaved]=useState(''),[copied,setCopied]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const lock=useRef(false);
 async function submit(event:FormEvent){
  event.preventDefault();if(lock.current)return;
  const value=code.trim();
  if(value.length<6||value.length>32){setError('코드는 6자 이상 32자 이하로 써 주세요.');return;}
  lock.current=true;setBusy(true);setError('');setCopied(false);
  try{onChanged(await adminSetTeacherCode(value,csrf));setSaved(value);setCode('');}
  catch(issue){setError(message(issue,'코드를 바꾸지 못했어요.'));}
  finally{lock.current=false;setBusy(false);}
 }
 async function copy(){
  try{await navigator.clipboard.writeText(saved);setCopied(true);}catch{setError('복사하지 못했어요. 코드를 직접 선택해 복사해 주세요.');}
 }
 return <section className={`${shared.card} ${styles.codeCard}`} aria-label="교사 등록 코드">
  <h2>교사 등록 코드</h2>
  <p className={shared.hint}>일반 회원이 이 코드를 넣으면 교사가 되어 학급을 열 수 있어요. 코드는 하나뿐이고, 바꾸면 이전 코드는 바로 쓸 수 없어요.</p>
  <p className={styles.updated}>{updatedAt?`마지막으로 바꾼 때 · ${formatSubmittedAt(updatedAt)}`:'아직 코드를 정하지 않았어요. 첫 코드를 만들어 주세요.'}</p>
  {saved?<div className={styles.saved} role="status">
   <span>새 코드를 저장했어요. 이 화면을 떠나면 다시 볼 수 없으니 지금 선생님께 전해 주세요.</span>
   <code aria-label="새 교사 등록 코드">{saved}</code>
   <div className={styles.savedActions}><button className={`${shared.btn} ${shared.primary}`} onClick={()=>void copy()}>{copied?'복사했어요':'코드 복사'}</button><button className={shared.btn} onClick={()=>{setSaved('');setCopied(false);}}>다 전했어요</button></div>
  </div>:<form onSubmit={event=>void submit(event)}>
   <label className={shared.field}>새 코드 (6~32자)<input value={code} onChange={event=>setCode(event.target.value)} autoComplete="off" spellCheck={false} maxLength={32} placeholder="예: KNOL-2026-SPRING"/></label>
   <div className={styles.codeActions}>
    <button type="button" className={shared.btn} disabled={busy} onClick={()=>{setCode(generateTeacherCode());setError('');}}>읽기 쉬운 코드 만들기</button>
    <button className={`${shared.btn} ${shared.primary}`} disabled={busy||!code.trim()}>{busy?'저장하는 중…':updatedAt?'코드 바꾸기':'코드 정하기'}</button>
   </div>
  </form>}
  {error&&<p className={shared.error} role="alert">{error}</p>}
  <details className={styles.howto}><summary>선생님은 이렇게 등록해요</summary><ol><li>카카오로 서재에 로그인해요.</li><li>오른쪽 위 계정 메뉴에서 <b>교사 등록</b>을 눌러요.</li><li>이 코드를 넣으면 과제·학생 탭이 생겨요.</li></ol></details>
 </section>;
}
