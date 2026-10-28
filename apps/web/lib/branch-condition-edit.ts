import {storyBranchConditionTerms,isStoryBranchCondition,type StoryBranchChoice,type StoryBranchCondition} from '@knolstory/story-domain';
function valid(value:StoryBranchCondition):StoryBranchCondition{
 if(!isStoryBranchCondition(value))throw Error('선택 조건이 중복되거나 올바르지 않아요. 서로 다른 선택을 최대 8개까지 지정해 주세요.');
 return value;
}
function requireIndex(terms:readonly StoryBranchChoice[],index:number){
 if(!Number.isInteger(index)||index<0||index>=terms.length)throw Error('수정할 선택 조건을 다시 골라 주세요.');
}
export function addBranchConditionChoice(value:StoryBranchCondition|undefined,choice:StoryBranchChoice):StoryBranchCondition{
 if(!value)return valid({...choice});
 return valid({mode:'mode' in value?value.mode:'all',terms:[...storyBranchConditionTerms(value),{...choice}]});
}
export function changeBranchConditionChoice(value:StoryBranchCondition,index:number,choice:StoryBranchChoice):StoryBranchCondition{
 const terms=storyBranchConditionTerms(value);requireIndex(terms,index);
 return valid('mode' in value?{...value,terms:terms.map((term,i)=>i===index?{...choice}:term)}:{...choice});
}
export function removeBranchConditionChoice(value:StoryBranchCondition,index:number):StoryBranchCondition|undefined{
 const terms=storyBranchConditionTerms(value);requireIndex(terms,index);
 const remaining=terms.filter((_,i)=>i!==index);
 return remaining.length?valid({mode:'mode' in value?value.mode:'all',terms:remaining}):undefined;
}
export function changeBranchConditionMode(value:StoryBranchCondition,mode:'all'|'any'):StoryBranchCondition{
 return valid({mode,terms:[...storyBranchConditionTerms(value)]});
}
