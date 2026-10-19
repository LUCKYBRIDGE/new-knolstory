import {it,expect} from 'vitest';
import {getRepresentativeStory} from '@knolstory/compatibility';
import {moveStoryAudioStart,undoStoryAudioStart} from '../src/audio-start';
import {createStoryDocument} from '@knolstory/story-domain';
import {compileStoryAudio} from '../src/audio';
import {createAuthoringArchive,encodeAuthoringArchive,decodeAuthoringArchive,prepareJsonbSnapshot,restoreJsonbSnapshot} from '../../compatibility/src/authoring-archive';
import {exportAuthoringWorkbook,importAuthoringWorkbook} from '../../compatibility/src/authoring-workbook';
import {exportAuthoringExcel,importAuthoringExcel} from '../../compatibility/src/authoring-workbook/excel';
it('moves only chosen continuous cue and undoes around later script and other-channel changes',()=>{
 const base=getRepresentativeStory('rabbit').project,[a,b,c]=base.lines,cue={action:'play' as const,assetId:'audio:music:forest',volume:.23,loop:true,fadeInMs:300,fadeOutMs:600,endLineId:c.id};const project={...base,lines:base.lines.map(line=>line.id===a.id?{...line,audio:{music:cue,sounds:[{id:'keep',assetId:'audio:sound:chime'}]}}:line.id===b.id?{...line,audio:undefined}:line)};
 const moved=moveStoryAudioStart(project,a.id,b.id,'music');expect(moved.project.lines[0].audio).toEqual({sounds:project.lines[0].audio?.sounds});expect(moved.project.lines[1].audio?.music).toEqual(cue);expect(moved.project.lines[1].text).toBe(b.text);
 const later={...moved.project,lines:moved.project.lines.map(line=>line.id===b.id?{...line,text:'수정한 글',audio:{...line.audio,ambience:{action:'maintain' as const}}}:line)};const undo=undoStoryAudioStart(later,moved.undo);expect(undo.lines[0].audio).toEqual(project.lines[0].audio);expect(undo.lines[1].audio).toEqual({ambience:{action:'maintain'}});expect(undo.lines[1].text).toBe('수정한 글');
 expect(()=>moveStoryAudioStart(project,a.id,a.id,'music')).toThrow();const occupied={...project,lines:project.lines.map(line=>line.id===b.id?{...line,audio:{music:{action:'stop' as const}}}:line)};expect(()=>moveStoryAudioStart(occupied,a.id,b.id,'music')).toThrow('기존');
});
it('preserves ambience cue in all formats and resolves from new start until endpoint',async()=>{
 const base=getRepresentativeStory('rabbit').project,[a,b,c,d]=base.lines,cue={action:'play' as const,assetId:'audio:music:forest',volume:.23,loop:false,fadeInMs:300,endLineId:c.id};const project={...base,chapters:base.chapters.map(ch=>({...ch,audio:undefined})),lines:base.lines.map(line=>({...line,audio:line.id===a.id?{ambience:cue}:undefined}))};
 const moved=moveStoryAudioStart(project,a.id,b.id,'ambience');const resolver=()=>({runtimePath:'assets/audio/forest.ogg'});expect(compileStoryAudio(moved.project,c.id,resolver,[a.id,b.id,c.id]).ambience?.action).toBe('play');expect(compileStoryAudio(moved.project,d.id,resolver,[a.id,b.id,c.id,d.id]).ambience?.action).toBe('stop');
 const archive=await createAuthoringArchive({format:'knolstory',document:createStoryDocument({project:moved.project,savedAt:'2026-10-11T00:00:00.000Z',appVersion:'audio-start-test'})});expect(await decodeAuthoringArchive(await encodeAuthoringArchive(archive))).toEqual(archive);expect(await importAuthoringWorkbook(await exportAuthoringWorkbook(archive))).toEqual(archive);expect(await importAuthoringExcel(await exportAuthoringExcel(archive))).toEqual(archive);expect(await restoreJsonbSnapshot(await prepareJsonbSnapshot(archive))).toEqual(archive);
 const changed={...moved.project,lines:moved.project.lines.map(line=>line.id===b.id?{...line,audio:{...line.audio,ambience:{action:'stop' as const}}}:line)};expect(()=>undoStoryAudioStart(changed,moved.undo)).toThrow('변경');
},30000);
