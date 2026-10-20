import { describe, expect, it } from 'vitest';
import { previewViewport,normalizePreviewProfile,storySceneLayout } from './story-viewport';
import {compileStoryScene,fitStage} from '@knolstory/runtime-core';
import {representativeStories} from '@knolstory/compatibility';
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
  it('always previews editing in 16:9 regardless of old settings and container shape',()=>{
    for(const profile of ['auto','desktop','portrait','landscape'] as const){
      for(const display of [{width:390,height:844},{width:844,height:390},{width:1024,height:768}]){
        expect(storySceneLayout('edit',profile,display)).toEqual({viewport:{width:1280,height:720},displaySize:{width:1280,height:720}});
      }
    }
  });
  it('fits both reading formats inside every available rectangle without changing scene composition',()=>{
    const work=representativeStories[0]!.project,cut=work.lines[0]!.id;
    const original=JSON.stringify(work);
    for(const profile of ['landscape','portrait'] as const){
      const baseline=compileStoryScene(work,cut,1,{mode:'play',...storySceneLayout('play',profile,{width:1280,height:720}),dialogueDock:{bottomInsetPx:0,safeBottomPx:0}});
      for(const display of [{width:390,height:844},{width:844,height:390},{width:1024,height:768},{width:1600,height:500},{width:250,height:900}]){
        const scene=compileStoryScene(work,cut,1,{mode:'play',...storySceneLayout('play',profile,display),dialogueDock:{bottomInsetPx:0,safeBottomPx:0}});
        expect(scene).toEqual(baseline);
        const fit=fitStage(display,scene);
        expect(fit.width).toBeLessThanOrEqual(display.width+1e-8);
        expect(fit.height).toBeLessThanOrEqual(display.height+1e-8);
        expect(fit.width/fit.height).toBeCloseTo(profile==='landscape'?16/9:9/16,10);
        expect(Math.min(fit.offsetX,fit.offsetY)).toBeCloseTo(0,8);
        expect(fit.offsetX*2+fit.width).toBeCloseTo(display.width,8);
        expect(fit.offsetY*2+fit.height).toBeCloseTo(display.height,8);
      }
    }
    expect(JSON.stringify(work)).toBe(original);
  });
  it('automatic reading chooses only landscape or portrait and never a third shape',()=>{
    for(const display of [{width:1024,height:768},{width:800,height:800},{width:390,height:844},{width:1600,height:500}]){
      const layout=storySceneLayout('play','auto',display);
      expect(layout.viewport).toEqual(display.width<display.height?{width:720,height:1280}:{width:1280,height:720});
      expect(layout.displaySize).toEqual(layout.viewport);
    }
  });
});
