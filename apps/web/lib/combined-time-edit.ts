import {PRESENTATION_EFFECTS,resolveStageComposition,type StoryProject,type StoryLine,type StageComposition,type StorySoundCue} from '@knolstory/story-domain';
import {patchStoryLine} from '@knolstory/runtime-core';
import {assetDisplayName,resolveAsset,resolveAudioAsset,resolveExcludedAudioAsset} from '@knolstory/asset-registry';
import {effectClickStep,effectDurationMs} from './effect-authoring';
function soundDuration(cue:StorySoundCue):{durationMs?:number}{
 if(resolveExcludedAudioAsset(cue.assetId))return {};
 const seconds=resolveAudioAsset(cue.assetId)?.durationSeconds,known=seconds===undefined?undefined:Math.round(seconds*1000),start=cue.sourceStartMs??0,end=cue.sourceEndMs??known;
 return end!==undefined&&Number.isInteger(end)&&end>start&&(known===undefined||end<=known)?{durationMs:end-start}:{};
}
export type CombinedTimeItem=Readonly<{key:string;kind:'effect'|'sound'|'motion'|'music'|'ambience';index:number;clipId?:string;readOnly?:boolean;actorKey?:string;label:string;clock:string;startMs:number;durationMs?:number;loop?:boolean;conditional?:boolean}>;
type Cue=NonNullable<StoryLine['presentation']>['effects']|NonNullable<StoryLine['audio']>['sounds']|StageComposition;
export type CombinedTimeUndo=Readonly<{projectId:string;lineId:string;item:CombinedTimeItem;before:Cue;after:Cue;beforeStage?:StageComposition;beforeInherit?:boolean}>;
export function combinedTimeItems(project:StoryProject,lineId:string):readonly CombinedTimeItem[]{
 const line=project.lines.find(item=>item.id===lineId);if(!line)return [];
 const effects=line.presentation?.effects??[],stage=resolveStageComposition(project.chapters.find(ch=>ch.id===line.chapterId),line,project);
 const sequences:CombinedTimeItem[]=(['music','ambience'] as const).flatMap(target=>{const cue=line.audio?.[target];if(cue?.action!=='sequence')return [];let startMs=0;return cue.clips.map((clip,index)=>{const durationMs=clip.sourceEndMs-(clip.sourceStartMs??0),item:CombinedTimeItem={key:`${target}:${cue.id}:${clip.id}`,kind:target,index,clipId:clip.id,readOnly:true,label:`${target==='music'?'배경음':'주변 소리'} ${index+1} · ${resolveExcludedAudioAsset(clip.assetId)?'재생 제외 · '+resolveExcludedAudioAsset(clip.assetId)!.name:resolveAudioAsset(clip.assetId)?.name??'음원'}`,clock:'컷 시작',startMs,durationMs,conditional:!!cue.branchCondition};startMs+=durationMs;return item;});});
 return [...sequences,...effects.map((cue,index):CombinedTimeItem=>({key:`effect:${index}`,kind:'effect',index,label:PRESENTATION_EFFECTS.find(item=>item.type===cue.type)?.label??'효과',clock:cue.trigger==='on-click'?`${effectClickStep(effects,index)}번째 클릭`:cue.trigger==='with-dialogue'?'대사 시작':'컷 시작',startMs:cue.delayMs??(cue.trigger==='after-delay'?1000:0),durationMs:effectDurationMs(cue),loop:cue.repeat==='loop',conditional:!!cue.branchCondition})),...(line.audio?.sounds??[]).map((cue,index):CombinedTimeItem=>({key:`sound:${cue.id}`,kind:'sound',index,label:resolveExcludedAudioAsset(cue.assetId)?'재생 제외 · '+resolveExcludedAudioAsset(cue.assetId)!.name:resolveAudioAsset(cue.assetId)?.name??'효과음',clock:'컷 시작',startMs:cue.delayMs??0,...soundDuration(cue),conditional:!!cue.branchCondition})),...[...stage.leftActors,...stage.rightActors].flatMap((actor,index):CombinedTimeItem[]=>actor.motion?[{key:`motion:${actor.key}`,kind:'motion',index,actorKey:actor.key,label:`${resolveAsset(actor.assetId)?assetDisplayName(resolveAsset(actor.assetId)!):'인물'} · ${actor.motion.type==='move'?'이동':actor.motion.type==='fade-in'?'등장':'퇴장'}`,clock:'컷 시작',startMs:actor.motion.delayMs??0,durationMs:actor.motion.durationMs??600}]:[])];
}
function part(project:StoryProject,line:StoryLine,item:CombinedTimeItem):Cue{return item.kind==='effect'?line.presentation?.effects:item.kind==='sound'?line.audio?.sounds:resolveStageComposition(project.chapters.find(ch=>ch.id===line.chapterId),line,project);}
function replace(project:StoryProject,line:StoryLine,item:CombinedTimeItem,value:Cue):StoryProject{return patchStoryLine(project,line.id,item.kind==='effect'?{presentation:{...line.presentation,effects:value as NonNullable<StoryLine['presentation']>['effects']}}:item.kind==='sound'?{audio:{...line.audio,sounds:value as NonNullable<StoryLine['audio']>['sounds']}}:{stageComposition:value as StageComposition,inheritActors:false});}
export function editCombinedTime(project:StoryProject,lineId:string,item:CombinedTimeItem,startMs:number):{project:StoryProject;undo:CombinedTimeUndo}{
 return patchCombinedTime(project,lineId,item,{delayMs:startMs});
}
export function resizeCombinedTime(project:StoryProject,lineId:string,item:CombinedTimeItem,durationMs:number):{project:StoryProject;undo:CombinedTimeUndo}{
 if(item.kind==='sound')throw Error('효과음 길이는 원본 자료를 확인한 뒤 편집해야 해요. 시작 시간만 조정할 수 있어요.');
 return patchCombinedTime(project,lineId,item,{durationMs});
}
export function trimCombinedTime(project:StoryProject,lineId:string,item:CombinedTimeItem,startMs:number,endMs:number):{project:StoryProject;undo:CombinedTimeUndo}{
 if(item.kind==='sound'||!Number.isInteger(endMs)||endMs<startMs)throw Error('동작의 시작과 끝을 확인해 주세요. 효과음은 시작 시간만 조정할 수 있어요.');
 return patchCombinedTime(project,lineId,item,{delayMs:startMs,durationMs:endMs-startMs});
}
function patchCombinedTime(project:StoryProject,lineId:string,item:CombinedTimeItem,patch:{delayMs?:number;durationMs?:number}):{project:StoryProject;undo:CombinedTimeUndo}{
 if(item.kind==='music'||item.kind==='ambience')throw Error('순서 재생의 음원은 음원 목록에서 사용 구간과 순서를 편집해 주세요.');
 if(Object.values(patch).some(value=>!Number.isInteger(value)||value<0||value>10000))throw Error('시작 시간과 동작 길이는 0~10초 안에서 지정해 주세요.');
 const line=project.lines.find(line=>line.id===lineId),actual=combinedTimeItems(project,lineId).find(value=>value.key===item.key&&value.index===item.index&&value.actorKey===item.actorKey);if(!line||!actual)throw Error('수정할 소리·효과·인물 동작을 다시 선택해 주세요.');
 const before=structuredClone(part(project,line,item));let after:Cue;
 if(item.kind==='effect')after=line.presentation!.effects!.map((cue,index)=>index===item.index?{...cue,...patch}:cue);
 else if(item.kind==='sound')after=line.audio!.sounds!.map((cue,index)=>index===item.index?{...cue,...patch}:cue);
 else {const stage=before as StageComposition;after={...stage,leftActors:stage.leftActors.map(actor=>actor.key===item.actorKey?{...actor,motion:{...actor.motion!,...patch}}:actor),rightActors:stage.rightActors.map(actor=>actor.key===item.actorKey?{...actor,motion:{...actor.motion!,...patch}}:actor)};}
 const next=replace(project,line,item,after);return {project:next,undo:{projectId:project.id,lineId,item,before,beforeStage:structuredClone(line.stageComposition),beforeInherit:line.inheritActors,after:structuredClone(part(next,next.lines.find(cut=>cut.id===lineId)!,item))}};
}
export function undoCombinedTime(project:StoryProject,undo:CombinedTimeUndo):StoryProject{
 const line=project.lines.find(line=>line.id===undo.lineId);if(project.id!==undo.projectId||!line||JSON.stringify(part(project,line,undo.item))!==JSON.stringify(undo.after))throw Error('이 항목이 이후 수정되어 취소할 수 없어요. 현재 원고를 유지해요.');
 if(undo.item.kind!=='motion')return replace(project,line,undo.item,structuredClone(undo.before));
 const restored=patchStoryLine(project,line.id,{stageComposition:structuredClone(undo.beforeStage),inheritActors:undo.beforeInherit});
 return {...restored,lines:restored.lines.map(cut=>{if(cut.id!==line.id)return cut;const {inheritActors:_inherit,...fields}=cut;return {...fields,...(undo.beforeInherit===undefined?{}:{inheritActors:undo.beforeInherit})};})};
}
