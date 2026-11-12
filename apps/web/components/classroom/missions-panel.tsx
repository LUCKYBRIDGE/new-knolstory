'use client';
import {useCallback,useEffect,useRef,useState,type FormEvent} from 'react';
import {missionCreate,missionList,missionProgress,missionReview,missionSetOpen,missionKindLabel,readingFormatLabel,MissionError,MISSION_LIMITS,
 type Mission,type MissionDraft,type MissionKind,type MissionStudentProgress,type ReadingFormat} from '../../lib/mission-api';
import {PROVIDED_MISSIONS,copyProvidedMission} from '../../lib/provided-missions';
import {BUILTIN_WORKS,type BuiltinWorkId} from '../../lib/builtin-works';
import {formatSubmittedAt} from '../../lib/classroom-local';
import {MissionSeal} from './classroom-art';
import shared from './classroom.module.css';
import styles from './missions-panel.module.css';

const text=(issue:unknown,fallback:string)=>issue instanceof Error&&issue.message?issue.message:fallback;
const BLANK:MissionDraft={title:'',description:'',criteria:'',kind:'worksheet',storyKey:null,readingFormat:'original',questions:[{id:'q1',prompt:''}]};
const KINDS:readonly Readonly<{kind:MissionKind;label:string;hint:string}>[]=[
 {kind:'reading',label:'읽기',hint:'작품을 읽고 확인을 요청해요'},
 {kind:'worksheet',label:'독후 활동지',hint:'질문에 생각을 써서 내요'},
 {kind:'custom',label:'자유',hint:'교실 활동이나 종이 활동지'},
];
const workTitle=(key:string|null)=>BUILTIN_WORKS.find(work=>work.id===key)?.title;
type Status='passed'|'pending'|'revise'|'none';
const statusOf=(row:Pick<MissionStudentProgress,'reviewStatus'|'submittedAt'>):Status=>row.reviewStatus==='passed'?'passed':row.reviewStatus==='revise'?'revise':row.submittedAt?'pending':'none';
const STATUS_LABEL:Record<Status,string>={passed:'통과',pending:'확인 대기',revise:'다시 쓰기',none:'아직 안 냄'};

/** Teacher's missions: bring in a provided mission or write one, assign it, then read answers and decide. */
export function MissionsPanel({csrf}:{csrf:string}){
 const [missions,setMissions]=useState<Mission[]|null>(null),[loadError,setLoadError]=useState('');
 const [picker,setPicker]=useState(false),[draft,setDraft]=useState<MissionDraft|null>(null),[origin,setOrigin]=useState<'provided'|'own'>('own');
 const [notice,setNotice]=useState('');
 const editor=useRef<HTMLDivElement>(null);
 const load=useCallback(async()=>{
  setLoadError('');
  try{setMissions(await missionList());}catch(issue){setLoadError(text(issue,'미션을 불러오지 못했어요.'));}
 },[]);
 useEffect(()=>{const timer=window.setTimeout(()=>void load(),0);return()=>window.clearTimeout(timer);},[load]);
 function begin(next:MissionDraft,from:'provided'|'own'){
  setDraft(next);setOrigin(from);setPicker(false);setNotice('');
  requestAnimationFrame(()=>{editor.current?.scrollIntoView({block:'nearest',behavior:'smooth'});editor.current?.querySelector<HTMLInputElement>('input[name="mission-title"]')?.focus({preventScroll:true});});
 }
 return <section className={`${shared.card} ${styles.panel}`} aria-label="미션">
  <div className={shared.sectionHeading}><div><span className={shared.eyebrow}>읽고, 생각하고, 확인받는</span><h2>미션</h2></div><MissionSeal small/></div>
  <p className={shared.hint}>학생이 읽거나 활동지를 내면 선생님이 확인해요. 통과시키면 학생 화면에 ‘미션 성공’이 표시돼요.</p>
  {!draft&&<div className={styles.starters}>
   <button className={`${shared.btn} ${shared.primary}`} aria-expanded={picker} onClick={()=>setPicker(value=>!value)}>놀스토리 제공 미션 가져오기</button>
   <button className={shared.btn} onClick={()=>begin({...BLANK,questions:[{id:'q1',prompt:''}]},'own')}>직접 만들기</button>
  </div>}
  {picker&&!draft&&<ProvidedPicker onPick={mission=>begin(mission,'provided')} onClose={()=>setPicker(false)}/>}
  {draft&&<div ref={editor}><MissionEditor key={origin+draft.title} initial={draft} origin={origin} csrf={csrf} onCancel={()=>setDraft(null)}
   onCreated={mission=>{setDraft(null);setMissions(current=>[mission,...(current??[])]);setNotice(`‘${mission.title}’ 미션을 배정했어요. 학생의 ‘내 과제’에 바로 보여요.`);}}/></div>}
  {notice&&<p className={shared.notice} role="status">{notice}</p>}
  {loadError?<p className={shared.error} role="alert">{loadError} <button className={shared.btn} onClick={()=>void load()}>미션 다시 불러오기</button></p>
   :missions===null?<p className={shared.hint} role="status">미션을 불러오고 있어요.</p>
   :missions.length===0?(!draft&&!picker&&<p className={styles.empty}>아직 배정한 미션이 없어요. 제공 미션을 가져오면 바로 시작할 수 있어요.</p>)
   :<ul className={`${shared.list} ${styles.missions}`}>{missions.map(mission=><li key={mission.id} className={styles.mission} data-kind={mission.kind}>
     <MissionRow mission={mission} csrf={csrf} onChanged={next=>setMissions(current=>current?.map(item=>item.id===next.id?next:item)??null)}/></li>)}</ul>}
 </section>;
}

