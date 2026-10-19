import {createStoryDocument,parseStoryDocument,type StoryProject,type StorySoundCue,type StoryAudio} from '@knolstory/story-domain';
export type SoundBatchUndo=Readonly<{projectId:string;cuts:readonly {lineId:string;before:StoryAudio|undefined;added:StorySoundCue}[]}>;
const equal=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
function validated(project:StoryProject){const result=parseStoryDocument(createStoryDocument({project,savedAt:new Date().toISOString(),appVersion:'sound-batch'}));if(!result.ok)throw Error(result.issues.map(item=>item.message).join('\n'));return project;}
export function applyStorySoundBatch(project:StoryProject,lineIds:readonly string[],cue:StorySoundCue,newIds:readonly string[]){
 if(!lineIds.length||lineIds.length>200||new Set(lineIds).size!==lineIds.length||newIds.length!==lineIds.length||new Set(newIds).size!==newIds.length)throw Error('적용 컷과 효과음 ID를 확인해 주세요. 한 번에 200컷까지 선택할 수 있습니다.');
 const existing=new Set([...project.lines,...project.chapters].flatMap(owner=>owner.audio?.sounds?.map(sound=>sound.id)??[]));
 if(newIds.some(id=>typeof id!=='string'||!id.trim()||existing.has(id)))throw Error('새 효과음 ID가 중복됩니다. 다시 적용해 주세요.');
 const cuts=lineIds.map((lineId,index)=>{const line=project.lines.find(item=>item.id===lineId);if(!line)throw Error('적용할 컷을 찾을 수 없어요.');if((line.audio?.sounds?.length??0)>=4)throw Error('선택한 컷 중 효과음이 이미 4개인 컷이 있습니다. 해당 컷을 제외하거나 효과음을 정리해 주세요.');return {lineId,before:structuredClone(line.audio),added:{...structuredClone(cue),id:newIds[index]}};});
 const next=validated({...project,updatedAt:new Date().toISOString(),lines:project.lines.map(line=>{const cut=cuts.find(item=>item.lineId===line.id);return cut?{...line,audio:{...line.audio,sounds:[...line.audio?.sounds??[],cut.added]}}:line;})});return {project:next,undo:{projectId:project.id,cuts} satisfies SoundBatchUndo};
}
export function canUndoStorySoundBatch(project:StoryProject,undo:SoundBatchUndo){return project.id===undo.projectId&&undo.cuts.every(cut=>{const line=project.lines.find(item=>item.id===cut.lineId);return !!line&&equal(line.audio?.sounds?.find(sound=>sound.id===cut.added.id),cut.added);});}
export function undoStorySoundBatch(project:StoryProject,undo:SoundBatchUndo){
 if(!canUndoStorySoundBatch(project,undo))throw Error('추가한 효과음이 이후 변경되어 일괄 적용을 되돌릴 수 없습니다. 현재 편집을 유지합니다.');
 return validated({...project,updatedAt:new Date().toISOString(),lines:project.lines.map(line=>{const cut=undo.cuts.find(item=>item.lineId===line.id);if(!cut)return line;const {sounds:_sounds,...other}=line.audio??{},sounds=line.audio?.sounds?.filter(sound=>sound.id!==cut.added.id)??[];const audio={...other,...(sounds.length||cut.before?.sounds!==undefined?{sounds}:{})};return {...line,audio:cut.before===undefined&&!Object.keys(audio).length?undefined:audio};})});
}
