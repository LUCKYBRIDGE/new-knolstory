import {it,expect} from 'vitest';
import {getRepresentativeStory} from '@knolstory/compatibility';
import {moveStoryEffectStart,undoStoryEffectStart} from '../src/effect-start';
import {compileStoryPresentation} from '../src/presentation-scopes';
import {createStoryDocument} from '@knolstory/story-domain';
import {createAuthoringArchive,encodeAuthoringArchive,decodeAuthoringArchive,prepareJsonbSnapshot,restoreJsonbSnapshot} from '../../compatibility/src/authoring-archive';
import {exportAuthoringWorkbook,importAuthoringWorkbook} from '../../compatibility/src/authoring-workbook';
import {exportAuthoringExcel,importAuthoringExcel} from '../../compatibility/src/authoring-workbook/excel';
it('moves exactly one cue, keeps its end and all unrelated authoring, then undoes around later text edits',()=>{
 const source=getRepresentativeStory('rabbit').project,[a,b,c]=source.lines;const effect={id:'move-me',type:'shake' as const,scope:'following' as const,endLineId:c.id,delayMs:230,durationMs:800};const project={...source,lines:source.lines.map(line=>line.id===a.id?{...line,presentation:{look:{type:'flashback' as const},effects:[effect,{type:'flash' as const}]}}:line.id===b.id?{...line,presentation:{effects:[{id:'keep',type:'flash' as const}]}}:line)};
 const result=moveStoryEffectStart(project,a.id,0,b.id);expect(result.project.lines[0].presentation?.effects).toEqual([{type:'flash'}]);expect(result.project.lines[1].presentation?.effects).toEqual([{id:'keep',type:'flash'},effect]);expect(result.project.lines[0].presentation?.look).toEqual(project.lines[0].presentation?.look);
 expect(result.project.lines[1].text).toBe(b.text);const edited={...result.project,lines:result.project.lines.map(line=>line.id===b.id?{...line,text:'이후 글 수정'}:line)};expect(undoStoryEffectStart(edited,result.undo).lines).toEqual(project.lines.map(line=>line.id===b.id?{...line,text:'이후 글 수정'}:line));
});
it('rejects full destination, absent actor targets and stale undo',()=>{
 const base=getRepresentativeStory('rabbit').project,[a,b]=base.lines;const project={...base,lines:base.lines.map(line=>line.id===a.id?{...line,presentation:{effects:[{type:'shake' as const,target:{kind:'actor' as const,actorKey:'missing'}}]}}:line)};
 expect(()=>moveStoryEffectStart(project,a.id,0,b.id)).toThrow('인물');expect(()=>moveStoryEffectStart(project,a.id,9,b.id)).toThrow();expect(()=>moveStoryEffectStart(project,a.id,0,a.id)).toThrow();
 const plain={...base,lines:base.lines.map(line=>line.id===a.id?{...line,presentation:{effects:[{type:'shake' as const}]}}:line.id===b.id?{...line,presentation:{effects:[{type:'flash' as const},{type:'shake' as const},{type:'flash' as const}]}}:line)};expect(()=>moveStoryEffectStart(plain,a.id,0,b.id)).toThrow('3개');
});
it('keeps whole work through all formats and resolves only from new start through inclusive endpoint',async()=>{
 const source=getRepresentativeStory('rabbit').project,[a,b,c,d]=source.lines;const project={...source,lines:source.lines.map(line=>line.id===a.id?{...line,presentation:{effects:[{id:'range',type:'shake' as const,scope:'following' as const,endLineId:c.id}]}}:line)};
 const result=moveStoryEffectStart(project,a.id,0,b.id);expect(compileStoryPresentation(result.project,a.id,[a.id])?.effects?.find(item=>item.id==='range')).toBeUndefined();expect(compileStoryPresentation(result.project,c.id,[a.id,b.id,c.id])?.effects?.some(item=>item.id==='range')).toBe(true);expect(!!compileStoryPresentation(result.project,d.id,[a.id,b.id,c.id,d.id])?.effects?.some(item=>item.id==='range')).toBe(false);
 const archive=await createAuthoringArchive({format:'knolstory',document:createStoryDocument({project:result.project,savedAt:'2026-10-11T00:00:00.000Z',appVersion:'effect-start-test'})});expect(await decodeAuthoringArchive(await encodeAuthoringArchive(archive))).toEqual(archive);expect(await importAuthoringWorkbook(await exportAuthoringWorkbook(archive))).toEqual(archive);expect(await importAuthoringExcel(await exportAuthoringExcel(archive))).toEqual(archive);expect(await restoreJsonbSnapshot(await prepareJsonbSnapshot(archive))).toEqual(archive);
 const changed={...result.project,lines:result.project.lines.map(line=>line.id===b.id?{...line,presentation:{...line.presentation,effects:[]}}:line)};expect(()=>undoStoryEffectStart(changed,result.undo)).toThrow('변경');
},30000);
