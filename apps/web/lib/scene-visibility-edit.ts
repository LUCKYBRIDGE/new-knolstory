import {isStorySceneVisibility,type StorySceneVisibility} from '@knolstory/story-domain';
type Visibility=StorySceneVisibility|undefined;
export function updateSceneVisibility(current:Visibility,patch:Partial<StorySceneVisibility>):Visibility{
 const combined={...current,...patch};
 const next={...(combined.scores!==undefined?{scores:combined.scores}:{}),...(combined.choices!==undefined?{choices:combined.choices}:{})};
 if(!Object.keys(next).length)return undefined;
 if(!isStorySceneVisibility(next))throw Error('컷을 보여 줄 점수·선택 조건을 확인해 주세요.');
 return structuredClone(next);
}
export function createSceneVisibilityUndo(projectId:string,lineId:string,before:Visibility,after:Visibility){return {projectId,lineId,before:structuredClone(before),after:structuredClone(after)};}
export type SceneVisibilityUndo=ReturnType<typeof createSceneVisibilityUndo>;
export function undoSceneVisibility(projectId:string,lineId:string,current:Visibility,undo:SceneVisibilityUndo):Visibility{
 if(projectId!==undo.projectId||lineId!==undo.lineId||JSON.stringify(current)!==JSON.stringify(undo.after))throw Error('컷 표시 조건이 이후 바뀌어 취소하지 않았어요. 현재 원고를 유지해요.');
 return structuredClone(undo.before);
}
