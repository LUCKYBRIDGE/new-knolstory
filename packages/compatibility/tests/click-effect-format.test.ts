import {expect,it} from 'vitest';
import {parseStoryDocument,type StoryEffectCue} from '@knolstory/story-domain';
import {getRepresentativeStory} from '../src';
import {createAuthoringArchive,decodeAuthoringArchive,encodeAuthoringArchive,prepareJsonbSnapshot,restoreJsonbSnapshot} from '../src/authoring-archive';
import {exportAuthoringWorkbook,importAuthoringWorkbook,UNSET} from '../src/authoring-workbook';
import {exportAuthoringExcel,importAuthoringExcel} from '../src/authoring-workbook/excel';

function fixture(){
 const original=getRepresentativeStory('rabbit');
 const source=original.project.lines.find(line=>line.flow?.type==='choice');
 if(!source||source.flow?.type!=='choice')throw Error('Representative work must include a real choice');
 const effects:StoryEffectCue[]=[
  {id:'click-one',type:'shake',trigger:'on-click',delayMs:230,durationMs:670,target:{kind:'screen'},scope:'cut',branchCondition:{sourceLineId:source.id,choiceId:source.flow.options[0].id}},
  {id:'automatic-between',type:'flash',trigger:'scene-enter',delayMs:0,durationMs:100,target:{kind:'background'}},
  {id:'click-two',type:'flash',trigger:'on-click',delayMs:0,durationMs:0,repeat:'once'},
 ];
 const document={...original,project:{...original.project,lines:original.project.lines.map((line,index)=>index?line:{...line,presentation:{...line.presentation,effects}})}};
 return {original,document,effects};
}

it('preserves separate ordered click cues, IDs, exact choice conditions and the whole schema8 work in every current format',{timeout:30000},async()=>{
 const {original,document,effects}=fixture(),before=JSON.stringify(original),authored=JSON.stringify(document);
 const parsed=parseStoryDocument(document);expect(parsed.ok).toBe(true);
 const archive=await createAuthoringArchive({format:'knolstory',document});
 expect(archive.formatVersion).toBe(2);expect(archive.format==='knolstory'&&archive.document.schemaVersion).toBe(8);
 expect(await decodeAuthoringArchive(await encodeAuthoringArchive(archive))).toEqual(archive);
 const workbook=await exportAuthoringWorkbook(archive),table=workbook.tables.presentationEffects;
 expect(workbook.formatVersion).toBe(8);
 expect(table.rows.slice(0,3).map(row=>row[table.headers.indexOf('trigger')])).toEqual(['클릭하면','컷 시작 때','클릭하면']);
 expect(table.headers).not.toContain('clickGroup');
 expect(await importAuthoringWorkbook(workbook)).toEqual(archive);
 expect(await importAuthoringExcel(await exportAuthoringExcel(archive))).toEqual(archive);
 expect(await restoreJsonbSnapshot(await prepareJsonbSnapshot(archive))).toEqual(archive);
 expect(archive.format==='knolstory'&&archive.document.project.lines[0].presentation?.effects).toEqual(effects);
 expect(JSON.stringify(document)).toBe(authored);expect(JSON.stringify(original)).toBe(before);
});

it('accepts the stable on-click workbook value and rejects unknown trigger or grouping fields before import',async()=>{
 const {document}=fixture(),archive=await createAuthoringArchive({format:'knolstory',document});
 const workbook=await exportAuthoringWorkbook(archive),table=workbook.tables.presentationEffects,index=table.headers.indexOf('trigger');
 const english={...workbook,tables:{...workbook.tables,presentationEffects:{...table,rows:table.rows.map(row=>row.map((cell,i)=>i===index&&cell==='클릭하면'?'on-click':cell))}}};
 expect(await importAuthoringWorkbook(english)).toEqual(archive);
 const invalid={...workbook,tables:{...workbook.tables,presentationEffects:{...table,rows:table.rows.map((row,r)=>row.map((cell,i)=>r===0&&i===index?'on-double-click':cell))}}};
 await expect(importAuthoringWorkbook(invalid)).rejects.toThrow();
 const invalidDocument={...document,project:{...document.project,lines:document.project.lines.map((line,i)=>i?line:{...line,presentation:{...line.presentation,effects:line.presentation!.effects!.map(effect=>({...effect,clickGroup:'shared'}))}})}};
 await expect(createAuthoringArchive({format:'knolstory',document:invalidDocument})).rejects.toThrow();
});

