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
 it('keeps no-image POV empty and uses the designated narrative focus without changing speakers',()=>{
  const narrated=patchStoryLine(project(),'l',{type:'narration',speaker:'narration',stageComposition:project().lines[0].stageComposition});
  expect(compileStoryScene(narrated,'l',1,{mode:'play',viewport:{width:360,height:800}}).actors.map(a=>a.id)).toEqual(['adult']);
  const p=project();for(const patch of [{stageComposition:{leftActors:[],rightActors:[]},speakerName:'나'}]) {
   const next=patchStoryLine(p,'l',patch);expect(compileStoryScene(next,'l',1,{mode:'play',viewport:{width:360,height:800}}).actors).toEqual([]);
  }
 });
});

it('uses a narrative subject without a speaker and keeps choice overlays clear',()=>{
 const p=project(),stage={leftActors:p.lines[0].stageComposition!.leftActors,rightActors:p.lines[0].stageComposition!.rightActors};
 const narrated=patchStoryLine(p,'l',{type:'narration',speaker:'narration',stageComposition:stage});
 expect(compileStoryScene(narrated,'l',1,{mode:'play',viewport:{width:390,height:844}}).actors.map(a=>a.id)).toEqual(['child']);
 const choice=patchStoryLine(narrated,'l',{flow:{type:'choice',options:[{id:'a',label:'끝내기',targetLineId:null},{id:'b',label:'다른 끝',targetLineId:null}]}});
 expect(compileStoryScene(choice,'l',1,{mode:'play',viewport:{width:390,height:844}}).actors).toEqual([]);
});
