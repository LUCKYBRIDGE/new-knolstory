import {describe,it,expect,vi} from 'vitest';
vi.mock('@knolstory/asset-registry',async original=>({...await original<object>(),resolveExcludedAudioAsset:(id:string)=>id==='excluded'?{id,name:'제외 소리'}:undefined}));
import {createBlankStoryProject} from '@knolstory/runtime-core';
import {buildCombinedEditingTracks} from './combined-editing-tracks';
const make=()=>{const p=createBlankStoryProject({id:'tracks',chapterId:'chapter',lineId:'a'}),line=p.lines[0]!;return {...p,lines:['a','b','c','d'].map((id,i)=>({...line,id,order:i+1}))};};
describe('combined source-order editing tracks',()=>{
 it('groups chapter music, inclusive ambience and explicit stop with original edit sources',()=>{
  const base=make(),p={...base,chapters:base.chapters.map(ch=>({...ch,audio:{music:{action:'play' as const,assetId:'music'}}})),lines:base.lines.map((l,i)=>i===0?{...l,audio:{ambience:{action:'play' as const,assetId:'rain',endLineId:'b'}}}:i===3?{...l,audio:{music:{action:'stop' as const}}}:l)},before=structuredClone(p);
  const tracks=buildCombinedEditingTracks(p,'chapter');
  expect(tracks.find(t=>t.target==='music')!.entries).toMatchObject([{startCutIndex:0,endCutIndex:2,sourceChapterId:'chapter',assetId:'music'},{startCutIndex:3,endCutIndex:3,sourceLineId:'d',label:'배경음 정지'}]);
  expect(tracks.find(t=>t.target==='ambience')!.entries).toMatchObject([{startCutIndex:0,endCutIndex:1,sourceLineId:'a'}]);expect(p).toEqual(before);
 });
 it('retains conditional authored spans alongside unconditional overview without claiming a branch',()=>{
  const base=make(),condition={sourceLineId:'a',choiceId:'yes'},p={...base,chapters:base.chapters.map(ch=>({...ch,audio:{music:{action:'play' as const,assetId:'base'}}})),lines:base.lines.map((l,i)=>i===1?{...l,audio:{music:{action:'play' as const,assetId:'conditional',branchCondition:condition,endLineId:'c'},sounds:[{id:'hit',assetId:'excluded',branchCondition:condition}]},presentation:{effects:[{id:'rain',type:'shake' as const,scope:'following' as const,branchCondition:condition,endLineId:'c'}]}}:l)};
  const tracks=buildCombinedEditingTracks(p,'chapter');
  expect(tracks.find(t=>t.target==='music')!.entries).toMatchObject([{assetId:'base',conditional:false,endCutIndex:3},{assetId:'conditional',conditional:true,startCutIndex:1,endCutIndex:2}]);
  expect(tracks.find(t=>t.target==='sounds')!.entries).toMatchObject([{cueId:'hit',conditional:true,excludedAudio:true,startCutIndex:1,endCutIndex:1}]);
  expect(tracks.find(t=>t.target==='effects')!.entries).toMatchObject([{cueId:'rain',conditional:true,startCutIndex:1,endCutIndex:2}]);
 });
 it('groups canonical following effects and clear points without duplicates or truncating long chapters',()=>{
  const base=make(),p={...base,lines:Array.from({length:120},(_,i)=>({...base.lines[0]!,id:`cut-${i}`,order:i,presentation:i===0?{effects:[{id:'long',type:'shake' as const,scope:'following' as const}]}:i===119?{clearFollowingEffects:true}:undefined}))};
  const entries=buildCombinedEditingTracks(p,'chapter').find(t=>t.target==='effects')!.entries;
  expect(entries).toHaveLength(2);expect(entries[0]).toMatchObject({cueId:'long',startCutIndex:0,endCutIndex:118,sourceLineId:'cut-0'});expect(entries[1]).toMatchObject({label:'이전 효과 종료',startCutIndex:119,endCutIndex:119});
 });
 it('keeps sounds as points and chapter source cue IDs editable',()=>{
  const base=make(),p={...base,chapters:base.chapters.map(ch=>({...ch,audio:{sounds:[{id:'entry',assetId:'sound'}]}})),lines:base.lines.map((l,i)=>i===1?{...l,audio:{sounds:[{id:'local',assetId:'sound'}]}}:l)};
  const entries=buildCombinedEditingTracks(p,'chapter').find(t=>t.target==='sounds')!.entries;
  expect(entries).toMatchObject([{sourceChapterId:'chapter',cueId:'entry',startCutIndex:0,endCutIndex:0},{sourceLineId:'b',cueId:'local',startCutIndex:1,endCutIndex:1}]);
 });
 it('resolves actor defaults and motion and uses ordered cuts for presentation points',()=>{
  const base=make(),p={...base,chapters:base.chapters.map(ch=>({...ch,leftAssetId:'default-actor'})),lines:[...base.lines].reverse().map(raw=>{const l={...raw,inheritActors:true};return l.id==='b'?{...l,inheritActors:false,stageComposition:{leftActors:[{key:'lead',assetId:'actor',motion:{type:'move' as const}}],rightActors:[]},presentation:{transition:{type:'dissolve' as const},look:{type:'flashback' as const},actors:{left:{opacity:.5}}}}:l;})};
  const tracks=buildCombinedEditingTracks(p,'chapter');expect(tracks.find(t=>t.target==='motion')!.entries).toMatchObject([{startCutIndex:1,sourceLineId:'b'}]);expect(tracks.find(t=>t.target==='actors')!.entries).toHaveLength(4);expect(tracks.find(t=>t.target==='transition')!.entries).toMatchObject([{startCutIndex:1,label:'부드러운 전환'}]);
  expect(buildCombinedEditingTracks(p,'missing').every(t=>t.entries.length===0)).toBe(true);
 });
});

