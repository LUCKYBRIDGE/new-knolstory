import {it,expect} from 'vitest';
import {getRepresentativeStory} from '../src';
import {AUDIO_CATALOG} from '../../asset-registry/src';
import aliases from '../../asset-registry/src/staged-cc0-audio-aliases.json';
import {createAuthoringArchive,encodeAuthoringArchive,decodeAuthoringArchive,prepareJsonbSnapshot,restoreJsonbSnapshot} from '../src/authoring-archive';
import {exportAuthoringWorkbook,importAuthoringWorkbook} from '../src/authoring-workbook';
import {exportAuthoringExcel,importAuthoringExcel} from '../src/authoring-workbook/excel';
it('preserves every added ID and alias, Korean manuscript and timing in archive JSONB workbook and real XLSX',async()=>{
 const base=getRepresentativeStory('rabbit'),ids=[...AUDIO_CATALOG.filter(asset=>asset.delivery==='on-demand').map(asset=>asset.id),...Object.keys(aliases)];
 const document={...base,project:{...base.project,lines:ids.map((assetId,index)=>({...base.project.lines[0],id:`catalog-cut-${index}`,flow:undefined,audio:{music:{action:'play' as const,assetId,volume:0,loop:false},sounds:[{id:`catalog-${index}`,assetId,volume:0.2,delayMs:index}]}}))}};
 const original=structuredClone(document),archive=await createAuthoringArchive({format:'knolstory',document});
 if(archive.format!=='knolstory')throw Error('knolstory archive expected');
 expect(archive.audioResources).toEqual([]);
 expect(await decodeAuthoringArchive(await encodeAuthoringArchive(archive))).toEqual(archive);
 expect(await restoreJsonbSnapshot(JSON.parse(JSON.stringify(await prepareJsonbSnapshot(archive))))).toEqual(archive);
 const workbook=await exportAuthoringWorkbook(archive);expect(await importAuthoringWorkbook(JSON.parse(JSON.stringify(workbook)))).toEqual(archive);
 expect(await importAuthoringExcel(await exportAuthoringExcel(archive))).toEqual(archive);
 expect(document).toEqual(original);
},30000);
