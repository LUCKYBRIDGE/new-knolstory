import {expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {ASSET_CATALOG,resolveAsset,matchesAssetSearch,isSelectableAsset} from '../src';
import {isRuntimeImagePath} from '../../runtime-contract/src';

const plan=JSON.parse(readFileSync('docs/architecture/evidence/character-expression-expansion-2026-11-11/plan.json','utf8'));
it('fills four story packs with sixteen searchable individually selectable poses across ten identities',()=>{
 const added=ASSET_CATALOG.filter(asset=>asset.metadata.generatedExpressionAsset&&asset.src.startsWith('/assets/characters/expressions-v1/'));
 expect(added).toHaveLength(16);
 expect(new Set(added.map(asset=>asset.metadata.primaryCharacterId)).size).toBe(10);
 for(const story of ['흥부와 놀부','선녀와 나무꾼','별주부전','옹고집전'])expect(added.filter(asset=>asset.story===story)).toHaveLength(4);
 for(const recipe of plan.recipes){
  const asset=resolveAsset(recipe.id);expect(asset).toBeDefined();
  expect(asset!.metadata).toMatchObject({kind:'character',composition:'single',framing:'full',pickerVisibility:'primary',qualityStatus:'approved'});
  expect(isSelectableAsset(asset!)).toBe(true);
  for(const term of [recipe.name,...recipe.actions,...recipe.expressions])expect(matchesAssetSearch(asset!,term),recipe.id+'/'+term).toBe(true);
  expect(isRuntimeImagePath(asset!.runtimePath)).toBe(true);
  expect(asset!.geometry).toMatchObject({width:800,height:1200});
 }
});
it('preserves every previous catalogue row and rejects unreviewed new runtime paths',()=>{
 const rows=JSON.parse(readFileSync('packages/asset-registry/src/catalog.json','utf8'));
 const previous=rows.filter((row:{metadata:{generatedExpressionAsset?:boolean}})=>!row.metadata.generatedExpressionAsset);
 expect(previous).toHaveLength(plan.before.catalogueRows);
 expect(createHash('sha256').update(JSON.stringify(previous)).digest('hex')).toBe(plan.before.catalogueSha256);
 for(const path of ['assets/characters/expressions-v1/unknown.webp','assets/characters/expressions-v1/../heungbu.webp','https://example.com/actor.webp'])expect(isRuntimeImagePath(path)).toBe(false);
});
