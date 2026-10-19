import {it,expect} from 'vitest';
import {getRepresentativeStory} from '../src';
import {createStoryDocument,parseStoryDocument} from '@knolstory/story-domain';
import {createAuthoringArchive,encodeAuthoringArchive,decodeAuthoringArchive,prepareJsonbSnapshot,restoreJsonbSnapshot} from '../src/authoring-archive';
import {exportAuthoringWorkbook,importAuthoringWorkbook,UNSET} from '../src/authoring-workbook';
import {exportAuthoringExcel,importAuthoringExcel} from '../src/authoring-workbook/excel';
it('preserves a full work with independent effect and music cut ends in every format',async()=>{
 const original=getRepresentativeStory('rabbit').project,first=original.lines[0],end=original.lines[2].id;
 const project={...original,lines:original.lines.map(line=>line.id===first.id?{...line,presentation:{...line.presentation,effects:[{id:'bounded',type:'shake' as const,scope:'following' as const,endLineId:end},{id:'unbounded',type:'flash' as const,scope:'following' as const}]},audio:{...line.audio,music:{action:'play' as const,assetId:'audio:music:forest',endLineId:end}}}:line)};
 const archive=await createAuthoringArchive({format:'knolstory',document:createStoryDocument({project,savedAt:'2026-10-11T00:00:00.000Z',appVersion:'test'})});
 expect(archive.format==='knolstory'&&archive.document.schemaVersion).toBe(8);
 expect(await decodeAuthoringArchive(await encodeAuthoringArchive(archive))).toEqual(archive);
 const workbook=await exportAuthoringWorkbook(archive);expect(workbook.formatVersion).toBe(8);
 expect(workbook.tables.presentationEffects.headers).toContain('endLineId');expect(workbook.tables.audioTracks.headers).toContain('endLineId');
 expect(await importAuthoringWorkbook(workbook)).toEqual(archive);expect(await importAuthoringExcel(await exportAuthoringExcel(archive))).toEqual(archive);
 expect(await restoreJsonbSnapshot(await prepareJsonbSnapshot(archive))).toEqual(archive);
 const old={...archive.format==='knolstory'?archive.document:{},schemaVersion:6};expect(parseStoryDocument(old).ok).toBe(false);
});
it('migrates a duration-era v6 workbook without creating endpoints and preserves old document6',async()=>{
 const doc=getRepresentativeStory('rabbit');const archive=await createAuthoringArchive({format:'knolstory',document:doc}),current=await exportAuthoringWorkbook(archive);
 const tables={...current.tables};for(const key of ['presentationEffects','audioTracks']){const t=tables[key];tables[key]={headers:t.headers.filter(h=>h!=='endLineId'),rows:t.rows.map(r=>r.filter((_,i)=>t.headers[i]!=='endLineId'))};}
 const meta=tables.metadata;tables.metadata={...meta,rows:meta.rows.map(r=>r.map((v,i)=>['version','schemaVersion'].includes(meta.headers[i])?'6':v))};
 expect(await importAuthoringWorkbook({...current,formatVersion:6,tables})).toEqual(archive);
 expect(parseStoryDocument({...doc,schemaVersion:6}).ok).toBe(true);
});