function ProvidedPicker({onPick,onClose}:{onPick:(mission:MissionDraft)=>void;onClose:()=>void}){
 const [work,setWork]=useState<BuiltinWorkId>(BUILTIN_WORKS[0].id);
 return <div className={styles.picker} role="region" aria-label="놀스토리 제공 미션">
  <div className={styles.pickerHead}><strong>어떤 작품의 미션을 가져올까요?</strong><button className={shared.btn} onClick={onClose}>닫기</button></div>
  <div className={styles.works} role="group" aria-label="작품 고르기">{BUILTIN_WORKS.map(item=><button key={item.id} className={shared.btn} aria-pressed={work===item.id} onClick={()=>setWork(item.id)}>{item.title}</button>)}</div>
  <ul className={styles.provided}>{PROVIDED_MISSIONS.filter(mission=>mission.storyKey===work).map(mission=><li key={mission.providedId}>
   <span className={styles.kind} data-kind={mission.kind}>{missionKindLabel(mission.kind)}</span>
   <h3>{mission.title}</h3>
   <p>{mission.description}</p>
   {mission.questions.length>0&&<ol>{mission.questions.map(question=><li key={question.id}>{question.prompt}</li>)}</ol>}
   <button className={shared.btn} aria-label={`${mission.title} 가져와서 고치기`} onClick={()=>onPick(copyProvidedMission(mission))}>가져와서 고치기</button>
  </li>)}</ul>
  <p className={shared.hint}>가져온 미션은 내 학급용 사본이에요. 제목·안내·통과 기준·질문을 고친 뒤 배정해요.</p>
 </div>;
}

