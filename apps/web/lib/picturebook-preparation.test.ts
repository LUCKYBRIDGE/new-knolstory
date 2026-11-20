import {describe,expect,it} from 'vitest';
import {getShortStoryOriginal} from '@knolstory/compatibility';
import {PICTUREBOOK_RECIPES,resolveAsset,type RecipeSource,type StageRecipe} from '@knolstory/asset-registry';
import {convertPicturebookToChapters} from '@knolstory/runtime-core';
import {numberList,sendSummary,reviewRecipeSource,chooseAlternative,confirmedStages,effectiveMode,pageStage,planPicturebook,preparationSummary,readPreparationDraft,recipeSlots,revertPage,writePreparationDraft,type Selections} from './picturebook-preparation';

/**
 * Test-only approval: the service list keeps pages under review until a person checks the real stage.
 * Approving copies here exercises choice, revert and combined-pose rules without new images.
 */
const approved:RecipeSource={recipes:PICTUREBOOK_RECIPES.recipes.map(recipe=>recipe.stage?{...recipe,review:'approved',reviewedAt:'test',evidence:'test-only approval'} as StageRecipe:recipe),resolve:resolveAsset};
const empty:RecipeSource={recipes:[],resolve:resolveAsset};
const all={images:true,characters:true};
const book=()=>({...getShortStoryOriginal('rabbit'),id:'student-book'});
const page=(number:number)=>book().pages[number-1]!.id;

