'use client';
import {useState} from 'react';
import {cutLabel,type StoryProject} from '@knolstory/story-domain';
import {orderedLines,moveStoryEffectStart,undoStoryEffectStart,canUndoStoryEffectStart,type EffectStartUndo} from '@knolstory/runtime-core';
import styles from './effect-start-controls.module.css';
type Props={project:StoryProject;lineId:string;onChange:(project:StoryProject)=>void;onMoved?:()=>void};
export function EffectStartControls({project,lineId,onChange,onMoved}:Props){
 const [index,setIndex]=useState(0);
 const effects=project.lines.find(line=>line.id===lineId)?.presentation?.effects??[];
 const selectedIndex=Math.min(index,Math.max(0,effects.length-1));
 const [target,setTarget]=useState(''),[undo,setUndo]=useState<EffectStartUndo|null>(null),[message,setMessage]=useState('');
 if(!effects.length&&!undo&&!message)return null;
 return <div className={styles.start}><details hidden={!effects.length}><summary>효과 시작 컷 옮기기</summary><label>옮길 효과<select aria-label="시작 컷을 옮길 효과" value={selectedIndex} disabled={!effects.length} onChange={event=>setIndex(Number(event.target.value))}>{effects.length?effects.map((_,i)=><option key={i} value={i}>{i+1}번째 효과</option>):<option value={0}>이 컷에 효과 없음</option>}</select></label><p>선택한 효과만 현재 컷에서 제거해 새 컷의 마지막 효과로 옮깁니다. 원고·소리·다른 효과는 유지합니다. 대기 시간은 새 컷 시작을 기준으로 합니다.</p>
  <label>새 시작 컷<select aria-label={`효과 새 시작 컷`} value={target} onChange={event=>setTarget(event.target.value)}><option value="">이동할 컷 선택</option>{orderedLines(project).filter(line=>line.id!==lineId).map(line=><option key={line.id} value={line.id}>{cutLabel(project.chapters.find(ch=>ch.id===line.chapterId)!,line)} · {line.text.slice(0,36)||'빈 글'}</option>)}</select></label><p>종료 컷 지정은 그대로 유지됩니다. 읽는 갈래가 종료 컷을 지나지 않으면 계속 이어집니다.</p>
  <button type="button" disabled={!target||!effects.length} onClick={()=>{try{const result=moveStoryEffectStart(project,lineId,selectedIndex,target);onChange(result.project);setUndo(result.undo);setTarget('');setMessage('효과 시작 컷을 옮겼어요. 원본 컷의 글은 유지됩니다.');onMoved?.();}catch(issue){setMessage(String(issue));}}}>선택한 컷으로 효과 옮기기</button>
 </details>{undo&&<button type="button" disabled={!canUndoStoryEffectStart(project,undo)} onClick={()=>{try{onChange(undoStoryEffectStart(project,undo));setUndo(null);setMessage('시작 컷 이동을 되돌렸어요. 이후 고친 글은 유지됩니다.');}catch(issue){setMessage(String(issue));}}}>효과 시작 컷 이동 되돌리기</button>}{message&&<p role="status">{message}</p>}</div>;
}
