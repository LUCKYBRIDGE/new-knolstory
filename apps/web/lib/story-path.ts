import {orderedStoryFlowLines,type StoryProject} from '@knolstory/story-domain';
type Line=StoryProject['lines'][number];
/** Reading-order neighbours of a cut, following choices and jumps rather than stored order. */
export type NextStep=Readonly<{kind:'next';lineId:string}>|Readonly<{kind:'choice';options:readonly {id:string;label:string;lineId:string|null}[]}>|Readonly<{kind:'routes';lineId:string|null;routes:readonly {id:string;lineId:string|null}[]}>|Readonly<{kind:'end'}>|Readonly<{kind:'pending'}>;
export function hasBranches(project:StoryProject){return project.lines.some(line=>line.flow?.type==='choice'||line.flow?.type==='goto');}
function step(line:Line,next:Line|undefined):NextStep{
 if(line.ending?.endsStory)return {kind:'end'};
 const flow=line.flow;
 if(!flow)return next?{kind:'next',lineId:next.id}:{kind:'end'};
 if(flow.type==='choice')return {kind:'choice',options:flow.options.map(option=>({id:option.id,label:option.label,lineId:option.targetLineId||null}))};
 if(flow.routes?.length)return {kind:'routes',lineId:flow.targetLineId||null,routes:flow.routes.map(route=>({id:route.id,lineId:route.targetLineId||null}))};
 if(flow.targetLineId===null)return {kind:'end'};
 if(flow.targetLineId==='')return {kind:'pending'};
 return {kind:'next',lineId:flow.targetLineId};
}
const targets=(next:NextStep)=>next.kind==='next'?[next.lineId]:next.kind==='choice'?next.options.map(option=>option.lineId):next.kind==='routes'?[next.lineId,...next.routes.map(route=>route.lineId)]:[];
/** One pass over the story; reuse the result while the project object is unchanged. */
export function storyPaths(project:StoryProject){
 const ordered=orderedStoryFlowLines(project),nexts=new Map<string,NextStep>(),previous=new Map<string,string[]>();
 ordered.forEach((line,at)=>{const next=step(line,ordered[at+1]);nexts.set(line.id,next);for(const target of targets(next))if(target)previous.set(target,[...new Set([...(previous.get(target)??[]),line.id])]);});
 return {next:(lineId:string):NextStep=>nexts.get(lineId)??{kind:'end'},previous:(lineId:string):readonly string[]=>previous.get(lineId)??[]};
}
