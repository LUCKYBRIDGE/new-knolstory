'use client';
import {useState,type FormEvent} from 'react';
import {teacherUpgrade,ClassroomError} from '../../lib/classroom-api';
import {ClassroomDialog} from './classroom-dialog';
import styles from './classroom.module.css';
export function TeacherUpgradeDialog({csrf,onClose,onDone}:{csrf:string;onClose:()=>void;onDone:()=>void}){
 const [code,setCode]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function submit(event:FormEvent){
  event.preventDefault();if(busy||!code.trim())return;setBusy(true);setError('');
  try{await teacherUpgrade(code.trim(),csrf);onDone();}
  catch(issue){setError(issue instanceof ClassroomError?issue.message:'등록하지 못했어요.');setBusy(false);}
 }
 return <ClassroomDialog title="교사 등록" onClose={onClose}>
  <form onSubmit={event=>void submit(event)}>
   <p>운영자에게 받은 교사 등록 코드를 써 주세요.</p>
   <label className={styles.field}>교사 등록 코드<input value={code} onChange={event=>setCode(event.target.value)} autoComplete="off" type="password"/></label>
   {error&&<p className={styles.error} role="alert">{error}</p>}
   <div className={styles.dialogActions}><button type="button" className={styles.btn} onClick={onClose}>닫기</button><button className={`${styles.btn} ${styles.primary}`} disabled={busy}>등록하기</button></div>
  </form>
 </ClassroomDialog>;
}
