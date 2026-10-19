import {it,expect} from 'vitest';
import {writeFileSync,mkdirSync} from 'node:fs';
import {scoreNarrativeDocument} from './fixtures/score-narrative';
import {createAuthoringArchive,encodeAuthoringArchive,decodeAuthoringArchive,prepareJsonbSnapshot,restoreJsonbSnapshot} from '../src/authoring-archive';
import {exportAuthoringExcel,importAuthoringExcel} from '../src/authoring-workbook/excel';
import {createPlayback,advancePlayback,backPlayback,restorePlayback,playbackScores,compileStoryScene} from '../../runtime-core/src/index';
it('scores survive real authoring forms and choose different endings after a shared scene',async()=>{
 const document=scoreNarrativeDocument(),project=document.project,archive=await createAuthoringArchive({format:'knolstory',document});
 expect(await decodeAuthoringArchive(await encodeAuthoringArchive(archive))).toEqual(archive);
 const bytes=await exportAuthoringExcel(archive);expect(await importAuthoringExcel(bytes)).toEqual(archive);expect(await restoreJsonbSnapshot(await prepareJsonbSnapshot(archive))).toEqual(archive);
 let state=advancePlayback(project,createPlayback(project),'help');expect(playbackScores(project,state).trust).toBe(2);
 state=advancePlayback(project,state,'share');expect(state.lineId).toBe('score-join');expect(playbackScores(project,state).trust).toBe(4);expect(advancePlayback(project,state).lineId).toBe('score-together');
 const back=backPlayback(project,state);expect(playbackScores(project,back).trust).toBe(2);expect(advancePlayback(project,back,'keep').lineId).toBe('score-join');expect(advancePlayback(project,advancePlayback(project,back,'keep')).lineId).toBe('score-maybe');
 const ignored=advancePlayback(project,createPlayback(project),'ignore');expect(compileStoryScene(project,ignored.lineId!,1,{mode:'play',playbackState:ignored}).choices!.map(c=>c.id)).toEqual(['keep']);
 const lone=advancePlayback(project,advancePlayback(project,ignored,'keep'));expect(lone.lineId).toBe('score-alone');expect(restorePlayback(project,JSON.parse(JSON.stringify(lone)))).toEqual(lone);
 if(process.env.SCORE_WRITE_EVIDENCE==='1'){const path='docs/architecture/evidence/score-narrative';mkdirSync(path,{recursive:true});writeFileSync(`${path}/score-story.knolstory`,await encodeAuthoringArchive(archive));writeFileSync(`${path}/score-story.xlsx`,bytes);}
});
