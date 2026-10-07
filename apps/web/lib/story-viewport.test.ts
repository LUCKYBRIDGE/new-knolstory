import { describe, expect, it } from 'vitest';
import { previewViewport } from './story-viewport';
describe('story display viewport',()=>{
  it('uses actual container dimensions automatically including portrait and landscape',()=>{
    expect(previewViewport('auto',{width:390,height:650})).toEqual({width:390,height:650});
    expect(previewViewport('auto',{width:800,height:360})).toEqual({width:800,height:360});
  });
  it('representative framing is independent of editor container size',()=>{
    expect(previewViewport('portrait',{width:900,height:350})).toEqual({width:360,height:800});
    expect(previewViewport('landscape',{width:400,height:600})).toEqual({width:800,height:360});
    expect(previewViewport('desktop',{width:400,height:600})).toEqual({width:1280,height:720});
  });
});
