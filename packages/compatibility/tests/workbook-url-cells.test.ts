import {it,expect} from 'vitest';
import ExcelJS from 'exceljs';
import {blankAuthoringArchive} from '../src/authoring-workbook';
import {exportAuthoringExcel,importAuthoringExcel} from '../src/authoring-workbook/excel';
it('accepts Excel auto-linked plain URLs without changing the authored address',async()=>{
 const archive=await blankAuthoringArchive('shortstory'),book=new ExcelJS.Workbook();await book.xlsx.load(await exportAuthoringExcel(archive) as never);
 book.getWorksheet('그림책 정보')!.getCell('C3').value={text:'https://example.com/source',hyperlink:'https://example.com/source'};
 const result=await importAuthoringExcel(new Uint8Array(await book.xlsx.writeBuffer()));if(result.format!=='shortstory')throw Error('kind');expect(result.project.description).toBe('https://example.com/source');
});
it('rejects hidden differing URL targets so link information is never silently dropped',async()=>{
 const archive=await blankAuthoringArchive('shortstory'),book=new ExcelJS.Workbook();await book.xlsx.load(await exportAuthoringExcel(archive) as never);
 book.getWorksheet('그림책 정보')!.getCell('C3').value={text:'출처 보기',hyperlink:'https://example.com/source'};
 await expect(importAuthoringExcel(new Uint8Array(await book.xlsx.writeBuffer()))).rejects.toThrow(/링크/);
});
