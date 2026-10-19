import {it,expect} from 'vitest';
import {existsSync,readFileSync} from 'node:fs';
import {importAuthoringExcel} from '../src/authoring-workbook/excel';
import {completeStoryDocument,completeAudioResources} from './fixtures/authoring-complete';
import {createAuthoringArchive} from '../src/authoring-archive';
const path='docs/architecture/evidence/authoring-format/story-excel-edited.xlsx';
it.skipIf(!existsSync(path))('actual Microsoft Excel saves text and stage edits without losing any other authoring field or audio byte',async()=>{
 const result=await importAuthoringExcel(new Uint8Array(readFileSync(path)));
 const expected=await createAuthoringArchive({format:'knolstory',document:completeStoryDocument(),audioResources:completeAudioResources()});
 if(result.format!=='knolstory'||expected.format!=='knolstory')throw Error('kind');
 const project=expected.document.project;
 const lines=project.lines.map((line,index)=>index===0?{...line,text:'Excel에서 수정한 한국어 001 🌳',stageComposition:{...line.stageComposition!,leftActors:line.stageComposition!.leftActors.map((actor,i)=>i===0?{...actor,xAnchor:45}:actor)}}:line);
 expect(result).toEqual({...expected,document:{...expected.document,project:{...project,lines}}});
});
import {completeShortStoryProject} from './fixtures/authoring-complete';
const shortPath='docs/architecture/evidence/authoring-format/shortstory-excel-edited.xlsx';
it.skipIf(!existsSync(shortPath))('actual Microsoft Excel preserves every ShortStory page and cover field after text editing',async()=>{
 const result=await importAuthoringExcel(new Uint8Array(readFileSync(shortPath)));
 const project=completeShortStoryProject();
 expect(result).toEqual(await createAuthoringArchive({format:'shortstory',project:{...project,pages:project.pages.map((page,i)=>i===0?{...page,text:'Excel에서 편집한 그림책 001 🌳'}:page)}}));
});
