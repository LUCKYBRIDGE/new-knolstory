import {describe,expect,it} from 'vitest';
import {assetCharacterIds,searchAssets,stableAssetOrder,suggestAssets} from '../src';

const characters=searchAssets({type:'character'});
describe('추천 shelf and the list of all pictures',()=>{
 it('explains each suggestion, in a fixed order of reasons, without the current picture or duplicates',()=>{
  const [a,b,c,d]=characters;
  const shelf=suggestAssets(characters,{picturebookIds:[a!.id],chapterAssetIds:[a!.id,b!.id],recentIds:[c!.id],favoriteIds:[d!.id,c!.id]});
  expect(shelf.map(item=>[item.asset.id,item.reason])).toEqual([[a!.id,'그림책 쪽에 맞아요'],[b!.id,'이 장에서 쓰는 그림'],[c!.id,'최근에 쓴 그림'],[d!.id,'별표한 그림']]);
  // The saved picture is left out, unless it is exactly what the picture-book page suggests.
  const backgrounds=searchAssets({type:'background'});
  expect(suggestAssets(backgrounds,{currentAssetId:backgrounds[0]!.id,chapterAssetIds:[backgrounds[0]!.id]})).toEqual([]);
  expect(suggestAssets(characters,{currentAssetId:a!.id,picturebookIds:[a!.id]})[0]).toMatchObject({asset:{id:a!.id},reason:'그림책 쪽에 맞아요'});
 });
 it('suggests other looks of the same character and stops at the limit',()=>{
  const current=characters.find(asset=>characters.filter(other=>assetCharacterIds(other)[0]===assetCharacterIds(asset)[0]).length>10)!;
  const shelf=suggestAssets(characters,{currentAssetId:current.id});
  expect(shelf).toHaveLength(8);
  for(const item of shelf){expect(item.reason).toBe('같은 인물의 다른 모습');expect(assetCharacterIds(item.asset)).toContain(assetCharacterIds(current)[0]);}
 });
 it('only suggests what the search and filters allow',()=>{
  const narrowed=searchAssets({type:'character',search:'화난'});
  const outside=characters.find(asset=>!narrowed.includes(asset))!;
  expect(suggestAssets(narrowed,{picturebookIds:[outside.id]})).toEqual([]);
 });
 it('keeps a nonmatching current picture for inspection without recommending it',()=>{
  const id='seonnyeo.background.BG01-valley-day';
  const context={currentAssetId:id,picturebookIds:[id]};
  const filters={times:['저녁']};
  const found=searchAssets({type:'background',currentAssetId:id,filters});
  expect(found[0]?.id).toBe(id);
  expect(suggestAssets(found,{...context,filters})).toEqual([]);
  expect(suggestAssets(found,{...context,search:'겨울'})).toEqual([]);
  const matching={times:['낮']};
  expect(suggestAssets(searchAssets({type:'background',filters:matching}),{...context,filters:matching})).toHaveLength(1);
 });
 it('keeps all pictures in a steady order, with the saved picture first',()=>{
  const shuffled=[...characters].reverse();
  expect(stableAssetOrder(shuffled).map(asset=>asset.id)).toEqual(stableAssetOrder(characters).map(asset=>asset.id));
  const saved=characters[20]!;
  expect(stableAssetOrder(characters,saved.id)[0]).toBe(saved);
  // Grouped by work: a work's pictures sit together.
  const stories=stableAssetOrder(characters).map(asset=>asset.story);
  expect(stories.filter((story,index)=>index===0||story!==stories[index-1]).length).toBe(new Set(stories).size);
 });
});
