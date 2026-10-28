import {describe,it,expect} from 'vitest';
import {createBlankStoryProject} from '@knolstory/runtime-core';
import {editCombinedRange,undoCombinedRange} from './combined-range-edit';
const make=()=>{const p=createBlankStoryProject({id:'range',chapterId:'ch',lineId:'a'}),line=p.lines[0]!;return {...p,lines:['a','b','c','d'].map((id,index)=>({...line,id,order:index+1,...(index===0?{audio:{music:{action:'play' as const,assetId:'audio:music:forest',endLineId:'c'}},presentation:{effects:[{id:'fx',type:'shake' as const,scope:'following' as const,endLineId:'c',durationMs:600}]}}:{})}))};};
describe('combined range editing',()=>{
 it('moves an audio usage range preserving length, settings and unrelated manuscript',()=>{const p=make(),before=structuredClone(p),result=editCombinedRange(p,{sourceLineId:'a',target:'music'},'b','d');expect(result.project.lines[0].audio?.music).toBeUndefined();expect(result.project.lines[1].audio?.music).toEqual({...p.lines[0].audio!.music,endLineId:'d'});expect(result.project.lines.map(l=>l.text)).toEqual(p.lines.map(l=>l.text));expect(p).toEqual(before);expect(undoCombinedRange(result.project,result.undo).lines).toEqual(p.lines);});
 it('changes only effect end while preserving identity, conditions and timing',()=>{const p=make(),result=editCombinedRange(p,{sourceLineId:'a',target:'effects',cueIndex:0},'a','b');expect(result.project.lines[0].presentation?.effects?.[0]).toEqual({...p.lines[0].presentation!.effects![0],endLineId:'b'});expect(result.project.lines[0].audio).toEqual(p.lines[0].audio);});
 it('rejects occupied audio destinations, crossed ranges, other chapters and unsupported targets',()=>{const p=make(),occupied={...p,lines:p.lines.map(l=>l.id==='b'?{...l,audio:{music:{action:'stop' as const}}}:l)};expect(()=>editCombinedRange(occupied,{sourceLineId:'a',target:'music'},'b','c')).toThrow();expect(()=>editCombinedRange(p,{sourceLineId:'a',target:'music'},'c','b')).toThrow();expect(()=>editCombinedRange(p,{sourceLineId:'a',target:'sounds'},'a','b')).toThrow();expect(()=>editCombinedRange(p,{sourceLineId:'a',target:'effects',cueIndex:9},'a','b')).toThrow();expect(()=>editCombinedRange(p,{sourceLineId:'a',target:'music'},'missing','c')).toThrow();});
 it('undo preserves later text and rejects edits to the affected cues',()=>{const p=make(),result=editCombinedRange(p,{sourceLineId:'a',target:'music'},'b','d'),later={...result.project,lines:result.project.lines.map(l=>l.id==='a'?{...l,text:'나중에 쓴 글'}:l)};expect(undoCombinedRange(later,result.undo).lines[0].text).toBe('나중에 쓴 글');expect(()=>undoCombinedRange({...later,lines:later.lines.map(l=>l.id==='b'?{...l,audio:{music:{action:'stop' as const}}}:l)},result.undo)).toThrow();});
});

it('moves beyond an old end without losing the new range and rejects following-clear conflicts',()=>{
 const p=make(),moved=editCombinedRange(p,{sourceLineId:'a',target:'effects',cueIndex:0},'d','d');expect(moved.project.lines[3].presentation?.effects?.[0]).toMatchObject({id:'fx',endLineId:'d',durationMs:600});expect(undoCombinedRange(moved.project,moved.undo).lines).toEqual(p.lines);
 const clear={...p,lines:p.lines.map(line=>line.id==='b'?{...line,presentation:{clearFollowingEffects:true}}:line)};expect(()=>editCombinedRange(clear,{sourceLineId:'a',target:'effects',cueIndex:0},'a','c')).toThrow('끝내거나');
 expect(()=>editCombinedRange({...p,lines:p.lines.map(line=>line.id==='d'?{...line,chapterId:'other'}:line)},{sourceLineId:'a',target:'music'},'a','d')).toThrow('같은 장');
 const sameEnd=editCombinedRange(p,{sourceLineId:'a',target:'music'},'a','b');expect(sameEnd.project.lines[0].audio?.music).toMatchObject({endLineId:'b'});expect(()=>undoCombinedRange({...sameEnd.project,id:'other'},sameEnd.undo)).toThrow();
});

it('edits sequence origin and end without splitting its reader-controlled playback clock',async()=>{
 const {splitContinuousAudioRange}=await import('./continuous-audio-split');const {splitChapterAudioRange}=await import('./chapter-audio-split');
 const base=make(),cue={action:'sequence' as const,id:'queue',endLineId:'d',clips:[{id:'clip',assetId:'audio:music:forest',sourceEndMs:1000}]},p={...base,lines:base.lines.map(line=>line.id==='a'?{...line,audio:{music:cue}}:line)},before=structuredClone(p);
 const result=editCombinedRange(p,{sourceLineId:'a',target:'music'},'a','b');expect(result.project.lines[0].audio?.music).toEqual({...cue,endLineId:'b'});expect(undoCombinedRange(result.project,result.undo).lines).toEqual(p.lines);
 const moved=editCombinedRange(p,{sourceLineId:'a',target:'music'},'b','d');expect(moved.project.lines[1].audio?.music).toEqual(cue);expect(undoCombinedRange(moved.project,moved.undo).lines).toEqual(p.lines);expect(()=>splitContinuousAudioRange(p,'a','music','c')).toThrow('순서');
 const chapter={...base,chapters:base.chapters.map(ch=>({...ch,audio:{music:cue}}))};expect(()=>splitChapterAudioRange(chapter,'ch','music','c')).toThrow('순서');expect(p).toEqual(before);
});
