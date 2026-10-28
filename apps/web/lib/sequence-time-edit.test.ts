import {expect,it} from 'vitest';
import {createBlankStoryProject} from '@knolstory/runtime-core';
import {splitSequenceAtTime,trimSequenceEdge,moveSequenceAtTime,undoSequenceTime} from './sequence-time-edit';
const make=()=>{const p=createBlankStoryProject({id:'sequence-time',chapterId:'ch',lineId:'a'});return {...p,lines:p.lines.map(line=>({...line,text:'원고 보존',audio:{music:{action:'sequence' as const,id:'q',endLineId:'a',clips:[{id:'one',assetId:'audio:music:forest',sourceStartMs:200,sourceEndMs:1200,volume:.4,fadeInMs:50,fadeOutMs:60},{id:'two',assetId:'audio:music:night',sourceStartMs:500,sourceEndMs:1500},{id:'three',assetId:'audio:music:forest',sourceEndMs:2000}]},ambience:{action:'play' as const,assetId:'audio:music:night',volume:.2}}}))};};
it('maps guide time to the exact clip source, retains outer fades and restores only its channel',()=>{
 const p=make(),before=structuredClone(p),result=splitSequenceAtTime(p,'a','music','two',1400,'new');
 expect(result.project.lines[0].audio?.music).toMatchObject({id:'q',endLineId:'a',clips:[{id:'one'},{id:'two',sourceStartMs:500,sourceEndMs:900},{id:'new',sourceStartMs:900,sourceEndMs:1500},{id:'three'}]});expect(p).toEqual(before);
 const later={...result.project,lines:result.project.lines.map(line=>({...line,text:'추가 글',audio:{...line.audio,ambience:{action:'stop' as const}}}))};const restored=undoSequenceTime(later,result.undo!);expect(restored.lines[0].audio?.music).toEqual(p.lines[0].audio.music);expect(restored.lines[0].audio?.ambience).toEqual({action:'stop'});expect(restored.lines[0].text).toBe('추가 글');
 const first=splitSequenceAtTime(p,'a','music','one',500,'new');expect(first.project.lines[0].audio?.music).toMatchObject({clips:[{id:'one',fadeInMs:50},{id:'new',fadeOutMs:60},{id:'two'},{id:'three'}]});
});
it('rejects guide outside the selected clip, fractional time, full capacity and stale gesture',()=>{
 const p=make();for(const value of [0,1000,2000,3000,NaN,1200.5])expect(()=>splitSequenceAtTime(p,'a','music','two',value,'new')).toThrow();
 const full={...p,lines:p.lines.map(line=>({...line,audio:{...line.audio,music:{...line.audio.music,clips:Array.from({length:16},(_,index)=>({...line.audio.music.clips[0],id:String(index)}))}}}))};expect(()=>splitSequenceAtTime(full,'a','music','0',500,'new')).toThrow(/16/);
 expect(()=>splitSequenceAtTime(p,'a','music','two',1400,'new','stale')).toThrow(/바뀌/);
});
it('trims source edges with later clips rippling, bounded by the actual source duration',()=>{
 const p=make(),front=trimSequenceEdge(p,'a','music','two','start',700),end=trimSequenceEdge(front.project,'a','music','two','end',2100);
 expect(end.project.lines[0].audio?.music).toMatchObject({clips:[{id:'one'},{id:'two',sourceStartMs:700,sourceEndMs:2100},{id:'three'}]});expect(undoSequenceTime(front.project,front.undo!).lines[0].audio?.music).toEqual(p.lines[0].audio.music);
 for(const value of [0,500,-1,8001,NaN,1200.5])expect(()=>trimSequenceEdge(p,'a','music','two','end',value)).toThrow();
 const privateProject={...p,lines:p.lines.map(line=>({...line,audio:{...line.audio,music:{...line.audio.music,clips:line.audio.music.clips.map(clip=>clip.id==='two'?{...clip,assetId:'unknown-private'}:clip)}}}))};expect(()=>trimSequenceEdge(privateProject,'a','music','two','end',1501)).toThrow(/원본/);expect(trimSequenceEdge(privateProject,'a','music','two','end',1400).project.lines[0].audio?.music).toMatchObject({clips:[{id:'one'},{id:'two',sourceEndMs:1400},{id:'three'}]});
 expect(()=>trimSequenceEdge(p,'a','music','two','start',1500)).toThrow();
});
it('reorders by closest insertion boundary without inventing gaps, preserving exact clip identities',()=>{
 const p=make(),moved=moveSequenceAtTime(p,'a','music','one',3000);expect(moved.project.lines[0].audio?.music).toMatchObject({clips:[{id:'two'},{id:'three'},{id:'one'}]});expect(undoSequenceTime(moved.project,moved.undo!).lines[0].audio?.music).toEqual(p.lines[0].audio.music);
 const unchanged=moveSequenceAtTime(p,'a','music','two',1000);expect(unchanged.project).toBe(p);expect(unchanged.undo).toBeUndefined();expect(moveSequenceAtTime(p,'a','music','three',-200).project.lines[0].audio?.music).toMatchObject({clips:[{id:'three'},{id:'one'},{id:'two'}]});expect(()=>moveSequenceAtTime(p,'a','music','two',NaN)).toThrow();
});
it('does not undo later edits of the selected channel and never treats another cue as the sequence',()=>{
 const p=make(),result=trimSequenceEdge(p,'a','music','two','end',1300);expect(()=>undoSequenceTime(trimSequenceEdge(result.project,'a','music','two','end',1400).project,result.undo!)).toThrow(/이후/);expect(()=>undoSequenceTime({...result.project,id:'other'},result.undo!)).toThrow();expect(()=>splitSequenceAtTime(p,'a','ambience','two',500,'new')).toThrow();expect(()=>splitSequenceAtTime(p,'missing','music','two',1400,'new')).toThrow();expect(()=>trimSequenceEdge(p,'a','music','missing','end',1400)).toThrow();
});
