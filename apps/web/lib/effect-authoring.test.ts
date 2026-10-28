import {describe,expect,it} from 'vitest';
import {effectClickStep,alignEffectToGuide,alignEffectStart,arrangeEffectsSequentially,effectDurationMs,effectStartGuides,moveEffect,snapEffectStart,undoEffectEdit} from './effect-authoring';
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
  const effects:StoryEffectCue[]=[{type:'shake',durationMs:1200,intensity:'strong',periodMs:2000},{type:'flash',target:{kind:'background'},scope:'following'},{type:'crack',id:'authored'}];
  expect(arrangeEffectsSequentially(effects)).toEqual(effects.map((effect,index)=>({...effect,trigger:'scene-enter',delayMs:[0,1200,2000][index]})));
  expect(effects[0].delayMs).toBeUndefined();
 });
 it('rejects a looping predecessor but permits a final loop',()=>{
  expect(arrangeEffectsSequentially([{type:'shake',repeat:'loop'},{type:'flash'}])).toBeNull();
  expect(arrangeEffectsSequentially([{type:'shake'},{type:'flash',repeat:'loop'}])?.[1].delayMs).toBe(600);
 });
 it('rejects an arrangement exceeding the document start-time range instead of truncating it',()=>{
  expect(arrangeEffectsSequentially([{type:'shake',durationMs:10000},{type:'flash',durationMs:10000},{type:'crack'}])).toBeNull();
 });
});


describe('effect start alignment',()=>{
 it('aligns to the previous clock and timing while retaining authored metadata immutably',()=>{
  const effects:StoryEffectCue[]=[{type:'shake',trigger:'with-dialogue',delayMs:350,durationMs:900},{id:'mine',type:'flash',trigger:'scene-enter',delayMs:80,scope:'following',endLineId:'end',branchCondition:{sourceLineId:'source',choiceId:'choice'},target:{kind:'background'}}];
  const before=JSON.stringify(effects);
  expect(alignEffectStart(effects,1,'with-previous')).toEqual([effects[0],{...effects[1],trigger:'with-dialogue',delayMs:350}]);
  expect(alignEffectStart(effects,1,'after-previous')?.[1]).toEqual({...effects[1],trigger:'with-dialogue',delayMs:1250});
  expect(JSON.stringify(effects)).toBe(before);
 });
 it('normalizes delayed scene entry and uses native implicit delays and durations',()=>{
  const effects:StoryEffectCue[]=[{type:'shake',trigger:'after-delay'},{type:'flash'}];
  expect(alignEffectStart(effects,1,'with-previous')?.[1]).toEqual({type:'flash',trigger:'scene-enter',delayMs:1000});
  expect(alignEffectStart(effects,1,'after-previous')?.[1].delayMs).toBe(1600);
  expect(alignEffectStart([{type:'flash'},{type:'shake'}],1,'with-previous')?.[1].delayMs).toBe(0);
 });
 it('rejects absent predecessors, loops without an end, invalid indices, and starts outside 10 seconds',()=>{
  const effects:StoryEffectCue[]=[{type:'shake',repeat:'loop'},{type:'flash'}];
  expect(alignEffectStart(effects,1,'after-previous')).toBeNull();
  expect(alignEffectStart(effects,1,'with-previous')).not.toBeNull();
  for(const index of [-1,0,2,.5,NaN])expect(alignEffectStart(effects,index,'with-previous')).toBeNull();
  expect(alignEffectStart([{type:'shake',delayMs:10000},{type:'flash'}],1,'after-previous')).toBeNull();
  expect(alignEffectStart([{type:'shake',delayMs:10000,durationMs:0},{type:'flash'}],1,'after-previous')?.[1].delayMs).toBe(10000);
 });
});

