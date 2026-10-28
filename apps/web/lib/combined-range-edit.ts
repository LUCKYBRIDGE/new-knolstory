import {createStoryDocument,parseStoryDocument,type StoryProject,type StoryAudio,type StoryPresentation} from '@knolstory/story-domain';
import {moveStoryAudioStart,moveStoryEffectStart} from '@knolstory/runtime-core';
import type {CombinedTarget} from './combined-editing-tracks';
type Owner=Readonly<{sourceLineId:string;target:CombinedTarget;cueIndex?:number}>;
type Snapshot=Readonly<{lineId:string;audio:StoryAudio|undefined;presentation:StoryPresentation|undefined}>;
export type CombinedRangeUndo=Readonly<{projectId:string;target:'music'|'ambience'|'effects';chapter?:Readonly<{id:string;before:StoryAudio|undefined;after:StoryAudio|undefined}>;before:readonly Snapshot[];after:readonly Snapshot[]}>;
const equal=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
const snapshot=(project:StoryProject,ids:readonly string[]):Snapshot[]=>ids.map(lineId=>{const line=project.lines.find(item=>item.id===lineId)!;return {lineId,audio:structuredClone(line.audio),presentation:structuredClone(line.presentation)};});
const validate=(project:StoryProject)=>{const checked=parseStoryDocument(createStoryDocument({project,savedAt:new Date().toISOString(),appVersion:'combined-range'}));if(!checked.ok)throw Error(checked.issues.map(issue=>issue.message).join('\n'));return project;};
/** Change authored cut usage only. Never trims source media or invents a playback duration. */
export function editCombinedRange(project:StoryProject,owner:Owner,startId:string,endId:string):{project:StoryProject;undo:CombinedRangeUndo}{
 const {target}=owner,source=project.lines.find(line=>line.id===owner.sourceLineId),start=project.lines.find(line=>line.id===startId),end=project.lines.find(line=>line.id===endId);
 if(!source||!start||!end||source.chapterId!==start.chapterId||start.chapterId!==end.chapterId||(target!=='music'&&target!=='ambience'&&target!=='effects'))throw Error('같은 장의 시작·종료 컷과 구간을 선택해 주세요.');
 const cuts=project.lines.filter(line=>line.chapterId===source.chapterId).sort((a,b)=>a.order-b.order),from=cuts.findIndex(line=>line.id===startId),to=cuts.findIndex(line=>line.id===endId);
 if(from>to)throw Error('종료 컷은 시작 컷보다 뒤에 있어야 해요.');
 if(target==='effects'){
  const effect=source.presentation?.effects?.[owner.cueIndex??-1];if(!effect||effect.scope!=='following')throw Error('다음 컷에도 유지하는 효과의 구간을 선택해 주세요.');
  if(cuts.slice(from+1,to+1).some(line=>line.presentation?.clearFollowingEffects||effect.id&&line.id!==source.id&&line.presentation?.effects?.some(cue=>cue.id===effect.id)))throw Error('구간 안에 이 효과를 끝내거나 바꾸는 설정이 있어요. 먼저 해당 컷을 확인해 주세요.');
 }else{
  const cue=source.audio?.[target];
  if(cue?.action!=='play'&&cue?.action!=='sequence')throw Error('컷에서 재생을 시작한 소리를 선택해 주세요.');
  if(cuts.slice(from+1,to+1).some(line=>line.id!==source.id&&line.audio?.[target]&&line.audio[target]?.action!=='maintain'))throw Error('구간 안에 소리를 바꾸거나 정지하는 설정이 있어요. 먼저 해당 컷을 확인해 주세요.');
 }
 const ids=[...new Set([source.id,start.id])],before=snapshot(project,ids);
 let next=project,index=owner.cueIndex??-1;
 // Validate moves with the requested end, rather than a stale end preceding the new start.
 const prepared={...project,lines:project.lines.map(line=>line.id!==source.id?line:target==='effects'?{...line,presentation:{...line.presentation,effects:line.presentation!.effects!.map((cue,i)=>i===index?{...cue,endLineId:end.id}:cue)}}:{...line,audio:{...line.audio,[target]:{...line.audio![target as 'music'|'ambience'],endLineId:end.id}}})};
 if(start.id!==source.id){if(target==='effects'){index=start.presentation?.effects?.length??0;next=moveStoryEffectStart(prepared,source.id,owner.cueIndex!,start.id).project;}else next=moveStoryAudioStart(prepared,source.id,start.id,target as 'music'|'ambience').project;}
 next=validate({...next,updatedAt:new Date().toISOString(),lines:next.lines.map(line=>line.id!==start.id?line:target==='effects'?{...line,presentation:{...line.presentation,effects:line.presentation!.effects!.map((cue,i)=>i===index?{...cue,endLineId:end.id}:cue)}}:{...line,audio:{...line.audio,[target]:{...line.audio![target as 'music'|'ambience'],endLineId:end.id}}})});
 return {project:next,undo:{projectId:project.id,target:target as CombinedRangeUndo['target'],before,after:snapshot(next,ids)}};
}
export function undoCombinedRange(project:StoryProject,undo:CombinedRangeUndo):StoryProject{
 const chapter=undo.chapter?project.chapters.find(ch=>ch.id===undo.chapter!.id):undefined;
 if(undo.chapter&&(undo.target==='effects'||!chapter||!equal(chapter.audio?.[undo.target],undo.chapter.after?.[undo.target])))throw Error('장의 소리가 이후 수정되어 되돌릴 수 없어요. 현재 원고를 유지해요.');
 const part=(state:Snapshot)=>undo.target==='effects'?state.presentation?.effects:state.audio?.[undo.target];
 if(project.id!==undo.projectId||undo.after.some(state=>{const line=project.lines.find(item=>item.id===state.lineId);return !line||!equal(part({lineId:line.id,audio:line.audio,presentation:line.presentation}),part(state));}))throw Error('이 구간이 이후 수정되어 되돌릴 수 없어요. 현재 원고를 유지해요.');
 return validate({...project,updatedAt:new Date().toISOString(),chapters:undo.chapter?project.chapters.map(ch=>{if(ch.id!==undo.chapter!.id||undo.target==='effects')return ch;const audio={...ch.audio,[undo.target]:structuredClone(undo.chapter!.before?.[undo.target])};return {...ch,audio:undo.chapter!.before===undefined&&Object.values(audio).every(value=>value===undefined)?undefined:audio};}):project.chapters,lines:project.lines.map(line=>{const state=undo.before.find(item=>item.lineId===line.id);if(!state)return line;if(undo.target==='effects'){const presentation={...line.presentation,effects:structuredClone(state.presentation?.effects)};return {...line,presentation:state.presentation===undefined&&Object.values(presentation).every(value=>value===undefined)?undefined:presentation};}const audio={...line.audio,[undo.target]:structuredClone(state.audio?.[undo.target])};return {...line,audio:state.audio===undefined&&Object.values(audio).every(value=>value===undefined)?undefined:audio};})});
}
