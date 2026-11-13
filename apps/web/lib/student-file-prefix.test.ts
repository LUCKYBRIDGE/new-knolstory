import {describe,expect,it} from 'vitest';
import {currentStudentNumber,rememberStudentNumber,withStudentNumber} from './student-file-prefix';
const memory=()=>{const map=new Map<string,string>();return {getItem:(k:string)=>map.get(k)??null,setItem:(k:string,v:string)=>{map.set(k,v);},removeItem:(k:string)=>{map.delete(k);}};};
describe('student file prefix',()=>{
 it('puts a two-digit number first and never doubles it',()=>{
  expect(withStudentNumber('토끼전.knolstory',7)).toBe('07_토끼전.knolstory');
  expect(withStudentNumber('07_토끼전.knolstory',7)).toBe('07_토끼전.knolstory');
  expect(withStudentNumber('3_토끼전.knolstory',12)).toBe('12_토끼전.knolstory');
  expect(withStudentNumber('2026 봄 이야기.knolstory',30)).toBe('30_2026 봄 이야기.knolstory');
  expect(withStudentNumber('토끼전.knolstory',null)).toBe('토끼전.knolstory');
 });
 it('remembers only 1–30 and forgets on sign-out',()=>{
  const storage=memory();rememberStudentNumber(5,storage);expect(currentStudentNumber(storage)).toBe(5);
  rememberStudentNumber(31,storage);expect(currentStudentNumber(storage)).toBeNull();
  rememberStudentNumber(9,storage);rememberStudentNumber(null,storage);expect(currentStudentNumber(storage)).toBeNull();
 });
});
