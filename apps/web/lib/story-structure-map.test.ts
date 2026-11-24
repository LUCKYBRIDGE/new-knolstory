import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import type {StoryProject} from '@knolstory/story-domain';
import {analyzeStoryFlow} from '@knolstory/runtime-core';
import {storyStructure} from './story-structure-map';
import {sample} from './story-connection-trail.test';

const legs=(structure:ReturnType<typeof storyStructure>,lineId:string)=>structure.blocks.find(block=>block.lineId===lineId)!.legs.map(leg=>[leg.mark??'',leg.words.label,leg.runLabel,leg.end.kind==='cut'||leg.end.kind==='ending'||leg.end.kind==='pending'?`${leg.end.kind} ${leg.end.place}`:leg.end.kind]);

describe('story structure',()=>{
 const structure=storyStructure(sample,analyzeStoryFlow(sample));
 it('reads start, branch points and joins first, folding cuts that simply follow one another',()=>{
  expect(structure.blocks.map(block=>[block.place,block.roles])).toEqual([['1장 1컷',['start']],['1장 2컷',['branch']],['2장B 1컷',['branch']],['3장 1컷',['branch','join']]]);
  expect(legs(structure,'c1')).toEqual([['','순서대로','','cut 1장 2컷']]);
  // 1컷 갈림길 → 강 쪽으로 · 2장A 1~2컷 → 3장 1컷에서 다시 만남 / 숲으로 · 바로 2장B 1컷의 점수 갈림길
  expect(legs(structure,'c2')).toEqual([['A','‘강 쪽으로 간다’','2장A 1~2컷','cut 3장 1컷'],['B','‘숲으로 들어간다’','','cut 2장B 1컷']]);
  expect(legs(structure,'c5')).toEqual([['','점수 조건','','ending 4장A 1컷'],['','조건이 맞지 않으면','','cut 3장 1컷']]);
  expect(legs(structure,'c6')).toEqual([['A','‘선녀를 돕는다’','','ending 4장A 1컷'],['B','‘혼자 떠난다’','','ending 4장B 1컷'],['C','‘되돌아간다’','','pending 3장 1컷']]);
 });
 it('knows which block and way every cut belongs to',()=>{
  expect(structure.member.get('c4')).toEqual({block:'c2',leg:0,position:1});
  expect(structure.member.get('c6')).toEqual({block:'c6'});
  // Ending cuts are the end of a way, not a member of one.
  expect(structure.member.has('c7')).toBe(false);
 });
 it('summarizes a long built-in work by its branch points without walking every cut into a block',()=>{
  const source=JSON.parse(readFileSync('tests/fixtures/stories/seonnyeo.json','utf8')) as StoryProject;
  const graph=analyzeStoryFlow(source);
  const long=storyStructure(source,graph);
  expect(graph.nodes.length).toBeGreaterThan(1500);
  expect(long.blocks.length).toBeLessThan(80);
  expect(long.blocks.filter(block=>block.roles.includes('branch')).length).toBe(25);
  // Every cut is either a block, inside a way, or the end of a way.
  const ends=new Set(long.blocks.flatMap(block=>block.legs.flatMap(leg=>'lineId' in leg.end?[leg.end.lineId]:[])));
  expect(graph.nodes.filter(node=>!long.member.has(node.lineId)&&!ends.has(node.lineId))).toEqual([]);
 });
});
