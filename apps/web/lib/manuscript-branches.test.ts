import {describe,expect,it} from 'vitest';
import {representativeStories} from '@knolstory/compatibility';
import {createBlankStoryProject,patchStoryLine} from '@knolstory/runtime-core';
import type {StoryProject} from '@knolstory/story-domain';
import {branchOrigin,branchStrip} from './manuscript-branches';
import {storyPaths} from './story-path';

const rabbit=representativeStories.find(story=>story.id==='rabbit')!.project;
const choices=(project:StoryProject)=>project.lines.filter(line=>line.flow?.type==='choice');

describe('원고 갈래 줄',()=>{
 it('shows every way out of a choice: where it goes, its cuts and where it leads on',()=>{
  const paths=storyPaths(rabbit);
  for(const choice of choices(rabbit)){
   const strip=branchStrip(rabbit,choice.id,paths)!;
   expect(strip.ways.length).toBeGreaterThan(1);
   strip.ways.forEach((way,index)=>{
    expect(way.mark.startsWith(`${String.fromCharCode(65+index)}. `)).toBe(true);
    expect(way.lineId).toBeTruthy();
    expect(way.where).toMatch(/장.* · \d+컷$/);
    expect(way.peek.length).toBeGreaterThan(0);
    expect(way.peek.length).toBeLessThanOrEqual(12);
    const cuts=Number(way.where!.match(/(\d+)컷$/)![1]);
    for(const line of way.peek.slice(0,cuts>12?11:12))expect(line).toMatch(/^[^:]+: .+/);
    if(cuts>12)expect(way.peek.at(-1)).toBe(`…그 뒤 ${cuts-11}컷 더`);else expect(way.peek).toHaveLength(cuts);
    expect(way.leadsTo).toBeTruthy();
   });
  }
 });
 it('says when the ways meet again',()=>{
  const paths=storyPaths(rabbit);
  const met=choices(rabbit).map(choice=>branchStrip(rabbit,choice.id,paths)!).filter(strip=>strip.note?.startsWith('모든 갈래가'));
  for(const strip of met){
   expect(new Set(strip.ways.map(way=>way.leadsToLineId)).size).toBe(1);
   expect(strip.note).toMatch(/에서 다시 만나요\.$/);
  }
 });
 it('a way without its cut yet is empty and counted',()=>{
  const choice=choices(rabbit)[0]!;
  if(choice.flow?.type!=='choice')throw Error('choice');
  const project=patchStoryLine(rabbit,choice.id,{flow:{...choice.flow,options:choice.flow.options.map((option,index)=>index===1?{...option,targetLineId:''}:option)}});
  const strip=branchStrip(project,choice.id)!;
  expect(strip.ways[1]).toMatchObject({peek:[]});
  expect(strip.ways[1]!.lineId).toBeUndefined();
  expect(strip.note).toBe('아직 비어 있는 갈래가 1개 있어요.');
 });
 it('only choice cuts get a strip',()=>{
  const plain=rabbit.lines.find(line=>!line.flow)!;
  expect(branchStrip(rabbit,plain.id)).toBeNull();
 });
 it('a chapter that starts a way knows the choice it came from and its sibling ways',()=>{
  const paths=storyPaths(rabbit);
  const choice=choices(rabbit)[0]!,strip=branchStrip(rabbit,choice.id,paths)!;
  for(const way of strip.ways){
   const origin=branchOrigin(rabbit,way.lineId!,paths)!;
   expect(origin).toMatchObject({choiceLineId:choice.id,lineId:way.lineId});
   expect(origin.from).toMatch(/장.* · \d+컷$/);
   expect(origin.strip.ways.map(item=>item.optionId)).toEqual(strip.ways.map(item=>item.optionId));
  }
  const start=[...rabbit.lines].sort((a,b)=>a.order-b.order).find(line=>line.chapterId===[...rabbit.chapters].sort((a,b)=>a.order-b.order)[0]!.id)!;
  expect(branchOrigin(rabbit,start.id,paths)).toBeNull();
 });
});

describe('원고 갈래 줄 · edge cases',()=>{
 // One chapter: a choice whose two ways each take one cut and meet again at m.
 const sameChapter=():StoryProject=>{
  const base=createBlankStoryProject({id:'p',chapterId:'c',lineId:'ch'}),line=base.lines[0]!;
  const cut=(id:string,order:number,text:string,extra:object={})=>({...line,id,order,text,...extra});
  return {...base,lines:[
   cut('ch',1,'어느 길로 갈까?',{flow:{type:'choice',options:[{id:'oa',label:'왼쪽',targetLineId:'a1'},{id:'ob',label:'오른쪽',targetLineId:'b1'}]}}),
   cut('a1',2,'왼쪽 길이에요.',{flow:{type:'goto',targetLineId:'m'}}),
   cut('b1',3,'오른쪽 길이에요.',{type:'dialogue',speakerName:'아주아주아주긴이름의등장인물',flow:{type:'goto',targetLineId:'m'}}),
   cut('m',4,'두 길이 만났어요.'),cut('m2',5,'함께 걸어요.'),
  ]} as StoryProject;
 };
 it('a way that meets again in its own chapter stops at the meeting cut and names it',()=>{
  const strip=branchStrip(sameChapter(),'ch')!;
  expect(strip.ways.map(way=>way.where)).toEqual(['1장 · 첫 번째 장 · 1컷','1장 · 첫 번째 장 · 1컷']);
  expect(strip.ways.map(way=>way.leadsTo)).toEqual(['→ 1장 · 첫 번째 장 · 4컷','→ 1장 · 첫 번째 장 · 4컷']);
  expect(strip.note).toBe('모든 갈래가 1장 · 첫 번째 장 · 4컷에서 다시 만나요.');
 });
 it('keeps every peek line within the catalog’s 80 characters',()=>{
  const project=sameChapter(),long='가'.repeat(300);
  const strip=branchStrip(patchStoryLine(project,'b1',{text:long}),'ch')!;
  const line=strip.ways[1]!.peek[0]!;
  expect(line.startsWith('아주아주아주긴이름의등…: ')).toBe(true);
  expect(line.length).toBeLessThanOrEqual(80);
 });
 it('every way that starts the chapter is the way being written',()=>{
  const project=sameChapter(),choice=project.lines[0]!;
  if(choice.flow?.type!=='choice')throw Error('choice');
  // Two options to the same first cut in another chapter.
  const other={...project.chapters[0]!,id:'d',order:2},target={...project.lines[1]!,id:'t',chapterId:'d',order:1,flow:undefined};
  const shared={...project,chapters:[...project.chapters,other],lines:[{...choice,flow:{...choice.flow,options:choice.flow.options.map(option=>({...option,targetLineId:'t'}))}},target]} as StoryProject;
  const origin=branchOrigin(shared,'t')!;
  expect(origin.lineId).toBe('t');
  expect(origin.strip.ways.every(way=>way.lineId==='t')).toBe(true);
 });
 it('a choice with no options has no strip',()=>{
  // The story model refuses it; a damaged file must still not draw an empty fork.
  const project=sameChapter();
  const broken={...project,lines:project.lines.map(line=>line.id==='ch'?{...line,flow:{type:'choice',options:[]}}:line)} as StoryProject;
  expect(branchStrip(broken,'ch')).toBeNull();
 });
});
