import {describe,expect,it} from 'vitest';
import {createAuthoringArchive,newShortStory,prepareJsonbSnapshot} from '@knolstory/compatibility';
import {studentPrefix,studentTitle,titleBody,withStudentTitle} from './student-title';
describe('student work titles keep the class number in front',()=>{
 it('splits and rebuilds titles without doubling or keeping another number',()=>{
  expect(studentPrefix(7)).toBe('07_');expect(studentPrefix(null)).toBe('');
  expect(titleBody('07_하늘 이야기',7)).toBe('하늘 이야기');expect(titleBody('3_옛 번호',7)).toBe('옛 번호');expect(titleBody('그대로',null)).toBe('그대로');
  expect(studentTitle('하늘 이야기',7)).toBe('07_하늘 이야기');expect(studentTitle('12_다른 번호',7)).toBe('07_다른 번호');expect(studentTitle('07_이미',7)).toBe('07_이미');
 });
 it('renumbers a snapshot for upload and leaves others untouched',async()=>{
  const plain=await prepareJsonbSnapshot(await createAuthoringArchive({format:'shortstory',project:{...newShortStory(),title:'그림책'}}));
  const numbered=await withStudentTitle(plain,3);
  expect(numbered.content.format==='shortstory'&&numbered.content.project.title).toBe('03_그림책');
  expect(numbered.contentSha256).not.toBe(plain.contentSha256);
  expect(await withStudentTitle(numbered,3)).toBe(numbered);
  expect(await withStudentTitle(plain,null)).toBe(plain);
 });
});
