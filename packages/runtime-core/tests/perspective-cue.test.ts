import {describe,it,expect} from 'vitest';
import {isRuntimeScene} from '@knolstory/runtime-contract';
import {createBlankStoryProject,patchStoryLine,compileStoryScene} from '../src';
const transition={type:'perspective-blackout' as const,title:'부인의 시점',mode:'confirm' as const};
const base=()=>patchStoryLine(createBlankStoryProject({id:'p',chapterId:'c',lineId:'l'}),'l',{
 type:'narration',speaker:'narration',speakerName:'시점 전환',text:'부인의 시점',presentation:{transition},
});
describe('presentation-only viewpoint cues',()=>{
 it('classifies only the explicit matching cue in playback and preserves the authored manuscript',()=>{
  const project=base(),before=JSON.stringify(project);
  const scene=compileStoryScene(project,'l',1,{mode:'play'});
  expect(scene.transitionOnly).toBe(true);expect(scene.dialogue.text).toBe('부인의 시점');
  expect(compileStoryScene(project,'l',2,{mode:'edit'}).transitionOnly).toBeUndefined();
  expect(JSON.stringify(project)).toBe(before);expect(isRuntimeScene(scene)).toBe(true);
 });
 it('keeps actual narration, dialogue, unmarked cues, choices, routes and endings',()=>{
  const project=base();
  const variants=[{text:'부인은 마당에 섰다.'},{type:'dialogue' as const},{speakerName:'해설'},
   {presentation:undefined},{presentation:{transition:{...transition,title:''}}},
   {presentation:{transition:{...transition,type:'fade-black' as const}}},
   {flow:{type:'goto' as const,targetLineId:'l'}},
   {flow:{type:'choice' as const,options:[{id:'a',label:'계속',targetLineId:'l'},{id:'b',label:'다시',targetLineId:'l'}]}},
   {ending:{name:'끝',description:'',endsStory:true}}];
  for(const patch of variants){
   const changed=patchStoryLine(project,'l',patch);
   expect(compileStoryScene(changed,'l',1,{mode:'play'}).transitionOnly,JSON.stringify(patch)).toBeUndefined();
  }
 });
 it('rejects malformed runtime flags and flags that would hide story content',()=>{
  const scene=compileStoryScene(base(),'l',1,{mode:'play'});
  for(const transitionOnly of ['true',1,null])expect(isRuntimeScene({...scene,transitionOnly})).toBe(false);
  expect(isRuntimeScene({...scene,mode:'edit'})).toBe(false);
  expect(isRuntimeScene({...scene,dialogue:{...scene.dialogue,text:'실제 본문'}})).toBe(false);
  expect(isRuntimeScene({...scene,choices:[{id:'a',text:'선택'}]})).toBe(false);
  expect(isRuntimeScene({...scene,ended:true})).toBe(false);
 });
});
