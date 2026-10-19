"use client";
import {useState} from 'react';
import {audioAssetChoice} from '../lib/audio-asset-choice';
import {restoreAudioPart,type AudioPart} from '../lib/audio-part-undo';
import type { StoryAudio, StoryMusicCue, StoryProject } from '@knolstory/story-domain';
import { AudioPickerField } from './audio-picker-field';
import styles from './audio-controls.module.css';
import {SoundBatchControls} from './sound-batch-controls';
import {AudioStartControls} from './audio-start-controls';
import {StoryBranchConditionField} from './story-branch-condition-field';
import {CutRangeEnd} from './cut-range-end';
import {SoundCueList} from './sound-cue-list';
import {SecondsInput} from './seconds-input';
type Props={onPreviewFromBranch?:(sourceLineId:string)=>void;editingActive?:boolean;onProjectChange?:(project:StoryProject)=>void;project?:StoryProject;chapterId?:string;lineId?:string;value?:StoryAudio;onChange:(value:StoryAudio|undefined)=>void;scope:'chapter'|'cut';workId?:string};
const actionLabel=(cue:StoryMusicCue|undefined)=>cue?.action==='play'?'재생':cue?.action==='stop'?'정지':cue?.action==='maintain'?'유지':'이어받기';
const volumeValue=(value:number|undefined)=>Math.round((value??1)*100);
export function StoryAudioControls({value,onChange:commit,scope,workId,project,chapterId,lineId,onProjectChange,editingActive=true,onPreviewFromBranch}:Props) {
  const scopeKey=`${workId??''}/${scope}/${lineId??chapterId??''}`;
  const [kind,setKind]=useState<AudioPart>(()=>value?.music?'music':value?.ambience?'ambience':value?.sounds?.length?'sounds':'music');
  const [undo,setUndo]=useState<Partial<Record<AudioPart,{scopeKey:string;value:StoryAudio|undefined}>>>({});
  const onChange=(next:StoryAudio|undefined,part:AudioPart=kind)=>{setUndo(current=>({...current,[part]:{scopeKey,value}}));commit(next);};
  const names={music:'배경음',ambience:'주변 소리',sounds:'효과음'};
  const currentUndo=undo[kind];
  const audio=value??{}; const cue=audio.music;
  const prefix=scope==='chapter'?'장':'컷';
  const setMusic=(music:StoryMusicCue|undefined)=>onChange({...audio,music},'music');
  const changeMusic=(patch:Partial<Extract<StoryMusicCue,{action:'play'}>>)=>{if(cue?.action==='play')setMusic({...cue,...patch});};
  return <fieldset className={styles.controls} aria-label={`${prefix} 소리 설정`}>
    <label>조정할 소리<select aria-label="조정할 소리" value={kind} onChange={event=>setKind(event.target.value as AudioPart)}><option value="music">배경음 · {actionLabel(audio.music)}</option><option value="ambience">주변 소리 · {actionLabel(audio.ambience)}</option><option value="sounds">효과음 · {audio.sounds?.length??0}개</option></select></label>
    <div hidden={kind==='sounds'}>
    {scope==='cut'&&project&&lineId&&onProjectChange&&<AudioStartControls key={`${project.id}/${lineId}`} project={project} lineId={lineId} selectedChannel={kind==='ambience'?'ambience':'music'} onChange={onProjectChange} onMoved={()=>setUndo(current=>({...current,[kind]:undefined}))}/>}
    </div><section hidden={kind!=='music'} aria-label="배경음 편집"><p className={styles.hint}>{scope==='chapter'?'이 장에 들어올 때 배경음을 적용합니다.':'배경음은 컷 사이에 이어집니다. 이어받기는 장·앞 컷의 소리를 사용하고, 유지는 지금 재생 중인 소리를 바꾸지 않습니다.'}</p>
    <label>배경음 동작<select aria-label={`${prefix} 배경음 동작`} value={cue?.action??'default'} onChange={event=>setMusic(event.target.value==='default'?undefined:event.target.value==='play'?{action:'play',assetId:'audio:music:forest',volume:.7,loop:true}:event.target.value==='stop'?{action:'stop',fadeOutMs:300}:{action:'maintain'})}><option value="default">{scope==='chapter'?'장 진입 시 변경하지 않음':'앞 컷 / 장 배경음 이어받기'}</option><option value="maintain">현재 배경음 유지</option><option value="play">배경음 재생 / 변경</option><option value="stop">배경음 정지</option></select></label>
    {cue?.action==='play'&&<>
      <StoryBranchConditionField project={project} value={cue.branchCondition} label={`${prefix} 배경음 갈래 조건`} onChange={branchCondition=>changeMusic({branchCondition})} onPreviewFromBranch={onPreviewFromBranch}/>
      {<CutRangeEnd project={project} lineId={lineId} chapterId={scope==='chapter'?chapterId:undefined} value={cue.endLineId} label={scope==='chapter'?'장 배경음 종료 컷':'배경음 종료 컷'} onChange={endLineId=>changeMusic({endLineId})}/>}
      <AudioPickerField interactive={editingActive} active={kind==='music'} workId={workId} label={`${prefix} 배경음`} kind="music" purpose="background" value={cue.assetId} onChange={assetId=>changeMusic(audioAssetChoice(cue.assetId,assetId))}/>
      <label>배경음 음량 {volumeValue(cue.volume)}%<input aria-label={`${prefix} 배경음 음량`} type="range" min="0" max="100" value={volumeValue(cue.volume)} onChange={event=>changeMusic({volume:Number(event.target.value)/100})}/></label>
      <label className={styles.checkbox}><span>반복 재생</span><input aria-label={`${prefix} 배경음 반복`} type="checkbox" checked={cue.loop??true} onChange={event=>changeMusic({loop:event.target.checked})}/></label>
      <div className={styles.row}><SecondsInput label={`${prefix} 배경음 서서히 크게 시작`} valueMs={cue.fadeInMs??0} onChange={milliseconds=>changeMusic({fadeInMs:milliseconds})}/><SecondsInput label={`${prefix} 배경음 기존 소리 사라짐`} valueMs={cue.fadeOutMs??0} onChange={milliseconds=>changeMusic({fadeOutMs:milliseconds})}/></div>
    </>}
    {cue?.action==='stop'&&<SecondsInput label={`${prefix} 배경음 서서히 작게 멈춤`} valueMs={cue.fadeOutMs??0} onChange={milliseconds=>setMusic({...cue,fadeOutMs:milliseconds})}/>}
    </section><section hidden={kind!=='ambience'} aria-label="주변 소리 편집"><ContinuousAmbience onPreviewFromBranch={onPreviewFromBranch} editingActive={editingActive} active={kind==='ambience'} project={project} chapterId={chapterId} lineId={lineId} workId={workId} value={audio.ambience} scope={scope} onChange={ambience=>onChange({...audio,ambience},'ambience')}/></section>
    <section hidden={kind!=='sounds'} aria-label="효과음 편집">
    {scope==='cut'&&project&&lineId&&onProjectChange&&<SoundBatchControls key={`batch/${project.id}/${lineId}`} project={project} lineId={lineId} onChange={onProjectChange} onApplied={()=>setUndo(current=>({...current,sounds:undefined}))}/>}
    <SoundCueList project={project} onPreviewFromBranch={onPreviewFromBranch} sounds={audio.sounds??[]} scope={scope} workId={workId} active={kind==='sounds'} editingActive={editingActive} onChange={sounds=>onChange({...audio,sounds},'sounds')}/>
    </section>
    {currentUndo?.scopeKey===scopeKey&&<button type="button" onClick={()=>{commit(restoreAudioPart(value,currentUndo.value,kind));setUndo(current=>({...current,[kind]:undefined}));}}>{names[kind]} 변경 취소</button>}
  </fieldset>;
}

