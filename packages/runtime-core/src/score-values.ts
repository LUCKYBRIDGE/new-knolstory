import {STORY_SCORE_LIMIT,type StoryProject,type StoryScoreCondition,type StoryScoreTerm,type StoryScoreEffect} from '@knolstory/story-domain';
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
