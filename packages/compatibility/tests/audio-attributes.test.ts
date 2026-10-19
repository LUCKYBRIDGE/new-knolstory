import {expect,it} from 'vitest';
import {getRepresentativeStory} from '../src';
import {createAuthoringArchive,prepareJsonbSnapshot,restoreJsonbSnapshot,encodeAuthoringArchive,decodeAuthoringArchive} from '../src/authoring-archive';
import {exportAuthoringWorkbook,importAuthoringWorkbook} from '../src/authoring-workbook';
import {exportAuthoringExcel,importAuthoringExcel} from '../src/authoring-workbook/excel';
async function fixture(){
 const bytes=new TextEncoder().encode('RIFF0000WAVE1234');const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');
 return createAuthoringArchive({format:'knolstory',document:getRepresentativeStory('rabbit'),audioResources:[{id:`audio:custom:${hash}:wav`,name:'학교종소리1',mime:'audio/wav',data:btoa(String.fromCharCode(...bytes)),kind:'sound',metadata:{category:'effect',tags:['학교 종','남성','피아노'],originalName:'School Bell',source:'Pixabay'}}]});
}
it('preserves all searchable attributes through file, JSONB and editable workbook/XLSX',async()=>{
 const archive=await fixture();expect(await decodeAuthoringArchive(await encodeAuthoringArchive(archive))).toEqual(archive);
 expect(await restoreJsonbSnapshot(await prepareJsonbSnapshot(archive))).toEqual(archive);
 const workbook=await exportAuthoringWorkbook(archive);expect(workbook.formatVersion).toBe(8);expect(workbook.tables.resourceTags.rows).toHaveLength(3);
 expect(await importAuthoringWorkbook(workbook)).toEqual(archive);expect(await importAuthoringExcel(await exportAuthoringExcel(archive))).toEqual(archive);
});
it('rejects unknown tag IDs and metadata presence conflicts',async()=>{
 const workbook=await exportAuthoringWorkbook(await fixture());
 const tags=workbook.tables.resourceTags;await expect(importAuthoringWorkbook({...workbook,tables:{...workbook.tables,resourceTags:{...tags,rows:[['missing','0','학교']]}}})).rejects.toThrow();
});
it('explicitly migrates metadata-free v4 without inventing attributes',async()=>{
 const archive=await createAuthoringArchive({format:'knolstory',document:getRepresentativeStory('rabbit')});const current=await exportAuthoringWorkbook(archive);
 const remove=['metadataPresent','category','originalName','metadataSource'];const resources=current.tables.resources;
 const tables:Record<string,import('../src/authoring-workbook').AuthoringTable>={...current.tables,resources:{headers:resources.headers.filter(key=>!remove.includes(key)),rows:resources.rows.map(row=>row.filter((_,index)=>!remove.includes(resources.headers[index])))},metadata:{...current.tables.metadata,rows:current.tables.metadata.rows.map(row=>row.map((cell,index)=>current.tables.metadata.headers[index]==='version'?'4':cell))}};
 const effectTable=tables.presentationEffects;tables.presentationEffects={headers:effectTable.headers.filter(key=>key!=='durationMs'),rows:effectTable.rows.map(row=>row.filter((_,index)=>effectTable.headers[index]!=='durationMs'))};
 const {resourceTags:unused,...oldTables}=tables;expect(unused).toBeDefined();expect(await importAuthoringWorkbook({...current,formatVersion:4,tables:oldTables})).toEqual(archive);
});
it('rejects array coercion of an attachment kind before any storage',async()=>{
 const archive=await fixture();if(archive.format!=='knolstory')throw Error();
 await expect(createAuthoringArchive({format:'knolstory',document:archive.document,audioResources:[{...archive.audioResources[0],kind:['music'] as never}]})).rejects.toThrow(/종류/);
});