it('clips conditional chapter and effect spans at explicit stops and retains empty chapters',()=>{
 const base=make(),condition={sourceLineId:'a',choiceId:'yes'},project={...base,chapters:base.chapters.map(ch=>({...ch,audio:{ambience:{action:'play' as const,assetId:'rain',branchCondition:condition}}})),lines:base.lines.map((line,index)=>index===0?{...line,presentation:{effects:[{type:'flash' as const,branchCondition:condition,scope:'following' as const}]}}:index===1?{...line,audio:{ambience:{action:'stop' as const}},presentation:{clearFollowingEffects:true}}:line)};
 const tracks=buildCombinedEditingTracks(project,'chapter');expect(tracks.find(t=>t.target==='ambience')!.entries.find(e=>e.conditional)).toMatchObject({startCutIndex:0,endCutIndex:0,sourceChapterId:'chapter'});expect(tracks.find(t=>t.target==='effects')!.entries.find(e=>e.conditional)).toMatchObject({endCutIndex:0});expect(buildCombinedEditingTracks({...base,lines:[]},'chapter').every(track=>track.entries.length===0)).toBe(true);
});

it('retains exact actor keys when cut IDs and actor keys overlap',()=>{
 const base=make(),project={...base,lines:base.lines.map(line=>line.id==='b'?{...line,inheritActors:false,stageComposition:{leftActors:[{key:'b',assetId:'actor',motion:{type:'move' as const}},{key:'lead',assetId:'actor',motion:{type:'fade-in' as const}}],rightActors:[{key:'lead-extra',assetId:'actor',motion:{type:'fade-out' as const}}]}}:line)},before=structuredClone(project);
 const entries=buildCombinedEditingTracks(project,'chapter').find(track=>track.target==='motion')!.entries;
 expect(entries).toMatchObject([{sourceLineId:'b',actorKey:'b'},{sourceLineId:'b',actorKey:'lead'},{sourceLineId:'b',actorKey:'lead-extra'}]);
 expect(entries.filter(entry=>entry.actorKey==='lead')).toHaveLength(1);
 expect(new Set(entries.map(entry=>entry.key)).size).toBe(3);
 expect(project).toEqual(before);
});

it('shows sequence ownership with every excluded clip and inclusive end without treating it as stop',()=>{
 const base=make(),sequence={action:'sequence' as const,id:'queue',endLineId:'c',clips:[{id:'first',assetId:'music',sourceEndMs:1000},{id:'second',assetId:'excluded',sourceStartMs:100,sourceEndMs:500}]};
 const project={...base,lines:base.lines.map((line,i)=>i===0?{...line,audio:{music:sequence}}:line)};
 const entries=buildCombinedEditingTracks(project,'chapter').find(track=>track.target==='music')!.entries;
 expect(entries).toHaveLength(1);expect(entries[0]).toMatchObject({label:'2개 음원 순서 재생',sourceLineId:'a',startCutIndex:0,endCutIndex:2,excludedAudio:true});
 const conditional={...project,lines:project.lines.map((line,i)=>i===0?{...line,audio:{music:{...sequence,branchCondition:{sourceLineId:'d',choiceId:'yes'}}}}:line)};
 expect(buildCombinedEditingTracks(conditional,'chapter').find(track=>track.target==='music')!.entries).toMatchObject([{conditional:true,label:'2개 음원 순서 재생',endCutIndex:2}]);
});

it.each([0,1,3])('keeps authored track anchors when cut %i is hidden during reading',hiddenIndex=>{
 const base=make(),p={...base,scores:[{id:'score',name:'점수',description:'',initial:0}],lines:base.lines.map((line,index)=>({...line,...(index===hiddenIndex?{visibility:{scores:{mode:'all' as const,terms:[{scoreId:'score',operator:'gte' as const,value:1}]}}}:{}),audio:{music:{action:'play' as const,assetId:`music-${index}`},sounds:[{id:`sound-${index}`,assetId:'sound'}]},presentation:{effects:[{id:`effect-${index}`,type:'shake' as const}]}}))};
 const before=structuredClone(p),tracks=buildCombinedEditingTracks(p,'chapter');
 for(const target of ['music','sounds','effects'] as const){
  const entries=tracks.find(track=>track.target===target)!.entries;
  expect(entries).toHaveLength(4);
  entries.forEach((entry,index)=>expect(entry).toMatchObject({startCutIndex:index,endCutIndex:index,sourceLineId:p.lines[index].id}));
 }
 expect(p).toEqual(before);
});
