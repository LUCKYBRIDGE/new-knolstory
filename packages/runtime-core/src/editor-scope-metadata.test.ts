import {describe,it,expect} from 'vitest';
import {createBlankStoryProject} from './authoring';
import {resolveStoryAudioPath} from './audio';
import {resolveStoryPresentationPath,compileStoryPresentation} from './presentation-scopes';
const make=()=>{const base=createBlankStoryProject({id:'scope-metadata',chapterId:'c',lineId:'a'}),cut=base.lines[0]!;return {...base,lines:[cut,{...cut,id:'b',order:2},{...cut,id:'c',order:3},{...cut,id:'d',order:4}]};};
describe('Core editor range metadata shares playback interpretation',()=>{
 it('reports chapter defaults, maintain, inclusive end and explicit stop without altering the document',()=>{
  const base=make(),project={...base,chapters:base.chapters.map(chapter=>({...chapter,audio:{music:{action:'play' as const,assetId:'music-default'}}})),lines:base.lines.map((line,index)=>index===0?{...line,audio:{ambience:{action:'play' as const,assetId:'rain',endLineId:'b'}}}:index===1?{...line,audio:{music:{action:'maintain' as const}}}:index===3?{...line,audio:{music:{action:'stop' as const}}}:line)};
  const before=structuredClone(project),entries=resolveStoryAudioPath(project,['a','b','c','d']);
  expect(entries[1].music).toMatchObject({cue:{action:'play',assetId:'music-default'},source:{kind:'chapter',id:'c'}});
  expect(entries[1].ambience).toMatchObject({cue:{action:'play',assetId:'rain',endLineId:'b'},source:{kind:'cut',id:'a'}});
  expect(entries[2].ambience.cue?.action).toBe('stop');expect(entries[2].ambience.source).toBeUndefined();
  expect(entries[3].music).toMatchObject({cue:{action:'stop'},source:{kind:'cut',id:'d'}});expect(project).toEqual(before);
 });
 it('fails closed for conditional cues without an actual choice history and retains selected branch source at a merge',()=>{
  const base=make(),project={...base,lines:base.lines.map((line,index)=>index===0?{...line,flow:{type:'choice' as const,options:[{id:'yes',label:'예',targetLineId:'b'},{id:'no',label:'아니오',targetLineId:'c'}]}}:index===1?{...line,audio:{music:{action:'play' as const,assetId:'branch',branchCondition:{sourceLineId:'a',choiceId:'yes'}}}}:line)};
  expect(resolveStoryAudioPath(project,['a','b','d']).at(-1)!.music.cue).toBeUndefined();
  expect(resolveStoryAudioPath(project,['a','b','d'],[{pathIndex:0,choiceId:'yes'}]).at(-1)!.music).toMatchObject({cue:{assetId:'branch'},source:{kind:'cut',id:'b'}});
 });
 it('reports following effect origins through inclusive end and clearing using the same runtime effects',()=>{
  const base=make(),project={...base,lines:base.lines.map((line,index)=>index===0?{...line,presentation:{effects:[{id:'rainbow',type:'shake' as const,scope:'following' as const,endLineId:'b'}]}}:line)};
  const before=structuredClone(project),entries=resolveStoryPresentationPath(project,['a','b','c','d']);
  expect(entries[1].effects).toMatchObject([{sourceLineId:'a',cue:{id:'rainbow',endLineId:'b'}}]);
  expect(entries[1].presentation).toEqual(compileStoryPresentation(project,'b',['a','b']));expect(entries[2].effects).toEqual([]);
  const cleared={...project,lines:project.lines.map(line=>line.id==='b'?{...line,presentation:{clearFollowingEffects:true}}:line)};
  expect(resolveStoryPresentationPath(cleared,['a','b'])[1].effects).toEqual([]);expect(project).toEqual(before);
 });
 it('keeps conditional effects inactive without real choices',()=>{
  const base=make(),project={...base,lines:base.lines.map((line,index)=>index===1?{...line,presentation:{effects:[{type:'shake' as const,scope:'following' as const,branchCondition:{sourceLineId:'a',choiceId:'yes'}}]}}:line)};
  expect(resolveStoryPresentationPath(project,['a','b','c']).at(-1)!.effects).toEqual([]);
 });
 it('exposes chapter-entry and cut sound sources without replaying chapter sounds on later cuts',()=>{
  const base=make(),project={...base,chapters:base.chapters.map(chapter=>({...chapter,audio:{sounds:[{id:'chapter-hit',assetId:'chapter-sound'}]}})),lines:base.lines.map((line,index)=>index===0?{...line,audio:{sounds:[{id:'cut-hit',assetId:'cut-sound'}]}}:line)};
  const entries=resolveStoryAudioPath(project,['a','b']);
  expect(entries[0].sounds).toMatchObject([{cue:{assetId:'chapter-sound'},source:{kind:'chapter',id:'c'}},{cue:{id:'cut-hit',assetId:'cut-sound'},source:{kind:'cut',id:'a'}}]);expect(entries[1].sounds).toEqual([]);
 });

});
