import {resolveAudioAsset,resolveExcludedAudioAsset} from '@knolstory/asset-registry';
import {orderedStoryFlowLines,PRESENTATION_EFFECTS,presentationLabel,type StoryProject} from '@knolstory/story-domain';
import {resolveStoryAudioPath,resolveStoryPresentationPath,type StoryAudioCueState} from '@knolstory/runtime-core';
export type EditorRangeSummary=Readonly<{audio:string;direction:string}>;
/** Editor-order summaries, never an assertion about the reader's eventual choice path. */
export function buildEditorRangeSummaries(project:StoryProject):Map<string,EditorRangeSummary>{
 const result=new Map<string,EditorRangeSummary>();
 // Authoring summaries retain every cut, including cuts hidden on a particular reading route.
 const previewProject={...project,lines:project.lines.map(line=>{const {visibility:_visibility,...rest}=line;return rest;})};
 const ordered=orderedStoryFlowLines(project),locations=new Map<string,string>();
 const chapters=new Map(project.chapters.map(chapter=>[chapter.id,chapter]));
 for(const chapter of project.chapters){const cuts=ordered.filter(line=>line.chapterId===chapter.id);cuts.forEach((line,index)=>locations.set(line.id,`${chapter.title} ${index+1}컷`));}
 const at=(id:string)=>locations.get(id)??'위치 확인 필요';
 const audioName=(id:string)=>resolveExcludedAudioAsset(id)?.name??resolveAudioAsset(id)?.name??'소리 이름 확인 필요';
 const channel=(name:string,state:StoryAudioCueState)=>{
  const cue=state.cue,source=state.source;
  if(!cue)return `${name} 없음`;
  const origin=source?.kind==='chapter'?`${chapters.get(source.id)?.title??'장'} 기본`:source?at(source.id):'';
  if(cue.action==='play'&&resolveExcludedAudioAsset(cue.assetId))return `${name} ${audioName(cue.assetId)} · 재생 제외`;
  if(cue.action==='sequence')return `${name} ${cue.clips.length}개 음원 순서 재생${cue.clips.some(clip=>resolveExcludedAudioAsset(clip.assetId))?' · 재생 제외 음원 있음':''}${origin?` · ${origin}${source?.kind==='cut'?'부터':''}`:''}${cue.endLineId?` · ${at(cue.endLineId)}까지`:''}`;
  if(cue.action!=='play')return `${name} 정지${origin?` · ${origin}에서`:''}`;
  return `${name} ${audioName(cue.assetId)}${origin?` · ${origin}${source?.kind==='cut'?'부터':''}`:''}${cue.endLineId?` · ${at(cue.endLineId)}까지`:''}`;
 };
 for(const chapter of project.chapters){
  const cuts=ordered.filter(line=>line.chapterId===chapter.id),path=cuts.map(line=>line.id);
  const audio=resolveStoryAudioPath(previewProject,path),presentation=resolveStoryPresentationPath(previewProject,path);
  // A preview has no selected choice history. Keep that limitation explicit rather than inventing a branch.
  const conditionalAudio=[chapter,...cuts].some(node=>(node.audio?.music?.action==='play'||node.audio?.music?.action==='sequence')&&node.audio.music.branchCondition||(node.audio?.ambience?.action==='play'||node.audio?.ambience?.action==='sequence')&&node.audio.ambience.branchCondition||node.audio?.sounds?.some(cue=>cue.branchCondition));
  const conditionalEffects=cuts.some(line=>line.presentation?.effects?.some(cue=>cue.branchCondition));
  for(const [index,line] of cuts.entries()){
   const state=audio[index]!,effects=presentation[index]!.effects;
   const sounds=state.sounds.length?`효과음 ${state.sounds.map(({cue,source})=>`${audioName(cue.assetId)}${source.kind==='chapter'?` · ${chapters.get(source.id)?.title??'장'} 시작`:''}`).join(', ')}`:'';
   const audioText=[channel('배경음',state.music),channel('주변 소리',state.ambience),sounds,conditionalAudio?'선택에 따라 달라져요':'',cuts.some(cut=>cut.visibility)?'컷 표시 조건에 따라 달라져요':''].filter(Boolean).join(' / ');
   const local=presentationLabel({...line.presentation,effects:undefined});
   const inherited=effects.map(({sourceLineId,cue})=>{
    const name=PRESENTATION_EFFECTS.find(item=>item.type===cue.type)?.label.replace(/^[^가-힣A-Za-z]+/u,'')??'효과';
    return `${name} · ${sourceLineId===line.id?'이 컷에서 시작':`${at(sourceLineId)}부터`}${cue.endLineId?` · ${at(cue.endLineId)}까지`:cue.scope==='following'?' · 다음 컷으로 이어짐':''}`;
   });
   const directionText=[local==='없음'?'':local,...inherited,line.presentation?.clearFollowingEffects?'이전 효과 종료':'',conditionalEffects?'선택에 따라 달라져요':'',cuts.some(cut=>cut.visibility)?'컷 표시 조건에 따라 달라져요':''].filter(Boolean).join(' / ')||'연출 없음';
   result.set(line.id,{audio:audioText,direction:directionText});
  }
 }
 return result;
}
