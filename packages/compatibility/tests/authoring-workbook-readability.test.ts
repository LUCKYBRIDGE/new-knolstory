import {it,expect} from 'vitest';
import ExcelJS from 'exceljs';
import {blankAuthoringArchive} from '../src/authoring-workbook';
import {exportAuthoringExcel,importAuthoringExcel} from '../src/authoring-workbook/excel';
it('provides Korean headings and notes explaining linkage, with internal keys hidden and full fidelity',async()=>{
 const original=await blankAuthoringArchive('knolstory'),bytes=await exportAuthoringExcel(original);
 const book=new ExcelJS.Workbook();await book.xlsx.load(bytes as never);
 const cuts=book.getWorksheet('컷')!;expect(cuts.getRow(2).hidden).toBe(true);
 expect(cuts.getCell('B1').note).toBeTruthy();expect(JSON.stringify(cuts.getCell('B1').note)).toMatch(/장.*ID.*연결/);
 expect(cuts.getCell('C3').value).toBe('해설');expect(cuts.getCell('C3').dataValidation.type).toBe('list');
 expect(await importAuthoringExcel(bytes)).toEqual(original);
});
it('ShortStory guidance teaches pages and covers using only its supported picture assets',async()=>{
 const bytes=await exportAuthoringExcel(await blankAuthoringArchive('shortstory')),book=new ExcelJS.Workbook();await book.xlsx.load(bytes as never);
 const guide=book.getWorksheet('사용 안내')!;const labels=guide.getColumn(1).values as unknown[];
 expect(labels).toContain('새 쪽');expect(labels).not.toContain('새 컷');expect(labels).not.toContain('첨부 음원');
 const reference=book.getWorksheet('작품 자료 참고')!;expect(reference.getColumn(3).values).not.toContain('배경음');expect(reference.getColumn(3).values).toContain('배경 그림');
});
it('current workbook guidance selects registered media and preserves existing attachments without suggesting uploads',async()=>{
 for(const kind of ['knolstory','shortstory'] as const){
  const archive=await blankAuthoringArchive(kind),bytes=await exportAuthoringExcel(archive),book=new ExcelJS.Workbook();await book.xlsx.load(bytes as never);const guide=book.getWorksheet('사용 안내')!,rows=guide.getSheetValues();const text=JSON.stringify(rows);
  expect(text).not.toContain('사용자 음원은 앱에서 먼저 추가');expect(text).toContain('서비스에 등록된');expect(text).toContain('외부');
  const note=JSON.stringify(book.getWorksheet('작품 자료 참고')!.getCell('A1').note);expect(note).toContain('서비스에 등록된');expect(note).not.toContain('사용자 음원은 놀스토리 앱에서 추가');
  if(kind==='knolstory'){expect(text).toContain('기존 저장 작품');expect(text).toContain('원본');expect(text).toContain('새 웹 가져오기');}
  expect(await importAuthoringExcel(bytes)).toEqual(archive);
 }
});
it('explains chapter and cut sound range boundaries using the same preserved field',async()=>{
 const book=new ExcelJS.Workbook();await book.xlsx.load(await exportAuthoringExcel(await blankAuthoringArchive('knolstory')) as never);const sheet=book.getWorksheet('배경음·주변 소리')!;const keys=sheet.getRow(2).values as unknown[];const column=keys.indexOf('endLineId');expect(column).toBeGreaterThan(0);expect(sheet.getCell(1,column).value).toBe('종료 컷 ID');const help=JSON.stringify(sheet.getCell(1,column).note);expect(help).toContain('장');expect(help).toContain('포함');expect(help).toContain('다음');
});
