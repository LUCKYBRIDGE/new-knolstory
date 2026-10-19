import { describe, expect, it } from 'vitest';
import { previewViewport,normalizePreviewProfile } from './story-viewport';
describe('story display viewport',()=>{
  it('selects only fixed portrait and landscape story formats',()=>{
    expect(previewViewport('auto',{width:390,height:650})).toEqual({width:720,height:1280});
    expect(previewViewport('auto',{width:800,height:360})).toEqual({width:1280,height:720});
  });
  it('retires classic without preserving a third story format',()=>{
    expect(normalizePreviewProfile('classic')).toBe('landscape');
    expect(previewViewport(normalizePreviewProfile('classic'),{width:1280,height:960})).toEqual({width:1280,height:720});
    expect(previewViewport('auto',{width:1024,height:768})).toEqual({width:1280,height:720});
    expect(normalizePreviewProfile('unknown')).toBe('auto');
  });
  it('representative framing is independent of editor container size',()=>{
    expect(previewViewport('portrait',{width:900,height:350})).toEqual({width:720,height:1280});
    expect(previewViewport('landscape',{width:400,height:600})).toEqual({width:1280,height:720});
    expect(previewViewport('desktop',{width:400,height:600})).toEqual({width:1280,height:720});
  });
});
