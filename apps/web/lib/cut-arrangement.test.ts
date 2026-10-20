import {describe,it,expect} from 'vitest';
import {resolveCutArrangement} from './cut-arrangement';

describe('cut arrangement based on available editing area',()=>{
 it('chooses columns near 16:9 and stacks near 9:16',()=>{
  for(const size of [{width:1280,height:720},{width:844,height:390},{width:1024,height:768}])expect(resolveCutArrangement('auto',size)).toBe('columns');
  for(const size of [{width:720,height:1280},{width:390,height:844},{width:768,height:1024}])expect(resolveCutArrangement('auto',size)).toBe('stacked');
 });
 it('honors manual choices, including square and tiny layout bounds',()=>{
  for(const size of [{width:720,height:1280},{width:1280,height:720},{width:700,height:700},{width:1,height:1}]){
   expect(resolveCutArrangement('columns',size)).toBe('columns');
   expect(resolveCutArrangement('stacked',size)).toBe('stacked');
  }
  expect(resolveCutArrangement('auto',{width:700,height:700})).toBe('columns');
 });
 it('uses a stable columns baseline while layout has not been measured',()=>{
  for(const size of [undefined,{width:0,height:0},{width:NaN,height:500},{width:500,height:Infinity}])expect(resolveCutArrangement('auto',size)).toBe('columns');
 });
});
