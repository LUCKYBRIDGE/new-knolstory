import {compileStoryScene} from '../../runtime-core/src/story-runtime';
import {connectCatalogLayeredScenes} from '../src/catalog-layered-scenes';
import {it,expect} from 'vitest';
import {ASSET_CATALOG,resolveAsset} from '../../asset-registry/src';
import {isStageComposition,resolveStageComposition,stageActors} from '@knolstory/story-domain';
import {representativeStories,classicStories,resolveProvidedCatalogStory} from '../src';
it('uses character-free effective backgrounds throughout all eight catalog manuscripts',()=>{
 for(const entry of [...representativeStories,...classicStories]){const p=resolveProvidedCatalogStory(entry.project);for(const line of p.lines){const chapter=p.chapters.find(c=>c.id===line.chapterId),id=line.backgroundMode==='none'?'':line.backgroundId||chapter?.backgroundId||p.stageDefaults?.backgroundId;if(id)expect(resolveAsset(id)?.metadata.containsCharacters,`${entry.id}/${line.id}/${id}`).not.toBe(true);}}
});
it('restores actors on former illustration cuts and preserves the story, choices, audio and effects',()=>{
 const p=resolveProvidedCatalogStory(representativeStories.find(s=>s.id==='onggojib')!.project),id='review-main-003:fake-route-cruelty-labor-first__work-promised__wage-wet-wood__shoe-poverty:11',line=p.lines.find(l=>l.id===id)!;
 expect(stageActors(resolveStageComposition(p.chapters.find(c=>c.id===line.chapterId),line,p)).map(a=>a.assetId)).toContain('onggojib.character.layered-ragged-chopping-v1');
 expect(line.text).toContain('도끼질');expect(line.backgroundId).toBe('onggojib.background.winter-courtyard-pixel');
});
it('registers independently selectable costume and action variants without changing legacy IDs',()=>{
 const sprite=resolveAsset('onggojib.character.layered-ragged-chopping-v1');expect(sprite).toBeDefined();expect(sprite!.metadata).toMatchObject({primaryCharacterId:'onggojib.real',variantId:'넝마옷 · 해진 짚신',actions:['도끼질','장작 패기']});
 expect(ASSET_CATALOG.filter(a=>a.metadata.layeredStoryAsset)).toHaveLength(11);
 expect(resolveAsset('onggojib.character.real-exiled-consistent-pixel')).toBeDefined();
});

it('changes only visual fields and retains every authored route, cue and manuscript value',()=>{
 const visual=new Set(['backgroundId','backgroundMode','inheritActors','stageComposition','leftAssetId','rightAssetId','speaker']);
 const prose=(line:Record<string,unknown>)=>Object.fromEntries(Object.entries(line).filter(([key])=>!visual.has(key)));
 for(const entry of [...representativeStories,...classicStories]){
  const before=entry.project,snapshot=JSON.stringify(before),after=connectCatalogLayeredScenes(before);
  expect(JSON.stringify(before)).toBe(snapshot);expect(after.lines.map(l=>l.id)).toEqual(before.lines.map(l=>l.id));
  for(const [i,line] of after.lines.entries()){
   expect(prose(line)).toEqual(prose(before.lines[i]));
   const stage=resolveStageComposition(after.chapters.find(c=>c.id===line.chapterId),line,after);
   expect(isStageComposition(stage)).toBe(true);
   for(const actor of stageActors(stage))expect(resolveAsset(actor.assetId),actor.assetId).toBeDefined();
  }
 }
});

it('keeps the invisible husband spectral while his wife, child and servant stay solid',()=>{
 const p=resolveProvidedCatalogStory(representativeStories.find(s=>s.id==='onggojib')!.project);
 for(const index of [2,3,8,9]){
  const scene=compileStoryScene(p,`review-main-003:b-fake-warning:${index}`,1,{mode:'play',viewport:{width:1280,height:800}});
  expect(scene.actors.filter(a=>a.spectral).map(a=>a.id)).toEqual(['onggojib-real']);
  expect(scene.actors).toHaveLength(3);
  const stage=p.lines.find(l=>l.id===`review-main-003:b-fake-warning:${index}`)!.stageComposition!;
  expect(stage.rightActors[0].key).toBe('onggojib-real');
  if(index>=8)expect(stage.rightActors[0].assetId).toBe('creative.character.onggojib-ghost-neutral');
 }
});
it('keeps both husbands in the court contrast and changes only shoes after their gift',()=>{
 const p=resolveProvidedCatalogStory(representativeStories.find(s=>s.id==='onggojib')!.project);
 for(const line of p.lines.filter(l=>l.text.startsWith('포졸들이 분노한 옹고집'))){
  const assets=stageActors(line.stageComposition!).map(a=>a.assetId);
  expect(assets).toContain('onggojib.character.real-angry-pixel');
  expect(assets).toContain('onggojib.character.double-blue-gentle-consistent-pixel');
 }
 for(const chapter of p.chapters.filter(c=>c.id.includes(':fake-route'))){
  const cuts=p.lines.filter(l=>l.chapterId===chapter.id),gift=cuts.findIndex(l=>l.text.includes('주먹밥 하나를 먹고'));
  expect(gift).toBeGreaterThan(0);
  expect(stageActors(cuts[gift].stageComposition!).map(a=>a.assetId)).toContain('onggojib.character.layered-ragged-replacement-shoes-v1');
  expect(stageActors(cuts[gift-1].stageComposition!).map(a=>a.assetId)).toContain('onggojib.character.layered-ragged-seated-outside-v1');
 }
});