describe('effect timing guides',()=>{
 it('exports sorted, unique in-range guides and ignores invalid indices',()=>{
  const effects:StoryEffectCue[]=[{type:'shake',delayMs:1000,durationMs:200},{type:'flash'},{type:'crack',delayMs:1000,durationMs:10000}];
  expect(effectStartGuides(effects,1)).toEqual([0,1000,1200]);
  expect(effectStartGuides(effects,-1)).toEqual([]);
  expect(effectStartGuides(effects,.5)).toEqual([]);
 });
 it('snaps to zero, starts, or finite ends on the same clock',()=>{
  const effects:StoryEffectCue[]=[{type:'shake',delayMs:1000,durationMs:600},{type:'flash',delayMs:4000},{type:'crack',trigger:'with-dialogue',delayMs:2500}];
  expect(snapEffectStart(effects,1,90)).toEqual({delayMs:0,guideMs:0});
  expect(snapEffectStart(effects,1,1080)).toEqual({delayMs:1000,guideMs:1000});
  expect(snapEffectStart(effects,1,1580)).toEqual({delayMs:1600,guideMs:1600});
  expect(snapEffectStart(effects,1,2520)).toEqual({delayMs:2520});
  expect(snapEffectStart(effects,1,3000)).toEqual({delayMs:3000});
  expect(snapEffectStart(effects,1,1220,250)).toEqual({delayMs:1000,guideMs:1000});
 });
 it('normalizes after-delay clocks, excludes own marks and loop ends, and resolves ties consistently',()=>{
  const effects:StoryEffectCue[]=[{type:'shake',trigger:'after-delay',repeat:'loop'},{type:'flash'},{type:'crack',delayMs:1200,durationMs:10000}];
  expect(snapEffectStart(effects,1,980)).toEqual({delayMs:1000,guideMs:1000});
  expect(snapEffectStart(effects,1,1600)).toEqual({delayMs:1600});
  expect(snapEffectStart(effects,1,1100)).toEqual({delayMs:1000,guideMs:1000});
  expect(snapEffectStart([{type:'shake',delayMs:500}],0,500)).toEqual({delayMs:500});
 });
 it('rejects nonfinite, negative, out-of-range input and invalid indices without modifying cues',()=>{
  const effects:StoryEffectCue[]=[{type:'flash'}];
  for(const requested of [NaN,Infinity,-1,10001])expect(snapEffectStart(effects,0,requested)).toBeNull();
  for(const tolerance of [NaN,Infinity,-1])expect(snapEffectStart(effects,0,100,tolerance)).toBeNull();
  for(const index of [-1,1,.5,NaN])expect(snapEffectStart(effects,index,100)).toBeNull();
  expect(effects).toEqual([{type:'flash'}]);
 });
});


describe('movable effect timing guide',()=>{
 it('aligns either edge immutably while preserving the selected clock and authored metadata',()=>{
  const effects:StoryEffectCue[]=[{type:'shake'}, {id:'mine',type:'flash',trigger:'with-dialogue',delayMs:400,durationMs:800,scope:'following',endLineId:'end',branchCondition:{sourceLineId:'source',choiceId:'choice'},target:{kind:'background'}}];
  const before=JSON.stringify(effects);
  const aligned=alignEffectToGuide(effects,1,2000,'start');
  expect(aligned).toEqual([effects[0],{...effects[1],delayMs:2000}]);
  expect(aligned?.[0]).toBe(effects[0]);
  expect(aligned?.[1]).not.toBe(effects[1]);
  expect(alignEffectToGuide(effects,1,2000,'end')?.[1]).toEqual({...effects[1],delayMs:1200});
  expect(JSON.stringify(effects)).toBe(before);
 });
 it('uses native implicit durations without changing an after-delay trigger',()=>{
  expect(alignEffectToGuide([{type:'shake',trigger:'after-delay'}],0,1600,'end')).toEqual([{type:'shake',trigger:'after-delay',delayMs:1000}]);
  expect(alignEffectToGuide([{type:'flash'}],0,800,'end')).toEqual([{type:'flash',delayMs:0}]);
  expect(alignEffectToGuide([{type:'flash',durationMs:0}],0,0,'end')?.[0].delayMs).toBe(0);
  expect(alignEffectToGuide([{type:'flash',durationMs:0}],0,10000,'end')?.[0].delayMs).toBe(10000);
  expect(alignEffectToGuide([{type:'flash'}],0,10000,'start')?.[0].delayMs).toBe(10000);
 });
 it('rejects invalid marks, impossible ends and loop ends but allows loop starts',()=>{
  const effects:StoryEffectCue[]=[{type:'flash',repeat:'loop'}];
  for(const mark of [NaN,Infinity,-1,10001])expect(alignEffectToGuide(effects,0,mark,'start')).toBeNull();
  for(const index of [-1,1,.5,NaN])expect(alignEffectToGuide(effects,index,800,'start')).toBeNull();
  expect(alignEffectToGuide(effects,0,800,'end')).toBeNull();
  expect(alignEffectToGuide(effects,0,800,'start')?.[0].delayMs).toBe(800);
  expect(alignEffectToGuide([{type:'flash'}],0,799,'end')).toBeNull();
  expect(alignEffectToGuide([{type:'flash',durationMs:NaN}],0,800,'end')).toBeNull();
 });
 it('snaps to valid custom marks with sorted tie-breaking and ignores invalid custom marks',()=>{
  const effects:StoryEffectCue[]=[{type:'flash'}];
  const custom=[1700,1500,1500,-1,10001,NaN,Infinity];
  expect(snapEffectStart(effects,0,1590,120,custom)).toEqual({delayMs:1500,guideMs:1500});
  expect(snapEffectStart(effects,0,1600,120,custom)).toEqual({delayMs:1500,guideMs:1500});
  expect(snapEffectStart(effects,0,1650,120,custom)).toEqual({delayMs:1700,guideMs:1700});
  expect(snapEffectStart(effects,0,1700,0,custom)).toEqual({delayMs:1700,guideMs:1700});
  expect(snapEffectStart(effects,0,1800,0,custom)).toEqual({delayMs:1800});
  expect(custom[0]).toBe(1700);
 });
});


