import {describe,expect,it} from 'vitest';
import provenance from '../src/media-provenance.json' with {type:'json'};
import {resolveAsset} from '../src/image-catalog';
import {PICTUREBOOK_RECIPES,lookupStageRecipe,stageRecipeProblems,type StageRecipe} from '../src/picturebook-recipes';

type Entry={sha256:string;assetIds?:string[];license?:string;commercialUse?:string;redistribution?:string};
const entries=(provenance as unknown as {entries:Entry[]}).entries;
/** Service use is cleared when a provenance record for the same bytes allows it. */
function rightsCleared(id:string){
 const asset=resolveAsset(id)!;
 return entries.some(entry=>entry.assetIds?.includes(id)&&entry.sha256===asset.revision&&!!entry.license&&entry.commercialUse==='permitted'&&['permitted','service-only'].includes(String(entry.redistribution)));
}
const referenced=(recipe:StageRecipe)=>[recipe.sourceAssetId,...(recipe.stage?[recipe.stage.backgroundId,...recipe.stage.left.map(a=>a.assetId),...recipe.stage.right.map(a=>a.assetId)]:[]),...recipe.alternatives.map(a=>a.assetId)].filter(Boolean);

describe('picture-book stage recipes (service list)',()=>{
 it('every recipe names registered assets at the reviewed file revision',()=>{
  expect(PICTUREBOOK_RECIPES.recipes.length).toBeGreaterThan(0);
  for(const recipe of PICTUREBOOK_RECIPES.recipes)expect(stageRecipeProblems(recipe,resolveAsset),recipe.sourceAssetId).toEqual([]);
 });
 it('only recipes whose every picture has cleared service rights may be approved',()=>{
  for(const recipe of PICTUREBOOK_RECIPES.recipes.filter(item=>item.review==='approved'))
   for(const id of referenced(recipe))expect(rightsCleared(id),`${recipe.sourceAssetId}: ${id}`).toBe(true);
 });
 it('keys recipes by illustration, not by book title or page number, one recipe per illustration',()=>{
  const sources=PICTUREBOOK_RECIPES.recipes.map(recipe=>recipe.sourceAssetId);
  expect(new Set(sources).size).toBe(sources.length);
  for(const source of sources)expect(resolveAsset(source)?.metadata.kind).toBe('scene-illustration');
 });
 it('offers nothing when the illustration file changed after review, and never part of a broken recipe',()=>{
  const recipe=PICTUREBOOK_RECIPES.recipes.find(item=>item.stage)!;
  const changed={recipes:[recipe],resolve:(id:string)=>{const asset=resolveAsset(id);return asset&&id===recipe.sourceAssetId?{...asset,revision:'0'.repeat(64)}:asset;}};
  expect(lookupStageRecipe(recipe.sourceAssetId,changed)).toMatchObject({status:'broken'});
  const missing={recipes:[recipe],resolve:(id:string)=>id===recipe.stage!.backgroundId?undefined:resolveAsset(id)};
  expect(lookupStageRecipe(recipe.sourceAssetId,missing)).toMatchObject({status:'broken'});
  expect(lookupStageRecipe('rabbit-turtle.scene.unknown')).toEqual({status:'none'});
 });
 it('unapproved recipes are found but never approved',()=>{
  for(const recipe of PICTUREBOOK_RECIPES.recipes.filter(item=>item.review!=='approved'))expect(lookupStageRecipe(recipe.sourceAssetId).status).toBe('unapproved');
 });
 it('a combined pose counts both characters once on the stage',()=>{
  const riding=PICTUREBOOK_RECIPES.recipes.find(recipe=>recipe.stage?.left.some(actor=>actor.subjects.length>1))!;
  const doubled={...riding,stage:{...riding.stage!,right:[{assetId:'rabbit-turtle.character.rabbit-suspicious',slot:'rabbit',label:'토끼',subjects:['rabbit-turtle.rabbit']}]},revisions:{...riding.revisions,'rabbit-turtle.character.rabbit-suspicious':resolveAsset('rabbit-turtle.character.rabbit-suspicious')!.revision}};
  expect(stageRecipeProblems(doubled,resolveAsset)).toContain('같은 인물이 무대에 두 번 나와요.');
 });
});
