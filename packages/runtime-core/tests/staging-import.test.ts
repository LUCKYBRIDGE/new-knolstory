import {it,expect} from 'vitest';
import {getRepresentativeStory} from '@knolstory/compatibility';
import {importStoryStaging,undoStoryStagingImport} from '../src/staging-import';
import {createStoryDocument} from '@knolstory/story-domain';
import {createAuthoringArchive,encodeAuthoringArchive,decodeAuthoringArchive,prepareJsonbSnapshot,restoreJsonbSnapshot} from '../../compatibility/src/authoring-archive';
import {exportAuthoringWorkbook,importAuthoringWorkbook} from '../../compatibility/src/authoring-workbook';
import {exportAuthoringExcel,importAuthoringExcel} from '../../compatibility/src/authoring-workbook/excel';
it('copies chosen resolved background and placement, preserving target script and rules',()=>{
 const seed=getRepresentativeStory('rabbit').project,source=seed.lines[0],target=seed.lines[1];
 const project={...seed,lines:seed.lines.map(line=>line.id===source.id?{...line,backgroundId:'',backgroundMode:'none' as const,inheritActors:false,stageComposition:{leftActors:[{key:'source',assetId:source.leftAssetId||seed.chapters[0].leftAssetId,xAnchor:31,scaleMultiplier:.9,motion:{type:'move' as const,durationMs:900}}],rightActors:[]}}:line)};
 const result=importStoryStaging(project,source.id,target.id,{background:true,actors:true});const edited=result.project.lines[1];
 expect(edited.backgroundMode).toBe('none');expect(edited.stageComposition?.leftActors[0]).toMatchObject({xAnchor:31,scaleMultiplier:.9});expect(edited.stageComposition?.leftActors[0].motion).toBeUndefined();
 for(const key of ['text','speaker','speakerName','flow','audio','presentation','purposeNote'] as const)expect(edited[key]).toEqual(target[key]);
 const changed={...result.project,lines:result.project.lines.map(line=>line.id===target.id?{...line,text:'배치 적용 뒤 수정한 글'}:line)};const undo=undoStoryStagingImport(changed,result.undo);expect(undo.lines[1]).toEqual({...target,text:'배치 적용 뒤 수정한 글'});
 expect(project.lines[0].stageComposition?.leftActors[0].motion).toBeTruthy();
 const motion=importStoryStaging(project,source.id,target.id,{background:false,actors:true,motion:true});expect(motion.project.lines[1].stageComposition?.leftActors[0].motion).toEqual(project.lines[0].stageComposition?.leftActors[0].motion);expect(motion.project.lines[1].backgroundId).toBe(target.backgroundId);
});
it('rejects missing/same cuts and stale undo without changing unrelated work',()=>{
 const project=getRepresentativeStory('rabbit').project,source=project.lines[0].id,target=project.lines[1].id;
 expect(()=>importStoryStaging(project,source,source,{background:true,actors:true})).toThrow();expect(()=>importStoryStaging(project,'missing',target,{background:true,actors:false})).toThrow();
 const result=importStoryStaging(project,source,target,{background:true,actors:false});const modified={...result.project,lines:result.project.lines.map(line=>line.id===target?{...line,backgroundId:'changed'}:line)};
 expect(()=>undoStoryStagingImport(modified,result.undo)).toThrow();
});
it('explicit motion import and background-only selection roundtrip the whole authored work',async()=>{
 const project=getRepresentativeStory('seonnyeo').project,source=project.lines[0].id,target=project.lines[1].id;
 const copied=importStoryStaging(project,source,target,{background:true,actors:true,motion:true});
 const archive=await createAuthoringArchive({format:'knolstory',document:createStoryDocument({project:copied.project,savedAt:'2026-10-11T00:00:00.000Z',appVersion:'staging-import-test'})});
 expect(await decodeAuthoringArchive(await encodeAuthoringArchive(archive))).toEqual(archive);
 expect(await importAuthoringWorkbook(await exportAuthoringWorkbook(archive))).toEqual(archive);
 expect(await importAuthoringExcel(await exportAuthoringExcel(archive))).toEqual(archive);
 expect(await restoreJsonbSnapshot(await prepareJsonbSnapshot(archive))).toEqual(archive);
 const backgroundOnly=importStoryStaging(project,source,target,{background:true,actors:false});expect(backgroundOnly.project.lines[1].stageComposition).toEqual(project.lines[1].stageComposition);
 expect(undoStoryStagingImport(copied.project,copied.undo).lines).toEqual(project.lines);
},30000);
