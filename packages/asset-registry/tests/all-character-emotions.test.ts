import {expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {ASSET_CATALOG,STORY_CHARACTERS,resolveAsset,isSelectableAsset,matchesAssetSearch,facetValues} from '../src';
import {isRuntimeImagePath} from '../../runtime-contract/src';

const plan=JSON.parse(readFileSync('docs/architecture/evidence/all-character-emotions-2026-11-11/plan.json','utf8'));
const coverage=JSON.parse(readFileSync('packages/asset-registry/src/character-emotions.json','utf8'));
it('provides distinct everyday/joy/anger/sorrow/mirth images for every individual identity, not just five file names',()=>{
 const expected=STORY_CHARACTERS.map(row=>row.id).filter(id=>!(id in plan.groupAliases)).sort();
 expect(plan.characters.map((row:{characterId:string})=>row.characterId).sort()).toEqual(expected);
 expect(expected).toHaveLength(47);
 for(const row of plan.characters){
  expect(coverage.characters.find((item:{characterId:string})=>item.characterId===row.characterId)?.slots).toEqual(row.requiredSlots);
  expect(Object.keys(row.requiredSlots)).toEqual(['neutral','joy','anger','sorrow','mirth']);
  const ids=Object.values(row.requiredSlots) as string[];
  expect(new Set(ids).size,row.characterId).toBe(5);
  expect(new Set(ids.map(id=>resolveAsset(id)?.revision)).size,row.characterId+' distinct image bytes').toBe(5);
  const selectable=ASSET_CATALOG.filter(asset=>asset.type==='character'&&asset.metadata.primaryCharacterId===row.characterId&&asset.metadata.composition!=='group'&&isSelectableAsset(asset));
  expect(selectable.length,row.characterId).toBeGreaterThanOrEqual(5);
  for(const id of ids){
   const asset=resolveAsset(id);expect(asset,row.characterId+'/'+id).toBeDefined();
   expect(isSelectableAsset(asset),id).toBe(true);expect(asset!.metadata.primaryCharacterId,id).toBe(row.characterId);
   // Older single-character rows predate the explicit composition field.
   expect(['group','multiple']).not.toContain(asset!.metadata.composition);
   expect(['full','전신']).toContain(facetValues(asset!,'framings')[0]);
   expect(isRuntimeImagePath(asset!.runtimePath),id).toBe(true);
  }
  for(const [role,id] of Object.entries(row.requiredSlots)){
   const asset=resolveAsset(id as string)!;
   expect(facetValues(asset,'expressions')).toContain(coverage.labels[role]);
   expect(matchesAssetSearch(asset,row.name+' '+coverage.labels[role]),row.characterId+'/'+role).toBe(true);
  }
 }
});
it('preserves all481previous catalogue rows and makes each new mood searchable by its character and emotional label',()=>{
 const rows=JSON.parse(readFileSync('packages/asset-registry/src/catalog.json','utf8'));
 const before=rows.filter((row:{metadata:{emotionBatch?:string}})=>row.metadata.emotionBatch!=='all-character-v3');
 expect(before).toHaveLength(plan.before.catalogueRows);
 expect(createHash('sha256').update(JSON.stringify(before)).digest('hex')).toBe(plan.before.catalogueSha256);
 for(const recipe of plan.recipes){
  const asset=resolveAsset(recipe.id);expect(asset).toBeDefined();
  for(const term of [recipe.name,...recipe.expressions])expect(matchesAssetSearch(asset!,term),recipe.id+'/'+term).toBe(true);
  expect(asset!.metadata.emotionRole).toBe(recipe.emotion);
  if(recipe.emotion!=='anger')expect(matchesAssetSearch(asset!,'분노'),recipe.id+' must not match anger through an umbrella tag').toBe(false);
 }
});
