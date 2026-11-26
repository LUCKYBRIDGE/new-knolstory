import type {StoryProject} from '@knolstory/story-domain';
import {findUpstreamBranches,type FlowEdge,type FlowNode,type StoryFlowGraph} from '@knolstory/runtime-core';
import {describeScoreCondition} from './story-connection-labels';

/** A cut's short place, e.g. "2장A 1컷" (the chapter title stays in the longer labels). */
export function shortPlace(node:Pick<FlowNode,'chapterLabel'|'order'>):string{
 return `${node.chapterLabel.split(' · ')[0]} ${node.order}컷`;
}
const excerpt=(text:string,length=36)=>{const line=text.replace(/\s+/g,' ').trim();return line?line.length>length?`${line.slice(0,length)}…`:line:'아직 글이 없는 컷';};

/** How one authored connection reads in a short list: the choice text or the rule, and its score condition. */
export type EdgeWords=Readonly<{label:string;condition?:string}>;
export function edgeWords(project:StoryProject,edge:FlowEdge):EdgeWords{
 const source=project.lines.find(line=>line.id===edge.sourceLineId);
 if(edge.choiceId){
  const choice=source?.flow?.type==='choice'?source.flow.options.find(option=>option.id===edge.choiceId):undefined;
  if(!choice)return {label:'선택 내용을 확인해 주세요'};
  const text=choice.label.trim()||'이름 없는 선택지';
  // Choices written as dialogue already carry their own quotes.
  return {label:/^[“"‘'「『]/u.test(text)?text:`‘${text}’`,...(choice.condition?{condition:`${describeScoreCondition(project,choice.condition)}일 때만`}:{})};
 }
 if(edge.routeId){
  const route=source?.flow?.type==='goto'?source.flow.routes?.find(item=>item.id===edge.routeId):undefined;
  return route?{label:'점수 조건',condition:`${describeScoreCondition(project,route.condition)}일 때`}:{label:'점수 조건을 확인해 주세요'};
 }
 if(source?.flow?.type==='goto')return source.flow.routes?.length?{label:'조건이 맞지 않으면'}:{label:'이동'};
 return {label:'순서대로'};
}

export type TrailStep=Readonly<{
 edgeId:string;mark?:string;words:EdgeWords;status:FlowEdge['status'];
 /** The cut at the other end (the destination for ways out, the source for ways in). */
 lineId?:string;place?:string;excerpt?:string;ending?:boolean;choiceId?:string;
}>;
export type TrailBranch=Readonly<{lineId:string;place:string;excerpt:string;routes:readonly {words:EdgeWords;distance:number}[]}>;
export type ConnectionTrail=Readonly<{
 lineId:string;place:string;
 /** Where the cut stands in the story: 시작, 갈림길, 다시 만나는 곳, 이야기 끝, 이어지는 길 없음. */
 marks:readonly string[];
 /** Branch points this cut can be reached from, nearest first (authored links, not a reader's path). */
 upstream:readonly TrailBranch[];
 /** Ways in, listed when several ways meet here or a way in has a condition. */
 incoming:readonly TrailStep[];
 outgoing:readonly TrailStep[];
 warning:boolean;
}>;

/** Read-only summary of the authored links around one cut. It never evaluates a reader's choices or scores. */
export function connectionTrail(project:StoryProject,graph:StoryFlowGraph,lineId:string):ConnectionTrail|null{
 const nodes=new Map(graph.nodes.map(node=>[node.lineId,node]));
 const node=nodes.get(lineId);if(!node)return null;
 const step=(edge:FlowEdge,index:number,incoming:boolean):TrailStep=>{
  const other=nodes.get(incoming?edge.sourceLineId:edge.targetLineId??'');
  const shown=incoming||edge.status==='connected';
  return {edgeId:edge.id,...(!incoming&&edge.kind==='choice'?{mark:String.fromCharCode(65+index)}:{}),words:edgeWords(project,edge),status:edge.status,
   ...(edge.choiceId?{choiceId:edge.choiceId}:{}),
   ...(other&&shown?{lineId:other.lineId,place:shortPlace(other),excerpt:excerpt(other.text),ending:other.kind==='ending'}:{})};
 };
 const ways=node.incoming.map((edge,index)=>step(edge,index,true));
 const conditionalIn=node.incoming.some(edge=>edge.conditional||edge.routeId!==undefined);
 const marks=[
  ...(graph.startLineId===node.lineId?['시작']:[]),
  ...(node.kind==='choice'||node.outgoing.length>1?['갈림길']:[]),
  ...(node.shared?[`${node.incoming.length}갈래가 만나는 곳`]:[]),
  ...(node.kind==='ending'?['이야기 끝']:[]),
  ...(!node.reachable?['시작부터 이어지는 길 없음']:[]),
 ];
 return {
  lineId:node.lineId,place:shortPlace(node),marks,
  upstream:findUpstreamBranches(graph,node.lineId).map(branch=>({lineId:branch.node.lineId,place:shortPlace(branch.node),excerpt:excerpt(branch.node.text),
   routes:branch.routes.map(route=>({words:edgeWords(project,route.edge),distance:route.distance}))})),
  incoming:node.shared||conditionalIn?ways:[],
  outgoing:node.outgoing.map((edge,index)=>step(edge,index,false)),
  warning:node.outgoing.some(edge=>edge.status==='pending'||edge.status==='missing')||!node.reachable,
 };
}
