import {it,expect} from 'vitest';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolveAsset,ASSET_CATALOG,getBackgroundSize,matchesAssetSearch,isSelectableAsset} from '../src';
const id='seonnyeo.background.cottage-rain-evening-v1';
it('registers one character-free rainy evening cottage and makes it selectable by useful Korean terms',()=>{
 const asset=resolveAsset(id);expect(asset).toBeDefined();expect(asset!.type).toBe('background');
 expect(asset!.metadata).toMatchObject({generatedWeatherAsset:true,containsCharacters:false,pickerVisibility:'primary',background:{time:'저녁',weather:'비'}});
 expect(asset!.metadata.background).not.toHaveProperty('season');
 for(const query of ['선녀 비 저녁','초가집 재회','인물 없음'])expect(matchesAssetSearch(asset!,query)).toBe(true);
 expect(isSelectableAsset(asset!)).toBe(true);expect(getBackgroundSize(id)).toEqual({width:1672,height:941});
 const bytes=readFileSync('apps/web/public'+asset!.src);expect(createHash('sha256').update(bytes).digest('hex')).toBe(asset!.revision);
 expect(ASSET_CATALOG.filter(a=>a.metadata.generatedWeatherAsset)).toHaveLength(1);
});
it('retains the exact pre-existing432 catalogue rows and byte revisions',()=>{
 const rows=JSON.parse(readFileSync('packages/asset-registry/src/catalog.json','utf8')) as Array<{metadata?:{generatedWeatherAsset?:boolean;shortStoryCollection?:string}}>;
 const previous=rows.filter(row=>!row.metadata?.generatedWeatherAsset&&!row.metadata?.shortStoryCollection);expect(previous).toHaveLength(432);
 expect(createHash('sha256').update(JSON.stringify(previous)).digest('hex')).toBe('f5559656c2cad6ac43c4d031fba6bd9ebaeddf764f9872b1ef6b92080dd524d8');
});
