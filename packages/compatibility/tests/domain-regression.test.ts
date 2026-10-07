import { describe, expect, it } from 'vitest';
import { getRepresentativeStory } from '../src/index';
import { createStoryDocument, parseStoryDocument, serializeStoryDocument, updateStoryLine, createStoryBranches, createStoryChoiceChapter, findStoryFlowIssues, disconnectStoryFlowTargets, isStoryFlow, storyFlowTargets, type StoryProject } from '@knolstory/story-domain';
import { isStorySource, isLinearCreationSource } from '../../story-domain/src/legacy/story-source';
import { normalizeCreativeMemos } from '../../story-domain/src/legacy/creative-memos';
import { canonicalizeStoryStageKeys, isStoryStageKey } from '../../story-domain/src/legacy/story-stages';
import { isStageComposition, patchStageLine, stageActorDepth, activeStageSpeaker, resolveStageComposition } from '../../story-domain/src/legacy/story-stage-composition';
import { canonicalizeProjectPresentation, isStoryPresentation, presentationLabel, presentationRange } from '../../story-domain/src/legacy/story-presentation';
const fixture = () => getRepresentativeStory('rabbit');
const smallProject = (): StoryProject => {
 const project = fixture().project;
 const chapter = project.chapters[0];
 const [first,second] = project.lines;
 return {...project, chapters:[chapter],lines:[{...first,chapterId:chapter.id,flow:undefined},{...second,chapterId:chapter.id,flow:undefined}]};
};
const idGenerator = () => {let n=0;return ()=>`generated-${++n}`;};
describe('authored branching edits', () => {
 it('creates empty branches which rejoin existing manuscript without copying effects', () => {
  const original=smallProject();
  const source=original.lines[0];
  const expanded=createStoryBranches(original,source.id,2,idGenerator());
  expect(original.lines).toHaveLength(2);
  expect(expanded.lines).toHaveLength(5);
  const flow=expanded.lines[0].flow;
  expect(flow?.type).toBe('choice');
  if(flow?.type!=='choice') throw new Error('choice missing');
  expect(flow.options).toHaveLength(2);
  const branches=flow.options.map(option=>expanded.lines.find(line=>line.id===option.targetLineId)!);
  expect(branches.map(line=>line.text)).toEqual(['','']);
  expect(branches[0].flow).toEqual(branches[1].flow);
  expect(findStoryFlowIssues(expanded)).toEqual([]);
  expect(expanded.lines[1].flow).toEqual({type:'goto',targetLineId:null});
  expect(createStoryBranches(expanded,source.id,2,idGenerator())).toBe(expanded);
  expect(createStoryBranches(original,'missing',2,idGenerator())).toBe(original);
 });
 it('can retain an old path inside one choice and preserves actor overrides only', () => {
  const project=smallProject();
  const source={...project.lines[0],presentation:{effects:[{type:'flash' as const}],actors:{left:{opacity:.5}}}};
  const edited={...project,lines:[source,project.lines[1]]};
  const expanded=createStoryBranches(edited,source.id,3,idGenerator(),1);
  expect(expanded.lines[0].flow).toMatchObject({type:'choice',options:[{}, {targetLineId:project.lines[1].id},{}]});
  expect(expanded.lines.slice(2).every(line=>!line.presentation?.effects)).toBe(true);
  expect(expanded.lines.at(-1)?.flow).toEqual({type:'goto',targetLineId:null});
  expect(()=>createStoryBranches(project,source.id,2,()=>source.id)).toThrow();
  expect(()=>createStoryBranches(project,source.id,2,idGenerator(),2)).toThrow();
 });
 it('adds destinations only for unfinished choices, and deletion keeps an unfinished marker', () => {
  const original=smallProject(); const first=original.lines[0];
  const pending={...original,lines:[{...first,flow:{type:'choice' as const,options:[{id:'a',label:'새 갈래',targetLineId:''},{id:'b',label:'끝',targetLineId:null}]}},original.lines[1]]};
  const created=createStoryChoiceChapter(pending,first.id,'a',idGenerator());
  expect(created.line.text).toBe('');
  expect(created.project.lines).toHaveLength(3);
  expect(pending.lines[0].flow).toMatchObject({options:[{targetLineId:''},{}]});
  expect(()=>createStoryChoiceChapter(pending,first.id,'b',idGenerator())).toThrow();
  expect(()=>createStoryChoiceChapter(pending,first.id,'a',()=>first.id)).toThrow();
  const detached=disconnectStoryFlowTargets(created.project.lines,new Set([created.line.id]));
  expect(detached[0].flow).toMatchObject({options:[{targetLineId:''},{targetLineId:null}]});
  const goto=disconnectStoryFlowTargets([{...first,flow:{type:'goto',targetLineId:created.line.id}}],new Set([created.line.id]));
  expect(goto[0].flow).toEqual({type:'goto',targetLineId:''});
 });
 it('finds blank labels, broken destinations and cycles while allowing explicit endings', () => {
  const project=smallProject(),[first,second]=project.lines;
  const bad={...project,lines:[{...first,flow:{type:'choice' as const,options:[{id:'a',label:'',targetLineId:second.id},{id:'b',label:'?',targetLineId:'missing'}]}},{...second,flow:{type:'goto' as const,targetLineId:first.id}}]};
  expect(new Set(findStoryFlowIssues(bad).map(issue=>issue.kind))).toEqual(new Set(['label','link','cycle']));
  expect(storyFlowTargets([],0)).toEqual([]);
  expect(storyFlowTargets([{...first,ending:{name:'끝',description:'',endsStory:true}}],0)).toEqual([null]);
  expect(storyFlowTargets([first],0)).toEqual([null]);
  expect(isStoryFlow(null)).toBe(false);
  expect(isStoryFlow({type:'choice',options:[{id:'a',label:'',targetLineId:null},{id:'a',label:'',targetLineId:''}]})).toBe(false);
  expect(isStoryFlow({type:'goto',targetLineId:2})).toBe(false);
 });
});
describe('document errors do not alter student manuscripts',()=>{
 it('rejects malformed metadata and missing required fields at import and export',()=>{
  const doc=fixture();
  for(const value of [null,[],42,{schemaVersion:0},'{',JSON.stringify({})])expect(parseStoryDocument(value).ok).toBe(false);
  for(const patch of [{documentType:'other'},{savedAt:'2026-02-30T00:00:00.000Z'},{appVersion:''},{assetCatalogVersion:''}])expect(parseStoryDocument({...doc,...patch}).ok).toBe(false);
  expect(()=>createStoryDocument({project:doc.project,savedAt:'bad',appVersion:'next'})).toThrow();
  expect(()=>createStoryDocument({project:doc.project,savedAt:doc.savedAt,appVersion:''})).toThrow();
  expect(()=>createStoryDocument({project:doc.project,savedAt:doc.savedAt,appVersion:'next',assetCatalogVersion:''})).toThrow();
  expect(parseStoryDocument(doc.project).ok).toBe(false);
  expect(parseStoryDocument(doc.project,{savedAt:'bad',appVersion:'next'}).ok).toBe(false);
  expect(parseStoryDocument({...doc.project,lines:[{...doc.project.lines[0],backgroundMode:'none'}]},{savedAt:doc.savedAt,appVersion:'next'}).ok).toBe(false);
  expect(()=>serializeStoryDocument({...doc,appVersion:''})).toThrow();
  expect(()=>updateStoryLine(doc,'missing',{text:''})).toThrow();
 });
});
describe('provenance validation',()=>{
 const linear={mode:'rewrite',sourceStartChoiceLineId:'a',writingStartLineId:'b',prefixLineIds:['a'],choices:[{lineId:'a',optionId:'x',label:'길'}],sourceRevision:'v1'};
 it('retains blank, base, publication and shared-file provenance',()=>{
  for(const source of [{kind:'blank'},{kind:'baseEdition',baseStoryId:'rabbit',baseEditionId:'v1',linearCreation:linear,linearSetup:true},{kind:'publication',publicationId:'id',originalTitle:'제목',originalAuthorDisplayName:'작가',originalFingerprint:'sha'},{kind:'sharedFile',originalTitle:'제목',originalAuthorDisplayName:'작가',originalFingerprint:'sha'}])expect(isStorySource(source)).toBe(true);
  for(const source of [null,[],{}, {kind:'baseEdition',baseStoryId:'',baseEditionId:'v1'},{kind:'baseEdition',baseStoryId:'a',baseEditionId:'b',linearSetup:false},{kind:'baseEdition',baseStoryId:'a',baseEditionId:'b',linearCreation:{}},{kind:'publication',publicationId:'',originalTitle:'',originalAuthorDisplayName:'',originalFingerprint:'a'},{kind:'sharedFile',originalFingerprint:''}])expect(isStorySource(source)).toBe(false);
 });
 it('rejects impossible linear provenance paths and unknown fields',()=>{
  expect(isLinearCreationSource(linear)).toBe(true);
  for(const patch of [{unknown:true},{mode:'other'},{prefixLineIds:['a','a']},{prefixLineIds:['b']},{prefixLineIds:[1]},{choices:[]},{choices:[{lineId:'a',optionId:'x',label:'',unknown:true}]},{choices:[{lineId:'c',optionId:'x',label:''}]},{choices:[{lineId:'a',optionId:'x',label:''},{lineId:'a',optionId:'y',label:''}]},{sourceRevision:5}])expect(isLinearCreationSource({...linear,...patch})).toBe(false);
  expect(isLinearCreationSource(null)).toBe(false);
 });
});
describe('notes and story arc import',()=>{
 it('keeps authored structured notes and linked scope while normalizing missing legacy values',()=>{
  const notes=normalizeCreativeMemos([{id:'b',kind:'event',title:'事件',order:2,createdAt:'then',updatedAt:'now',linkedChapterId:'chapter',linkedLineId:'cut',linkedChapterIds:['c',1],linkedLineIds:['l'],linkedCharacterNames:['토끼'],fields:[{id:'f2',label:'두 번째',value:'text',order:2,source:'default'},{id:'f1',label:'첫 번째',value:'first',order:1,source:'recommended'}]},null,{id:'a',kind:'unknown',fields:[null,{}, {id:'good',label:'label',value:'value',order:3,source:'custom'}]}]);
  expect(notes).toHaveLength(2);
  expect(notes[0].fields.map(field=>field.value)).toEqual(['first','text']);
  expect(notes[0].linkedChapterIds).toEqual(['c']);
  expect(notes[1].kind).toBe('free');
  expect(notes[1].createdAt).toBe('1970-01-01T00:00:00.000Z');
  expect(normalizeCreativeMemos(null)).toEqual([]);
  expect(normalizeCreativeMemos([{}])[0].id).toBe('memo-1');
 });
 it('retains known canonical story arcs without duplicates',()=>{
  expect(canonicalizeStoryStageKeys(['ending','opening','ending','unknown'])).toEqual(['opening','ending']);
  expect(canonicalizeStoryStageKeys(null)).toEqual([]);
  expect(isStoryStageKey('opening')).toBe(true);
  expect(isStoryStageKey(1)).toBe(false);
 });
});