it('roundtrips explicit shared click order and keeps omitted click order absent',{timeout:30000},async()=>{
 const {document}=fixture();
 const grouped={...document,project:{...document.project,lines:document.project.lines.map((line,index)=>index?line:{...line,presentation:{...line.presentation,effects:line.presentation!.effects!.map(effect=>effect.trigger==='on-click'?{...effect,clickStep:2}:effect)}})}};
 const archive=await createAuthoringArchive({format:'knolstory',document:grouped});
 expect(await decodeAuthoringArchive(await encodeAuthoringArchive(archive))).toEqual(archive);
 const workbook=await exportAuthoringWorkbook(archive),table=workbook.tables.presentationEffects;
 expect(table.rows.slice(0,3).map(row=>row[table.headers.indexOf('clickStep')])).toEqual(['2',UNSET,'2']);
 expect(await importAuthoringWorkbook(workbook)).toEqual(archive);
 expect(await importAuthoringExcel(await exportAuthoringExcel(archive))).toEqual(archive);
 expect(await restoreJsonbSnapshot(await prepareJsonbSnapshot(archive))).toEqual(archive);
});

it('reads existing workbook8 without the additive click order column without inventing authored values',async()=>{
 const {original}=fixture(),archive=await createAuthoringArchive({format:'knolstory',document:original}),workbook=await exportAuthoringWorkbook(archive),table=workbook.tables.presentationEffects;
 const older={...workbook,tables:{...workbook.tables,presentationEffects:{headers:table.headers.filter(key=>key!=='clickStep'),rows:table.rows.map(row=>row.filter((_,i)=>table.headers[i]!=='clickStep'))}}};
 expect(await importAuthoringWorkbook(older)).toEqual(archive);
});

it.each([0,4,1.5,-1,NaN,Infinity])('rejects invalid click order %s before storage',async clickStep=>{
 const {document}=fixture();
 const invalid={...document,project:{...document.project,lines:document.project.lines.map((line,i)=>i?line:{...line,presentation:{...line.presentation,effects:[{id:'invalid',type:'shake' as const,trigger:'on-click' as const,clickStep}]}})}};
 await expect(createAuthoringArchive({format:'knolstory',document:invalid})).rejects.toThrow();
});

it('rejects a click order on automatic effects',async()=>{
 const {document}=fixture();
 const invalid={...document,project:{...document.project,lines:document.project.lines.map((line,i)=>i?line:{...line,presentation:{...line.presentation,effects:[{type:'shake' as const,trigger:'scene-enter' as const,clickStep:1}]}})}};
 await expect(createAuthoringArchive({format:'knolstory',document:invalid})).rejects.toThrow();
});

it('opens existing XLSX sheets without click order and exposes its new bounded Korean help',{timeout:30000},async()=>{
 const ExcelJS=(await import('exceljs')).default;
 const {original}=fixture(),archive=await createAuthoringArchive({format:'knolstory',document:original});
 const book=new ExcelJS.Workbook();await book.xlsx.load(await exportAuthoringExcel(archive) as never);
 const sheet=book.getWorksheet('연출 효과')!,keys=sheet.getRow(2).values as import('exceljs').CellValue[],column=keys.indexOf('clickStep');
 expect(sheet.getCell(1,column).value).toBe('클릭 순서');
 expect(String(sheet.getCell(1,column).note)).toMatch(/1~3.*클릭하면/);
 sheet.spliceColumns(column,1);
 expect(await importAuthoringExcel(new Uint8Array(await book.xlsx.writeBuffer()))).toEqual(archive);
});
