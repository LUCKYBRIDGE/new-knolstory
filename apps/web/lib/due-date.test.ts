import {describe,expect,it} from 'vitest';
import {dateFromDueAt,dueAtFromDate,dueDateLabel,dueState} from './due-date';
const kst=(y:number,m:number,d:number,h=12)=>Date.UTC(y,m-1,d,h-9);
describe('due dates',()=>{
 it('round-trips a calendar day as the end of that day in Korea time',()=>{
  const due=dueAtFromDate('2026-11-20')!;expect(dateFromDueAt(due)).toBe('2026-11-20');expect(due).toBe(kst(2026,11,21,0)-1);
  expect(dueAtFromDate('2026-02-30')).toBeNull();expect(dueAtFromDate('')).toBeNull();expect(dateFromDueAt(null)).toBe('');
  expect(dueDateLabel(due)).toBe('11월 20일까지');
 });
 it('labels days left, today and late',()=>{
  const due=dueAtFromDate('2026-11-20')!;
  expect(dueState(due,kst(2026,11,17))).toMatchObject({label:'D-3',tone:'soon'});
  expect(dueState(due,kst(2026,11,10))).toMatchObject({label:'D-10',tone:'later'});
  expect(dueState(due,kst(2026,11,20,23))).toMatchObject({label:'오늘 마감',tone:'today'});
  expect(dueState(due,kst(2026,11,21,1))).toMatchObject({label:'마감 지남',tone:'late'});
  expect(dueState(null)).toBeNull();
 });
});
