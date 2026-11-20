import {SERVICE_RECIPE_SOURCE,isFinishedIllustration,lookupStageRecipe,resolveAsset,type RecipeActor,type RecipeAlternative,type RecipeSource,type StageRecipe} from '@knolstory/asset-registry';
import type {PicturebookBook,PicturebookPage,PicturebookPageStage,PicturebookStageActor} from '@knolstory/runtime-core';

/**
 * Preparing a picture book for KnolStory: what each page's first stage starts with.
 * The page ID owns every choice, so the same picture on two pages stays independent.
 */
export type PicturebookPermissions=Readonly<{images:boolean;characters:boolean}>;
export type PageKind='recipe'|'student'|'reference';
export type PagePlan=Readonly<{
 pageId:string;pageNumber:number;title:string;
 /** What the page shows in the picture book (kept as the chapter's starting picture). */
 sketch:Readonly<{backgroundId:string;leftAssetId:string;rightAssetId:string}>|null;
 /** The default the student starts from. */
 kind:PageKind;
 /** A recipe whose stage the student may look at (approved or not). Only approved ones are defaults. */
 recipe?:StageRecipe;
 approved:boolean;
 /** Why the page starts the way it does, in the student's words. */
 reason:string;
 /** The student's own background and actors, when the page was built from them. */
 student?:Extract<PicturebookPageStage,{kind:'stage'}>;
}>;
export type PageSelection=
 | Readonly<{mode:'default'}>
 | Readonly<{mode:'reference'}>
 /** Approved recipe with the student's swaps by slot (`background` or an actor slot). */
 | Readonly<{mode:'recipe';overrides:Readonly<Record<string,string>>}>
 | Readonly<{mode:'student'}>;
export type Selections=Readonly<Record<string,PageSelection>>;

function studentStage(page:PicturebookPage,permissions:PicturebookPermissions):Extract<PicturebookPageStage,{kind:'stage'}>|undefined{
 if(!permissions.images)return undefined;
 const actor=(id:string):PicturebookStageActor[]=>id&&permissions.characters?[{assetId:id}]:[];
 const left=actor(page.leftAssetId),right=actor(page.rightAssetId);
 if(!page.backgroundId&&!left.length&&!right.length)return undefined;
 return {kind:'stage',origin:'student',backgroundId:page.backgroundId,left,right};
}

export function planPicturebookPage(page:PicturebookPage,pageNumber:number,permissions:PicturebookPermissions,source:RecipeSource=SERVICE_RECIPE_SOURCE):PagePlan{
 const sketch=page.backgroundId||page.leftAssetId||page.rightAssetId?{backgroundId:page.backgroundId,leftAssetId:page.leftAssetId,rightAssetId:page.rightAssetId}:null;
 const base={pageId:page.id,pageNumber,title:page.title,sketch};
 if(!sketch)return {...base,kind:'reference',approved:false,reason:'그림이 없는 쪽이에요. 무대는 편집기에서 직접 꾸며요.'};
 const finished=!!page.backgroundId&&isFinishedIllustration(page.backgroundId);
 if(finished&&(page.leftAssetId||page.rightAssetId))
  // Characters drawn into the illustration may also be among the added ones: never merge them.
  return {...base,kind:'reference',approved:false,reason:'완성 삽화 위에 인물을 더한 쪽이라 원래 구성을 그림책 구상 삽화로만 보관해요.'};
 if(!finished){
  const student=studentStage(page,permissions);
  if(!student)return {...base,kind:'reference',approved:false,reason:'그림 고르기가 제한되어 있어 그림책 구상 삽화로만 보관해요.'};
  return {...base,kind:'student',approved:false,student,reason:'이 쪽에 직접 고른 배경과 인물로 첫 무대를 꾸며요.'};
 }
 const found=lookupStageRecipe(page.backgroundId,source);
 if(found.status==='approved'){
  if(!permissions.images)return {...base,kind:'reference',recipe:found.recipe,approved:true,reason:'그림 고르기가 제한되어 있어 삽화만 참고해요.'};
  return {...base,kind:'recipe',recipe:found.recipe,approved:true,reason:'이 삽화에 맞춰 검토한 숏스토리 추천 무대가 있어요.'};
 }
 if(found.status==='unapproved')return {...base,kind:'reference',recipe:found.recipe,approved:false,reason:found.reason};
 if(found.status==='broken')return {...base,kind:'reference',approved:false,reason:'이 삽화의 추천 무대를 지금 확인할 수 없어 삽화만 참고해요.'};
 return {...base,kind:'reference',approved:false,reason:'이 삽화에 맞춘 추천 무대가 아직 없어 삽화만 참고해요.'};
}

