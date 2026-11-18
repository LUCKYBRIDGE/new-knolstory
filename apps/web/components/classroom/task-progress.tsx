'use client';
import {useState,type ReactNode} from 'react';
import {draftComment,type Assignment,type ProgressRow} from '../../lib/classroom-api';
import {formatSubmittedAt} from '../../lib/classroom-local';
import {amountUnit} from './task-brief';
import {SubmissionPreview} from './submission-preview';
import styles from './classroom.module.css';

type Run=<T>(action:()=>Promise<T>)=>Promise<T|undefined>;
export type ProgressStage='notStarted'|'writing'|'submitted'|'passed'|'revise';
export function progressStage(row:ProgressRow):ProgressStage{
 if(row.submission)return row.submission.reviewStatus==='passed'?'passed':row.submission.reviewStatus==='revise'?'revise':'submitted';
 return row.draft?'writing':'notStarted';
}
const STAGE_LABEL:Record<ProgressStage,string>={notStarted:'시작 전',writing:'작성 중',submitted:'냈어요',passed:'통과',revise:'다시 쓰는 중'};
/** Where every student of a writing task is: who has not started, who shared a mid-way draft,
 * who handed in, and what was passed. Hand-ins keep their review controls (`review`). */
export function TaskProgress({item,rows,csrf,run,review,onChanged}:{item:Assignment;rows:readonly ProgressRow[];csrf:string;run:Run;review:(number:number,meta:ReactNode)=>ReactNode;onChanged:()=>Promise<void>}){
 const counts=rows.reduce((total,row)=>{total[progressStage(row)]++;return total;},{notStarted:0,writing:0,submitted:0,passed:0,revise:0} as Record<ProgressStage,number>);
 const late=rows.filter(row=>row.submission&&item.dueAt&&row.submission.submittedAt>item.dueAt).length;
 const waiting=rows.filter(row=>progressStage(row)==='notStarted');
 const unit=amountUnit(item.format);
 const amount=(value:{amount:number;chars:number})=>`${value.amount}${item.targetAmount?`/${item.targetAmount}`:''}${unit} · ${value.chars.toLocaleString('ko-KR')}자`;
 return <div className={styles.progress}>
  <ul className={styles.progressSummary} aria-label="진행 요약">
   {(['notStarted','writing','submitted','revise','passed'] as const).map(stage=><li key={stage} data-stage={stage}><b>{counts[stage]}</b> {STAGE_LABEL[stage]}</li>)}
   {late>0&&<li data-stage="late"><b>{late}</b> 늦게 냄</li>}
  </ul>
  {waiting.length>0&&<p className={styles.hint}>시작 전 · {waiting.map(row=>`${row.number}번${row.name?` ${row.name}`:''}`).join(', ')}</p>}
  <ul className={styles.reviewList}>{rows.filter(row=>progressStage(row)!=='notStarted').map(row=><li key={row.number}>
   {row.submission?review(row.number,<span className={styles.progressLine}><span>{amount(row.submission)}</span>{item.dueAt&&row.submission.submittedAt>item.dueAt&&<span className={styles.lateChip}>늦게 냄</span>}</span>):<DraftRow item={item} row={row} csrf={csrf} run={run} amount={amount} onChanged={onChanged}/>}
  </li>)}</ul>
 </div>;
}
function DraftRow({item,row,csrf,run,amount,onChanged}:{item:Assignment;row:ProgressRow;csrf:string;run:Run;amount:(value:{amount:number;chars:number})=>string;onChanged:()=>Promise<void>}){
 const draft=row.draft!;
 const [writing,setWriting]=useState(false),[comment,setComment]=useState(draft.comment),[saved,setSaved]=useState(draft.comment),[busy,setBusy]=useState(false);
 async function save(){setBusy(true);try{const done=await run(()=>draftComment(item.id,row.number,comment.trim(),csrf));if(done){setSaved(done.comment);setWriting(false);await onChanged();}}finally{setBusy(false);}}
 return <div className={styles.review} data-review="draft">
  <div className={styles.reviewHead}><strong>{row.number}번 {row.name}</strong><span className={styles.hint}>{formatSubmittedAt(draft.savedAt)} 중간 저장 · {amount(draft)}</span><span className={styles.reviewChip} data-review="draft">작성 중</span></div>
  {saved&&!writing&&<p className={styles.reviewFeedback}><b>내 한마디</b> {saved}</p>}
  <div className={styles.row}>
   <SubmissionPreview item={item} row={{number:row.number,name:row.name,savedAt:draft.savedAt}} draft/>
   {!item.archived&&<button className={styles.btn} aria-expanded={writing} aria-label={`${row.number}번 한마디 ${saved?'고치기':'남기기'}`} onClick={()=>setWriting(value=>!value)}>{saved?'한마디 고치기':'한마디 남기기'}</button>}
  </div>
  {writing&&<div className={styles.row}><input aria-label={`${row.number}번에게 한마디`} value={comment} maxLength={300} placeholder="예: 장면 묘사를 조금 더 해 보자" onChange={event=>setComment(event.target.value)}/>
   <button className={`${styles.btn} ${styles.primary}`} disabled={busy} onClick={()=>void save()}>{comment.trim()?'남기기':'지우기'}</button></div>}
 </div>;
}
