import {expect,it} from 'vitest';
import cc0Audio from '../../asset-registry/src/external-cc0-audio.json';
import {getRepresentativeStory} from '../src';
import {createAuthoringArchive,prepareJsonbSnapshot,restoreJsonbSnapshot,encodeAuthoringArchive,decodeAuthoringArchive} from '../src/authoring-archive';
import {exportAuthoringWorkbook,importAuthoringWorkbook} from '../src/authoring-workbook';
import {exportAuthoringExcel,importAuthoringExcel} from '../src/authoring-workbook/excel';

it('preserves all 21 CC0 catalog references through archive, JSONB, workbook and XLSX',async()=>{
 const entries=cc0Audio;
 const original=getRepresentativeStory('rabbit');
 expect(original.project.lines.length).toBeGreaterThanOrEqual(entries.length);
 const document={...original,project:{...original.project,lines:original.project.lines.map((line,i)=>{
  const entry=entries[i];if(!entry)return line;
  return {...line,audio:entry.kind==='sound'?{sounds:[{id:`cc0-${i}`,assetId:entry.id,volume:.5}]}:entry.metadata?.category==='ambience'?{ambience:{action:'play' as const,assetId:entry.id,volume:.2,loop:true}}:{music:{action:'play' as const,assetId:entry.id,volume:.2,loop:true}}};
 })}};
 const archive=await createAuthoringArchive({format:'knolstory',document});
 expect(await decodeAuthoringArchive(await encodeAuthoringArchive(archive))).toEqual(archive);
 expect(await restoreJsonbSnapshot(await prepareJsonbSnapshot(archive))).toEqual(archive);
 expect(await importAuthoringWorkbook(await exportAuthoringWorkbook(archive))).toEqual(archive);
 expect(await importAuthoringExcel(await exportAuthoringExcel(archive))).toEqual(archive);
});
