import {describe,it,expect,vi} from 'vitest';
vi.mock('@knolstory/asset-registry',async original=>({...await original<object>(),resolveExcludedAudioAsset:(id:string)=>id==='audio:music:excluded-fixture'?{id,name:'기존 소리',source:'test',reason:'excluded'}:undefined}));
import {createBlankStoryProject} from '@knolstory/runtime-core';
import {buildEditorRangeSummaries} from './editor-range-summaries';
const make=()=>{const base=createBlankStoryProject({id:'summary',chapterId:'c',lineId:'a'}),cut=base.lines[0]!;return {...base,lines:[cut,{...cut,id:'b',order:2},{...cut,id:'c',order:3},{...cut,id:'d',order:4}]};};
describe('multi-cut editor range summaries',()=>{
 it('names continuing music and effects and their source and inclusive end without changing the manuscript',()=>{
  const base=make(),project={...base,lines:base.lines.map((line,index)=>index===0?{...line,audio:{music:{action:'play' as const,assetId:'audio:music:forest',endLineId:'c'}},presentation:{effects:[{type:'shake' as const,scope:'following' as const,endLineId:'c'}]}}:line)},before=structuredClone(project);
  const result=buildEditorRangeSummaries(project);
  expect(result.get('b')!.audio).toContain('숲의 아침');expect(result.get('b')!.audio).toContain('1컷부터');expect(result.get('b')!.audio).toContain('3컷까지');
  expect(result.get('b')!.direction).toContain('화면 흔들림');expect(result.get('b')!.direction).toContain('1컷부터');expect(result.get('c')!.direction).toContain('화면 흔들림');expect(result.get('d')!.direction).not.toContain('화면 흔들림');expect(result.get('d')!.audio).not.toContain('숲의 아침');expect(project).toEqual(before);
 });
 it('uses chapter defaults and explicitly marks conditional playback rather than inventing a chosen route',()=>{
  const base=make(),project={...base,chapters:base.chapters.map(chapter=>({...chapter,audio:{music:{action:'play' as const,assetId:'audio:music:forest'}}})),lines:base.lines.map((line,index)=>index===1?{...line,audio:{music:{action:'play' as const,assetId:'audio:music:night',branchCondition:{sourceLineId:'a',choiceId:'yes'}}},presentation:{effects:[{type:'shake' as const,scope:'following' as const,branchCondition:{sourceLineId:'a',choiceId:'yes'}}]}}:line)};
  const result=buildEditorRangeSummaries(project);
  expect(result.get('c')!.audio).toContain('숲의 아침');expect(result.get('c')!.audio).toContain('기본');expect(result.get('c')!.audio).toContain('선택에 따라');expect(result.get('c')!.audio).not.toContain('밤의 길');expect(result.get('c')!.direction).toContain('선택에 따라');expect(result.get('c')!.direction).not.toContain('화면 흔들림');
 });
 it('resets preview interpretation at each chapter and reports scoped clearing and explicit stops',()=>{
  const base=make(),project={...base,chapters:[...base.chapters,{...base.chapters[0]!,id:'next',order:2,chapterNumber:2}],lines:base.lines.map((line,index)=>index===0?{...line,audio:{music:{action:'play' as const,assetId:'audio:music:forest'}},presentation:{effects:[{type:'shake' as const,scope:'following' as const}]}}:index===1?{...line,audio:{music:{action:'stop' as const}},presentation:{clearFollowingEffects:true}}:index===3?{...line,chapterId:'next'}:line)};
  const result=buildEditorRangeSummaries(project);expect(result.get('b')!.direction).toContain('이전 효과 종료');expect(result.get('b')!.audio).toContain('정지');expect(result.get('d')!.audio).not.toContain('숲의 아침');expect(result.get('d')!.direction).not.toContain('화면 흔들림');
 });
 it('names chapter-entry and local sounds, local transitions and one-cut effects',()=>{
  const base=make(),project={...base,chapters:base.chapters.map(chapter=>({...chapter,audio:{music:{action:'stop' as const},sounds:[{id:'entry',assetId:'missing-entry-sound'}]}})),lines:base.lines.map((line,index)=>index===0?{...line,audio:{ambience:{action:'play' as const,assetId:'missing-ambience',endLineId:'missing-end'},sounds:[{id:'local',assetId:'missing-local-sound'}]},presentation:{transition:{type:'dissolve' as const},effects:[{type:'flash' as const}]}}:line)};
  const result=buildEditorRangeSummaries(project);
  expect(result.get('a')!.audio).toContain('소리 이름 확인 필요');expect(result.get('a')!.audio).toContain('시작');expect(result.get('a')!.audio).toContain('위치 확인 필요');expect(result.get('a')!.direction).toContain('부드러운 전환');expect(result.get('a')!.direction).toContain('하얀 섬광');expect(result.get('a')!.direction).toContain('이 컷에서 시작');expect(result.get('b')!.audio).not.toContain('효과음');expect(result.get('b')!.direction).not.toContain('하얀 섬광');
 });
 it('marks conditional ambience and sound settings without claiming they are active',()=>{
  const base=make(),condition={sourceLineId:'a',choiceId:'yes'},project={...base,lines:base.lines.map((line,index)=>index===1?{...line,audio:{ambience:{action:'play' as const,assetId:'audio:music:forest',branchCondition:condition},sounds:[{id:'conditional',assetId:'missing-sound',branchCondition:condition}]}}:line)};
  const result=buildEditorRangeSummaries(project);expect(result.get('b')!.audio).toContain('선택에 따라');expect(result.get('b')!.audio).not.toContain('숲의 아침');expect(result.get('b')!.audio).not.toContain('효과음');
 });

});

