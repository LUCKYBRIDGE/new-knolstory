import {describe,it,expect} from 'vitest';
import {updateSceneVisibility,createSceneVisibilityUndo,undoSceneVisibility} from './scene-visibility-edit';
const scores={mode:'all' as const,terms:[{scoreId:'trust',operator:'gte' as const,value:2}]};
const choices={sourceLineId:'first',choiceId:'yes'};
describe('scene visibility editing',()=>{
 it('adds and removes individual conditions without losing the other',()=>{
  const before={scores};const next=updateSceneVisibility(before,{choices});
  expect(next).toEqual({scores,choices});expect(before).toEqual({scores});
  expect(updateSceneVisibility(next,{scores:undefined})).toEqual({choices});
  expect(updateSceneVisibility({choices},{choices:undefined})).toBeUndefined();
 });
 it('validates content and independently clones authored conditions',()=>{
  const next=updateSceneVisibility(undefined,{scores})!;next.scores!.terms[0].value=9;expect(scores.terms[0].value).toBe(2);
  expect(()=>updateSceneVisibility(undefined,{scores:{mode:'all',terms:[]}})).toThrow();
 });
 it('guards undo by work, cut and the entire condition snapshot',()=>{
  const next={scores,choices};const undo=createSceneVisibilityUndo('work','cut',undefined,next);
  expect(undoSceneVisibility('work','cut',next,undo)).toBeUndefined();
  expect(()=>undoSceneVisibility('other','cut',next,undo)).toThrow();
  expect(()=>undoSceneVisibility('work','other',next,undo)).toThrow();
  expect(()=>undoSceneVisibility('work','cut',{scores},undo)).toThrow();
  const restore=createSceneVisibilityUndo('work','cut',{scores},next);
  const result=undoSceneVisibility('work','cut',next,restore)!;result.scores!.terms[0].value=8;
  expect(restore.before!.scores!.terms[0].value).toBe(2);
 });
});
