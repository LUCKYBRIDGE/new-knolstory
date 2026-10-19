import {describe,expect,it} from 'vitest';
import {patchActorAppearance,resetActorAppearance,opacityFromPercent} from './actor-appearance';
import type {StoryPresentation} from '@knolstory/story-domain';

describe('side-group appearance authoring',()=>{
 const source:StoryPresentation={effects:[{type:'shake'}],actors:{left:{xAnchor:37,scaleMultiplier:1.17,facing:'left',opacity:.6,emphasis:'dim',spectral:true},right:{opacity:.7}}};
 it('updates only one authored appearance and preserves placements and all unrelated values',()=>{
  expect(patchActorAppearance(source,'left',{opacity:.8})).toEqual({...source,actors:{...source.actors,left:{...source.actors?.left,opacity:.8}}});
  expect(source.actors?.left?.opacity).toBe(.6);
 });
 it('resets only appearance fields without resetting free placements or the other group',()=>{
  expect(resetActorAppearance(source,'left')).toEqual({...source,actors:{left:{xAnchor:37,scaleMultiplier:1.17,facing:'left'},right:{opacity:.7}}});
  expect(source.actors?.left?.spectral).toBe(true);
 });
 it('creates no unrelated defaults when authoring an initially absent group',()=>{
  expect(patchActorAppearance(undefined,'right',{spectral:true})).toEqual({actors:{right:{spectral:true}}});
  expect(resetActorAppearance(undefined,'left')).toEqual({});
 });
 it('accepts zero opacity and rejects empty, non-finite or out-of-range percentage inputs',()=>{
  expect(opacityFromPercent('0')).toBe(0);expect(opacityFromPercent('82.5')).toBe(.825);expect(opacityFromPercent('100')).toBe(1);
  for(const input of ['',' ','NaN','Infinity','-1','101'])expect(opacityFromPercent(input)).toBeNull();
 });
});

it('offers only occupied or authored actor groups without changing empty-stage settings',async()=>{
 const {appearanceTargets}=await import('./actor-appearance');
 const empty={leftActors:[],rightActors:[]},left={...empty,leftActors:[{key:'free-left',assetId:'character:test',xAnchor:37}]};
 expect(appearanceTargets(empty,undefined)).toEqual([]);expect(appearanceTargets(left,undefined)).toEqual(['left']);
 expect(appearanceTargets({...left,rightActors:[{key:'free-right',assetId:'character:other'}]},undefined)).toEqual(['left','right']);
 const authored={actors:{right:{opacity:0,spectral:false},left:{xAnchor:37}}};expect(appearanceTargets(empty,authored)).toEqual(['left','right']);expect(authored).toEqual({actors:{right:{opacity:0,spectral:false},left:{xAnchor:37}}});
 expect(appearanceTargets(empty,{actors:{left:{}}})).toEqual([]);expect(appearanceTargets(undefined,undefined)).toEqual(['left','right']);
});
