import {storyBranchConditionTerms,type StoryProject,type StoryBranchCondition} from '@knolstory/story-domain';
import {initialStoryScores,storyScoreCondition,applyStoryScoreEffects,type StoryScoreValues} from './score-values';
import type {PlaybackState} from './story-runtime';
export type StoryVisit=Readonly<{pathIndex:number;lineId:string;visible:boolean;scores:StoryScoreValues}>;
/** Replay structural visits without interpreting hidden cuts as decisions or chapter entries. */
export function replayStoryVisits(project:StoryProject,state:Pick<PlaybackState,'path'|'choiceHistory'|'lineId'|'status'>,requireExactChoices=true):Readonly<{visits:readonly StoryVisit[];scores:StoryScoreValues;matchesChoices:(condition:StoryBranchCondition)=>boolean}>{
 const lines=new Map(project.lines.map(line=>[line.id,line]));
 const decisions=new Map<number,string>();
 for(const item of state.choiceHistory??[]){if(!Number.isInteger(item.pathIndex)||item.pathIndex<0||item.pathIndex>=state.path.length||decisions.has(item.pathIndex))throw Error('저장된 선택 기록을 확인해 주세요.');decisions.set(item.pathIndex,item.choiceId);}
 let scores=initialStoryScores(project);
 const latest=new Map<string,string|undefined>(),visits:StoryVisit[]=[];
 const matches=(condition:StoryBranchCondition)=>{const terms=storyBranchConditionTerms(condition),test=(term:typeof terms[number])=>latest.get(term.sourceLineId)===term.choiceId;return 'mode' in condition&&condition.mode==='any'?terms.some(test):terms.every(test);};
 for(const [pathIndex,lineId] of state.path.entries()){
  const line=lines.get(lineId);if(!line)throw Error('이야기 컷을 찾을 수 없어요.');
  const visible=storyScoreCondition(scores,line.visibility?.scores)&&(!line.visibility?.choices||matches(line.visibility.choices));
  visits.push({pathIndex,lineId,visible,scores});
  const decision=decisions.get(pathIndex);
  if(!visible){if(decision!==undefined)throw Error('표시하지 않은 컷에 선택 기록이 있어요.');continue;}
  latest.set(lineId,undefined);
  const completed=pathIndex<state.path.length-1||state.lineId===null&&state.status==='ended';
  if(!completed){if(decision!==undefined)throw Error('아직 고르지 않은 선택 기록이 있어요.');continue;}
  if(decision===undefined){if(requireExactChoices&&!line.ending?.endsStory&&line.flow?.type==='choice'&&line.flow.options.some(option=>option.condition||option.effects?.length))throw Error('점수 이야기를 복원할 정확한 선택 기록이 없어요.');continue;}
  const option=!line.ending?.endsStory&&line.flow?.type==='choice'?line.flow.options.find(option=>option.id===decision):undefined;
  if(!option||option.targetLineId!==(state.path[pathIndex+1]??null)||!storyScoreCondition(scores,option.condition))throw Error('저장된 선택 기록을 확인해 주세요.');
  latest.set(lineId,decision);scores=applyStoryScoreEffects(scores,option.effects);
 }
 return {visits,scores,matchesChoices:matches};
}
export function visibleStoryPathIndices(project:StoryProject,state:Pick<PlaybackState,'path'|'choiceHistory'|'lineId'|'status'>):readonly number[]{return replayStoryVisits(project,state).visits.filter(visit=>visit.visible).map(visit=>visit.pathIndex);}