function MissionEditor({initial,origin,csrf,onCreated,onCancel}:{initial:MissionDraft;origin:'provided'|'own';csrf:string;onCreated:(mission:Mission)=>void;onCancel:()=>void}){
 const [kind,setKind]=useState<MissionKind>(initial.kind),[title,setTitle]=useState(initial.title),[description,setDescription]=useState(initial.description),[criteria,setCriteria]=useState(initial.criteria);
 const [storyKey,setStoryKey]=useState<string>(initial.storyKey??''),[format,setFormat]=useState<ReadingFormat>(initial.readingFormat);
 const [questions,setQuestions]=useState<string[]>(initial.questions.map(question=>question.prompt));
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const lock=useRef(false);
 const filled=questions.map(prompt=>prompt.trim()).filter(Boolean);
 const problem=!title.trim()?'미션 제목을 써 주세요.':kind==='reading'&&!storyKey?'읽을 작품을 골라 주세요.':kind==='worksheet'&&!filled.length?'활동지 질문을 하나 넘게 써 주세요.':'';
 async function submit(event:FormEvent){
  event.preventDefault();if(lock.current)return;
  if(problem){setError(problem);return;}
  lock.current=true;setBusy(true);setError('');
  try{
   onCreated(await missionCreate({title:title.trim(),description:description.trim(),criteria:criteria.trim(),kind,storyKey:(storyKey||null) as BuiltinWorkId|null,readingFormat:format,
    questions:filled.map((prompt,index)=>({id:`q${index+1}`,prompt}))},csrf));
  }catch(issue){setError(text(issue,'미션을 배정하지 못했어요. 쓴 내용은 그대로 있어요.'));}
  finally{lock.current=false;setBusy(false);}
 }
 return <form className={styles.editor} aria-label={origin==='provided'?'가져온 미션 고치기':'미션 직접 만들기'} onSubmit={event=>void submit(event)}><fieldset disabled={busy}>
  <legend>{origin==='provided'?'가져온 미션 고치기':'미션 직접 만들기'}</legend>
  {origin==='provided'&&<p className={shared.hint}>놀스토리 제공 미션을 복사했어요. 우리 반에 맞게 고쳐서 배정해 주세요.</p>}
  <div className={styles.kinds} role="group" aria-label="미션 종류">{KINDS.map(item=><button type="button" key={item.kind} className={styles.kindChoice} aria-pressed={kind===item.kind} onClick={()=>setKind(item.kind)}><strong>{item.label}</strong><small>{item.hint}</small></button>)}</div>
  <label className={shared.field}>미션 제목<input name="mission-title" value={title} maxLength={MISSION_LIMITS.title} onChange={event=>setTitle(event.target.value)}/></label>
  <div className={shared.row}>
   <label className={shared.field}>읽을 작품{kind==='reading'?'':' (선택)'}<select aria-label="읽을 작품" value={storyKey} onChange={event=>setStoryKey(event.target.value)}><option value="">정하지 않아요</option>{BUILTIN_WORKS.map(work=><option key={work.id} value={work.id}>{work.title}</option>)}</select></label>
   {storyKey&&<label className={shared.field}>읽을 판본<select aria-label="읽을 판본" value={format} onChange={event=>setFormat(event.target.value as ReadingFormat)}>{(['original','knolstory','shortstory'] as const).map(value=><option key={value} value={value}>{readingFormatLabel(value)}{value==='original'?' · 옛이야기 그대로':value==='knolstory'?' · 선택지가 있는 이야기':' · 짧은 그림책'}</option>)}</select></label>}
  </div>
  <label className={shared.field}>학생에게 보일 안내<textarea value={description} maxLength={MISSION_LIMITS.text} onChange={event=>setDescription(event.target.value)} placeholder="무엇을 하면 되는지 알려 주세요."/></label>
  <label className={shared.field}>통과 기준<textarea value={criteria} maxLength={MISSION_LIMITS.text} onChange={event=>setCriteria(event.target.value)} placeholder="어떻게 하면 통과인지 알려 주세요."/></label>
  <div className={styles.questions} role="group" aria-label="활동지 질문">
   <div className={styles.questionsHead}><strong>활동지 질문 <small>{kind==='worksheet'?'하나 넘게 필요해요':'없어도 돼요'}</small></strong><span>{questions.length} / {MISSION_LIMITS.questions}</span></div>
   {questions.map((prompt,index)=><div className={styles.questionRow} key={index}>
    <span aria-hidden="true">{index+1}</span>
    <textarea aria-label={`${index+1}번 질문`} rows={2} value={prompt} maxLength={MISSION_LIMITS.prompt} onChange={event=>setQuestions(current=>current.map((value,at)=>at===index?event.target.value:value))}/>
    <button type="button" className={`${shared.btn} ${shared.danger}`} aria-label={`${index+1}번 질문 지우기`} onClick={()=>setQuestions(current=>current.filter((_,at)=>at!==index))}>지우기</button>
   </div>)}
   {questions.length<MISSION_LIMITS.questions&&<button type="button" className={shared.btn} onClick={()=>setQuestions(current=>[...current,''])}>+ 질문 추가</button>}
  </div>
  {error&&<p className={shared.error} role="alert">{error}</p>}
  <div className={styles.editorActions}><button className={`${shared.btn} ${shared.primary}`}>{busy?'배정하는 중…':'미션 배정하기'}</button><button type="button" className={shared.btn} onClick={onCancel}>취소</button>
   <span className={shared.hint}>배정한 뒤에는 질문을 바꿀 수 없어요. 마감은 언제든 할 수 있어요.</span></div>
 </fieldset></form>;
}

