import {describe,it,expect} from 'vitest';
import {resolveAsset} from '@knolstory/asset-registry';
import {resolveStageLayout,type LayoutActor} from '../src/stage-layout';
import {stageReadableCharacterScale} from '../src/stage-view';
const make=(key:string,side:LayoutActor['side'],id:string,extra:Partial<LayoutActor>={}):LayoutActor=>({key,side,geometry:resolveAsset(id)!.geometry!,scale:stageReadableCharacterScale(id),...extra});
const cast=(four=false):LayoutActor[]=>[
 make('wide','left','rabbit-turtle.character.classic-turtle-water'),
 make('king','left','rabbit-turtle.character.dragonking-unified-720x900'),
 make('child','right','rabbit-turtle.character.turtle-child-unified-720x900'),
 ...(four?[make('adult','right','rabbit-turtle.character.turtle-unified-720x900')]:[]),
];
const render=(actors:readonly LayoutActor[])=>resolveStageLayout(1280,482.4,actors);
describe('shared automatic cast fit',()=>{
 it.each([false,true])('keeps intended relative sizes when a wide actor crowds just one side (four=%s)',four=>{
  const actors=cast(four),before=JSON.stringify(actors),result=render(actors);
  const factors=result.actors.map(actor=>actor.effectiveScale/actor.scale);
  expect(factors[0]).toBeLessThan(1);
  for(const factor of factors)expect(factor).toBeCloseTo(factors[0],8);
  for(const actor of result.actors){expect(actor.visibleLeft).toBeGreaterThanOrEqual(result.safeLeft-1e-8);expect(actor.visibleRight).toBeLessThanOrEqual(result.safeRight+1e-8);}
  const king=result.actors.find(a=>a.key==='king')!,child=result.actors.find(a=>a.key==='child')!;
  const ratio=(a:typeof child)=>a.height*(a.geometry.bottom-a.geometry.top);
  expect(ratio(child)).toBeLessThan(ratio(king));
  expect(JSON.stringify(actors)).toBe(before);
 });
 it('keeps authored relative multipliers under one common automatic fit',()=>{
  const actors=cast(true).map(actor=>actor.key==='child'?{...actor,scale:actor.scale*.8}:actor);
  const result=render(actors).actors;
  const factor=result[0].effectiveScale/actors[0].scale;
  for(const [index,actor] of result.entries())expect(actor.effectiveScale/actors[index].scale).toBeCloseTo(factor,8);
 });
 it('does not let source array interleaving change automatic dimensions or positions',()=>{
  const actors=cast(true),expected=render(actors).actors;
  const reordered=render([actors[2],actors[0],actors[3],actors[1]]).actors;
  for(const actor of expected)expect(reordered.find(item=>item.key===actor.key)).toEqual(actor);
 });
 it('keeps uncrowded single and two actor dimensions unchanged',()=>{
  const actors=[make('adult','left','heungbu.character.heungbu-default'),make('child','right','heungbu.character.child-02')];
  for(const group of [actors.slice(0,1),actors])for(const actor of render(group).actors)expect(actor.effectiveScale).toBe(actor.scale);
 });
 it('does not apply a global cast shrink when a manual or centered composition exists',()=>{
  for(const extra of [{xAnchor:75},{centered:true}]){
   const actors=cast().map(actor=>actor.key==='child'?{...actor,...extra}:actor);
   const result=render(actors).actors,child=result.find(actor=>actor.key==='child')!;
   expect(child.effectiveScale).toBe(actors[2].scale);
   if('xAnchor' in extra)expect(child.x+child.width/2).toBeCloseTo(1280*.75);
   else expect(child.x+child.width*(child.alphaLeft+child.alphaRight)/2).toBeCloseTo(640);
  }
 });
});
