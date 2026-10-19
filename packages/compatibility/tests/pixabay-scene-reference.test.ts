import {expect,it} from 'vitest';
import pixabay from '../../asset-registry/src/pixabay-audio.json';
import {getRepresentativeStory} from '../src';
import {createAuthoringArchive,encodeAuthoringArchive,decodeAuthoringArchive,prepareJsonbSnapshot,restoreJsonbSnapshot} from '../src/authoring-archive';
import {exportAuthoringWorkbook,importAuthoringWorkbook} from '../src/authoring-workbook';
import {exportAuthoringExcel,importAuthoringExcel} from '../src/authoring-workbook/excel';
it('exports all 14 conditional cues only as story-bound references across file, JSONB and sheet formats',async()=>{
 const original=getRepresentativeStory('rabbit');expect(original.project.lines.length).toBeGreaterThanOrEqual(pixabay.length);
 const project={...original.project,lines:original.project.lines.map((line,i)=>{
  const asset=pixabay[i];if(!asset)return line;
  return {...line,audio:asset.kind==='sound'?{sounds:[{id:`sound-${i}`,assetId:asset.id,volume:.5}]}:asset.metadata.category==='ambience'?{ambience:{action:'play' as const,assetId:asset.id,volume:.2,loop:true}}:{music:{action:'play' as const,assetId:asset.id,volume:.2,loop:true}}};
 })};
 const archive=await createAuthoringArchive({format:'knolstory',document:{...original,project}});
 if(archive.format!=='knolstory')throw new Error('Expected a story archive');
 expect(archive.audioResources).toEqual([]);
 const file=await encodeAuthoringArchive(archive);expect(file).not.toContain('data:audio');expect(await decodeAuthoringArchive(file)).toEqual(archive);
 const snapshot=await prepareJsonbSnapshot(archive);expect(snapshot.assetReferences).toEqual([]);expect(await restoreJsonbSnapshot(snapshot)).toEqual(archive);
 const workbook=await exportAuthoringWorkbook(archive);expect(workbook.tables.resources.rows).toEqual([]);expect(workbook.tables.resourceTags.rows).toEqual([]);
 expect(await importAuthoringWorkbook(workbook)).toEqual(archive);expect(await importAuthoringExcel(await exportAuthoringExcel(archive))).toEqual(archive);
});
