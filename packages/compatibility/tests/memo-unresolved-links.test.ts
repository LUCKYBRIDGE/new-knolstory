import {describe,expect,it} from 'vitest';
import {exportAuthoringExcel,importAuthoringExcel} from '../src/authoring-workbook/excel';
import {validateAuthoringArchive} from '../src/authoring-archive';
import {blankAuthoringArchive,exportAuthoringWorkbook,importAuthoringWorkbook} from '../src/authoring-workbook';

async function memoArchive(){
 const blank=await blankAuthoringArchive('knolstory');
 if(blank.format!=='knolstory')throw Error('Expected story archive');
 return validateAuthoringArchive({...blank,document:{...blank.document,project:{...blank.document.project,creativeMemos:[{
  id:'memo-unresolved',kind:'relationship',title:'아직 정하지 않은 인물과 삭제한 장의 메모',
  linkedChapterId:'removed-chapter',linkedLineId:'removed-cut',
  linkedChapterIds:['removed-chapter',''],linkedLineIds:['removed-cut','future-cut'],
  linkedCharacterNames:['새로 떠올린 인물 🌱','001 이름','=인물 이름',''],
  fields:[{id:'question',label:'관계',value:'내용을 보존합니다.',order:1,source:'custom'}],
  order:1,createdAt:'2026-10-09T00:00:00Z',updatedAt:'2026-10-09T00:00:00Z',
 }]}}});
}
describe('memo authoring links preserve intentionally unresolved references',()=>{
 it('round trips every free character name and dangling singular/plural chapter/cut reference exactly',async()=>{
  const archive=await memoArchive();
  expect(await importAuthoringWorkbook(await exportAuthoringWorkbook(archive))).toEqual(archive);
  expect(await importAuthoringExcel(await exportAuthoringExcel(archive))).toEqual(archive);
 });
 it('still rejects missing memo owners, unsupported link kinds, invalid positions and absent-array rows',async()=>{
  const archive=await memoArchive(),original=await exportAuthoringWorkbook(archive);
  for(const [table,key,value] of [
   ['memoLinks','memoId','unknown-memo'],['memoLinks','kind','unsupported'],
   ['memoLinks','position','-1'],['memoFields','memoId','unknown-memo'],
   ['memoFields','source','unsupported'],['memos','linkedChapterIdsPresent','false'],
  ] as const){
   const tables=structuredClone(original.tables) as Record<string,{headers:string[];rows:string[][]}>;
   tables[table].rows[0][tables[table].headers.indexOf(key)]=value;
   await expect(importAuthoringWorkbook({...original,tables})).rejects.toThrow();
  }
 });
});
