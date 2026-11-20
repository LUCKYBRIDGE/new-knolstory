import {isFinishedIllustration,isSelectableAsset,lookupStageRecipe,resolveAsset,type Asset} from '@knolstory/asset-registry';
import type {PicturebookSketch} from '@knolstory/story-domain';

export type PicturebookRecommendations=Readonly<Record<Asset['type'],readonly string[]>>;
export const NO_RECOMMENDATIONS:PicturebookRecommendations={background:[],character:[]};

/**
 * ‘숏스토리 추천’ for every cut of a chapter sent from a picture book: the pictures that fit that page.
 * - A finished illustration: the reviewed (approved) stage for it, and its reviewed alternatives.
 * - A page the student composed: the background and characters they placed on it.
 * Only pictures a writer may place on the stage are offered; nothing here changes the work.
 */
export function picturebookRecommendations(sketch:PicturebookSketch|undefined,resolve:(id:string)=>Asset|undefined=resolveAsset):PicturebookRecommendations{
 if(!sketch)return NO_RECOMMENDATIONS;
 const ids:string[]=[];
 if(sketch.backgroundId&&isFinishedIllustration(sketch.backgroundId,resolve)){
  const found=lookupStageRecipe(sketch.backgroundId);
  if(found.status==='approved'){
   const stage=found.recipe.stage;
   if(stage){ids.push(stage.backgroundId,...stage.left.map(actor=>actor.assetId),...stage.right.map(actor=>actor.assetId));}
   ids.push(...found.recipe.alternatives.map(alternative=>alternative.assetId));
  }
 }else ids.push(sketch.backgroundId);
 ids.push(sketch.leftAssetId,sketch.rightAssetId);
 const pick=(type:Asset['type'])=>[...new Set(ids.filter(Boolean))].filter(id=>{const asset=resolve(id);return asset?.type===type&&isSelectableAsset(asset);});
 return {background:pick('background'),character:pick('character')};
}
