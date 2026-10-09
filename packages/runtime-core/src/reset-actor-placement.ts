import {resolveStageComposition,type StoryProject,type StageActorEntry,type StoryActorOverride} from '@knolstory/story-domain';
import {patchStoryLine} from './story-runtime';
function defaultPlacement<T extends StageActorEntry|StoryActorOverride>(actor:T):T {
 const {xAnchor:_x,scaleMultiplier:_scale,facing:_facing,...remaining}=actor;
 const {position:_position,...rest}=remaining as typeof remaining & {position?:'center'};
 return rest as T;
}
/** Old side overrides must be cleared too, or they return when JSON strips undefined actor fields. */
export function resetActorPlacement(project:StoryProject,lineId:string,key:string):StoryProject {
 const line=project.lines.find(l=>l.id===lineId);if(!line)throw new Error('컷을 찾을 수 없어요.');
 const stage=resolveStageComposition(project.chapters.find(c=>c.id===line.chapterId),line,project);
 const side=stage.leftActors.some(a=>a.key===key)?'left':'right';
 const actors=side==='left'?stage.leftActors:stage.rightActors;
 const index=actors.findIndex(a=>a.key===key);if(index<0)throw new Error('인물을 찾을 수 없어요.');
 const legacy=line.presentation?.actors?.[side];
 return patchStoryLine(project,lineId,{stageComposition:{...stage,[side==='left'?'leftActors':'rightActors']:actors.map(a=>a.key===key?defaultPlacement(a):a)},
  ...(legacy&&index===0?{presentation:{...line.presentation,actors:{...line.presentation?.actors,[side]:defaultPlacement(legacy)}}}:{})});
}
