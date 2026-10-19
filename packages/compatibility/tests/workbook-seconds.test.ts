import {expect,it} from 'vitest';
import {completeStoryDocument,completeAudioResources} from './fixtures/authoring-complete';
import {exportAuthoringWorkbook,importAuthoringWorkbook,authoringWorkbookSpecs} from '../src/authoring-workbook';
import {exportAuthoringExcel,importAuthoringExcel} from '../src/authoring-workbook/excel';
import {UNSET,makeTable,readTable,type TableSpec} from '../src/authoring-workbook/model';
import {workbookStoredValue} from '../src/authoring-workbook/labels';
const spec:TableSpec={key:'audioTracks',title:'배경음·주변 소리',columns:[{key:'fadeInMs',label:'시작 시간 (초)',type:'number',optional:true}]};
it('exports decimal seconds while preserving zero, unset and exact millisecond values',()=>{
 const table=makeTable(spec,[{fadeInMs:100},{fadeInMs:230},{fadeInMs:1},{fadeInMs:0},{fadeInMs:600.1234567890124},{}]);
 expect(table.rows).toEqual([['0.1'],['0.23'],['0.001'],['0'],['0.6001234567890124'],[UNSET]]);
 expect(readTable({audioTracks:table},spec).map(r=>r.fadeInMs)).toEqual([100,230,1,0,600.1234567890124,undefined]);
});
it('rejects nondecimal time notation instead of accepting hex values',()=>{
 expect(()=>readTable({audioTracks:{headers:['fadeInMs'],rows:[['0x10']]}},spec)).toThrow(/초/);
});
it('writes current workbook and round trips all time fields through actual xlsx',async()=>{
 const document=completeStoryDocument(),book=await exportAuthoringWorkbook({format:'knolstory',document,audioResources:completeAudioResources()});
 expect(book.formatVersion).toBe(8);
 const archive=await importAuthoringWorkbook(book);
 expect((await importAuthoringExcel(await exportAuthoringExcel(archive)))).toEqual(archive);
 const old={...book,formatVersion:3 as const,tables:Object.fromEntries(Object.entries(book.tables).filter(([key])=>key!=='resourceTags').map(([key,inputTable])=>{
 const removed=key==='presentationEffects'?['durationMs']:['metadataPresent','category','originalName','metadataSource'];const table=['resources','presentationEffects'].includes(key)?{headers:inputTable.headers.filter(key=>!removed.includes(key)),rows:inputTable.rows.map(row=>row.filter((_,index)=>!removed.includes(inputTable.headers[index])))}:inputTable;
 const time=authoringWorkbookSpecs('knolstory').find(s=>s.key===key)?.columns.filter(c=>c.type==='number'&&c.key.endsWith('Ms')).map(c=>c.key)??[];
 return [key,{...table,rows:table.rows.map(row=>row.map((value,index)=>key==='metadata'&&table.headers[index]==='version'?'3':time.includes(table.headers[index])&&value!==UNSET?String(Number(value)*1000):value))}];
 }))};
 expect(await importAuthoringWorkbook(old)).toEqual(archive);
});
it('accepts only scoped former Korean enum labels and leaves author text untouched',()=>{
 const specs=authoringWorkbookSpecs('knolstory'),audio=specs.find(s=>s.key==='audioTracks')!,scores=specs.find(s=>s.key==='scoreEffects')!;
 expect(workbookStoredValue(audio,audio.columns.find(c=>c.key==='channel')!,'배경 음악')).toBe('music');
 expect(workbookStoredValue(scores,scores.columns.find(c=>c.key==='operation')!,'설정')).toBe('set');
 expect(workbookStoredValue(scores,scores.columns.find(c=>c.key==='scoreId')!,'설정')).toBe('설정');
});
it('uses seconds and Korean guidance in every declared time column, never changes hidden keys',async()=>{
 const ExcelJS=(await import('exceljs')).default,book=new ExcelJS.Workbook();
 await book.xlsx.load(await exportAuthoringExcel({format:'knolstory',document:completeStoryDocument(),audioResources:completeAudioResources()}) as never);
 for(const table of authoringWorkbookSpecs('knolstory'))for(const [index,column] of table.columns.entries()){
  if(column.type!=='number'||!column.key.endsWith('Ms'))continue;
  const sheet=book.getWorksheet(table.title)!;
  expect(sheet.getCell(1,index+1).value).toMatch(/초/);
  expect(sheet.getCell(2,index+1).value).toBe(column.key);
  expect(String(sheet.getCell(1,index+1).note)).toMatch(/초 단위/);
 }
 const audio=book.getWorksheet('배경음·주변 소리')!;
 expect(audio.getCell('C3').dataValidation.formulae).toEqual(['"배경음,주변 소리"']);
});
it('rejects unknown workbook versions and inconsistent declared metadata units',async()=>{
 const workbook=await exportAuthoringWorkbook({format:'knolstory',document:completeStoryDocument(),audioResources:completeAudioResources()});
 await expect(importAuthoringWorkbook({...workbook,formatVersion:9 as never})).rejects.toThrow(/지원하지 않는/);
 await expect(importAuthoringWorkbook({...workbook,formatVersion:3})).rejects.toThrow(/일치하지/);
});
it('preserves fractional millisecond authored values through tables, xlsx and jsonb',async()=>{
 const {createAuthoringArchive,prepareJsonbSnapshot,restoreJsonbSnapshot}=await import('../src/authoring-archive');
 const document=completeStoryDocument();
 const next={...document,project:{...document.project,lines:document.project.lines.map((line,index)=>index===0?{...line,presentation:{...line.presentation,transition:{type:'fade-black' as const,durationMs:600.1234567890124}}}:line)}};
 const archive=await createAuthoringArchive({format:'knolstory',document:next,audioResources:completeAudioResources()});
 const tables=await exportAuthoringWorkbook(archive);
 expect(await importAuthoringWorkbook(tables)).toEqual(archive);
 expect(await importAuthoringExcel(await exportAuthoringExcel(archive))).toEqual(archive);
 expect(await restoreJsonbSnapshot(await prepareJsonbSnapshot(archive))).toEqual(archive);
});
it('reads previous XLSX sheet titles and milliseconds without treating 230ms as 230seconds',async()=>{
 const ExcelJS=(await import('exceljs')).default,book=new ExcelJS.Workbook();
 const input={format:'knolstory' as const,document:completeStoryDocument(),audioResources:completeAudioResources()},archive=await importAuthoringWorkbook(await exportAuthoringWorkbook(input));
 await book.xlsx.load(await exportAuthoringExcel(input) as never);
 const aliases:Record<string,string>={'소리 설정':'오디오 설정','배경음·주변 소리':'음악 환경음','인물 배치':'무대 구성','배치한 인물':'무대 인물','말하는 인물':'무대 화자','작품 자료 참고':'자산 참고'};
 for(const spec of authoringWorkbookSpecs('knolstory')){
  const sheet=book.getWorksheet(spec.title)!;
  for(const [index,column] of spec.columns.entries())if(column.type==='number'&&column.key.endsWith('Ms')){
   for(let row=3;row<=sheet.rowCount;row++){const cell=sheet.getCell(row,index+1);if(cell.value!==null&&cell.value!==undefined&&cell.value!==UNSET)cell.value=String(Number(cell.value)*1000);}
  }
 }
 const effectSheet=book.getWorksheet('연출 효과')!;effectSheet.spliceColumns((effectSheet.getRow(2).values as import('exceljs').CellValue[]).indexOf('durationMs'),1);
 const resourceSheet=book.getWorksheet('사용자 음원 정보')!;resourceSheet.spliceColumns(7,4);book.removeWorksheet(book.getWorksheet('소리 검색 태그')!.id);
 book.getWorksheet('형식 정보')!.getCell('B3').value='3';
 for(const [name,previous] of Object.entries(aliases))book.getWorksheet(name)!.name=previous;
 const bytes=new Uint8Array(await book.xlsx.writeBuffer());
 expect(await importAuthoringExcel(bytes)).toEqual(archive);
});
it('does not accept duplicate previous and current names for the same authoring sheet',async()=>{
 const ExcelJS=(await import('exceljs')).default,book=new ExcelJS.Workbook();
 await book.xlsx.load(await exportAuthoringExcel({format:'knolstory',document:completeStoryDocument(),audioResources:completeAudioResources()}) as never);
 book.addWorksheet('음악 환경음').addRow(['중복']);
 await expect(importAuthoringExcel(new Uint8Array(await book.xlsx.writeBuffer()))).rejects.toThrow(/중복/);
});
