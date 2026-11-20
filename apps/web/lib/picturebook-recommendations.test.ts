import {describe,expect,it} from 'vitest';
import {getShortStoryOriginal} from '@knolstory/compatibility';
import {PICTUREBOOK_RECIPES,isSelectableAsset,resolveAsset} from '@knolstory/asset-registry';
import {picturebookRecommendations} from './picturebook-recommendations';

const rabbit=getShortStoryOriginal('rabbit');
const sketchOf=(number:number)=>{const page=rabbit.pages[number-1]!;return {backgroundId:page.backgroundId,leftAssetId:page.leftAssetId,rightAssetId:page.rightAssetId};};

describe('숏스토리 추천 for a chapter sent from a picture-book page',()=>{
 it('offers the reviewed stage and its alternatives for a finished illustration, never the illustration itself',()=>{
  const sketch=sketchOf(2),recipe=PICTUREBOOK_RECIPES.recipes.find(item=>item.sourceAssetId===sketch.backgroundId)!;
  const found=picturebookRecommendations(sketch);
  expect(found.background).toContain(recipe.stage!.backgroundId);
  expect(found.background).not.toContain(sketch.backgroundId);
  expect(found.character).toEqual(expect.arrayContaining(recipe.stage!.left.map(actor=>actor.assetId)));
  for(const alternative of recipe.alternatives)expect([...found.background,...found.character]).toContain(alternative.assetId);
  for(const id of [...found.background,...found.character])expect(isSelectableAsset(resolveAsset(id))).toBe(true);
 });
 it('offers what the student placed on a page they composed',()=>{
  const recipe=PICTUREBOOK_RECIPES.recipes.find(item=>item.sourceAssetId===sketchOf(3).backgroundId)!;
  const background=recipe.stage!.backgroundId,character=recipe.stage!.left[0]!.assetId;
  expect(picturebookRecommendations({backgroundId:background,leftAssetId:character,rightAssetId:''})).toEqual({background:[background],character:[character]});
 });
 it('offers nothing without a picture-book page, or for pictures that cannot be placed',()=>{
  expect(picturebookRecommendations(undefined)).toEqual({background:[],character:[]});
  expect(picturebookRecommendations({backgroundId:'missing',leftAssetId:'',rightAssetId:''})).toEqual({background:[],character:[]});
 });
});