function ContinuousAmbience({value,onChange,scope,workId,project,chapterId,lineId,active,editingActive=true,onPreviewFromBranch}:{onPreviewFromBranch?:(sourceLineId:string)=>void;editingActive?:boolean;active?:boolean;project?:StoryProject;chapterId?:string;lineId?:string;value?:StoryMusicCue;onChange:(cue:StoryMusicCue|undefined)=>void;scope:'chapter'|'cut';workId?:string}) {
 const prefix=scope==='chapter'?'장':'컷';
 const change=(patch:Partial<Extract<StoryMusicCue,{action:'play'}>>)=>{if(value?.action==='play')onChange({...value,...patch});};
 return <fieldset><legend>주변 소리(환경음)</legend>
  <p className={styles.hint}>물·비·바람처럼 이어지는 공간의 소리입니다. 배경음과 함께 재생되며 컷 사이에 이어집니다.</p>
  <label>주변 소리 동작<select aria-label={`${prefix} 주변 소리 동작`} value={value?.action??'default'} onChange={event=>onChange(event.target.value==='default'?undefined:event.target.value==='play'?{action:'play',assetId:'audio:music:ambience-forest',volume:.35,loop:true}:event.target.value==='stop'?{action:'stop',fadeOutMs:500}:{action:'maintain'})}>
   <option value="default">{scope==='chapter'?'장 진입 시 변경하지 않음':'앞 컷 / 장 주변 소리 이어받기'}</option><option value="maintain">현재 주변 소리 유지</option><option value="play">주변 소리 재생 / 변경</option><option value="stop">주변 소리 정지</option>
  </select></label>
  {value?.action==='play'&&<>
   <StoryBranchConditionField project={project} value={value.branchCondition} label={`${prefix} 주변 소리 갈래 조건`} onChange={branchCondition=>change({branchCondition})} onPreviewFromBranch={onPreviewFromBranch}/>
   {<CutRangeEnd project={project} lineId={lineId} chapterId={scope==='chapter'?chapterId:undefined} value={value.endLineId} label={scope==='chapter'?'장 주변 소리 종료 컷':'주변 소리 종료 컷'} onChange={endLineId=>change({endLineId})}/>}
   <AudioPickerField interactive={editingActive} active={active} workId={workId} label={`${prefix} 주변 소리`} kind="music" purpose="ambience" value={value.assetId} onChange={assetId=>change(audioAssetChoice(value.assetId,assetId))}/>
   <label>주변 소리 음량 {volumeValue(value.volume)}%<input aria-label={`${prefix} 주변 소리 음량`} type="range" min="0" max="100" value={volumeValue(value.volume)} onChange={event=>change({volume:Number(event.target.value)/100})}/></label>
   <label className={styles.checkbox}>주변 소리 반복 재생<input aria-label={`${prefix} 주변 소리 반복`} type="checkbox" checked={value.loop??true} onChange={event=>change({loop:event.target.checked})}/></label>
   <SecondsInput label={`${prefix} 주변 소리 서서히 크게 시작`} valueMs={value.fadeInMs??0} onChange={milliseconds=>change({fadeInMs:milliseconds})}/>
   <SecondsInput label={`${prefix} 주변 소리 기존 소리 사라짐`} valueMs={value.fadeOutMs??0} onChange={milliseconds=>change({fadeOutMs:milliseconds})}/>
  </>}
  {value?.action==='stop'&&<SecondsInput label={`${prefix} 주변 소리 서서히 작게 멈춤`} valueMs={value.fadeOutMs??0} onChange={milliseconds=>onChange({...value,fadeOutMs:milliseconds})}/>}
 </fieldset>;
}
