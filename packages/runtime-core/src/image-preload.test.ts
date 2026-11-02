import {describe,it,expect} from 'vitest';
import {resolveAsset} from '@knolstory/asset-registry';
import {createStoryDocument,parseStoryDocument,type StoryLine,type StoryProject} from '@knolstory/story-domain';
import {createBlankStoryProject} from './authoring';
import {advancePlayback,createPlayback} from './story-runtime';
import {playbackScores} from './story-scores';
import {planStoryImagePreload} from './image-preload';

const backgrounds=['BG01-valley-day','BG02-valley-storm','BG03-valley-moon-gate','BG04-cottage-day','BG05-cottage-snow','BG06-cottage-autumn'].map(name=>`seonnyeo.background.${name}`);
const actor='seonnyeo.character.M01-base';
const path=(id:string)=>resolveAsset(id)!.runtimePath;
function project(...patches:Partial<StoryLine>[]):StoryProject{
 const blank=createBlankStoryProject({id:'preload',chapterId:'chapter',lineId:'a'});
 return {...blank,lines:patches.map((patch,index)=>({...blank.lines[0]!,id:String.fromCharCode(97+index),order:index+1,backgroundId:backgrounds[index]!,...patch}))};
}
function freeze<T>(value:T):T{
 if(value&&typeof value==='object'){Object.freeze(value);for(const item of Object.values(value))freeze(item);}
 return value;
}
const upcoming=(cutCount=3)=>({mode:'upcoming' as const,cutCount});

