import {expect,it} from 'vitest';
import {mkdirSync,writeFileSync} from 'node:fs';
import {getRepresentativeStory} from '../src';
import {createAuthoringArchive,encodeAuthoringArchive,decodeAuthoringArchive,prepareJsonbSnapshot,restoreJsonbSnapshot} from '../src/authoring-archive';
import {exportAuthoringWorkbook,importAuthoringWorkbook,UNSET} from '../src/authoring-workbook';
import {exportAuthoringExcel,importAuthoringExcel} from '../src/authoring-workbook/excel';
async function fixture(){
 const original=getRepresentativeStory('rabbit');
 const document={...original,project:{...original.project,lines:original.project.lines.map((line,index)=>index?line:{...line,text:`${line.text}\n기다리던 순간, 인물의 마음과 배경의 분위기가 천천히 바뀌는 장면을 긴 한국어 문장으로 확인합니다.`,presentation:{...line.presentation,effects:[{id:'duration-evidence',type:'flash' as const,target:{kind:'screen' as const},trigger:'after-delay' as const,delayMs:230,durationMs:1230,scope:'cut' as const,repeat:'once' as const}]}})}};
 return {original,archive:await createAuthoringArchive({format:'knolstory',document})};
}
it('preserves authored effect duration and the whole real work through archive, tables, XLSX and JSONB',async()=>{
 const {archive,original}=await fixture(),before=JSON.stringify(original);
 expect(await decodeAuthoringArchive(await encodeAuthoringArchive(archive))).toEqual(archive);
 expect(await restoreJsonbSnapshot(await prepareJsonbSnapshot(archive))).toEqual(archive);
 const workbook=await exportAuthoringWorkbook(archive),table=workbook.tables.presentationEffects;
 expect(workbook.formatVersion).toBe(8);
 expect(table.rows[0][table.headers.indexOf('durationMs')]).toBe('1.23');
 expect(await importAuthoringWorkbook(workbook)).toEqual(archive);
 expect(await importAuthoringExcel(await exportAuthoringExcel(archive))).toEqual(archive);
 expect(JSON.stringify(original)).toBe(before);
});
it('allows Korean sheet editing of effect seconds without altering Flow, assets, composition or manuscript',async()=>{
 const {archive}=await fixture();if(archive.format!=='knolstory')throw Error();
 const workbook=await exportAuthoringWorkbook(archive),table=workbook.tables.presentationEffects;
 const edited=await importAuthoringWorkbook({...workbook,tables:{...workbook.tables,presentationEffects:{...table,rows:table.rows.map(row=>row.map((cell,index)=>table.headers[index]==='durationMs'?'0.6':cell))}}});
 expect(edited).toEqual({...archive,document:{...archive.document,project:{...archive.document.project,lines:archive.document.project.lines.map((line,index)=>index?line:{...line,presentation:{...line.presentation,effects:line.presentation!.effects!.map(effect=>({...effect,durationMs:600}))}})}}});
 for(const value of ['-0.1','10.001','NaN','0x10'])await expect(importAuthoringWorkbook({...workbook,tables:{...workbook.tables,presentationEffects:{...table,rows:table.rows.map(row=>row.map((cell,index)=>table.headers[index]==='durationMs'?value:cell))}}})).rejects.toThrow();
});
it('explicitly migrates duration-free workbook5 and rejects duration under an older declaration',async()=>{
 const archive=await createAuthoringArchive({format:'knolstory',document:getRepresentativeStory('rabbit')}),current=await exportAuthoringWorkbook(archive);
 const table=current.tables.presentationEffects,metadata=current.tables.metadata;
 const previous={...current,formatVersion:5 as const,tables:{...current.tables,metadata:{...metadata,rows:metadata.rows.map(row=>row.map((value,index)=>metadata.headers[index]==='version'?'5':value))},presentationEffects:{headers:table.headers.filter(key=>key!=='durationMs'),rows:table.rows.map(row=>row.filter((_,index)=>table.headers[index]!=='durationMs'))}}};
 expect(await importAuthoringWorkbook(previous)).toEqual(archive);
 await expect(importAuthoringWorkbook({...previous,tables:{...previous.tables,presentationEffects:table}})).rejects.toThrow(/버전 6/);
 const latest=await exportAuthoringWorkbook(await importAuthoringWorkbook(previous));expect(latest.tables.presentationEffects.rows.every(row=>row[latest.tables.presentationEffects.headers.indexOf('durationMs')]===UNSET)).toBe(true);
});
// Full-manuscript roundtrips exceed the short unit default on shared CI CPUs.
 it('preserves zero and unset duration and rejects invalid archive durations before storage',{timeout:30000},async()=>{
 const {archive}=await fixture();if(archive.format!=='knolstory')throw Error();
 for(const durationMs of [0,undefined]){
  const document={...archive.document,project:{...archive.document.project,lines:archive.document.project.lines.map((line,index)=>index?line:{...line,presentation:{...line.presentation,effects:line.presentation!.effects!.map(({durationMs:_old,...effect})=>({...effect,...(durationMs===undefined?{}:{durationMs})}))}})}};
  const expected=await createAuthoringArchive({format:'knolstory',document});
  expect(await importAuthoringExcel(await exportAuthoringExcel(expected))).toEqual(expected);
  expect(await restoreJsonbSnapshot(await prepareJsonbSnapshot(expected))).toEqual(expected);
 }
 for(const durationMs of [-1,10001,Infinity,NaN]){
  const document={...archive.document,project:{...archive.document.project,lines:archive.document.project.lines.map((line,index)=>index?line:{...line,presentation:{...line.presentation,effects:line.presentation!.effects!.map(effect=>({...effect,durationMs}))}})}};
  await expect(createAuthoringArchive({format:'knolstory',document})).rejects.toThrow();
 }
});
it('declares Korean seconds and default duration semantics on real XLSX headers and notes',async()=>{
 const ExcelJS=(await import('exceljs')).default,book=new ExcelJS.Workbook();await book.xlsx.load(await exportAuthoringExcel((await fixture()).archive) as never);
 const sheet=book.getWorksheet('연출 효과')!,columns=sheet.getRow(2).values as import('exceljs').CellValue[],index=columns.indexOf('durationMs');
 expect(sheet.getCell(1,index).value).toBe('한 번 재생 시간 (초)');expect(String(sheet.getCell(1,index).note)).toMatch(/미설정.*기본 시간/);expect(sheet.getCell(3,index).value).toBe('1.23');
});
it.runIf(process.env.GENERATE_DIRECTION_ARTIFACTS==='1')('writes validated real-work evidence for external editors',async()=>{
 const {archive}=await fixture(),path='docs/architecture/evidence/non-audio-direction';mkdirSync(path,{recursive:true});
 writeFileSync(`${path}/rabbit-effect-duration.knolstory`,await encodeAuthoringArchive(archive));
 writeFileSync(`${path}/rabbit-effect-duration.xlsx`,await exportAuthoringExcel(archive));
 writeFileSync(`${path}/rabbit-effect-duration.jsonb.json`,JSON.stringify(await prepareJsonbSnapshot(archive),null,2));
});
