'use client';
import {useCallback,useEffect,useRef,useState,type FormEvent} from 'react';
import {assignmentCreate,assignmentList,assignmentUpdate,submissionList,submissionOpen,type Assignment,type AssignmentFormat,type SubmissionRow} from '../../lib/classroom-api';
import {downloadSubmissionFile,formatSubmittedAt} from '../../lib/classroom-local';
import {BUILTIN_WORKS} from '../../lib/builtin-works';
import {ClassroomBook} from './classroom-art';
import {normalizeShareLink,shareLinkHost} from '../../lib/share-link';
import {dateFromDueAt,dueAtFromDate,dueDateLabel,dueState} from '../../lib/due-date';
import type {TaskRequest} from './task-composer';
import {editionLabel} from '../../lib/mission-api';
import styles from './classroom.module.css';
type Run=<T>(action:()=>Promise<T>)=>Promise<T|undefined>;
export function AssignmentsPanel({csrf,run,studentCount=0,request=null}:{csrf:string;run:Run;studentCount?:number;request?:TaskRequest|null}){
 const [items,setItems]=useState<Assignment[]|null>(null),[title,setTitle]=useState(''),[description,setDescription]=useState(''),[storyKey,setStoryKey]=useState(''),[link,setLink]=useState(''),[linkError,setLinkError]=useState(''),[due,setDue]=useState(''),[formOpen,setFormOpen]=useState(false),[edition,setEdition]=useState<'original'|'knolstory'>('knolstory');
 const formRef=useRef<HTMLDetailsElement>(null);
 const [format,setFormat]=useState<AssignmentFormat>('knolstory'),[filter,setFilter]=useState<AssignmentFormat>('knolstory');
 const [creating,setCreating]=useState(false),[loadFailed,setLoadFailed]=useState(false);
 const createLock=useRef(false);
 // The composer opens this form for writing tasks with the chosen format.
 useEffect(()=>{if(!request||(request.kind!=='knolstory'&&request.kind!=='shortstory'))return;const timer=window.setTimeout(()=>{setFormat(request.kind as AssignmentFormat);setFormOpen(true);requestAnimationFrame(()=>{formRef.current?.scrollIntoView({block:'start',behavior:'smooth'});formRef.current?.querySelector<HTMLInputElement>('input[name="task-title"]')?.focus({preventScroll:true});});},0);return()=>window.clearTimeout(timer);},[request]);
 const load=useCallback(async()=>{setLoadFailed(false);const list=await run(()=>assignmentList());if(list)setItems(list);else setLoadFailed(true);},[run]);
 useEffect(()=>{const timer=window.setTimeout(()=>void load(),0);return()=>window.clearTimeout(timer);},[load]);
 async function create(event:FormEvent){
  event.preventDefault();if(!title.trim()||createLock.current)return;
  const shareUrl=normalizeShareLink(link);if(link.trim()&&!shareUrl){setLinkError('https://로 시작하는 공유 링크를 넣어 주세요.');return;}setLinkError('');
  createLock.current=true;setCreating(true);
  try{
  const made=await run(()=>assignmentCreate({format,title:title.trim(),...(description.trim()?{description:description.trim()}:{}),...(storyKey?{storyKey}:{}),...(shareUrl?{shareUrl}:{}),...(dueAtFromDate(due)!==null?{dueAt:dueAtFromDate(due)!}:{}),...(storyKey&&format==='knolstory'?{edition}:{})},csrf));
  if(made){setFilter(format);setTitle('');setDescription('');setStoryKey('');setLink('');setDue('');setFormOpen(false);await load();}
  }finally{createLock.current=false;setCreating(false);}
 }
 return <section className={styles.card} aria-label="작품 쓰기 과제">
  <div className={styles.sectionHeading}><div><span className={styles.eyebrow}>쓰고, 그리고, 내는</span><h2>작품 쓰기 과제</h2></div><ClassroomBook small/></div>
  <details ref={formRef} className={styles.assignmentCreate} open={formOpen||items?.length===0} onToggle={event=>setFormOpen(event.currentTarget.open)}><summary>작품 쓰기 과제 만들기</summary><form onSubmit={event=>void create(event)}><fieldset disabled={creating}>
   <label className={styles.field}>과제 유형<select aria-label="과제 유형" value={format} onChange={event=>setFormat(event.target.value as AssignmentFormat)}><option value="knolstory">놀스토리</option><option value="shortstory">숏스토리</option></select></label>
   <div className={styles.row}>
    <label className={styles.field}>과제 제목<input name="task-title" value={title} onChange={event=>setTitle(event.target.value)} maxLength={60}/></label>
    <label className={styles.field}>바탕 작품 (선택)<select aria-label="바탕 작품 (선택)" value={storyKey} onChange={event=>setStoryKey(event.target.value)}><option value="">정하지 않아요</option>{BUILTIN_WORKS.map(work=><option key={work.id} value={work.id}>{work.title}</option>)}</select></label>
    {storyKey&&format==='knolstory'&&<label className={styles.field}>바탕 판본<select aria-label="바탕 판본" value={edition} onChange={event=>setEdition(event.target.value as 'original'|'knolstory')}><option value="knolstory">각색 · 선택지가 있는 놀스토리</option><option value="original">원작 · 옛이야기 그대로</option></select></label>}
   </div>
   <label className={styles.field} style={{marginTop:8}}>설명 (선택)<textarea value={description} onChange={event=>setDescription(event.target.value)} maxLength={500}/></label>
   <label className={styles.field} style={{marginTop:8}}>마감일 (선택)<input type="date" value={due} onChange={event=>setDue(event.target.value)}/></label>
   <label className={styles.field} style={{marginTop:8}}>제출 링크 (선택)<input type="url" inputMode="url" value={link} onChange={event=>{setLink(event.target.value);setLinkError('');}} placeholder="예: 구글 드라이브 폴더 공유 링크" autoComplete="off"/></label>
   <p className={styles.hint}>학생 과제 화면에 ‘제출 링크 열기’로 보여요. 학생 파일 이름 앞에는 번호(01~30)가 붙어서 모아 보기 쉬워요.</p>
   {linkError&&<p className={styles.error} role="alert">{linkError}</p>}
   <p><button className={`${styles.btn} ${styles.primary}`} disabled={creating||!title.trim()}>{creating?'만드는 중…':'과제 만들기'}</button></p>
  </fieldset></form></details>
  <div className={styles.typeTabs} role="group" aria-label="과제 유형별 보기">{(['knolstory','shortstory'] as const).map(value=><button key={value} className={styles.btn} aria-pressed={filter===value} onClick={()=>setFilter(value)}><ClassroomBook format={value} small/>{value==='knolstory'?'놀스토리':'숏스토리'}{items&&<span className={styles.tabCount}> · {items.filter(item=>item.format===value).length}</span>}</button>)}</div>
  {loadFailed?<p className={styles.error} role="alert">과제를 불러오지 못했어요. <button className={styles.btn} onClick={()=>void load()}>과제 다시 불러오기</button></p>:items===null?<p className={styles.hint} role="status">과제를 불러오고 있어요.</p>:items.filter(item=>item.format===filter).length===0?<p className={styles.hint}>이 유형의 과제가 없어요.</p>
   :<ul className={styles.list}>{items.filter(item=>item.format===filter).map(item=><li key={item.id} className={styles.item} data-format={item.format}><AssignmentRow item={item} csrf={csrf} run={run} onChanged={load} studentCount={studentCount}/></li>)}</ul>}
 </section>;
}
function AssignmentRow({item,csrf,run,onChanged,studentCount}:{item:Assignment;csrf:string;run:Run;onChanged:()=>Promise<void>;studentCount:number}){
 const [rows,setRows]=useState<SubmissionRow[]|null>(null),[notice,setNotice]=useState(''),[loading,setLoading]=useState(false);
 async function toggleOpen(){const done=await run(()=>assignmentUpdate(item.id,{open:!item.open},csrf));if(done)await onChanged();}
 async function showSubmissions(){if(loading)return;setLoading(true);try{const list=await run(()=>submissionList(item.id));if(list)setRows(list);}finally{setLoading(false);}}
 async function openCopy(row:SubmissionRow){
  setNotice('');
  const doc=await run(()=>submissionOpen(item.id,row.number));
  if(!doc)return;
  try{await downloadSubmissionFile(doc.document,`${String(row.number).padStart(2,'0')}_${item.title}-${row.name||'학생'}`);setNotice(`${row.number}번 작품 파일을 내려받았어요. 서재에서 파일을 열 수 있어요.`);}
  catch{setNotice('작품 파일을 만들지 못했어요.');}
 }
 return <>
  <div className={styles.taskHeading}><h3>{item.title}</h3><span className={item.open?styles.badge:`${styles.badge} ${styles.off}`}>{item.open?'열림':'닫힘'}</span></div>
  <ul className={styles.taskMeta} aria-label="과제 정보"><li>{item.format==='shortstory'?'숏스토리':'놀스토리'}</li>{item.storyKey&&<li>바탕 작품 · {BUILTIN_WORKS.find(work=>work.id===item.storyKey)?.title??'기본 작품'}{item.format!=='shortstory'&&` (${editionLabel(item.edition)})`}</li>}<li>{new Date(item.createdAt).toLocaleDateString('ko-KR',{month:'long',day:'numeric'})} 만듦</li></ul>
  {item.description&&<p className={styles.hint}>{item.description}</p>}
  <TaskFacts item={item} studentCount={studentCount} csrf={csrf} run={run} onChanged={onChanged}/>
  <ShareLinkRow item={item} csrf={csrf} run={run} onChanged={onChanged}/>
  <div className={styles.taskActions}>
   <button className={`${styles.btn} ${styles.primary}`} aria-label={`${item.title} 제출 보기`} disabled={loading} onClick={()=>void showSubmissions()}>{loading?'불러오는 중…':rows?`제출 목록 새로고침 · ${rows.length}명`:'제출 보기'}</button>
   <button className={styles.btn} aria-label={`${item.title} ${item.open?'닫기':'열기'}`} onClick={()=>void toggleOpen()}>{item.open?'제출 마감':'제출 다시 열기'}</button>
  </div>
  {rows&&(rows.length===0?<p className={styles.hint}>아직 낸 학생이 없어요.</p>:<ul className={styles.rowsList}>{rows.map(row=><li key={row.number}>{row.number}번 {row.name} · {formatSubmittedAt(row.submittedAt)} <a className={styles.btn} aria-label={`${row.number}번 제출 작품 열기`} href={`${item.format==='shortstory'?'/shortstory':'/'}?${new URLSearchParams({...(item.format==='shortstory'?{mode:'library'}:{view:'library'}),classAssignment:item.id,classStudent:String(row.number)})}`}>작품 열기</a> <button className={styles.btn} aria-label={`${row.number}번 제출 작품 파일 받기`} onClick={()=>void openCopy(row)}>파일 받기</button></li>)}</ul>)}
  {notice&&<p className={styles.notice} role="status">{notice}</p>}
 </>;
}

