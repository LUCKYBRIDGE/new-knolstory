'use client';
import {useEffect,useState,type FormEvent} from 'react';
import {adminSetTeacherCode,adminTeacherCodeUpdatedAt,ClassroomError} from '../../lib/classroom-api';
import {formatSubmittedAt} from '../../lib/classroom-local';
import styles from './classroom.module.css';
export function AdminPanel({csrf}:{csrf:string}){
 const [updatedAt,setUpdatedAt]=useState<number|null>(null),[code,setCode]=useState(''),[notice,setNotice]=useState(''),[error,setError]=useState('');
 useEffect(()=>{let live=true;adminTeacherCodeUpdatedAt().then(value=>{if(live)setUpdatedAt(value);}).catch(()=>{});return()=>{live=false;};},[]);
 async function submit(event:FormEvent){
  event.preventDefault();setNotice('');setError('');
  if(code.length<6||code.length>32){setError('코드는 6자 이상 32자 이하로 써 주세요.');return;}
  try{setUpdatedAt(await adminSetTeacherCode(code,csrf));setCode('');setNotice('교사 등록 코드를 바꿨어요. 이전 코드는 더 쓸 수 없어요.');}
  catch(issue){setError(issue instanceof ClassroomError?issue.message:'바꾸지 못했어요.');}
 }
 return <form className={styles.card} onSubmit={event=>void submit(event)} aria-label="교사 등록 코드">
  <h2>교사 등록 코드</h2>
  <p className={styles.hint}>{updatedAt?`마지막으로 바꾼 때: ${formatSubmittedAt(updatedAt)}.`:'아직 바꾼 기록이 없어요.'} 코드는 저장 뒤에 다시 볼 수 없어요.</p>
  <div className={styles.row}><label className={styles.field}>새 코드 (6~32자)<input value={code} onChange={event=>setCode(event.target.value)} autoComplete="off" maxLength={32}/></label><button className={`${styles.btn} ${styles.primary}`}>코드 바꾸기</button></div>
  {notice&&<p className={styles.notice} role="status">{notice}</p>}{error&&<p className={styles.error} role="alert">{error}</p>}
 </form>;
}
