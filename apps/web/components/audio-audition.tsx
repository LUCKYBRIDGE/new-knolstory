'use client';
import {useEffect,useRef,useState} from 'react';
import {audioAuditionBounds,audioAuditionPosition,type AuditionSource} from '../lib/audio-audition';
import {auditionNeedsBufferedSource,createAuditionSourceBuffer} from '../lib/audio-audition-source';
type Props=AuditionSource&{src:string;label:string;active:boolean;volume?:number};
/** Standalone sample only. Story timing, fades and looping remain in the native stage. */
export function AudioAudition({src,label,active,volume=1,sourceStartMs,sourceEndMs}:Props){
 const preview=useRef<HTMLAudioElement>(null),timer=useRef<number|undefined>(undefined),[error,setError]=useState<{context:string;message:string}|null>(null);
 const buffer=useRef<ReturnType<typeof createAuditionSourceBuffer>|null>(null),intent=useRef(0),pending=useRef<{id:number;muted:boolean;swapping:boolean}|null>(null);
 const [prepared,setPrepared]=useState<{source:string;url:string}|null>(null);
 const context=JSON.stringify([src,sourceStartMs,sourceEndMs]),ranged=sourceStartMs!==undefined||sourceEndMs!==undefined;
 const stopTimer=()=>{if(timer.current!==undefined)window.clearInterval(timer.current);timer.current=undefined;};
 function cancelPending(audio:HTMLAudioElement){intent.current++;if(pending.current)audio.muted=pending.current.muted;pending.current=null;buffer.current?.cancelPending();}
 useEffect(()=>{const audio=preview.current;if(!audio)return;cancelPending(audio);audio.pause();if(audio.readyState>=2){const bounds=audioAuditionBounds({sourceStartMs,sourceEndMs},audio.duration);if(bounds)audio.currentTime=bounds.start;}return()=>{cancelPending(audio);audio.pause();stopTimer();};},[src,active,sourceStartMs,sourceEndMs]);
 useEffect(()=>()=>{buffer.current?.dispose();},[src]);
 useEffect(()=>{if(preview.current)preview.current.volume=Math.max(0,Math.min(1,volume));},[volume]);
 function prepareSource(audio:HTMLAudioElement){
  if(pending.current)return;
  const id=++intent.current,muted=audio.muted;pending.current={id,muted,swapping:false};audio.muted=true;stopTimer();
  buffer.current??=createAuditionSourceBuffer();
  void buffer.current.load(src).then(url=>{
   if(intent.current!==id||pending.current?.id!==id||audio.paused)return;
   pending.current.swapping=true;setPrepared({source:src,url});
  }).catch(issue=>{if(intent.current!==id)return;cancelPending(audio);audio.pause();if(!(issue instanceof DOMException&&issue.name==='AbortError'))setError({context,message:'소리를 불러오지 못했어요. 연결 상태를 확인하고 다시 재생해 주세요.'});});
 }
 function update(audio:HTMLAudioElement,event:'play'|'seek'|'time'){
  if(event==='play'){audio.volume=Math.max(0,Math.min(1,volume));stopTimer();timer.current=window.setInterval(()=>update(audio,'time'),20);document.querySelectorAll('audio').forEach(other=>{if(other!==audio)other.pause();});if(!active){cancelPending(audio);audio.pause();return;}}
  if(pending.current||audio.readyState<2)return;
  if(!audio.paused&&prepared?.source!==src&&auditionNeedsBufferedSource(src,ranged,audio.duration,audio.seekable)){prepareSource(audio);return;}
  if(audio.seeking)return;
  const bounds=audioAuditionBounds({sourceStartMs,sourceEndMs},audio.duration);
  if(!bounds){audio.pause();setError({context,message:'이 원본에서 사용 구간을 재생할 수 없어요. 시작·끝 시간을 확인해 주세요.'});return;}
  const next=audioAuditionPosition(bounds,audio.currentTime,event);if(Math.abs(audio.currentTime-next.position)>.0001)audio.currentTime=next.position;if(next.stop)audio.pause();setError(null);
 }
 function loaded(audio:HTMLAudioElement){
  const request=pending.current;
  if(request?.swapping&&prepared?.source===src&&audio.currentSrc===prepared.url){
   if(request.id!==intent.current)return;audio.muted=request.muted;pending.current=null;update(audio,'seek');
   void audio.play().catch(()=>{if(request.id===intent.current)setError({context,message:'소리를 재생하지 못했어요. 재생 버튼을 다시 눌러 주세요.'});});
  }else update(audio,'seek');
 }
 function paused(audio:HTMLAudioElement){stopTimer();if(pending.current&&!pending.current.swapping)cancelPending(audio);}
 return <><audio ref={preview} aria-label={`${label} 미리 듣기`} controls controlsList="nodownload" preload="none" aria-busy={!!pending.current} src={prepared?.source===src?prepared.url:src} onPause={event=>paused(event.currentTarget)} onEnded={event=>{cancelPending(event.currentTarget);stopTimer();}} onPlay={event=>update(event.currentTarget,'play')} onLoadedMetadata={event=>update(event.currentTarget,'seek')} onLoadedData={event=>loaded(event.currentTarget)} onSeeking={event=>update(event.currentTarget,'seek')} onSeeked={event=>update(event.currentTarget,'seek')} onTimeUpdate={event=>update(event.currentTarget,'time')} onError={event=>{cancelPending(event.currentTarget);event.currentTarget.pause();stopTimer();setError({context,message:'소리를 불러오지 못했어요. 연결 상태를 확인하고 다시 재생해 주세요.'});}} onContextMenu={event=>event.preventDefault()}/>{ranged&&<small>원본 {(sourceStartMs??0)/1000}초부터 {sourceEndMs===undefined?'끝':`${sourceEndMs/1000}초`}까지 한 번 들어요. 장면의 대기·반복·서서히 시작은 재생 화면에서 확인해요.</small>}{error?.context===context&&<p role="alert">{error.message}</p>}</>;
}
