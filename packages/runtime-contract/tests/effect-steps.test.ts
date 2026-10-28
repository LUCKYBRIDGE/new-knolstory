import {describe,it,expect} from 'vitest';
import {isRuntimeScene} from '../src';
const base={contractVersion:1,sceneId:'click-scene',revision:1,width:1280,height:720,actors:[],dialogue:{speaker:'',text:'같은 컷의 글'},mode:'play'};
describe('resolved manual effect progress',()=>{
 it('accepts bounded Core progress without requiring an authored document in the runtime',()=>{
  expect(isRuntimeScene(base)).toBe(true);
  for(const current of [0,1,2])expect(isRuntimeScene({...base,effectSteps:{current,total:2}})).toBe(true);
 });
 it('rejects malformed, inconsistent or non-play progress',()=>{
  for(const effectSteps of [null,[],{current:0,total:0},{current:-1,total:2},{current:3,total:2},{current:.5,total:2},{current:0,total:4},{current:NaN,total:2},{current:0,total:'2'}])expect(isRuntimeScene({...base,effectSteps})).toBe(false);
  expect(isRuntimeScene({...base,mode:'edit',effectSteps:{current:0,total:1}})).toBe(false);
  expect(isRuntimeScene({...base,ended:true,effectSteps:{current:1,total:1}})).toBe(false);
 });
});