describe('preparing a picture book for KnolStory',()=>{
 it('works with an empty recommendation list: every page starts as reference only',()=>{
  const plans=planPicturebook(book(),all,empty);
  expect(plans.map(plan=>plan.kind)).toEqual(Array(8).fill('reference'));
  expect(preparationSummary(plans,{})).toEqual({pages:8,staged:0,reference:8});
 });
 it('preselects only approved recipes; reviewed-but-unapproved and production-needed pages stay reference only',()=>{
  const service=planPicturebook(book(),all);
  expect(service.filter(plan=>plan.kind==='recipe').map(plan=>plan.pageNumber)).toEqual(PICTUREBOOK_RECIPES.recipes.filter(recipe=>recipe.review==='approved').map(recipe=>Number(recipe.sourceAssetId.slice(-2))));
  const plans=planPicturebook(book(),all,approved);
  expect(plans.filter(plan=>plan.kind==='recipe').map(plan=>plan.pageNumber)).toEqual([1,2,3,4,5,6,7,8]);
  // Pages whose recipe is not approved start as reference only, with the reason shown.
  for(const recipe of PICTUREBOOK_RECIPES.recipes.filter(item=>item.review!=='approved')){
   const plan=service[Number(recipe.sourceAssetId.slice(-2))-1]!;
   expect(plan.kind).toBe('reference');
   expect(plan.reason).toContain(recipe.review==='assembly-review'?'검토 중':'삽화만 참고');
  }
  expect(plans[5]).toMatchObject({kind:'recipe',recipe:{stage:{left:[{slot:'rabbit'}],right:[{slot:'turtle'},{slot:'dragonking'}]}}});
 });
 it('swaps one role on one page and keeps every other page’s choice; revert restores only that page',()=>{
  const plans=planPicturebook(book(),all,approved),third=plans[2]!,fifth=plans[4]!;
  let selections:Selections={};
  selections={...selections,[fifth.pageId]:{mode:'reference'}};
  selections={...selections,[third.pageId]:chooseAlternative(third,selections[third.pageId],'rabbit','rabbit-turtle.character.rabbit-shocked')};
  const stage=pageStage(third,selections[third.pageId]);
  expect(stage).toMatchObject({kind:'stage',left:[{assetId:'rabbit-turtle.character.rabbit-shocked'}],right:[{assetId:'rabbit-turtle.character.turtle-offer'}]});
  // Moving to another page and back keeps the swap (it is keyed by page ID).
  expect(recipeSlots(third,selections[third.pageId]).find(slot=>slot.slot==='rabbit')!.current).toBe('rabbit-turtle.character.rabbit-shocked');
  expect(effectiveMode(fifth,selections[fifth.pageId])).toBe('reference');
  const reverted=revertPage(selections,third.pageId);
  expect(reverted[third.pageId]).toBeUndefined();expect(reverted[fifth.pageId]).toEqual({mode:'reference'});
  expect(pageStage(third,reverted[third.pageId])).toMatchObject({left:[{assetId:'rabbit-turtle.character.rabbit-suspicious'}]});
 });
 it('shows the riding pose as one combined role and never adds the same character twice',()=>{
  const fourth=planPicturebook(book(),all,approved)[3]!;
  const slots=recipeSlots(fourth,undefined);
  expect(slots.filter(slot=>slot.side!=='background')).toEqual([expect.objectContaining({slot:'riding',grouped:true})]);
  const doubled:RecipeSource={...approved,recipes:approved.recipes.map(recipe=>recipe.sourceAssetId===fourth.recipe!.sourceAssetId?{...recipe,stage:{...recipe.stage!,right:[{assetId:'rabbit-turtle.character.classic-turtle-water',slot:'turtle',label:'자라',subjects:['rabbit-turtle.turtle']}]},alternatives:[{assetId:'rabbit-turtle.character.rabbit-suspicious',slot:'riding',label:'토끼만',subjects:['rabbit-turtle.rabbit']}],revisions:{...recipe.revisions,'rabbit-turtle.character.classic-turtle-water':resolveAsset('rabbit-turtle.character.classic-turtle-water')!.revision,'rabbit-turtle.character.rabbit-suspicious':resolveAsset('rabbit-turtle.character.rabbit-suspicious')!.revision}}:recipe)};
  // A combined pose next to another turtle is itself a broken recipe and is never offered.
  expect(planPicturebook(book(),all,doubled)[3]!.kind).toBe('reference');
  const third=planPicturebook(book(),all,approved)[2]!;
  expect(()=>chooseAlternative(third,undefined,'rabbit','rabbit-turtle.character.classic-riding')).toThrow('검토한 그림');
 });
 it('uses the same picture on two pages independently',()=>{
  const source=book(),twin={...source.pages[2]!,id:'twin',order:9};
  const plans=planPicturebook({...source,pages:[...source.pages,twin]},all,approved);
  const selections:Selections={twin:chooseAlternative(plans[8]!,undefined,'rabbit','rabbit-turtle.character.classic-rabbit-laugh')};
  expect(pageStage(plans[2]!,selections[plans[2]!.pageId])).toMatchObject({left:[{assetId:'rabbit-turtle.character.rabbit-suspicious'}]});
  expect(pageStage(plans[8]!,selections.twin)).toMatchObject({left:[{assetId:'rabbit-turtle.character.classic-rabbit-laugh'}]});
 });
 it('keeps the student’s own background and actors, and does not merge actors onto a finished illustration',()=>{
  const source=book();
  const pages=source.pages.map((item,index)=>index===0?{...item,backgroundId:'rabbit-turtle.background.rabbit-turtle-bg-shore',leftAssetId:'rabbit-turtle.character.rabbit-suspicious',rightAssetId:'rabbit-turtle.character.turtle-offer'}:index===1?{...item,leftAssetId:'rabbit-turtle.character.turtle-offer'}:item);
  const plans=planPicturebook({...source,pages},all,approved);
  expect(plans[0]).toMatchObject({kind:'student',student:{origin:'student',backgroundId:'rabbit-turtle.background.rabbit-turtle-bg-shore',left:[{assetId:'rabbit-turtle.character.rabbit-suspicious'}],right:[{assetId:'rabbit-turtle.character.turtle-offer'}]}});
  expect(plans[1]).toMatchObject({kind:'reference'});expect(plans[1]!.reason).toContain('인물을 더한');
  // Without the picture permission nothing is placed and nothing is asked.
  expect(planPicturebook({...source,pages},{images:false,characters:false},approved).every(plan=>plan.kind==='reference')).toBe(true);
  expect(planPicturebook({...source,pages},{images:true,characters:false},approved)[0]).toMatchObject({kind:'student',student:{left:[],right:[]}});
 });
 it('re-checks every choice before creating and refuses ones that no longer apply',()=>{
  const plans=planPicturebook(book(),all,approved),third=plans[2]!;
  const selections:Selections={[third.pageId]:chooseAlternative(third,undefined,'rabbit','rabbit-turtle.character.rabbit-shocked')};
  const stages=confirmedStages(book(),selections,all,approved);
  expect(Object.keys(stages)).toHaveLength(8);
  expect(()=>confirmedStages(book(),selections,all,empty)).toThrow('3쪽');
  expect(()=>confirmedStages(book(),{[third.pageId]:{mode:'recipe',overrides:{rabbit:'rabbit-turtle.character.dragonking-command'}}},all,approved)).toThrow();
  expect(()=>confirmedStages(book(),{gone:{mode:'reference'}},all,approved)).toThrow('바뀌었어요');
  expect(()=>confirmedStages(book(),selections,{images:false,characters:false},approved)).toThrow();
 });
 it('previews exactly the first stage that creation writes',()=>{
  const plans=planPicturebook(book(),all,approved);
  const stages=confirmedStages(book(),{},all,approved);
  const one=(prefix:string)=>{let n=0;return convertPicturebookToChapters({book:book(),stages,workId:prefix,createId:()=>`${prefix}-${++n}`,updatedAt:'2026-11-20T00:00:00.000Z'});};
  const preview=one('preview'),made=one('made');
  const strip=(value:ReturnType<typeof one>)=>value.project.lines.map(({id:_id,chapterId:_chapter,...line})=>line);
  expect(strip(preview)).toEqual(strip(made));
  expect(Object.values(stages).filter(stage=>stage.kind==='stage')).toHaveLength(plans.filter(plan=>plan.kind==='recipe').length);
 });
 it('keeps unconfirmed choices in this tab only and ignores damaged drafts',()=>{
  const memory=new Map<string,string>();const storage={getItem:(key:string)=>memory.get(key)??null,setItem:(key:string,value:string)=>void memory.set(key,value)};
  writePreparationDraft(storage,'book',{a:{mode:'reference'}},'a');
  expect(readPreparationDraft(storage,'book')).toEqual({selections:{a:{mode:'reference'}},pageId:'a',chosen:null});
  writePreparationDraft(storage,'book',{},'a',['a','c']);
  expect(readPreparationDraft(storage,'book').chosen).toEqual(['a','c']);
  memory.set('knolstory-picturebook-preparation-v1:book','{broken');
  expect(readPreparationDraft(storage,'book')).toEqual({selections:{},pageId:null,chosen:null});
 });
 it('previews recipes under review only through the reviewer source, without changing the service list',()=>{
  // Fixture: one staged page sent back to review, so the check holds even when every service recipe is approved.
  const sixth='rabbit-turtle.scene.shortstory-classic-06';
  const pending:RecipeSource={recipes:PICTUREBOOK_RECIPES.recipes.map(recipe=>recipe.sourceAssetId===sixth?{...recipe,review:'assembly-review'} as StageRecipe:recipe),resolve:resolveAsset};
  const before=JSON.stringify(PICTUREBOOK_RECIPES);
  const review=planPicturebook(book(),all,reviewRecipeSource(pending));
  const service=planPicturebook(book(),all,pending);
  expect(review[5]!.kind).toBe('recipe');expect(service[5]!.kind).toBe('reference');
  expect(review.filter(plan=>pending.recipes.find(recipe=>recipe.sourceAssetId===plan.sketch?.backgroundId)?.review==='reference-only').every(plan=>plan.kind==='reference')).toBe(true);
  expect(JSON.stringify(PICTUREBOOK_RECIPES)).toBe(before);
 }); it('says in one sentence what sending will do',()=>{
  expect(numberList([2,5,7],'쪽')).toBe('2·5·7쪽');
  expect(numberList([1,2,3],'장')).toBe('1~3장');
  expect(numberList([3,4],'장')).toBe('3·4장');
  expect(sendSummary([],8,{kind:'new'})).toBe('보낼 쪽을 하나 이상 골라 주세요.');
  expect(sendSummary([1,2,3,4,5,6,7,8],8,{kind:'new'})).toBe('8쪽 모두가 새 놀스토리의 1~8장이 돼요.');
  expect(sendSummary([2,5,7],8,{kind:'new'})).toBe('고른 2·5·7쪽이 새 놀스토리의 1~3장이 돼요.');
  expect(sendSummary([4,5],8,{kind:'existing',title:'토끼의 꾀',afterLabel:'1장',index:1,chapterCount:3,renumbers:true}))
   .toBe('고른 4·5쪽이 ‘토끼의 꾀’ 1장 뒤에 2·3장으로 들어가요. 원래 2장부터는 4장부터로 번호가 바뀌어요.');
  // At the end, or when the writer set the numbers, nothing else is renumbered.
  expect(sendSummary([4],8,{kind:'existing',title:'토끼의 꾀',afterLabel:'3장',index:3,chapterCount:3,renumbers:true})).toBe('고른 4쪽이 ‘토끼의 꾀’ 3장 뒤에 4장으로 들어가요.');
  expect(sendSummary([4],8,{kind:'existing',title:'갈래 이야기',afterLabel:null,index:0,chapterCount:3,renumbers:false})).toBe('고른 4쪽이 ‘갈래 이야기’ 맨 앞에 1장으로 들어가요.');
 });
});
