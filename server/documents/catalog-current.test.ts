import {it,expect} from 'vitest';
import {checkedSnapshot} from './validation';
import {classicStories,representativeStories,resolveProvidedCatalogStory,createAuthoringArchive,prepareJsonbSnapshot} from '../../packages/compatibility/src';

it('accepts every current official manuscript with layered actors for online upload without rewriting it',{timeout:30000},async()=>{
 for(const entry of [...representativeStories,...classicStories]){
  const project=resolveProvidedCatalogStory(entry.project);
  const archive=await createAuthoringArchive({format:'knolstory',document:{documentType:'story-maker-project',schemaVersion:8,savedAt:'2026-11-02T00:00:00.000Z',appVersion:'catalog-upload-regression',project}});
  const snapshot=await prepareJsonbSnapshot(archive);
  expect(await checkedSnapshot(snapshot),entry.id).toEqual(snapshot);
 }
});
it('still rejects an unregistered actor even when the current layered catalogue is accepted',async()=>{
 const project=resolveProvidedCatalogStory(representativeStories.find(entry=>entry.id==='onggojib')!.project);
 const edited={...project,lines:project.lines.map((line,index)=>index?line:{...line,inheritActors:false,leftAssetId:'private:unknown',rightAssetId:'',stageComposition:{leftActors:[{key:'L1',assetId:'private:unknown'}],rightActors:[]}})};
 const archive=await createAuthoringArchive({format:'knolstory',document:{documentType:'story-maker-project',schemaVersion:8,savedAt:'2026-11-02T00:00:00.000Z',appVersion:'catalog-upload-regression',project:edited}});
 await expect(checkedSnapshot(await prepareJsonbSnapshot(archive))).rejects.toMatchObject({code:'CATALOG_MEDIA_REQUIRED',status:422});
});
