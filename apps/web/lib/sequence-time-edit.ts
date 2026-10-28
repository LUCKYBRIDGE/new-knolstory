import type {StoryProject,StoryMusicSequence} from '@knolstory/story-domain';
import {patchStoryLine} from '@knolstory/runtime-core';
import {resolveAudioAsset} from '@knolstory/asset-registry';
import {splitMusicSequenceClip,updateMusicSequenceClip} from './music-sequence-edit';
export type SequenceTimeUndo=Readonly<{projectId:string;lineId:string;channel:'music'|'ambience';before:StoryMusicSequence;after:StoryMusicSequence}>;
export type SequenceTimeChange=Readonly<{project:StoryProject;undo?:SequenceTimeUndo}>;
function selection(project:StoryProject,lineId:string,channel:'music'|'ambience',clipId:string,expected?:string){
 const line=project.lines.find(line=>line.id===lineId),cue=line?.audio?.[channel];
 if(!line||cue?.action!=='sequence')throw Error('편집할 소리 순서를 다시 선택해 주세요.');
 if(expected!==undefined&&JSON.stringify(cue)!==expected)throw Error('끌기 중 소리 설정이 바뀌었어요. 현재 원고를 유지하고 다시 선택해 주세요.');
 const index=cue.clips.findIndex(clip=>clip.id===clipId);if(index<0)throw Error('편집할 음원을 다시 선택해 주세요.');
 const startMs=cue.clips.slice(0,index).reduce((sum,clip)=>sum+clip.sourceEndMs-(clip.sourceStartMs??0),0);
 return {line,cue,index,clip:cue.clips[index],startMs};
}
function apply(project:StoryProject,lineId:string,channel:'music'|'ambience',before:StoryMusicSequence,after:StoryMusicSequence):SequenceTimeChange{
 if(JSON.stringify(before)===JSON.stringify(after))return {project};
 const line=project.lines.find(line=>line.id===lineId)!;
 return {project:patchStoryLine(project,lineId,{audio:{...line.audio,[channel]:after}}),undo:{projectId:project.id,lineId,channel,before:structuredClone(before),after:structuredClone(after)}};
}
/** A guide is sequence elapsed time; the stored split remains a source-file position. */
export function splitSequenceAtTime(project:StoryProject,lineId:string,channel:'music'|'ambience',clipId:string,timeMs:number,newId:string,expected?:string):SequenceTimeChange{
 const {cue,clip,startMs}=selection(project,lineId,channel,clipId,expected);
 if(!Number.isInteger(timeMs))throw Error('나눌 위치를 밀리초 단위까지 확인해 주세요.');
 return apply(project,lineId,channel,cue,splitMusicSequenceClip(cue,clipId,(clip.sourceStartMs??0)+timeMs-startMs,newId));
}
/** Trimming changes media duration; following clips stay adjacent and shift together. */
export function trimSequenceEdge(project:StoryProject,lineId:string,channel:'music'|'ambience',clipId:string,edge:'start'|'end',sourceMs:number,expected?:string):SequenceTimeChange{
 const {cue,clip}=selection(project,lineId,channel,clipId,expected);
 if(!Number.isInteger(sourceMs))throw Error('사용할 원본 구간을 밀리초 단위까지 확인해 주세요.');
 const duration=resolveAudioAsset(clip.assetId)?.durationSeconds,limit=duration===undefined?clip.sourceEndMs:Math.round(duration*1000);
 if(edge==='end'&&sourceMs>limit)throw Error('확인된 원본 길이 안에서 끝을 지정해 주세요. 길이를 모르면 기존 끝보다 늘릴 수 없어요.');
 const next=updateMusicSequenceClip(cue,clipId,edge==='start'?{sourceStartMs:sourceMs}:{sourceEndMs:sourceMs});
 return apply(project,lineId,channel,cue,next);
}
/** Insert at a neighbour boundary; a one-pass sequence never gains implicit silent gaps. */
export function moveSequenceAtTime(project:StoryProject,lineId:string,channel:'music'|'ambience',clipId:string,timeMs:number,expected?:string):SequenceTimeChange{
 const {cue,clip}=selection(project,lineId,channel,clipId,expected);
 if(!Number.isFinite(timeMs))throw Error('옮길 위치를 확인해 주세요.');
 const others=cue.clips.filter(item=>item.id!==clipId),boundaries=[0];
 for(const item of others)boundaries.push(boundaries.at(-1)!+item.sourceEndMs-(item.sourceStartMs??0));
 const position=boundaries.reduce((best,time,index)=>Math.abs(time-timeMs)<Math.abs(boundaries[best]-timeMs)?index:best,0);
 return apply(project,lineId,channel,cue,{...cue,clips:[...others.slice(0,position),clip,...others.slice(position)]});
}
export function undoSequenceTime(project:StoryProject,undo:SequenceTimeUndo):StoryProject{
 const line=project.lines.find(line=>line.id===undo.lineId);
 if(project.id!==undo.projectId||!line||JSON.stringify(line.audio?.[undo.channel])!==JSON.stringify(undo.after))throw Error('이 소리 순서가 이후 수정되어 취소할 수 없어요. 현재 원고를 유지해요.');
 return patchStoryLine(project,line.id,{audio:{...line.audio,[undo.channel]:structuredClone(undo.before)}});
}
