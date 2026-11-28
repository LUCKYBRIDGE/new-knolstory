import {describe,expect,it} from 'vitest';
import {representativeStories} from '@knolstory/compatibility';
import {patchStoryLine} from '@knolstory/runtime-core';
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
   expect(origin).toMatchObject({choiceLineId:choice.id,optionId:way.optionId});
   expect(origin.from).toMatch(/장.* · \d+컷$/);
   expect(origin.strip.ways.map(item=>item.optionId)).toEqual(strip.ways.map(item=>item.optionId));
  }
  const start=[...rabbit.lines].sort((a,b)=>a.order-b.order).find(line=>line.chapterId===[...rabbit.chapters].sort((a,b)=>a.order-b.order)[0]!.id)!;
  expect(branchOrigin(rabbit,start.id,paths)).toBeNull();
 });
});
