import {describe,expect,it} from 'vitest';
import {coverTitle,splitNumberedTitle} from './numbered-title';
import {personalCoverTitle} from './personal-library';
describe('student class numbers in titles',()=>{
 it('splits only a leading two-digit number',()=>{
  expect(splitNumberedTitle('07_하늘')).toEqual({number:'07',rest:'하늘'});
  expect(splitNumberedTitle('2026_계획')).toEqual({number:null,rest:'2026_계획'});
  expect(splitNumberedTitle('하늘_07')).toEqual({number:null,rest:'하늘_07'});
  expect(coverTitle('02_[내작품] 별주부전')).toBe('[내작품] 별주부전');
  expect(personalCoverTitle('02_[내작품] 별주부전')).toBe('별주부전');
 });
});
