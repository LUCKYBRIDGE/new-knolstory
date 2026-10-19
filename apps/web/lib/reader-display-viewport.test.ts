import {describe,expect,it} from 'vitest';
import {isReaderDisplaySize,readerDisplayViewport} from './reader-display-viewport';

describe('reader available display viewport',()=>{
 it('accepts actual positive finite displays without scene aspect limits or rounding',()=>{
  expect(isReaderDisplaySize({width:3200.75,height:180.25})).toBe(true);
  expect(isReaderDisplaySize({width:180.25,height:3200.75})).toBe(true);
  expect(isReaderDisplaySize({width:0.25,height:0.5})).toBe(true);
 });
 it.each([null,undefined,1,'100',{}, {width:0,height:200},{width:200,height:-1},
  {width:Infinity,height:200},{width:200,height:NaN},{width:'200',height:100}])('rejects invalid display dimensions %j',value=>{
  expect(isReaderDisplaySize(value)).toBe(false);
 });
 it('uses the visual viewport visible size and layout-coordinate offsets unchanged',()=>{
  expect(readerDisplayViewport({width:1280,height:720},{width:390.5,height:310.25,offsetLeft:12.5,offsetTop:43.75}))
   .toEqual({left:12.5,top:43.75,width:390.5,height:310.25});
 });
 it('uses the layout viewport when visual viewport is absent',()=>{
  expect(readerDisplayViewport({width:1920.5,height:1080.25})).toEqual({left:0,top:0,width:1920.5,height:1080.25});
  expect(readerDisplayViewport({width:390,height:844},null)).toEqual({left:0,top:0,width:390,height:844});
 });
 it.each([
  {width:0,height:300,offsetLeft:0,offsetTop:0},
  {width:300,height:NaN,offsetLeft:0,offsetTop:0},
  {width:300,height:200,offsetLeft:Infinity,offsetTop:0},
  {width:300,height:200,offsetLeft:0,offsetTop:NaN},
 ])('falls back while visual viewport geometry is transiently invalid %j',visual=>{
  expect(readerDisplayViewport({width:800,height:600},visual)).toEqual({left:0,top:0,width:800,height:600});
 });
 it('can use a valid visual viewport even when layout dimensions are unavailable',()=>{
  expect(readerDisplayViewport({width:0,height:0},{width:300,height:200,offsetLeft:0,offsetTop:0}))
   .toEqual({left:0,top:0,width:300,height:200});
 });
 it('returns no override if neither viewport has valid dimensions',()=>{
  expect(readerDisplayViewport({width:0,height:0})).toBeUndefined();
 });
});