export function planPicturebook(book:PicturebookBook,permissions:PicturebookPermissions,source:RecipeSource=SERVICE_RECIPE_SOURCE):PagePlan[]{
 return book.pages.map((page,index)=>planPicturebookPage(page,index+1,permissions,source));
}

/** The selection actually in effect: `default` follows the page plan. */
export function effectiveMode(plan:PagePlan,selection:PageSelection|undefined):'recipe'|'student'|'reference'{
 const mode=!selection||selection.mode==='default'?plan.kind:selection.mode;
 if(mode==='recipe'&&!(plan.approved&&plan.recipe?.stage))return 'reference';
 if(mode==='student'&&!plan.student)return 'reference';
 return mode;
}
function overridesOf(selection:PageSelection|undefined){return selection?.mode==='recipe'?selection.overrides:{};}

export type StageSlot=Readonly<{slot:string;side:'left'|'right'|'background';current:string;label:string;suggested:string;grouped:boolean;alternatives:readonly RecipeAlternative[]}>;
/** Roles the student can swap on an approved recipe, with up to three reviewed alternatives each. */
export function recipeSlots(plan:PagePlan,selection:PageSelection|undefined):StageSlot[]{
 const stage=plan.recipe?.stage;if(!stage||!plan.approved)return [];
 const overrides=overridesOf(selection);
 const label=(id:string,fallback:string)=>plan.recipe!.alternatives.find(item=>item.assetId===id)?.label??[...stage.left,...stage.right].find(actor=>actor.assetId===id)?.label??resolveAsset(id)?.label??fallback;
 const slots:StageSlot[]=[];
 if(stage.backgroundId){
  const current=overrides.background??stage.backgroundId;
  slots.push({slot:'background',side:'background',current,suggested:stage.backgroundId,grouped:false,label:label(current,'배경'),alternatives:plan.recipe!.alternatives.filter(item=>item.slot==='background')});
 }
 for(const [side,actors] of [['left',stage.left],['right',stage.right]] as const)for(const actor of actors){
  const current=overrides[actor.slot]??actor.assetId;
  slots.push({slot:actor.slot,side,current,suggested:actor.assetId,grouped:actor.subjects.length>1,label:label(current,actor.label),alternatives:plan.recipe!.alternatives.filter(item=>item.slot===actor.slot)});
 }
 return slots;
}

function subjectsOf(plan:PagePlan,slot:string,assetId:string):readonly string[]{
 const recipe=plan.recipe!;
 const actor=[...recipe.stage!.left,...recipe.stage!.right].find(item=>item.slot===slot);
 if(actor?.assetId===assetId)return actor.subjects;
 return recipe.alternatives.find(item=>item.slot===slot&&item.assetId===assetId)?.subjects??actor?.subjects??[];
}
/** Swap one role on the current page. Choosing the suggested picture again removes the swap. */
export function chooseAlternative(plan:PagePlan,selection:PageSelection|undefined,slot:string,assetId:string):PageSelection{
 const target=recipeSlots(plan,selection).find(item=>item.slot===slot);
 if(!target)throw Error('이 쪽에서 바꿀 수 없는 자리예요.');
 if(assetId!==target.suggested&&!target.alternatives.some(item=>item.assetId===assetId))throw Error('검토한 그림 중에서 골라 주세요.');
 const overrides={...overridesOf(selection)};
 if(assetId===target.suggested)delete overrides[slot];else overrides[slot]=assetId;
 if(slot!=='background'){
  // A combined pose already shows both characters: never put either of them on the stage twice.
  const seen=new Set<string>();
  for(const item of recipeSlots(plan,{mode:'recipe',overrides}).filter(item=>item.side!=='background'))
   for(const subject of subjectsOf(plan,item.slot,item.current)){if(seen.has(subject))throw Error('같은 인물이 무대에 두 번 나오게 돼요. 다른 그림을 골라 주세요.');seen.add(subject);}
 }
 return {mode:'recipe',overrides};
}
/** ‘추천대로 되돌리기’: only the current page goes back to its suggestion. */
export function revertPage(selections:Selections,pageId:string):Selections{
 const {[pageId]:_removed,...rest}=selections;return rest;
}

