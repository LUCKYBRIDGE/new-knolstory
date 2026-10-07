import { describe, expect, it } from 'vitest';
import { chapterLabel, cutLabel, createStoryBranches, createStoryChoiceChapter, createStoryDocument, parseStoryDocument, serializeStoryDocument, storyFlowTargets, orderedStoryFlowLines } from '@knolstory/story-domain';
import { createBlankStoryProject, addStoryChapter, insertStoryCut } from '../src/authoring';
import { advancePlayback, createPlayback, restorePlayback, backPlayback } from '../src/story-runtime';
import { updateStoryChapter } from '../src/editor-authoring';
const base=()=>createBlankStoryProject({id:'p',chapterId:'c',lineId:'l'});
const ids=()=>{let i=0;return ()=>`new-${++i}`;};
describe('chapter identity distinct from cut order and graph order',()=>{
 it('labels independent narrative numbers and branch suffix without rewriting title',()=>{
  const c={...base().chapters[0],order:4,chapterNumber:3,branchLabel:'B',title:'돌아오는 길'};
  expect(chapterLabel(c)).toBe('3장B · 돌아오는 길');
  expect(cutLabel(c,{order:2})).toBe('3장B · 돌아오는 길 · 2컷');
  expect(chapterLabel({...c,title:'3장B 돌아오는 길'})).toBe('3장B 돌아오는 길');
  expect(chapterLabel({...c,chapterNumber:undefined,branchLabel:undefined,title:'옛 제목'})).toBe('4장 · 옛 제목');
 });
 it('persists explicit chapter identity and rejects invalid numbers/suffixes',()=>{
  const p=updateStoryChapter(base(),'c',{chapterNumber:3,branchLabel:'A'});
  const parsed=parseStoryDocument(serializeStoryDocument(createStoryDocument({project:p,savedAt:'2026-10-07T00:00:00.000Z',appVersion:'test'})));
  expect(parsed.ok&&parsed.document.project.chapters[0]).toMatchObject({chapterNumber:3,branchLabel:'A'});
  for(const chapterNumber of [0,-1,1.5,NaN])expect(()=>updateStoryChapter(base(),'c',{chapterNumber})).toThrow();
  expect(()=>updateStoryChapter(base(),'c',{branchLabel:'a'.repeat(21)})).toThrow();
 });
 it('adds later chapters after narrative stage independent of branch ordering',()=>{
  const p={...base(),chapters:[{...base().chapters[0],order:9,chapterNumber:3,branchLabel:'B'}]};
  const next=addStoryChapter(p,{chapterId:'next',lineId:'next-cut'});
  expect(next.chapters[1]).toMatchObject({order:10,chapterNumber:4});
 });
 it('creates numbered branches and a later join with real exclusive destinations',()=>{
  const p={...base(),chapters:[{...base().chapters[0],chapterNumber:2}],lines:[{...base().lines[0],ending:{name:'old end',description:'',endsStory:true}}]};
  const next=createStoryBranches(p,'l',2,ids());
  expect(next.chapters.slice(1).map(c=>[c.chapterNumber,c.branchLabel])).toEqual([[3,'A'],[3,'B'],[4,undefined]]);
  const ordered=orderedStoryFlowLines(next);
  const targets=storyFlowTargets(ordered,0);
  expect(targets).toHaveLength(2);
  expect(new Set(targets).size).toBe(2);
  const branches=targets.map(id=>next.lines.find(l=>l.id===id)!);
  expect(branches.every(l=>!l.ending?.endsStory)).toBe(true);
  expect(branches.map(l=>l.flow?.type==='goto'&&l.flow.targetLineId)[0]).toBe(branches.map(l=>l.flow?.type==='goto'&&l.flow.targetLineId)[1]);
 });
 it('pending choices create next-stage A/B without inherited ending or orphaning ids',()=>{
  const p={...base(),chapters:[{...base().chapters[0],chapterNumber:2}],lines:[{...base().lines[0],flow:{type:'choice' as const,options:[{id:'a',label:'숲',targetLineId:''},{id:'b',label:'강',targetLineId:''}]}}]};
  const first=createStoryChoiceChapter(p,'l','a',ids());
  let i=30;const second=createStoryChoiceChapter(first.project,'l','b',()=>`new-${++i}`);
  expect(second.project.chapters.slice(1).map(c=>[c.chapterNumber,c.branchLabel])).toEqual([[3,'A'],[3,'B']]);
  expect(second.project.lines.find(l=>l.id==='l')?.flow).toMatchObject({options:[{id:'a',targetLineId:first.line.id},{id:'b',targetLineId:second.line.id}]});
 });
 it('extends a branch before its explicit join so newly written cuts are actually played',()=>{
  const p=createStoryBranches(base(),'l',2,ids());
  const source=p.lines.find(l=>l.id==='l')!;
  if(source.flow?.type!=='choice')throw Error('missing choices');
  const [a,b]=source.flow.options;
  const expanded=insertStoryCut(p,a.targetLineId!,'a-second');
  let state=advancePlayback(expanded,createPlayback(expanded),a.id);
  state=advancePlayback(expanded,state);
  expect(state.lineId).toBe('a-second');
  state=advancePlayback(expanded,state);
  expect(state.path).not.toContain(b.targetLineId);
  expect(state.lineId).toBe(p.lines.at(-1)!.id);
  expect(restorePlayback(expanded,JSON.parse(JSON.stringify(state)))).toEqual(state);
  const back=backPlayback(expanded,backPlayback(expanded,backPlayback(expanded,state)));
  expect(back.lineId).toBe('l');
  const other=advancePlayback(expanded,back,b.id);
  expect(other.path).toEqual(['l',b.targetLineId]);
 });
 it('extends an ending by moving the ending marker to the newly added last cut',()=>{
  const p={...base(),lines:[{...base().lines[0],ending:{name:'끝',description:'마무리',endsStory:true},flow:{type:'goto' as const,targetLineId:null}}]};
  const next=insertStoryCut(p,'l','last');
  const state=advancePlayback(next,createPlayback(next));
  expect(state.lineId).toBe('last');
  expect(next.lines.find(l=>l.id==='last')?.ending?.name).toBe('끝');
  expect(advancePlayback(next,state).status).toBe('ended');
 });

});
