import {assetDisplayName,resolveAsset,resolveAudioAsset,resolveExcludedAudioAsset} from '@knolstory/asset-registry';
import {orderedStoryFlowLines,resolveStageComposition,PRESENTATION_EFFECTS,PRESENTATION_TRANSITIONS,PRESENTATION_LOOKS,type StoryProject,type StoryLine,type Chapter} from '@knolstory/story-domain';
import {resolveStoryAudioPath,resolveStoryPresentationPath} from '@knolstory/runtime-core';
export type CombinedTarget='music'|'ambience'|'sounds'|'effects'|'transition'|'look'|'motion'|'actors';
export type CombinedEditingEntry=Readonly<{key:string;label:string;startCutIndex:number;endCutIndex:number;sourceLineId?:string;sourceChapterId?:string;target:CombinedTarget;conditional:boolean;excludedAudio:boolean;assetId?:string;cueId?:string;cueIndex?:number;actorKey?:string}>;
export type CombinedEditingTrack=Readonly<{target:CombinedTarget;label:string;entries:readonly CombinedEditingEntry[]}>;
const labels:Record<CombinedTarget,string>={music:'배경음',ambience:'주변 소리',sounds:'효과음',effects:'효과',transition:'화면 전환',look:'화면 분위기',motion:'인물 움직임',actors:'인물'};
const audioName=(id:string)=>resolveExcludedAudioAsset(id)?.name??resolveAudioAsset(id)?.name??'소리 이름 확인 필요';
/** Source-order authoring overview. No selected route or inferred audio duration is represented. */
export function buildCombinedEditingTracks(project:StoryProject,chapterId:string):readonly CombinedEditingTrack[]{
 const chapter=project.chapters.find(c=>c.id===chapterId),cuts=orderedStoryFlowLines(project).filter(l=>l.chapterId===chapterId);
 const entries:Record<CombinedTarget,CombinedEditingEntry[]>={music:[],ambience:[],sounds:[],effects:[],transition:[],look:[],motion:[],actors:[]};
 const tracks=()=>Object.entries(labels).map(([target,label])=>({target:target as CombinedTarget,label,entries:entries[target as CombinedTarget].map(entry=>({...entry,key:JSON.stringify([entry.key,entry.startCutIndex])}))}));
 if(!chapter||!cuts.length)return tracks();
 const authoredNodes:readonly (Chapter|StoryLine)[]=[chapter,...cuts];
 // Authoring overviews keep hidden cuts and their authored commands available to edit.
 const previewProject={...project,lines:project.lines.map(line=>{const {visibility:_visibility,...rest}=line;return rest;})};
 const path=cuts.map(l=>l.id),audio=resolveStoryAudioPath(previewProject,path),presentation=resolveStoryPresentationPath(previewProject,path),positions=new Map(path.map((id,i)=>[id,i]));
 const append=(target:CombinedTarget,entry:Omit<CombinedEditingEntry,'target'|'conditional'|'excludedAudio'> & Partial<Pick<CombinedEditingEntry,'conditional'|'excludedAudio'>>,group=false)=>{
  const value:CombinedEditingEntry={target,conditional:false,excludedAudio:false,...entry};
  const previous=entries[target].at(-1);
  if(group&&previous&&previous.key===value.key&&previous.endCutIndex===value.startCutIndex-1)entries[target][entries[target].length-1]={...previous,endCutIndex:value.endCutIndex};
  else entries[target].push(value);
 };
 const owner=(kind:'chapter'|'cut',id:string)=>kind==='chapter'?{sourceChapterId:id}:{sourceLineId:id};
 const authoredEnd=(start:number,endLineId:string|undefined)=>Math.max(start,positions.get(endLineId??'')??cuts.length-1);
 for(const target of ['music','ambience'] as const){
  audio.forEach((state,i)=>{
   const {cue,source}=state[target];if(!cue||!source||cue.action!=='play')return;
   append(target,{key:JSON.stringify([target,source.kind,source.id,cue.assetId]),label:audioName(cue.assetId),startCutIndex:i,endCutIndex:i,...owner(source.kind,source.id),assetId:cue.assetId,excludedAudio:!!resolveExcludedAudioAsset(cue.assetId)},true);
  });
  for(const node of authoredNodes){
   const cue=node.audio?.[target];if(!cue||cue.action==='maintain')continue;
   const isChapter=node===chapter,start=isChapter?0:positions.get(node.id)!;
   if(cue.action==='stop'){append(target,{key:JSON.stringify([target,'stop',node.id]),label:`${labels[target]} 정지`,startCutIndex:start,endCutIndex:start,...owner(isChapter?'chapter':'cut',node.id)});continue;}
   if(cue.action!=='sequence'&&!cue.branchCondition)continue;
   let end=authoredEnd(start,cue.endLineId);
   for(let i=start;i<=end;i++){const next=cuts[i].audio?.[target];if((i>start||isChapter)&&next&&next.action!=='maintain'&&(next.action==='stop'||!next.branchCondition)){end=i-1;break;}}
   if(end>=start)append(target,{key:JSON.stringify([target,'conditional',node.id]),label:cue.action==='sequence'?`${cue.clips.length}개 음원 순서 재생`:audioName(cue.assetId),startCutIndex:start,endCutIndex:end,...owner(isChapter?'chapter':'cut',node.id),...(cue.action==='play'?{assetId:cue.assetId}:{}),conditional:!!cue.branchCondition,excludedAudio:cue.action==='sequence'?cue.clips.some(clip=>!!resolveExcludedAudioAsset(clip.assetId)):!!resolveExcludedAudioAsset(cue.assetId)});
  }
 }
 // Preserve original sound IDs; Core deliberately rewrites chapter sound runtime IDs.
 for(const node of authoredNodes)for(const [cueIndex,cue] of (node.audio?.sounds??[]).entries()){
  const isChapter=node===chapter,i=isChapter?0:positions.get(node.id)!,excludedAudio=!!resolveExcludedAudioAsset(cue.assetId);
  const canonical=audio[i].sounds.some(sound=>sound.source.id===node.id&&sound.source.kind===(isChapter?'chapter':'cut')&&sound.cue.assetId===cue.assetId);
  if(canonical||cue.branchCondition||excludedAudio)append('sounds',{key:JSON.stringify(['sounds',isChapter?'chapter':'cut',node.id,cueIndex]),label:audioName(cue.assetId),startCutIndex:i,endCutIndex:i,...owner(isChapter?'chapter':'cut',node.id),assetId:cue.assetId,cueId:cue.id,cueIndex,conditional:!!cue.branchCondition,excludedAudio});
 }
 // Group each origin separately so overlapping effects cannot interrupt each other's spans.
 const effectSpans=new Map<string,CombinedEditingEntry[]>();
 presentation.forEach((state,i)=>state.effects.forEach(({sourceLineId,cue})=>{
  const source=cuts[positions.get(sourceLineId)!],cueIndex=source.presentation?.effects?.indexOf(cue)??-1,key=JSON.stringify(['effects',sourceLineId,cueIndex]);
  const list=effectSpans.get(key)??[],last=list.at(-1),label=PRESENTATION_EFFECTS.find(e=>e.type===cue.type)?.label??'효과';
  if(last&&last.endCutIndex===i-1)list[list.length-1]={...last,endCutIndex:i};else list.push({key,label,startCutIndex:i,endCutIndex:i,sourceLineId,target:'effects',conditional:false,excludedAudio:false,cueId:cue.id,cueIndex});
  effectSpans.set(key,list);
 }));
 entries.effects.push(...[...effectSpans.values()].flat());
 cuts.forEach((line,i)=>{
  for(const [cueIndex,cue] of (line.presentation?.effects??[]).entries())if(cue.branchCondition){
   let end=cue.scope==='following'?authoredEnd(i,cue.endLineId):i;
   for(let n=i+1;n<=end;n++)if(cuts[n].presentation?.clearFollowingEffects||(cue.id&&cuts[n].presentation?.effects?.some(next=>next.id===cue.id&&!next.branchCondition))){end=n-1;break;}
   append('effects',{key:JSON.stringify(['effects','conditional',line.id,cueIndex]),label:PRESENTATION_EFFECTS.find(e=>e.type===cue.type)?.label??'효과',startCutIndex:i,endCutIndex:end,sourceLineId:line.id,cueId:cue.id,cueIndex,conditional:true});
  }
  if(line.presentation?.clearFollowingEffects)append('effects',{key:JSON.stringify(['clear',line.id]),label:'이전 효과 종료',startCutIndex:i,endCutIndex:i,sourceLineId:line.id});
  const point=(target:CombinedTarget,label:string)=>append(target,{key:JSON.stringify([target,line.id]),label,startCutIndex:i,endCutIndex:i,sourceLineId:line.id});
  if(line.presentation?.transition)point('transition',PRESENTATION_TRANSITIONS.find(t=>t.type===line.presentation!.transition!.type)?.label??'화면 전환');
  if(line.presentation?.look)point('look',PRESENTATION_LOOKS.find(t=>t.type===line.presentation!.look!.type)?.label??'화면 분위기');
  const stage=resolveStageComposition(chapter,line,project),actors=[...stage.leftActors,...stage.rightActors];
  if(actors.length||line.presentation?.actors)point('actors',actors.length?`인물 ${actors.length}명`:'인물 표현');
  for(const actor of actors)if(actor.motion)append('motion',{key:JSON.stringify(['motion',line.id,actor.key]),label:`${resolveAsset(actor.assetId)?assetDisplayName(resolveAsset(actor.assetId)!):'인물'} ${actor.motion.type==='move'?'이동':actor.motion.type==='fade-in'?'등장':'퇴장'}`,startCutIndex:i,endCutIndex:i,sourceLineId:line.id,assetId:actor.assetId,actorKey:actor.key});
 });
 return tracks();
}
