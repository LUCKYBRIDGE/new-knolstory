import {expect,it} from 'vitest';
import {isStoryMusicCue,type StoryProject} from '@knolstory/story-domain';
import {isRuntimeAudio,runtimeServiceAudioPaths} from '@knolstory/runtime-contract';
import {compileStoryAudio} from './audio';
const sequence={action:'sequence' as const,id:'queue',clips:[{id:'one',assetId:'a',sourceEndMs:500},{id:'two',assetId:'b',sourceStartMs:100,sourceEndMs:900,volume:.3}]};
const resolver=(id:string)=>({runtimePath:`assets/audio/cc0/catalog/v1/${id}.ogg`});
it('validates finite strict ordered clips',()=>{
 expect(isStoryMusicCue(sequence)).toBe(true);
 for(const patch of [{loop:true},{delayMs:1},{clips:[]},{clips:[sequence.clips[0],sequence.clips[0]]},{clips:[{id:'a',assetId:'b'}]},{clips:[{id:'a',assetId:'b',sourceEndMs:0}]},{clips:[{id:'a',assetId:'b',sourceEndMs:500,loop:false}]}])expect(isStoryMusicCue({...sequence,...patch})).toBe(false);
});
it('keeps the instance through maintaining cuts but restarts a revisited origin',()=>{
 const p={chapters:[{id:'ch'}],lines:[{id:'a',chapterId:'ch',audio:{music:sequence}},{id:'b',chapterId:'ch'},{id:'c',chapterId:'ch',audio:{music:{action:'stop'}}}]} as unknown as StoryProject;
 const a=compileStoryAudio(p,'a',resolver,['a']),b=compileStoryAudio(p,'b',resolver,['a','b']),again=compileStoryAudio(p,'a',resolver,['a','b','a']);
 expect(a.music.action).toBe('sequence');expect(b.music).toEqual(a.music);expect(again.music).not.toEqual(a.music);expect(isRuntimeAudio(a)).toBe(true);expect(runtimeServiceAudioPaths(a)).toHaveLength(2);expect(compileStoryAudio(p,'c',resolver,['a','b','c']).music.action).toBe('stop');
});
import {createBlankStoryProject} from './authoring';
import {createStoryDocument,parseStoryDocument} from '@knolstory/story-domain';
import {splitStoryCut} from './manuscript-operations';
import {remapClonedCutReferences} from './clone-cut-references';
import {relocateChoiceConditions} from './relocate-choice-conditions';
import {cutRangeEndReferences} from './cut-range-references';
import {storyBranchConditionReferences} from './branch-condition-references';
function fixture(owner:'cut'|'chapter',channel:'music'|'ambience'):StoryProject{
 const p=createBlankStoryProject({id:'sequence-work',chapterId:'first',lineId:'choice'}),line=p.lines[0];
 const cue={...sequence,endLineId:'end',branchCondition:{sourceLineId:'choice',choiceId:'yes'}};
 return {...p,chapters:[p.chapters[0],{...p.chapters[0],id:'next',order:2,...(owner==='chapter'?{audio:{[channel]:cue}}:{})}],lines:[{...line,flow:{type:'choice',options:[{id:'yes',label:'A',targetLineId:'owner'},{id:'no',label:'B',targetLineId:'owner'}]}},{...line,id:'owner',chapterId:'next',text:'앞뒤',...(owner==='cut'?{audio:{[channel]:cue}}:{})},{...line,id:'end',chapterId:'next',order:2},{...line,id:'after',chapterId:'next',order:3}]};
}
it('uses exact yes/no/missing history for both owners and channels, expires and restarts on new entries',()=>{
 for(const owner of ['cut','chapter'] as const)for(const channel of ['music','ambience'] as const){
  const p=fixture(owner,channel);expect(parseStoryDocument(createStoryDocument({project:p,savedAt:p.updatedAt,appVersion:'test'})).ok).toBe(true);
  for(const choiceId of ['yes','no',undefined]){
   const history=choiceId?[{pathIndex:0,choiceId}]:[];
   const current=compileStoryAudio(p,'owner',resolver,['choice','owner'],history)[channel];
   expect(current?.action).toBe(choiceId==='yes'?'sequence':'stop');
   expect(compileStoryAudio(p,'end',resolver,['choice','owner','end'],history)[channel]).toEqual(current);
   expect(compileStoryAudio(p,'after',resolver,['choice','owner','end','after'],history)[channel]?.action).toBe('stop');
  }
  expect(compileStoryAudio(p,'owner',resolver,['owner'])[channel]?.action).toBe('stop');
  const path=['choice','owner','choice','owner'],h=[{pathIndex:0,choiceId:'yes'},{pathIndex:2,choiceId:'yes'}];
  expect(compileStoryAudio(p,'owner',resolver,path,h)[channel]).not.toEqual(compileStoryAudio(p,'owner',resolver,path.slice(0,2),h.slice(0,1))[channel]);
 }
});
it('validates whole-document references and preserves relocation, clone endpoints and deletion guards',()=>{
 const p=fixture('cut','music'),source=p.lines[1],cue=source.audio!.music!;
 expect(cutRangeEndReferences(p,'end')).toHaveLength(1);
 expect(storyBranchConditionReferences(p,'choice')).toHaveLength(1);
 const relocated=relocateChoiceConditions(p,'choice','new',new Set(['yes']));
 expect(relocated.lines[1].audio?.music).toEqual({...cue,branchCondition:{sourceLineId:'new',choiceId:'yes'}});
 const clone=remapClonedCutReferences({...source,id:'clone',audio:{music:{...sequence,endLineId:'owner'}}},'owner',new Map());
 expect(clone.audio?.music).toEqual({...sequence,endLineId:'clone'});
 expect(()=>splitStoryCut(p,'owner','new',1)).toThrow(/순서대로/);
 for(const patch of [{endLineId:'missing'},{branchCondition:{sourceLineId:'choice',choiceId:'missing'}}]){
  const bad={...p,lines:p.lines.map(line=>line.id==='owner'?{...line,audio:{music:{...sequence,...patch}}}:line)};
  expect(parseStoryDocument(createStoryDocument({project:bad,savedAt:p.updatedAt,appVersion:'test'})).ok).toBe(false);
 }
});
it('rejects malformed runtime queues and enforces bounded ordered resources',()=>{
 const p=fixture('cut','music'),audio=compileStoryAudio(p,'owner',resolver,['choice','owner'],[{pathIndex:0,choiceId:'yes'}]);
 if(audio.music.action!=='sequence')throw Error('missing sequence');
 for(const patch of [{loop:false},{id:'x'.repeat(201)},{entryId:''},{clips:[]},{clips:[{...audio.music.clips[0],sourceEndMs:0}]},{clips:[audio.music.clips[0],audio.music.clips[0]]}])expect(isRuntimeAudio({...audio,music:{...audio.music,...patch}})).toBe(false);
});
import {runtimeAudioPaths,isRuntimeServiceAudioResources} from '@knolstory/runtime-contract';
it('accepts additive sequence only in schema8, without upgrading earlier document payloads',()=>{
 const base=fixture('cut','music'),p={...base,lines:base.lines.map(line=>line.id==='owner'?{...line,audio:{music:sequence}}:line)},document=createStoryDocument({project:p,savedAt:p.updatedAt,appVersion:'test'});
 for(let schemaVersion=1;schemaVersion<8;schemaVersion++)expect(parseStoryDocument({...document,schemaVersion}).ok).toBe(false);
 expect(parseStoryDocument(document).ok).toBe(true);
});
it('collects all music, ambience and sound paths and validates up to42 bounded resources',()=>{
 const clips=Array.from({length:16},(_,index)=>({id:`clip${index}`,audioPath:`assets/audio/cc0/catalog/v1/music${index}.ogg`,sourceStartMs:0,sourceEndMs:500,volume:1,fadeInMs:0,fadeOutMs:0}));
 const audio={version:1 as const,music:{action:'sequence' as const,id:'music',entryId:'cut:a:0',clips},ambience:{action:'sequence' as const,id:'ambience',entryId:'cut:a:0',clips:clips.map(clip=>({...clip,audioPath:clip.audioPath.replace('music','ambience')}))},sounds:Array.from({length:8},(_,i)=>({id:`s${i}`,audioPath:`assets/audio/sound${i}.wav`,volume:1,delayMs:0}))};
 expect(isRuntimeAudio(audio)).toBe(true);expect(runtimeAudioPaths(audio)).toHaveLength(40);expect(runtimeServiceAudioPaths(audio)).toHaveLength(32);
 const paths=Array.from({length:43},(_,i)=>`assets/audio/cc0/catalog/v1/resource${i}.ogg`),rows=paths.map(path=>({path,sha256:'a'.repeat(64),mime:'audio/ogg',data:'AAAA'}));
 expect(isRuntimeServiceAudioResources(rows.slice(0,42),paths)).toBe(true);expect(isRuntimeServiceAudioResources(rows,paths)).toBe(false);
 expect(isRuntimeServiceAudioResources([{...rows[0],data:'AAAA'.repeat(3000001)}],paths)).toBe(false);
});
it('rejects unresolved and unsafe clip paths, retains exact ordered values and never mutates the manuscript',()=>{
 const p=fixture('cut','music'),before=structuredClone(p),history=[{pathIndex:0,choiceId:'yes'}];
 expect(()=>compileStoryAudio(p,'owner',()=>undefined,['choice','owner'],history)).toThrow(/자산/);
 expect(()=>compileStoryAudio(p,'owner',()=>({runtimePath:'../../escape.wav'}),['choice','owner'],history)).toThrow(/경로/);
 const audio=compileStoryAudio(p,'owner',resolver,['choice','owner'],history);
 expect(audio.music).toMatchObject({action:'sequence',id:'queue',clips:[{id:'one',sourceStartMs:0,sourceEndMs:500,volume:1,fadeInMs:0,fadeOutMs:0},{id:'two',sourceStartMs:100,sourceEndMs:900,volume:.3}]});
 expect(p).toEqual(before);
});
