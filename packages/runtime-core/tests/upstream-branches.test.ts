import {it,expect} from 'vitest';
import {findUpstreamBranches} from '../src/upstream-branches';
import {analyzeStoryFlow} from '../src/flow-analysis';
import {getRepresentativeStory} from '@knolstory/compatibility';
it('lists both paths of a join and nested choice ancestors without inventing one selected route',()=>{
 const base=getRepresentativeStory('rabbit').project,[a,b,c,d,e]=base.lines;const project={...base,lines:base.lines.map(line=>line.id===a.id?{...line,ending:undefined,flow:{type:'choice' as const,options:[{id:'via-b',label:'왼쪽 길',targetLineId:b.id},{id:'via-c',label:'오른쪽 길',targetLineId:c.id}]}}:line.id===b.id||line.id===c.id?{...line,ending:undefined,flow:{type:'goto' as const,targetLineId:d.id}}:line.id===d.id?{...line,ending:undefined,flow:{type:'choice' as const,options:[{id:'nested',label:'다음 만남',targetLineId:e.id},{id:'end',label:'끝내기',targetLineId:null}]}}:line)};
 const graph=analyzeStoryFlow(project),result=findUpstreamBranches(graph,e.id);expect(result.map(branch=>branch.node.lineId)).toEqual([d.id,a.id]);expect(result[1].routes.map(route=>route.edge.label)).toEqual(['왼쪽 길','오른쪽 길']);expect(result[0].routes[0].distance).toBe(1);expect(findUpstreamBranches(graph,a.id)).toEqual([]);
});
it('terminates cyclic reverse graphs and rejects unknown current cuts',()=>{
 const base=getRepresentativeStory('rabbit').project,[a,b]=base.lines;const graph=analyzeStoryFlow({...base,lines:base.lines.map(line=>line.id===a.id?{...line,ending:undefined,flow:{type:'choice' as const,options:[{id:'loop',label:'한 바퀴',targetLineId:b.id},{id:'end',label:'끝',targetLineId:null}]}}:line.id===b.id?{...line,ending:undefined,flow:{type:'goto' as const,targetLineId:a.id}}:line)});expect(findUpstreamBranches(graph,b.id)).toHaveLength(1);expect(()=>findUpstreamBranches(graph,'missing')).toThrow();
});
it('includes conditional goto alternatives without evaluating reader scores and skips pending/end edges',()=>{
 const base=getRepresentativeStory('rabbit').project,[a,b,c]=base.lines;const graph=analyzeStoryFlow({...base,lines:base.lines.map(line=>line.id===a.id?{...line,ending:undefined,flow:{type:'goto' as const,targetLineId:c.id,routes:[{id:'score-route',condition:{mode:'all' as const,terms:[{scoreId:'trust',operator:'gte' as const,value:10}]},targetLineId:b.id}]}}:line.id===b.id?{...line,ending:undefined,flow:{type:'goto' as const,targetLineId:c.id}}:line)});const routes=findUpstreamBranches(graph,c.id)[0].routes;expect(routes).toHaveLength(2);expect(routes.map(route=>route.distance)).toEqual([2,1]);expect(routes[0].edge.conditional).toBe(true);expect(findUpstreamBranches(graph,c.id)[0].node.lineId).toBe(a.id);
});
