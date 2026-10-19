import { describe, expect, it } from 'vitest';
import { createBlankStoryProject } from '@knolstory/runtime-core';
import { addPreparationMemo, deletePreparationMemo, memoDestinations, updatePreparationCover, updatePreparationInfo, updatePreparationMemo, updatePreparationPlanning } from './story-preparation';
const blank = () => createBlankStoryProject({id:'p',chapterId:'c',lineId:'l'});
describe('story preparation preserves authored content', () => {
  it('changes only metadata and preserves identity and story references', () => {
    const p=blank(); const next=updatePreparationInfo(p,{title:'제목',description:'소개'});
    expect(next.title).toBe('제목'); expect(p.title).not.toBe('제목');
    expect(next.lines).toBe(p.lines); expect(next.chapters).toBe(p.chapters); expect(next.id).toBe(p.id);
  });
  it('fills a missing cover and preserves advanced cover data on later edits', () => {
    const p=updatePreparationCover(blank(),{author:'지은이'});
    expect(p.cover?.theme).toBe('forest');
    const composition={version:1,backgroundFit:'fill',backgroundX:20} as const;
    const advanced={...p,cover:{...p.cover!,composition:composition as NonNullable<typeof p.cover>['composition'],presetId:'arch' as const}};
    const next=updatePreparationCover(advanced,{subtitle:'부제',backgroundId:'forest'});
    expect(next.cover?.composition).toBe(composition); expect(next.cover?.presetId).toBe('arch'); expect(next.cover?.author).toBe('지은이');
  });
  it('changes planning without clearing optional authored notes', () => {
    const p=blank(); const next=updatePreparationPlanning(p,{premise:'아이디어'});
    expect(next.planning.premise).toBe('아이디어'); expect(next.planning.worldNotes).toBe(p.planning.worldNotes); expect(p.planning.premise).not.toBe('아이디어');
  });
  it('creates, edits and deletes memos without replacing existing fields or links', () => {
    const p=addPreparationMemo(blank(),'memo','2026-10-07T00:00:00Z','l');
    expect(p.creativeMemos[0].linkedLineId).toBe('l'); expect(p.creativeMemos[0].fields[0].value).toBe('');
    const next=updatePreparationMemo(p,'memo',{title:'확인',fields:p.creativeMemos[0].fields.map(f=>({...f,value:'내용'}))});
    expect(next.creativeMemos[0].linkedLineId).toBe('l'); expect(p.creativeMemos[0].title).not.toBe('확인');
    expect(deletePreparationMemo(next,'memo').creativeMemos).toEqual([]);
    expect(()=>updatePreparationMemo(next,'missing',{title:'x'})).toThrow();
    expect(()=>addPreparationMemo(next,'memo','now')).toThrow();
    expect(()=>addPreparationMemo(next,'new','now','missing')).toThrow();
  });
  it('resolves old single and multiple chapter/cut links, labels missing links and deduplicates', () => {
    const p=addPreparationMemo(blank(),'memo','now'); const m={...p.creativeMemos[0],linkedLineId:'l',linkedLineIds:['l','missing'],linkedChapterIds:['c']};
    const links=memoDestinations(p,m);
    expect(links).toHaveLength(3); expect(links[0].lineId).toBe('l'); expect(links[1].missing).toBe(true); expect(links[2].lineId).toBe('l');
    expect(memoDestinations(p,p.creativeMemos[0])).toEqual([]);
  });
  it('treats the parent chapter of a single cut link as context rather than a second link', () => {
    const p=addPreparationMemo(blank(),'memo','now','l');
    expect(memoDestinations(p,p.creativeMemos[0])).toHaveLength(1);
  });
});

it('preserves imported advanced design and multi-field memo records through basic preparation edits',()=>{
 const project=blank();const design={version:1,faces:{front:{layers:[{id:'saved-layer',type:'text',text:'보존'}]}}} as unknown as NonNullable<NonNullable<typeof project.cover>['design']>;
 const advanced={...updatePreparationCover(project,{author:'기존 작가'}),cover:{...updatePreparationCover(project,{}).cover!,design}};
 const edited=updatePreparationCover(updatePreparationPlanning(advanced,{mainGoal:'목표'}),{theme:'night',layout:'picture'});
 expect(edited.cover!.design).toBe(design);expect(edited.lines).toBe(project.lines);expect(edited.chapters).toBe(project.chapters);
});

