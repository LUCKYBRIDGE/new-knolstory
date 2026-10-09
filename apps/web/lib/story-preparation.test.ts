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
