import {chapterLabel,type StoryProject} from '@knolstory/story-domain';
import type {StoryFlowGraph} from '@knolstory/runtime-core';
/**
 * The story at chapter scale: one node per chapter, arrows where reading moves between chapters.
 * Columns follow reading depth (longest path from the start), not stored order, so long branching
 * works stay readable: forks, rejoins and endings show at a glance.
 */
export type ChapterNode=Readonly<{id:string;label:string;cutCount:number;firstLineId:string;start:boolean;reachable:boolean;fork:boolean;merge:boolean;ending:boolean;depth:number;row:number}>;
export type ChapterEdge=Readonly<{id:string;source:string;target:string;labels:readonly string[];choice:boolean;back:boolean}>;
export type ChapterFlow=Readonly<{nodes:readonly ChapterNode[];edges:readonly ChapterEdge[];columns:number;rows:number}>;
export function chapterFlow(project:StoryProject,graph:StoryFlowGraph):ChapterFlow{
 const chapterOf=new Map(graph.nodes.map(node=>[node.lineId,node.chapterId]));
 const cuts=new Map<string,typeof graph.nodes[number][]>();
 for(const node of graph.nodes)cuts.set(node.chapterId,[...(cuts.get(node.chapterId)??[]),node]);
 const ids=project.chapters.filter(chapter=>cuts.has(chapter.id)).map(chapter=>chapter.id);
 const edgeMap=new Map<string,{source:string;target:string;labels:string[];choice:boolean}>();
 for(const edge of graph.edges){
  if(edge.status!=='connected'||!edge.targetLineId)continue;
  const source=chapterOf.get(edge.sourceLineId),target=chapterOf.get(edge.targetLineId);
  if(!source||!target||source===target)continue;
  const key=`${source}>${target}`,entry=edgeMap.get(key)??{source,target,labels:[],choice:false};
  if(edge.kind==='choice'){entry.choice=true;if(edge.label&&!entry.labels.includes(edge.label))entry.labels.push(edge.label);}
  edgeMap.set(key,entry);
 }
 const out=new Map<string,string[]>(),incoming=new Map<string,Set<string>>();
 for(const edge of edgeMap.values()){out.set(edge.source,[...(out.get(edge.source)??[]),edge.target]);incoming.set(edge.target,(incoming.get(edge.target)??new Set()).add(edge.source));}
 const startChapter=graph.startLineId?chapterOf.get(graph.startLineId):ids[0];
 // Back edges (loops to an earlier chapter) are found by depth-first search from the start and ignored for depth.
 const back=new Set<string>(),state=new Map<string,1|2>();
 const visit=(id:string)=>{const stack:[string,number][]=[[id,0]];state.set(id,1);
  while(stack.length){const top=stack[stack.length-1]!;const targets=out.get(top[0])??[];
   if(top[1]>=targets.length){state.set(top[0],2);stack.pop();continue;}
   const target=targets[top[1]++]!;
   if(state.get(target)===1)back.add(`${top[0]}>${target}`);else if(!state.has(target)){state.set(target,1);stack.push([target,0]);}}};
 if(startChapter)visit(startChapter);
 for(const id of ids)if(!state.has(id))visit(id);
 // Longest-path depth over the remaining acyclic graph (Kahn order).
 const depth=new Map(ids.map(id=>[id,0])),remaining=new Map(ids.map(id=>[id,0]));
 for(const edge of edgeMap.values())if(!back.has(`${edge.source}>${edge.target}`))remaining.set(edge.target,(remaining.get(edge.target)??0)+1);
 const queue=ids.filter(id=>remaining.get(id)===0);
 for(let at=0;at<queue.length;at++){const id=queue[at]!;for(const target of out.get(id)??[]){if(back.has(`${id}>${target}`))continue;depth.set(target,Math.max(depth.get(target)!,depth.get(id)!+1));remaining.set(target,remaining.get(target)!-1);if(remaining.get(target)===0)queue.push(target);}}
 const reachable=new Set<string>();if(startChapter){const walk=[startChapter];while(walk.length){const id=walk.pop()!;if(reachable.has(id))continue;reachable.add(id);walk.push(...(out.get(id)??[]));}}
 // Unreachable chapters go after the story so they never look like part of a path.
 const last=Math.max(0,...ids.filter(id=>reachable.has(id)).map(id=>depth.get(id)!));
 for(const id of ids)if(!reachable.has(id))depth.set(id,last+1);
 // Rows: order each column by the average row of its parents to keep arrows short.
 const columns=Math.max(0,...depth.values())+1,rowOf=new Map<string,number>();let rows=0;
 for(let column=0;column<columns;column++){
  const members=ids.filter(id=>depth.get(id)===column);
  const key=(id:string)=>{const parents=[...(incoming.get(id)??[])].filter(parent=>rowOf.has(parent));return parents.length?parents.reduce((sum,parent)=>sum+rowOf.get(parent)!,0)/parents.length:Number.MAX_SAFE_INTEGER;};
  members.sort((a,b)=>key(a)-key(b)||ids.indexOf(a)-ids.indexOf(b)).forEach((id,row)=>rowOf.set(id,row));
  rows=Math.max(rows,members.length);
 }
 const chapters=new Map(project.chapters.map(chapter=>[chapter.id,chapter]));
 const nodes=ids.map(id=>{const list=cuts.get(id)!;const first=[...list].sort((a,b)=>a.order-b.order)[0]!;
  return {id,label:chapterLabel(chapters.get(id)!),cutCount:list.length,firstLineId:first.lineId,start:id===startChapter,reachable:reachable.has(id),
   fork:list.some(node=>node.kind==='choice'),merge:(incoming.get(id)?.size??0)>1,ending:list.some(node=>node.kind==='ending'||node.outgoing.some(edge=>edge.status==='ending')),depth:depth.get(id)!,row:rowOf.get(id)!};});
 const edges=[...edgeMap.values()].map(edge=>({id:`${edge.source}>${edge.target}`,...edge,back:back.has(`${edge.source}>${edge.target}`)}));
 return {nodes,edges,columns,rows};
}
