import {replayStoryVisits} from './scene-visits';
import {storyBranchConditionTerms,type StoryBranchChoice,type StoryBranchCondition,type StoryProject} from '@knolstory/story-domain';
export type BranchChoiceHistory=readonly Readonly<{pathIndex:number;choiceId:string}>[];
/** Index visits once so replay stays bounded even when a source is thousands of cuts upstream. */
export function createBranchConditionMatcher(path:readonly string[],choiceHistory:BranchChoiceHistory=[],project?:StoryProject):(condition:StoryBranchCondition|undefined,entryIndex:number)=>boolean {
 const visits=new Map<string,number[]>();
 const visible=project?new Set((project.lines.some(line=>line.visibility)?replayStoryVisits(project,{path,choiceHistory,lineId:path.at(-1)??null,status:'reading'},false).visits:path.map((lineId,pathIndex)=>({lineId,pathIndex,visible:true}))).filter(v=>v.visible).map(v=>v.pathIndex)):undefined;
 for(const [index,id] of path.entries())if(!visible||visible.has(index))visits.set(id,[...(visits.get(id)??[]),index]);
 const decisions=new Map<number,string|undefined>();
 const lines=project?new Map(project.lines.map(line=>[line.id,line])):undefined;
 for(const item of choiceHistory){
  const line=lines?.get(path[item.pathIndex]);
  const option=line?.flow?.type==='choice'&&!line.ending?.endsStory?line.flow.options.find(option=>option.id===item.choiceId):undefined;
  const valid=Number.isInteger(item.pathIndex)&&item.pathIndex>=0&&item.pathIndex<path.length-1&&typeof item.choiceId==='string'&&(!project||option!==undefined&&option.targetLineId===path[item.pathIndex+1]);
  decisions.set(item.pathIndex,decisions.has(item.pathIndex)||!valid?undefined:item.choiceId);
 }
 const matchesChoice=(condition:StoryBranchChoice,entryIndex:number)=>{
  const indices=visits.get(condition.sourceLineId)??[];
  let low=0,high=indices.length;
  while(low<high){const middle=Math.floor((low+high)/2);if(indices[middle]<=entryIndex)low=middle+1;else high=middle;}
  const sourceIndex=indices[low-1];
  return sourceIndex!==undefined&&sourceIndex<entryIndex&&decisions.get(sourceIndex)===condition.choiceId;
 };
 return (condition,entryIndex)=>{
  if(!condition)return true;
  const terms=storyBranchConditionTerms(condition);
  return 'mode' in condition&&condition.mode==='any'?terms.some(term=>matchesChoice(term,entryIndex)):terms.every(term=>matchesChoice(term,entryIndex));
 };
}
/** Only a completed decision at the latest actual source visit can authorize this entry. */
export function branchConditionMatches(condition:StoryBranchCondition|undefined,path:readonly string[],entryIndex:number,choiceHistory:BranchChoiceHistory=[]):boolean {
 return createBranchConditionMatcher(path,choiceHistory)(condition,entryIndex);
}
