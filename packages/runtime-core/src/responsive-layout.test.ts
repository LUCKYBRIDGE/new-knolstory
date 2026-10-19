import {expect,it} from 'vitest';
import {isSupportedStoryViewportSize,resolveBackgroundRect,resolveStoryViewport} from './responsive-layout';

it('filters collapsed resize samples while retaining supported display shapes',()=>{
 for(const size of [{width:900,height:1},{width:1,height:900},{width:0,height:800},{width:NaN,height:800}])expect(isSupportedStoryViewportSize(size)).toBe(false);
 for(const size of [{width:390,height:844},{width:844,height:390},{width:1280,height:720},{width:1440,height:900},{width:768,height:1024}])expect(isSupportedStoryViewportSize(size)).toBe(true);
 expect(()=>resolveStoryViewport({width:900,height:1})).toThrow(/outside/);
});

it('resolves fixed stage sizes and contains them in wider or taller displays',()=>{
 for(const [display,expected] of [
  [{width:1440,height:900},{width:1280,height:720,scale:1.125,unusedX:0,unusedY:90}],
  [{width:844,height:390},{width:1280,height:720,scale:390/720,unusedX:844-1280*390/720,unusedY:0}],
  [{width:390,height:844},{width:720,height:1280,scale:390/720,unusedX:0,unusedY:844-1280*390/720}],
  [{width:768,height:1024},{width:720,height:1280,scale:.8,unusedX:192,unusedY:0}],
 ] as const){
  const stage=resolveStoryViewport(display);
  expect({width:stage.width,height:stage.height}).toEqual({width:expected.width,height:expected.height});
  const scale=Math.min(display.width/stage.width,display.height/stage.height);
  expect(scale).toBeCloseTo(expected.scale);
  expect(display.width-stage.width*scale).toBeCloseTo(expected.unusedX);
  expect(display.height-stage.height*scale).toBeCloseTo(expected.unusedY);
 }
});

it('overlays a full-width bottom panel without changing actors or full-stage background framing',()=>{
 for(const display of [{width:844,height:390},{width:1280,height:720},{width:390,height:844}]){
  const docked=resolveStoryViewport(display,display,{bottomInsetPx:28,safeBottomPx:8});
  const plain=resolveStoryViewport(display);
  expect(docked.textboxRect.x).toBe(0);
  expect(docked.textboxRect.width).toBe(docked.width);
  expect(docked.textboxRect.y+docked.textboxRect.height).toBe(docked.height);
  expect(docked.actorBaseHeight).toBe(plain.actorBaseHeight);
  expect(docked.actorBaseline).toBe(plain.actorBaseline);
  expect(resolveBackgroundRect({width:1920,height:1080},docked,'cover')).toEqual(resolveBackgroundRect({width:1920,height:1080},plain,'cover'));
  const noReserve=resolveStoryViewport(display,display,{bottomInsetPx:0,safeBottomPx:0});
  expect(noReserve.textboxRect.y+noReserve.textboxRect.height).toBe(docked.height);
  expect(noReserve.actorBaseHeight).toBe(docked.actorBaseHeight);
  expect(noReserve.actorBaseline).toBe(docked.actorBaseline);
 }
});

it('preserves logical text size and validates dock input',()=>{
 const wide=resolveStoryViewport({width:844,height:390},{width:844,height:390},{bottomInsetPx:28,safeBottomPx:8});
 expect(wide.dialogueStyle.fontSize).toBe(32);
 for(const dock of [{bottomInsetPx:-1},{bottomInsetPx:Infinity},{bottomInsetPx:0,safeBottomPx:-1},{bottomInsetPx:500}])
  expect(()=>resolveStoryViewport({width:844,height:390},undefined,dock)).toThrow(/dock/);
});

it('keeps pagination reference size stable across display size and orientation',()=>{
 for(const display of [{width:1280,height:720},{width:844,height:390},{width:390,height:844},{width:320,height:568},{width:1920,height:1080}]){
  expect(resolveStoryViewport(display).dialogueStyle.paginationFontSize).toBe(32);
  expect(resolveStoryViewport(display,display,{bottomInsetPx:0,safeBottomPx:0}).dialogueStyle.paginationFontSize).toBe(32);
 }
});

it('maps former classic landscape requests to 16:9 without a bottom extension',()=>{
 for(const size of [{width:1280,height:960},{width:1024,height:768},{width:1000,height:700}]){
  const classic=resolveStoryViewport(size,size,{bottomInsetPx:0,safeBottomPx:0});
  expect([classic.width,classic.height]).toEqual([1280,720]);
  expect(classic).not.toHaveProperty('artworkRect');
 }
 for(const size of [{width:1440,height:900},{width:1550,height:1000},{width:720,height:1280}])
  expect(resolveStoryViewport(size)).not.toHaveProperty('artworkRect');
 const normal=resolveStoryViewport({width:1280,height:720},{width:1280,height:720},{bottomInsetPx:0,safeBottomPx:0});
 const small=resolveStoryViewport({width:1280,height:720},{width:568,height:320},{bottomInsetPx:0,safeBottomPx:0});
 expect(small.dialogueStyle.fontSize).toBe(normal.dialogueStyle.fontSize);
 expect(small.dialogueStyle.paginationFontSize).toBe(normal.dialogueStyle.paginationFontSize);
 expect(small.textboxRect.height).toBeGreaterThan(normal.textboxRect.height);
 expect(small.actorBaseHeight).toBe(normal.actorBaseHeight);
 expect(small.actorBaseline).toBe(normal.actorBaseline);
});

it('reserves at least 44 display pixels for tools without enlarging text or actors',()=>{
 for(const display of [{width:1280,height:720},{width:568,height:320},{width:390,height:844},{width:100,height:100}]){
  const view=resolveStoryViewport({width:1280,height:720},display,{bottomInsetPx:0,safeBottomPx:0});
  const scale=Math.min(display.width/view.width,display.height/view.height);
  expect(view.dialogueStyle.toolsHeight).toBeGreaterThanOrEqual(44);
  expect(view.dialogueStyle.toolsHeight).toBeLessThanOrEqual(512);
  if(44/scale<=512)expect(view.dialogueStyle.toolsHeight*scale).toBeGreaterThanOrEqual(44);
  expect(view.dialogueStyle.fontSize).toBe(32);
  expect(view.dialogueStyle.paginationFontSize).toBe(32);
  expect(view.actorBaseline).toBe(558);
 }
});

it('provides compact visual-novel panel estimates and separate orientation padding',()=>{
 const wide=resolveStoryViewport({width:1280,height:720},undefined,{bottomInsetPx:0,safeBottomPx:0});
 const tall=resolveStoryViewport({width:768,height:1024},undefined,{bottomInsetPx:0,safeBottomPx:0});
 expect(wide.dialogueStyle).toMatchObject({fontSize:32,paginationFontSize:32,speakerFontSize:24,padding:48});
 expect(tall.dialogueStyle).toMatchObject({fontSize:32,paginationFontSize:32,speakerFontSize:24,padding:28});
 expect(tall.height).toBe(1280);
 expect(wide.textboxRect.height).toBeLessThan(300);
 expect(tall.textboxRect.height).toBeLessThan(300);
});
