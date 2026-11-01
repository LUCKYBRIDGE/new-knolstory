import {expect,it} from 'vitest';
import {createAuthoringArchive} from '../src/authoring-archive';
import {blankAuthoringArchive,exportAuthoringWorkbook,importAuthoringWorkbook} from '../src/authoring-workbook';
import {exportAuthoringExcel,importAuthoringExcel} from '../src/authoring-workbook/excel';
import {createExcelWorkbook} from '../src/excel';
async function authored(){
 const base=await blankAuthoringArchive('knolstory');if(base.format!=='knolstory')throw Error('kind');
 return createAuthoringArchive({format:'knolstory',document:{...base.document,project:{...base.document.project,lines:base.document.project.lines.map(line=>({...line,text:'구간과 클릭 순서를 보존할 원고',audio:{music:{action:'play' as const,assetId:'audio:music:forest',sourceStartMs:1200,sourceEndMs:3500}},presentation:{effects:[{id:'click',type:'shake' as const,trigger:'on-click' as const,clickStep:2}]}}))}}});
}
for(const [key,column] of [['audioTracks','sourceStartMs'],['audioTracks','sourceEndMs'],['audioSounds','sourceStartMs'],['presentationEffects','clickStep']] as const)it(`rejects deleting ${key}.${column} from a current workbook instead of silently discarding content`,async()=>{
 const archive=await authored(),book=await exportAuthoringWorkbook(archive),table=book.tables[key],indices=table.headers.flatMap((name,i)=>name===column?[]:[i]);
 const damaged={...book,tables:{...book.tables,[key]:{headers:indices.map(i=>table.headers[i]),rows:table.rows.map(row=>indices.map(i=>row[i]))}}};
 await expect(importAuthoringWorkbook(damaged)).rejects.toThrow(/열|헤더/);
 expect(await importAuthoringWorkbook(book)).toEqual(archive);
});
for(const key of ['audioClips','textVariants','textVariantConditions','branchConditionTerms','sceneVisibilityScores'])it(`requires the complete current template even when ${key} has no authored rows`,async()=>{
 const book=await exportAuthoringWorkbook(await blankAuthoringArchive('knolstory'));if(!book.tables[key])throw Error(`wrong test table ${key}`);
 const {[key]:_removed,...tables}=book.tables;
 await expect(importAuthoringWorkbook({...book,tables})).rejects.toThrow(/탭/);
});
it('current XLSX refuses a deleted click-order column without changing the original work',async()=>{
 const archive=await authored(),bytes=await exportAuthoringExcel(archive),book=await createExcelWorkbook();await book.xlsx.load(bytes as never);
 const sheet=book.getWorksheet('연출 효과')!;let column=0;sheet.getRow(2).eachCell((cell,i)=>{if(cell.value==='clickStep')column=i;});expect(column).toBeGreaterThan(0);sheet.spliceColumns(column,1);
 await expect(importAuthoringExcel(new Uint8Array(await book.xlsx.writeBuffer()))).rejects.toThrow(/열|헤더/);
 expect(await importAuthoringExcel(bytes)).toEqual(archive);
});
