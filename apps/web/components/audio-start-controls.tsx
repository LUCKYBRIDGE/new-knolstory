'use client';
import {useState} from 'react';
import {cutLabel,type StoryProject} from '@knolstory/story-domain';
import {orderedLines,moveStoryAudioStart,undoStoryAudioStart,canUndoStoryAudioStart,type AudioStartUndo} from '@knolstory/runtime-core';
import styles from './effect-start-controls.module.css';
type Props={selectedChannel?:'music'|'ambience';project:StoryProject;lineId:string;onChange:(project:StoryProject)=>void;onMoved:()=>void};
export function AudioStartControls({project,lineId,onChange,onMoved,selectedChannel}:Props){
 const [internalChannel,setChannel]=useState<'music'|'ambience'>('music'),[target,setTarget]=useState(''),[undo,setUndo]=useState<AudioStartUndo|null>(null),[message,setMessage]=useState('');
 const channel=selectedChannel??internalChannel;
 const line=project.lines.find(item=>item.id===lineId)!,play=line.audio?.[channel]?.action==='play';
 if(!play&&!undo&&!message)return null;
 return <div className={styles.start}><details hidden={!play}><summary>연속 소리 시작 컷 옮기기</summary><p>재생 지시 하나만 새 컷으로 옮깁니다. 종료 컷·음량·반복·페이드는 유지됩니다. 원본 컷은 앞 컷/장의 소리를 이어받습니다. 중간에 다른 소리 지시가 있으면 그 지시가 우선합니다.</p>
  {!selectedChannel&&<label>옮길 소리<select aria-label="시작 컷을 옮길 소리" value={channel} onChange={event=>setChannel(event.target.value as typeof channel)}><option value="music">배경음</option><option value="ambience">주변 소리</option></select></label>}{!play&&<p>이 컷에 선택한 소리의 재생 지시가 없습니다.</p>}
  <label>새 시작 컷<select aria-label="소리 새 시작 컷" value={target} onChange={event=>setTarget(event.target.value)}><option value="">이동할 컷 선택</option>{orderedLines(project).filter(item=>item.id!==lineId).map(item=><option key={item.id} value={item.id}>{cutLabel(project.chapters.find(ch=>ch.id===item.chapterId)!,item)} · {item.text.slice(0,36)||'빈 글'}</option>)}</select></label><p>도착 컷의 기존 같은 소리 지시는 덮어쓰지 않습니다. 종료 컷을 우회하는 갈래에서는 계속 유지됩니다.</p>
  <button type="button" disabled={!target||!play} onClick={()=>{try{const result=moveStoryAudioStart(project,lineId,target,channel);onChange(result.project);setUndo(result.undo);setTarget('');onMoved();setMessage('소리 재생 시작 컷을 옮겼어요.');}catch(issue){setMessage(String(issue));}}}>선택한 컷으로 소리 옮기기</button>
 </details>{undo&&<button type="button" disabled={!canUndoStoryAudioStart(project,undo)} onClick={()=>{try{onChange(undoStoryAudioStart(project,undo));setUndo(null);setMessage('소리 시작 컷 이동을 되돌렸어요. 이후 글과 다른 소리는 유지됩니다.');}catch(issue){setMessage(String(issue));}}}>{undo.channel==='music'?'배경음':'주변 소리'} 시작 컷 이동 되돌리기</button>}{message&&<p role="status">{message}</p>}</div>;
}
