import type {FlowEdge,FlowNode,StoryFlowGraph} from './flow-analysis';
export type UpstreamBranch=Readonly<{node:FlowNode;routes:readonly {edge:FlowEdge;distance:number}[]}>;
/** Reverse reachability, not an inferred reader path. Each node is visited at most once. */
export function findUpstreamBranches(graph:StoryFlowGraph,currentId:string):UpstreamBranch[]{
 const nodes=new Map(graph.nodes.map(node=>[node.lineId,node]));
 if(!nodes.has(currentId))throw Error('현재 편집 컷을 찾을 수 없습니다.');
 const distance=new Map<string,number>([[currentId,0]]),queue=[currentId];
 for(let index=0;index<queue.length;index++){
  const id=queue[index];for(const edge of nodes.get(id)!.incoming){if(edge.status!=='connected'||!nodes.has(edge.sourceLineId)||distance.has(edge.sourceLineId))continue;distance.set(edge.sourceLineId,distance.get(id)!+1);queue.push(edge.sourceLineId);}
 }
 return graph.nodes.filter(node=>node.lineId!==currentId&&distance.has(node.lineId)&&(node.kind==='choice'||node.outgoing.some(edge=>edge.conditional))).map(node=>({node,routes:node.outgoing.filter(edge=>edge.status==='connected'&&edge.targetLineId!==null&&distance.has(edge.targetLineId)).map(edge=>({edge,distance:distance.get(edge.targetLineId!)!+1}))})).filter(branch=>branch.routes.length>0).sort((a,b)=>Math.min(...a.routes.map(route=>route.distance))-Math.min(...b.routes.map(route=>route.distance)));
}
