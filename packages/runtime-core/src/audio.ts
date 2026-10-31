import {replayStoryVisits} from './scene-visits';
import { orderedStoryFlowLines, type StoryProject, type StoryMusicCue, type StorySoundCue } from '@knolstory/story-domain';
import { isRuntimeAudioPath, type RuntimeAudio, type RuntimeMusic } from '@knolstory/runtime-contract';
import {resolveExcludedAudioAsset,type ExcludedAudioAsset} from '@knolstory/asset-registry';
import {createBranchConditionMatcher,type BranchChoiceHistory} from './branch-conditions';
export type AudioAssetResolver = (id:string) => Readonly<{runtimePath:string}> | undefined;
const sourceRange=(cue:{sourceStartMs?:number;sourceEndMs?:number})=>({...('sourceStartMs' in cue?{sourceStartMs:cue.sourceStartMs}:{}),...('sourceEndMs' in cue?{sourceEndMs:cue.sourceEndMs}:{})});
function music(cue:StoryMusicCue|undefined, resolve:AudioAssetResolver,entryId?:string):RuntimeMusic {
 if(!cue || cue.action==='maintain')return {action:'stop',fadeOutMs:0};
 if(cue.action==='stop')return {action:'stop',fadeOutMs:cue.fadeOutMs??0};
 if(cue.action==='sequence'){
  if(cue.clips.some(clip=>resolveExcludedAudioAsset(clip.assetId)))return {action:'stop',fadeOutMs:0};
  return {action:'sequence',id:cue.id,entryId:entryId!,clips:cue.clips.map(clip=>({id:clip.id,audioPath:assetPath(clip.assetId,resolve),sourceStartMs:clip.sourceStartMs??0,sourceEndMs:clip.sourceEndMs,volume:clip.volume??1,fadeInMs:clip.fadeInMs??0,fadeOutMs:clip.fadeOutMs??0}))};
 }
 if(resolveExcludedAudioAsset(cue.assetId))return {action:'stop',fadeOutMs:0};
 return {action:'play',...sourceRange(cue),audioPath:assetPath(cue.assetId,resolve),volume:cue.volume??1,loop:cue.loop??true,fadeInMs:cue.fadeInMs??0,fadeOutMs:cue.fadeOutMs??0};
}
function assetPath(id:string, resolve:AudioAssetResolver) {
 const asset=resolve(id); if(!asset)throw new Error(`오디오 자산을 찾을 수 없어요: ${id}`);
 if(!isRuntimeAudioPath(asset.runtimePath))throw new Error(`오디오 경로를 확인해 주세요: ${id}`);
 return asset.runtimePath;
}
export type AudioCueSource=Readonly<{kind:'chapter'|'cut';id:string}>;
export type StoryAudioCueState=Readonly<{cue:Readonly<StoryMusicCue>|undefined;source?:AudioCueSource;entryId?:string}>;
export type StorySoundOrigin=Readonly<{cue:Readonly<StorySoundCue>;source:AudioCueSource}>;
export type StoryAudioPathEntry=Readonly<{lineId:string;music:StoryAudioCueState;ambience:StoryAudioCueState;sounds:readonly StorySoundOrigin[]}>;
/** One ordered replay exposes provenance to editor summaries and powers actual playback. */
export function resolveStoryAudioPath(project:StoryProject,path:readonly string[],choiceHistory:BranchChoiceHistory=[]):readonly StoryAudioPathEntry[]{
 return replayStoryAudioPath(project,path,choiceHistory,true);
}
function replayStoryAudioPath(project:StoryProject,path:readonly string[],choiceHistory:BranchChoiceHistory,collectEntries:boolean):StoryAudioPathEntry[]{
 const lines=new Map(project.lines.map(l=>[l.id,l]));
 const ids=path;
 const visible=new Set((project.lines.some(line=>line.visibility)?replayStoryVisits(project,{path,choiceHistory,lineId:path.at(-1)??null,status:'reading'},false).visits:path.map((lineId,pathIndex)=>({lineId,pathIndex,visible:true}))).filter(v=>v.visible).map(v=>v.pathIndex));
 const matches=createBranchConditionMatcher(ids,choiceHistory,project);
 type ActiveCue={cue:StoryMusicCue|undefined;owner:string|undefined;source?:AudioCueSource;entryId?:string};
 const result:StoryAudioPathEntry[]=[];
 let musicState:ActiveCue={cue:undefined,owner:undefined};
 let ambienceState:ActiveCue={cue:undefined,owner:undefined};
 let chapterId:string|undefined;
 let previousId:string|undefined;
 const expire=(state:ActiveCue,entry:number):ActiveCue=>{
  const cue=state.cue;
  if((cue?.action==='play'||cue?.action==='sequence')&&(cue.endLineId&&previousId===cue.endLineId||!matches(cue.branchCondition,entry)))return {cue:{action:'stop',fadeOutMs:cue.action==='play'?cue.fadeOutMs??0:0},owner:undefined};
  return state;
 };
 const enter=(state:ActiveCue,directive:StoryMusicCue|undefined,owner:string,entry:number,source:AudioCueSource):ActiveCue=>{
  if(!directive||directive.action==='maintain')return state;
  if((directive.action==='play'||directive.action==='sequence')&&!matches(directive.branchCondition,entry))return state.owner===owner?{cue:{action:'stop',fadeOutMs:state.cue?.action==='play'?state.cue.fadeOutMs??0:0},owner:undefined}:state;
  return {cue:directive,owner,source,...(directive.action==='sequence'?{entryId:`${owner}:${entry}`}:{})};
 };
 for(const [entry,id] of ids.entries()) {
  const current=lines.get(id); if(!current)throw new Error('오디오 재생 경로의 컷을 찾을 수 없어요.');
  if(!visible.has(entry))continue;
  musicState=expire(musicState,entry);ambienceState=expire(ambienceState,entry);
  if(current.chapterId!==chapterId) {
   const audio=project.chapters.find(c=>c.id===current.chapterId)?.audio;
   musicState=enter(musicState,audio?.music,`chapter:${current.chapterId}`,entry,{kind:'chapter',id:current.chapterId});
   ambienceState=enter(ambienceState,audio?.ambience,`chapter:${current.chapterId}`,entry,{kind:'chapter',id:current.chapterId});
   chapterId=current.chapterId;
  }
  musicState=enter(musicState,current.audio?.music,`cut:${id}`,entry,{kind:'cut',id});
  ambienceState=enter(ambienceState,current.audio?.ambience,`cut:${id}`,entry,{kind:'cut',id});
  if(collectEntries||entry===ids.length-1){
   const previous=previousId?lines.get(previousId):undefined;
   const entrySounds=(!previous||previous.chapterId!==current.chapterId)?project.chapters.find(c=>c.id===current.chapterId)?.audio?.sounds??[]:[];
   const cutSounds=current.audio?.sounds??[],reserved=new Set(cutSounds.map(sound=>sound.id));
   const chapterSounds=entrySounds.map((sound,index)=>{let soundId=`chapter:${index}:${sound.id.slice(0,160)}`;while(reserved.has(soundId))soundId+=':';reserved.add(soundId);return {cue:{...sound,id:soundId},source:{kind:'chapter' as const,id:current.chapterId}};});
   const sounds=[...chapterSounds,...cutSounds.map(cue=>({cue,source:{kind:'cut' as const,id}}))].filter(sound=>matches(sound.cue.branchCondition,entry)&&!resolveExcludedAudioAsset(sound.cue.assetId));
   result.push({lineId:id,music:{cue:musicState.cue,source:musicState.source,entryId:musicState.entryId},ambience:{cue:ambienceState.cue,source:ambienceState.source,entryId:ambienceState.entryId},sounds});
  }
  previousId=id;
 }
 return result;
}
/** Replay visited directives, not sequential source order: merges retain the chosen branch's music. */
export function compileStoryAudio(project:StoryProject,lineId:string,resolve:AudioAssetResolver,path?:readonly string[],choiceHistory:BranchChoiceHistory=[]):RuntimeAudio {
 const line=project.lines.find(item=>item.id===lineId);if(!line)throw new Error('오디오 컷을 찾을 수 없어요.');
 const ids=path?.length?path:[lineId];
 if(ids.at(-1)!==lineId)throw new Error('오디오 재생 경로와 현재 컷이 다릅니다.');
 const state=replayStoryAudioPath(project,ids,choiceHistory,false).at(-1);
 if(!state)return {version:1,music:{action:'stop',fadeOutMs:0},ambience:{action:'stop',fadeOutMs:0},sounds:[]};
 const musicState=state.music,ambienceState=state.ambience;
 return {version:1,music:music(musicState.cue,resolve,musicState.entryId),ambience:music(ambienceState.cue,resolve,ambienceState.entryId),sounds:state.sounds.map(({cue})=>({...sourceRange(cue),id:cue.id,audioPath:assetPath(cue.assetId,resolve),volume:cue.volume??1,delayMs:cue.delayMs??0}))};
}
/** Report unavailable service cues without altering the manuscript or substituting another sound. */
export function excludedStoryAudio(project:StoryProject):ExcludedAudioAsset[] {
 const ids=[...project.chapters,...project.lines].flatMap(node=>{
  const audio=node.audio;
  return [...(audio?.music?.action==='play'?[audio.music.assetId]:audio?.music?.action==='sequence'?audio.music.clips.map(clip=>clip.assetId):[]),...(audio?.ambience?.action==='play'?[audio.ambience.assetId]:audio?.ambience?.action==='sequence'?audio.ambience.clips.map(clip=>clip.assetId):[]),...(audio?.sounds??[]).map(sound=>sound.assetId)];
 });
 return [...new Set(ids)].flatMap(id=>{const asset=resolveExcludedAudioAsset(id);return asset?[asset]:[];});
}
/** Direct editor jumps use chapter defaults and preceding cut directives; playback supplies its real path. */
export function audioPreviewPath(project:StoryProject,lineId:string):string[] {
 const lines=new Map(project.lines.map(l=>[l.id,l]));const line=lines.get(lineId); if(!line)throw new Error('오디오 컷을 찾을 수 없어요.');
 const chapter=orderedStoryFlowLines(project).filter(l=>l.chapterId===line.chapterId);
 return chapter.slice(0,chapter.findIndex(l=>l.id===lineId)+1).map(l=>l.id);
}
/** audioPreviewPath for every cut at once, deriving each chapter's order only once (whole-work checks). */
export function audioPreviewPaths(project:StoryProject):ReadonlyMap<string,readonly string[]> {
 const lines=new Map(project.lines.map(l=>[l.id,l]));const ordered=orderedStoryFlowLines(project);
 const chapters=new Map<string,string[]>(),paths=new Map<string,string[]>();
 for(const [id,line] of lines){
  let chapter=chapters.get(line.chapterId);
  if(!chapter){chapter=ordered.filter(l=>l.chapterId===line.chapterId).map(l=>l.id);chapters.set(line.chapterId,chapter);}
  paths.set(id,chapter.slice(0,chapter.indexOf(id)+1));
 }
 return paths;
}
