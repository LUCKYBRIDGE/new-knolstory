import {describe,expect,it} from 'vitest';
import {resolveAsset} from '@knolstory/asset-registry';
import {compileStoryScene,createBlankStoryProject,patchStoryLine} from '../src';
import {stageCharacterScale,stageReadableCharacterScale} from '../src/stage-view';

const adult='heungbu.character.heungbu-default';
const first='heungbu.character.child-01',second='heungbu.character.child-02';
const seatedGirl='heungbu.character.child-06',standingGirl='creative.character.heungbu-girl-standing';
const viewports=[{width:1280,height:720},{width:720,height:1280}];
function fraction(id:string){const geometry=resolveAsset(id)!.geometry!;return geometry.bottom-geometry.top;}
function sceneFor(id:string,viewport:typeof viewports[number],mode:'edit'|'play',scaleMultiplier=1,xAnchor?:number){
 const project=patchStoryLine(createBlankStoryProject({id:'stature',chapterId:'ch',lineId:'cut'}),'cut',{type:'dialogue',speaker:'left',speakerName:'인물',text:'인물의 키와 자세는 원본 그림에 표현된 차이를 유지합니다.',stageComposition:{leftActors:[{key:'actor',assetId:id,scaleMultiplier,facing:'original',...(xAnchor===undefined?{}:{xAnchor})}],rightActors:[]}});
 const before=JSON.stringify(project),scene=compileStoryScene(project,'cut',1,{mode,viewport});
 expect(JSON.stringify(project)).toBe(before);expect(scene.actors).toHaveLength(1);
 return scene;
}
function paintedHeight(id:string,viewport:typeof viewports[number],mode:'edit'|'play'){
 return sceneFor(id,viewport,mode).actors[0].rect.height*fraction(id);
}

describe('default character stature shared by reading and editing',()=>{
 for(const viewport of viewports)for(const mode of ['edit','play'] as const){
  it(`${mode} ${viewport.width}x${viewport.height}: preserves older/younger child and adult relative heights`,()=>{
   const heights=[adult,first,second,seatedGirl].map(id=>paintedHeight(id,viewport,mode));
   expect(heights[1]).toBeLessThan(heights[0]);expect(heights[2]).toBeLessThan(heights[1]);expect(heights[3]).toBeLessThan(heights[2]);
   for(const [index,id] of [adult,first,second,seatedGirl].entries())expect(heights[index]/heights[0]).toBeCloseTo(fraction(id)/fraction(adult),6);
  });
  it(`${mode} ${viewport.width}x${viewport.height}: retains seated poses instead of enlarging them to standing height`,()=>{
   for(const [standing,seated] of [[standingGirl,seatedGirl],['heungbu.character.nolbu-default','heungbu.character.nolbu-ruined-seated']]){
    const ratio=paintedHeight(seated,viewport,mode)/paintedHeight(standing,viewport,mode);
    expect(ratio).toBeLessThan(.85);expect(ratio).toBeCloseTo(fraction(seated)/fraction(standing),6);
   }
  });
  it(`${mode} ${viewport.width}x${viewport.height}: keeps Onggojib child's encoded stature and authored scaling`,()=>{
   const id='onggojib.character.child-pixel',master='onggojib.character.real-consistent-pixel';
   expect(paintedHeight(id,viewport,mode)/paintedHeight(master,viewport,mode)).toBeCloseTo(fraction(id)/fraction(master),6);
   const plain=sceneFor(second,viewport,mode),scaled=sceneFor(second,viewport,mode,.8,40),actor=scaled.actors[0];
   expect(actor.rect.height/plain.actors[0].rect.height).toBeCloseTo(.8,6);expect(actor.flipX).toBe(false);
   if(viewport.width>viewport.height)expect(actor.rect.x+actor.rect.width/2).toBeCloseTo(scaled.width*.4,6);
  });
 }
 it('uses padded child artwork at default scale without applying a second runtime shrink',()=>{
  const cases=[
   {id:'rabbit-turtle.character.turtle-child-unified-720x900',adult:'rabbit-turtle.character.turtle-unified-720x900',maxFraction:.7,maxRatio:.8},
   {id:'rabbit-turtle.character.turtle-child-flashback',adult:'rabbit-turtle.character.turtle-unified-720x900',maxFraction:.7,maxRatio:.8},
   {id:'seonnyeo.character.classic-children',adult:'seonnyeo.character.M02-axe',maxFraction:.6,maxRatio:.7},
  ];
  for(const {id,adult:adultId,maxFraction,maxRatio} of cases){
   const geometry=resolveAsset(id)!.geometry!;
   expect([geometry.width,geometry.height]).toEqual([800,1200]);
   expect(fraction(id)).toBeLessThan(maxFraction);
   expect(stageCharacterScale(id)).toBe(1);expect(stageReadableCharacterScale(id)).toBe(1);
   for(const viewport of viewports)for(const mode of ['edit','play'] as const){
    const ratio=paintedHeight(id,viewport,mode)/paintedHeight(adultId,viewport,mode);
    expect(ratio).toBeLessThan(maxRatio);expect(ratio).toBeCloseTo(fraction(id)/fraction(adultId),6);
    const original=sceneFor(id,viewport,mode),scaled=sceneFor(id,viewport,mode,.8);
    expect(scaled.actors[0].rect.height/original.actors[0].rect.height).toBeCloseTo(.8,6);
   }
  }
  expect(stageCharacterScale('seonnyeo.character.classic-fairy-carrying-children')).toBe(1);
  expect(stageReadableCharacterScale('seonnyeo.character.classic-fairy-celestial-holding-first-baby')).toBe(1);
 });
 it('retains mounted, animal and prop exceptions while keeping upper-body portraits readable',()=>{
  for(const [id,scale] of [['seonnyeo.character.classic-woodcutter-riding-horse',1.4],['seonnyeo.character.classic-deer',.72],['seonnyeo.character.classic-rooster-calling-sky',.48],['seonnyeo.character.classic-wing-robe',.65]] as const){
   expect(resolveAsset(id)).toBeDefined();expect(stageCharacterScale(id)).toBe(scale);expect(stageReadableCharacterScale(id)).toBe(scale);
  }
  const upper='rabbit-turtle.character.classic-turtle-water';expect(resolveAsset(upper)!.framing).toBe('상반신');
  expect(stageReadableCharacterScale(upper)*fraction(upper)).toBeCloseTo(.82,6);
  expect(stageReadableCharacterScale('unknown')).toBe(1);
 });
});