function MissionRow({mission,csrf,onChanged}:{mission:Mission;csrf:string;onChanged:(mission:Mission)=>void}){
 const [rows,setRows]=useState<MissionStudentProgress[]|null>(null),[open,setOpen]=useState(false),[loading,setLoading]=useState(false),[error,setError]=useState(''),[toggling,setToggling]=useState(false);
 const load=useCallback(async()=>{
  setLoading(true);setError('');
  try{setRows(await missionProgress(mission.id));return true;}
  catch(issue){setError(text(issue,'학생 답변을 불러오지 못했어요.'));return false;}
  finally{setLoading(false);}
 },[mission.id]);
 async function toggleRoster(){if(open){setOpen(false);return;}setOpen(true);await load();}
 async function toggleOpen(){
  if(toggling)return;setToggling(true);setError('');
  try{onChanged(await missionSetOpen(mission.id,!mission.open,csrf));}catch(issue){setError(text(issue,'미션 상태를 바꾸지 못했어요.'));}
  finally{setToggling(false);}
 }
 const count=(status:Status)=>rows?.filter(row=>statusOf(row)===status).length??0;
 const work=workTitle(mission.storyKey);
 return <>
  <div className={shared.taskHeading}><div><span className={styles.kind} data-kind={mission.kind}>{missionKindLabel(mission.kind)}</span><h3>{mission.title}</h3></div><span className={mission.open?shared.badge:`${shared.badge} ${shared.off}`}>{mission.open?'열림':'마감'}</span></div>
  <p className={styles.meta}>{[work&&`${work} · ${readingFormatLabel(mission.readingFormat)}`,mission.questions.length?`질문 ${mission.questions.length}개`:mission.kind==='custom'?'온라인 답변 없이 확인':'읽고 확인 요청'].filter(Boolean).join('  ·  ')}</p>
  <div className={shared.taskActions}>
   <button className={`${shared.btn} ${shared.primary}`} aria-expanded={open} aria-label={`${mission.title} 학생 확인`} onClick={()=>void toggleRoster()}>{open?'학생 목록 접기':'학생 확인하기'}</button>
   <button className={shared.btn} disabled={toggling} aria-label={`${mission.title} ${mission.open?'마감':'다시 열기'}`} onClick={()=>void toggleOpen()}>{mission.open?'미션 마감':'다시 열기'}</button>
  </div>
  {error&&<p className={shared.error} role="alert">{error}</p>}
  {open&&<div className={styles.roster}>
   {rows===null?(loading&&<p className={shared.hint} role="status">학생 답변을 불러오고 있어요.</p>):<>
    <div className={styles.summary}><span data-status="pending">확인 대기 <b>{count('pending')}</b></span><span data-status="passed">통과 <b>{count('passed')}</b></span><span data-status="revise">다시 쓰기 <b>{count('revise')}</b></span><span data-status="none">아직 <b>{count('none')}</b></span>
     <button className={shared.btn} disabled={loading} onClick={()=>void load()}>{loading?'불러오는 중…':'새로 고침'}</button></div>
    {rows.length===0?<p className={shared.hint}>학급에 학생이 없어요. 학생 탭에서 먼저 학생을 만들어 주세요.</p>
     :<ul className={styles.students}>{rows.map(row=><li key={row.number}><StudentReview mission={mission} row={row} csrf={csrf} onSaved={next=>setRows(current=>current?.map(item=>item.number===next.number?next:item)??null)} onStale={load}/></li>)}</ul>}
   </>}
  </div>}
 </>;
}

