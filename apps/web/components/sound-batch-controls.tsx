'use client';
import {useState} from 'react';
import {cutLabel,type StoryProject} from '@knolstory/story-domain';
import {orderedLines,applyStorySoundBatch,undoStorySoundBatch,canUndoStorySoundBatch,type SoundBatchUndo} from '@knolstory/runtime-core';
import styles from './sound-batch-controls.module.css';
type Props={project:StoryProject;lineId:string;onChange:(project:StoryProject)=>void;onApplied:()=>void};
export function SoundBatchControls({project,lineId,onChange,onApplied}:Props){
 const [soundIndex,setSoundIndex]=useState(0),[selected,setSelected]=useState<string[]>([]),[undo,setUndo]=useState<SoundBatchUndo|null>(null),[message,setMessage]=useState('');
 const sounds=project.lines.find(line=>line.id===lineId)?.audio?.sounds??[],index=Math.min(soundIndex,Math.max(0,sounds.length-1));
 if(!sounds.length&&!undo&&!message)return null;
 return <div className={styles.batch}><details hidden={!sounds.length}><summary>효과음을 여러 컷에 추가</summary><p>현재 컷의 효과음 하나를 선택한 컷마다 추가합니다. 각 컷에 들어올 때 한 번씩 재생하며, 배경음처럼 이어지는 구간은 아닙니다. 기존 효과음은 유지됩니다.</p><label>가져올 효과음<select aria-label="여러 컷에 넣을 효과음" value={index} disabled={!sounds.length} onChange={event=>setSoundIndex(Number(event.target.value))}>{sounds.length?sounds.map((_,i)=><option key={i} value={i}>{i+1}번 효과음</option>):<option value={0}>현재 컷에 효과음 없음</option>}</select></label>
  <fieldset><legend>적용할 컷 · {selected.length}개</legend><div className={styles.cuts}>{orderedLines(project).filter(line=>line.id!==lineId).map(line=><label key={line.id}><input type="checkbox" aria-label={`${cutLabel(project.chapters.find(ch=>ch.id===line.chapterId)!,line)}에 효과음 추가`} checked={selected.includes(line.id)} onChange={event=>setSelected(current=>event.target.checked?[...current,line.id]:current.filter(id=>id!==line.id))}/><span>{cutLabel(project.chapters.find(ch=>ch.id===line.chapterId)!,line)} · {line.text.slice(0,60)||'빈 글'}</span></label>)}</div></fieldset>
  <button type="button" disabled={!sounds.length||!selected.length||selected.length>200} onClick={()=>{try{const result=applyStorySoundBatch(project,selected,sounds[index],selected.map(()=>`sound-${crypto.randomUUID()}`));onChange(result.project);setUndo(result.undo);onApplied();setMessage(`${selected.length}컷에 효과음을 추가했어요.`);setSelected([]);}catch(issue){setMessage(String(issue));}}}>선택한 컷에 효과음 추가</button><button type="button" disabled={!selected.length} onClick={()=>setSelected([])}>컷 선택 취소</button>
 </details>{undo&&<button type="button" disabled={!canUndoStorySoundBatch(project,undo)} onClick={()=>{try{onChange(undoStorySoundBatch(project,undo));setUndo(null);setMessage('이번에 추가한 효과음만 되돌렸어요. 이후 글과 다른 소리는 유지됩니다.');}catch(issue){setMessage(String(issue));}}}>효과음 여러 컷 추가 되돌리기</button>}{message&&<p role="status">{message}</p>}</div>;
}
