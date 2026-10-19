import {createStoryDocument,parseStoryDocument,type StoryProject,type StoryAudio,type StoryMusicCue} from '@knolstory/story-domain';
type Channel='music'|'ambience';
export type AudioStartUndo=Readonly<{projectId:string;channel:Channel;cuts:readonly {lineId:string;beforeAudio:StoryAudio|undefined;afterCue:StoryMusicCue|undefined}[]}>;
const equal=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
function validated(project:StoryProject){const result=parseStoryDocument(createStoryDocument({project,savedAt:new Date().toISOString(),appVersion:'audio-start'}));if(!result.ok)throw Error(result.issues.map(item=>item.message).join('\n'));return project;}
export function moveStoryAudioStart(project:StoryProject,sourceId:string,targetId:string,channel:Channel){
 const source=project.lines.find(line=>line.id===sourceId),target=project.lines.find(line=>line.id===targetId),cue=source?.audio?.[channel];
 if(!['music','ambience'].includes(channel)||!source||!target||sourceId===targetId||cue?.action!=='play')throw Error('재생할 소리와 다른 시작 컷을 선택해 주세요.');
 if(target.audio?.[channel]!==undefined)throw Error('도착 컷에 기존 소리 지시가 있습니다. 그 지시를 확인하고 변경하지 않음으로 정리한 뒤 옮겨 주세요.');
 const sourceAudio=Object.fromEntries(Object.entries(source.audio!).filter(([key])=>key!==channel));
 const next=validated({...project,updatedAt:new Date().toISOString(),lines:project.lines.map(line=>line.id===sourceId?{...line,audio:sourceAudio}:line.id===targetId?{...line,audio:{...line.audio,[channel]:structuredClone(cue)}}:line)});
 return {project:next,undo:{projectId:project.id,channel,cuts:[{lineId:sourceId,beforeAudio:structuredClone(source.audio),afterCue:undefined},{lineId:targetId,beforeAudio:structuredClone(target.audio),afterCue:structuredClone(cue)}]} satisfies AudioStartUndo};
}
export function canUndoStoryAudioStart(project:StoryProject,undo:AudioStartUndo){return project.id===undo.projectId&&undo.cuts.every(cut=>{const line=project.lines.find(item=>item.id===cut.lineId);return !!line&&equal(line.audio?.[undo.channel],cut.afterCue);});}
export function undoStoryAudioStart(project:StoryProject,undo:AudioStartUndo){
 if(!canUndoStoryAudioStart(project,undo))throw Error('옮긴 소리 지시가 이후 변경되어 되돌릴 수 없습니다. 현재 편집을 유지합니다.');
 return validated({...project,updatedAt:new Date().toISOString(),lines:project.lines.map(line=>{const cut=undo.cuts.find(item=>item.lineId===line.id);if(!cut)return line;const other=Object.fromEntries(Object.entries(line.audio??{}).filter(([key])=>key!==undo.channel));const before=cut.beforeAudio?.[undo.channel],audio={...other,...(before!==undefined?{[undo.channel]:structuredClone(before)}:{})};return {...line,audio:cut.beforeAudio===undefined&&!Object.keys(audio).length?undefined:audio};})});
}
