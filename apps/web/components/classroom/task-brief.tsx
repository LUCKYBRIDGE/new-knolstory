'use client';
import {useEffect,useState} from 'react';
import type {AssignmentFormat} from '../../lib/classroom-api';
import styles from './classroom.module.css';

export const amountUnit=(format:AssignmentFormat)=>format==='shortstory'?'쪽':'컷';
/** What a writing task asks for, the same on the teacher's preview and the student's card:
 * the activity, what good work shows, and how much to write. On a student's card the checklist
 * can be ticked as a private self-check (kept on this device only). */
export function TaskBrief({description,checks=[],targetAmount=null,format,current=null,selfCheckKey}:{description:string;checks?:readonly string[];targetAmount?:number|null;format:AssignmentFormat;current?:number|null;selfCheckKey?:string}){
 const unit=amountUnit(format);
 const [ticked,setTicked]=useState<readonly number[]>([]);
 useEffect(()=>{
  if(!selfCheckKey)return;
  const timer=window.setTimeout(()=>{try{const raw=JSON.parse(localStorage.getItem(selfCheckKey)??'[]');if(Array.isArray(raw))setTicked(raw.filter((n):n is number=>Number.isInteger(n)));}catch{/* Self-checks are optional. */}},0);
  return()=>window.clearTimeout(timer);
 },[selfCheckKey]);
 const toggle=(index:number)=>{const next=ticked.includes(index)?ticked.filter(n=>n!==index):[...ticked,index];setTicked(next);if(selfCheckKey)try{localStorage.setItem(selfCheckKey,JSON.stringify(next));}catch{/* Device storage may be blocked. */}};
 if(!description.trim()&&!checks.length&&!targetAmount)return null;
 const reached=targetAmount!==null&&current!==null&&current>=targetAmount;
 return <div className={styles.taskBrief}>
  {description.trim()&&<section><h5>무엇을 하나요</h5><p>{description}</p></section>}
  {checks.length>0&&<section><h5>잘 썼는지 확인해요</h5><ul className={styles.checkList}>{checks.map((check,index)=><li key={index}>
   {selfCheckKey?<label><input type="checkbox" checked={ticked.includes(index)} onChange={()=>toggle(index)}/><span>{check}</span></label>:<span>{check}</span>}
  </li>)}</ul>{selfCheckKey&&<p className={styles.hint}>다 됐으면 스스로 체크해 봐요. 선생님께는 보이지 않아요.</p>}</section>}
  {targetAmount!==null&&<section><h5>분량</h5><p className={styles.amountLine} data-reached={reached}><span>{targetAmount}{unit} 이상</span>
   {current!==null&&<><meter min={0} max={targetAmount} value={Math.min(current,targetAmount)} aria-label={`지금 ${current}${unit}, 목표 ${targetAmount}${unit}`}/><b>지금 {current}{unit}{reached?' · 다 썼어요':''}</b></>}</p></section>}
 </div>;
}
/** Up to five short checks the teacher writes for a task. */
export function ChecksEditor({value,onChange,format}:{value:readonly string[];onChange:(next:string[])=>void;format:AssignmentFormat}){
 // Examples ask about the story itself, in words a student understands — never about using the editor.
 const examples=format==='shortstory'?['그림과 글이 같은 장면을 이야기해요','처음·가운데·끝이 있어요','인물이 어떤 마음인지 드러나요']:['인물이 어떤 마음인지 대사로 보여 줘요','처음·가운데·끝이 이어져요','내가 생각한 새 사건이 있어요'];
 const items=value.length?value:[''];
 return <fieldset className={styles.checksEditor}><legend>잘 썼는지 확인할 점 (선택, 5개까지)</legend>
  {items.map((check,index)=><div key={index} className={styles.row}>
   <input aria-label={`확인할 점 ${index+1}`} value={check} maxLength={80} placeholder={`예: ${examples[index%examples.length]}`} onChange={event=>{const next=[...items];next[index]=event.target.value;onChange(next);}}/>
   {items.length>1&&<button type="button" className={styles.linkBtn} aria-label={`확인할 점 ${index+1} 빼기`} onClick={()=>onChange(items.filter((_,i)=>i!==index))}>빼기</button>}
  </div>)}
  {items.length<5&&<button type="button" className={styles.linkBtn} onClick={()=>onChange([...items,''])}>+ 확인할 점 더하기</button>}
 </fieldset>;
}
export const cleanChecks=(value:readonly string[])=>value.map(check=>check.trim()).filter(Boolean).slice(0,5);
