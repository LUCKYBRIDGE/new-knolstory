import {expect,it} from 'vitest';
import type {StoryMusicCue,StoryMusicSequence} from '@knolstory/story-domain';
import {convertMusicToSequence,appendMusicSequenceClip,updateMusicSequenceClip,moveMusicSequenceClip,deleteMusicSequenceClip,splitMusicSequenceClip} from './music-sequence-edit';
const scalar:Extract<StoryMusicCue,{action:'play'}>={action:'play',assetId:'forest',sourceStartMs:200,sourceEndMs:1800,volume:.4,fadeInMs:100,fadeOutMs:200,loop:true,endLineId:'last',branchCondition:{sourceLineId:'choice',choiceId:'yes'}};
const sequence=():StoryMusicSequence=>convertMusicToSequence(scalar,'seq','a');
it('explicitly converts a finite play cue, preserving authored range, optional fields and root condition',()=>{
 const before=structuredClone(scalar),result=sequence();expect(result).toEqual({action:'sequence',id:'seq',endLineId:'last',branchCondition:scalar.branchCondition,clips:[{id:'a',assetId:'forest',sourceStartMs:200,sourceEndMs:1800,volume:.4,fadeInMs:100,fadeOutMs:200}]});expect(scalar).toEqual(before);
 expect(convertMusicToSequence({action:'play',assetId:'x'},'s','c',1000)).toEqual({action:'sequence',id:'s',clips:[{id:'c',assetId:'x',sourceEndMs:1000}]});
});
it('blocks unknown, invalid or out-of-source bounds without changing the original',()=>{
 const cue={action:'play' as const,assetId:'x'},before=structuredClone(cue);
 expect(()=>convertMusicToSequence(cue,'s','c')).toThrow(/사용 끝/);expect(cue).toEqual(before);
 for(const duration of [0,NaN,Infinity,500.5,86400001])expect(()=>convertMusicToSequence(cue,'s','c',duration)).toThrow();
 expect(()=>convertMusicToSequence(scalar,'s','c',1000)).toThrow(/원본/);
 for(const id of ['', ' ', 'x'.repeat(201)])expect(()=>convertMusicToSequence(scalar,id,'a')).toThrow();
});
it('adds, reorders and deletes exact clip identities immutably, preserving root and absent fields',()=>{
 const original=sequence(),before=structuredClone(original),added=appendMusicSequenceClip(original,{id:'b',assetId:'rain',sourceEndMs:500});
 expect(added.clips.map(x=>x.id)).toEqual(['a','b']);expect(moveMusicSequenceClip(added,'b',-1).clips.map(x=>x.id)).toEqual(['b','a']);expect(deleteMusicSequenceClip(added,'b')).toEqual(original);expect(original).toEqual(before);
 expect(()=>deleteMusicSequenceClip(original,'a')).toThrow(/하나/);expect(()=>moveMusicSequenceClip(original,'a',-1)).toThrow(/순서/);expect(()=>deleteMusicSequenceClip(added,'missing')).toThrow(/다시 선택/);
 expect(()=>appendMusicSequenceClip(added,{id:'b',assetId:'x',sourceEndMs:100})).toThrow();
});
it('updates only the selected detail and rejects invalid ranges/volumes without normalizing other clips',()=>{
 const original=appendMusicSequenceClip(sequence(),{id:'b',assetId:'rain',sourceEndMs:500});
 const result=updateMusicSequenceClip(original,'b',{sourceStartMs:100,volume:0});expect(result.clips[0]).toEqual(original.clips[0]);expect(result.clips[1]).toEqual({id:'b',assetId:'rain',sourceEndMs:500,sourceStartMs:100,volume:0});expect(result.branchCondition).toEqual(original.branchCondition);
 expect(()=>updateMusicSequenceClip(original,'b',{sourceStartMs:500})).toThrow();expect(()=>updateMusicSequenceClip(original,'b',{volume:2})).toThrow();expect(()=>updateMusicSequenceClip(original,'missing',{volume:0})).toThrow(/다시 선택/);
});
it('splits finite source ranges with left identity and boundary fades retained only at outer ends',()=>{
 const original=sequence(),before=structuredClone(original),result=splitMusicSequenceClip(original,'a',700,'right');
 expect(result.clips).toEqual([{id:'a',assetId:'forest',sourceStartMs:200,sourceEndMs:700,volume:.4,fadeInMs:100},{id:'right',assetId:'forest',sourceStartMs:700,sourceEndMs:1800,volume:.4,fadeOutMs:200}]);expect(original).toEqual(before);
 const sparse=convertMusicToSequence({action:'play',assetId:'x',sourceEndMs:1000},'s','c');expect(splitMusicSequenceClip(sparse,'c',200,'r').clips).toEqual([{id:'c',assetId:'x',sourceEndMs:200},{id:'r',assetId:'x',sourceStartMs:200,sourceEndMs:1000}]);
 for(const position of [200,1800,NaN,500.5])expect(()=>splitMusicSequenceClip(original,'a',position,'r')).toThrow();expect(()=>splitMusicSequenceClip(original,'a',700,'a')).toThrow();expect(()=>splitMusicSequenceClip(original,'missing',700,'r')).toThrow();
});
it('limits add and split to 16 clips and rejects malformed input',()=>{
 const full={...sequence(),clips:Array.from({length:16},(_,n)=>({id:`c${n}`,assetId:'x',sourceEndMs:1000}))};expect(()=>appendMusicSequenceClip(full,{id:'extra',assetId:'x',sourceEndMs:1000})).toThrow(/16/);expect(()=>splitMusicSequenceClip(full,'c0',500,'r')).toThrow(/16/);
 expect(()=>appendMusicSequenceClip({...sequence(),clips:[]} ,{id:'x',assetId:'x',sourceEndMs:1000})).toThrow();expect(()=>updateMusicSequenceClip({...sequence(),id:''},'a',{volume:.5})).toThrow();
});
