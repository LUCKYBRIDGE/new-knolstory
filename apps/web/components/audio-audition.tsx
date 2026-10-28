'use client';
import {useEffect,useRef,useState} from 'react';
import {audioAuditionBounds,audioAuditionPosition,type AuditionSource} from '../lib/audio-audition';
type Props=AuditionSource&{src:string;label:string;active:boolean;volume?:number};
/** Standalone sample only. Story timing, fades and looping remain in the native stage. */
export function AudioAudition({src,label,active,volume=1,sourceStartMs,sourceEndMs}:Props){
 const preview=useRef<HTMLAudioElement>(null),timer=useRef<number|undefined>(undefined),[error,setError]=useState<{context:string;message:string}|null>(null);
 const context=JSON.stringify([src,sourceStartMs,sourceEndMs]);
 const stopTimer=()=>{if(timer.current!==undefined)window.clearInterval(timer.current);timer.current=undefined;};
 useEffect(()=>{const audio=preview.current;if(!audio)return;audio.pause();if(audio.readyState>=2){const bounds=audioAuditionBounds({sourceStartMs,sourceEndMs},audio.duration);if(bounds)audio.currentTime=bounds.start;}return()=>{audio.pause();stopTimer();};},[src,active,sourceStartMs,sourceEndMs]);
 useEffect(()=>{if(preview.current)preview.current.volume=Math.max(0,Math.min(1,volume));},[volume]);
 function update(audio:HTMLAudioElement,event:'play'|'seek'|'time'){
  if(event==='play'){audio.volume=Math.max(0,Math.min(1,volume));stopTimer();timer.current=window.setInterval(()=>update(audio,'time'),20);document.querySelectorAll('audio').forEach(other=>{if(other!==audio)other.pause();});if(!active){audio.pause();return;}}
  if(audio.readyState<2||audio.seeking)return;
  const bounds=audioAuditionBounds({sourceStartMs,sourceEndMs},audio.duration);
  if(!bounds){audio.pause();setError({context,message:'이 원본에서 사용 구간을 재생할 수 없어요. 시작·끝 시간을 확인해 주세요.'});return;}
  const next=audioAuditionPosition(bounds,audio.currentTime,event);if(Math.abs(audio.currentTime-next.position)>.0001)audio.currentTime=next.position;if(next.stop)audio.pause();setError(null);
 }
 const ranged=sourceStartMs!==undefined||sourceEndMs!==undefined;
 return <><audio ref={preview} aria-label={`${label} 미리 듣기`} controls controlsList="nodownload" preload="none" src={src} onPause={stopTimer} onEnded={stopTimer} onPlay={event=>update(event.currentTarget,'play')} onLoadedMetadata={event=>update(event.currentTarget,'seek')} onLoadedData={event=>update(event.currentTarget,'seek')} onSeeking={event=>update(event.currentTarget,'seek')} onSeeked={event=>update(event.currentTarget,'seek')} onTimeUpdate={event=>update(event.currentTarget,'time')} onError={event=>{event.currentTarget.pause();stopTimer();setError({context,message:'소리를 불러오지 못했어요. 연결 상태를 확인하고 다시 재생해 주세요.'});}} onContextMenu={event=>event.preventDefault()}/>{ranged&&<small>원본 {(sourceStartMs??0)/1000}초부터 {sourceEndMs===undefined?'끝':`${sourceEndMs/1000}초`}까지 한 번 들어요. 장면의 대기·반복·서서히 시작은 재생 화면에서 확인해요.</small>}{error?.context===context&&<p role="alert">{error.message}</p>}</>;
}
