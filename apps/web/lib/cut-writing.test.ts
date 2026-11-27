import {describe,expect,it} from 'vitest';
import {createBlankStoryProject,addTypedStoryCut} from '@knolstory/runtime-core';
import type {StoryProject} from '@knolstory/story-domain';
import {splitCutInto} from './cut-writing';
import {pastePieces} from '../components/a2ui/focus-surface';

const ids=()=>{let n=0;return ()=>`new-${++n}`;};
const cuts=(project:StoryProject)=>project.lines.filter(line=>line.chapterId==='c').sort((a,b)=>a.order-b.order);
const two=()=>{const p=addTypedStoryCut(createBlankStoryProject({id:'p',chapterId:'c',lineId:'a'}),'a','b','narration');return {...p,lines:p.lines.map(l=>({...l,text:l.id==='a'?'첫 컷.':'둘째 컷.'}))};};
const split=(project:StoryProject,pieces:string[],names:string[]=[])=>splitCutInto(project,'a',pieces,{names,createId:ids()});

describe('원고 blocks',()=>{
 it('splits only at pasted blank lines, keeping the block’s own text around them',()=>{
  expect(pastePieces('앞뒤',1,1,'하나\r\n\r\n둘')).toEqual(['앞하나','둘뒤']);
  expect(pastePieces('가\n\n나',0,0,'한 줄')).toBeNull();
  expect(pastePieces('앞XX뒤',1,3,'하나\n\n둘\n \n셋')).toEqual(['앞하나','둘','셋뒤']);
 });
 it('makes a new cut after the block for each later piece, in order, keeping the block’s identity',()=>{
  const result=split(two(),['첫','컷.','셋']);
  expect(cuts(result.project).map(cut=>[cut.id,cut.text])).toEqual([['a','첫'],['new-1','컷.'],['new-2','셋'],['b','둘째 컷.']]);
  expect(result.ids).toEqual(['a','new-1','new-2']);expect(result.problem).toBeUndefined();
 });
 it('starts an empty next cut for Enter twice at the end, and a cut before the text for Enter twice at the start',()=>{
  expect(cuts(split(two(),['첫 컷.','']).project).map(cut=>cut.text)).toEqual(['첫 컷.','','둘째 컷.']);
  expect(cuts(split(two(),['','첫 컷.']).project).map(cut=>cut.text)).toEqual(['','첫 컷.','둘째 컷.']);
 });
 it('names the speaker of a new cut from ‘이름:’',()=>{
  const cut=cuts(split(two(),['첫 컷.','철수: 안녕'],['철수']).project)[1]!;
  expect([cut.type,cut.speakerName,cut.text]).toEqual(['dialogue','철수','안녕']);
 });
 it('keeps everything in the cut with its blank line when it cannot be split',()=>{
  const p=addTypedStoryCut(two(),'b','z','narration'),choice={...p,lines:p.lines.map(l=>l.id==='a'?{...l,flow:{type:'choice' as const,options:[{id:'o1',label:'가',targetLineId:'b'},{id:'o2',label:'나',targetLineId:'z'}]}}:l)};
  const result=split(choice,['첫 컷.','']);
  expect(result.problem).toMatch(/갈래/);expect(cuts(result.project).map(cut=>cut.text)).toEqual(['첫 컷.\n\n','둘째 컷.','']);expect(result.ids).toEqual(['a']);
 });
});
