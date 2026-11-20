import {describe,expect,it} from 'vitest';
import {PICTUREBOOK_RECIPES,resolveAsset,type StageRecipe} from '@knolstory/asset-registry';
import {convertPicturebookToChapters,type PicturebookStageActor} from '../src/picturebook-chapters';
import {compileStoryScene} from '../src/story-runtime';

// Stage safety for reviewed picture-book recipes (production requests, "가려짐과 잘림의 기준").
// The dialogue box overlaps lower bodies by design and portrait crops the sides of wide art;
// a reviewed first stage must still show each figure above the box and keep the portrait figure mostly in frame.
const MAX_PORTRAIT_SIDE_CROP=.15;
const MIN_ABOVE_BOX=.1; // of stage height
// Wide art whose portrait crop was looked at on the real stage and keeps every face in frame.
const REVIEWED_PORTRAIT_CROP=new Map([
 ['rabbit-turtle.character.classic-riding',{max:.18,reason:'토끼와 자라의 얼굴은 가운데에 남고 자라 소매 끝만 화면 밖으로 나감 (2026-11-21)'}],
]);
const VIEWS=[['landscape',{width:1280,height:720}],['portrait',{width:390,height:844}]] as const;

function firstCut(recipe:StageRecipe){
 const stage=recipe.stage!;
 const actor=(a:any):PicturebookStageActor=>({assetId:a.assetId,...(a.facing?{facing:a.facing}:{}),...(a.placementPreset?{placementPreset:a.placementPreset}:{}),...(a.xAnchor!==undefined?{xAnchor:a.xAnchor}:{}),...(a.scaleMultiplier!==undefined?{scaleMultiplier:a.scaleMultiplier}:{}),...(a.subject?{subject:true}:{})});
 const page={id:'p',order:1,title:'쪽',text:'',backgroundId:'',leftAssetId:'',rightAssetId:''};
 let n=0;
 const {project,chapters}=convertPicturebookToChapters({book:{id:'b',title:'책',description:'',authorDisplayName:'',pages:[page]},
  stages:{p:{kind:'stage',origin:'approved',backgroundId:stage.backgroundId,left:(stage.left??[]).map(actor),right:(stage.right??[]).map(actor)}},
  workId:'w',createId:()=>`id-${++n}`,updatedAt:'2026-11-21T00:00:00.000Z'});
 return {project,lineId:chapters[0]!.lineId};
}

describe('reviewed picture-book first stages stay readable on both screens',()=>{
 const approved=PICTUREBOOK_RECIPES.recipes.filter(r=>r.review==='approved'&&r.stage);
 it.each(approved.map(r=>[r.sourceAssetId,r] as const))('%s',(_id,recipe)=>{
  const {project,lineId}=firstCut(recipe);
  const assetOf=new Map([...project.lines.find(l=>l.id===lineId)!.stageComposition!.leftActors,...project.lines.find(l=>l.id===lineId)!.stageComposition!.rightActors].map(a=>[a.key,a.assetId]));
  for(const [name,viewport] of VIEWS){
   const scene=compileStoryScene(project,lineId,1,{mode:'edit',viewport});
   expect(scene.actors.length).toBeGreaterThan(0);
   for(const a of scene.actors){
    const g=resolveAsset(assetOf.get(a.id)!)!.geometry!;
    const [l,r]=a.flipX?[1-g.right,1-g.left]:[g.left,g.right];
    const x0=a.rect.x+a.rect.width*l,x1=a.rect.x+a.rect.width*r,top=a.rect.y+a.rect.height*g.top;
    const crop=(Math.max(0,-x0)+Math.max(0,x1-scene.width))/(x1-x0);
    const above=(scene.textboxRect!.y-top)/scene.height;
    const assetId=assetOf.get(a.id)!;
    if(name==='portrait')expect(crop,`${assetId} portrait side crop`).toBeLessThanOrEqual(REVIEWED_PORTRAIT_CROP.get(assetId)?.max??MAX_PORTRAIT_SIDE_CROP);
    expect(above,`${assetId} above the dialogue box in ${name}`).toBeGreaterThanOrEqual(MIN_ABOVE_BOX);
   }
  }
 });
});
