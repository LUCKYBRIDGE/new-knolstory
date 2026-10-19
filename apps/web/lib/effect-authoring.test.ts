import {describe,expect,it} from 'vitest';
import {arrangeEffectsSequentially,effectDurationMs,moveEffect,undoEffectEdit} from './effect-authoring';
import type {StoryEffectCue} from '@knolstory/story-domain';

describe('non-audio effect authoring',()=>{
 it('undo restores originally absent or explicitly empty presentation and preserves subsequent unrelated edits',()=>{
  expect(undoEffectEdit({effects:[{type:'shake'}]},undefined)).toBeUndefined();
  expect(undoEffectEdit({effects:[{type:'shake'}]},{})).toEqual({});
  expect(undoEffectEdit({effects:[{type:'shake'}],look:{type:'flashback'}},undefined)).toEqual({look:{type:'flashback'}});
  expect(undoEffectEdit({clearFollowingEffects:true,effects:[{type:'flash'}],actors:{left:{opacity:.5}}},{clearFollowingEffects:false,effects:[{type:'shake'}]})).toEqual({clearFollowingEffects:false,effects:[{type:'shake'}],actors:{left:{opacity:.5}}});
 });
 it('uses existing native durations when an authored duration is absent',()=>{
  expect(effectDurationMs({type:'shake'})).toBe(600);
  expect(effectDurationMs({type:'crack'})).toBe(1800);
  expect(effectDurationMs({type:'screen-crack'})).toBe(1800);
  expect(effectDurationMs({type:'flash'})).toBe(800);
  expect(effectDurationMs({type:'flash',durationMs:1200})).toBe(1200);
  expect(effectDurationMs({type:'flash',durationMs:0})).toBe(0);
 });
 it('moves a cue without changing its timings, targets or source array',()=>{
  const effects:StoryEffectCue[]=[{type:'shake',target:{kind:'actor',actorKey:'free-position'},delayMs:800},{type:'flash',scope:'following',repeat:'loop'}];
  const reordered=moveEffect(effects,1,-1);
  expect(reordered).toEqual([effects[1],effects[0]]);
  expect(reordered[1]).toBe(effects[0]);
  expect(effects[0].type).toBe('shake');
  expect(moveEffect(effects,0,-1)).toEqual(effects);
  expect(moveEffect(effects,2,-1)).toEqual(effects);
 });
 it('only explicit sequential arrangement changes starts, preserving all other cue metadata',()=>{
  const effects:StoryEffectCue[]=[{type:'shake',durationMs:1200,intensity:'strong',repeat:'loop',periodMs:2000},{type:'flash',target:{kind:'background'},scope:'following'},{type:'crack',id:'authored'}];
  expect(arrangeEffectsSequentially(effects)).toEqual(effects.map((effect,index)=>({...effect,trigger:'scene-enter',delayMs:[0,1200,2000][index]})));
  expect(effects[0].delayMs).toBeUndefined();
 });
 it('rejects an arrangement exceeding the document start-time range instead of truncating it',()=>{
  expect(arrangeEffectsSequentially([{type:'shake',durationMs:10000},{type:'flash',durationMs:10000},{type:'crack'}])).toBeNull();
 });
});