function StudentReview({mission,row,csrf,onSaved,onStale}:{mission:Mission;row:MissionStudentProgress;csrf:string;onSaved:(row:MissionStudentProgress)=>void;onStale:()=>Promise<boolean>}){
 // A decision's words stay editable; once the student answers again they become 지난 피드백 and the box starts empty.
 const [feedback,setFeedback]=useState(row.reviewStatus?row.feedback:''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const lock=useRef(false);
 const status=statusOf(row),who=`${row.number}번${row.name?` ${row.name}`:''}`;
 async function decide(reviewStatus:'passed'|'revise'|null){
  if(lock.current)return;
  if(reviewStatus==='revise'&&!feedback.trim()){setError('다시 쓸 점을 학생에게 남길 말에 적어 주세요.');return;}
  lock.current=true;setBusy(true);setError('');setNotice('');
  try{
   const saved=await missionReview(mission.id,row.number,{reviewStatus,feedback:reviewStatus===null?'':feedback.trim(),expectedSubmittedAt:row.submittedAt},csrf);
   onSaved(saved);if(reviewStatus===null)setFeedback('');
   setNotice(reviewStatus==='passed'?`${who} 학생을 통과시켰어요.`:reviewStatus==='revise'?`${who} 학생에게 다시 쓰기를 요청했어요.`:'확인 상태를 지웠어요.');
  }catch(issue){
   if(issue instanceof MissionError&&issue.code==='MISSION_SUBMISSION_CHANGED'){await onStale();setFeedback('');setError('이 학생이 방금 답변을 다시 냈어요. 새 답변을 읽고 다시 확인해 주세요.');}
   else setError(text(issue,'확인을 저장하지 못했어요.'));
  }finally{lock.current=false;setBusy(false);}
 }
 return <details className={styles.student} data-status={status}>
  <summary><span className={styles.who}>{who}</span><span className={styles.state} data-status={status}>{STATUS_LABEL[status]}</span><span className={styles.when}>{row.submittedAt?formatSubmittedAt(row.submittedAt):''}</span></summary>
  <div className={styles.review}>
   {row.submittedAt?<>
    {mission.questions.map((question,index)=><div className={styles.answer} key={question.id}><p className={styles.prompt}>{index+1}. {question.prompt}</p><p className={styles.reply}>{row.answers[question.id]||'(답변 없음)'}</p></div>)}
    {row.note&&<div className={styles.answer}><p className={styles.prompt}>{mission.questions.length?'선생님께 남긴 말':'읽고 남긴 말'}</p><p className={styles.reply}>{row.note}</p></div>}
    {!mission.questions.length&&!row.note&&<p className={shared.hint}>남긴 말 없이 확인을 요청했어요.</p>}
   </>:<p className={shared.hint}>온라인으로 낸 답변이 없어요. 종이 활동지나 교실 활동을 직접 확인했다면 바로 통과시킬 수 있어요.</p>}
   {!row.reviewStatus&&row.feedback&&<div className={styles.answer}><p className={styles.prompt}>지난 피드백</p><p className={styles.reply}>{row.feedback}</p></div>}
   <label className={shared.field}>학생에게 남길 말 <textarea aria-label={`${who} 학생에게 남길 말`} rows={2} value={feedback} maxLength={MISSION_LIMITS.text} disabled={busy} onChange={event=>setFeedback(event.target.value)} placeholder="잘한 점이나 다시 쓸 점을 적어 주세요."/></label>
   <div className={styles.decide}>
    <button className={`${shared.btn} ${shared.primary}`} disabled={busy} aria-label={`${who} 통과`} onClick={()=>void decide('passed')}>{row.submittedAt?'통과':'직접 확인하고 통과'}</button>
    <button className={shared.btn} disabled={busy} aria-label={`${who} 다시 쓰기`} onClick={()=>void decide('revise')}>다시 쓰기</button>
    {row.reviewStatus&&<button className={`${shared.btn} ${shared.danger}`} disabled={busy} aria-label={`${who} 확인 상태 지우기`} onClick={()=>void decide(null)}>확인 상태 지우기</button>}
   </div>
   {error&&<p className={shared.error} role="alert">{error}</p>}{notice&&<p className={shared.notice} role="status">{notice}</p>}
  </div>
 </details>;
}
