'use client';
import {useState} from 'react';
import {draftOpen,submissionOpen,ClassroomError,type Assignment} from '../../lib/classroom-api';
import {submissionScript,type Script} from '../../lib/submission-script';
import {formatSubmittedAt} from '../../lib/classroom-local';
import {ClassroomDialog} from './classroom-dialog';
import styles from './classroom.module.css';

/** Reads a handed-in work right in the dashboard, without downloading it or copying it into the library. */
/** `draft` reads the mid-way copy the student shared instead of the final hand-in. */
export function SubmissionPreview({item,row,draft=false}:{item:Assignment;row:Readonly<{number:number;name:string;submittedAt?:number}>&{savedAt?:number};draft?:boolean}){
 const [script,setScript]=useState<Script|null>(null),[open,setOpen]=useState(false),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function show(){
  setOpen(true);setError('');setScript(null);setBusy(true);
  try{setScript(submissionScript((draft?await draftOpen(item.id,row.number):await submissionOpen(item.id,row.number)).document));}
  catch(issue){setError(issue instanceof ClassroomError?issue.message:'작품을 읽지 못했어요. 서재에서 열거나 파일로 받아 주세요.');}
  finally{setBusy(false);}
 }
 return <>
  <button className={draft?styles.btn:`${styles.btn} ${styles.primary}`} aria-label={`${row.number}번 ${draft?'중간 저장본':'제출 작품'} 바로 보기`} onClick={()=>void show()}>{draft?'중간본 보기':'바로 보기'}</button>
  {open&&<ClassroomDialog wide title={`${row.number}번 ${row.name||''} · ${script?.title??item.title}`.replace(/\s+·/,' ·')} onClose={()=>setOpen(false)}>
   <p>{draft?`${formatSubmittedAt(row.savedAt)} 중간 저장 · 아직 낸 작품이 아니에요.`:`${formatSubmittedAt(row.submittedAt)} 제출`} · 글만 보여 줘요.{!draft&&' 장면·소리까지 보려면 ‘서재에서 열기’를 눌러요.'}</p>
   {busy&&<p role="status">작품을 읽고 있어요.</p>}{error&&<p role="alert">{error}</p>}
   {script&&(script.empty?<p>아직 쓴 글이 없어요.</p>:<div className={styles.script}>{script.sections.filter(section=>section.lines.length).map((section,index)=><section key={index}><h3>{section.title}</h3>
    {section.lines.map((line,lineIndex)=><p key={lineIndex}>{line.speaker&&<b>{line.speaker}</b>}{line.text}</p>)}</section>)}</div>)}
   <div className={styles.dialogActions}><button className={styles.btn} onClick={()=>setOpen(false)}>닫기</button></div>
  </ClassroomDialog>}
 </>;
}
