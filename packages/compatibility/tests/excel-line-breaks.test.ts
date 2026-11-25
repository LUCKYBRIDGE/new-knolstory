import {expect,it} from 'vitest';
import {getRepresentativeStory} from '../src';
import {createAuthoringArchive} from '../src/authoring-archive';
import {exportAuthoringExcel,importAuthoringExcel} from '../src/authoring-workbook/excel';
import {createExcelWorkbook,excelCellText,exportTableExcel} from '../src/excel';

it('keeps CR, CRLF and text that looks like an Excel code exactly through the editable Excel file',async()=>{
 const document=structuredClone(getRepresentativeStory('rabbit'));
 const [first,second,third]=document.project.lines as [typeof document.project.lines[number],typeof document.project.lines[number],typeof document.project.lines[number]];
 first.text='첫 줄\r\n둘째 줄';second.text='줄\r끝';third.text='코드처럼 보이는 글 _x000D_ 그대로';
 document.project.chapters[0]!.title='장 제목\r\n둘째 줄';
 const archive=await createAuthoringArchive({format:'knolstory',document,audioResources:[]});
 expect(await importAuthoringExcel(await exportAuthoringExcel(archive))).toEqual(archive);
});
it('reads the legacy table export back with the same text',async()=>{
 const rows=[['a\r\nb','c\rd','e_x000D_f','_x005F_x000D_']];
 const book=await createExcelWorkbook();await book.xlsx.load((await exportTableExcel(rows)).buffer as ArrayBuffer);
 const row=book.getWorksheet('KnolStory Next')!.getRow(1);
 expect([1,2,3,4].map(index=>row.getCell(index).value)).toEqual(rows[0]);
 expect(excelCellText('plain')).toBe('plain');
});
