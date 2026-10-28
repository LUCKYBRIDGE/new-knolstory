import {describe,it,expect} from 'vitest';
import {beginTimelinePinch,moveTimelinePinch} from './timeline-pinch';
const a={clientX:150,clientY:30},b={clientX:250,clientY:30};
describe('timeline pinch coordinates',()=>{
 it('keeps the content under the midpoint while zooming and panning',()=>{
  const start=beginTimelinePinch(a,b,100,200,100);
  expect(moveTimelinePinch(start,{clientX:125,clientY:30},{clientX:325,clientY:30},100,50)).toEqual({zoom:200,scrollLeft:475});
 });
 it('clamps zoom and scroll at both boundaries',()=>{
  const start=beginTimelinePinch(a,b,100,0,100);
  expect(moveTimelinePinch(start,{clientX:0,clientY:30},{clientX:1000,clientY:30},100,50).zoom).toBe(400);
  expect(moveTimelinePinch(start,{clientX:199,clientY:30},{clientX:201,clientY:30},100,50)).toEqual({zoom:50,scrollLeft:0});
  expect(moveTimelinePinch(start,{clientX:199,clientY:30},{clientX:201,clientY:30},100,10).zoom).toBe(10);
 });
 it('handles diagonal distance and coincident fingers without invalid values',()=>{
  const start=beginTimelinePinch(a,a,100,0,100);
  const next=moveTimelinePinch(start,{clientX:150,clientY:30},{clientX:153,clientY:34},100,10);
  expect(next.zoom).toBe(400);expect(Number.isFinite(next.scrollLeft)).toBe(true);
 });
});
