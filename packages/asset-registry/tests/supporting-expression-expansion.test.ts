import {expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {ASSET_CATALOG,resolveAsset,matchesAssetSearch,isSelectableAsset} from '../src';
import {isRuntimeImagePath} from '../../runtime-contract/src';

const plan=JSON.parse(readFileSync('docs/architecture/evidence/supporting-character-expansion-2026-11-11/plan.json','utf8'));
it('adds two distinct searchable poses for each of sixteen supporting identities across four stories',()=>{
 const added=ASSET_CATALOG.filter(asset=>asset.metadata.expressionBatch==='supporting-v2');
 expect(added).toHaveLength(32);
 expect(new Set(added.map(asset=>asset.metadata.primaryCharacterId)).size).toBe(16);
 for(const story of ['흥부와 놀부','옹고집전','선녀와 나무꾼','별주부전'])expect(added.filter(asset=>asset.story===story)).toHaveLength(8);
 for(const identity of new Set(added.map(asset=>asset.metadata.primaryCharacterId)))expect(added.filter(asset=>asset.metadata.primaryCharacterId===identity)).toHaveLength(2);
 for(const recipe of plan.recipes){
  const asset=resolveAsset(recipe.id);expect(asset).toBeDefined();
  expect(asset!.metadata).toMatchObject({kind:'character',composition:'single',framing:'full',pickerVisibility:'primary',qualityStatus:'approved',primaryCharacterId:recipe.primaryCharacterId,generatedExpressionAsset:true});
  expect(isSelectableAsset(asset!)).toBe(true);
  for(const term of [recipe.name,...recipe.actions,...recipe.expressions])expect(matchesAssetSearch(asset!,term),recipe.id+'/'+term).toBe(true);
  expect(isRuntimeImagePath(asset!.runtimePath)).toBe(true);expect(asset!.geometry).toMatchObject({width:800,height:1200});
 }
});
it('preserves all previous449catalogue rows and permits only reviewed new runtime paths',()=>{
 const rows=JSON.parse(readFileSync('packages/asset-registry/src/catalog.json','utf8'));
 const previous=rows.filter((row:{src:string;metadata:{generatedExpressionAsset?:boolean}})=>!row.metadata.generatedExpressionAsset||row.src.startsWith('/assets/characters/expressions-v1/'));
 expect(previous).toHaveLength(plan.before.catalogueRows);
 expect(createHash('sha256').update(JSON.stringify(previous)).digest('hex')).toBe(plan.before.catalogueSha256);
 for(const path of ['assets/characters/expressions-v2/unknown.webp','assets/characters/expressions-v2/../guard.webp','assets/characters/expressions-v2/onggojib-guard-stop.webp?x=1','https://example.com/guard.webp'])expect(isRuntimeImagePath(path)).toBe(false);
});
