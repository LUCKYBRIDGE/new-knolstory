'use client';
import {useCallback,useEffect,useRef,useState,type FormEvent} from 'react';
import {adminAccess,adminOverview,adminPauseTeacherCode,adminSetTeacherCode,adminTeacherCode,generateTeacherCode,ClassroomError,type AdminAccessRow,type AdminOverview,type TeacherCode} from '../../lib/classroom-api';
import {classroomSeason} from '../../lib/classroom-season';
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
   <TeacherCodeCard csrf={csrf}/>
   <section className={shared.card} aria-label="학급 목록">
    <div className={styles.cardHead}><h2>학급</h2>{overview&&<button className={shared.btn} onClick={()=>void load()}>새로 고침</button>}</div>
    <p className={shared.hint}>교사 이름·학생 이름·비밀번호는 보이지 않아요. 학급마다 쓰임만 확인해요.</p>
    {!overview?null:overview.classrooms.length===0?<p className={styles.empty}>아직 열린 학급이 없어요. 교사 등록 코드를 선생님께 전해 주세요.</p>
     :<ul className={styles.rooms}>{overview.classrooms.map((room,index)=><li key={`${room.createdAt}-${index}`}>
      <div className={styles.roomHead}><strong>{room.name}</strong><span>{date(room.createdAt)} 개설 · {classroomSeason(room.createdAt).clearsOn} 정리</span></div>
      <dl className={styles.roomStats}>
       <div><dt>학생</dt><dd>{room.studentCount}<small>/30</small></dd></div>
       <div><dt>과제</dt><dd>{room.assignmentCount}{room.openAssignmentCount>0&&<small> · 열림 {room.openAssignmentCount}</small>}</dd></div>
       <div><dt>미션</dt><dd>{room.missionCount}{room.passedMissionCount>0&&<small> · 성공 {room.passedMissionCount}</small>}</dd></div>
      </dl>
     </li>)}</ul>}
    <p className={shared.hint}>학급 자료는 학년도 단위로 운영해요. 3월 1일부터 이듬해 2월 말까지 연 학급은 이듬해 3월 31일에 정리돼요.</p>
   </section>
  </div>
  <AccessCard/>
 </>;
}

function Stat({label,value,note}:{label:string;value:number;note:string}){
 return <div className={styles.stat}><span className={styles.statLabel}>{label}</span><strong className={styles.statValue}>{value.toLocaleString('ko-KR')}</strong><span className={styles.statNote}>{note}</span></div>;
}

