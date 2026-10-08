import {describe,it,expect} from 'vitest';
import {dialogTabDestination} from './dialog-keyboard';
describe('modal keyboard focus boundaries',()=>{
 it('wraps forward and backward while leaving interior navigation to the browser',()=>{
  expect(dialogTabDestination(3,4,false)).toBe(0);
  expect(dialogTabDestination(0,4,true)).toBe(3);
  expect(dialogTabDestination(1,4,false)).toBeUndefined();
  expect(dialogTabDestination(2,4,true)).toBeUndefined();
 });
 it('handles a single control, lost focus and a temporarily empty modal',()=>{
  expect(dialogTabDestination(0,1,false)).toBe(0);
  expect(dialogTabDestination(-1,4,false)).toBe(0);
  expect(dialogTabDestination(-1,4,true)).toBe(3);
  expect(dialogTabDestination(-1,0,false)).toBeUndefined();
 });
});
