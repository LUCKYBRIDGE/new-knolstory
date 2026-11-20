import recipeList from './picturebook-stage-recipes.json' with {type:'json'};
import {resolveAsset,type Asset} from './image-catalog';

/**
 * Service list of stage recipes for picture-book illustrations, kept apart from any student work.
 * Key: illustration asset ID + its file revision. A recipe says which registered background and
 * actors can rebuild that picture's first stage, and how far it has been reviewed.
 * Only `approved` recipes are preselected for students; nothing here is ever written back by a student.
 */
export type RecipeReview='approved'|'assembly-review'|'reference-only';
export type RecipeActor=Readonly<{assetId:string;slot:string;label:string;subjects:readonly string[];facing?:'left'|'right'|'original';placementPreset?:'single-left'|'single-right'|'double-left'|'double-right';xAnchor?:number;scaleMultiplier?:number}>;
export type RecipeAlternative=Readonly<{assetId:string;slot:string;label:string;subjects?:readonly string[]}>;
export type StageRecipe=Readonly<{
 sourceAssetId:string;recipeVersion:number;review:RecipeReview;note:string;
 /** Approved recipes record when and where the real 16:9 and 9:16 stage was checked. */
 reviewedAt?:string;evidence?:string;
 stage:Readonly<{backgroundId:string;left:readonly RecipeActor[];right:readonly RecipeActor[]}>|null;
 alternatives:readonly RecipeAlternative[];
 /** Every referenced asset ID (illustration included) with the revision that was reviewed. */
 revisions:Readonly<Record<string,string>>;
}>;
export type RecipeList=Readonly<{version:1;policy:string;recipes:readonly StageRecipe[]}>;
export type RecipeLookup=
 | Readonly<{status:'approved';recipe:StageRecipe}>
 | Readonly<{status:'unapproved';recipe:StageRecipe;reason:string}>
 | Readonly<{status:'broken';reason:string}>
 | Readonly<{status:'none'}>;
export type RecipeSource=Readonly<{recipes:readonly StageRecipe[];resolve:(id:string)=>Pick<Asset,'id'|'type'|'revision'>|undefined}>;

export const PICTUREBOOK_RECIPES=recipeList as unknown as RecipeList;
export const SERVICE_RECIPE_SOURCE:RecipeSource={recipes:PICTUREBOOK_RECIPES.recipes,resolve:resolveAsset};
/** Up to three alternatives per role are offered; more go through the editor's asset picker. */
export const MAX_ALTERNATIVES_PER_SLOT=3;

/** Problems that make a recipe unusable. A recipe with problems is never offered, not even partly. */
export function stageRecipeProblems(recipe:StageRecipe,resolve:RecipeSource['resolve']):string[]{
 const problems:string[]=[];
 const check=(id:string,type:Asset['type'],role:string)=>{
  const asset=resolve(id);
  if(!asset){problems.push(`${role} 자료(${id})가 등록되어 있지 않아요.`);return;}
  if(asset.type!==type)problems.push(`${role} 자료(${id})의 종류가 달라요.`);
  if(recipe.revisions[id]===undefined)problems.push(`${role} 자료(${id})의 검토 리비전이 없어요.`);
  else if(recipe.revisions[id]!==asset.revision)problems.push(`${role} 자료(${id})의 파일이 검토 뒤에 바뀌었어요.`);
 };
 check(recipe.sourceAssetId,'background','원화');
 if(!Number.isSafeInteger(recipe.recipeVersion)||recipe.recipeVersion<1)problems.push('조합 버전을 확인해 주세요.');
 if(recipe.review!=='reference-only'&&!recipe.stage)problems.push('무대 조합이 없어요.');
 if(recipe.review==='approved'&&(!recipe.reviewedAt||!recipe.evidence))problems.push('승인한 조합에는 실제 무대 확인 날짜와 근거가 필요해요.');
 if(recipe.stage){
  const {backgroundId,left,right}=recipe.stage;
  if(backgroundId)check(backgroundId,'background','배경');
  if(left.length>2||right.length>2)problems.push('한쪽에 인물은 두 명까지 둘 수 있어요.');
  for(const actor of [...left,...right])check(actor.assetId,'character','인물');
  const subjects=[...left,...right].flatMap(actor=>actor.subjects);
  if(new Set(subjects).size!==subjects.length)problems.push('같은 인물이 무대에 두 번 나와요.');
  const slots=[...left,...right].map(actor=>actor.slot);
  if(new Set(slots).size!==slots.length||slots.includes('background'))problems.push('인물 자리 이름이 겹쳐요.');
 }
 for(const alternative of recipe.alternatives){
  check(alternative.assetId,alternative.slot==='background'?'background':'character',alternative.slot==='background'?'다른 배경':'다른 인물');
  if(alternative.slot!=='background'&&!recipe.stage?.left.concat(recipe.stage.right).some(actor=>actor.slot===alternative.slot))problems.push(`다른 인물(${alternative.assetId})의 자리가 무대에 없어요.`);
 }
 const perSlot=new Map<string,number>();for(const alternative of recipe.alternatives)perSlot.set(alternative.slot,(perSlot.get(alternative.slot)??0)+1);
 if([...perSlot.values()].some(count=>count>MAX_ALTERNATIVES_PER_SLOT))problems.push(`자리마다 다른 그림은 ${MAX_ALTERNATIVES_PER_SLOT}개까지 제안해요.`);
 return problems;
}

/** Find the reviewed recipe for an illustration as it is now (ID and file revision). */
export function lookupStageRecipe(sourceAssetId:string,source:RecipeSource=SERVICE_RECIPE_SOURCE):RecipeLookup{
 const matches=source.recipes.filter(recipe=>recipe.sourceAssetId===sourceAssetId);
 if(!matches.length)return {status:'none'};
 if(matches.length>1)return {status:'broken',reason:'같은 원화의 조합이 두 개 이상이에요.'};
 const recipe=matches[0];
 const problems=stageRecipeProblems(recipe,source.resolve);
 if(problems.length)return {status:'broken',reason:problems.join(' ')};
 if(recipe.review==='approved')return {status:'approved',recipe};
 return {status:'unapproved',recipe,reason:recipe.review==='reference-only'?'이 그림은 아직 무대 재료가 준비되지 않아 원화를 참고만 해요.':'이 그림의 무대 조합은 아직 검토 중이에요.'};
}

/** Is this background a finished picture-book illustration (characters drawn in)? */
export function isFinishedIllustration(id:string,resolve:(id:string)=>Asset|undefined=resolveAsset):boolean{
 const asset=resolve(id);
 return asset?.type==='background'&&asset.metadata?.kind==='scene-illustration';
}
