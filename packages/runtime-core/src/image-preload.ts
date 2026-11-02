import {resolveAsset} from '@knolstory/asset-registry';
import {resolveStageComposition,type StoryLine,type StoryProject} from '@knolstory/story-domain';
import {advancePlayback,orderedLines,storyEffectSteps,type PlaybackState} from './story-runtime';
import {availableStoryChoices,playbackScores} from './story-scores';

export type ImagePreloadMode='upcoming'|'chapter'|'work'|'none';
export type ImagePreloadOptions=Readonly<{mode:ImagePreloadMode;cutCount:number}>;
const MODES:readonly ImagePreloadMode[]=['upcoming','chapter','work','none'];
const MAX_PROSPECTIVE_STATES=64;

/** Resolve the same inherited background and actors as compileStoryScene, without
 * interpreting text/audio or storing hypothetical reader progress. */
function lineImages(project:StoryProject,line:StoryLine):readonly string[]{
 const chapter=project.chapters.find(item=>item.id===line.chapterId);
 const stage=resolveStageComposition(chapter,line,project);
 const background=line.backgroundMode==='none'?'':line.backgroundId||chapter?.backgroundId||project.stageDefaults?.backgroundId||'';
 const ids=[background,...stage.leftActors.map(actor=>actor.assetId),...stage.rightActors.map(actor=>actor.assetId)].filter(Boolean);
 return ids.map(id=>{
  const asset=resolveAsset(id);
  if(!asset)throw Error(`이미지 자산을 찾을 수 없어요: ${id}`);
  return asset.runtimePath;
 });
}

function stateKey(state:PlaybackState,project:StoryProject):string{
 const latest=new Map<string,string>();
 for(const decision of state.choiceHistory??[])latest.set(state.path[decision.pathIndex]!,decision.choiceId);
 return JSON.stringify([state.lineId,state.status,playbackScores(project,state),[...latest]]);
}

function nextStates(project:StoryProject,state:PlaybackState):readonly PlaybackState[]{
 if(state.lineId===null||state.status==='pending'||state.status==='approval-required')return [];
 const total=storyEffectSteps(project,state).total;
 // Prediction may look past manual effects; only this copied state consumes them.
 const completed={...state,effectStep:total};
 const line=project.lines.find(item=>item.id===state.lineId);
 if(line?.flow?.type==='choice'&&!line.ending?.endsStory){
  return availableStoryChoices(project,line.id,state).flatMap(choice=>speculativeAdvance(project,completed,choice.id));
 }
 return speculativeAdvance(project,completed);
}

function speculativeAdvance(project:StoryProject,state:PlaybackState,choiceId?:string):readonly PlaybackState[]{
 try{return [advancePlayback(project,state,choiceId)];}
 catch{
  // A legal authored choice can fail only when taken (for example score
  // overflow). Prediction must not execute it or break the current reading.
  // Keep current-state validation and image resolution outside this boundary.
  return [];
 }
}

/** Sliding window over actual reachable cuts. Each eligible branch gets the same
 * future depth; a fixed state budget bounds nested choices and cyclic stories. */
function upcomingLines(project:StoryProject,initial:PlaybackState,count:number):readonly StoryLine[]{
 const lines=new Map(project.lines.map(line=>[line.id,line]));
 const queue:Readonly<{state:PlaybackState;depth:number}>[]=[{state:initial,depth:0}];
 const seen=new Set<string>(),result:StoryLine[]=[];
 for(let cursor=0;cursor<queue.length&&cursor<MAX_PROSPECTIVE_STATES;cursor++){
  const {state,depth}=queue[cursor]!;
  if(state.lineId===null)continue;
  const key=stateKey(state,project);if(seen.has(key))continue;seen.add(key);
  const line=lines.get(state.lineId);if(!line)throw Error('이야기 컷을 찾을 수 없어요.');
  result.push(line);
  if(depth>=count)continue;
  for(const next of nextStates(project,state)){
   if(queue.length>=MAX_PROSPECTIVE_STATES)break;
   queue.push({state:next,depth:depth+1});
  }
 }
 return result;
}

/** Ordered native image paths only; StoryDocument, branch choices and scores
 * remain exclusively in Core. N means future cut depth, excluding current. */
export function planStoryImagePreload(project:StoryProject,state:PlaybackState,options:ImagePreloadOptions):readonly string[]{
 if(!MODES.includes(options.mode)||!Number.isInteger(options.cutCount)||options.cutCount<1||options.cutCount>10)throw Error('이미지 미리 받기 설정을 확인해 주세요.');
 if(options.mode==='none'||state.lineId===null)return [];
 const current=project.lines.find(line=>line.id===state.lineId);
 if(!current)throw Error('이야기 컷을 찾을 수 없어요.');
 const candidates=options.mode==='upcoming'?upcomingLines(project,state,options.cutCount)
  :[current,...orderedLines(project).filter(line=>options.mode==='work'||line.chapterId===current.chapterId)];
 return [...new Set(candidates.flatMap(line=>lineImages(project,line)))];
}
