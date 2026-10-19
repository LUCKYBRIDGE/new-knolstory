import {STORY_SCORE_LIMIT,type StoryProject,type StoryScoreCondition,type StoryScoreTerm,type StoryScoreEffect} from '@knolstory/story-domain';
import type {PlaybackState} from './story-runtime';
export type StoryScoreValues=Readonly<Record<string,number>>;
type Condition=Readonly<Omit<StoryScoreCondition,'terms'>>&Readonly<{terms:readonly Readonly<StoryScoreTerm>[]}>;
type Effect=Readonly<StoryScoreEffect>;
export function checkedStoryScore(value:number):number{
 if(!Number.isSafeInteger(value)||Math.abs(value)>STORY_SCORE_LIMIT)throw new Error('이야기 점수는 -1,000,000부터 1,000,000까지 정수여야 해요.');
 return value;
}
export function initialStoryScores(project:StoryProject):StoryScoreValues{
 return Object.fromEntries((project.scores??[]).map(score=>[score.id,checkedStoryScore(score.initial)]));
}
function scoreValue(values:StoryScoreValues,id:string):number{
 if(!Object.hasOwn(values,id))throw new Error(`이야기 점수 항목을 찾을 수 없어요: ${id}`);
 return checkedStoryScore(values[id]);
}
export function storyScoreCondition(values:StoryScoreValues,condition?:Condition):boolean{
 if(!condition)return true;
 if(!condition.terms.length||!['all','any'].includes(condition.mode))throw new Error('점수 조건을 확인해 주세요.');
 const results=condition.terms.map(term=>{
  const actual=scoreValue(values,term.scoreId),value=checkedStoryScore(term.value);
  switch(term.operator){case 'eq':return actual===value;case 'ne':return actual!==value;case 'gt':return actual>value;case 'gte':return actual>=value;case 'lt':return actual<value;case 'lte':return actual<=value;default:throw new Error('점수 비교 조건을 확인해 주세요.');}
 });
 return condition.mode==='all'?results.every(Boolean):results.some(Boolean);
}
export function applyStoryScoreEffects(values:StoryScoreValues,effects:readonly Effect[]=[]):StoryScoreValues{
 return effects.reduce<StoryScoreValues>((current,effect)=>{
  const before=scoreValue(current,effect.scoreId),value=checkedStoryScore(effect.value);
  if(effect.operation!=='add'&&effect.operation!=='set')throw new Error('점수 변경 방법을 확인해 주세요.');
  return {...current,[effect.scoreId]:checkedStoryScore(effect.operation==='add'?before+value:value)};
 },values);
}
/** State is derived from authored defaults and recorded decisions, never a second saved source of truth. */
export function playbackScores(project:StoryProject,state:Pick<PlaybackState,'path'|'choiceHistory'|'lineId'|'status'>):StoryScoreValues{
 const history=(state.choiceHistory??[]).slice().sort((a,b)=>a.pathIndex-b.pathIndex);
 const seen=new Set<number>();
 for(const entry of history){
  const completed=entry.pathIndex<state.path.length-1 || state.lineId===null&&state.status==='ended'&&entry.pathIndex===state.path.length-1;
  if(!Number.isInteger(entry.pathIndex)||entry.pathIndex<0||!completed||seen.has(entry.pathIndex))throw new Error('점수를 계산할 선택 기록을 확인해 주세요.');
  seen.add(entry.pathIndex);
 }
 for(const [index,id] of state.path.entries()){
  const line=project.lines.find(item=>item.id===id);
  const completed=index<state.path.length-1 || state.lineId===null&&state.status==='ended';
  if(completed&&!line?.ending?.endsStory&&line?.flow?.type==='choice'&&line.flow.options.some(option=>option.condition||option.effects?.length)&&!seen.has(index))throw new Error('점수 이야기를 복원할 정확한 선택 기록이 없어요.');
 }
 return history.reduce<StoryScoreValues>((values,entry)=>{
  const line=project.lines.find(item=>item.id===state.path[entry.pathIndex]);
  const option=line?.flow?.type==='choice'?line.flow.options.find(item=>item.id===entry.choiceId):undefined;
  const destination=state.path[entry.pathIndex+1]??null;
  if(!option||option.targetLineId!==destination)throw new Error('점수를 계산할 선택 기록을 확인해 주세요.');
  if(!storyScoreCondition(values,option.condition))throw new Error('저장된 선택이 현재 점수 조건을 만족하지 않아요.');
  return applyStoryScoreEffects(values,option.effects);
 },initialStoryScores(project));
}
export function availableStoryChoices(project:StoryProject,lineId:string,state?:PlaybackState){
 const line=project.lines.find(item=>item.id===lineId);
 const values=state?playbackScores(project,state):initialStoryScores(project);
 return line?.flow?.type==='choice'?line.flow.options.filter(option=>storyScoreCondition(values,option.condition)):[];
}
