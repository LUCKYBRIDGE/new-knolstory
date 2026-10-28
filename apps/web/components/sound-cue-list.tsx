'use client';
import {useCallback,useState} from 'react';
import {resolveAudioAsset,resolveExcludedAudioAsset} from '@knolstory/asset-registry';
import type {StorySoundCue,StoryProject} from '@knolstory/story-domain';
import {AudioPickerField} from './audio-picker-field';
import {StoryBranchConditionField} from './story-branch-condition-field';
import {AudioSourceRangeControls} from './audio-source-range-controls';
import {SoundSplitControls} from './sound-split-controls';
import {SecondsInput} from './seconds-input';
import styles from './audio-controls.module.css';
type Props={selectionRevision?:number;initialSelectedSoundId?:string;project?:StoryProject;onPreviewFromBranch?:(sourceLineId:string)=>void;sounds:readonly StorySoundCue[];scope:'chapter'|'cut';workId?:string;active:boolean;editingActive:boolean;onChange:(sounds:StorySoundCue[])=>void};
/** Selection is session UI; cue IDs and list order remain authored exactly as supplied. */
export function SoundCueList({selectionRevision,initialSelectedSoundId,sounds,scope,workId,active,editingActive,onChange,project,onPreviewFromBranch}:Props){
 const [choice,setChoice]=useState<{revision:number|undefined;id:string|null}>({revision:selectionRevision,id:initialSelectedSoundId??null});
 const selectedId=choice.revision===selectionRevision?choice.id:initialSelectedSoundId;
 const setSelectedId=(id:string)=>setChoice({revision:selectionRevision,id});
 const [names,setNames]=useState<Readonly<Record<string,string>>>({});
 const selected=sounds.some(sound=>sound.id===selectedId)?selectedId:sounds[0]?.id;
 const rememberName=useCallback((id:string,name:string)=>setNames(current=>current[id]===name?current:{...current,[id]:name}),[]);
 const prefix=scope==='chapter'?'장 ':'';
 const update=(id:string,patch:Partial<StorySoundCue>)=>onChange(sounds.map(sound=>sound.id===id?{...sound,...patch}:sound));
 function add(){if(sounds.length>=4)return;const id=`sound-${crypto.randomUUID()}`;onChange([...sounds,{id,assetId:'audio:sound:chime',volume:1,delayMs:0}]);setSelectedId(id);}
 return <div className={styles.soundList}>
  {!!sounds.length&&<div role="group" aria-label={`${prefix}효과음 목록`} className={styles.soundChoices}>{sounds.map((sound,index)=><button type="button" key={sound.id} aria-pressed={sound.id===selected} onClick={()=>setSelectedId(sound.id)}><strong>{index+1}. {names[sound.assetId]??resolveAudioAsset(sound.assetId)?.name??(resolveExcludedAudioAsset(sound.assetId)?`서비스 제공 제외 · ${resolveExcludedAudioAsset(sound.assetId)!.name}`:sound.assetId.startsWith('audio:custom:')?'등록한 효과음':'찾을 수 없는 효과음')}</strong><small>{scope==='chapter'?'장 진입':'컷 시작'} 후 {(sound.delayMs??0)/1000}초 · 음량 {Math.round((sound.volume??1)*100)}%{(sound.sourceStartMs!==undefined||sound.sourceEndMs!==undefined)&&` · 원본 ${(sound.sourceStartMs??0)/1000}~${sound.sourceEndMs===undefined?'끝':`${sound.sourceEndMs/1000}초`}`}</small></button>)}</div>}
  {!sounds.length&&<p className={styles.hint}>효과음을 추가하고 재생할 소리와 시작 시점을 정하세요.</p>}
  {sounds.map((sound,index)=><div key={sound.id} hidden={sound.id!==selected} className={styles.sound} aria-label={`${prefix}${index+1}번 효과음 조정`}>
   <StoryBranchConditionField project={project} value={sound.branchCondition} label={`${prefix}${index+1}번 효과음 갈래 조건`} onChange={branchCondition=>update(sound.id,{branchCondition})} onPreviewFromBranch={onPreviewFromBranch}/>
   <AudioPickerField onAssetName={rememberName} interactive={editingActive} active={active&&sound.id===selected} workId={workId} label={`${prefix}${index+1}번 효과음`} kind="sound" purpose="effect" value={sound.assetId} sourceStartMs={sound.sourceStartMs} sourceEndMs={sound.sourceEndMs} volume={sound.volume} onChange={assetId=>update(sound.id,{assetId,...(assetId!==sound.assetId?{sourceStartMs:undefined,sourceEndMs:undefined}:{})})}/>
   <AudioSourceRangeControls label={`${prefix}${index+1}번 효과음`} assetId={sound.assetId} value={sound} onChange={patch=>update(sound.id,patch)}/><SoundSplitControls sound={sound} sounds={sounds} label={`${prefix}${index+1}번 효과음`} onSplit={(next,rightId)=>{onChange(next);setSelectedId(rightId);}}/><label>효과음 음량 {Math.round((sound.volume??1)*100)}%<input aria-label={`${prefix}${index+1}번 효과음 음량`} type="range" min="0" max="100" value={Math.round((sound.volume??1)*100)} onChange={event=>update(sound.id,{volume:Number(event.target.value)/100})}/></label>
   <SecondsInput label={`${prefix}${index+1}번 효과음 재생 대기`} valueMs={sound.delayMs??0} onChange={delayMs=>update(sound.id,{delayMs})}/>
   <button type="button" onClick={()=>onChange(sounds.filter(item=>item.id!==sound.id))}>{prefix}효과음 {index+1} 삭제</button>
  </div>)}
  {sounds.length<4?<button type="button" onClick={add}>{prefix}효과음 추가</button>:<p className={styles.hint}>효과음은 최대 4개까지 넣을 수 있어요.</p>}
 </div>;
}
