'use client';
import {useState,type FormEvent} from 'react';
import {studentLogin,ClassroomError} from '../../lib/classroom-api';
import styles from './classroom.module.css';
/** 학급 코드·번호·비밀번호. Success reloads into the student dashboard so the session is read fresh. */
export function StudentLoginForm(){
 const [code,setCode]=useState(''),[number,setNumber]=useState(''),[password,setPassword]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function submit(event:FormEvent){
  event.preventDefault();if(busy)return;
  const n=Number(number);
  if(!code.trim()||!Number.isInteger(n)||n<1||n>30||!password){setError('학급 코드, 번호(1~30), 비밀번호를 모두 써 주세요.');return;}
  setBusy(true);setError('');
  try{await studentLogin({classCode:code.trim().toUpperCase(),number:n,password});window.dispatchEvent(new Event('knolstory-account-session-changed'));location.assign('/student');}
  catch(issue){setError(issue instanceof ClassroomError?issue.message:'로그인하지 못했어요.');setBusy(false);}
 }
 return <form className={`${styles.card} ${styles.loginCard}`} onSubmit={event=>void submit(event)} aria-label="학생 로그인">
  <h2>학생 로그인</h2><p className={styles.hint}>선생님이 알려 준 학급 코드, 내 번호, 비밀번호를 써 주세요.</p>
  <div className={styles.row}>
   <label className={styles.field}>학급 코드<input value={code} onChange={event=>setCode(event.target.value)} autoCapitalize="characters" autoComplete="off" maxLength={6} size={8}/></label>
   <label className={styles.field}>번호<input value={number} onChange={event=>setNumber(event.target.value)} inputMode="numeric" autoComplete="off" size={4}/></label>
   <label className={styles.field}>비밀번호<input type="password" value={password} onChange={event=>setPassword(event.target.value)} autoComplete="off" size={10}/></label>
   <button className={`${styles.btn} ${styles.primary}`} disabled={busy}>로그인</button>
  </div>
  {error&&<p className={styles.error} role="alert">{error}</p>}
 </form>;
}
