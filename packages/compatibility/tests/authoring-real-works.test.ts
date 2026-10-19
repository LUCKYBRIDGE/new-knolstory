import {it,expect} from 'vitest';
import {getRepresentativeStory,getClassicStory,getShortStoryOriginal} from '../src';
import {createAuthoringArchive,encodeAuthoringArchive,decodeAuthoringArchive,prepareJsonbSnapshot,restoreJsonbSnapshot} from '../src/authoring-archive';
import {exportAuthoringExcel,importAuthoringExcel} from '../src/authoring-workbook/excel';
for(const work of ['seonnyeo','heungbu','onggojib','rabbit'] as const)for(const kind of ['story','classic','shortstory'] as const)it(`${work} ${kind}: entire actual manuscript survives official file, XLSX and JSONB snapshot`,async()=>{
 const archive=await createAuthoringArchive(kind==='shortstory'?{format:'shortstory',project:getShortStoryOriginal(work)}:{format:'knolstory',document:kind==='classic'?getClassicStory(`${work}-classic`):getRepresentativeStory(work)});
 expect(await decodeAuthoringArchive(await encodeAuthoringArchive(archive))).toEqual(archive);
 expect(await importAuthoringExcel(await exportAuthoringExcel(archive))).toEqual(archive);
 expect(await restoreJsonbSnapshot(await prepareJsonbSnapshot(archive))).toEqual(archive);
},20000);
