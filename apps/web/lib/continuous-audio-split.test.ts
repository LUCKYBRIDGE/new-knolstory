import type {StoryMusicCue} from '@knolstory/story-domain';
import {it,expect} from 'vitest';
import {createBlankStoryProject,compileStoryAudio} from '@knolstory/runtime-core';
import {splitContinuousAudioRange} from './continuous-audio-split';
import {undoCombinedRange} from './combined-range-edit';
const make=()=>{const p=createBlankStoryProject({id:'split-track',chapterId:'ch',lineId:'a'});return {...p,lines:['a','b','c','d'].map((id,index)=>({...p.lines[0],id,order:index+1,text:`글${index}`,...(index===0?{audio:{music:{action:'play' as const,assetId:'audio:music:forest',volume:.6,loop:true,sourceStartMs:200,sourceEndMs:1800,endLineId:'d'}}}:{})}))};};
it('creates two independently editable cut regions while preserving initial playback and original',()=>{
 const p=make(),before=structuredClone(p),result=splitContinuousAudioRange(p,'a','music','c');expect(p).toEqual(before);expect(result.project.lines[0].audio?.music).toEqual({...p.lines[0].audio!.music,endLineId:'b'});expect(result.project.lines[2].audio?.music).toEqual(p.lines[0].audio!.music);expect(result.project.lines.map(l=>l.text)).toEqual(p.lines.map(l=>l.text));
 const resolver=()=>({runtimePath:'assets/audio/forest.wav'});for(const id of ['a','b','c','d']){const path=p.lines.slice(0,p.lines.findIndex(l=>l.id===id)+1).map(l=>l.id);expect(compileStoryAudio(result.project,id,resolver,path)).toEqual(compileStoryAudio(p,id,resolver,path));}expect(undoCombinedRange(result.project,result.undo).lines).toEqual(p.lines);
});
it('preserves absent end and unrelated channels; undo keeps later text',()=>{
 const base=make(),{endLineId:_end,...cue}=(base.lines[0].audio!.music! as Extract<StoryMusicCue,{action:'play'}>),p={...base,lines:base.lines.map((line,index)=>index===0?{...line,audio:{ambience:{action:'play' as const,assetId:'audio:music:night'},music:{...cue}}}:index===2?{...line,audio:{music:{action:'maintain' as const},sounds:[{id:'keep',assetId:'audio:sound:chime'}]}}:line)};
 const result=splitContinuousAudioRange(p,'a','music','c');expect(result.project.lines[2].audio?.music).toEqual(p.lines[0].audio!.music);expect(result.project.lines[2].audio?.music).not.toHaveProperty('endLineId');expect(result.project.lines[2].audio?.sounds).toEqual(p.lines[2].audio?.sounds);
 const later={...result.project,lines:result.project.lines.map(l=>l.id==='c'?{...l,text:'나중에 쓴 글'}:l)};expect(undoCombinedRange(later,result.undo).lines[2].text).toBe('나중에 쓴 글');
});
it('rejects source/split errors, explicit changes or stops, stale edits and out-of-region cuts',()=>{
 const p=make();for(const split of ['a','missing'])expect(()=>splitContinuousAudioRange(p,'a','music',split)).toThrow();expect(()=>splitContinuousAudioRange(p,'missing','music','c')).toThrow();
 for(const action of ['stop','play'] as const){const blocked={...p,lines:p.lines.map(l=>l.id==='b'?{...l,audio:{music:action==='stop'?{action}:{action,assetId:'audio:music:night'}}}:l)};expect(()=>splitContinuousAudioRange(blocked,'a','music','c')).toThrow();}
 expect(()=>splitContinuousAudioRange({...p,lines:p.lines.map(l=>l.id==='c'?{...l,chapterId:'other'}:l)},'a','music','c')).toThrow();
 const short={...p,lines:p.lines.map(l=>l.id==='a'?{...l,audio:{music:{...l.audio!.music!,endLineId:'b'}}}:l)};expect(()=>splitContinuousAudioRange(short,'a','music','c')).toThrow();
 const result=splitContinuousAudioRange(p,'a','music','c');expect(()=>undoCombinedRange({...result.project,lines:result.project.lines.map(l=>l.id==='c'?{...l,audio:{music:{action:'stop' as const}}}:l)},result.undo)).toThrow();
});
it('splits ambience separately and keeps a following channel directive untouched',()=>{
 const p=make(),q={...p,lines:p.lines.map((l,i)=>i===0?{...l,audio:{...l.audio,ambience:{action:'play' as const,assetId:'audio:music:night'}}}:i===3?{...l,audio:{ambience:{action:'stop' as const,fadeOutMs:400}}}:l)};
 const r=splitContinuousAudioRange(q,'a','ambience','c');expect(r.project.lines[0].audio?.music).toEqual(q.lines[0].audio?.music);expect(r.project.lines[3]).toEqual(q.lines[3]);expect(undoCombinedRange(r.project,r.undo).lines).toEqual(q.lines);
});

it('refuses branching, merging and conditional playback rather than changing unvisited paths',()=>{const p=make();const variants=[{...p,lines:p.lines.map(l=>l.id==='a'?{...l,flow:{type:'choice' as const,options:[{id:'yes',label:'예',targetLineId:'b'},{id:'no',label:'아니오',targetLineId:'c'}]}}:l)},{...p,lines:[...p.lines,{...p.lines[0],id:'outside',order:10,audio:undefined,flow:{type:'goto' as const,targetLineId:'c'}}]},{...p,lines:p.lines.map(l=>l.id==='a'?{...l,audio:{music:{...l.audio!.music!,branchCondition:{sourceLineId:'a',choiceId:'yes'}}}}:l)}];for(const q of variants)expect(()=>splitContinuousAudioRange(q,'a','music','c')).toThrow();});
it('preserves split directives through archive, workbook, generated xlsx and JSONB',async()=>{
 const {createAuthoringArchive,encodeAuthoringArchive,decodeAuthoringArchive,prepareJsonbSnapshot,restoreJsonbSnapshot}=await import('../../../packages/compatibility/src/authoring-archive');
 const {exportAuthoringWorkbook,importAuthoringWorkbook}=await import('../../../packages/compatibility/src/authoring-workbook');const {exportAuthoringExcel,importAuthoringExcel}=await import('../../../packages/compatibility/src/authoring-workbook/excel');const {createStoryDocument}=await import('@knolstory/story-domain');
 const project=splitContinuousAudioRange(make(),'a','music','c').project,document=createStoryDocument({project,savedAt:'2026-10-21T00:00:00.000Z',appVersion:'test'}),archive=await createAuthoringArchive({format:'knolstory',document});
 expect(await decodeAuthoringArchive(await encodeAuthoringArchive(archive))).toEqual(archive);expect(await importAuthoringWorkbook(await exportAuthoringWorkbook(archive))).toEqual(archive);expect(await importAuthoringExcel(await exportAuthoringExcel(archive))).toEqual(archive);expect(await restoreJsonbSnapshot(await prepareJsonbSnapshot(archive))).toEqual(archive);
});
