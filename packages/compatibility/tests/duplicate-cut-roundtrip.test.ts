import {it,expect} from 'vitest';
import {createStoryDocument} from '@knolstory/story-domain';
import {duplicateStoryCut} from '../../runtime-core/src/editor-authoring';
import {getRepresentativeStory} from '../src';
import {createAuthoringArchive,encodeAuthoringArchive,decodeAuthoringArchive,prepareJsonbSnapshot,restoreJsonbSnapshot} from '../src/authoring-archive';
import {exportAuthoringWorkbook,importAuthoringWorkbook} from '../src/authoring-workbook';
import {exportAuthoringExcel,importAuthoringExcel} from '../src/authoring-workbook/excel';

it('roundtrips a real copied self-branch with collision-safe choice IDs and full original content',async()=>{
 const base=getRepresentativeStory('rabbit').project,[source,other]=base.lines;
 const branchCondition={sourceLineId:source.id,choiceId:'original-choice'};
 const project={...base,lines:base.lines.map(line=>line.id===source.id?{...line,flow:{type:'choice' as const,options:[{id:'original-choice',label:'내 갈래 다시',targetLineId:source.id},{id:'other-choice',label:'다음 컷',targetLineId:other.id}]},presentation:{...line.presentation,effects:[{id:'self-effect',type:'shake' as const,scope:'following' as const,endLineId:source.id,branchCondition}]},audio:{music:{action:'play' as const,assetId:'audio:music:forest',endLineId:source.id,branchCondition},sounds:[{id:'self-sfx',assetId:'audio:sound:bell',branchCondition}]}}:line.id===other.id?{...line,flow:{type:'choice' as const,options:[{id:'copy-choice-1',label:'원래 컷으로',targetLineId:source.id},{id:'external-choice',label:'끝',targetLineId:null}]}}:line)};
 const before=structuredClone(project),copied=duplicateStoryCut(project,source.id,'copy'),copy=copied.lines.find(line=>line.id==='copy')!;
 expect(project).toEqual(before);for(const line of project.lines){const current=copied.lines.find(candidate=>candidate.id===line.id)!;expect(current).toEqual({...line,order:current.order});}
 expect(copy.flow?.type==='choice'&&copy.flow.options[0].id).toBe('copy-choice-1-1');
 expect(copy.audio?.music).toMatchObject({endLineId:'copy',branchCondition:{sourceLineId:'copy',choiceId:'copy-choice-1-1'}});
 const archive=await createAuthoringArchive({format:'knolstory',document:createStoryDocument({project:copied,savedAt:'2026-10-14T00:00:00.000Z',appVersion:'duplicate-regression'})});
 expect(await decodeAuthoringArchive(await encodeAuthoringArchive(archive))).toEqual(archive);
 expect(await importAuthoringWorkbook(await exportAuthoringWorkbook(archive))).toEqual(archive);
 expect(await importAuthoringExcel(await exportAuthoringExcel(archive))).toEqual(archive);
 expect(await restoreJsonbSnapshot(await prepareJsonbSnapshot(archive))).toEqual(archive);
});
