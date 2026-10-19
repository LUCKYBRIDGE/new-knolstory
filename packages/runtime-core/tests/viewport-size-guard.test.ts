import {describe,it,expect} from 'vitest';
import {isSupportedStoryViewportSize,resolveStoryViewport} from '../src/index';
describe('supported story viewport samples',()=>{
 it('filters collapsed transient samples without accepting nonfinite dimensions',()=>{
  for(const size of [{width:900,height:1},{width:1,height:900},{width:0,height:720},{width:1280,height:0},{width:Infinity,height:720},{width:900,height:NaN},{width:-900,height:720}]){
   expect(isSupportedStoryViewportSize(size)).toBe(false);
   expect(()=>resolveStoryViewport(size)).toThrow(RangeError);
  }
 });
 it('accepts actual phone/tablet/desktop samples and exact rounded logical limits',()=>{
  for(const size of [{width:390,height:844},{width:1024,height:768},{width:1280,height:720},{width:1280,height:240},{width:720,height:2400}]){
   expect(isSupportedStoryViewportSize(size)).toBe(true);
   expect(()=>resolveStoryViewport(size)).not.toThrow();
  }
  expect(isSupportedStoryViewportSize({width:1280,height:239.5})).toBe(true);
  expect(isSupportedStoryViewportSize({width:1280,height:239.4})).toBe(false);
  expect(isSupportedStoryViewportSize({width:720,height:2400.4})).toBe(true);
  expect(isSupportedStoryViewportSize({width:720,height:2400.5})).toBe(false);
 });
});
