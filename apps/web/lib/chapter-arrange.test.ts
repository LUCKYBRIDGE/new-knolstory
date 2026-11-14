import {describe,expect,it} from 'vitest';
import {chapterLabel} from '@knolstory/story-domain';
import {addStoryChapter,analyzeStoryFlow,createBlankStoryProject,insertStoryCut,reorderStoryChapters,splitStoryHere} from '@knolstory/runtime-core';
import {chapterArrangement} from './chapter-arrange';

function story(){
 let project=createBlankStoryProject({id:'p',chapterId:'a',lineId:'a1'});
 project=insertStoryCut(project,'a1','a2');
 project=addStoryChapter(project,{chapterId:'b',lineId:'b1'});
 project=addStoryChapter(project,{chapterId:'c',lineId:'c1'});
 return {...project,chapters:project.chapters.map(chapter=>({...chapter,title:chapter.id.toUpperCase()}))};
}
const ids=()=>{let i=0;return ()=>`n${++i}`;};
describe('chapter arrangement',()=>{
 it('is already tidy for a straight story',()=>{
  const project=story(),plan=chapterArrangement(project,analyzeStoryFlow(project));
  expect(plan).toMatchObject({ids:['a','b','c'],moved:0,renamed:0});
 });
 it('numbers chapters by reading step and letters the branches of one step',()=>{
  const {project}=splitStoryHere(story(),'a2',{labels:['숲','강'],mode:'rejoin'},ids());
  const plan=chapterArrangement(project,analyzeStoryFlow(project));
  expect(plan.moved).toBe(0);
  // B and C were 2장·3장 but now read at steps 3 and 4.
  expect(plan.renamed).toBe(2);
  const arranged=reorderStoryChapters(project,plan.ids,plan.labels);
  const labels=[...arranged.chapters].sort((x,y)=>x.order-y.order).map(chapterLabel);
  expect(labels).toEqual(['1장 · A','2장A · 숲','2장B · 강','3장 · B','4장 · C']);
  expect(chapterArrangement(arranged,analyzeStoryFlow(arranged))).toMatchObject({moved:0,renamed:0});
 });
});