function actorFrom(actor:RecipeActor,assetId:string):PicturebookStageActor{
 // A swapped picture keeps the reviewed side and size but not a pose-specific facing.
 const swapped=assetId!==actor.assetId;
 return {assetId,...(!swapped&&actor.facing?{facing:actor.facing}:{}),...(actor.placementPreset?{placementPreset:actor.placementPreset}:{}),...(actor.xAnchor!==undefined?{xAnchor:actor.xAnchor}:{}),...(!swapped&&actor.scaleMultiplier!==undefined?{scaleMultiplier:actor.scaleMultiplier}:{}),...(actor.subject?{subject:true}:{})};
}
/** The first stage this page's chapter starts with: the same value for the preview and for creation. */
export function pageStage(plan:PagePlan,selection:PageSelection|undefined):PicturebookPageStage{
 const mode=effectiveMode(plan,selection);
 if(mode==='student')return plan.student!;
 if(mode==='reference')return {kind:'reference'};
 const recipe=plan.recipe!,stage=recipe.stage!,overrides=overridesOf(selection);
 return {kind:'stage',origin:'approved',recipeVersion:recipe.recipeVersion,backgroundId:overrides.background??stage.backgroundId,
  left:stage.left.map(actor=>actorFrom(actor,overrides[actor.slot]??actor.assetId)),right:stage.right.map(actor=>actorFrom(actor,overrides[actor.slot]??actor.assetId))};
}

/** Re-check every choice against the current book, permissions and recipe list before creating. */
export function confirmedStages(book:PicturebookBook,selections:Selections,permissions:PicturebookPermissions,source:RecipeSource=SERVICE_RECIPE_SOURCE):Record<string,PicturebookPageStage>{
 const plans=planPicturebook(book,permissions,source);
 for(const pageId of Object.keys(selections))if(!plans.some(plan=>plan.pageId===pageId))throw Error('그림책의 쪽이 바뀌었어요. 준비 화면을 다시 열어 주세요.');
 const stages:Record<string,PicturebookPageStage>={};
 for(const plan of plans){
  const selection=selections[plan.pageId];
  if(selection?.mode==='recipe'){
   if(!plan.approved||!plan.recipe?.stage||!permissions.images)throw Error(`${plan.pageNumber}쪽의 숏스토리 추천 무대를 더 이상 쓸 수 없어요. 그 쪽을 다시 확인해 주세요.`);
   // Re-apply each swap through the same checks the screen used.
   let checked:PageSelection={mode:'recipe',overrides:{}};
   for(const [slot,assetId] of Object.entries(selection.overrides))checked=chooseAlternative(plan,checked,slot,assetId);
  }
  if(selection?.mode==='student'&&!plan.student)throw Error(`${plan.pageNumber}쪽에 내가 고른 배경·인물을 쓸 수 없어요. 그 쪽을 다시 확인해 주세요.`);
  stages[plan.pageId]=pageStage(plan,selection);
 }
 return stages;
}

export type PreparationSummary=Readonly<{pages:number;staged:number;reference:number}>;
export function preparationSummary(plans:readonly PagePlan[],selections:Selections):PreparationSummary{
 const staged=plans.filter(plan=>effectiveMode(plan,selections[plan.pageId])!=='reference').length;
 return {pages:plans.length,staged,reference:plans.length-staged};
}

/** Choices are kept per book in this tab only, until ‘놀스토리로 보내기’ confirms them. */
const DRAFT_PREFIX='knolstory-picturebook-preparation-v1:';
export type PreparationDraft={selections:Selections;pageId:string|null;
 /** Pages chosen to send; null means every page (the default). */
 chosen:string[]|null};
