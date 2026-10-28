import {isStoryScoreCondition,type StoryScoreCondition} from './story-scores';
import {isStoryBranchCondition,type StoryBranchCondition} from './story-branch-condition';
export type StorySceneVisibility={scores?:StoryScoreCondition;choices?:StoryBranchCondition};
export function isStorySceneVisibility(value:unknown):value is StorySceneVisibility{
 if(!value||typeof value!=='object'||Array.isArray(value))return false;
 const record=value as Record<string,unknown>;
 return Object.keys(record).every(key=>key==='scores'||key==='choices')&&(record.scores!==undefined||record.choices!==undefined)
 &&(!Object.hasOwn(record,'scores')||isStoryScoreCondition(record.scores))&&(!Object.hasOwn(record,'choices')||isStoryBranchCondition(record.choices));
}
