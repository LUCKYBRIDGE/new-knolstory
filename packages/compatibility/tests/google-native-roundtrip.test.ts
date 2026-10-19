import {it,expect} from 'vitest';
import {existsSync,readFileSync} from 'node:fs';
import {importAuthoringExcel} from '../src/authoring-workbook/excel';
const path='docs/architecture/evidence/authoring-format/shortstory-google-edited.xlsx';
it.skipIf(!existsSync(path))('actual native Google Sheets XLSX preserves all tabs and applies Korean text edits',async()=>{const archive=await importAuthoringExcel(new Uint8Array(readFileSync(path)));if(archive.format!=='shortstory')throw Error('kind');expect(archive.project.pages[0]).toMatchObject({id:'page-1',title:'시트에서 쓴 그림책 제목',text:'001 한국어 첫 문장\n=문구와 이모지 🌳를 그대로 보존합니다.'});});
import {completeStoryDocument,completeAudioResources} from './fixtures/authoring-complete';
import {createAuthoringArchive} from '../src/authoring-archive';
const storyPath='docs/architecture/evidence/authoring-format/story-google-edited.xlsx';
it.skipIf(!existsSync(storyPath))('actual Google edits nested authored fields and retains all other content and audio bytes',async()=>{
 const result=await importAuthoringExcel(new Uint8Array(readFileSync(storyPath))),expected=await createAuthoringArchive({format:'knolstory',document:completeStoryDocument(),audioResources:completeAudioResources()});if(result.format!=='knolstory'||expected.format!=='knolstory')throw Error('kind');
 expected.document.project.lines[0].text='Google 시트에서 고친 한국어\n001 =문구와 이모지 🌱';expected.document.project.lines[0].stageComposition!.leftActors[0].xAnchor=40;expected.document.project.cover!.design!.faces.front.elements[0].box.x=.12;expected.document.project.creativeMemos[0].fields[0].value='Google에서 편집한 메모\n🌱 001';expected.document.project.lines[0].presentation!.effects![0].delayMs=35;expect(result).toEqual(expected);
});