describe('click-stage effect placement',()=>{
 it('uses click-only ordinal defaults, explicit shared stages and separate timing clocks',()=>{
  const effects:StoryEffectCue[]=[{type:'shake',delayMs:100},{type:'flash',trigger:'on-click',delayMs:1000,durationMs:200},{type:'shake',trigger:'with-dialogue',delayMs:200},{type:'flash',trigger:'on-click',clickStep:1,delayMs:1400,durationMs:100},{type:'flash',trigger:'on-click',delayMs:3000}];
  expect(effectClickStep(effects,0)).toBeUndefined();
  expect(effectClickStep(effects,1)).toBe(1);
  expect(effectClickStep(effects,3)).toBe(1);
  expect(effectClickStep(effects,4)).toBe(3);
  expect(effectClickStep(effects,-1)).toBeUndefined();
  expect(effectClickStep(effects,.5)).toBeUndefined();
  expect(effectStartGuides(effects,1)).toEqual([0,1400,1500]);
  expect(effectStartGuides(effects,4)).toEqual([0]);
  expect(effectStartGuides(effects,2)).toEqual([0]);
  expect(snapEffectStart(effects,1,1100)).toEqual({delayMs:1100});
  expect(snapEffectStart(effects,1,1430)).toEqual({delayMs:1400,guideMs:1400});
 });
 it('aligns with or after previous click effect on its effective stage without changing other metadata',()=>{
  const effects:StoryEffectCue[]=[{type:'shake'},{type:'flash',trigger:'on-click',delayMs:500,durationMs:400},{id:'last',type:'shake',trigger:'on-click',clickStep:3,target:{kind:'background'},branchCondition:{sourceLineId:'source',choiceId:'choice'}}];
  const before=JSON.stringify(effects);
  expect(alignEffectStart(effects,2,'with-previous')?.[2]).toEqual({...effects[2],clickStep:1,delayMs:500});
  expect(alignEffectStart(effects,2,'after-previous')?.[2]).toEqual({...effects[2],clickStep:1,delayMs:900});
  expect(alignEffectStart([{type:'flash',trigger:'on-click',clickStep:2},{type:'shake'}],1,'with-previous')?.[1]).toEqual({type:'shake',trigger:'on-click',clickStep:2,delayMs:0});
  expect(JSON.stringify(effects)).toBe(before);
 });
 it('removes click stage when aligning to non-click effects or explicitly arranging scene starts',()=>{
  const effects:StoryEffectCue[]=[{type:'flash',trigger:'with-dialogue',durationMs:0},{id:'last',type:'shake',trigger:'on-click',clickStep:3}];
  expect(alignEffectStart(effects,1,'with-previous')?.[1]).toEqual({id:'last',type:'shake',trigger:'with-dialogue',delayMs:0});
  expect(arrangeEffectsSequentially(effects)).toEqual([{type:'flash',trigger:'scene-enter',durationMs:0,delayMs:0},{id:'last',type:'shake',trigger:'scene-enter',delayMs:0}]);
  expect(effects[1].clickStep).toBe(3);
 });
 it('preserves click stage during movable guide alignment',()=>{
  expect(alignEffectToGuide([{type:'flash',trigger:'on-click',clickStep:2,durationMs:200}],0,1000,'end')).toEqual([{type:'flash',trigger:'on-click',clickStep:2,durationMs:200,delayMs:800}]);
 });
});
