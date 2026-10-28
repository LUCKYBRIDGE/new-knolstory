import {replayStoryVisits} from './scene-visits';
import type {StoryProject,StoryEffectCue,StoryBranchCondition} from '@knolstory/story-domain';
import type {RuntimeEffect,RuntimePresentation} from '@knolstory/runtime-contract';
import {createBranchConditionMatcher,type BranchChoiceHistory} from './branch-conditions';
/** Resolve persistence by the actual visited path. Source-order neighbours are not playback. */
export type StoryEffectOrigin=Readonly<{sourceLineId:string;cue:Readonly<StoryEffectCue>}>;
export type StoryPresentationPathEntry=Readonly<{lineId:string;effects:readonly StoryEffectOrigin[];presentation:RuntimePresentation|undefined}>;
export function resolveStoryPresentationPath(project:StoryProject,path:readonly string[],choiceHistory:BranchChoiceHistory=[]):readonly StoryPresentationPathEntry[] {
 return replayStoryPresentationPath(project,path,choiceHistory,true,Infinity);
}
function replayStoryPresentationPath(project:StoryProject,path:readonly string[],choiceHistory:BranchChoiceHistory,collectEntries:boolean,effectStep=0):StoryPresentationPathEntry[] {
 const lines=new Map(project.lines.map(l=>[l.id,l]));
 const result:StoryPresentationPathEntry[]=[];
 const origins=new Map<string,StoryEffectOrigin>();
 const visible=new Set((project.lines.some(line=>line.visibility)?replayStoryVisits(project,{path,choiceHistory,lineId:path.at(-1)??null,status:'reading'},false).visits:path.map((lineId,pathIndex)=>({lineId,pathIndex,visible:true}))).filter(v=>v.visible).map(v=>v.pathIndex));
 const matches=createBranchConditionMatcher(path,choiceHistory,project);
 const following=new Map<string,RuntimeEffect>();
 const ends=new Map<string,string>();
 const conditions=new Map<string,StoryBranchCondition>();
 const owners=new Map<string,string>();
 let previousId:string|undefined;
 let local:RuntimeEffect[]=[];
 let localOrigins:StoryEffectOrigin[]=[];
 for(const [entry,id] of path.entries()){
  const line=lines.get(id);if(!line)throw new Error('연출 경로의 컷을 찾을 수 없어요.');
  if(!visible.has(entry))continue;
  for(const [key,end] of ends)if(previousId===end){following.delete(key);ends.delete(key);conditions.delete(key);owners.delete(key);origins.delete(key);}
  for(const [key,condition] of conditions)if(!matches(condition,entry)){following.delete(key);ends.delete(key);conditions.delete(key);owners.delete(key);origins.delete(key);}
  if(line.presentation?.clearFollowingEffects){following.clear();ends.clear();conditions.clear();owners.clear();origins.clear();}
  local=[];localOrigins=[];
  const groups=clickGroups(line.presentation?.effects??[],cue=>matches(cue.branchCondition,entry));
  let clickIndex=0;
  for(const [index,cue] of (line.presentation?.effects??[]).entries()){
   const key=cue.id??`${id}:${index}`;
   const owner=`${id}:${index}`;
   if(cue.scope==='following'&&owners.get(key)===owner){following.delete(key);ends.delete(key);conditions.delete(key);owners.delete(key);origins.delete(key);}
   const clickGroup=cue.trigger==='on-click'?(cue.clickStep??++clickIndex):undefined;
   if(cue.trigger==='on-click'&&cue.clickStep!==undefined)clickIndex++;
   if(!matches(cue.branchCondition,entry))continue;
   if(clickGroup!==undefined&&entry===path.length-1&&groups.indexOf(clickGroup)>=effectStep)continue;
   const originEntry=`${id}:${entry}:${index}`.slice(0,200);
   const resolved=resolveEffect(cue,originEntry);
   if(cue.scope==='following'){following.set(key,resolved);origins.set(key,{sourceLineId:id,cue});owners.set(key,owner);conditions.delete(key);if(cue.branchCondition)conditions.set(key,cue.branchCondition);ends.delete(key);if(cue.endLineId)ends.set(key,cue.endLineId);}else {local.push(resolved);localOrigins.push({sourceLineId:id,cue});}
  }
  previousId=id;
  if(!collectEntries&&entry!==path.length-1)continue;
  const presentation:RuntimePresentation|undefined=!line.presentation&&following.size===0?undefined:{version:2,effects:[...following.values(),...local],look:line.presentation?.look,transition:line.presentation?.transition};
  result.push({lineId:id,effects:[...origins.values(),...localOrigins],presentation});
 }
 return result;
}
export function compileStoryPresentation(project:StoryProject,lineId:string,path:readonly string[]=[lineId],choiceHistory:BranchChoiceHistory=[],effectStep=0):RuntimePresentation|undefined {
 if(path.at(-1)!==lineId)throw new Error('연출 경로와 현재 컷이 다릅니다.');
 if(!project.lines.some(line=>line.id===lineId))throw new Error('연출 컷을 찾을 수 없어요.');
 const presentation=replayStoryPresentationPath(project,path,choiceHistory,false,effectStep).at(-1)?.presentation;
 if((presentation?.effects?.length??0)>12)throw new Error('이어지는 연출은 12개까지 사용할 수 있어요. 이전 연출을 끝내 주세요.');
 return presentation;
}
function resolveEffect(cue:StoryEffectCue,originEntry:string):RuntimeEffect{
 const {scope: _scope,endLineId:_endLineId,branchCondition:_branchCondition,target,trigger,clickStep:_clickStep,...effect}=cue;
 const durationMs=cue.durationMs??(cue.type==='shake'?600:['crack','screen-crack'].includes(cue.type)?1800:800);
 return {...effect,...(trigger?{trigger:trigger==='on-click'?'scene-enter' as const:trigger}:{}),durationMs,originEntry,...(target?{target:target.kind==='actor'?{kind:'actor',actorId:target.actorKey}:target}:{})};
}

function clickGroups(effects:readonly StoryEffectCue[],matches:(cue:StoryEffectCue)=>boolean):number[]{
 let index=0;const groups=new Set<number>();
 for(const cue of effects)if(cue.trigger==='on-click'){index++;if(matches(cue))groups.add(cue.clickStep??index);}
 return [...groups].sort((a,b)=>a-b);
}
/** Distinct matching click groups compact after exact branch filtering. */
export function storyClickEffectGroupCount(project:StoryProject,lineId:string,path:readonly string[],choiceHistory:BranchChoiceHistory=[]):number {
 const line=project.lines.find(item=>item.id===lineId);if(!line)throw new Error('연출 컷을 찾을 수 없어요.');
 const matches=createBranchConditionMatcher(path,choiceHistory,project);
 return clickGroups(line.presentation?.effects??[],cue=>matches(cue.branchCondition,path.length-1)).length;
}
