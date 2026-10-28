'use client';
import {useState} from 'react';
import type {StoryProject,StoryLine,StorySceneVisibility} from '@knolstory/story-domain';
import {updateSceneVisibility,createSceneVisibilityUndo,undoSceneVisibility,type SceneVisibilityUndo} from '../lib/scene-visibility-edit';
import {ScoreConditionEditor} from './story-score-controls';
import {StoryBranchConditionField} from './story-branch-condition-field';
import styles from './story-text-variants.module.css';
type Props={project:StoryProject;line:StoryLine;index:number;disabled:boolean;composing?:boolean;scoresEnabled:boolean;onComposing:(value:boolean)=>void;onChange:(value:StorySceneVisibility|undefined)=>void};
export function StorySceneVisibilityEditor(p:Props){
 const [composing,setComposing]=useState(false),[message,setMessage]=useState(''),[undo,setUndo]=useState<SceneVisibilityUndo|null>(null);
 const busy=p.disabled||composing||p.composing,label=`${p.index+1}컷 표시`;
 function change(patch:Partial<StorySceneVisibility>){if(busy)return;try{const next=updateSceneVisibility(p.line.visibility,patch);setUndo(createSceneVisibilityUndo(p.project.id,p.line.id,p.line.visibility,next));p.onChange(next);setMessage('');}catch(error){setMessage(error instanceof Error?error.message:'컷 표시 조건을 바꾸지 못했어요.');}}
 return <details className={styles.editor} data-scene-visibility><summary>이 컷을 보여 줄 조건{p.line.visibility?' · 설정됨':''}</summary><p>조건에 맞지 않으면 이 컷을 건너뛰고 다음 컷으로 이어져요. 점수와 선택 조건을 함께 정하면 둘 다 맞아야 보여요.</p>
 <fieldset disabled={p.disabled||!!p.composing&&!composing} onClickCapture={event=>{if(composing&&event.target instanceof Element&&event.target.closest('button,select')){event.preventDefault();event.stopPropagation();}}} onKeyDownCapture={event=>{if(composing&&event.target instanceof Element&&event.target.closest('button,select')){event.preventDefault();event.stopPropagation();}}} onCompositionStart={()=>{setComposing(true);p.onComposing(true);}} onCompositionEnd={()=>{setComposing(false);p.onComposing(false);}}>
 <StoryBranchConditionField project={p.project} value={p.line.visibility?.choices} label={`${label} 선택 조건`} onChange={choices=>change({choices})}/>
 {p.scoresEnabled&&<ScoreConditionEditor scores={p.project.scores??[]} condition={p.line.visibility?.scores} label={`${label} 점수 조건`} onChange={scores=>change({scores})}/>}
 {!p.scoresEnabled&&p.line.visibility?.scores&&<p>설정한 점수 조건은 유지돼요. 수정하려면 편집 설정에서 점수 기능을 켜 주세요.</p>}
 </fieldset>
 {undo&&<button type="button" disabled={busy} onClick={()=>{try{p.onChange(undoSceneVisibility(p.project.id,p.line.id,p.line.visibility,undo));setUndo(null);setMessage('컷 표시 조건 변경을 취소했어요.');}catch(error){setMessage(error instanceof Error?error.message:'취소하지 못했어요.');}}}>컷 표시 조건 변경 취소</button>}
 {message&&<p role="status">{message}</p>}</details>;
}
