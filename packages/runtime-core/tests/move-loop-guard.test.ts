import {describe,expect,it} from 'vitest';
import {findStoryFlowIssues} from '@knolstory/story-domain';
import {addStoryChapter,createBlankStoryProject,insertStoryCut} from '../src/authoring';
import {splitStoryHere} from '../src/branch-authoring';
import {moveStoryCutToChapter} from '../src/editor-authoring';

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
