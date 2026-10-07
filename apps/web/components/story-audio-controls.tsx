"use client";
import type { StoryAudio, StoryMusicCue, StorySoundCue } from '@knolstory/story-domain';
import { AudioPickerField } from './audio-picker-field';
import styles from './audio-controls.module.css';
type Props={value?:StoryAudio;onChange:(value:StoryAudio)=>void;scope:'chapter'|'cut'};
const volumeValue=(value:number|undefined)=>Math.round((value??1)*100);
export function StoryAudioControls({value,onChange,scope}:Props) {
  const audio=value??{}; const cue=audio.music;
  const prefix=scope==='chapter'?'장':'컷';
  const setMusic=(music:StoryMusicCue|undefined)=>onChange({...audio,music});
  const changeMusic=(patch:Partial<Extract<StoryMusicCue,{action:'play'}>>)=>{if(cue?.action==='play')setMusic({...cue,...patch});};
  const setSound=(id:string,patch:Partial<StorySoundCue>)=>onChange({...audio,sounds:(audio.sounds??[]).map(sound=>sound.id===id?{...sound,...patch}:sound)});
  return <fieldset className={styles.controls}>
    <legend>{prefix} 오디오</legend>
    <p className={styles.hint}>{scope==='chapter'?'이 장에 들어올 때 배경음을 적용하고 효과음을 한 번 재생합니다.':'배경음은 컷 사이에 이어집니다. 효과음은 이 컷에 들어올 때 한 번 재생합니다.'}</p>
    <label>배경음 동작<select aria-label={`${prefix} 배경음 동작`} value={cue?.action??'default'} onChange={event=>setMusic(event.target.value==='default'?undefined:event.target.value==='play'?{action:'play',assetId:'audio:music:forest',volume:.7,loop:true}:event.target.value==='stop'?{action:'stop',fadeOutMs:300}:{action:'maintain'})}><option value="default">{scope==='chapter'?'장 진입 시 변경하지 않음':'앞 컷 / 장 배경음 이어받기'}</option><option value="maintain">현재 배경음 유지</option><option value="play">배경음 재생 / 변경</option><option value="stop">배경음 정지</option></select></label>
    {cue?.action==='play'&&<>
      <AudioPickerField label={`${prefix} 배경음`} kind="music" value={cue.assetId} onChange={assetId=>changeMusic({assetId})}/>
      <label>배경음 음량 {volumeValue(cue.volume)}%<input aria-label={`${prefix} 배경음 음량`} type="range" min="0" max="100" value={volumeValue(cue.volume)} onChange={event=>changeMusic({volume:Number(event.target.value)/100})}/></label>
      <label><span>반복 재생</span><input aria-label={`${prefix} 배경음 반복`} type="checkbox" checked={cue.loop??true} onChange={event=>changeMusic({loop:event.target.checked})}/></label>
      <div className={styles.row}><label>시작 페이드 (ms)<input aria-label={`${prefix} 배경음 시작 페이드`} type="number" min="0" max="10000" step="100" value={cue.fadeInMs??0} onChange={event=>changeMusic({fadeInMs:Number(event.target.value)})}/></label><label>변경 페이드 (ms)<input aria-label={`${prefix} 배경음 변경 페이드`} type="number" min="0" max="10000" step="100" value={cue.fadeOutMs??0} onChange={event=>changeMusic({fadeOutMs:Number(event.target.value)})}/></label></div>
    </>}
    {cue?.action==='stop'&&<label>정지 페이드 (ms)<input aria-label={`${prefix} 배경음 정지 페이드`} type="number" min="0" max="10000" step="100" value={cue.fadeOutMs??0} onChange={event=>setMusic({...cue,fadeOutMs:Number(event.target.value)})}/></label>}
    <ContinuousAmbience value={audio.ambience} scope={scope} onChange={ambience=>onChange({...audio,ambience})}/>
    <>
      {(audio.sounds??[]).map((sound,index)=><div key={sound.id} className={styles.sound}>
        <AudioPickerField label={`${scope==='chapter'?'장 ':''}${index+1}번 효과음`} kind="sound" value={sound.assetId} onChange={assetId=>setSound(sound.id,{assetId})}/>
        <label>효과음 음량 {volumeValue(sound.volume)}%<input aria-label={`${scope==='chapter'?'장 ':''}${index+1}번 효과음 음량`} type="range" min="0" max="100" value={volumeValue(sound.volume)} onChange={event=>setSound(sound.id,{volume:Number(event.target.value)/100})}/></label>
        <label>{scope==='chapter'?'장':'컷'} 진입 후 재생 (ms)<input aria-label={`${scope==='chapter'?'장 ':''}${index+1}번 효과음 지연`} type="number" min="0" max="10000" step="100" value={sound.delayMs??0} onChange={event=>setSound(sound.id,{delayMs:Number(event.target.value)})}/></label>
        <button type="button" onClick={()=>onChange({...audio,sounds:(audio.sounds??[]).filter(item=>item.id!==sound.id)})}>효과음 {index+1} 삭제</button>
      </div>)}
      <button type="button" disabled={(audio.sounds?.length??0)>=4} onClick={()=>onChange({...audio,sounds:[...(audio.sounds??[]),{id:`sound-${crypto.randomUUID()}`,assetId:'audio:sound:chime',volume:1,delayMs:0}]})}>{scope==='chapter'?'장 효과음 추가':'효과음 추가'}</button>
    </>
  </fieldset>;
}

