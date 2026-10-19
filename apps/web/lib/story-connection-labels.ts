import {chapterLabel,type StoryProject,type StoryScoreCondition} from '@knolstory/story-domain';
import {analyzeStoryFlow,type FlowEdge} from '@knolstory/runtime-core';
const comparisons={eq:'같음',ne:'다름',gt:'초과',gte:'이상',lt:'미만',lte:'이하'} as const;
/** Describe authored rules only; this does not evaluate a reader's score or path. */
export function describeScoreCondition(project:StoryProject,condition:StoryScoreCondition):string{
 if(!condition.terms.length)return '점수 조건을 확인해 주세요';
 return condition.terms.map(term=>`${project.scores?.find(score=>score.id===term.scoreId)?.name??'확인이 필요한 점수'} ${term.value}점 ${comparisons[term.operator]}`).join(condition.mode==='any'?' 또는 ':' 그리고 ');
}
export function describeStoryEdge(project:StoryProject,edge:FlowEdge):string{
 const source=project.lines.find(line=>line.id===edge.sourceLineId);
 const chapter=project.chapters.find(item=>item.id===source?.chapterId);
 const location=source&&chapter?`${chapterLabel(chapter)} · ${source.order}컷에서`:'위치를 확인해야 하는 컷에서';
 if(edge.choiceId){
  const choice=source?.flow?.type==='choice'?source.flow.options.find(option=>option.id===edge.choiceId):undefined;
  return choice?`${location} ‘${choice.label||'아직 이름 없는 선택지'}’를 선택하면${choice.condition?` · ${describeScoreCondition(project,choice.condition)}일 때`:''}`:`${location} · 선택 내용을 확인해 주세요`;
 }
 if(edge.routeId){
  const route=source?.flow?.type==='goto'?source.flow.routes?.find(item=>item.id===edge.routeId):undefined;
  return route?`${location} ${describeScoreCondition(project,route.condition)}일 때`:`${location} · 점수 조건을 확인해 주세요`;
 }
 if(source?.flow?.type==='goto')return source.flow.routes?.length?`${location} 어느 점수 조건에도 해당하지 않으면`:`${location} 이 컷으로 이동하도록 정했어요`;
 return `${location} 순서대로 이어져요`;
}
export function incomingStoryConnections(project:StoryProject,lineId:string):readonly {id:string;label:string;kind:FlowEdge['kind']}[]{
 return analyzeStoryFlow(project).edges.filter(edge=>edge.sourceLineId!==lineId&&edge.targetLineId===lineId).map(edge=>({id:edge.id,label:describeStoryEdge(project,edge),kind:edge.kind}));
}
