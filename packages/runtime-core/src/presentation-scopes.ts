import type {StoryProject,StoryEffectCue} from '@knolstory/story-domain';
import type {RuntimeEffect,RuntimePresentation} from '@knolstory/runtime-contract';
/** Resolve persistence by the actual visited path. Source-order neighbours are not playback. */
export function compileStoryPresentation(project:StoryProject,lineId:string,path:readonly string[]=[lineId]):RuntimePresentation|undefined {
 if(path.at(-1)!==lineId)throw new Error('연출 경로와 현재 컷이 다릅니다.');
 const lines=new Map(project.lines.map(l=>[l.id,l]));const current=lines.get(lineId);if(!current)throw new Error('연출 컷을 찾을 수 없어요.');
 const following=new Map<string,RuntimeEffect>();
 let local:RuntimeEffect[]=[];
 for(const [entry,id] of path.entries()){
  const line=lines.get(id);if(!line)throw new Error('연출 경로의 컷을 찾을 수 없어요.');
  if(line.presentation?.clearFollowingEffects)following.clear();
  local=[];
  for(const [index,cue] of (line.presentation?.effects??[]).entries()){
   const originEntry=`${id}:${entry}:${index}`.slice(0,200);
   const resolved=resolveEffect(cue,originEntry);
   if(cue.scope==='following')following.set(cue.id??`${id}:${index}`,resolved);else local.push(resolved);
  }
 }
 if(!current.presentation && following.size===0)return undefined;
 if(following.size+local.length>12)throw new Error('이어지는 연출은 12개까지 사용할 수 있어요. 이전 연출을 끝내 주세요.');
 return {version:2,effects:[...following.values(),...local],look:current.presentation?.look,transition:current.presentation?.transition};
}
function resolveEffect(cue:StoryEffectCue,originEntry:string):RuntimeEffect{
 const {scope: _scope,target,...effect}=cue;
 return {...effect,originEntry,...(target?{target:target.kind==='actor'?{kind:'actor',actorId:target.actorKey}:target}:{})};
}
