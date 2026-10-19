import {describe,it,expect} from 'vitest';
import {isStoryPresentation,type StoryProject} from '@knolstory/story-domain';
import {isRuntimePresentation} from '@knolstory/runtime-contract';
import {compileStoryPresentation} from './presentation-scopes';
const compile=(effects:unknown[])=>compileStoryPresentation({lines:[{id:'a',presentation:{effects}}]} as unknown as StoryProject,'a')!;
describe('authored effect duration and cue timing',()=>{
 it('accepts zero and bounded durations while rejecting invalid or unknown values',()=>{
  for(const durationMs of [0,1250,10000])expect(isStoryPresentation({effects:[{type:'shake',durationMs}]})).toBe(true);
  for(const durationMs of [-1,10001,NaN,Infinity,'2']){
   expect(isStoryPresentation({effects:[{type:'shake',durationMs}]})).toBe(false);
   expect(isRuntimePresentation({effects:[{type:'shake',durationMs}]})).toBe(false);
  }
 });
 it('resolves backward defaults in Core and retains authored cue order and overlapping delay',()=>{
  const result=compile([{type:'shake'},{type:'crack'},{type:'flash',durationMs:1500,delayMs:200}]);
  expect(result.effects?.map(e=>e.durationMs)).toEqual([600,1800,1500]);
  expect(result.effects?.map(e=>e.type)).toEqual(['shake','crack','flash']);
  expect(result.effects?.map(e=>e.delayMs)).toEqual([undefined,undefined,200]);
  expect(isRuntimePresentation(result)).toBe(true);
 });
 it('preserves following cue identity and timing across actual visited cuts',()=>{
  const project={lines:[{id:'a',presentation:{effects:[{type:'shake',durationMs:3000,delayMs:500,scope:'following',repeat:'loop',periodMs:4000}]}},{id:'b'}]} as unknown as StoryProject;
  const first=compileStoryPresentation(project,'a',['a'])?.effects?.[0];
  expect(compileStoryPresentation(project,'b',['a','b'])?.effects?.[0]).toEqual(first);
 });
});
