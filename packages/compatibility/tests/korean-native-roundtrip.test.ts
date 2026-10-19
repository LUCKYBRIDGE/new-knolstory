import {it,expect} from 'vitest';
import {existsSync,readFileSync} from 'node:fs';
import ExcelJS from 'exceljs';
import {importAuthoringExcel} from '../src/authoring-workbook/excel';
import {createAuthoringArchive} from '../src/authoring-archive';
import {completeStoryDocument,completeAudioResources} from './fixtures/authoring-complete';
for(const app of ['google','excel']){
 const path=`docs/architecture/evidence/authoring-format/story-korean-${app}-edited.xlsx`;
 it.skipIf(!existsSync(path))(`actual ${app} Korean headings, notes and enum edits preserve the entire authored work`,async()=>{
  const bytes=new Uint8Array(readFileSync(path));const book=new ExcelJS.Workbook();await book.xlsx.load(bytes as never);
  const cuts=book.getWorksheet('컷')!;expect(cuts.getRow(2).hidden).toBe(true);expect(cuts.getCell('C3').value).toBe('해설');expect(cuts.getCell('B1').note).toBeTruthy();
  const document=completeStoryDocument(),project=document.project;
  const expected=await createAuthoringArchive({format:'knolstory',document:{...document,project:{...project,lines:project.lines.map((line,i)=>i===0?{...line,type:'narration',text:'한글 양식에서 수정한 작품 🌳'}:line)}},audioResources:completeAudioResources()});
  expect(await importAuthoringExcel(bytes)).toEqual(expected);
 });
}
