import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {getRepresentativeStory} from '../src/index';
import {decodeAuthoringArchive,validateAuthoringArchive} from '../src/authoring-archive';

function staleProjectionDocument(){
 const original=getRepresentativeStory('rabbit');
 const stageComposition={leftActors:[{key:'left',assetId:'authored-left',xAnchor:30}],rightActors:[{key:'right',assetId:'authored-right',xAnchor:70}],speakerActorKey:'left'};
 return {...original,project:{...original.project,lines:original.project.lines.map((line,index)=>index?line:{...line,type:'dialogue' as const,speaker:'left' as const,inheritActors:false,stageComposition,leftAssetId:'stale-left',rightAssetId:''})}};
}

describe('explicit current Next plain document adapter',()=>{
 it('opens the existing responsive audio project while preserving every authored composition',async()=>{
  const project=JSON.parse(readFileSync(new URL('../../../tests/fixtures/responsive-audio.json',import.meta.url),'utf8'));
  const input={...getRepresentativeStory('rabbit'),project};
  const archive=await decodeAuthoringArchive(JSON.stringify(input));
  if(archive.format!=='knolstory')throw Error('Expected story archive');
  expect(archive.document.project.lines).toEqual(project.lines.map((line:Record<string,unknown>)=>{
   const stage=line.stageComposition as {leftActors:{assetId:string}[];rightActors:{assetId:string}[]};
   return {...line,leftAssetId:stage.leftActors[0]?.assetId??'',rightAssetId:stage.rightActors[0]?.assetId??''};
  }));
  expect({...archive.document.project,lines:[]}).toEqual({...project,lines:[]});
 });
 it('reconciles only side asset projections to the authored composition without mutating input',async()=>{
  const input=staleProjectionDocument(),before=structuredClone(input);
  const archive=await decodeAuthoringArchive(JSON.stringify({...input,audioResources:[]}));
  expect(archive.format).toBe('knolstory');
  if(archive.format!=='knolstory')throw Error('Expected story archive');
  const expected={...input,project:{...input.project,lines:input.project.lines.map((line,index)=>index?line:{...line,leftAssetId:'authored-left',rightAssetId:'authored-right'})}};
  expect(archive.document).toEqual(expected);
  expect(input).toEqual(before);
  expect(await validateAuthoringArchive(archive)).toEqual(archive);
 });
 it('keeps official v2 strict about inconsistent projections',async()=>{
  await expect(validateAuthoringArchive({format:'knolstory',formatVersion:2,document:staleProjectionDocument(),audioResources:[]})).rejects.toThrow('leftAssetId');
 });
 it('still rejects unknown authored keys and invalid composition values in plain documents',async()=>{
  const input=staleProjectionDocument();
  for(const patch of [{futureAuthoredText:'keep me'},{stageComposition:{leftActors:[{key:'left',assetId:'authored-left',xAnchor:999}],rightActors:[]}}]){
   const project={...input.project,lines:input.project.lines.map((line,index)=>index?line:{...line,...patch})};
   await expect(decodeAuthoringArchive(JSON.stringify({...input,project}))).rejects.toThrow();
  }
 });
 it('does not authorize normalization of other supplied authored values',async()=>{
  const input=staleProjectionDocument();
  const project={...input.project,lines:input.project.lines.map((line,index)=>index?line:{...line,speaker:'right'})};
  await expect(decodeAuthoringArchive(JSON.stringify({...input,project}))).rejects.toThrow('speaker');
 });
});
