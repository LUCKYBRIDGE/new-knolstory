import {resolveStageComposition,createStoryDocument,parseStoryDocument,type StoryProject,type StoryPresentation} from '@knolstory/story-domain';
type Snapshot=Readonly<{lineId:string;before:StoryPresentation|undefined;after:StoryPresentation|undefined}>;
export type EffectStartUndo=Readonly<{projectId:string;cuts:readonly Snapshot[]}>;
const equal=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
function validated(project:StoryProject){const result=parseStoryDocument(createStoryDocument({project,savedAt:new Date().toISOString(),appVersion:'effect-start'}));if(!result.ok)throw Error(result.issues.map(item=>item.message).join('\n'));return project;}
export function moveStoryEffectStart(project:StoryProject,sourceId:string,index:number,targetId:string){
 const source=project.lines.find(line=>line.id===sourceId),target=project.lines.find(line=>line.id===targetId),effect=source?.presentation?.effects?.[index];
 if(!source||!target||!effect||sourceId===targetId||!Number.isInteger(index)||index<0)throw Error('옮길 효과와 다른 시작 컷을 선택해 주세요.');
 if((target.presentation?.effects?.length??0)>=3)throw Error('도착 컷의 효과가 이미 3개입니다. 기존 효과를 정리한 뒤 옮겨 주세요.');
 if(effect.id&&target.presentation?.effects?.some(item=>item.id===effect.id))throw Error('도착 컷에 같은 ID의 효과가 있습니다. 다른 컷을 선택해 주세요.');
 if(effect.target?.kind==='actor'){
  const stage=resolveStageComposition(project.chapters.find(ch=>ch.id===target.chapterId),target,project),key=effect.target.actorKey;
  if(![...stage.leftActors,...stage.rightActors].some(actor=>actor.key===key))throw Error('도착 컷에 이 효과의 대상 인물이 없습니다. 대상을 확인한 뒤 옮겨 주세요.');
 }
 const sourceAfter={...source.presentation,effects:source.presentation!.effects!.filter((_,i)=>i!==index)},targetAfter={...target.presentation,effects:[...target.presentation?.effects??[],structuredClone(effect)]};
 const next=validated({...project,updatedAt:new Date().toISOString(),lines:project.lines.map(line=>line.id===sourceId?{...line,presentation:sourceAfter}:line.id===targetId?{...line,presentation:targetAfter}:line)});
 return {project:next,undo:{projectId:project.id,cuts:[{lineId:sourceId,before:structuredClone(source.presentation),after:structuredClone(sourceAfter)},{lineId:targetId,before:structuredClone(target.presentation),after:structuredClone(targetAfter)}]} satisfies EffectStartUndo};
}
export function canUndoStoryEffectStart(project:StoryProject,undo:EffectStartUndo){return project.id===undo.projectId&&undo.cuts.every(cut=>{const line=project.lines.find(item=>item.id===cut.lineId);return !!line&&equal(line.presentation?.effects,cut.after?.effects);});}
export function undoStoryEffectStart(project:StoryProject,undo:EffectStartUndo){
 if(!canUndoStoryEffectStart(project,undo))throw Error('옮긴 효과가 이후 변경되어 되돌릴 수 없습니다. 현재 편집을 유지합니다.');
 return validated({...project,updatedAt:new Date().toISOString(),lines:project.lines.map(line=>{const cut=undo.cuts.find(item=>item.lineId===line.id);if(!cut)return line;const presentation={...line.presentation,effects:structuredClone(cut.before?.effects)};return {...line,presentation:cut.before===undefined&&Object.values(presentation).every(value=>value===undefined)?undefined:presentation};})});
}
