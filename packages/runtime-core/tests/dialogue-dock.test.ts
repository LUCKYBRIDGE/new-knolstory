import {describe,expect,it} from 'vitest';
import {compileStoryScene,createBlankStoryProject,patchStoryLine,resolveStoryViewport} from '../src/index';

describe('view-only dialogue dock',()=>{
 it.each([{width:390,height:844},{width:844,height:390},{width:1280,height:720}])('keeps tools inside the bottom overlay in $width by $height',size=>{
  const compact=resolveStoryViewport(size,size,{bottomInsetPx:0,safeBottomPx:0});
  const withTools=resolveStoryViewport(size,size,{bottomInsetPx:62,safeBottomPx:8});
  for(const view of [compact,withTools]){
   expect(view.textboxRect.x).toBe(0);
   expect(view.textboxRect.width).toBe(view.width);
   expect(view.textboxRect.y+view.textboxRect.height).toBe(view.height);
  }
  expect(withTools.textboxRect.height).toBeGreaterThanOrEqual(compact.textboxRect.height);
  expect(withTools.actorBaseHeight).toBe(compact.actorBaseHeight);
  expect(withTools.actorBaseline).toBe(compact.actorBaseline);
 });
 it('reserves a compact full-width panel for native measured dialogue and controls',()=>{
  for(const size of [{width:390,height:844},{width:844,height:390},{width:1280,height:720}]){
   const view=resolveStoryViewport(size,size,{bottomInsetPx:0,safeBottomPx:0});
   expect(view.dialogueStyle.fontSize).toBe(32);
   expect(view.textboxRect.height).toBeGreaterThan(view.dialogueStyle.fontSize);
   expect(view.textboxRect.height).toBeLessThan(view.height);
  }
 });
 it('never changes authored placement, crop or content when tools expand',()=>{
  const project=patchStoryLine(createBlankStoryProject({id:'dock',chapterId:'c',lineId:'l'}),'l',{
   text:'보존할 대사',backgroundId:'rabbit-turtle.background.rabbit-turtle-bg-grassland',
   presentation:{backgroundFit:'contain',backgroundFocal:{x:.8,y:.3}},
   stageComposition:{leftActors:[{key:'a',assetId:'onggojib.character.classic-master',xAnchor:38,scaleMultiplier:.8}],rightActors:[]},
  });
  const before=JSON.stringify(project),options={mode:'play' as const,viewport:{width:1280,height:720}};
  const folded=compileStoryScene(project,'l',1,{...options,dialogueDock:{bottomInsetPx:0}});
  const expanded=compileStoryScene(project,'l',1,{...options,dialogueDock:{bottomInsetPx:40}});
  expect(expanded.actors).toEqual(folded.actors);expect(expanded.background).toEqual(folded.background);
  expect(expanded.dialogue).toEqual(folded.dialogue);expect(JSON.stringify(project)).toBe(before);
 });
 it('preserves complete actor and background geometry when a fixed stage is letterboxed',()=>{
  const project=patchStoryLine(createBlankStoryProject({id:'fixed',chapterId:'c',lineId:'l'}),'l',{
   text:'첫 문장입니다.\n다음 문장도 보존합니다.',backgroundId:'rabbit-turtle.background.rabbit-turtle-bg-grassland',
   stageComposition:{leftActors:[{key:'a',assetId:'onggojib.character.classic-master',xAnchor:38,scaleMultiplier:.8}],rightActors:[]},
  });
  const before=JSON.stringify(project);
  const options={mode:'play' as const,dialogueDock:{bottomInsetPx:0,safeBottomPx:0}};
  const scenes=[{width:1280,height:720},{width:1440,height:900},{width:844,height:390}]
   .map(viewport=>compileStoryScene(project,'l',1,{...options,viewport}));
  for(const scene of scenes){
   expect([scene.width,scene.height]).toEqual([1280,720]);
   expect(scene.actors).toEqual(scenes[0].actors);
   expect(scene.background).toEqual(scenes[0].background);
   expect(scene.dialogue).toEqual(scenes[0].dialogue);
  }
  expect(JSON.stringify(project)).toBe(before);
 });
 it('rejects invalid view reserves without silently altering geometry',()=>{
  for(const bottomInsetPx of [-1,NaN,Infinity,900])expect(()=>resolveStoryViewport({width:390,height:844},undefined,{bottomInsetPx})).toThrow(RangeError);
 });
});

it('maps retired classic input to the same landscape canvas without reframing content',()=>{
 const project=patchStoryLine(createBlankStoryProject({id:'classic',chapterId:'c',lineId:'l'}),'l',{
  text:'같은 대사입니다.',backgroundId:'rabbit-turtle.background.rabbit-turtle-bg-grassland',
  presentation:{backgroundFocal:{x:.8,y:.3}},
  stageComposition:{leftActors:[{key:'a',assetId:'onggojib.character.classic-master',xAnchor:38,scaleMultiplier:.8}],rightActors:[]},
 });
 const before=JSON.stringify(project);
 const options={mode:'play' as const,dialogueDock:{bottomInsetPx:0,safeBottomPx:0}};
 const wide=compileStoryScene(project,'l',1,{...options,viewport:{width:1280,height:720}});
 const classic=compileStoryScene(project,'l',2,{...options,viewport:{width:1280,height:960}});
 expect([classic.width,classic.height]).toEqual([1280,720]);
 expect(classic).not.toHaveProperty('artworkRect');
 expect(wide).not.toHaveProperty('artworkRect');
 expect(classic.actors).toEqual(wide.actors);
 expect(classic.background).toEqual(wide.background);
 expect(classic.dialogue).toEqual(wide.dialogue);
 expect(classic.textboxRect!.y).toBe(wide.textboxRect!.y);
 expect(classic.textboxRect!.height).toBe(wide.textboxRect!.height);
 expect(JSON.stringify(project)).toBe(before);
});
