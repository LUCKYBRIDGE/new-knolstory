import {it,expect} from 'vitest';
import {createStoryDocument} from '@knolstory/story-domain';
import {getRepresentativeStory} from '../src';
import {createAuthoringArchive,encodeAuthoringArchive,decodeAuthoringArchive,prepareJsonbSnapshot,restoreJsonbSnapshot,type AuthoringArchive} from '../src/authoring-archive';
import {exportAuthoringWorkbook,importAuthoringWorkbook,UNSET} from '../src/authoring-workbook';
import {exportAuthoringExcel,importAuthoringExcel} from '../src/authoring-workbook/excel';
async function fixture(){
 const base=getRepresentativeStory('rabbit').project,[source,join]=base.lines;
 const branchCondition={sourceLineId:source.id,choiceId:'left'};
 const audio={music:{action:'play' as const,assetId:'audio:music:forest',branchCondition},ambience:{action:'play' as const,assetId:'audio:music:forest',branchCondition},sounds:[{id:'sfx',assetId:'audio:sound:bell',branchCondition}]};
 const project={...base,chapters:base.chapters.map((chapter,index)=>index===0?{...chapter,audio}:chapter),lines:base.lines.map(line=>line.id===source.id?{...line,flow:{type:'choice' as const,options:[{id:'left',label:'첫 길',targetLineId:join.id},{id:'right',label:'둘째 길',targetLineId:join.id}]}}:line.id===join.id?{...line,audio,presentation:{effects:[{id:'fx',type:'shake' as const,branchCondition}]}}:line)};
 return createAuthoringArchive({format:'knolstory',document:createStoryDocument({project,savedAt:'2026-10-14T00:00:00.000Z',appVersion:'branch-test'})});
}
it('preserves the entire branch-conditioned work across archive, workbook, XLSX and JSONB including same-target choices',async()=>{
 const archive=await fixture();expect(archive.format==='knolstory'&&archive.document.schemaVersion).toBe(8);
 expect(await decodeAuthoringArchive(await encodeAuthoringArchive(archive))).toEqual(archive);
 const book=await exportAuthoringWorkbook(archive);expect(book.formatVersion).toBe(8);
 for(const key of ['presentationEffects','audioTracks','audioSounds'])expect(book.tables[key].headers).toEqual(expect.arrayContaining(['branchConditionPresent','branchSourceLineId','branchChoiceId']));
 expect(await importAuthoringWorkbook(book)).toEqual(archive);
 expect(await importAuthoringExcel(await exportAuthoringExcel(archive))).toEqual(archive);
 expect(await restoreJsonbSnapshot(await prepareJsonbSnapshot(archive))).toEqual(archive);
});
it('rejects inconsistent presence, partial pairs, missing references and branch fields under older workbook declarations',async()=>{
 const book=await exportAuthoringWorkbook(await fixture());
 for(const key of ['presentationEffects','audioTracks','audioSounds'])for(const [field,value]of [['branchConditionPresent','없음'],['branchSourceLineId',UNSET],['branchChoiceId',UNSET],['branchSourceLineId','missing'],['branchChoiceId','missing']] as const){
  const table=book.tables[key],index=table.headers.indexOf(field);
  const bad={...book,tables:{...book.tables,[key]:{...table,rows:table.rows.map((row,i)=>i===0?row.map((cell,j)=>j===index?value:cell):row)}}};
  await expect(importAuthoringWorkbook(bad)).rejects.toThrow();
 }
 for(const version of [2,3,4,5,6,7] as const){const metadata=book.tables.metadata;const bad={...book,formatVersion:version,tables:{...book.tables,metadata:{...metadata,rows:metadata.rows.map(row=>row.map((cell,i)=>metadata.headers[i]==='version'?String(version):cell))}}};await expect(importAuthoringWorkbook(bad)).rejects.toThrow();}
});
function canonical(value:unknown):string{if(Array.isArray(value))return `[${value.map(canonical).join(',')}]`;if(value&&typeof value==='object')return `{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${canonical((value as Record<string,unknown>)[key])}`).join(',')}}`;return JSON.stringify(value);}
async function oldSnapshot(content:AuthoringArchive){const fingerprint=content.format==='knolstory'?{...content,document:Object.fromEntries(Object.entries(content.document).filter(([key])=>!['savedAt','appVersion'].includes(key)))}:content;const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonical(fingerprint)));return {payloadVersion:1,content,contentSha256:Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join(''),assetReferences:[]};}
it('restores authentic previous schema snapshots using the original fingerprint and migrates without touching source values',async()=>{
 const archive=await createAuthoringArchive({format:'knolstory',document:getRepresentativeStory('rabbit')});if(archive.format!=='knolstory')throw Error('kind');
 for(const version of [2,3,4,5,6,7] as const){const content={...archive,document:{...archive.document,schemaVersion:version}} as unknown as AuthoringArchive;const snapshot=await oldSnapshot(content),before=structuredClone(snapshot);expect(await restoreJsonbSnapshot(snapshot)).toEqual(archive);expect(snapshot).toEqual(before);await expect(restoreJsonbSnapshot({...snapshot,contentSha256:'0'.repeat(64)})).rejects.toThrow();}
 const book=await exportAuthoringWorkbook(archive),tables={...book.tables};for(const key of ['presentationEffects','audioTracks','audioSounds']){const t=tables[key];tables[key]={headers:t.headers.filter(h=>!h.startsWith('branch')),rows:t.rows.map(r=>r.filter((_,i)=>!t.headers[i].startsWith('branch')))};}
 const meta=tables.metadata;tables.metadata={...meta,rows:meta.rows.map(row=>row.map((cell,i)=>['version','schemaVersion'].includes(meta.headers[i])?'7':cell))};expect(await importAuthoringWorkbook({...book,formatVersion:7,tables})).toEqual(archive);
});