describe('image preloading uses the canonical scene and flow semantics',()=>{
 it('puts current images first and follows N actual future cuts rather than list neighbors',()=>{
  const p=project({flow:{type:'goto',targetLineId:'c'}},{},{},{},{}),state=createPlayback(p);
  expect(planStoryImagePreload(p,state,upcoming(1))).toEqual([path(backgrounds[0]!),path(backgrounds[2]!)]);
  expect(planStoryImagePreload(p,state,upcoming(3))).toEqual([0,2,3,4].map(index=>path(backgrounds[index]!)));
 });
 it('resolves inherited images, explicit exits, and duplicate assets once',()=>{
  const p=project({backgroundId:'',inheritActors:true},{backgroundMode:'none',stageComposition:{leftActors:[],rightActors:[]}},{backgroundId:'',inheritActors:true});
  p.stageDefaults={backgroundId:backgrounds[0]!,leftAssetId:actor,rightAssetId:''};
  expect(planStoryImagePreload(p,createPlayback(p),upcoming())).toEqual([path(backgrounds[0]!),path(actor)]);
 });
 it('prepares eligible branch heads fairly, applies hypothetical score effects, and skips hidden cuts',()=>{
  const p=project({flow:{type:'choice',options:[
   {id:'help',label:'도와준다',targetLineId:'b',effects:[{scoreId:'trust',operation:'add',value:2}]},
   {id:'pass',label:'지나간다',targetLineId:'b'},
   {id:'locked',label:'아직 고를 수 없음',targetLineId:'d',condition:{mode:'all',terms:[{scoreId:'trust',operator:'gte',value:9}]}}
  ]}},{visibility:{scores:{mode:'all',terms:[{scoreId:'trust',operator:'gte',value:1}]}}},{flow:{type:'goto',targetLineId:null}},{});
  p.scores=[{id:'trust',name:'신뢰',description:'',initial:0}];
  expect(planStoryImagePreload(p,createPlayback(p),upcoming(1))).toEqual([0,1,2].map(index=>path(backgrounds[index]!)));
 });
 it('uses the already selected choice and leaves frozen manuscript, path and scores unchanged',()=>{
  const p=project({flow:{type:'choice',options:[{id:'a',label:'갈래 A',targetLineId:'b',effects:[{scoreId:'trust',operation:'add',value:2}]},{id:'b',label:'갈래 B',targetLineId:'c'}]}},{flow:{type:'goto',targetLineId:'d'}},{flow:{type:'goto',targetLineId:null}},{});
  p.scores=[{id:'trust',name:'신뢰',description:'',initial:0}];
  const state=advancePlayback(p,createPlayback(p),'a'),before=JSON.stringify({p,state});freeze(p);freeze(state);
  expect(planStoryImagePreload(p,state,upcoming(3))).toEqual([1,3].map(index=>path(backgrounds[index]!)));
  expect(JSON.stringify({p,state})).toBe(before);expect(playbackScores(p,state)).toEqual({trust:2});
 });
 it('omits only failed hypothetical score successors while preparing safe siblings and deeper choices',()=>{
  const overflowing={scoreId:'trust',operation:'add' as const,value:1};
  const p=project({flow:{type:'choice',options:[
   {id:'overflow-now',label:'점수 초과',targetLineId:'c',effects:[overflowing]},
   {id:'safe',label:'계속',targetLineId:'b'}
  ]}},{flow:{type:'choice',options:[
   {id:'overflow-later',label:'다음 점수 초과',targetLineId:'c',effects:[overflowing]},
   {id:'safe-later',label:'안전한 다음 컷',targetLineId:'d'}
  ]}},{flow:{type:'goto',targetLineId:null}},{flow:{type:'goto',targetLineId:null}});
  p.scores=[{id:'trust',name:'신뢰',description:'',initial:1000000}];
  expect(parseStoryDocument(createStoryDocument({project:p,savedAt:p.updatedAt,appVersion:'test'})).ok).toBe(true);
  const state=freeze(createPlayback(p)),before=JSON.stringify({p,state});freeze(p);
  expect(()=>advancePlayback(p,state,'overflow-now')).toThrow('이야기 점수');
  expect(planStoryImagePreload(p,state,upcoming(3))).toEqual([0,1,3].map(index=>path(backgrounds[index]!)));
  expect(JSON.stringify({p,state})).toBe(before);expect(playbackScores(p,state)).toEqual({trust:1000000});
 });
 it('does not suppress current image resolution errors as speculative failures',()=>{
  const p=project({backgroundId:'missing-background'});
  expect(()=>planStoryImagePreload(p,createPlayback(p),upcoming())).toThrow('이미지 자산을 찾을 수 없어요');
 });
 it('can look past manual effects without consuming actual effect steps',()=>{
  const p=project({presentation:{effects:[{id:'tap',type:'shake',trigger:'on-click'}]}},{}),state=freeze(createPlayback(p));
  expect(planStoryImagePreload(p,state,upcoming(1))).toEqual([0,1].map(index=>path(backgrounds[index]!)));
  expect(state.effectStep).toBeUndefined();
 });
 it('respects endings, disconnected targets and cyclic stories',()=>{
  const ended=project({flow:{type:'goto',targetLineId:null}},{});
  expect(planStoryImagePreload(ended,createPlayback(ended),upcoming())).toEqual([path(backgrounds[0]!)]);
  expect(planStoryImagePreload(ended,advancePlayback(ended,createPlayback(ended)),upcoming())).toEqual([]);
  const pending=project({flow:{type:'goto',targetLineId:''}},{});
  expect(planStoryImagePreload(pending,createPlayback(pending),upcoming())).toEqual([path(backgrounds[0]!)]);
  const cycle=project({flow:{type:'goto',targetLineId:'b'}},{flow:{type:'goto',targetLineId:'a'}});
  expect(planStoryImagePreload(cycle,createPlayback(cycle),upcoming(10))).toEqual([0,1].map(index=>path(backgrounds[index]!)));
 });
 it('current-chapter and whole-work modes use images actually resolved by authored cuts, current first',()=>{
  const p=project({}, {chapterId:'other'}, {}, {chapterId:'other'});
  p.chapters=[...p.chapters,{...p.chapters[0]!,id:'other',order:2}];
  p.chapters[0]={...p.chapters[0]!,backgroundAssetIds:[backgrounds[5]!]};
  const state=createPlayback(p,'c');
  expect(planStoryImagePreload(p,state,{mode:'chapter',cutCount:3})).toEqual([2,0].map(index=>path(backgrounds[index]!)));
  expect(planStoryImagePreload(p,state,{mode:'work',cutCount:3})).toEqual([2,0,1,3].map(index=>path(backgrounds[index]!)));
  expect(planStoryImagePreload(p,state,{mode:'none',cutCount:3})).toEqual([]);
 });
 it('bounds branching expansion without changing the real decision history',()=>{
  const p=project(...Array.from({length:6},(_,index)=>({flow:{type:'choice' as const,options:Array.from({length:4},(_,n)=>({id:`pick-${n}`,label:`갈래 ${n}`,targetLineId:String.fromCharCode(97+(index+1)%6)}))}})));
  const state=freeze(createPlayback(p));const first=planStoryImagePreload(p,state,upcoming(10));
  expect(first.length).toBeLessThanOrEqual(6);expect(planStoryImagePreload(p,state,upcoming(10))).toEqual(first);expect(state.choiceHistory).toBeUndefined();
 });
 it('rejects invalid window sizes and modes before planning',()=>{
  const p=project({}),state=createPlayback(p);
  for(const cutCount of [0,11,1.5,NaN,Infinity])expect(()=>planStoryImagePreload(p,state,upcoming(cutCount))).toThrow();
  expect(()=>planStoryImagePreload(p,state,{mode:'everything' as never,cutCount:3})).toThrow();
 });
});