describe('stage edits preserve explicit exits, inheritance and speaker identities',()=>{
 it('validates four actors and rejects duplicate keys, missing speaker and invalid transforms',()=>{
  const stage={leftActors:[{key:'L1',assetId:'a',position:'center' as const,positionOrder:1,characterKey:'person',placementPreset:'double-left' as const,xAnchor:20,scaleMultiplier:1,facing:'right' as const,baseDepth:1,depthOverride:3},{key:'L2',assetId:'b'}],rightActors:[{key:'R1',assetId:'c'},{key:'R2',assetId:'d'}],speakerActorKeys:['L1','R1'],speakerActorKey:'R1'};
  expect(isStageComposition(stage)).toBe(true);
  for(const patch of [{speakerActorKey:'missing'},{speakerActorKeys:['missing']},{leftActors:[{key:'L1',assetId:'a'},{key:'L1',assetId:'b'}]},{leftActors:[{key:'L1',assetId:'a',scaleMultiplier:9}]},{leftActors:[{key:'L1',assetId:'a',xAnchor:NaN}]},{leftActors:[{key:'L1',assetId:'a',facing:'up'}]},{leftActors:[{key:'L1',assetId:'a',baseDepth:4}]},{leftActors:[] ,rightActors:[]}]) {
   const candidate={...stage,...patch};
   expect(isStageComposition(candidate)).toBe(false);
  }
  expect(isStageComposition(null)).toBe(false);
  expect(isStageComposition({leftActors:[],rightActors:[]})).toBe(true);
 });
 it('edits left/right images and inheritance without writing through to source',()=>{
  const project=smallProject(),chapter=project.chapters[0],source=project.lines[0];
  const stage={leftActors:[{key:'L1',assetId:'left'}],rightActors:[{key:'R1',assetId:'right'}],speakerActorKey:'L1'};
  const line={...source,type:'dialogue' as const,speaker:'left' as const,backgroundMode:'none' as const,backgroundId:'',stageComposition:stage};
  expect(patchStageLine(line,{backgroundId:'bg'},chapter,project).backgroundMode).toBeUndefined();
  const moved=patchStageLine(line,{leftAssetId:'other',speaker:'right'},chapter,project);
  expect(moved.stageComposition?.leftActors[0].assetId).toBe('other');
  expect(moved.stageComposition?.speakerActorKey).toBe('R1');
  expect(line.stageComposition.leftActors[0].assetId).toBe('left');
  const inherited=patchStageLine(line,{inheritActors:true});
  expect(inherited.stageComposition).toBeUndefined();
  expect(inherited.leftAssetId).toBe('');
  expect(patchStageLine(inherited,{text:'new'}).inheritActors).toBe(true);
  expect(patchStageLine(source,{text:'new'}).text).toBe('new');
  expect(patchStageLine(line,{stageComposition:{leftActors:[],rightActors:[]}}).leftAssetId).toBe('');
  expect(patchStageLine({...line,leftAssetId:'',rightAssetId:''},{leftAssetId:''}).stageComposition?.leftActors).toEqual([]);
  const exit={...line,stageComposition:{leftActors:[],rightActors:[]}};
  expect(patchStageLine(exit,{rightAssetId:'new'}).stageComposition?.rightActors[0].assetId).toBe('new');
  expect(resolveStageComposition(null,null,null)).toEqual({leftActors:[],rightActors:[]});
  expect(resolveStageComposition(null,{...source,inheritActors:true},{...project,stageDefaults:{backgroundId:'',leftAssetId:'default',rightAssetId:''}}).leftActors[0].assetId).toBe('default');
 });
 it('speaker emphasis follows dialogue and does not apply to narration or choices',()=>{
  const source=smallProject().lines[0];const stage={leftActors:[{key:'l',assetId:'a'}],rightActors:[{key:'r',assetId:'b'}]};
  expect(activeStageSpeaker(stage,{...source,type:'dialogue',speaker:'left'})).toBe('l');
  expect(activeStageSpeaker(stage,{...source,type:'dialogue',speaker:'right'})).toBe('r');
  expect(activeStageSpeaker(stage,null)).toBeUndefined();
  expect(activeStageSpeaker(stage,{...source,type:'narration'})).toBeUndefined();
  expect(stageActorDepth({key:'l',assetId:'a'},0,2,'l')).toBe(3);
  expect(stageActorDepth({key:'l',assetId:'a'},1,1)).toBe(2);
  expect(stageActorDepth({key:'l',assetId:'a',baseDepth:1},1,1)).toBe(1);
  expect(stageActorDepth({key:'l',assetId:'a',depthOverride:4},1,1)).toBe(4);
 });
});
describe('presentation boundaries and cut range editing',()=>{
 it('labels actor/look/effect/transition metadata and respects branch boundaries',()=>{
  const lines=smallProject().lines;
  expect(presentationLabel()).toBe('없음');
  expect(presentationLabel({})).toBe('없음');
  expect(presentationLabel({effects:[{type:'flash'}],look:{type:'flashback'},transition:{type:'dissolve'},actors:{left:{opacity:1}}})).toContain('부드러운 전환');
  expect(presentationRange(lines,lines[0].id,2)).toEqual(lines.map(line=>line.id));
  expect(presentationRange(lines,'missing',2)).toBeUndefined();
  expect(presentationRange([{...lines[0],flow:{type:'goto',targetLineId:null}},lines[1]],lines[0].id,2)).toBeUndefined();
 });
 it('validates authored cue timing and rejects illegal conflicting legacy effects',()=>{
  const lines=smallProject().lines;
  expect(isStoryPresentation({effects:[{type:'shake',intensity:'strong',trigger:'with-dialogue',delayMs:0,id:'cue'}],look:{type:'fractured-reality',intensity:'soft'},transition:{type:'dissolve',durationMs:0,mode:'auto',cue:'cue',title:'title',description:'desc',actionLabel:'go'},actors:{right:{xAnchor:80,scaleMultiplier:1.2,facing:'left',opacity:.2,emphasis:'dim',spectral:false}},presetOrigin:'impact'})).toBe(true);
  for(const presentation of [null,[],{unknown:true},{presetOrigin:5},{effects:[{type:'invalid'}]},{effects:[{type:'flash',trigger:'never'}]},{look:{type:'unknown'}},{transition:{type:'white-fade',durationMs:-1}},{actors:{left:{scaleMultiplier:5}}},{actors:{top:{}}},{actors:{right:{spectral:'yes'}}}])expect(isStoryPresentation(presentation)).toBe(false);
  expect(()=>canonicalizeProjectPresentation({lines:[{...lines[0],effect:{type:'bad'}}] as never})).toThrow();
  expect(()=>canonicalizeProjectPresentation({lines:[{...lines[0],presentation:{bad:true}}] as never})).toThrow();
  expect(()=>canonicalizeProjectPresentation({lines:[{...lines[0],effect:{type:'shake',intensity:'soft',trigger:'scene-enter',delayMs:0},presentation:{}}] as never})).toThrow();
 });
});
