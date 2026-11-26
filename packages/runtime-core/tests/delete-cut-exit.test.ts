import {describe,expect,it} from 'vitest';
import {addStoryChapter,createBlankStoryProject,insertStoryCut} from '../src/authoring';
import {deleteStoryCut} from '../src/editor-authoring';
import type {StoryProject} from '@knolstory/story-domain';

/** a(a1,a2) → b(b1,b2) → c(c1,c2): three chapters read in order. */
function threeChapters():StoryProject{
 let p=createBlankStoryProject({id:'p',chapterId:'a',lineId:'a1'});
 p=insertStoryCut(p,'a1','a2');
 p=addStoryChapter(p,{chapterId:'b',lineId:'b1'});p=insertStoryCut(p,'b1','b2');
 p=addStoryChapter(p,{chapterId:'c',lineId:'c1'});p=insertStoryCut(p,'c1','c2');
 return p;
}
const line=(p:StoryProject,id:string)=>p.lines.find(l=>l.id===id)!;
describe('deleting a cut keeps the story shape',()=>{
 it('passes a story ending on to the cut before it',()=>{
  let p=threeChapters();p={...p,lines:p.lines.map(l=>l.id==='b2'?{...l,ending:{endsStory:true}}:l)} as StoryProject;
  const next=deleteStoryCut(p,'b2');
  expect(line(next,'b1').ending?.endsStory).toBe(true);
 });
 it('keeps a conditional ending to itself: readers who skip that cut must still read on',()=>{
  let p=threeChapters();
  p={...p,scores:[{id:'trust',name:'trust',description:'',initial:0}],lines:p.lines.map(l=>l.id==='b2'?{...l,ending:{endsStory:true},visibility:{scores:{mode:'all',terms:[{scoreId:'trust',operator:'gte',value:1}]}}}:l)} as StoryProject;
  const next=deleteStoryCut(p,'b2');
  expect(line(next,'b1').ending).toBeUndefined();
  expect(line(next,'b1').flow).toBeUndefined();
 });
 it('passes an explicit jump on to the cut before it',()=>{
  let p=threeChapters();p={...p,lines:p.lines.map(l=>l.id==='a2'?{...l,flow:{type:'goto',targetLineId:'c1'}}:l)} as StoryProject;
  const next=deleteStoryCut(p,'a2');
  expect(line(next,'a1').flow).toEqual({type:'goto',targetLineId:'c1'});
 });
 it('does not overwrite an exit the earlier cut already has',()=>{
  let p=threeChapters();p={...p,lines:p.lines.map(l=>l.id==='a1'?{...l,flow:{type:'goto',targetLineId:'b2'}}:l.id==='a2'?{...l,flow:{type:'goto',targetLineId:'c1'}}:l)} as StoryProject;
  expect(line(deleteStoryCut(p,'a2'),'a1').flow).toEqual({type:'goto',targetLineId:'b2'});
 });
 it('refuses to empty a chapter',()=>{
  const p=deleteStoryCut(threeChapters(),'b2');
  expect(()=>deleteStoryCut(p,'b1')).toThrow('이 장에 남은 마지막 컷');
 });
});
