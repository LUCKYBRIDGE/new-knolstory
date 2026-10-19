import {it,expect} from 'vitest';
import {getRepresentativeStory} from '@knolstory/compatibility';
import {applyStorySoundBatch,undoStorySoundBatch} from '../src/sound-batch';
import {createStoryDocument} from '@knolstory/story-domain';
import {compileStoryAudio} from '../src/audio';
import {createAuthoringArchive,encodeAuthoringArchive,decodeAuthoringArchive,prepareJsonbSnapshot,restoreJsonbSnapshot} from '../../compatibility/src/authoring-archive';
import {exportAuthoringWorkbook,importAuthoringWorkbook} from '../../compatibility/src/authoring-workbook';
import {exportAuthoringExcel,importAuthoringExcel} from '../../compatibility/src/authoring-workbook/excel';
it('adds independent IDs to explicit cuts and removes only added cues after later edits',()=>{
 const base=getRepresentativeStory('rabbit').project,ids=base.lines.slice(0,2).map(line=>line.id),cue={id:'source',assetId:'audio:sound:chime',volume:.23,delayMs:100};
 const moved=applyStorySoundBatch(base,ids,cue,['batch-one','batch-two']);expect(moved.project.lines[0].audio?.sounds?.at(-1)).toEqual({...cue,id:'batch-one'});expect(moved.project.lines[1].audio?.sounds?.at(-1)?.id).toBe('batch-two');expect(moved.project.lines[2]).toEqual(base.lines[2]);
 const later={...moved.project,lines:moved.project.lines.map((line,index)=>index===0?{...line,text:'후속 글',audio:{...line.audio,sounds:[...line.audio?.sounds??[],{id:'later',assetId:'audio:sound:chime'}]}}:line)};const undo=undoStorySoundBatch(later,moved.undo);expect(undo.lines[0].text).toBe('후속 글');expect(undo.lines[0].audio?.sounds?.at(-1)?.id).toBe('later');expect(undo.lines[1].audio).toEqual(base.lines[1].audio);
 expect(()=>applyStorySoundBatch(base,ids,cue,['same','same'])).toThrow();expect(()=>applyStorySoundBatch(base,['missing'],cue,['new'])).toThrow();
});
it('rejects the entire batch if one cut is full and preserves complete work in all formats',async()=>{
 const base=getRepresentativeStory('rabbit').project,ids=base.lines.slice(0,2).map(line=>line.id),cue={id:'source',assetId:'audio:sound:chime',delayMs:230,volume:.4};const full={...base,lines:base.lines.map((line,index)=>index===1?{...line,audio:{sounds:Array.from({length:4},(_,i)=>({...cue,id:`full-${i}`}))}}:line)};expect(()=>applyStorySoundBatch(full,ids,cue,['one','two'])).toThrow('4개');
 const result=applyStorySoundBatch(base,ids,cue,['one','two']);for(const id of ids)expect(compileStoryAudio(result.project,id,()=>({runtimePath:'assets/audio/test.ogg'}),[id]).sounds.some(sound=>sound.delayMs===230)).toBe(true);
 const archive=await createAuthoringArchive({format:'knolstory',document:createStoryDocument({project:result.project,savedAt:'2026-10-11T00:00:00.000Z',appVersion:'batch-test'})});expect(await decodeAuthoringArchive(await encodeAuthoringArchive(archive))).toEqual(archive);expect(await importAuthoringWorkbook(await exportAuthoringWorkbook(archive))).toEqual(archive);expect(await importAuthoringExcel(await exportAuthoringExcel(archive))).toEqual(archive);expect(await restoreJsonbSnapshot(await prepareJsonbSnapshot(archive))).toEqual(archive);
 const changed={...result.project,lines:result.project.lines.map((line,index)=>index===0?{...line,audio:{...line.audio,sounds:[]}}:line)};expect(()=>undoStorySoundBatch(changed,result.undo)).toThrow('변경');
},30000);
