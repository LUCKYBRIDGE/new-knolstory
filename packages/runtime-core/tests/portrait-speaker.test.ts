import {describe,it,expect} from 'vitest';
import {createBlankStoryProject,patchStoryLine,compileStoryScene} from '../src';
const left='onggojib.character.child-pixel',right='onggojib.character.classic-master';
function project(){return patchStoryLine(createBlankStoryProject({id:'p',chapterId:'c',lineId:'l'}),'l',{type:'dialogue',speaker:'right',speakerName:'어른',stageComposition:{leftActors:[{key:'child',assetId:left}],rightActors:[{key:'adult',assetId:right}],speakerActorKey:'adult'}});}
describe('portrait primary speaker only',()=>{
 it('shows exactly the primary speaker centered without mutating the composition',()=>{
  const p=project(),before=JSON.stringify(p),scene=compileStoryScene(p,'l',1,{mode:'play',viewport:{width:390,height:844}});
  expect(scene.actors.map(a=>a.id)).toEqual(['adult']);expect(scene.actors[0].emphasis).toBe('normal');expect(scene.actors[0].handle!.y).toBeGreaterThanOrEqual(8);expect(scene.actors[0].handle!.x).toBeCloseTo(scene.width/2);
  expect(JSON.stringify(p)).toBe(before);
  expect(compileStoryScene(p,'l',2,{mode:'play',viewport:{width:844,height:390}}).actors).toHaveLength(2);
 });
 it('keeps narration, no-image POV and choices without a designated speaker empty',()=>{
  const p=project();for(const patch of [{type:'narration' as const,speaker:'narration' as const},{stageComposition:{leftActors:[],rightActors:[]},speakerName:'나'}]) {
   const next=patchStoryLine(p,'l',patch);expect(compileStoryScene(next,'l',1,{mode:'play',viewport:{width:360,height:800}}).actors).toEqual([]);
  }
 });
});
