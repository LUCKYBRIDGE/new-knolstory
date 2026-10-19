import {expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {decodeAuthoringArchive,prepareJsonbSnapshot,restoreJsonbSnapshot} from '../src/authoring-archive';
import {importAuthoringExcel} from '../src/authoring-workbook/excel';
import {compileStoryScene} from '../../runtime-core/src/story-runtime';
const directory='docs/architecture/evidence/non-audio-direction';
for(const app of ['excel','google'])it(`actual ${app} effect duration edit preserves the whole real work and compiles through Core`,async()=>{
 const original=await decodeAuthoringArchive(readFileSync(`${directory}/rabbit-effect-duration.knolstory`,'utf8'));if(original.format!=='knolstory')throw Error();
 const project=original.document.project;
 const expected={...original,document:{...original.document,project:{...project,lines:project.lines.map((line,index)=>index?line:{...line,presentation:{...line.presentation,effects:line.presentation!.effects!.map((cue,order)=>order?cue:{...cue,durationMs:600})}})}}};
 const restored=await importAuthoringExcel(new Uint8Array(readFileSync(`${directory}/rabbit-${app}-edited.xlsx`)));
 expect(restored).toEqual(expected);
 expect(await restoreJsonbSnapshot(JSON.parse(JSON.stringify(await prepareJsonbSnapshot(restored))))).toEqual(expected);
 if(restored.format!=='knolstory')throw Error();
 const scene=compileStoryScene(restored.document.project,project.lines[0].id,1,{mode:'play'});
 expect(scene.presentation?.effects?.[0]).toMatchObject({id:'duration-evidence',durationMs:600,delayMs:230});
 expect(scene).toEqual(compileStoryScene(expected.document.project,project.lines[0].id,1,{mode:'play'}));
});
