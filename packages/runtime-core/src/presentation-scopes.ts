import type {StoryProject,StoryEffectCue,StoryBranchCondition} from '@knolstory/story-domain';
import type {RuntimeEffect,RuntimePresentation} from '@knolstory/runtime-contract';
import {createBranchConditionMatcher,type BranchChoiceHistory} from './branch-conditions';
/** Resolve persistence by the actual visited path. Source-order neighbours are not playback. */
export function compileStoryPresentation(project:StoryProject,lineId:string,path:readonly string[]=[lineId],choiceHistory:BranchChoiceHistory=[]):RuntimePresentation|undefined {
 if(path.at(-1)!==lineId)throw new Error('연출 경로와 현재 컷이 다릅니다.');
 const lines=new Map(project.lines.map(l=>[l.id,l]));const current=lines.get(lineId);if(!current)throw new Error('연출 컷을 찾을 수 없어요.');
 const matches=createBranchConditionMatcher(path,choiceHistory,project);
 const following=new Map<string,RuntimeEffect>();
 const ends=new Map<string,string>();
 const conditions=new Map<string,StoryBranchCondition>();
 const owners=new Map<string,string>();
 let previousId:string|undefined;
 let local:RuntimeEffect[]=[];
 for(const [entry,id] of path.entries()){
  const line=lines.get(id);if(!line)throw new Error('연출 경로의 컷을 찾을 수 없어요.');
  for(const [key,end] of ends)if(previousId===end){following.delete(key);ends.delete(key);conditions.delete(key);owners.delete(key);}
  for(const [key,condition] of conditions)if(!matches(condition,entry)){following.delete(key);ends.delete(key);conditions.delete(key);owners.delete(key);}
  if(line.presentation?.clearFollowingEffects){following.clear();ends.clear();conditions.clear();owners.clear();}
  local=[];
  for(const [index,cue] of (line.presentation?.effects??[]).entries()){
   const key=cue.id??`${id}:${index}`;
   const owner=`${id}:${index}`;
   if(cue.scope==='following'&&owners.get(key)===owner){following.delete(key);ends.delete(key);conditions.delete(key);owners.delete(key);}
   if(!matches(cue.branchCondition,entry))continue;
   const originEntry=`${id}:${entry}:${index}`.slice(0,200);
   const resolved=resolveEffect(cue,originEntry);
   if(cue.scope==='following'){following.set(key,resolved);owners.set(key,owner);conditions.delete(key);if(cue.branchCondition)conditions.set(key,cue.branchCondition);ends.delete(key);if(cue.endLineId)ends.set(key,cue.endLineId);}else local.push(resolved);
  }
  previousId=id;
 }
 if(!current.presentation && following.size===0)return undefined;
 if(following.size+local.length>12)throw new Error('이어지는 연출은 12개까지 사용할 수 있어요. 이전 연출을 끝내 주세요.');
 return {version:2,effects:[...following.values(),...local],look:current.presentation?.look,transition:current.presentation?.transition};
}
function resolveEffect(cue:StoryEffectCue,originEntry:string):RuntimeEffect{
 const {scope: _scope,endLineId:_endLineId,branchCondition:_branchCondition,target,...effect}=cue;
 const durationMs=cue.durationMs??(cue.type==='shake'?600:['crack','screen-crack'].includes(cue.type)?1800:800);
 return {...effect,durationMs,originEntry,...(target?{target:target.kind==='actor'?{kind:'actor',actorId:target.actorKey}:target}:{})};
}
