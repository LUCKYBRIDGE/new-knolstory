import {describe,expect,it} from 'vitest';
import {particle,quoted} from './korean-particle';
describe('Korean particles after authored words',()=>{
 it('follows the final consonant of the last syllable',()=>{
  expect(quoted('나의 그림책','을/를')).toBe('‘나의 그림책’을');
  expect(quoted('별주부전','을/를')).toBe('‘별주부전’을');
  expect(quoted('흥부와 놀부','을/를')).toBe('‘흥부와 놀부’를');
  expect(particle('토끼','이/가')).toBe('가');expect(particle('용궁','이/가')).toBe('이');
  expect(particle('나','은/는')).toBe('는');expect(particle('책','과/와')).toBe('과');
 });
 it('gives both forms when the word does not end in Hangul',()=>{
  expect(particle('Story 2','을/를')).toBe('을(를)');expect(particle('그림책!','이/가')).toBe('이(가)');expect(particle('','을/를')).toBe('을(를)');
 });
});
