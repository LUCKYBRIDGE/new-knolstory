import {describe,expect,it} from 'vitest';
import {classroomSeason,seasonNotice} from './classroom-season';
const kst=(y:number,m:number,d:number,h=12)=>Date.UTC(y,m-1,d,h-9);
describe('classroom season',()=>{
 it('a class opened in the school year is cleared on 31 March of the next year',()=>{
  expect(classroomSeason(kst(2026,11,13),kst(2026,11,14))).toMatchObject({season:2026,clearsOn:'2027년 3월 31일',soon:false});
  expect(classroomSeason(kst(2027,3,1,0),kst(2027,3,2)).season).toBe(2027);
  expect(classroomSeason(kst(2027,2,28,23),kst(2027,3,1)).season).toBe(2026);
 });
 it('counts the days left and warns in the last weeks',()=>{
  const s=classroomSeason(kst(2026,11,13),kst(2027,3,1));expect(s.daysLeft).toBe(31);expect(s.soon).toBe(true);
  expect(classroomSeason(kst(2026,11,13),kst(2027,4,2)).daysLeft).toBe(0);
 });
 it('falls back to the current season and words the notice per audience',()=>{
  expect(classroomSeason(undefined,kst(2028,1,5)).season).toBe(2027);
  const s=classroomSeason(kst(2026,4,1),kst(2026,5,1));
  expect(seasonNotice(s,'teacher')).toContain('파일 받기');expect(seasonNotice(s,'student')).toContain('작품 파일');
 });
});
