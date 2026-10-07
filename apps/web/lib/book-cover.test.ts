import { describe, expect, it } from 'vitest';
import { createBlankStoryProject } from '@knolstory/runtime-core';
import { ASSET_CATALOG } from '@knolstory/asset-registry';
import { DEFAULT_COVER, type StoryCover } from '@knolstory/story-domain';
import { COVER_PRESET_OPTIONS, applyCoverPreset, defaultCoverComposition, updateCoverComposition, resolveStoryCover, resolveBookCover, coverTextPanel, coverTitleSize, coverImageGeometry, coverElementBox, coverElementText } from './book-cover';
const blank = () => createBlankStoryProject({id:'cover-test',chapterId:'c',lineId:'l'});
describe('static book cover compatibility', () => {
 it('derives missing covers from the first ordered chapter and cut without modifying the project', () => {
  const p=blank(); const chapter={...p.chapters[0],id:'first',order:0,backgroundId:'chapter-bg',leftAssetId:'chapter-actor'};
  const line={...p.lines[0],chapterId:'first',backgroundId:'cut-bg',leftAssetId:'cut-actor'};
  const project={...p,chapters:[p.chapters[0],chapter],lines:[line]};
  expect(resolveStoryCover(project)).toEqual({...DEFAULT_COVER,backgroundId:'cut-bg',characterId:'cut-actor'});
  expect(project.cover).toBeUndefined();expect(project.chapters[0]).toBe(p.chapters[0]);
  expect(resolveStoryCover({...project,lines:[]})).toMatchObject({backgroundId:'chapter-bg',characterId:'chapter-actor'});
 });
 it('preserves every authored setting and independently clones nested composition', () => {
  const cover={...DEFAULT_COVER,author:'작가',subtitle:'부제',authorNote:'기록',titleColor:'#ffffff',composition:defaultCoverComposition(DEFAULT_COVER)};
  const resolved=resolveStoryCover({...blank(),cover});expect(resolved).toEqual(cover);expect(resolved).not.toBe(cover);expect(resolved.composition).not.toBe(cover.composition);
 });
 it.each(COVER_PRESET_OPTIONS)('applies $id while preserving artwork, copy, color and non-target settings', ({id,layout})=>{
  const cover={...DEFAULT_COVER,author:'보존',authorNote:'기록',subtitle:'부제',backgroundId:'bg',characterId:'actor',titleColor:'#abcdef'};
  const next=applyCoverPreset(cover,id);expect(next).toMatchObject({presetId:id,layout,author:'보존',subtitle:'부제',authorNote:'기록',backgroundId:'bg',characterId:'actor',titleColor:'#abcdef'});expect(cover.presetId).toBeUndefined();
  expect(resolveBookCover({...blank(),cover:next}).preset).toBe(id);
 });
 it.each(['classic','picture','bold'] as const)('uses %s legacy layout geometry without creating saved composition', layout=>{
  const model=resolveBookCover({...blank(),cover:{...DEFAULT_COVER,layout}});expect(model.mode).toBe('legacy');expect(model.cover.composition).toBeUndefined();expect(model.artBox.h).toBeGreaterThan(0);
 });
 it('clamps projected manual boxes to legacy safe margins without rewriting authored positions',()=>{
  const composition={...defaultCoverComposition(DEFAULT_COVER),titleX:10,titleWidth:90,characterX:15,characterScale:1.3,characterBottom:35,backgroundFit:'complete' as const};
  const model=resolveBookCover({...blank(),cover:{...DEFAULT_COVER,composition}});
  expect(model.titleBox.x).toBeCloseTo(.05);expect(model.actorBox.x).toBeCloseTo(.05);expect(model.actorBox.h).toBeCloseTo(.60);expect(model.cover.composition).toEqual(composition);
  expect(updateCoverComposition(DEFAULT_COVER,{titleX:10,titleWidth:90}).composition?.titleX).toBe(50);
  expect(()=>updateCoverComposition(DEFAULT_COVER,{backgroundZoom:10})).toThrow();
 });
 it.each(['top','middle','bottom'] as const)('preserves %s title and left/right authoring defaults',titlePosition=>{
  const cover={...DEFAULT_COVER,titlePosition,characterPosition:'right' as const};
  expect(defaultCoverComposition(cover).titleY).toBe({top:12,middle:35,bottom:55}[titlePosition]);expect(defaultCoverComposition(cover).characterX).toBe(72);
 });
 it('uses a contrasting panel and shrinks long Unicode titles without ellipsis',()=>{
  expect(coverTextPanel('#ffffff')).toBe('#111111');expect(coverTextPanel('#000000')).toBe('#ffffff');expect(coverTitleSize('긴제목'.repeat(50),80)).toBeLessThan(80);expect(coverTitleSize('짧음',14)).toBe(14);
 });
 it('resolves catalog assets by matching type and reports missing IDs without changing them',()=>{
  const bg=ASSET_CATALOG.find(a=>a.type==='background')!;
  const model=resolveBookCover({...blank(),cover:{...DEFAULT_COVER,backgroundId:bg.id,characterId:bg.id}});expect(model.background?.src).toBe(bg.src);expect(model.character).toBeUndefined();expect(model.cover.characterId).toBe(bg.id);
 });
 it('projects local band coordinates and every binding without mutating source boxes',()=>{
  const box={x:.1,y:.2,w:.8,h:.3};expect(coverElementBox({type:'text',region:'band',box})).toEqual({x:.1,y:.856,w:.8,h:.054});expect(box.y).toBe(.2);
  for(const bind of ['project.title','project.description','cover.author','cover.subtitle','cover.authorNote'] as const) expect(coverElementText({content:{bind}} as never,{title:'t',description:'d',author:'a',subtitle:'s',authorNote:'n'})).toBe({'project.title':'t','project.description':'d','cover.author':'a','cover.subtitle':'s','cover.authorNote':'n'}[bind]);
  expect(coverElementText({content:{text:'수동'}} as never,{title:'',description:'',author:'',subtitle:'',authorNote:''})).toBe('수동');
 });
 it('uniformly crops and pans imagery, including contain and invalid dimensions',()=>{
  expect(coverImageGeometry({crop:{fit:'cover',zoom:1,x:100,y:50}},{width:200,height:100},{width:100,height:100})).toEqual({width:200,height:100,left:-100,top:0});
  expect(coverImageGeometry({crop:{fit:'contain',zoom:1,x:50,y:100}},{width:200,height:100},{width:100,height:100})).toEqual({width:100,height:50,left:0,top:50});
  expect(coverImageGeometry({crop:{fit:'cover',zoom:1,x:0,y:0}},{width:0,height:100},{width:100,height:100})).toBeUndefined();
 });
});