function TeacherCodeCard({csrf}:{csrf:string}){
 const [state,setState]=useState<TeacherCode|null>(null),[draft,setDraft]=useState(''),[editing,setEditing]=useState(false),[copied,setCopied]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const lock=useRef(false);
 const load=useCallback(async()=>{setError('');try{setState(await adminTeacherCode());}catch(issue){setError(message(issue,'교사 등록 코드를 불러오지 못했어요.'));}},[]);
 useEffect(()=>{const timer=window.setTimeout(()=>void load(),0);return()=>window.clearTimeout(timer);},[load]);
 async function act(action:()=>Promise<TeacherCode>,done:string){
  if(lock.current)return;lock.current=true;setBusy(true);setError('');setNotice('');setCopied(false);
  try{setState(await action());setNotice(done);return true;}catch(issue){setError(message(issue,'처리하지 못했어요.'));return false;}
  finally{lock.current=false;setBusy(false);}
 }
 async function save(event:FormEvent){
  event.preventDefault();const value=draft.trim();
  if(value.length<6||value.length>32){setError('코드는 6자 이상 32자 이하로 써 주세요.');return;}
  if(await act(()=>adminSetTeacherCode(value,csrf),state?.updatedAt?'코드를 바꿨어요. 이전 코드는 이제 쓸 수 없어요.':'코드를 정했어요.')){setDraft('');setEditing(false);}
 }
 async function copy(value:string){try{await navigator.clipboard.writeText(value);setCopied(true);}catch{setError('복사하지 못했어요. 코드를 직접 선택해 복사해 주세요.');}}
 const has=!!state?.updatedAt,known=state?.code??null;
 return <section className={`${shared.card} ${styles.codeCard}`} aria-label="교사 등록 코드">
  <div className={styles.cardHead}><h2>교사 등록 코드</h2>{has&&<span className={state!.paused?styles.pausedChip:styles.liveChip}>{state!.paused?'멈춤':'사용 중'}</span>}</div>
  <p className={shared.hint}>카카오로 가입한 회원이 이 코드를 넣으면 교사가 돼요. <b>한 코드로 여러 선생님이 등록할 수 있어요.</b> 관리자는 언제든 이 화면에서 코드를 다시 볼 수 있어요.</p>
  {state===null&&!error?<p className={shared.hint} role="status">불러오는 중이에요.</p>:null}
  {state&&has&&!editing&&<>
   {known?<div className={styles.currentCode}><code aria-label="현재 교사 등록 코드">{known}</code><button className={shared.btn} onClick={()=>void copy(known)}>{copied?'복사했어요':'복사'}</button></div>
    :<p className={styles.updated}>지금 코드는 예전 방식으로 저장돼 다시 보여 드릴 수 없어요. 아래 ‘코드 바꾸기’로 한 번만 새로 정해 주세요. 그다음부터는 언제든 볼 수 있어요.</p>}
   <p className={styles.updated}>마지막으로 바꾼 때 · {formatSubmittedAt(state.updatedAt!)}{state.paused&&' · 지금은 새 교사 등록을 받지 않아요.'}</p>
   <div className={styles.codeActions}>
    <button className={shared.btn} disabled={busy} onClick={()=>void act(()=>adminPauseTeacherCode(!state.paused,csrf),state.paused?'다시 교사 등록을 받아요.':'교사 등록을 멈췄어요. 이미 교사인 계정은 그대로예요.')}>{state.paused?'다시 받기':'등록 멈추기'}</button>
    <button className={shared.btn} disabled={busy} onClick={()=>{setEditing(true);setNotice('');}}>코드 바꾸기</button>
   </div>
  </>}
  {state&&(!has||editing)&&<form onSubmit={event=>void save(event)}>
   {!has&&<p className={styles.updated}>아직 코드를 정하지 않았어요. 첫 코드를 만들어 주세요.</p>}
   {has&&<p className={styles.updated}>코드를 바꾸면 이전 코드는 바로 쓸 수 없어요. 이미 교사인 계정은 그대로예요.</p>}
   <label className={shared.field}>{has?'새 코드':'코드'} (6~32자)<input value={draft} onChange={event=>setDraft(event.target.value)} autoComplete="off" spellCheck={false} maxLength={32} placeholder="예: KNOL-2026-SPRING"/></label>
   <div className={styles.codeActions}>
    <button type="button" className={shared.btn} disabled={busy} onClick={()=>{setDraft(generateTeacherCode());setError('');}}>읽기 쉬운 코드 만들기</button>
    <button className={`${shared.btn} ${shared.primary}`} disabled={busy||!draft.trim()}>{busy?'저장하는 중…':has?'이 코드로 바꾸기':'코드 정하기'}</button>
    {has&&<button type="button" className={shared.btn} disabled={busy} onClick={()=>{setEditing(false);setDraft('');setError('');}}>취소</button>}
   </div>
  </form>}
  {notice&&<p className={shared.notice} role="status">{notice}</p>}
  {error&&<p className={shared.error} role="alert">{error}{state===null&&<> <button className={shared.btn} onClick={()=>void load()}>다시 불러오기</button></>}</p>}
  <details className={styles.howto}><summary>선생님은 이렇게 등록해요</summary><ol><li>카카오로 서재에 로그인해요.</li><li>오른쪽 위 계정 메뉴에서 <b>교사 등록</b>을 눌러요.</li><li>이 코드를 넣으면 과제·학생 탭이 생겨요.</li></ol></details>
 </section>;
}

