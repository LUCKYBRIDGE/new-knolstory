import {it,expect} from 'vitest';
import {existsSync,readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {completeStoryDocument,completeAudioResources} from './fixtures/authoring-complete';
import {createAuthoringArchive,encodeAuthoringArchive,prepareJsonbSnapshot,restoreJsonbSnapshot} from '../src/authoring-archive';
import {exportAuthoringExcel,importAuthoringExcel} from '../src/authoring-workbook/excel';
const directory='docs/architecture/evidence/editor-terminology';
it('exports complete current seconds workbook without changing authored milliseconds',async()=>{
 const archive=await createAuthoringArchive({format:'knolstory',document:completeStoryDocument(),audioResources:completeAudioResources()});
 const bytes=await exportAuthoringExcel(archive);expect(await importAuthoringExcel(bytes)).toEqual(archive);
 if(process.env.TERMS_WRITE_EVIDENCE==='1'){mkdirSync(directory,{recursive:true});writeFileSync(`${directory}/seconds-story.xlsx`,bytes);writeFileSync(`${directory}/seconds-story.knolstory`,await encodeAuthoringArchive(archive));}
});
for(const app of ['excel','google'])it.skipIf(!existsSync(`${directory}/seconds-${app}-edited.xlsx`))(`actual ${app} decimal second edits preserve all unrelated fields and JSONB`,async()=>{
 const doc=completeStoryDocument(),p=doc.project;
 const document={...doc,project:{...p,chapters:p.chapters.map((c,i)=>i?c:{...c,audio:{...c.audio,music:{...c.audio!.music!,fadeInMs:230},sounds:c.audio!.sounds!.map((s,j)=>j?s:{...s,delayMs:100})}}),lines:p.lines.map((l,i)=>i?l:{...l,stageComposition:{...l.stageComposition!,leftActors:l.stageComposition!.leftActors.map((a,j)=>j?a:{...a,motion:{...a.motion!,durationMs:450}})}})}};
 const expected=await createAuthoringArchive({format:'knolstory',document,audioResources:completeAudioResources()});
 const restored=await importAuthoringExcel(new Uint8Array(readFileSync(`${directory}/seconds-${app}-edited.xlsx`)));expect(restored).toEqual(expected);expect(await restoreJsonbSnapshot(await prepareJsonbSnapshot(restored))).toEqual(expected);
});
