import {describe,it,expect} from 'vitest';
import {createBlankStoryProject} from '@knolstory/runtime-core';
import {flowMode,prepareFlowChange} from './story-flow-change';
const base=createBlankStoryProject({id:'flow-change',chapterId:'a',lineId:'first'}).lines[0]!;
describe('destructive flow mode proposals',()=>{
 it('stages choice removal without changing IDs, score effects or the source',()=>{
  const line={...base,flow:{type:'choice' as const,options:[{id:'keep-a',label:'믿는다',targetLineId:'next',effects:[{scoreId:'trust',operation:'add' as const,value:2}]},{id:'keep-b',label:'기다린다',targetLineId:'next'}]}};
  const before=structuredClone(line),proposal=prepareFlowChange(line,'linear');expect(proposal?.warning).toContain('선택지 2개');expect(proposal?.patch.flow).toBeUndefined();expect(line).toEqual(before);
  expect(prepareFlowChange(line,'choice')).toBeNull();
 });
 it('warns for hidden score routes and existing ending metadata',()=>{
  const line={...base,flow:{type:'goto' as const,targetLineId:'next',routes:[{id:'route-kept',condition:{mode:'all' as const,terms:[{scoreId:'trust',operator:'gte' as const,value:3}]},targetLineId:'bonus'}]}};
  expect(prepareFlowChange(line,'ending')?.warning).toContain('점수 조건 1개');
  const ending={...base,ending:{name:'새로운 아침',description:'끝맺음',endsStory:true}};
  expect(flowMode(ending)).toBe('ending');expect(prepareFlowChange(ending,'linear')?.warning).toContain('끝맺음');
 });
 it('does not add a confirmation to ordinary empty or linear setup',()=>{
  expect(prepareFlowChange(base,'choice')?.warning).toBe('');
  expect(prepareFlowChange({...base,flow:{type:'goto',targetLineId:''}},'linear')?.warning).toBe('');
 });
 it('protects an explicit destination or ending and produces the existing intended new mode',()=>{
  expect(prepareFlowChange({...base,flow:{type:'goto',targetLineId:'next'}},'linear')?.warning).toContain('도착 컷');
  expect(prepareFlowChange({...base,flow:{type:'goto',targetLineId:null}},'choice')?.warning).toContain('끝맺음');
  expect(prepareFlowChange(base,'goto')?.patch.flow).toEqual({type:'goto',targetLineId:''});
  expect(prepareFlowChange(base,'ending')?.patch.flow).toEqual({type:'goto',targetLineId:null});
 });
});

it('describes only existing choice score changes and visibility conditions',()=>{
 const options=[{id:'a',label:'간다',targetLineId:'next'},{id:'b',label:'기다린다',targetLineId:'next'}];
 const plain={...base,flow:{type:'choice' as const,options}};
 expect(prepareFlowChange(plain,'linear')?.warning).toBe('선택지 2개가 없어집니다.');
 const configured={...plain,flow:{...plain.flow,options:options.map((option,index)=>index===0?{...option,effects:[{scoreId:'trust',operation:'add' as const,value:1},{scoreId:'courage',operation:'add' as const,value:2}],condition:{mode:'all' as const,terms:[{scoreId:'trust',operator:'gte' as const,value:1}]}}:option)}};
 const snapshot=structuredClone(configured);
 expect(prepareFlowChange(configured,'linear')?.warning).toBe('선택지 2개, 선택 시 점수 변화 2개, 선택지 표시 조건 1개가 없어집니다.');
 expect(configured).toEqual(snapshot);
});
