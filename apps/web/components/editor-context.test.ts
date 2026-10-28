import {describe,it,expect} from 'vitest';
import {keyboardOccludesEditor,adjacentManuscriptCuts} from './editor-context';
describe('approved editor context',()=>{
 it('recognizes measured focused keyboard occlusion without device heights',()=>{
  expect(keyboardOccludesEditor({layoutHeight:844,visualHeight:510,offsetTop:0,focused:true,scale:1})).toBe(true);
  expect(keyboardOccludesEditor({layoutHeight:677,visualHeight:350,offsetTop:273.5,focused:true,scale:1})).toBe(true);
  expect(keyboardOccludesEditor({layoutHeight:844,visualHeight:810,offsetTop:0,focused:true,scale:1})).toBe(false);
  expect(keyboardOccludesEditor({layoutHeight:844,visualHeight:510,offsetTop:0,focused:false,scale:1})).toBe(false);
  expect(keyboardOccludesEditor({layoutHeight:844,visualHeight:510,offsetTop:0,focused:true,scale:2})).toBe(false);
 });
 it('keeps manuscript adjacency independent of branching targets',()=>{
  const cuts=[{id:'first'},{id:'second'},{id:'third'}];
  expect(adjacentManuscriptCuts(cuts,'second')).toEqual({previous:cuts[0],next:cuts[2]});
  expect(adjacentManuscriptCuts(cuts,'first').previous).toBeUndefined();
  expect(adjacentManuscriptCuts(cuts,'missing')).toEqual({});
 });
});
