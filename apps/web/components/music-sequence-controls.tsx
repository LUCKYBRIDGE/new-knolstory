'use client';
import {useState} from 'react';
import {resolveAudioAsset} from '@knolstory/asset-registry';
import type {StoryMusicCue,StoryMusicSequence,StoryMusicSequenceClip,StoryProject} from '@knolstory/story-domain';
import {appendMusicSequenceClip,convertMusicToSequence,deleteMusicSequenceClip,moveMusicSequenceClip,splitMusicSequenceClip,updateMusicSequenceClip} from '../lib/music-sequence-edit';
import {secondsToMilliseconds,millisecondsToSeconds} from '../lib/authoring-time';
import {AudioPickerField} from './audio-picker-field';
import {SecondsInput} from './seconds-input';
import {CutRangeEnd} from './cut-range-end';
import {StoryBranchConditionField} from './story-branch-condition-field';
import styles from './music-sequence-controls.module.css';
type Props={value:Extract<StoryMusicCue,{action:'play'|'sequence'}>;onChange:(value:StoryMusicSequence)=>void;label:string;project?:StoryProject;lineId?:string;chapterId?:string;workId?:string;purpose:'background'|'ambience';active:boolean;editingActive:boolean;onPreviewFromBranch?:(id:string)=>void;initialSelectedClipId?:string;selectionRevision?:number};
const newId=()=>`music-${crypto.randomUUID()}`;
export function MusicSequenceControls(props:Props){return props.value.action==='play'?<Conversion {...props} value={props.value}/>:<Sequence key={props.value.id} {...props} value={props.value}/>;}
function Conversion({value,onChange,label}:Props&{value:Extract<StoryMusicCue,{action:'play'}>}){
 const [error,setError]=useState('');
 return <details className={styles.editor}><summary>여러 소리 이어 붙이기</summary><p>소리를 순서대로 한 번씩 재생해요. 반복 재생은 해제되며, 각 소리의 구간을 따로 편집할 수 있어요.</p><button type="button" aria-label={`${label} 여러 소리 편집 시작`} onClick={()=>{try{const duration=resolveAudioAsset(value.assetId)?.durationSeconds;onChange(convertMusicToSequence(value,newId(),newId(),duration===undefined?undefined:Math.round(duration*1000)));setError('');}catch(error){setError(error instanceof Error?error.message:'여러 소리 편집을 열지 못했어요.');}}}>현재 소리로 여러 소리 편집 시작</button>{error&&<p role="alert">{error}</p>}</details>;
}
function Sequence({value,onChange,label,project,lineId,chapterId,workId,purpose,active,editingActive,onPreviewFromBranch,initialSelectedClipId,selectionRevision}:Props&{value:StoryMusicSequence}){
 const [selection,setSelection]=useState<{id:string;revision?:number}>({id:initialSelectedClipId??value.clips[0].id,revision:selectionRevision});
 const requested=selection.revision!==selectionRevision?initialSelectedClipId:selection.id,clip=value.clips.find(item=>item.id===requested)??value.clips[0],index=value.clips.findIndex(item=>item.id===clip.id);
 const [error,setError]=useState('');
 function choose(id:string){setSelection({id,revision:selectionRevision});setError('');}
 function perform(operation:()=>StoryMusicSequence,nextId?:string){try{const next=operation();onChange(next);if(nextId)choose(nextId);setError('');}catch(error){setError(error instanceof Error?error.message:'소리를 변경하지 못했어요.');}}
 function change(patch:Partial<Omit<StoryMusicSequenceClip,'id'>>){perform(()=>updateMusicSequenceClip(value,clip.id,patch));}
 function add(){const id=newId();perform(()=>appendMusicSequenceClip(value,{...clip,id}),id);}
 return <section className={styles.editor} aria-label={`${label} 소리 순서 편집`}>
  <p>위에서 아래 순서로 한 번씩 이어 재생해요.</p>
  <ol className={styles.list} aria-label={`${label} 이어 재생할 소리`}>
   {value.clips.map((item,i)=><li key={item.id}><button type="button" aria-label={`${label} ${i+1}번 소리 선택`} aria-pressed={item.id===clip.id} onClick={()=>choose(item.id)}><span>{i+1}. {resolveAudioAsset(item.assetId)?.name??'보관 소리'}</span><small>{millisecondsToSeconds(item.sourceStartMs??0)}–{millisecondsToSeconds(item.sourceEndMs)}초</small></button></li>)}
  </ol>
  <div className={styles.actions}><button type="button" disabled={value.clips.length>=16} onClick={add} aria-label={`${label} 소리 추가`}>소리 추가</button><small>{value.clips.length}/16개 · 추가하면 선택한 소리의 설정을 복사해요.</small></div>
  <fieldset className={styles.detail}><legend>{index+1}번 소리 편집</legend>
   <div className={styles.actions}><button type="button" aria-label={`${label} 선택한 소리 앞으로`} disabled={index===0} onClick={()=>perform(()=>moveMusicSequenceClip(value,clip.id,-1))}>앞으로</button><button type="button" aria-label={`${label} 선택한 소리 뒤로`} disabled={index===value.clips.length-1} onClick={()=>perform(()=>moveMusicSequenceClip(value,clip.id,1))}>뒤로</button><button type="button" aria-label={`${label} 선택한 소리 삭제`} disabled={value.clips.length===1} onClick={()=>perform(()=>deleteMusicSequenceClip(value,clip.id),value.clips[index-1]?.id??value.clips[index+1]?.id)}>이 소리 삭제</button></div>
   <AudioPickerField key={clip.id} interactive={editingActive} active={active} workId={workId} label={`${label} 선택한 소리`} kind="music" purpose={purpose} value={clip.assetId} sourceStartMs={clip.sourceStartMs} sourceEndMs={clip.sourceEndMs} volume={clip.volume} onChange={assetId=>{const duration=resolveAudioAsset(assetId)?.durationSeconds;if(duration===undefined||!Number.isFinite(duration)||duration<=0){setError('원본 길이를 알 수 없는 소리예요. 사용 끝이 정해진 소리를 선택해 주세요.');return;}change({assetId,sourceStartMs:undefined,sourceEndMs:Math.round(duration*1000)});}}/>
   <details><summary>사용 구간·음량·시작과 끝</summary><div className={styles.fields}>
    <SecondsInput label={`${label} 선택한 소리 원본 사용 시작`} valueMs={clip.sourceStartMs??0} maxMs={clip.sourceEndMs-1} onChange={sourceStartMs=>change({sourceStartMs})}/>
    <SecondsInput label={`${label} 선택한 소리 원본 사용 끝`} valueMs={clip.sourceEndMs} minMs={(clip.sourceStartMs??0)+1} maxMs={Math.min(86400000,Math.round((resolveAudioAsset(clip.assetId)?.durationSeconds??86400)*1000))} onChange={sourceEndMs=>change({sourceEndMs})}/>
    <label>음량 {Math.round((clip.volume??1)*100)}%<input aria-label={`${label} 선택한 소리 음량`} type="range" min="0" max="100" value={Math.round((clip.volume??1)*100)} onChange={event=>change({volume:Number(event.target.value)/100})}/></label>
    <SecondsInput label={`${label} 선택한 소리 서서히 크게 시작`} valueMs={clip.fadeInMs??0} onChange={fadeInMs=>change({fadeInMs})}/><SecondsInput label={`${label} 선택한 소리 서서히 작게 끝남`} valueMs={clip.fadeOutMs??0} onChange={fadeOutMs=>change({fadeOutMs})}/>
   </div></details>
   <details><summary>이 소리 나누기</summary><Split key={`${clip.id}/${clip.sourceStartMs}/${clip.sourceEndMs}`} label={label} clip={clip} full={value.clips.length>=16} onSplit={position=>{const id=newId();perform(()=>splitMusicSequenceClip(value,clip.id,position,id),id);}}/></details>
  </fieldset>
  <details><summary>전체 소리의 조건·종료 컷</summary><StoryBranchConditionField project={project} value={value.branchCondition} label={`${label} 갈래 조건`} onChange={branchCondition=>onChange({...value,branchCondition})} onPreviewFromBranch={onPreviewFromBranch}/><CutRangeEnd project={project} lineId={lineId} chapterId={chapterId} value={value.endLineId} label={`${label} 종료 컷`} onChange={endLineId=>onChange({...value,endLineId})}/></details>
  {error&&<p role="alert">{error}</p>}
 </section>;
}
function Split({label,clip,full,onSplit}:{label:string;clip:StoryMusicSequenceClip;full:boolean;onSplit:(position:number)=>void}){
 const start=clip.sourceStartMs??0,[draft,setDraft]=useState(millisecondsToSeconds(Math.floor((start+clip.sourceEndMs)/2))),[error,setError]=useState('');
 return <div>{full?<p>최대 16개까지 이어 붙일 수 있어요. 하나를 삭제한 뒤 나눠 주세요.</p>:clip.sourceEndMs-start<2?<p>사용 구간이 너무 짧아 나눌 수 없어요.</p>:<><label>나눌 원본 위치 (초)<input aria-label={`${label} 선택한 소리 나눌 원본 위치 (초)`} type="number" inputMode="decimal" min={(start+1)/1000} max={(clip.sourceEndMs-1)/1000} step="0.001" value={draft} onChange={event=>{setDraft(event.target.value);setError('');}}/></label><button type="button" onClick={()=>{const position=secondsToMilliseconds(draft,start+1,clip.sourceEndMs-1);if(position===null){setError('사용 시작과 끝 사이의 시간을 소수점 셋째 자리까지 입력해 주세요.');return;}onSplit(position);}}>이 위치에서 둘로 나누기</button><small>두 조각 사이에는 서서히 커지거나 작아지는 효과를 추가하지 않아요.</small></>}{error&&<p role="alert">{error}</p>}</div>;
}
