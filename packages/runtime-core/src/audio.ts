import { orderedStoryFlowLines, type StoryProject, type StoryMusicCue } from '@knolstory/story-domain';
import { isRuntimeAudioPath, type RuntimeAudio, type RuntimeMusic } from '@knolstory/runtime-contract';
export type AudioAssetResolver = (id:string) => Readonly<{runtimePath:string}> | undefined;
function music(cue:StoryMusicCue|undefined, resolve:AudioAssetResolver):RuntimeMusic {
 if(!cue || cue.action==='maintain')return {action:'stop',fadeOutMs:0};
 if(cue.action==='stop')return {action:'stop',fadeOutMs:cue.fadeOutMs??0};
 return {action:'play',audioPath:assetPath(cue.assetId,resolve),volume:cue.volume??1,loop:cue.loop??true,fadeInMs:cue.fadeInMs??0,fadeOutMs:cue.fadeOutMs??0};
}
function assetPath(id:string, resolve:AudioAssetResolver) {
 const asset=resolve(id); if(!asset)throw new Error(`오디오 자산을 찾을 수 없어요: ${id}`);
 if(!isRuntimeAudioPath(asset.runtimePath))throw new Error(`오디오 경로를 확인해 주세요: ${id}`);
 return asset.runtimePath;
}
/** Replay visited directives, not sequential source order: merges retain the chosen branch's music. */
export function compileStoryAudio(project:StoryProject,lineId:string,resolve:AudioAssetResolver,path?:readonly string[]):RuntimeAudio {
 const lines=new Map(project.lines.map(l=>[l.id,l]));const line=lines.get(lineId); if(!line)throw new Error('오디오 컷을 찾을 수 없어요.');
 const ids=path?.length?path:[lineId];
 if(ids.at(-1)!==lineId)throw new Error('오디오 재생 경로와 현재 컷이 다릅니다.');
 let cue:StoryMusicCue|undefined;
 let ambience:StoryMusicCue|undefined;
 let chapterId:string|undefined;
 for(const id of ids) {
  const current=lines.get(id); if(!current)throw new Error('오디오 재생 경로의 컷을 찾을 수 없어요.');
  if(current.chapterId!==chapterId) {
   const defaultCue=project.chapters.find(c=>c.id===current.chapterId)?.audio?.music;
   const defaultAmbience=project.chapters.find(c=>c.id===current.chapterId)?.audio?.ambience;
   if(defaultAmbience && defaultAmbience.action!=='maintain')ambience=defaultAmbience;
   if(defaultCue && defaultCue.action!=='maintain')cue=defaultCue;
   chapterId=current.chapterId;
  }
  if(current.audio?.ambience && current.audio.ambience.action!=='maintain')ambience=current.audio.ambience;
  if(current.audio?.music && current.audio.music.action!=='maintain')cue=current.audio.music;
 }
 const previous=project.lines.find(l=>l.id===ids.at(-2));
 const entrySounds=(!previous||previous.chapterId!==line.chapterId)?project.chapters.find(c=>c.id===line.chapterId)?.audio?.sounds??[]:[];
 const cutSounds=line.audio?.sounds??[];
 const reserved=new Set(cutSounds.map(s=>s.id));
 const chapterSounds=entrySounds.map((sound,index)=>{let id=`chapter:${index}:${sound.id.slice(0,160)}`;while(reserved.has(id))id+=':';reserved.add(id);return {...sound,id};});
 return {version:1,music:music(cue,resolve),ambience:music(ambience,resolve),sounds:[...chapterSounds,...cutSounds].map(s=>({id:s.id,audioPath:assetPath(s.assetId,resolve),volume:s.volume??1,delayMs:s.delayMs??0}))};
}
/** Direct editor jumps use chapter defaults and preceding cut directives; playback supplies its real path. */
export function audioPreviewPath(project:StoryProject,lineId:string):string[] {
 const lines=new Map(project.lines.map(l=>[l.id,l]));const line=lines.get(lineId); if(!line)throw new Error('오디오 컷을 찾을 수 없어요.');
 const chapter=orderedStoryFlowLines(project).filter(l=>l.chapterId===line.chapterId);
 return chapter.slice(0,chapter.findIndex(l=>l.id===lineId)+1).map(l=>l.id);
}
