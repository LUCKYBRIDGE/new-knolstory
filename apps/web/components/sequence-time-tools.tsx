'use client';
import type {StoryProject} from '@knolstory/story-domain';
import {resolveAudioAsset} from '@knolstory/asset-registry';
import type {CombinedTimeItem} from '../lib/combined-time-edit';
import {splitSequenceAtTime,trimSequenceEdge,type SequenceTimeChange} from '../lib/sequence-time-edit';
import {SecondsInput} from './seconds-input';
type Props={project:StoryProject;lineId:string;item:CombinedTimeItem;guide:number;showGuides:boolean;onGuide:(value:number)=>void;onChange:(change:SequenceTimeChange)=>void;onError:(message:string)=>void};
const seconds=(value:number)=>`${Number((value/1000).toFixed(3))}초`;
export function SequenceTimeTools(p:Props){
 const channel=p.item.kind==='music'?'music':'ambience',cue=p.project.lines.find(line=>line.id===p.lineId)?.audio?.[channel];
 if(cue?.action!=='sequence'||!p.item.clipId)return null;
 const clip=cue.clips.find(clip=>clip.id===p.item.clipId);if(!clip)return null;
 const source=p.guide-p.item.startMs+(clip.sourceStartMs??0),end=p.item.startMs+p.item.durationMs!,known=resolveAudioAsset(clip.assetId)?.durationSeconds,max=known===undefined?clip.sourceEndMs:Math.round(known*1000);
 function apply(operation:()=>SequenceTimeChange){try{p.onChange(operation());}catch(error){p.onError(error instanceof Error?error.message:'음원 구간을 바꾸지 못했어요.');}}
 return <div data-sequence-time-tools>
  <p>순서 재생 · {p.item.label} · {seconds(p.item.startMs)}부터 {seconds(end)}까지</p>
  <small>사용 구간 길이가 바뀌면 뒤 음원도 함께 당겨지거나 밀려요. 원본 파일은 유지해요.</small>
  {p.showGuides&&<div><button type="button" onClick={()=>p.onGuide(p.item.startMs)}>보조선을 선택 음원 시작으로</button><button type="button" onClick={()=>p.onGuide(end)}>보조선을 선택 음원 끝으로</button><button type="button" disabled={p.guide<=p.item.startMs||p.guide>=end||cue.clips.length>=16} onClick={()=>apply(()=>splitSequenceAtTime(p.project,p.lineId,channel,clip.id,p.guide,`music-${crypto.randomUUID()}`))}>보조선에서 음원 나누기</button></div>}
  <details><summary>선택 음원 사용 구간</summary>
   <SecondsInput label="시간 막대 음원 원본 시작" maxMs={clip.sourceEndMs-1} valueMs={clip.sourceStartMs??0} onChange={value=>apply(()=>trimSequenceEdge(p.project,p.lineId,channel,clip.id,'start',value))}/>
   <SecondsInput label="시간 막대 음원 원본 끝" minMs={(clip.sourceStartMs??0)+1} maxMs={max} valueMs={clip.sourceEndMs} onChange={value=>apply(()=>trimSequenceEdge(p.project,p.lineId,channel,clip.id,'end',value))}/>
   {p.showGuides&&<div><button type="button" disabled={source<0||source>=clip.sourceEndMs} onClick={()=>apply(()=>trimSequenceEdge(p.project,p.lineId,channel,clip.id,'start',source))}>보조선으로 음원 앞부분 조정</button><button type="button" disabled={source<=(clip.sourceStartMs??0)||source>max} onClick={()=>apply(()=>trimSequenceEdge(p.project,p.lineId,channel,clip.id,'end',source))}>보조선으로 음원 뒷부분 조정</button></div>}
  </details>
 </div>;
}
