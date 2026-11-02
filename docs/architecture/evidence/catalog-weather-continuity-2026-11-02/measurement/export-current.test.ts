import {it,expect} from 'vitest';
import {mkdirSync,writeFileSync} from 'node:fs';
import {compileStoryScene,createPlayback} from '../../../../../packages/runtime-core/src/story-runtime';
import {representativeStories,resolveProvidedCatalogStory} from '../../../../../packages/compatibility/src';
it('exports the current official weather-corrected project for the native authoring check',()=>{
 const project=resolveProvidedCatalogStory(representativeStories.find(e=>e.id==='seonnyeo')!.project);
 expect(project.lines.find(l=>l.id==='C1-B-v161-1')?.backgroundId).toBe('seonnyeo.background.BG02-valley-storm');
 mkdirSync('.cache',{recursive:true});writeFileSync('.cache/catalog-weather-current-project.json',JSON.stringify(project)+'\n');
 const scenes=Object.fromEntries([390,1280].map(width=>[width,Object.fromEntries(['C1-B-v161-1','14-v52-1','14-v52-2','14-v52-9','C4-v51-1','R1-v13-1','E3-5-v23-4'].map(id=>{
  const viewport=width===390?{width:720,height:1280}:{width:1280,height:720},state=createPlayback(project,id);
  return [id,compileStoryScene(project,id,1,{mode:'play',viewport,displaySize:viewport,dialogueDock:{bottomInsetPx:0,safeBottomPx:0},playbackState:state,playbackPath:state.path})];
 }))]));
 writeFileSync('.cache/catalog-weather-expected-scenes.json',JSON.stringify(scenes)+'\n');
});