const ROLE_LABEL={admin:'관리자',teacher:'교사',student:'학생',member:'일반'} as const;
const METHOD_LABEL={kakao:'카카오',google:'구글',password:'학생 비밀번호',qr:'QR'} as const;
function since(value:number,now:number){
 const minutes=Math.floor((now-value)/60000);
 if(minutes<1)return '방금';if(minutes<60)return `${minutes}분 전`;
 const hours=Math.floor(minutes/60);if(hours<24)return `${hours}시간 전`;
 const days=Math.floor(hours/24);if(days<31)return `${days}일 전`;
 return date(value);
}
function who(row:AdminAccessRow){
 if(row.role==='student')return `${row.className??'학급'} ${row.studentNumber??''}번`;
 if(row.role==='teacher')return row.className?`${row.className} 담임`:'학급을 아직 열지 않음';
 if(row.role==='admin')return row.className?`관리자 · ${row.className}`:'관리자';
 return `${row.provider==='google'?'구글':'카카오'} 회원 · ${row.id.slice(0,8)}`;
}
/** Latest sign-in per account only: the server overwrites one value, nothing accumulates. */
function AccessCard(){
 const [rows,setRows]=useState<AdminAccessRow[]|null>(null),[error,setError]=useState(''),[filter,setFilter]=useState<'all'|AdminAccessRow['role']>('all'),[now,setNow]=useState(0);
 const load=useCallback(async()=>{setError('');try{setRows(await adminAccess());setNow(Date.now());}catch(issue){setError(message(issue,'접속 기록을 불러오지 못했어요.'));}},[]);
 useEffect(()=>{const timer=window.setTimeout(()=>void load(),0);return()=>window.clearTimeout(timer);},[load]);
 const shown=(rows??[]).filter(row=>filter==='all'||row.role===filter||(filter==='teacher'&&row.role==='admin'&&!!row.className));
 const week=(rows??[]).filter(row=>row.lastLoginAt!==null&&now-row.lastLoginAt<7*24*60*60*1000).length;
 return <section className={`${shared.card} ${styles.access}`} aria-label="접속 기록">
  <div className={styles.cardHead}><h2>접속 기록</h2>{rows&&<button className={shared.btn} onClick={()=>void load()}>새로 고침</button>}</div>
  <p className={shared.hint}>계정마다 <b>마지막 로그인</b>만 남겨요. 학생은 이름 없이 학급과 번호로만 보여요.{rows&&<> 최근 7일 동안 {week}개 계정이 들어왔어요.</>}</p>
  <div className={styles.accessFilter} role="group" aria-label="계정 구분">{(['all','teacher','student','member'] as const).map(value=><button key={value} className={shared.btn} aria-pressed={filter===value} onClick={()=>setFilter(value)}>{value==='all'?'전체':ROLE_LABEL[value]}{rows&&<small> {value==='all'?rows.length:rows.filter(row=>row.role===value).length}</small>}</button>)}</div>
  {error&&<p className={shared.error} role="alert">{error} <button className={shared.btn} onClick={()=>void load()}>다시 불러오기</button></p>}
  {!rows&&!error?<p className={shared.hint} role="status">불러오는 중이에요.</p>:rows&&shown.length===0?<p className={styles.empty}>이 구분의 계정이 없어요.</p>
   :<ul className={styles.accessList}>{shown.map(row=><li key={row.id}>
    <span className={styles.roleChip} data-role={row.role}>{ROLE_LABEL[row.role]}</span>
    <strong>{who(row)}</strong>
    <span className={styles.lastSeen}>{row.lastLoginAt===null?'기록 없음':<><time dateTime={new Date(row.lastLoginAt).toISOString()} title={formatSubmittedAt(row.lastLoginAt)}>{since(row.lastLoginAt,now)}</time>{row.lastLoginMethod&&<small> · {METHOD_LABEL[row.lastLoginMethod]}</small>}</>}</span>
   </li>)}</ul>}
 </section>;
}
