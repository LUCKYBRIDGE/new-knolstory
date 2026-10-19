import { orderedStoryFlowLines, type StoryProject, type StoryMusicCue } from '@knolstory/story-domain';
import { isRuntimeAudioPath, type RuntimeAudio, type RuntimeMusic } from '@knolstory/runtime-contract';
import {resolveExcludedAudioAsset,type ExcludedAudioAsset} from '@knolstory/asset-registry';
import {createBranchConditionMatcher,type BranchChoiceHistory} from './branch-conditions';
export type AudioAssetResolver = (id:string) => Readonly<{runtimePath:string}> | undefined;
function music(cue:StoryMusicCue|undefined, resolve:AudioAssetResolver):RuntimeMusic {
 if(!cue || cue.action==='maintain')return {action:'stop',fadeOutMs:0};
 if(cue.action==='stop')return {action:'stop',fadeOutMs:cue.fadeOutMs??0};
 if(resolveExcludedAudioAsset(cue.assetId))return {action:'stop',fadeOutMs:0};
 return {action:'play',audioPath:assetPath(cue.assetId,resolve),volume:cue.volume??1,loop:cue.loop??true,fadeInMs:cue.fadeInMs??0,fadeOutMs:cue.fadeOutMs??0};
}
function assetPath(id:string, resolve:AudioAssetResolver) {
 const asset=resolve(id); if(!asset)throw new Error(`오디오 자산을 찾을 수 없어요: ${id}`);
 if(!isRuntimeAudioPath(asset.runtimePath))throw new Error(`오디오 경로를 확인해 주세요: ${id}`);
 return asset.runtimePath;
}
/** Replay visited directives, not sequential source order: merges retain the chosen branch's music. */
export function compileStoryAudio(project:StoryProject,lineId:string,resolve:AudioAssetResolver,path?:readonly string[],choiceHistory:BranchChoiceHistory=[]):RuntimeAudio {
 const lines=new Map(project.lines.map(l=>[l.id,l]));const line=lines.get(lineId); if(!line)throw new Error('오디오 컷을 찾을 수 없어요.');
 const ids=path?.length?path:[lineId];
 if(ids.at(-1)!==lineId)throw new Error('오디오 재생 경로와 현재 컷이 다릅니다.');
 const matches=createBranchConditionMatcher(ids,choiceHistory,project);
 type ActiveCue={cue:StoryMusicCue|undefined;owner:string|undefined};
 let musicState:ActiveCue={cue:undefined,owner:undefined};
 let ambienceState:ActiveCue={cue:undefined,owner:undefined};
 let chapterId:string|undefined;
 let previousId:string|undefined;
 const expire=(state:ActiveCue,entry:number):ActiveCue=>{
  const cue=state.cue;
  if(cue?.action==='play'&&(cue.endLineId&&previousId===cue.endLineId||!matches(cue.branchCondition,entry)))return {cue:{action:'stop',fadeOutMs:cue.fadeOutMs??0},owner:undefined};
  return state;
 };
 const enter=(state:ActiveCue,directive:StoryMusicCue|undefined,owner:string,entry:number):ActiveCue=>{
  if(!directive||directive.action==='maintain')return state;
  if(directive.action==='play'&&!matches(directive.branchCondition,entry))return state.owner===owner?{cue:{action:'stop',fadeOutMs:state.cue?.action==='play'?state.cue.fadeOutMs??0:0},owner:undefined}:state;
  return {cue:directive,owner};
 };
 for(const [entry,id] of ids.entries()) {
  const current=lines.get(id); if(!current)throw new Error('오디오 재생 경로의 컷을 찾을 수 없어요.');
  musicState=expire(musicState,entry);ambienceState=expire(ambienceState,entry);
  if(current.chapterId!==chapterId) {
   const audio=project.chapters.find(c=>c.id===current.chapterId)?.audio;
   musicState=enter(musicState,audio?.music,`chapter:${current.chapterId}`,entry);
   ambienceState=enter(ambienceState,audio?.ambience,`chapter:${current.chapterId}`,entry);
   chapterId=current.chapterId;
  }
  musicState=enter(musicState,current.audio?.music,`cut:${id}`,entry);
  ambienceState=enter(ambienceState,current.audio?.ambience,`cut:${id}`,entry);
  previousId=id;
 }
 const previous=project.lines.find(l=>l.id===ids.at(-2));
 const entrySounds=(!previous||previous.chapterId!==line.chapterId)?project.chapters.find(c=>c.id===line.chapterId)?.audio?.sounds??[]:[];
 const cutSounds=line.audio?.sounds??[];
 const reserved=new Set(cutSounds.map(s=>s.id));
 const chapterSounds=entrySounds.map((sound,index)=>{let id=`chapter:${index}:${sound.id.slice(0,160)}`;while(reserved.has(id))id+=':';reserved.add(id);return {...sound,id};});
 return {version:1,music:music(musicState.cue,resolve),ambience:music(ambienceState.cue,resolve),sounds:[...chapterSounds,...cutSounds].filter(s=>matches(s.branchCondition,ids.length-1)&&!resolveExcludedAudioAsset(s.assetId)).map(s=>({id:s.id,audioPath:assetPath(s.assetId,resolve),volume:s.volume??1,delayMs:s.delayMs??0}))};
}
/** Report unavailable service cues without altering the manuscript or substituting another sound. */
export function excludedStoryAudio(project:StoryProject):ExcludedAudioAsset[] {
 const ids=[...project.chapters,...project.lines].flatMap(node=>{
  const audio=node.audio;
  return [...(audio?.music?.action==='play'?[audio.music.assetId]:[]),...(audio?.ambience?.action==='play'?[audio.ambience.assetId]:[]),...(audio?.sounds??[]).map(sound=>sound.assetId)];
 });
 return [...new Set(ids)].flatMap(id=>{const asset=resolveExcludedAudioAsset(id);return asset?[asset]:[];});
}
/** Direct editor jumps use chapter defaults and preceding cut directives; playback supplies its real path. */
export function audioPreviewPath(project:StoryProject,lineId:string):string[] {
 const lines=new Map(project.lines.map(l=>[l.id,l]));const line=lines.get(lineId); if(!line)throw new Error('오디오 컷을 찾을 수 없어요.');
 const chapter=orderedStoryFlowLines(project).filter(l=>l.chapterId===line.chapterId);
 return chapter.slice(0,chapter.findIndex(l=>l.id===lineId)+1).map(l=>l.id);
}
