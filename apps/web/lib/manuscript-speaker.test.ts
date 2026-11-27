import {describe,expect,it} from 'vitest';
import {knownSpeakerNames,NARRATION,speakerOptions,speakerPatch,speakerPrefix,speakerValue,UNNAMED} from './manuscript-speaker';
import type {StoryProject} from '@knolstory/story-domain';

const project=(over:Partial<StoryProject>)=>({characters:[],speakerNames:[],lines:[],...over}) as unknown as StoryProject;

describe('원고 speaker',()=>{
 it('collects names from characters, the speaker list and named cuts once',()=>{
  const names=knownSpeakerNames(project({characters:[{id:'c',name:' 나무꾼 ',role:'',description:'',defaultImageId:''}],speakerNames:['선녀','나무꾼'],
   lines:[{type:'dialogue',speakerName:'사슴'},{type:'narration',speakerName:'무시'},{type:'dialogue',speakerName:''}] as StoryProject['lines']}));
  expect(names).toEqual(['나무꾼','선녀','사슴']);
 });
 it('reads and writes 해설, a name or an unnamed line',()=>{
  expect(speakerValue({type:'narration',speakerName:'철수'})).toBe(NARRATION);
  expect(speakerValue({type:'dialogue',speakerName:'철수'})).toBe('name:철수');
  expect(speakerValue({type:'dialogue',speakerName:' '})).toBe(UNNAMED);
  expect(speakerPatch({speaker:'right'},'name:영희')).toEqual({type:'dialogue',speaker:'right',speakerName:'영희'});
  expect(speakerPatch({speaker:'narration'},'name:영희')).toEqual({type:'dialogue',speaker:'left',speakerName:'영희'});
  expect(speakerPatch({speaker:'left'},NARRATION)).toEqual({type:'narration',speaker:'narration'});
  expect(speakerPatch({speaker:'left'},'other')).toBeNull();
 });
 it('always offers at least two choices',()=>{
  expect(speakerOptions([],{type:'narration',speakerName:''}).map(o=>o.label)).toEqual(['해설','대사(이름 없음)']);
  expect(speakerOptions(['철수'],{type:'dialogue',speakerName:'철수'}).map(o=>o.label)).toEqual(['해설','철수']);
  expect(speakerOptions(['철수'],{type:'dialogue',speakerName:''}).map(o=>o.label)).toEqual(['해설','철수','대사(이름 없음)']);
 });
 it('takes ‘이름:’ only for names the work knows',()=>{
  expect(speakerPrefix('철수: 안녕',['철수'])).toEqual({value:'name:철수',rest:'안녕'});
  expect(speakerPrefix('철수：안녕',['철수'])).toEqual({value:'name:철수',rest:'안녕'});
  expect(speakerPrefix('해설: 밤이 깊었다.',[])).toEqual({value:NARRATION,rest:'밤이 깊었다.'});
  expect(speakerPrefix('결론: 그는 떠났다.',['철수'])).toBeNull();
  expect(speakerPrefix('시각은 10:30',['철수'])).toBeNull();
  // Typing: ‘철수:’ waits for the space so it does not stay in the text.
  expect(speakerPrefix('철수:',['철수'],true)).toBeNull();
  expect(speakerPrefix('철수: ',['철수'],true)).toEqual({value:'name:철수',rest:''});
 });
});
