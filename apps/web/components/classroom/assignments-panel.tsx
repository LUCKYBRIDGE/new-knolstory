'use client';
import {SeasonItems} from './season-items';
import {TaskProgress} from './task-progress';
import {ChecksEditor,TaskBrief,amountUnit,cleanChecks} from './task-brief';
import {SubmissionPreview} from './submission-preview';
import {TaskTemplate} from './task-template';
import {useCallback,useEffect,useRef,useState,type FormEvent,type ReactNode} from 'react';
import {assignmentCreate,assignmentDelete,assignmentList,assignmentUpdate,editScopeLabel,progressList,type ProgressRow,submissionList,submissionOpen,submissionReview,ClassroomError,type Assignment,type AssignmentFormat,type EditScope,type SubmissionRow} from '../../lib/classroom-api';
import {EditScopePicker} from './edit-scope-picker';
import {downloadSubmissionFile,formatSubmittedAt} from '../../lib/classroom-local';
import {BUILTIN_WORKS} from '../../lib/builtin-works';
import {ClassroomBook} from './classroom-art';
import {normalizeShareLink,shareLinkHost} from '../../lib/share-link';
import {dateFromDueAt,dueAtFromDate,dueDateLabel,dueState} from '../../lib/due-date';
import type {TaskRequest} from './task-composer';
import {editionLabel} from '../../lib/mission-api';
import {StartPointPicker} from './start-point-picker';
import {RecipientFacts,RecipientPicker,recipientProblem,type RecipientStudent,type Recipients} from './recipient-picker';
import type {BuiltinWorkId} from '../../lib/builtin-works';
import styles from './classroom.module.css';
type Run=<T>(action:()=>Promise<T>)=>Promise<T|undefined>;
/** Work tasks per classroom (server/documents/quota.ts): each holds one work per student. */
const TASK_LIMIT=20;
export function AssignmentsPanel({csrf,run,students=[],request=null}:{csrf:string;run:Run;students?:readonly RecipientStudent[];request?:TaskRequest|null}){
 const studentCount=students.length;
 const [recipients,setRecipients]=useState<Recipients>(null),[recipientError,setRecipientError]=useState('');
 const [items,setItems]=useState<Assignment[]|null>(null),[title,setTitle]=useState(''),[description,setDescription]=useState(''),[storyKey,setStoryKey]=useState(''),[link,setLink]=useState(''),[linkError,setLinkError]=useState(''),[due,setDue]=useState(''),[formOpen,setFormOpen]=useState(false),[edition,setEdition]=useState<'original'|'knolstory'>('knolstory'),[start,setStart]=useState<{value:string;label:string}>({value:'',label:''}),[checks,setChecks]=useState<string[]>(['']),[amount,setAmount]=useState(''),[amountError,setAmountError]=useState('');
 const formRef=useRef<HTMLDivElement>(null);
 // Scrolls to and focuses the form once it is on screen (it only renders while open).
 const [focusForm,setFocusForm]=useState(0);
 useEffect(()=>{if(!focusForm)return;const frame=requestAnimationFrame(()=>{formRef.current?.scrollIntoView({block:'start',behavior:'smooth'});formRef.current?.querySelector<HTMLInputElement>('input[name="task-title"]')?.focus({preventScroll:true});});return()=>cancelAnimationFrame(frame);},[focusForm]);
 const [format,setFormat]=useState<AssignmentFormat>('knolstory'),[filter,setFilter]=useState<AssignmentFormat>('knolstory');
 // Task-level rules: the editing tools this task allows, and the ShortStory task a KnolStory task follows.
 const [scope,setScope]=useState<EditScope|null>(null),[after,setAfter]=useState('');
 const stageChoices=items?.filter(item=>item.format==='shortstory'&&!item.archived)??[];
 const staged=format==='knolstory'&&!!after;
 /** Opens the form for a KnolStory task that follows this ShortStory task. */
 const continueFrom=useCallback((item:Assignment)=>{setFormat('knolstory');setAfter(item.id);setStoryKey('');setStart({value:'',label:''});setTitle(current=>current||`${item.title} · 놀스토리로 이어 쓰기`);setFormOpen(true);setFocusForm(Date.now());},[]);
 const [creating,setCreating]=useState(false),[loadFailed,setLoadFailed]=useState(false);
 const createLock=useRef(false);
 const currentCount=items?.filter(item=>!item.archived).length??0;
 // The composer opens this form for writing tasks with the chosen format.
 useEffect(()=>{if(!request||(request.kind!=='knolstory'&&request.kind!=='shortstory'))return;const timer=window.setTimeout(()=>{setFormat(request.kind as AssignmentFormat);if(request.kind==='shortstory')setAfter('');setFormOpen(true);setFocusForm(Date.now());},0);return()=>window.clearTimeout(timer);},[request]);
 const load=useCallback(async()=>{setLoadFailed(false);const list=await run(()=>assignmentList());if(list)setItems(list);else setLoadFailed(true);},[run]);
 useEffect(()=>{const timer=window.setTimeout(()=>void load(),0);return()=>window.clearTimeout(timer);},[load]);
 async function create(event:FormEvent){
  event.preventDefault();if(!title.trim()||!description.trim()||createLock.current)return;
  const targetAmount=amount.trim()?Number(amount):null;
  if(targetAmount!==null&&(!Number.isInteger(targetAmount)||targetAmount<1||targetAmount>500)){setAmountError('분량은 1에서 500 사이 숫자로 적어 주세요.');return;}setAmountError('');
  const shareUrl=normalizeShareLink(link);if(link.trim()&&!shareUrl){setLinkError('https://로 시작하는 공유 링크를 넣어 주세요.');return;}setLinkError('');
  const problem=recipientProblem(recipients);if(problem){setRecipientError(problem);return;}setRecipientError('');
  createLock.current=true;setCreating(true);
  try{
  const made=await run(()=>assignmentCreate({format,title:title.trim(),...(description.trim()?{description:description.trim()}:{}),...(scope?{editScope:scope}:{}),...(staged?{afterAssignmentId:after}:{}),...(storyKey&&!staged?{storyKey}:{}),...(shareUrl?{shareUrl}:{}),...(dueAtFromDate(due)!==null?{dueAt:dueAtFromDate(due)!}:{}),...(storyKey&&!staged&&format==='knolstory'?{edition}:{}),...(storyKey&&!staged&&format==='knolstory'&&start.value?{startPoint:start.value,startLabel:start.label.slice(0,120)}:{}),...(recipients!==null?{recipients}:{}),...(cleanChecks(checks).length?{checks:cleanChecks(checks)}:{}),...(targetAmount!==null?{targetAmount}:{})},csrf));
  if(made){setFilter(format);setScope(null);setAfter('');setTitle('');setDescription('');setStoryKey('');setLink('');setDue('');setStart({value:'',label:''});setRecipients(null);setChecks(['']);setAmount('');setFormOpen(false);await load();}
  }finally{createLock.current=false;setCreating(false);}
 }
 return <section className={styles.card} aria-label="작품 쓰기 과제">
  <div className={styles.sectionHeading}><div><span className={styles.eyebrow}>쓰고, 그리고, 내는</span><h2>작품 쓰기 과제</h2>{items&&<span className={styles.taskCount}>작품 과제 {currentCount}/{TASK_LIMIT}개</span>}</div><ClassroomBook small/></div>
  {/* One way in: the 새 과제 내기 choices above open this form; it also stays open while there is no task yet. */}
  {!(formOpen||items?.length===0)&&items&&<p className={styles.hint}>새 작품 쓰기 과제는 위의 ‘새 과제 내기’에서 놀스토리나 숏스토리를 골라 만들어요.</p>}
  {(formOpen||items?.length===0)&&<div ref={formRef} className={styles.assignmentCreate} role="region" aria-label="새 작품 쓰기 과제"><div className={styles.formHead}><strong>새 작품 쓰기 과제</strong>{!!items?.length&&<button type="button" className={styles.btn} onClick={()=>setFormOpen(false)}>닫기</button>}</div>{items&&currentCount>=TASK_LIMIT&&<p className={styles.error} role="status">작품을 내는 과제는 {TASK_LIMIT}개까지 만들 수 있어요. 끝난 과제를 지운 뒤 새로 만들어 주세요.</p>}<form onSubmit={event=>void create(event)}><fieldset disabled={creating}>
   <label className={styles.field}>과제 유형<select aria-label="과제 유형" value={format} onChange={event=>setFormat(event.target.value as AssignmentFormat)}><option value="knolstory">놀스토리</option><option value="shortstory">숏스토리</option></select></label>
   {format==='knolstory'&&<fieldset className={styles.editScope} data-task-stage>
    <legend>시작 방법</legend>
    <div className={styles.scopeChoices} role="radiogroup" aria-label="시작 방법">
     <label><input type="radio" name="task-stage" checked={!after} onChange={()=>setAfter('')}/>바로 놀스토리로 써요</label>
     <label><input type="radio" name="task-stage" checked={!!after} disabled={!stageChoices.length} onChange={()=>setAfter(stageChoices[0]?.id??'')}/>숏스토리 과제를 통과한 뒤 이어 써요</label>
    </div>
    {after?<><label className={styles.field}>먼저 할 숏스토리 과제<select aria-label="먼저 할 숏스토리 과제" value={after} onChange={event=>setAfter(event.target.value)}>{stageChoices.map(item=><option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
     <p className={styles.hint}>학생은 그 숏스토리 과제를 선생님이 ‘통과’시키면 이 과제를 열 수 있어요. 통과한 그림책의 쪽마다 놀스토리 장이 하나씩 만들어지고, 그림책 글과 삽화는 장 옆에 ‘그림책 구상’으로 보여요.</p></>
     :!stageChoices.length&&<p className={styles.hint}>숏스토리 과제를 먼저 만들면 ‘통과한 뒤 이어 쓰기’를 고를 수 있어요.</p>}
   </fieldset>}
   <div className={styles.row}>
    <label className={styles.field}>과제 제목<input name="task-title" value={title} onChange={event=>setTitle(event.target.value)} maxLength={60}/></label>
    {!staged&&<label className={styles.field}>바탕 작품 (선택)<select aria-label="바탕 작품 (선택)" value={storyKey} onChange={event=>{setStoryKey(event.target.value);setStart({value:'',label:''});}}><option value="">정하지 않아요</option>{BUILTIN_WORKS.map(work=><option key={work.id} value={work.id}>{work.title}</option>)}</select></label>}
    {storyKey&&!staged&&format==='knolstory'&&<label className={styles.field}>바탕 판본<select aria-label="바탕 판본" value={edition} onChange={event=>{setEdition(event.target.value as 'original'|'knolstory');setStart({value:'',label:''});}}><option value="knolstory">각색 · 선택지가 있는 놀스토리</option><option value="original">원작 · 옛이야기 그대로</option></select></label>}
   </div>
   {storyKey&&!staged&&format==='knolstory'&&<StartPointPicker key={`${storyKey}:${edition}`} storyKey={storyKey as BuiltinWorkId} edition={edition} value={start.value} onChange={(value,label)=>setStart({value,label})}/>}
   <label className={styles.field} style={{marginTop:8}}>무엇을 하나요<textarea aria-label="무엇을 하나요" value={description} onChange={event=>setDescription(event.target.value)} maxLength={600} rows={3}
    placeholder={format==='shortstory'?'예: 별주부전의 한 장면을 골라 세 쪽짜리 그림책으로 다시 써요.':'예: 별주부전 3장 뒤를 내 생각대로 이어 써요. 토끼가 어떤 꾀를 낼지 상상해 봐요.'}/></label>
   <ChecksEditor value={checks} onChange={setChecks} format={format}/>
   <EditScopePicker value={scope} onChange={setScope} format={format}/>
   <label className={styles.field} style={{marginTop:8}}>분량 (선택)<span className={styles.row}><input aria-label="분량" type="number" inputMode="numeric" min={1} max={500} value={amount} onChange={event=>setAmount(event.target.value.replace(/[^0-9]/g,''))} style={{width:'6em'}}/><span>{amountUnit(format)} 이상</span></span></label>
   {amountError&&<p className={styles.error} role="alert">{amountError}</p>}
   <label className={styles.field} style={{marginTop:8}}>마감일 (선택)<input type="date" value={due} onChange={event=>setDue(event.target.value)}/></label>
   <RecipientPicker students={students} value={recipients} onChange={next=>{setRecipients(next);setRecipientError('');}}/>
   {recipientError&&<p className={styles.error} role="alert">{recipientError}</p>}
   <label className={styles.field} style={{marginTop:8}}>제출 링크 (선택)<input type="url" inputMode="url" value={link} onChange={event=>{setLink(event.target.value);setLinkError('');}} placeholder="예: 구글 드라이브 폴더 공유 링크" autoComplete="off"/></label>
   <p className={styles.hint}>학생 과제 화면에 ‘제출 링크 열기’로 보여요. 학생 파일 이름 앞에는 번호(01~30)가 붙어서 모아 보기 쉬워요.</p>
   {linkError&&<p className={styles.error} role="alert">{linkError}</p>}
   <details className={styles.taskPreview}><summary>학생에게 이렇게 보여요</summary><div className={styles.taskPreviewCard}><h4>{title.trim()||'과제 제목'}</h4>
    <TaskBrief description={description||'무엇을 하는지 적으면 여기에 보여요.'} checks={cleanChecks(checks)} targetAmount={amount.trim()?Number(amount)||null:null} format={format}/></div></details>
   {!description.trim()&&title.trim()&&<p className={styles.hint}>‘무엇을 하나요’를 적으면 과제를 만들 수 있어요.</p>}
   <p><button className={`${styles.btn} ${styles.primary}`} disabled={creating||!title.trim()||!description.trim()}>{creating?'만드는 중…':'과제 만들기'}</button></p>
  </fieldset></form></div>}
  <div className={styles.typeTabs} role="group" aria-label="과제 유형별 보기">{(['knolstory','shortstory'] as const).map(value=><button key={value} className={styles.btn} aria-pressed={filter===value} onClick={()=>setFilter(value)}><ClassroomBook format={value} small/>{value==='knolstory'?'놀스토리':'숏스토리'}{items&&<span className={styles.tabCount}> · {items.filter(item=>item.format===value).length}</span>}</button>)}</div>
  {loadFailed?<p className={styles.error} role="alert">과제를 불러오지 못했어요. <button className={styles.btn} onClick={()=>void load()}>과제 다시 불러오기</button></p>:items===null?<p className={styles.hint} role="status">과제를 불러오고 있어요.</p>:items.filter(item=>item.format===filter).length===0?<p className={styles.hint}>이 유형의 과제가 없어요.</p>
   :<SeasonItems items={items.filter(item=>item.format===filter)} render={group=><ul className={styles.list}>{group.map(item=><li key={item.id} className={styles.item} data-format={item.format}><AssignmentRow item={item} csrf={csrf} run={run} onChanged={load} students={students} onContinue={continueFrom} followers={items.filter(other=>other.after?.id===item.id)}/></li>)}</ul>}/>}
 </section>;
}
function AssignmentRow({item,csrf,run,onChanged,students,onContinue,followers}:{item:Assignment;csrf:string;run:Run;onChanged:()=>Promise<void>;students:readonly RecipientStudent[];onContinue:(item:Assignment)=>void;followers:readonly Assignment[]}){
 const studentCount=item.recipients?item.recipients.length:students.length;
 const [rows,setRows]=useState<SubmissionRow[]|null>(null),[progress,setProgress]=useState<ProgressRow[]|null>(null),[guideOpen,setGuideOpen]=useState(false),[notice,setNotice]=useState(''),[loading,setLoading]=useState(false),[confirmDelete,setConfirmDelete]=useState(false);
 async function remove(){const removed=await run(()=>assignmentDelete(item.id,csrf));if(removed!==undefined){setConfirmDelete(false);await onChanged();}}
 async function toggleOpen(){const done=await run(()=>assignmentUpdate(item.id,{open:!item.open},csrf));if(done)await onChanged();}
 async function showSubmissions(){if(loading)return;setLoading(true);try{const both=await run(()=>Promise.all([progressList(item.id),submissionList(item.id)]));if(both){setProgress(both[0]);setRows(both[1]);}}finally{setLoading(false);}}
 async function openCopy(row:SubmissionRow){
  setNotice('');
  const doc=await run(()=>submissionOpen(item.id,row.number));
  if(!doc)return;
  try{await downloadSubmissionFile(doc.document,`${String(row.number).padStart(2,'0')}_${item.title}-${row.name||'학생'}`);setNotice(`${row.number}번 작품 파일을 내려받았어요. 서재에서 파일을 열 수 있어요.`);}
  catch{setNotice('작품 파일을 만들지 못했어요.');}
 }
 return <>
  <div className={styles.taskHeading}><h3>{item.title}</h3><span className={item.open?styles.badge:`${styles.badge} ${styles.off}`}>{item.open?'열림':'닫힘'}</span></div>
  <ul className={styles.taskMeta} aria-label="과제 정보"><li>{item.format==='shortstory'?'숏스토리':'놀스토리'}</li>{item.storyKey&&<li>바탕 작품 · {BUILTIN_WORKS.find(work=>work.id===item.storyKey)?.title??'기본 작품'}{item.format!=='shortstory'&&` (${editionLabel(item.edition)})`}</li>}{item.startLabel&&<li>시작 · {item.startLabel}</li>}{item.after&&<li data-stage>앞 단계 · {item.after.title} 통과 뒤</li>}{followers.map(next=><li key={next.id} data-stage>다음 단계 · {next.title}</li>)}<li>{new Date(item.createdAt).toLocaleDateString('ko-KR',{month:'long',day:'numeric'})} 만듦</li></ul>
  {item.archived?<>
   <TaskBrief description={item.description} checks={item.checks} targetAmount={item.targetAmount??null} format={item.format}/>
   <p className={styles.hint}>{item.dueAt?`제출 마감 · ${dueDateLabel(item.dueAt)}`:'제출 마감일 없음'}</p>
   <p className={styles.hint}>받는 학생 · {item.recipients==null?'모든 학생':item.recipients.map(number=>`${number}번`).join(', ')}</p>
   {item.template&&<p className={styles.hint}>시작 작품 · <strong>{item.template.title}</strong></p>}
  </>:<><TaskGuide item={item} csrf={csrf} run={run} onChanged={onChanged} open={guideOpen} onToggle={setGuideOpen}/>
  <div className={styles.factsRow}><TaskFacts item={item} studentCount={studentCount} csrf={csrf} run={run} onChanged={onChanged}/>
  <RecipientFacts title={item.title} value={item.recipients} students={students} onSave={async next=>{const done=await run(()=>assignmentUpdate(item.id,{recipients:next},csrf));if(done)await onChanged();return !!done;}}/></div>
  <ScopeRow item={item} csrf={csrf} run={run} onChanged={onChanged}/>
  {!item.after&&<TaskTemplate item={item} csrf={csrf} run={run} onChanged={onChanged}/>}
  {item.format==='shortstory'&&item.open&&!followers.length&&<p className={styles.shareLine}><button className={styles.linkBtn} aria-label={`${item.title} 통과 뒤 놀스토리로 이어 쓰는 과제 만들기`} onClick={()=>onContinue(item)}>+ 통과하면 놀스토리로 이어 쓰는 과제 만들기</button></p>}
  <ShareLinkRow item={item} csrf={csrf} run={run} onChanged={onChanged}/></>}
  <div className={styles.taskActions}>
   {progress?<button className={`${styles.btn} ${styles.primary}`} aria-label={`${item.title} 진행 접기`} aria-expanded onClick={()=>{setProgress(null);setRows(null);}}>진행 접기</button>
    :<button className={`${styles.btn} ${styles.primary}`} aria-label={`${item.title} 진행 보기`} aria-expanded={false} disabled={loading} onClick={()=>void showSubmissions()}>{loading?'불러오는 중…':`진행 보기 · 작성 중 ${item.draftCount??0} · 냈어요 ${item.submittedCount??0}`}</button>}
   {progress&&<button className={styles.btn} aria-label={`${item.title} 진행 새로 고침`} disabled={loading} onClick={()=>void showSubmissions()}>{loading?'불러오는 중…':'새로 고침'}</button>}
   {!item.archived&&<button className={styles.btn} aria-label={`${item.title} ${item.open?'닫기':'열기'}`} onClick={()=>void toggleOpen()}>{item.open?'과제 마감':'다시 열기'}</button>}
   {!item.archived&&!confirmDelete&&<button className={`${styles.btn} ${styles.danger}`} aria-label={`${item.title} 과제 지우기`} onClick={()=>setConfirmDelete(true)}>과제 지우기</button>}
  </div>
  {confirmDelete&&<div className={styles.notice} role="group" aria-label={`${item.title} 과제 지우기 확인`}><p>‘{item.title}’ 과제와 학생들이 낸 작품을 모두 지울까요? 지운 뒤에는 되돌릴 수 없어요. 남겨 둘 작품은 먼저 ‘진행 보기’에서 내려받아 두세요.</p><div className={styles.row}><button className={styles.btn} onClick={()=>setConfirmDelete(false)}>취소</button><button className={`${styles.btn} ${styles.danger}`} onClick={()=>void remove()}>과제와 제출 작품 지우기</button></div></div>}
  {progress&&<TaskProgress item={item} rows={progress} csrf={csrf} run={run} onChanged={async()=>{await showSubmissions();}}
   review={(number,meta)=>{const row=rows?.find(entry=>entry.number===number);return row?<SubmissionReview meta={meta} item={item} row={row} unlocks={followers.map(next=>next.title)} csrf={csrf} onOpenFile={()=>void openCopy(row)} onSaved={next=>setRows(current=>current?.map(entry=>entry.number===next.number?next:entry)??null)} onStale={async()=>{await showSubmissions();await onChanged();}}/>:null;}}/>}
  {notice&&<p className={styles.notice} role="status">{notice}</p>}
 </>;
}

/** The task's edit scope, changeable in place; it applies the next time a student opens the task's work. */
function ScopeRow({item,csrf,run,onChanged}:{item:Assignment;csrf:string;run:Run;onChanged:()=>Promise<void>}){
 const [editing,setEditing]=useState(false),[value,setValue]=useState<EditScope|null>(item.editScope??null),[busy,setBusy]=useState(false);
 async function save(){setBusy(true);try{const done=await run(()=>assignmentUpdate(item.id,{editScope:value},csrf));if(done){setEditing(false);await onChanged();}}finally{setBusy(false);}}
 if(editing)return <div className={styles.shareEdit}><EditScopePicker value={value} onChange={setValue} format={item.format}/>
  <div className={styles.row}><button className={`${styles.btn} ${styles.primary}`} disabled={busy} onClick={()=>void save()}>저장</button><button type="button" className={styles.btn} disabled={busy} onClick={()=>{setEditing(false);setValue(item.editScope??null);}}>취소</button></div></div>;
 return <p className={styles.shareLine}><span>고칠 수 있는 것 · <strong>{editScopeLabel(item.editScope)}</strong></span><button className={styles.linkBtn} aria-label={`${item.title} 편집 범위 바꾸기`} onClick={()=>{setValue(item.editScope??null);setEditing(true);}}>바꾸기</button></p>;
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
  :<button className={styles.linkBtn} onClick={()=>setEditing(true)} aria-label={`${item.title} 제출 링크 넣기`}>+ 외부 제출 링크 넣기 (드라이브 등)</button>}</p>;
}

/** Submission count and the due date, changeable in place. */
function TaskFacts({item,studentCount,csrf,run,onChanged}:{item:Assignment;studentCount:number;csrf:string;run:Run;onChanged:()=>Promise<void>}){
 const [editing,setEditing]=useState(false),[value,setValue]=useState(dateFromDueAt(item.dueAt)),[busy,setBusy]=useState(false),[now]=useState(()=>Date.now());
 const due=dueState(item.dueAt,now);
 async function save(next:number|null){setBusy(true);try{const done=await run(()=>assignmentUpdate(item.id,{dueAt:next},csrf));if(done){setEditing(false);await onChanged();}}finally{setBusy(false);}}
 return <div className={styles.taskFacts}>
  {typeof item.submittedCount==='number'&&<span className={styles.factChip}>제출 <b>{item.submittedCount}</b>{studentCount?` / ${studentCount}명`:'명'}{typeof item.passedCount==='number'&&<> · 통과 <b>{item.passedCount}</b></>}</span>}
  {editing?<form className={styles.row} onSubmit={event=>{event.preventDefault();void save(dueAtFromDate(value));}}><label className={styles.field}>마감일<input type="date" value={value} onChange={event=>setValue(event.target.value)} disabled={busy}/></label><button className={`${styles.btn} ${styles.primary}`} disabled={busy}>저장</button><button type="button" className={styles.btn} disabled={busy} onClick={()=>setEditing(false)}>취소</button>{item.dueAt!=null&&<button type="button" className={styles.btn} disabled={busy} onClick={()=>void save(null)}>마감일 빼기</button>}</form>
   :<>{due&&item.dueAt!=null?<span className={styles.dueChip} data-tone={due.tone}>{due.label} · {dueDateLabel(item.dueAt)}</span>:null}<button className={styles.linkBtn} aria-label={`${item.title} 마감일 ${item.dueAt!=null?'바꾸기':'정하기'}`} onClick={()=>{setValue(dateFromDueAt(item.dueAt));setEditing(true);}}>{item.dueAt!=null?'마감일 바꾸기':'+ 마감일 정하기'}</button></>}
 </div>;
}

const REVIEW_LABEL={passed:'통과',revise:'다시 쓰기'} as const;
/** One submitted work: open it, then pass it or ask for a rewrite with feedback. */
function SubmissionReview({item,row,csrf,onOpenFile,onSaved,onStale,meta,unlocks=[]}:{item:Assignment;row:SubmissionRow;csrf:string;onOpenFile:()=>void;onSaved:(next:SubmissionRow)=>void;onStale:()=>Promise<void>;meta?:ReactNode;unlocks?:readonly string[]}){
 const [writing,setWriting]=useState(false),[feedback,setFeedback]=useState(row.reviewStatus?row.feedback??'':''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const status=row.reviewStatus??null;
 async function decide(reviewStatus:SubmissionRow['reviewStatus']){
  if(busy)return;
  if(reviewStatus==='revise'&&!feedback.trim()){setError('다시 쓸 점을 적어 주세요.');setWriting(true);return;}
  setBusy(true);setError('');
  try{onSaved(await submissionReview(item.id,row.number,{reviewStatus:reviewStatus??null,feedback:reviewStatus===null?'':feedback.trim(),expectedSubmittedAt:row.submittedAt},csrf));setWriting(false);}
  catch(issue){if(issue instanceof ClassroomError&&issue.code==='SUBMISSION_CHANGED'){setError(issue.message);setFeedback('');await onStale();}else setError(issue instanceof ClassroomError?issue.message:'저장하지 못했어요.');}
  finally{setBusy(false);}
 }
 const href=`${item.format==='shortstory'?'/shortstory':'/'}?${new URLSearchParams({...(item.format==='shortstory'?{mode:'library'}:{view:'library'}),classAssignment:item.id,classStudent:String(row.number)})}`;
 return <div className={styles.review} data-review={status??'pending'}>
  <div className={styles.reviewHead}><strong>{row.number}번 {row.name}</strong><span className={styles.hint}>{formatSubmittedAt(row.submittedAt)} 제출</span>{meta}
   <span className={styles.reviewChip} data-review={status??'pending'}>{status?REVIEW_LABEL[status]:'확인 전'}</span></div>
  {unlocks.length>0&&!item.archived&&<p className={styles.hint} data-unlocks>{status==='passed'?`통과해서 이 학생에게 ‘${unlocks.join('’, ‘')}’ 과제가 열렸어요.`:`통과시키면 이 학생에게 ‘${unlocks.join('’, ‘')}’ 과제가 열려요.`}</p>}
  {row.feedback&&!writing&&<p className={styles.reviewFeedback}><b>{status===null?'지난 피드백':'피드백'}</b> {row.feedback}</p>}
  <div className={styles.row}>
   <SubmissionPreview item={item} row={row}/>
   <a className={styles.btn} aria-label={`${row.number}번 제출 작품 열기`} href={href}>서재에서 열기</a>
   <button className={styles.btn} aria-label={`${row.number}번 제출 작품 파일 받기`} onClick={onOpenFile}>파일 받기</button>
   {!item.archived&&<><button className={`${styles.btn} ${styles.primary}`} disabled={busy||status==='passed'} aria-label={`${row.number}번 통과`} onClick={()=>void decide('passed')}>통과</button>
   <button className={styles.btn} disabled={busy} aria-label={`${row.number}번 다시 쓰기 요청`} aria-expanded={writing} onClick={()=>{setWriting(value=>!value);setError('');}}>다시 쓰기</button>
   {status&&<button className={styles.linkBtn} disabled={busy} aria-label={`${row.number}번 확인 지우기`} onClick={()=>void decide(null)}>확인 지우기</button>}</>}
  </div>
  {writing&&<form className={styles.reviewForm} onSubmit={event=>{event.preventDefault();void decide('revise');}}>
   <label className={styles.field}>{row.number}번에게 피드백<textarea value={feedback} maxLength={2000} rows={3} onChange={event=>setFeedback(event.target.value)} placeholder="무엇을 고치면 좋을지 써 주세요."/></label>
   <div className={styles.row}><button className={`${styles.btn} ${styles.primary}`} disabled={busy}>다시 쓰기 요청</button><button type="button" className={styles.btn} onClick={()=>setWriting(false)}>취소</button></div>
  </form>}
  {error&&<p className={styles.error} role="alert">{error}</p>}
 </div>;
}

/** The task's guidance in the row: what to do, the checklist and the amount, editable in place. */
function TaskGuide({item,csrf,run,onChanged,open,onToggle}:{item:Assignment;csrf:string;run:Run;onChanged:()=>Promise<void>;open:boolean;onToggle:(open:boolean)=>void}){
 const [editing,setEditing]=useState(false),[description,setDescription]=useState(item.description),[checks,setChecks]=useState<string[]>(item.checks?.length?[...item.checks]:['']),[amount,setAmount]=useState(item.targetAmount?String(item.targetAmount):''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const parts=[item.checks?.length?`확인할 점 ${item.checks.length}개`:'',item.targetAmount?`${item.targetAmount}${amountUnit(item.format)} 이상`:''].filter(Boolean);
 async function save(){
  const target=amount.trim()?Number(amount):null;
  if(!description.trim()){setError('무엇을 하는지 적어 주세요.');return;}
  if(target!==null&&(!Number.isInteger(target)||target<1||target>500)){setError('분량은 1에서 500 사이 숫자로 적어 주세요.');return;}
  setBusy(true);setError('');
  try{const done=await run(()=>assignmentUpdate(item.id,{description:description.trim(),checks:cleanChecks(checks),targetAmount:target},csrf));if(done){setEditing(false);await onChanged();}}finally{setBusy(false);}
 }
 return <details className={styles.taskGuide} open={open} onToggle={event=>onToggle(event.currentTarget.open)}><summary>과제 안내{parts.length?` · ${parts.join(' · ')}`:''}{!item.description.trim()&&' · 아직 안내가 없어요'}</summary>
  {!editing?<>
   <TaskBrief description={item.description||'무엇을 하는지 아직 적지 않았어요.'} checks={item.checks} targetAmount={item.targetAmount??null} format={item.format}/>
   <button className={styles.linkBtn} aria-label={`${item.title} 안내 고치기`} onClick={()=>{setDescription(item.description);setChecks(item.checks?.length?[...item.checks]:['']);setAmount(item.targetAmount?String(item.targetAmount):'');setEditing(true);}}>안내 고치기</button>
  </>:<div>
   <label className={styles.field}>무엇을 하나요<textarea aria-label="무엇을 하나요" rows={3} maxLength={600} value={description} onChange={event=>setDescription(event.target.value)}/></label>
   <ChecksEditor value={checks} onChange={setChecks} format={item.format}/>
   <label className={styles.field}>분량 (선택)<span className={styles.row}><input aria-label="분량" type="number" inputMode="numeric" min={1} max={500} value={amount} onChange={event=>setAmount(event.target.value.replace(/[^0-9]/g,''))} style={{width:'6em'}}/><span>{amountUnit(item.format)} 이상</span></span></label>
   {error&&<p className={styles.error} role="alert">{error}</p>}
   <div className={styles.row}><button className={styles.btn} onClick={()=>setEditing(false)}>취소</button><button className={`${styles.btn} ${styles.primary}`} disabled={busy} onClick={()=>void save()}>안내 저장</button></div>
   <p className={styles.hint}>바꾼 안내는 학생 과제 화면에 바로 보여요.</p>
  </div>}
 </details>;
}