function ContinuousAmbience({value,onChange,scope}:{value?:StoryMusicCue;onChange:(cue:StoryMusicCue|undefined)=>void;scope:'chapter'|'cut'}) {
 const prefix=scope==='chapter'?'장':'컷';
 const change=(patch:Partial<Extract<StoryMusicCue,{action:'play'}>>)=>{if(value?.action==='play')onChange({...value,...patch});};
 return <fieldset><legend>환경음</legend>
  <p className={styles.hint}>물·비·바람처럼 이어지는 공간의 소리입니다. 배경음과 함께 재생되며 컷 사이에 이어집니다.</p>
  <label>환경음 동작<select aria-label={`${prefix} 환경음 동작`} value={value?.action??'default'} onChange={event=>onChange(event.target.value==='default'?undefined:event.target.value==='play'?{action:'play',assetId:'audio:music:ambience-forest',volume:.35,loop:true}:event.target.value==='stop'?{action:'stop',fadeOutMs:500}:{action:'maintain'})}>
   <option value="default">{scope==='chapter'?'장 진입 시 변경하지 않음':'앞 컷 / 장 환경음 이어받기'}</option><option value="maintain">현재 환경음 유지</option><option value="play">환경음 재생 / 변경</option><option value="stop">환경음 정지</option>
  </select></label>
  {value?.action==='play'&&<>
   <AudioPickerField label={`${prefix} 환경음`} kind="music" value={value.assetId} onChange={assetId=>change({assetId})}/>
   <label>환경음 음량 {volumeValue(value.volume)}%<input aria-label={`${prefix} 환경음 음량`} type="range" min="0" max="100" value={volumeValue(value.volume)} onChange={event=>change({volume:Number(event.target.value)/100})}/></label>
   <label>환경음 반복 재생<input aria-label={`${prefix} 환경음 반복`} type="checkbox" checked={value.loop??true} onChange={event=>change({loop:event.target.checked})}/></label>
   <label>시작 페이드 (ms)<input aria-label={`${prefix} 환경음 시작 페이드`} type="number" min="0" max="10000" step="100" value={value.fadeInMs??0} onChange={event=>change({fadeInMs:Number(event.target.value)})}/></label>
   <label>변경 페이드 (ms)<input aria-label={`${prefix} 환경음 변경 페이드`} type="number" min="0" max="10000" step="100" value={value.fadeOutMs??0} onChange={event=>change({fadeOutMs:Number(event.target.value)})}/></label>
  </>}
  {value?.action==='stop'&&<label>정지 페이드 (ms)<input aria-label={`${prefix} 환경음 정지 페이드`} type="number" min="0" max="10000" step="100" value={value.fadeOutMs??0} onChange={event=>onChange({...value,fadeOutMs:Number(event.target.value)})}/></label>}
 </fieldset>;
}
