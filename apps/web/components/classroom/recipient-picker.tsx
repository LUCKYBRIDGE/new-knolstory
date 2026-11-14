'use client';
import {useId,useState} from 'react';
import styles from './classroom.module.css';

export type RecipientStudent=Readonly<{number:number;name:string}>;
/** null = the whole class; otherwise the chosen student numbers. */
export type Recipients=readonly number[]|null;

export const recipientProblem=(value:Recipients)=>value!==null&&value.length===0?'과제를 받을 학생을 한 명 넘게 골라 주세요.':'';

/** Short text for a task's audience, e.g. “우리 반 모두” or “1·3·5번 (3명)”. */
export function recipientsLabel(value:Recipients):string{
 if(value===null)return '우리 반 모두';
 if(value.length===0)return '받는 학생 없음';
 const shown=value.slice(0,6).join('·');
 return `${shown}${value.length>6?'…':''}번 (${value.length}명)`;
}

/** Choose who gets a task: the whole class, or ticked students. */
export function RecipientPicker({students,value,onChange,disabled=false}:{students:readonly RecipientStudent[];value:Recipients;onChange:(next:Recipients)=>void;disabled?:boolean}){
 const chosen=new Set(value??[]),group=useId();
 const toggle=(number:number)=>onChange(students.filter(s=>s.number===number?!chosen.has(number):chosen.has(s.number)).map(s=>s.number));
 return <fieldset className={styles.recipients} disabled={disabled}>
  <legend>받는 학생</legend>
  <div className={styles.recipientModes}>
   <label><input type="radio" name={group} checked={value===null} onChange={()=>onChange(null)}/> 우리 반 모두</label>
   <label><input type="radio" name={group} checked={value!==null} onChange={()=>onChange(value??[])} disabled={!students.length}/> 골라서 주기</label>
  </div>
  {value!==null&&<>
   <ul className={styles.recipientGrid} aria-label="과제를 받을 학생">{students.map(student=><li key={student.number}>
    <label className={styles.recipientChip} data-on={chosen.has(student.number)||undefined}><input type="checkbox" checked={chosen.has(student.number)} onChange={()=>toggle(student.number)}/><b>{student.number}</b>{student.name&&<span>{student.name}</span>}</label>
   </li>)}</ul>
   <p className={styles.hint} role="status">{value.length?`${value.length}명에게만 보여요. 다른 학생의 ‘할 일’에는 나오지 않아요.`:'받을 학생을 골라 주세요.'}
    {' '}<button type="button" className={styles.linkBtn} onClick={()=>onChange(value.length===students.length?[]:students.map(s=>s.number))}>{value.length===students.length?'모두 빼기':'모두 고르기'}</button></p>
  </>}
 </fieldset>;
}

/** On a task card: who gets it, changeable in place. */
export function RecipientFacts({title,value,students,onSave}:{title:string;value:Recipients|undefined;students:readonly RecipientStudent[];onSave:(next:Recipients)=>Promise<boolean>}){
 const [editing,setEditing]=useState(false),[draft,setDraft]=useState<Recipients>(value??null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const current=value??null;
 async function save(){
  const problem=recipientProblem(draft);if(problem){setError(problem);return;}
  setBusy(true);setError('');
  try{if(await onSave(draft))setEditing(false);}finally{setBusy(false);}
 }
 if(editing)return <form className={styles.recipientEdit} onSubmit={event=>{event.preventDefault();void save();}}>
  <RecipientPicker students={students} value={draft} onChange={next=>{setDraft(next);setError('');}} disabled={busy}/>
  {error&&<p className={styles.error} role="alert">{error}</p>}
  <div className={styles.row}><button className={`${styles.btn} ${styles.primary}`} disabled={busy}>저장</button><button type="button" className={styles.btn} disabled={busy} onClick={()=>{setEditing(false);setError('');}}>취소</button></div>
 </form>;
 return <div className={styles.taskFacts}>
  <span className={styles.factChip} data-recipients={current===null?'all':'some'}>받는 학생 · <b>{recipientsLabel(current)}</b></span>
  <button className={styles.linkBtn} aria-label={`${title} 받는 학생 바꾸기`} onClick={()=>{setDraft(current);setEditing(true);}}>받는 학생 바꾸기</button>
 </div>;
}
