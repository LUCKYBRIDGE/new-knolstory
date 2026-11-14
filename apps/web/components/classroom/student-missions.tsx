'use client';
import {useCallback,useEffect,useRef,useState,type FormEvent} from 'react';
import {missionList,missionSubmit,missionReadingHref,missionKindLabel,readingFormatLabel,type Mission,type MissionProgress} from '../../lib/mission-api';
import {BUILTIN_WORKS} from '../../lib/builtin-works';
import {MissionSeal} from './classroom-art';
import shared from './classroom.module.css';
import styles from './student-missions.module.css';

type Props={accountId:string;csrf:string};
type Draft={answers:Record<string,string>;note:string};
const initialDraft=(mission:Mission):Draft=>({answers:{...mission.progress?.answers},note:mission.progress?.note??''});
const message=(issue:unknown,fallback:string)=>issue instanceof Error?issue.message:fallback;
const kindLabel=missionKindLabel;
function statusLabel(progress:MissionProgress|undefined){
 if(progress?.reviewStatus==='passed')return '과제 통과';
 if(progress?.reviewStatus==='revise')return '다시 쓰기';
 return progress?.submittedAt?'확인 대기':'아직 안 했어요';
}

/** Loads this student's missions; the caller keys it by account so one account never sees another's. */
export function useStudentMissions(){
 const [missions,setMissions]=useState<Mission[]|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(false);
 const request=useRef<AbortController|null>(null),generation=useRef(0);
 const load=useCallback(async()=>{
  request.current?.abort();const controller=new AbortController();request.current=controller;const current=++generation.current;
  setLoading(true);setError('');
  try{const result=await missionList((input,init)=>fetch(input,{...init,signal:controller.signal}));if(!controller.signal.aborted&&current===generation.current)setMissions(result);}
  catch(issue){if(!controller.signal.aborted&&current===generation.current)setError(message(issue,'과제를 불러오지 못했어요.'));}
  finally{if(!controller.signal.aborted&&current===generation.current)setLoading(false);}
 },[]);
 useEffect(()=>{const timer=window.setTimeout(()=>void load(),0);return()=>{window.clearTimeout(timer);generation.current++;request.current?.abort();};},[load]);
 const setProgress=useCallback((id:string,progress:MissionProgress)=>setMissions(current=>current?.map(item=>item.id===id?{...item,progress}:item)??null),[]);
 return {missions,error,loading,load,setProgress};
}
export function MissionCard({mission,accountId,csrf,onProgress}:{mission:Mission;accountId:string;csrf:string;onProgress:(value:MissionProgress)=>void}){
 const key=`knolstory-mission-draft:${accountId}:${mission.id}`;
 const [draft,setDraft]=useState<Draft>(()=>initialDraft(mission)),[ready,setReady]=useState(false),[busy,setBusy]=useState(false);
 const [error,setError]=useState(''),[notice,setNotice]=useState(''),[storageError,setStorageError]=useState('');
 const blockedStorage=useRef(false),volatile=useRef(false),request=useRef<AbortController|null>(null),lock=useRef(false);
 const currentSubmittedAt=useRef(mission.progress?.submittedAt??null);
 const baseSubmittedAt=useRef(mission.progress?.submittedAt??null);
 useEffect(()=>{currentSubmittedAt.current=mission.progress?.submittedAt??null;},[mission.progress?.submittedAt]);
 useEffect(()=>{
  const timer=window.setTimeout(()=>{
   try{
    const raw=localStorage.getItem(key);
    if(raw!==null){
     const value=JSON.parse(raw),ids=new Set(mission.questions.map(question=>question.id));
     if(value?.version!==1||typeof value.note!=='string'||value.note.length>2000||!value.answers||typeof value.answers!=='object'||Array.isArray(value.answers)||Object.entries(value.answers).some(([id,answer])=>!ids.has(id)||typeof answer!=='string'||answer.length>2000))throw Error('INVALID_DRAFT');
     setDraft({answers:{...value.answers},note:value.note});
     baseSubmittedAt.current=typeof value.baseSubmittedAt==='number'?value.baseSubmittedAt:null;
     if(baseSubmittedAt.current!==currentSubmittedAt.current)setNotice('다른 곳에서 제출한 내용과 이 기기의 작성본이 달라요. 지금 글을 확인한 뒤 다시 요청해 주세요.');
     else setNotice('이 기기에 쓰던 내용을 이어서 열었어요.');
    }
   }catch{blockedStorage.current=true;setStorageError('이 기기의 기존 작성본을 읽지 못해 원본은 그대로 두었어요. 지금 쓰는 내용은 자동으로 보관하지 못하니 이동 전에 확인을 요청하거나 글을 복사해 주세요.');}
   setReady(true);
  },0);
  const leave=(event:BeforeUnloadEvent)=>{if(volatile.current)event.preventDefault();};window.addEventListener('beforeunload',leave);
  return()=>{window.clearTimeout(timer);request.current?.abort();window.removeEventListener('beforeunload',leave);};
 // Mission questions are immutable after publication; a different mission/account remounts this card.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[key]);
 function change(next:Draft){
  setDraft(next);setNotice('');
  if(blockedStorage.current){volatile.current=true;return;}
  try{localStorage.setItem(key,JSON.stringify({version:1,...next,baseSubmittedAt:baseSubmittedAt.current}));volatile.current=false;setStorageError('');}
  catch{volatile.current=true;setStorageError('이 기기에 글을 임시 보관하지 못했어요. 이동 전에 확인을 요청하거나 글을 복사해 주세요.');}
 }
 async function submit(event:FormEvent){
  event.preventDefault();if(!ready||!mission.open||lock.current)return;
  if(mission.questions.some(question=>!draft.answers[question.id]?.trim())){setError('활동지의 모든 질문에 생각을 적어 주세요.');return;}
  lock.current=true;setBusy(true);setError('');setNotice('');const controller=new AbortController();request.current=controller;
  try{
   const result=await missionSubmit(mission.id,{answers:{...draft.answers},note:draft.note},csrf,(input,init)=>fetch(input,{...init,signal:controller.signal}));
   if(controller.signal.aborted)return;
   baseSubmittedAt.current=result.submittedAt;currentSubmittedAt.current=result.submittedAt;volatile.current=false;
   if(!blockedStorage.current){try{localStorage.removeItem(key);setStorageError('');}catch{setStorageError('확인은 요청했지만 기기의 작성본 정리를 마치지 못했어요. 제출한 내용은 선생님께 전달됐어요.');}}
   onProgress({...draft,submittedAt:result.submittedAt,reviewStatus:null,feedback:mission.progress?.feedback??'',reviewedAt:mission.progress?.reviewedAt??null});setNotice('선생님께 확인을 요청했어요. 선생님이 통과시키면 과제 통과이에요.');
  }catch(issue){if(!controller.signal.aborted)setError(message(issue,'확인을 요청하지 못했어요. 작성한 글은 그대로 있어요.'));}
  finally{lock.current=false;if(!controller.signal.aborted)setBusy(false);}
 }
 const progress=mission.progress,passed=progress?.reviewStatus==='passed',revise=progress?.reviewStatus==='revise';
 const href=missionReadingHref(mission),again=!!progress?.submittedAt,work=BUILTIN_WORKS.find(item=>item.id===mission.storyKey);
 const state=passed?'passed':revise?'revise':progress?.submittedAt?'pending':'none';
 return <article className={styles.card} data-mission={mission.id} data-status={state} data-kind={mission.kind}>
  <div className={styles.titleRow}><div><span className={styles.kind}>{kindLabel(mission.kind)}</span><h3>{mission.title}</h3></div>
   {passed?<span className={styles.success}><MissionSeal earned small/><strong>과제 통과</strong></span>:<span className={`${styles.status} ${revise?styles.revise:progress?.submittedAt?styles.pending:''}`}>{statusLabel(progress)}</span>}</div>
  {mission.description&&<p className={styles.copy}>{mission.description}</p>}
  {mission.criteria&&<details className={styles.criteria}><summary>통과 기준</summary><p className={styles.copy}>{mission.criteria}</p></details>}
  {progress?.feedback&&<div className={styles.feedback}><strong>{progress.reviewStatus===null?'지난 피드백':'선생님 피드백'}</strong><p>{progress.feedback}</p></div>}
  {href&&work&&<p className={styles.read}><a className={`${shared.btn} ${again||passed?'':shared.primary}`} href={href}>{work.title} 읽으러 가기</a><span>{readingFormatLabel(mission.readingFormat)}</span></p>}
  {state==='pending'&&<p className={styles.waiting}>선생님 확인을 기다리고 있어요.</p>}
  {!mission.open&&<p className={shared.hint}>마감된 과제예요. 작성한 내용과 선생님 확인을 볼 수 있어요.</p>}
  <details className={styles.activity} open={mission.open&&(revise||state==='none')||undefined}><summary>{passed||!mission.open?'내가 낸 내용 보기':mission.questions.length?(again?'활동지 고쳐 쓰기':'활동지 작성'):mission.kind==='reading'?'읽고 확인 요청하기':'수행 내용 남기기'}</summary>
   <form onSubmit={event=>void submit(event)}><fieldset disabled={busy||!ready||!mission.open}>
    {mission.questions.map((question,index)=><label className={styles.question} key={question.id}><span>{index+1}. {question.prompt}</span><textarea aria-label={question.prompt} value={draft.answers[question.id]??''} maxLength={2000} rows={4} required onChange={event=>change({...draft,answers:{...draft.answers,[question.id]:event.target.value}})}/></label>)}
    <label className={styles.question}><span>선생님께 남길 말 <small>(선택)</small></span><textarea aria-label="선생님께 남길 말" value={draft.note} maxLength={2000} rows={3} onChange={event=>change({...draft,note:event.target.value})}/></label>
    {mission.open&&<><p className={shared.hint}>{passed?'새로 요청하면 선생님 확인을 다시 받아요.':'수행 여부와 통과는 선생님이 확인해요.'}</p><button className={`${shared.btn} ${shared.primary}`} disabled={busy||!ready} aria-label={`${mission.title} ${again?'다시 확인 요청':'확인 요청'}`}>{busy?'요청 중…':again?'다시 확인 요청':'확인 요청'}</button></>}
   </fieldset></form>
  </details>
  {storageError&&<p className={shared.error} role="alert">{storageError}</p>}
  {error&&<p className={shared.error} role="alert">{error}</p>}
  {notice&&<p className={shared.notice} role="status">{notice}</p>}
 </article>;
}
