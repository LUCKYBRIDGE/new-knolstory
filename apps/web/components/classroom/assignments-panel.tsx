'use client';
import {useCallback,useEffect,useRef,useState,type FormEvent} from 'react';
import {assignmentCreate,assignmentList,assignmentUpdate,submissionList,submissionOpen,type Assignment,type AssignmentFormat,type SubmissionRow} from '../../lib/classroom-api';
import {downloadSubmissionFile,formatSubmittedAt} from '../../lib/classroom-local';
import {BUILTIN_WORKS} from '../../lib/builtin-works';
import {ClassroomBook} from './classroom-art';
import styles from './classroom.module.css';
type Run=<T>(action:()=>Promise<T>)=>Promise<T|undefined>;
export function AssignmentsPanel({csrf,run}:{csrf:string;run:Run}){
 const [items,setItems]=useState<Assignment[]|null>(null),[title,setTitle]=useState(''),[description,setDescription]=useState(''),[storyKey,setStoryKey]=useState('');
 const [format,setFormat]=useState<AssignmentFormat>('knolstory'),[filter,setFilter]=useState<AssignmentFormat>('knolstory');
 const [creating,setCreating]=useState(false),[loadFailed,setLoadFailed]=useState(false);
 const createLock=useRef(false);
 const load=useCallback(async()=>{setLoadFailed(false);const list=await run(()=>assignmentList());if(list)setItems(list);else setLoadFailed(true);},[run]);
 useEffect(()=>{const timer=window.setTimeout(()=>void load(),0);return()=>window.clearTimeout(timer);},[load]);
 async function create(event:FormEvent){
  event.preventDefault();if(!title.trim()||createLock.current)return;
  createLock.current=true;setCreating(true);
  try{
  const made=await run(()=>assignmentCreate({format,title:title.trim(),...(description.trim()?{description:description.trim()}:{}),...(storyKey?{storyKey}:{})},csrf));
  if(made){setFilter(format);setTitle('');setDescription('');setStoryKey('');await load();}
  }finally{createLock.current=false;setCreating(false);}
 }
 return <section className={styles.card} aria-label="과제">
  <div className={styles.sectionHeading}><div><span className={styles.eyebrow}>이야기를 나누는 시간</span><h2>과제</h2></div><ClassroomBook small/></div>
  <details className={styles.assignmentCreate} open={items?.length===0}><summary>새 과제 만들기</summary><form onSubmit={event=>void create(event)}><fieldset disabled={creating}>
   <label className={styles.field}>과제 유형<select aria-label="과제 유형" value={format} onChange={event=>setFormat(event.target.value as AssignmentFormat)}><option value="knolstory">놀스토리</option><option value="shortstory">숏스토리</option></select></label>
   <div className={styles.row}>
    <label className={styles.field}>과제 제목<input value={title} onChange={event=>setTitle(event.target.value)} maxLength={60}/></label>
    <label className={styles.field}>바탕 작품 (선택)<select aria-label="바탕 작품 (선택)" value={storyKey} onChange={event=>setStoryKey(event.target.value)}><option value="">정하지 않아요</option>{BUILTIN_WORKS.map(work=><option key={work.id} value={work.id}>{work.title}</option>)}</select></label>
   </div>
   <label className={styles.field} style={{marginTop:8}}>설명 (선택)<textarea value={description} onChange={event=>setDescription(event.target.value)} maxLength={500}/></label>
   <p><button className={`${styles.btn} ${styles.primary}`} disabled={creating||!title.trim()}>{creating?'만드는 중…':'과제 만들기'}</button></p>
  </fieldset></form></details>
  <div className={styles.typeTabs} role="group" aria-label="과제 유형별 보기">{(['knolstory','shortstory'] as const).map(value=><button key={value} className={styles.btn} aria-pressed={filter===value} onClick={()=>setFilter(value)}><ClassroomBook format={value} small/>{value==='knolstory'?'놀스토리':'숏스토리'}{items&&<span className={styles.tabCount}> · {items.filter(item=>item.format===value).length}</span>}</button>)}</div>
  {loadFailed?<p className={styles.error} role="alert">과제를 불러오지 못했어요. <button className={styles.btn} onClick={()=>void load()}>과제 다시 불러오기</button></p>:items===null?<p className={styles.hint} role="status">과제를 불러오고 있어요.</p>:items.filter(item=>item.format===filter).length===0?<p className={styles.hint}>이 유형의 과제가 없어요.</p>
   :<ul className={styles.list}>{items.filter(item=>item.format===filter).map(item=><li key={item.id} className={styles.item} data-format={item.format}><AssignmentRow item={item} csrf={csrf} run={run} onChanged={load}/></li>)}</ul>}
 </section>;
}
function AssignmentRow({item,csrf,run,onChanged}:{item:Assignment;csrf:string;run:Run;onChanged:()=>Promise<void>}){
 const [rows,setRows]=useState<SubmissionRow[]|null>(null),[notice,setNotice]=useState(''),[loading,setLoading]=useState(false);
 async function toggleOpen(){const done=await run(()=>assignmentUpdate(item.id,{open:!item.open},csrf));if(done)await onChanged();}
 async function showSubmissions(){if(loading)return;setLoading(true);try{const list=await run(()=>submissionList(item.id));if(list)setRows(list);}finally{setLoading(false);}}
 async function openCopy(row:SubmissionRow){
  setNotice('');
  const doc=await run(()=>submissionOpen(item.id,row.number));
  if(!doc)return;
  try{await downloadSubmissionFile(doc.document,`${item.title}-${row.number}번-${row.name||'학생'}`);setNotice(`${row.number}번 작품 파일을 내려받았어요. 서재에서 파일을 열 수 있어요.`);}
  catch{setNotice('작품 파일을 만들지 못했어요.');}
 }
 return <>
  <div className={styles.taskHeading}><h3>{item.title}</h3><span className={item.open?styles.badge:`${styles.badge} ${styles.off}`}>{item.open?'열림':'닫힘'}</span></div>
  {item.description&&<p className={styles.hint}>{item.description}</p>}
  <div className={styles.taskActions}>
   <button className={`${styles.btn} ${styles.primary}`} aria-label={`${item.title} 제출 보기`} disabled={loading} onClick={()=>void showSubmissions()}>{loading?'불러오는 중…':rows?`제출 목록 새로고침 · ${rows.length}명`:'제출 보기'}</button>
   <button className={styles.btn} aria-label={`${item.title} ${item.open?'닫기':'열기'}`} onClick={()=>void toggleOpen()}>{item.open?'제출 마감':'제출 다시 열기'}</button>
  </div>
  {rows&&(rows.length===0?<p className={styles.hint}>아직 낸 학생이 없어요.</p>:<ul className={styles.rowsList}>{rows.map(row=><li key={row.number}>{row.number}번 {row.name} · {formatSubmittedAt(row.submittedAt)} <a className={styles.btn} aria-label={`${row.number}번 제출 작품 열기`} href={`${item.format==='shortstory'?'/shortstory':'/'}?${new URLSearchParams({...(item.format==='shortstory'?{mode:'library'}:{view:'library'}),classAssignment:item.id,classStudent:String(row.number)})}`}>작품 열기</a> <button className={styles.btn} aria-label={`${row.number}번 제출 작품 파일 받기`} onClick={()=>void openCopy(row)}>파일 받기</button></li>)}</ul>)}
  {notice&&<p className={styles.notice} role="status">{notice}</p>}
 </>;
}
