import { describe, expect, it } from 'vitest';
import { addStoryChapter, createBlankStoryProject } from '../src/authoring';
import { addTypedStoryCut, assignStorySpeaker, deleteStoryCut, duplicateStoryCut, getStoryCutDeletionImpact, moveStoryCutToChapter, registerStorySpeaker, setStageSpeaker, updateStoryChapter } from '../src/editor-authoring';
const blank = () => createBlankStoryProject({id:'p',chapterId:'c',lineId:'a'});
describe('editor authoring', () => {
 it('updates chapter fields without losing planning and validates title', () => {
  const p = blank(); const n = updateStoryChapter(p,'c',{summary:'개요',chapterSpeakerNames:['나']});
  expect(n.chapters[0]).toMatchObject({summary:'개요',chapterSpeakerNames:['나'],purpose:''}); expect(p.chapters[0].summary).toBe('');
  expect(() => updateStoryChapter(p,'missing',{})).toThrow(); expect(() => updateStoryChapter(p,'c',{title:'a'.repeat(201)})).toThrow();
 });
 it('adds typed cuts and duplicates full content with unique choice ids', () => {
  const p=addTypedStoryCut(blank(),'a','b','dialogue'); expect(p.lines.find(l=>l.id==='b')?.type).toBe('dialogue');
  const source={...p,lines:p.lines.map(l=>l.id==='a'?{...l,text:'원문',flow:{type:'choice' as const,options:[{id:'one',label:'1',targetLineId:'b'},{id:'two',label:'2',targetLineId:null}]}}:l)};
  const n=duplicateStoryCut(source,'a','copy'); const clone=n.lines.find(l=>l.id==='copy')!;
  expect(clone.text).toBe('원문'); expect(clone.flow?.type).toBe('choice');
  if(clone.flow?.type==='choice') expect(clone.flow.options.map(o=>o.id)).toEqual(['copy-choice-1','copy-choice-2']);
  expect(() => duplicateStoryCut(source,'a','b')).toThrow();
 });
 it('moves cuts preserving inherited appearance and continuation and renumbers', () => {
  let p=addStoryChapter(blank(),{chapterId:'d',lineId:'b'}); p=updateStoryChapter(p,'c',{leftAssetId:'person',backgroundId:'forest'});
  p={...p,continuation:{chapterId:'c',lineId:'a',label:'계속'},lines:p.lines.map(l=>l.id==='a'?{...l,inheritActors:true}:l)};
  const n=moveStoryCutToChapter(p,'a','d'); expect(n.lines.find(l=>l.id==='a')).toMatchObject({chapterId:'d',order:2,inheritActors:false,leftAssetId:'person',backgroundId:'forest'});
  expect(n.continuation?.chapterId).toBe('d'); expect(moveStoryCutToChapter(n,'a','d')).toBe(n);
  expect(() => moveStoryCutToChapter(p,'a','missing')).toThrow();
 });
 it('removes incoming links explicitly and clears continuation without losing other cuts', () => {
  const p=addTypedStoryCut(blank(),'a','b','narration'); const linked={...p,continuation:{chapterId:'c',lineId:'b',label:'계속'},lines:p.lines.map(l=>l.id==='a'?{...l,flow:{type:'goto' as const,targetLineId:'b'}}:l)};
  expect(getStoryCutDeletionImpact(linked,'b')).toEqual({incomingLinks:1,isContinuation:true});
  const n=deleteStoryCut(linked,'b'); expect(n.lines[0].flow).toEqual({type:'goto',targetLineId:''}); expect(n.continuation).toBeUndefined();
  expect(() => deleteStoryCut(blank(),'a')).toThrow(); expect(() => deleteStoryCut(p,'unknown')).toThrow();
 });
 it('registers speakers by identity and assigns only the name', () => {
  let p=registerStorySpeaker(blank(),{id:'me',name:'나',defaultImageId:''},'c');
  p=registerStorySpeaker(p,{id:'me',name:'나',defaultImageId:'image'},'c'); expect(p.characters).toHaveLength(1); expect(p.speakerNames).toEqual(['나']);
  const n=assignStorySpeaker(p,'a','나'); expect(n.lines[0].stageComposition).toEqual(p.lines[0].stageComposition);
  expect(n.lines[0].speakerName).toBe('나'); expect(() => registerStorySpeaker(p,{id:'',name:'나',defaultImageId:''})).toThrow();
 });
 it('binds only a displayed actor while preserving layout, and clears highlighting', () => {
  const base=blank(); const p={...base,lines:[{...base.lines[0],type:'dialogue' as const,stageComposition:{leftActors:[],rightActors:[{key:'R',assetId:'img',xAnchor:70,scaleMultiplier:.8}]}}]};
  const n=setStageSpeaker(p,'a','R'); expect(n.lines[0].speaker).toBe('right'); expect(n.lines[0].stageComposition?.speakerActorKeys).toEqual(['R']);
  expect(n.lines[0].stageComposition?.rightActors[0].scaleMultiplier).toBe(.8);
  expect(setStageSpeaker(n,'a',null).lines[0].speaker).toBe('narration'); expect(() => setStageSpeaker(p,'a','unknown')).toThrow();
 });
 it('handles choice deletion impact and keeps unrelated continuation', () => {
  const base=addTypedStoryCut(blank(),'a','b','narration');
  const p={...base,continuation:{chapterId:'c',lineId:'a',label:'남기기'},lines:base.lines.map(l=>l.id==='a'?{...l,flow:{type:'choice' as const,options:[{id:'x',label:'삭제',targetLineId:'b'},{id:'y',label:'끝',targetLineId:null}]}}:l)};
  expect(getStoryCutDeletionImpact(p,'b').incomingLinks).toBe(1);
  const n=deleteStoryCut(p,'b'); expect(n.continuation).toEqual(p.continuation);
  expect(n.lines[0].flow).toEqual({type:'choice',options:[{id:'x',label:'삭제',targetLineId:''},{id:'y',label:'끝',targetLineId:null}]});
 });
 it('preserves explicitly absent backgrounds and image transforms during moves', () => {
  let p=addStoryChapter(blank(),{chapterId:'d',lineId:'b'}); p=updateStoryChapter(p,'d',{backgroundId:'other',rightAssetId:'other-person'});
  const n=moveStoryCutToChapter(p,'a','d'); expect(n.lines.find(l=>l.id==='a')).toMatchObject({backgroundMode:'none',stageComposition:{leftActors:[],rightActors:[]}});
  expect(() => addTypedStoryCut(p,'a','new','invalid' as 'dialogue')).toThrow();
  expect(() => updateStoryChapter(p,'c',{summary:123 as unknown as string})).toThrow();
  expect(() => assignStorySpeaker(p,'a','x'.repeat(201))).toThrow();
  expect(() => registerStorySpeaker(p,{id:'ok',name:'ok',defaultImageId:''},'unknown')).toThrow();
 });
 it('avoids option id collisions and preserves existing speaker metadata', () => {
  const base=addTypedStoryCut(blank(),'a','b','dialogue');
  const p={...base,characters:[{id:'hero',name:'주인공',role:'주연',description:'설정',defaultImageId:'old'}],lines:base.lines.map(l=>l.id==='a'?{...l,flow:{type:'choice' as const,options:[{id:'copy-choice-1',label:'1',targetLineId:null},{id:'z',label:'2',targetLineId:null}]}}:l)};
  const n=duplicateStoryCut(p,'a','copy'); const flow=n.lines.find(l=>l.id==='copy')!.flow;
  if(flow?.type==='choice') expect(flow.options[0].id).toBe('copy-choice-1-1');
  expect(registerStorySpeaker(p,{id:'hero',name:'주인공',defaultImageId:'new'}).characters?.[0]).toMatchObject({role:'주연',description:'설정',defaultImageId:'new'});
 });
});
