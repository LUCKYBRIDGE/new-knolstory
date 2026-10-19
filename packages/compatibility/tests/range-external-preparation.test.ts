import {it,expect} from 'vitest';
import {mkdirSync,writeFileSync} from 'node:fs';
import {getRepresentativeStory} from '../src';
import {createAuthoringArchive,encodeAuthoringArchive,prepareJsonbSnapshot,restoreJsonbSnapshot} from '../src/authoring-archive';
import {exportAuthoringWorkbook,importAuthoringWorkbook} from '../src/authoring-workbook';
import {exportAuthoringExcel,importAuthoringExcel} from '../src/authoring-workbook/excel';
const directory=process.env.PREPARE_RANGE_CATALOG==='1'?'docs/architecture/evidence/range-external-current/catalog-only':'docs/architecture/evidence/range-external-current';
async function fixture(){
 const original=getRepresentativeStory('rabbit'),[first,second,third]=original.project.lines;
 const project={...original.project,lines:original.project.lines.map(line=>line.id!==first.id?line:{...line,presentation:{...line.presentation,effects:[{id:'external-range-effect',type:'flash' as const,target:{kind:'screen' as const},scope:'following' as const,endLineId:second.id,durationMs:800,repeat:'loop' as const,periodMs:2600}]},audio:{...line.audio,music:{action:'play' as const,assetId:'audio:music:forest',volume:.4,loop:true,endLineId:second.id}}})};
 return {original,second,third,archive:await createAuthoringArchive({format:'knolstory',document:{...original,project}})};
}
it('exports editable v7 range columns from a real work and precisely preserves unrelated authoring',async()=>{
 const {archive,third}=await fixture();if(archive.format!=='knolstory')throw Error('kind');const workbook=await exportAuthoringWorkbook(archive);expect(workbook.formatVersion).toBe(8);
 const withEnd=(name:'presentationEffects'|'audioTracks')=>{const table=workbook.tables[name],column=table.headers.indexOf('endLineId');expect(column).toBeGreaterThanOrEqual(0);return {...table,rows:table.rows.map((row,index)=>index?row:row.map((value,i)=>i===column?third.id:value))};};
 const edited=await importAuthoringWorkbook({...workbook,tables:{...workbook.tables,presentationEffects:withEnd('presentationEffects'),audioTracks:withEnd('audioTracks')}});
 const expected={...archive,document:{...archive.document,project:{...archive.document.project,lines:archive.document.project.lines.map((line,index)=>index?line:{...line,presentation:{...line.presentation,effects:line.presentation!.effects!.map(effect=>({...effect,endLineId:third.id}))},audio:{...line.audio,music:{...line.audio!.music!,endLineId:third.id}}})}}};
 expect(edited).toEqual(expected);expect(await importAuthoringExcel(await exportAuthoringExcel(edited))).toEqual(expected);expect(await restoreJsonbSnapshot(await prepareJsonbSnapshot(edited))).toEqual(expected);
});
it.runIf(process.env.PREPARE_RANGE_EXTERNAL==='1')('prepares distinct files and exact cell instructions for actual external editors',async()=>{
 const {archive,second,third}=await fixture();const bytes=await exportAuthoringExcel(archive);const ExcelJS=(await import('exceljs')).default,book=new ExcelJS.Workbook();await book.xlsx.load(bytes as never);const instructions=[];
 for(const sheetName of ['연출 효과','배경음·주변 소리']){const sheet=book.getWorksheet(sheetName)!;expect(sheet).toBeTruthy();const keys=sheet.getRow(2).values as import('exceljs').CellValue[];const column=keys.indexOf('endLineId');expect(column).toBeGreaterThan(0);const cell=sheet.getCell(3,column);expect(cell.value).toBe(second.id);instructions.push({sheet:sheetName,cell:cell.address,from:second.id,to:third.id});}
 mkdirSync(directory,{recursive:true});writeFileSync(`${directory}/range-source.knolstory`,await encodeAuthoringArchive(archive));writeFileSync(`${directory}/range-source.xlsx`,bytes);writeFileSync(`${directory}/range-excel-input.xlsx`,bytes);writeFileSync(`${directory}/range-google-input.xlsx`,bytes);writeFileSync(`${directory}/edit-instructions.json`,JSON.stringify({scope:'External input preparation only; not evidence of actual Excel/Google edits',instructions},null,2)+'\n');
});
it('roundtrips bounded chapter defaults without moving them to a cut or altering any other authored field',async()=>{
 const original=getRepresentativeStory('rabbit'),end=original.project.lines[1].id;const project={...original.project,chapters:original.project.chapters.map((chapter,index)=>index?chapter:{...chapter,audio:{...chapter.audio,music:{action:'play' as const,assetId:'audio:music:forest',endLineId:end},ambience:{action:'play' as const,assetId:'audio:music:ambience-forest',endLineId:end}}})};const archive=await createAuthoringArchive({format:'knolstory',document:{...original,project}});
 expect(await importAuthoringWorkbook(await exportAuthoringWorkbook(archive))).toEqual(archive);expect(await importAuthoringExcel(await exportAuthoringExcel(archive))).toEqual(archive);expect(await restoreJsonbSnapshot(await prepareJsonbSnapshot(archive))).toEqual(archive);expect(project.lines).toEqual(original.project.lines);
});
