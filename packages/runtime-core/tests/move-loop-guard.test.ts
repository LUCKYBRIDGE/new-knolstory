import {describe,expect,it} from 'vitest';
import {findStoryFlowIssues} from '@knolstory/story-domain';
import {addStoryChapter,createBlankStoryProject,insertStoryCut} from '../src/authoring';
import {splitStoryHere} from '../src/branch-authoring';
import {moveStoryCutToChapter} from '../src/editor-authoring';
import {cutsOnLoops} from '../src/flow-loop-guard';

/** a1 a2 | b1 b2 | c1 c2, with a2 split into two ways that meet again at b1. */
function forked(){
 let project=createBlankStoryProject({id:'p',chapterId:'a',lineId:'a1'});
 project=insertStoryCut(project,'a1','a2');
 project=addStoryChapter(project,{chapterId:'b',lineId:'b1'});project=insertStoryCut(project,'b1','b2');
 project=addStoryChapter(project,{chapterId:'c',lineId:'c1'});project=insertStoryCut(project,'c1','c2');
 let n=0;return splitStoryHere(project,'a2',{labels:['가','나'],mode:'rejoin'},()=>`n${++n}`).project;
}
describe('moving a cut never makes reading go round forever',()=>{
 it('refuses to put a fork after the place its own ways meet again',()=>{
  const project=forked();
  expect(findStoryFlowIssues(project).filter(issue=>issue.kind==='cycle')).toEqual([]);
  expect(()=>moveStoryCutToChapter(project,'a2','b')).toThrow('계속 되풀이');
 });
 it('still moves a cut where reading goes on without a loop',()=>{
  const moved=moveStoryCutToChapter(forked(),'b2','c');
  expect(findStoryFlowIssues(moved).filter(issue=>issue.kind==='cycle')).toEqual([]);
 });
});
describe('which cuts sit on a loop',()=>{
 it('finds every cut of a loop, whatever order the cuts are stored in',()=>{
  let project=createBlankStoryProject({id:'p',chapterId:'a',lineId:'a1'});
  project=insertStoryCut(project,'a1','a2');project=insertStoryCut(project,'a2','a3');
  const looped={...project,lines:project.lines.map(line=>line.id==='a3'?{...line,flow:{type:'goto' as const,targetLineId:'a2'}}:line)};
  expect([...cutsOnLoops(looped)].sort()).toEqual(['a2','a3']);
  const reordered={...looped,lines:looped.lines.map(line=>line.id==='a2'?{...line,order:3}:line.id==='a3'?{...line,order:2}:line)};
  expect(cutsOnLoops(reordered).has('a1')).toBe(false);
  expect(cutsOnLoops(forked()).size).toBe(0);
 });
});