/** The teacher's hand-in link: open it, change it or remove it. Only the link is stored. */
function ShareLinkRow({item,csrf,run,onChanged}:{item:Assignment;csrf:string;run:Run;onChanged:()=>Promise<void>}){
 const [editing,setEditing]=useState(false),[value,setValue]=useState(item.shareUrl??''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function save(next:string|null){
  setBusy(true);setError('');
  try{const done=await run(()=>assignmentUpdate(item.id,{shareUrl:next},csrf));if(done){setEditing(false);await onChanged();}}
  finally{setBusy(false);}
 }
 if(editing)return <form className={styles.shareEdit} onSubmit={event=>{event.preventDefault();const next=normalizeShareLink(value);if(value.trim()&&!next){setError('https://로 시작하는 공유 링크를 넣어 주세요.');return;}void save(next);}}>
  <label className={styles.field}>제출 링크<input type="url" inputMode="url" value={value} onChange={event=>{setValue(event.target.value);setError('');}} placeholder="https://" autoComplete="off" disabled={busy}/></label>
  <div className={styles.row}><button className={`${styles.btn} ${styles.primary}`} disabled={busy}>저장</button><button type="button" className={styles.btn} disabled={busy} onClick={()=>{setEditing(false);setValue(item.shareUrl??'');}}>취소</button>{item.shareUrl&&<button type="button" className={styles.btn} disabled={busy} onClick={()=>void save(null)}>링크 빼기</button>}</div>
  {error&&<p className={styles.error} role="alert">{error}</p>}
 </form>;
 return <p className={styles.shareLine}>{item.shareUrl?<><span>제출 링크 · <a href={item.shareUrl} target="_blank" rel="noopener noreferrer">{shareLinkHost(item.shareUrl)} 열기 ↗</a></span><button className={styles.linkBtn} onClick={()=>setEditing(true)} aria-label={`${item.title} 제출 링크 바꾸기`}>바꾸기</button></>
  :<button className={styles.linkBtn} onClick={()=>setEditing(true)} aria-label={`${item.title} 제출 링크 넣기`}>+ 제출 링크 넣기</button>}</p>;
}

/** Submission count and the due date, changeable in place. */
function TaskFacts({item,studentCount,csrf,run,onChanged}:{item:Assignment;studentCount:number;csrf:string;run:Run;onChanged:()=>Promise<void>}){
 const [editing,setEditing]=useState(false),[value,setValue]=useState(dateFromDueAt(item.dueAt)),[busy,setBusy]=useState(false),[now]=useState(()=>Date.now());
 const due=dueState(item.dueAt,now);
 async function save(next:number|null){setBusy(true);try{const done=await run(()=>assignmentUpdate(item.id,{dueAt:next},csrf));if(done){setEditing(false);await onChanged();}}finally{setBusy(false);}}
 return <div className={styles.taskFacts}>
  {typeof item.submittedCount==='number'&&<span className={styles.factChip}>제출 <b>{item.submittedCount}</b>{studentCount?` / ${studentCount}명`:'명'}</span>}
  {editing?<form className={styles.row} onSubmit={event=>{event.preventDefault();void save(dueAtFromDate(value));}}><label className={styles.field}>마감일<input type="date" value={value} onChange={event=>setValue(event.target.value)} disabled={busy}/></label><button className={`${styles.btn} ${styles.primary}`} disabled={busy}>저장</button><button type="button" className={styles.btn} disabled={busy} onClick={()=>setEditing(false)}>취소</button>{item.dueAt!=null&&<button type="button" className={styles.btn} disabled={busy} onClick={()=>void save(null)}>마감일 빼기</button>}</form>
   :<>{due&&item.dueAt!=null?<span className={styles.dueChip} data-tone={due.tone}>{due.label} · {dueDateLabel(item.dueAt)}</span>:null}<button className={styles.linkBtn} aria-label={`${item.title} 마감일 ${item.dueAt!=null?'바꾸기':'정하기'}`} onClick={()=>{setValue(dateFromDueAt(item.dueAt));setEditing(true);}}>{item.dueAt!=null?'마감일 바꾸기':'+ 마감일 정하기'}</button></>}
 </div>;
}
