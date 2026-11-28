import {describe,expect,it} from 'vitest';
import {controlNames,validateSurface} from '@knolstory/ui';
import {pageToolsSurface} from './shortstory-page-tools-surface';

describe('숏스토리 쪽 도구 줄 from the A2UI catalog',()=>{
 const tools=(over:Partial<Parameters<typeof pageToolsSurface>[0]>={})=>pageToolsSurface({index:1,count:3,full:false,canUndoMove:false,canUndoRemove:false,...over});
 it('keeps the catalog rules (a part of a page, so it has no screen root)',()=>{
  for(const surface of [tools(),tools({count:1,index:0}),tools({canUndoMove:true,canUndoRemove:true}),tools({count:2})])
   expect(validateSurface(surface).filter(issue=>issue.rule!=='root'&&issue.rule!=='orphan')).toEqual([]);
 });
 it('adds first, orders next and removes last',()=>{
  expect(controlNames(tools({canUndoMove:true,canUndoRemove:true}),'desktop')).toEqual(['현재 쪽 뒤에 빈 쪽 추가','현재 쪽 복제','쪽 앞으로 이동','쪽 뒤로 이동','이 쪽 옮기기','쪽 이동 되돌리기','현재 쪽 삭제','쪽 삭제 되돌리기']);
  // Two pages: no ‘이 쪽 옮기기’ list; nothing to undo: no undo buttons.
  expect(controlNames(tools({count:2}),'desktop')).toEqual(['현재 쪽 뒤에 빈 쪽 추가','현재 쪽 복제','쪽 앞으로 이동','쪽 뒤로 이동','현재 쪽 삭제']);
 });
 it('disables what cannot happen: the first page moving earlier, the last page later, the only page deleted, a full book',()=>{
  const off=(surface:ReturnType<typeof tools>,id:string)=>surface.components.get(id)!.disabled;
  expect(off(tools({index:0}),'earlier')).toBe(true);expect(off(tools({index:2}),'later')).toBe(true);
  expect(off(tools({count:1,index:0}),'remove')).toBe(true);expect(off(tools({full:true}),'add')).toBe(true);expect(off(tools({full:true}),'copy')).toBe(true);
  expect(tools().data).toEqual({index:'1'});
 });
});
