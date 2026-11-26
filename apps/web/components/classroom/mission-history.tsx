"use client";
import {useEffect,useRef,useState} from 'react';
import type {Mission,MissionHistoryEntry} from '../../lib/mission-api';
import styles from './missions-panel.module.css';
import shared from './classroom.module.css';

const LABEL:Record<MissionHistoryEntry['event'],string>={submitted:'낸 활동지',revise:'다시 쓰기 요청',passed:'통과',cleared:'확인 상태 지움'};
const when=(at:number)=>new Intl.DateTimeFormat('ko-KR',{month:'long',day:'numeric',hour:'numeric',minute:'2-digit'}).format(at);

/**
 * 지난 기록: every sheet the student handed in and every decision the teacher made, oldest first (kept online).
 * Loaded only when opened, so the class list stays light. `version` changes with every new hand-in
 * or decision: an open list then loads again, a closed one loads afresh when next opened.
 */
export function MissionHistory({mission,load,label,version}:Readonly<{mission:Pick<Mission,'questions'>;load:()=>Promise<MissionHistoryEntry[]>;label:string;version:string}>){
 const [entries,setEntries]=useState<MissionHistoryEntry[]|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const panel=useRef<HTMLDetailsElement>(null),loaded=useRef(version);
 async function fetchEntries(){
  setBusy(true);setError('');
  try{setEntries(await load());}catch{setError('지난 기록을 불러오지 못했어요. 잠시 뒤 다시 열어 주세요.');}finally{setBusy(false);}
 }
 useEffect(()=>{
  if(loaded.current===version)return;loaded.current=version;setEntries(null);
  if(panel.current?.open)void fetchEntries();
 // eslint-disable-next-line react-hooks/exhaustive-deps -- reload only when a new hand-in or decision arrives, not on every render's fresh `load`.
 },[version]);
 function open(){if(!entries&&!busy)void fetchEntries();}
 return <details ref={panel} className={styles.history} onToggle={event=>{if(event.currentTarget.open)open();}}>
  <summary aria-label={label}>지난 기록</summary>
  {busy&&<p className={shared.hint} role="status">지난 기록을 불러오고 있어요.</p>}
  {error&&<p className={shared.error} role="alert">{error}</p>}
  {entries&&(entries.length===0?<p className={shared.hint}>아직 남은 기록이 없어요.</p>:<ol className={styles.historyList}>{entries.map((entry,index)=><li key={`${entry.at}-${index}`} data-event={entry.event}>
   <p className={styles.historyHead}><strong>{LABEL[entry.event]}</strong><span>{when(entry.at)}</span></p>
   {entry.event==='submitted'?<>
    {mission.questions.map((question,number)=>entry.answers?.[question.id]?<div className={styles.answer} key={question.id}><p className={styles.prompt}>{number+1}. {question.prompt}</p><p className={styles.reply}>{entry.answers[question.id]}</p></div>:null)}
    {entry.note&&<div className={styles.answer}><p className={styles.prompt}>선생님께 남긴 말</p><p className={styles.reply}>{entry.note}</p></div>}
   </>:entry.feedback&&<p className={styles.reply}>{entry.feedback}</p>}
  </li>)}</ol>)}
 </details>;
}
