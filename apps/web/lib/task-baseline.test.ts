import {describe,expect,it} from 'vitest';
import {readTaskBaseline,saveTaskBaseline,workItems,writtenAmount} from './task-baseline';
const memory=()=>{const map=new Map<string,string>();return {getItem:(k:string)=>map.get(k)??null,setItem:(k:string,v:string)=>{map.set(k,v);}};};
describe('counting only what the student wrote in a task copy',()=>{
 it('ignores copied cuts, counts new and changed ones, and counts everything without a baseline',()=>{
  const store=memory(),base=[['a','옛날 옛적에'],['b','용왕이 아팠어요'],['c','']] as const;
  saveTaskBaseline('s','t',base,store);
  const baseline=readTaskBaseline('s','t',store);
  expect(writtenAmount(base,baseline)).toEqual({amount:0,chars:0});
  expect(writtenAmount([['a','옛날 옛적에'],['b','용왕이 많이 아팠어요'],['c','토끼가 웃었다'],['d','끝']],baseline)).toEqual({amount:3,chars:11+7+1});
  expect(writtenAmount(base,null)).toEqual({amount:2,chars:6+8});
  expect(readTaskBaseline('s','other',store)).toBeNull();
  expect(workItems({pages:[{id:'p',text:'쪽'}]})).toEqual([['p','쪽']]);
 });
});
