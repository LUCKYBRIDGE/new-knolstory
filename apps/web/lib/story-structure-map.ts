import type {StoryProject} from '@knolstory/story-domain';
import type {FlowEdge,FlowNode,StoryFlowGraph} from '@knolstory/runtime-core';
import {edgeWords,shortPlace,type EdgeWords} from './story-connection-trail';

/**
 * The story's structure for the flow map: start, branch points and joins are blocks; the cuts that simply follow
 * one another between them fold into one run (‘2장A 1~2컷’). Built from the same read-only flow graph as every other
 * connection view — it never evaluates a reader's choices or scores, and two choices that reach the same cut stay two legs.
 */
export type StructureEnd=Readonly<
 {kind:'cut';lineId:string;place:string;role:'branch'|'join'|'start'|'cut'}|
 {kind:'ending';lineId:string;place:string}|
 {kind:'story-end'}|
 {kind:'pending'|'missing';lineId:string;place:string}|
 {kind:'loop';lineId:string;place:string}>;
export type StructureLeg=Readonly<{edgeId:string;mark?:string;words:EdgeWords;choiceId?:string;run:readonly string[];runLabel:string;end:StructureEnd}>;
export type StructureBlock=Readonly<{
 lineId:string;chapterId:string;place:string;excerpt:string;
 /** start: the first cut; branch: a choice or a score rule; join: several ways meet; detached: no way from the start. */
 roles:readonly ('start'|'branch'|'join'|'detached')[];
 incoming:number;legs:readonly StructureLeg[];
}>;
export type StructureMember=Readonly<{block:string;leg?:number;position?:number}>;
export type StoryStructure=Readonly<{blocks:readonly StructureBlock[];member:ReadonlyMap<string,StructureMember>}>;

const excerpt=(text:string)=>{const line=text.replace(/\s+/g,' ').trim();return line?line.length>40?`${line.slice(0,40)}…`:line:'아직 글이 없는 컷';};
/** ‘2장A 1~2컷’ when the run stays in one chapter in order, otherwise ‘2장A 3컷 ~ 3장 1컷’ (the map adds the count). */
export function runLabel(nodes:readonly FlowNode[]):string{
 if(!nodes.length)return '';
 const first=nodes[0]!,last=nodes[nodes.length-1]!;
 if(nodes.length===1)return shortPlace(first);
 const chapter=first.chapterLabel.split(' · ')[0];
 const sameChapter=nodes.every((node,index)=>node.chapterId===first.chapterId&&node.order===first.order+index);
 return sameChapter?`${chapter} ${first.order}~${last.order}컷`:`${shortPlace(first)} ~ ${shortPlace(last)}`;
}

export function storyStructure(project:StoryProject,graph:StoryFlowGraph):StoryStructure{
 const nodes=new Map(graph.nodes.map(node=>[node.lineId,node]));
 const branch=(node:FlowNode)=>node.kind==='choice'||node.outgoing.length>1;
 const key=new Set(graph.nodes.filter(node=>node.lineId===graph.startLineId||branch(node)||(node.shared&&node.kind!=='ending')).map(node=>node.lineId));
 const member=new Map<string,StructureMember>();
 // Ending cuts are where a way stops; they are not blocks of their own.
 const ended=new Set<string>();
 const blocks=new Map<string,StructureBlock>();
 const role=(node:FlowNode):'branch'|'join'|'start'|'cut'=>node.shared?'join':branch(node)?'branch':node.lineId===graph.startLineId?'start':'cut';
 const trace=(from:string,edge:FlowEdge):{run:string[];end:StructureEnd}=>{
  const run:string[]=[];
  if(edge.status==='ending')return {run,end:{kind:'story-end'}};
  const source=nodes.get(from)!;
  if(edge.status!=='connected'||!edge.targetLineId)return {run,end:{kind:edge.status==='pending'?'pending':'missing',lineId:from,place:shortPlace(source)}};
  const seen=new Set<string>();
  let current=nodes.get(edge.targetLineId);
  while(current){
   if(key.has(current.lineId))return {run,end:{kind:'cut',lineId:current.lineId,place:shortPlace(current),role:role(current)}};
   if(current.kind==='ending')return {run,end:{kind:'ending',lineId:current.lineId,place:shortPlace(current)}};
   // A run never crosses a cut it already walked, or one another block already owns (a way back into a run).
   if(seen.has(current.lineId)||member.has(current.lineId))return {run,end:{kind:'loop',lineId:current.lineId,place:shortPlace(current)}};
   seen.add(current.lineId);run.push(current.lineId);
   const next:FlowEdge|undefined=current.outgoing[0];
   if(!next||next.status==='ending')return {run,end:{kind:'story-end'}};
   if(next.status!=='connected'||!next.targetLineId)return {run,end:{kind:next.status==='pending'?'pending':'missing',lineId:current.lineId,place:shortPlace(current)}};
   current=nodes.get(next.targetLineId);
  }
  return {run,end:{kind:'story-end'}};
 };
 const build=(lineId:string)=>{
  const node=nodes.get(lineId)!;
  member.set(lineId,{block:lineId});
  const legs=node.outgoing.map((edge,index):StructureLeg=>{
   const {run,end}=trace(lineId,edge);
   run.forEach((id,position)=>member.set(id,{block:lineId,leg:index,position}));
   if(end.kind==='ending')ended.add(end.lineId);
   return {edgeId:edge.id,...(edge.kind==='choice'?{mark:String.fromCharCode(65+index)}:{}),words:edgeWords(project,edge),...(edge.choiceId?{choiceId:edge.choiceId}:{}),
    run,runLabel:runLabel(run.map(id=>nodes.get(id)!)),end};
  });
  blocks.set(lineId,{lineId,chapterId:node.chapterId,place:shortPlace(node),excerpt:excerpt(node.text),
   roles:[...(lineId===graph.startLineId?['start' as const]:[]),...(branch(node)?['branch' as const]:[]),...(node.shared?['join' as const]:[]),...(!node.reachable?['detached' as const]:[])],
   incoming:node.incoming.length,legs});
  return legs;
 };
 // Reading order: from the start through the blocks each leg reaches, then whatever the start cannot reach.
 const queue=graph.startLineId?[graph.startLineId]:[];
 const drain=()=>{for(let index=0;index<queue.length;index++){const id=queue[index]!;if(blocks.has(id))continue;for(const leg of build(id))if(leg.end.kind==='cut'&&!blocks.has(leg.end.lineId))queue.push(leg.end.lineId);}};
 drain();
 for(const node of graph.nodes){
  if(member.has(node.lineId)||ended.has(node.lineId))continue;
  key.add(node.lineId);queue.push(node.lineId);drain();
 }
 // Show blocks by how soon a reader can reach them (fewest cuts from the start); detached parts come last.
 const depth=new Map<string,number>(graph.startLineId?[[graph.startLineId,0]]:[]),walk=graph.startLineId?[graph.startLineId]:[];
 for(let index=0;index<walk.length;index++){const id=walk[index]!;for(const edge of nodes.get(id)!.outgoing)if(edge.status==='connected'&&edge.targetLineId&&!depth.has(edge.targetLineId)){depth.set(edge.targetLineId,depth.get(id)!+1);walk.push(edge.targetLineId);}}
 const built=[...blocks.values()];
 return {blocks:built.map((block,index)=>({block,index,depth:depth.get(block.lineId)??Number.POSITIVE_INFINITY})).sort((a,b)=>a.depth-b.depth||a.index-b.index).map(item=>item.block),member};
}
