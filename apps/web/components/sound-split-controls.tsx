'use client';
import {useState} from 'react';
import {resolveAudioAsset} from '@knolstory/asset-registry';
import type {StorySoundCue} from '@knolstory/story-domain';
import {splitSoundCue} from '../lib/sound-split';
import {millisecondsToSeconds,secondsToMilliseconds} from '../lib/authoring-time';
type Props={sound:StorySoundCue;sounds:readonly StorySoundCue[];label:string;onSplit:(sounds:StorySoundCue[],rightId:string)=>void};
export function SoundSplitControls(props:Props){return <details data-sound-split><summary>효과음 나누기</summary><SplitDraft key={`${props.sound.id}/${props.sound.assetId}/${props.sound.sourceStartMs??''}/${props.sound.sourceEndMs??''}`} {...props}/></details>;}
function SplitDraft({sound,sounds,label,onSplit}:Props){
 const duration=resolveAudioAsset(sound.assetId)?.durationSeconds,durationMs=duration===undefined?undefined:Math.round(duration*1000),start=sound.sourceStartMs??0,end=sound.sourceEndMs??durationMs;
 const [position,setPosition]=useState(millisecondsToSeconds(end===undefined?start:Math.floor((start+end)/2))),[error,setError]=useState('');
 const unavailable=sounds.length>=4?'효과음은 최대 4개예요. 하나를 삭제한 뒤 나눠 주세요.':end===undefined?'원본 사용 끝을 먼저 정한 뒤 나눠 주세요.':end-start<2?'사용 구간이 너무 짧아 나눌 수 없어요.':'';
 function split(){try{const sourceMs=secondsToMilliseconds(position,start+1,(end??start)-1);if(sourceMs===null)throw new Error('나눌 위치는 원본 사용 시작과 끝 사이에서 소수점 셋째 자리까지 입력해 주세요.');const id=`sound-${crypto.randomUUID()}`,next=splitSoundCue(sounds,sound.id,sourceMs,id,durationMs);onSplit(next,id);setError('');}catch(error){setError(error instanceof Error?error.message:'효과음을 나누지 못했어요.');}}
 return <div>{unavailable?<p>{unavailable}</p>:<><label>{label} 나눌 원본 위치 (초)<input type="number" inputMode="decimal" aria-label={`${label} 나눌 원본 위치 (초)`} min={(start+1)/1000} max={(end!-1)/1000} step="0.001" value={position} onChange={event=>{setPosition(event.target.value);setError('');}} onKeyDown={event=>{if(event.key==='Enter'){event.preventDefault();event.currentTarget.blur();}}}/></label><button type="button" onClick={split}>이 위치에서 둘로 나누기</button><small>원본은 그대로 두고 두 조각을 따로 편집해요. 뒤 조각은 앞 조각의 길이만큼 뒤에 시작해요.</small></>}{error&&<p role="alert">{error}</p>}</div>;
}
