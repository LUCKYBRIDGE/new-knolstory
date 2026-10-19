'use client';
import {useEffect,useState} from 'react';
import type {StoryProject} from '@knolstory/story-domain';
import {readStoryCheckpoints,type StoryCheckpoint} from '../lib/story-checkpoints';
import styles from './story-recovery-panel.module.css';

type Props=Readonly<{
 project:StoryProject;disabled?:boolean;restoreDisabled?:boolean;refreshToken?:unknown;
 onCreate:()=>void|Promise<void>;
 onRestore:(checkpoint:StoryCheckpoint)=>void|Promise<void>;
 onExport:(checkpoint:StoryCheckpoint)=>void|Promise<void>;
}>;
const message=(error:unknown)=>error instanceof Error?error.message:String(error);
export function StoryRecoveryPanel({project,disabled=false,restoreDisabled=false,refreshToken,onCreate,onRestore,onExport}:Props){
 const [open,setOpen]=useState(false),[all,setAll]=useState(false);
 const [checkpoints,setCheckpoints]=useState<readonly StoryCheckpoint[]>([]);
 const [error,setError]=useState(''),[busy,setBusy]=useState(false);
 function refresh(){
  try{setCheckpoints(readStoryCheckpoints(window.localStorage));setError('');}
  catch(e){setCheckpoints([]);setError(message(e));}
 }
 useEffect(()=>{
  if(!open)return;
  let active=true;
  queueMicrotask(()=>{if(active)refresh();});
  function changed(){refresh();}
  window.addEventListener('storage',changed);
  return ()=>{active=false;window.removeEventListener('storage',changed);};
 },[open,refreshToken]);
 async function action(callback:()=>void|Promise<void>){
  setBusy(true);setError('');
  try{await callback();refresh();}catch(e){setError(message(e));}finally{setBusy(false);}
 }
 const visible=checkpoints.filter(c=>all||c.projectId===project.id);
 return <details className={styles.panel} onToggle={event=>setOpen(event.currentTarget.open)}>
  <summary>이전 원고</summary>
  {open&&<div className={styles.body}>
   <p>고쳐 쓰기 전 현재 원고를 기록해 두세요. 복구는 원본을 보호한 새 사본으로 열립니다. 이 기기에서 최근 10개·총 2MB까지 보관하며, 오래된 기록부터 정리합니다. 작품 파일도 따로 보관해 주세요.</p>
   <div className={styles.toolbar}>
    <button type="button" disabled={disabled||busy} onClick={()=>void action(onCreate)}>현재 원고 보관</button>
    <label className={styles.checkbox}><input type="checkbox" checked={all} onChange={event=>setAll(event.target.checked)}/>모든 작품의 이전 원고 보기</label>
   </div>
   {error&&<p role="alert" className={styles.error}>{error}</p>}
   {busy&&<p role="status">요청한 원고 작업을 처리하고 있어요.</p>}
   {!error&&visible.length===0&&<p role="status">{all?'아직 보관한 원고가 없어요.':'이 작품에 보관한 이전 원고가 없어요.'}</p>}
   <ul className={styles.list}>{visible.map(checkpoint=><li key={checkpoint.id} className={styles.record}>
    <div className={styles.description}><strong>{checkpoint.project.title}</strong><time dateTime={checkpoint.createdAt}>{new Date(checkpoint.createdAt).toLocaleString('ko-KR')}</time><span>{checkpoint.reason==='before-delete'?'삭제 전 보관':'직접 보관'} · {checkpoint.project.chapters.length}장 · {checkpoint.project.lines.length}컷</span></div>
    <div className={styles.actions}>
     <button type="button" disabled={restoreDisabled||busy} onClick={()=>void action(()=>onRestore(checkpoint))}>이 원고를 사본으로 열기</button>
     <button type="button" disabled={busy} onClick={()=>void action(()=>onExport(checkpoint))}>이전 원고 파일로 저장</button>
    </div>
   </li>)}</ul>
  </div>}
 </details>;
}
