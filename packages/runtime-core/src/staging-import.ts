import {resolveStageComposition,type StoryProject,type StoryLine,type StageActorEntry} from '@knolstory/story-domain';
import {patchStoryLine} from './story-runtime';
export type StagingSelection=Readonly<{background:boolean;actors:boolean;motion?:boolean}>;
type Field='backgroundId'|'backgroundMode'|'inheritActors'|'stageComposition'|'leftAssetId'|'rightAssetId';
export type StagingImportUndo=Readonly<{projectId:string;lineId:string;fields:readonly Field[];before:Partial<StoryLine>;after:Partial<StoryLine>}>;
const take=(line:StoryLine,fields:readonly Field[])=>Object.fromEntries(fields.filter(field=>Object.hasOwn(line,field)).map(field=>[field,structuredClone(line[field])])) as Partial<StoryLine>;
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
export function importStoryStaging(project:StoryProject,sourceId:string,targetId:string,selection:StagingSelection){
 const source=project.lines.find(line=>line.id===sourceId),target=project.lines.find(line=>line.id===targetId);
 if(!source||!target||sourceId===targetId)throw Error('다른 원본 컷과 현재 컷을 선택해 주세요.');
 if(!selection.background&&!selection.actors)throw Error('가져올 배경 또는 인물을 선택해 주세요.');
 const fields:Field[]=[],patch:Partial<StoryLine>={};
 if(selection.background){
  const chapter=project.chapters.find(item=>item.id===source.chapterId);
  const background=source.backgroundMode==='none'?'':source.backgroundId||chapter?.backgroundId||project.stageDefaults?.backgroundId||'';
  fields.push('backgroundId','backgroundMode');patch.backgroundId=background;patch.backgroundMode=background?undefined:'none';
 }
 if(selection.actors){
  const stage=resolveStageComposition(project.chapters.find(item=>item.id===source.chapterId),source,project);
  const copy=(actor:StageActorEntry)=>{const {motion,...placement}=actor;return selection.motion?{...placement,...(motion?{motion:structuredClone(motion)}:{})}:placement;};
  const leftActors=stage.leftActors.map(copy),rightActors=stage.rightActors.map(copy),keys=new Set([...leftActors,...rightActors].map(actor=>actor.key));
  const original=resolveStageComposition(project.chapters.find(item=>item.id===target.chapterId),target,project);
  const speakerActorKey=original.speakerActorKey&&keys.has(original.speakerActorKey)?original.speakerActorKey:target.speaker==='left'?leftActors[0]?.key:target.speaker==='right'?rightActors[0]?.key:undefined;
  const speakerActorKeys=original.speakerActorKeys?.filter(key=>keys.has(key));
  patch.stageComposition={leftActors,rightActors,...(speakerActorKey?{speakerActorKey}:{}),...(speakerActorKeys?.length?{speakerActorKeys}:{})};patch.inheritActors=false;
  fields.push('inheritActors','stageComposition','leftAssetId','rightAssetId');
 }
 const next=patchStoryLine(project,targetId,patch),after=next.lines.find(line=>line.id===targetId)!;
 return {project:next,undo:{projectId:project.id,lineId:targetId,fields,before:take(target,fields),after:take(after,fields)} satisfies StagingImportUndo};
}
export function canUndoStoryStagingImport(project:StoryProject,undo:StagingImportUndo){
 const line=project.lines.find(item=>item.id===undo.lineId);
 return project.id===undo.projectId&&!!line&&same(take(line,undo.fields),undo.after);
}
export function undoStoryStagingImport(project:StoryProject,undo:StagingImportUndo):StoryProject{
 if(!canUndoStoryStagingImport(project,undo))throw Error('적용한 배치가 이후 변경되어 되돌릴 수 없어요. 현재 편집을 유지합니다.');
 const line=project.lines.find(item=>item.id===undo.lineId)!;
 const restored=Object.fromEntries(Object.entries(line).filter(([key])=>!undo.fields.includes(key as Field)));
 return {...project,updatedAt:new Date().toISOString(),lines:project.lines.map(item=>item.id===undo.lineId?{...restored,...structuredClone(undo.before)} as StoryLine:item)};
}
