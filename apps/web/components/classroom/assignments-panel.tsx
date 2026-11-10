'use client';
import {useCallback,useEffect,useState,type FormEvent} from 'react';
import {assignmentCreate,assignmentList,assignmentUpdate,submissionList,submissionOpen,ClassroomError,type Assignment,type SubmissionRow} from '../../lib/classroom-api';
import {downloadSubmissionFile,formatSubmittedAt} from '../../lib/classroom-local';
import {BUILTIN_WORKS} from '../../lib/builtin-works';
import styles from './classroom.module.css';
type Run=<T>(action:()=>Promise<T>)=>Promise<T|undefined>;
export function AssignmentsPanel({csrf,run}:{csrf:string;run:Run}){
 const [items,setItems]=useState<Assignment[]|null>(null),[title,setTitle]=useState(''),[description,setDescription]=useState(''),[storyKey,setStoryKey]=useState('');
 const load=useCallback(async()=>{const list=await run(()=>assignmentList());if(list)setItems(list);},[run]);
 useEffect(()=>{const timer=window.setTimeout(()=>void load(),0);return()=>window.clearTimeout(timer);},[load]);
 async function create(event:FormEvent){
  event.preventDefault();if(!title.trim())return;
  const made=await run(()=>assignmentCreate({title:title.trim(),...(description.trim()?{description:description.trim()}:{}),...(storyKey?{storyKey}:{})},csrf));
  if(made){setTitle('');setDescription('');setStoryKey('');await load();}
 }
 return <section className={styles.card} aria-label="과제">
  <h2>과제</h2>
  <form onSubmit={event=>void create(event)}>
   <div className={styles.row}>
    <label className={styles.field}>과제 제목<input value={title} onChange={event=>setTitle(event.target.value)} maxLength={60}/></label>
    <label className={styles.field}>바탕 작품 (선택)<select value={storyKey} onChange={event=>setStoryKey(event.target.value)}><option value="">정하지 않아요</option>{BUILTIN_WORKS.map(work=><option key={work.id} value={work.id}>{work.title}</option>)}</select></label>
   </div>
   <label className={styles.field} style={{marginTop:8}}>설명 (선택)<textarea value={description} onChange={event=>setDescription(event.target.value)} maxLength={500}/></label>
   <p><button className={`${styles.btn} ${styles.primary}`} disabled={!title.trim()}>과제 만들기</button></p>
  </form>
  {items===null?null:items.length===0?<p className={styles.hint}>아직 과제가 없어요.</p>
   :<ul className={styles.list}>{items.map(item=><li key={item.id} className={styles.item}><AssignmentRow item={item} csrf={csrf} run={run} onChanged={load}/></li>)}</ul>}
 </section>;
}
function AssignmentRow({item,csrf,run,onChanged}:{item:Assignment;csrf:string;run:Run;onChanged:()=>Promise<void>}){
 const [rows,setRows]=useState<SubmissionRow[]|null>(null),[notice,setNotice]=useState('');
 async function toggleOpen(){const done=await run(()=>assignmentUpdate(item.id,{open:!item.open},csrf));if(done)await onChanged();}
 async function showSubmissions(){const list=await run(()=>submissionList(item.id));if(list)setRows(list);}
 async function openCopy(row:SubmissionRow){
  setNotice('');
  const doc=await run(()=>submissionOpen(item.id,row.number));
  if(!doc)return;
  try{await downloadSubmissionFile(doc.document,`${item.title}-${row.number}번-${row.name||'학생'}`);setNotice(`${row.number}번 작품 파일을 내려받았어요. 서재에서 작품 파일로 열면 내 사본이 돼요.`);}
  catch{setNotice('작품 파일을 만들지 못했어요.');}
 }
 return <>
  <h3>{item.title} <span className={item.open?styles.badge:`${styles.badge} ${styles.off}`}>{item.open?'열림':'닫힘'}</span></h3>
  {item.description&&<p className={styles.hint}>{item.description}</p>}
  <div className={styles.row}>
   <button className={styles.btn} aria-label={`${item.title} ${item.open?'닫기':'열기'}`} onClick={()=>void toggleOpen()}>{item.open?'닫기':'열기'}</button>
   <button className={styles.btn} aria-label={`${item.title} 제출 보기`} onClick={()=>void showSubmissions()}>제출 보기</button>
  </div>
  {rows&&(rows.length===0?<p className={styles.hint}>아직 낸 학생이 없어요.</p>:<ul className={styles.rowsList}>{rows.map(row=><li key={row.number}>{row.number}번 {row.name} · {formatSubmittedAt(row.submittedAt)} <button className={styles.btn} aria-label={`${row.number}번 제출 작품 열기`} onClick={()=>void openCopy(row)}>작품 열기</button></li>)}</ul>)}
  {notice&&<p className={styles.notice} role="status">{notice}</p>}
 </>;
}