it('marks unavailable preserved audio as excluded instead of reporting active playback',()=>{
 const base=make(),project={...base,lines:base.lines.map((line,index)=>index===0?{...line,audio:{music:{action:'play' as const,assetId:'audio:music:excluded-fixture'}}}:line)};
 const before=structuredClone(project),summary=buildEditorRangeSummaries(project).get('b')!;
 expect(summary.audio).toContain('기존 소리 · 재생 제외');expect(project).toEqual(before);
});

it('describes sequence count, source, end and excluded clips on continuing cuts',()=>{
 const base=make(),project={...base,lines:base.lines.map((line,i)=>i===0?{...line,audio:{music:{action:'sequence' as const,id:'queue',endLineId:'c',clips:[{id:'first',assetId:'audio:music:forest',sourceEndMs:1000},{id:'second',assetId:'audio:music:excluded-fixture',sourceEndMs:1000}]}}}:line)};
 const summaries=buildEditorRangeSummaries(project),summary=summaries.get('b')!.audio;
 expect(summary).toContain('2개 음원 순서 재생');expect(summary).toContain('1컷부터');expect(summary).toContain('3컷까지');expect(summary).toContain('재생 제외');expect(summary).not.toContain('배경음 정지');expect(summaries.get('d')!.audio).not.toContain('순서 재생');
});

it.each([0,1,3])('keeps every authored cut summary at its own position when cut %i has a display condition',hiddenIndex=>{
 const base=make(),project={...base,scores:[{id:'score',name:'점수',description:'',initial:0}],lines:base.lines.map((line,index)=>({...line,...(index===hiddenIndex?{visibility:{scores:{mode:'all' as const,terms:[{scoreId:'score',operator:'gte' as const,value:1}]}}}:{}),audio:{sounds:[{id:`sound-${index}`,assetId:`unknown-${index}`}]},presentation:{effects:[{type:index===1?'shake' as const:'flash' as const}]}}))};
 const before=structuredClone(project),result=buildEditorRangeSummaries(project);
 expect([...result.keys()]).toEqual(['a','b','c','d']);
 for(const line of project.lines)expect(result.get(line.id)!.audio).toContain('효과음');
 expect(result.get('b')!.direction).toContain('화면 흔들림');
 expect(result.get('a')!.direction).toContain('하얀 섬광');
 expect(result.get('c')!.direction).not.toContain('화면 흔들림');
 expect(result.get('d')!.direction).toContain('하얀 섬광');
 expect(result.get(project.lines[hiddenIndex].id)!.audio).toContain('컷 표시 조건에 따라 달라져요');
 expect(project).toEqual(before);
});
