import {isStoryScoreCondition,isStoryBranchCondition,type StoryScoreCondition,type StoryBranchCondition} from '@knolstory/story-domain';
import {storyScoreCondition,type StoryScoreValues} from './story-scores';
/** Eligibility primitive for the forthcoming visibility replay; not a persisted StoryLine field yet. */
export type SceneDisplayCondition={scores?:StoryScoreCondition;choices?:StoryBranchCondition};
export function isSceneDisplayCondition(value:unknown):value is SceneDisplayCondition{
 if(!value||typeof value!=='object'||Array.isArray(value))return false;
 const record=value as Record<string,unknown>;
 return Object.keys(record).every(key=>key==='scores'||key==='choices')
  &&(record.scores!==undefined||record.choices!==undefined)
  &&(!Object.hasOwn(record,'scores')||isStoryScoreCondition(record.scores))
  &&(!Object.hasOwn(record,'choices')||isStoryBranchCondition(record.choices));
}
/** Both categories must match; each category retains its authored all/any semantics. */
export function sceneDisplayConditionMatches(condition:SceneDisplayCondition|undefined,scores:StoryScoreValues,matchesChoice:(condition:StoryBranchCondition)=>boolean):boolean{
 if(!condition)return true;
 if(!isSceneDisplayCondition(condition))throw Error('컷을 보여 줄 조건을 확인해 주세요.');
 return storyScoreCondition(scores,condition.scores)&&(!condition.choices||matchesChoice(condition.choices));
}