import { createStoryDocument, parseStoryDocument, serializeStoryDocument } from '@knolstory/story-domain';
import { addMemoField, renameMemoField, moveMemoField, deleteMemoField, restoreMemoField, filterPreparationMemos } from './story-preparation';
describe('creative memo field authoring',()=>{
 const memo=()=>({...addPreparationMemo(blank(),'m','now','l').creativeMemos[0],linkedLineIds:['l'],linkedCharacterNames:['흥부'],fields:[
  {id:'a',label:'같은 항목',value:'첫 원고',order:10,source:'recommended' as const},
  {id:'b',label:'같은 항목',value:'둘째 원고',order:10,source:'default' as const},
 ]});
 it('adds, renames and moves by identity with repeated labels and orders; preserves sources and links',()=>{
  const original=memo(); const added=addMemoField(original,'c','세 번째');
  expect(added.fields[2]).toMatchObject({id:'c',value:'',source:'custom',order:11});
  const renamed=renameMemoField(added,'b','아주 긴 한국어 이름');
  const moved=moveMemoField(renamed,'b',-1);
  expect(moved.fields.map(f=>f.id)).toEqual(['b','a','c']);
  expect(moved.fields[0]).toMatchObject({label:'아주 긴 한국어 이름',value:'둘째 원고',source:'default',order:1});
  expect(moved.linkedLineIds).toBe(original.linkedLineIds);
  expect(moved.linkedCharacterNames).toBe(original.linkedCharacterNames);
  expect(original.fields[1].label).toBe('같은 항목');
  expect(moveMemoField(moved,'b',-1)).toBe(moved);
 });
 it('rejects blank labels and duplicate or missing ids without altering authored fields',()=>{
  const m=memo();expect(()=>addMemoField(m,'a','new')).toThrow();expect(()=>addMemoField(m,'c','   ')).toThrow();
  expect(()=>renameMemoField(m,'a','')).toThrow();expect(()=>renameMemoField(m,'missing','new')).toThrow();
  expect(()=>deleteMemoField(m,'missing')).toThrow();
 });
 it('undoes deletion at the original position without losing later edits, including an empty memo',()=>{
  const m=memo();const deleted=deleteMemoField(m,'a');
  const later=renameMemoField(deleted,'b','수정 유지');
  const restored=restoreMemoField(later,m.fields[0],0);
  expect(restored.fields.map(f=>f.id)).toEqual(['a','b']);expect(restored.fields[1].label).toBe('수정 유지');
  expect(restored.fields[0].source).toBe('recommended');
  expect(restoreMemoField(restored,m.fields[0],0)).toBe(restored);
  expect(restoreMemoField(deleteMemoField({...m,fields:[m.fields[0]]},'a'),m.fields[0],0).fields).toHaveLength(1);
 });
 it('roundtrips field values, ordering, metadata and links through the official file format',()=>{
  const m=moveMemoField(renameMemoField(addMemoField(memo(),'c','새 항목'),'b','이름'), 'b',-1);
  const p={...blank(),creativeMemos:[m]};
  const loaded=parseStoryDocument(JSON.parse(serializeStoryDocument(createStoryDocument({project:p,savedAt:'2026-10-09T00:00:00.000Z',appVersion:'test'}))));
  expect(loaded.ok).toBe(true);if(loaded.ok)expect(loaded.document.project.creativeMemos[0]).toEqual(m);
 });
 it('searches titles, labels, bodies and linked people while combining kind and scope filters',()=>{
  const a=memo(), b={...memo(),id:'other',kind:'task' as const,title:'할 일',linkedLineId:undefined,linkedChapterId:undefined,linkedLineIds:undefined};
  expect(filterPreparationMemos([a,b],{query:'둘째 원고'})).toHaveLength(2);
  expect(filterPreparationMemos([a,b],{query:'흥부',kind:'task',scope:'work'})).toEqual([b]);
  expect(filterPreparationMemos([a,b],{query:'같은 항목',scope:'current',lineId:'l',chapterId:'c'})).toEqual([a]);
  expect(filterPreparationMemos([a,b],{query:'없는 말'})).toEqual([]);
 });
});
