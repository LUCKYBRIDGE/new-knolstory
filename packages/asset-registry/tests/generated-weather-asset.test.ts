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
it('retains the exact pre-weather432 rows after accounting for the two recorded transparency repairs',()=>{
 type Row={id:string;revision:string;metadata?:{generatedWeatherAsset?:boolean;generatedTransparencyRepair?:boolean}};
 type Repair={id:string;outputSha256:string;previousCatalogEntry:Row};
 const rows=JSON.parse(readFileSync('packages/asset-registry/src/catalog.json','utf8')) as Row[];
 const receipt=JSON.parse(readFileSync('docs/architecture/evidence/transparency-repair-2026-11-11/generation.json','utf8')) as {assets:Repair[]};
 const repairs=new Map(receipt.assets.map(row=>[row.id,row]));
 expect([...repairs.keys()].sort()).toEqual(['heungbu.character.heungbu-pleading','heungbu.character.nolbu-working']);
 const previous=rows.filter(row=>!row.metadata?.generatedWeatherAsset);expect(previous).toHaveLength(432);
 const historical=previous.map(row=>{
  if(!row.metadata?.generatedTransparencyRepair){expect(repairs.has(row.id)).toBe(false);return row;}
  const repair=repairs.get(row.id);expect(repair).toBeDefined();expect(row.revision).toBe(repair!.outputSha256);
  return repair!.previousCatalogEntry;
 });
 // Keep the historical digest, rather than approving an unrelated replacement of the other rows.
 expect(createHash('sha256').update(JSON.stringify(historical)).digest('hex')).toBe('f5559656c2cad6ac43c4d031fba6bd9ebaeddf764f9872b1ef6b92080dd524d8');
});
it('changes only reviewed image fields while preserving character identity and selection metadata',()=>{
 const rows=JSON.parse(readFileSync('packages/asset-registry/src/catalog.json','utf8'));
 const receipt=JSON.parse(readFileSync('docs/architecture/evidence/transparency-repair-2026-11-11/generation.json','utf8'));
 const imageFields=new Set(['src','sourcePath','revision','geometry']);
 for(const row of rows.filter((value:{metadata:{generatedTransparencyRepair?:boolean}})=>value.metadata.generatedTransparencyRepair)){
  const old=receipt.assets.find((value:{id:string})=>value.id===row.id).previousCatalogEntry;
  const identity=(value:Record<string,unknown>)=>Object.fromEntries(Object.entries(value).filter(([key])=>!imageFields.has(key)&&key!=='metadata'));
  const metadata=(value:Record<string,unknown>)=>Object.fromEntries(Object.entries(value).filter(([key])=>key!=='generatedTransparencyRepair'&&key!=='qualityReview'));
  expect(identity(row)).toEqual(identity(old));expect(metadata(row.metadata)).toEqual(metadata(old.metadata));
 }
});