export function readPreparationDraft(storage:Pick<Storage,'getItem'>,bookId:string):PreparationDraft{
 try{
  const value=JSON.parse(storage.getItem(DRAFT_PREFIX+bookId)??'null') as {selections?:unknown;pageId?:unknown;chosen?:unknown}|null;
  if(!value||typeof value!=='object'||!value.selections||typeof value.selections!=='object')return {selections:{},pageId:null,chosen:null};
  const selections=Object.fromEntries(Object.entries(value.selections as Record<string,unknown>).filter(([,item])=>{
   const selection=item as PageSelection|null;
   return !!selection&&typeof selection==='object'&&(['default','reference','student'].includes(selection.mode)||selection.mode==='recipe'&&!!selection.overrides&&typeof selection.overrides==='object'&&Object.values(selection.overrides).every(id=>typeof id==='string'));
  })) as Selections;
  const chosen=Array.isArray(value.chosen)&&value.chosen.every(id=>typeof id==='string')?value.chosen as string[]:null;
  return {selections,pageId:typeof value.pageId==='string'?value.pageId:null,chosen};
 }catch{return {selections:{},pageId:null,chosen:null};}
}
export function writePreparationDraft(storage:Pick<Storage,'setItem'>,bookId:string,selections:Selections,pageId:string,chosen:readonly string[]|null=null){
 try{storage.setItem(DRAFT_PREFIX+bookId,JSON.stringify({selections,pageId,chosen}));}catch{/* Choices stay on screen; only the tab memory is lost. */}
}
export function clearPreparationDraft(storage:Pick<Storage,'removeItem'>,bookId:string){try{storage.removeItem(DRAFT_PREFIX+bookId);}catch{/* Nothing to keep. */}}

/**
 * Review preview (`/picturebook?review=recipes`): recipes still under assembly review are shown on
 * the real stage so a reviewer can judge them. Only the preview uses this source; creating a work
 * from it is never allowed, and the recipe list itself is not changed.
 */
export function reviewRecipeSource(source:RecipeSource=SERVICE_RECIPE_SOURCE):RecipeSource{
 return {...source,recipes:source.recipes.map(recipe=>recipe.review==='assembly-review'&&recipe.stage?{...recipe,review:'approved',reviewedAt:'review-preview',evidence:'review-preview'}:recipe)};
}

/** Numbers as the student reads them: “2·5·7쪽”, “1~3장”. */
export function numberList(numbers:readonly number[],unit:string):string{
 if(!numbers.length)return '';
 const runs=numbers.every((n,i)=>i===0||n===numbers[i-1]!+1);
 return runs&&numbers.length>2?`${numbers[0]}~${numbers.at(-1)}${unit}`:`${numbers.join('·')}${unit}`;
}
export type SendDestination=Readonly<{kind:'new'}>|Readonly<{kind:'existing';title:string;afterLabel:string|null;
 /** Position of the place: 0 is before the first chapter. */
 index:number;chapterCount:number;renumbers:boolean}>;
/** One sentence that says exactly what ‘놀스토리로 보내기’ will do, before the student presses it. */
export function sendSummary(pageNumbers:readonly number[],totalPages:number,destination:SendDestination):string{
 if(!pageNumbers.length)return '보낼 쪽을 하나 이상 골라 주세요.';
 const count=pageNumbers.length,pages=count===totalPages?`${totalPages}쪽 모두가`:`고른 ${numberList(pageNumbers,'쪽')}이`;
 if(destination.kind==='new')return `${pages} 새 놀스토리의 ${numberList(Array.from({length:count},(_,i)=>i+1),'장')}이 돼요.`;
 const numbers=Array.from({length:count},(_,i)=>destination.index+i+1);
 const where=destination.afterLabel===null?'맨 앞':`${destination.afterLabel} 뒤`;
 const shifted=destination.renumbers&&destination.index<destination.chapterCount?` 원래 ${destination.index+1}장부터는 ${destination.index+1+count}장부터로 번호가 바뀌어요.`:'';
 return `${pages} ‘${destination.title}’ ${where}에 ${numberList(numbers,'장')}으로 들어가요.${shifted}`;
}
