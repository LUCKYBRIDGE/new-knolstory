'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {chapterLabel,cutLabel,type StoryProject} from '@knolstory/story-domain';
import {jumpPlayback,playbackLog,type PlaybackState} from '@knolstory/runtime-core';
import {loadPlayerSlot,isPlayerSlotChanged,projectPlaybackFingerprint,readPlayerSaves,savePlayerSlot,writePlayerSaves,type PlayerSaves,type PlayerSlot,type PlayerSlotId} from '../lib/player-saves';
import styles from './story-player-menu.module.css';
type Props=Readonly<{project:StoryProject;playback:PlaybackState;onRestore:(state:PlaybackState)=>void;onRestart:()=>void;onExit?:()=>void;onLibrary?:()=>void;disabled?:boolean;onFullscreen?:()=>void;fullscreen?:boolean;onAdvance?:()=>void;advanceDisabled?:boolean;onReducedMotion?:()=>void;reducedMotion?:boolean;motionDisabled?:boolean}>;
const reason=(error:unknown)=>error instanceof Error?error.message:'읽기 저장을 처리하지 못했습니다.';
const date=(value:string)=>new Date(value).toLocaleString('ko-KR');
export function StoryPlayerMenu({project,playback,onRestore,onRestart,onExit,onLibrary,onFullscreen,fullscreen=false,onAdvance,advanceDisabled=false,onReducedMotion,reducedMotion=false,motionDisabled=false,disabled=false}:Props){
 const [panel,setPanel]=useState<'saves'|'log'|null>(null),[saves,setSaves]=useState<PlayerSaves>({version:1,works:{}}),[error,setError]=useState(''),[notice,setNotice]=useState(''),[overwrite,setOverwrite]=useState<number|null>(null),[changedSlot,setChangedSlot]=useState<PlayerSlotId|null>(null);
 const dialog=useRef<HTMLDialogElement>(null);
 const fingerprint=useMemo(()=>projectPlaybackFingerprint(project),[project]);
 const progressKey=JSON.stringify(playback);
 // Read before each write: preserve other works, concurrent saves, and malformed original data.
 useEffect(()=>{
  const timer=window.setTimeout(()=>{
   try{const current=readPlayerSaves(localStorage);const next=savePlayerSlot(current,project,playback,'auto');writePlayerSaves(localStorage,next);setSaves(next);setError('');}
   catch(error){setError(reason(error));}
  },150);
  return ()=>window.clearTimeout(timer);
 },[project.id,fingerprint,progressKey]); // eslint-disable-line react-hooks/exhaustive-deps
 useEffect(()=>{if(panel&&!dialog.current?.open)dialog.current?.showModal();if(!panel&&dialog.current?.open)dialog.current?.close();},[panel]);
 function open(next:'saves'|'log'){
  setOverwrite(null);setChangedSlot(null);setNotice('');
  try{setSaves(readPlayerSaves(localStorage));setError('');}catch(error){setError(reason(error));}
  setPanel(next);
 }
 function save(id:number,confirmed=false){
  try{const current=readPlayerSaves(localStorage);if(current.works[project.id]?.[id]&&!confirmed){setOverwrite(id);return;}
   const next=savePlayerSlot(current,project,playback,id);writePlayerSaves(localStorage,next);setSaves(next);setOverwrite(null);setError('');setNotice(`${id}번에 읽기 위치와 선택 기록을 저장했습니다.`);
  }catch(error){setError(reason(error));}
 }
 function load(id:PlayerSlotId,allowChanged=false){
  try{const slot=readPlayerSaves(localStorage).works[project.id]?.[String(id)];if(!slot)throw Error('빈 저장 위치입니다.');
   if(isPlayerSlotChanged(project,slot)&&!allowChanged){setChangedSlot(id);setError('저장 이후 작품이 변경되었습니다. 이전 내용으로 되돌리지 않고, 현재 작품의 연결이 유효할 때만 이어읽을 수 있습니다.');return;}
   const result=loadPlayerSlot(project,slot,allowChanged);onRestore(result.state);setPanel(null);setChangedSlot(null);setError('');setNotice('읽기 위치와 선택 기록을 불러왔습니다.');
  }catch(error){setError(reason(error));}
 }
 let log:ReturnType<typeof playbackLog>=[];
 try{if(panel==='log')log=playbackLog(project,playback);}catch{/* Error is surfaced when attempting restoration, not a render-time state write. */}
 const slotText=(slot:PlayerSlot)=>{
  if(slot.summary)return `${slot.summary.location} · ${slot.playback.status==='ended'?'이야기 끝 · ':''}${slot.summary.speaker} — ${slot.summary.text}`;
  const line=project.lines.find(item=>item.id===(slot.playback.lineId??slot.playback.path.at(-1))),chapter=project.chapters.find(item=>item.id===line?.chapterId);
  return `${chapter&&line?cutLabel(chapter,line):'장·컷 정보 없음'} · ${slot.playback.status==='ended'?'이야기 끝':line?.workingTitle||''} · ${line?.speakerName||'해설'} — ${line?.text||'빈 글'}`;
 };
 return <div className={styles.menu} aria-label="읽기 메뉴">
  {onAdvance&&<button disabled={disabled||advanceDisabled} onClick={onAdvance}>다음으로</button>}
  <button disabled={disabled} onClick={()=>open('saves')}>읽기 저장</button><button disabled={disabled} onClick={()=>open('saves')}>읽기 불러오기</button><button disabled={disabled} onClick={()=>open('log')}>지난 기록</button><button disabled={disabled} onClick={onRestart}>처음부터 읽기</button>{onReducedMotion&&<button aria-pressed={reducedMotion} disabled={motionDisabled} onClick={onReducedMotion}>동작 줄이기</button>}{onFullscreen&&<button onClick={onFullscreen}>{fullscreen?'전체 화면 해제':'전체 화면'}</button>}{onExit&&<button onClick={onExit}>편집으로</button>}{onLibrary&&<button onClick={onLibrary}>서재로</button>}
  <span className={styles.status} role="status">{notice||(!panel&&error?error:'')}</span>
  <dialog ref={dialog} className={styles.dialog} onCancel={()=>setPanel(null)} onClose={()=>setPanel(null)} aria-labelledby="player-menu-title">
   <div className={styles.header}><h2 id="player-menu-title">{panel==='log'?'지난 기록':'읽기 저장과 불러오기'}</h2><button onClick={()=>setPanel(null)} aria-label="읽기 메뉴 닫기">닫기</button></div>
   {error&&<p role="alert" className={styles.error}>{error}</p>}{notice&&<p role="status">{notice}</p>}
   {panel==='saves'&&<><p>작품 파일 저장과 별개로, 이 기기에 현재 컷과 지금까지 선택한 길을 보관합니다. 음원 재생 초 위치는 저장하지 않습니다.</p>
    {changedSlot!==null&&<div className={styles.confirm}><button onClick={()=>load(changedSlot,true)}>변경된 작품에서 이어읽기</button><button onClick={()=>{setChangedSlot(null);setError('');}}>불러오기 취소</button></div>}
    {overwrite!==null&&<div className={styles.confirm}><p>{overwrite}번의 이전 읽기 저장을 덮어씁니다.</p><button onClick={()=>save(overwrite,true)}>덮어쓰기</button><button onClick={()=>setOverwrite(null)}>저장 취소</button></div>}
    <div className={styles.slots}>{(['auto',1,2,3,4,5,6,7,8,9] as const).map(id=>{const slot=saves.works[project.id]?.[String(id)];return <section key={id} className={styles.slot} aria-label={id==='auto'?'자동 읽기 저장':`${id}번 읽기 저장`}><h3>{id==='auto'?'자동 저장':`${id}번 저장`}</h3>{slot?<><time dateTime={slot.savedAt}>{date(slot.savedAt)}</time><p>{slotText(slot)}</p>{isPlayerSlotChanged(project,slot)&&<p className={styles.changed}>작품 변경됨 · 연결 확인 후 불러오기</p>}</>:<p>빈 저장 위치</p>}<div>{id!=='auto'&&<button onClick={()=>save(id)}>여기에 저장</button>}<button disabled={!slot} onClick={()=>load(id)}>불러오기</button></div></section>;})}</div>
   </>}
   {panel==='log'&&<><p>실제로 읽은 컷과 선택만 표시합니다. 이 지점으로 돌아가면 그 뒤의 읽기 기록을 지우고 다시 선택할 수 있습니다.</p><ol className={styles.log}>{log.map(entry=><li key={entry.pathIndex}><p className={styles.location}>{(()=>{const chapter=project.chapters.find(item=>item.id===entry.chapterId);const line=project.lines.find(item=>item.id===entry.lineId);return chapter&&line?cutLabel(chapter,line):chapter?chapterLabel(chapter):'장 정보 없음';})()}</p><p className={styles.speaker}>{entry.speaker}</p><p className={styles.text}>{entry.text||'빈 글'}</p>{entry.choiceLabel&&<p className={styles.choice}>선택: {entry.choiceLabel}</p>}<button onClick={()=>{try{onRestore(jumpPlayback(project,playback,entry.pathIndex));setPanel(null);}catch(error){setError(reason(error));}}}>이 지점부터 읽기</button></li>)}</ol>{!log.length&&<p>현재 작품의 읽기 경로를 확인할 수 없습니다. 연결을 확인하거나 처음부터 읽어 주세요.</p>}</>}
  </dialog>
 </div>;
}
