import {it,expect} from 'vitest';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {representativeStories,resolveProvidedCatalogStory} from '../../../../../packages/compatibility/src';
import {advancePlayback,advanceEffectPlayback,createPlayback,compileStoryScene,type PlaybackState} from '../../../../../packages/runtime-core/src/story-runtime';
const canonical=(value:unknown)=>JSON.stringify(value,(_k,v:unknown)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))):v);
const sha=(value:unknown)=>createHash('sha256').update(canonical(value)).digest('hex');
it('preserves all64 established choice/merge/ending paths and all nonbackground scene fields',()=>{
 const source=representativeStories.find(e=>e.id==='seonnyeo')!.project,current=resolveProvidedCatalogStory(source);
 // Weather is the final exact-catalog background-only transform; reconstruct the sealed
 // previous version with its original background references, not with modified prose/Flow.
 const old={...current,lines:current.lines.map(line=>({...line,backgroundId:source.lines.find(s=>s.id===line.id)!.backgroundId}))};
 const manifest=JSON.parse(readFileSync(new URL('../../catalog-native-paths-2026-11-02/manifest-seonnyeo-all.json',import.meta.url),'utf8'));
 const edition=manifest.editions.find((e:{edition:string})=>e.edition==='knolstory');expect(sha(old)).toBe(edition.projectSha256);
 const deltas=current.lines.flatMap((line,i)=>line.backgroundId!==old.lines[i].backgroundId?[{lineId:line.id,chapterId:line.chapterId,before:old.lines[i].backgroundId,after:line.backgroundId}]:[]);
 expect(deltas).toHaveLength(233);let visits=0;
 for(const route of edition.routes){
  let state:PlaybackState=createPlayback(current);
  for(const step of route.steps){
   expect(state.lineId).toBe(step.lineId);const options={mode:'play' as const,viewport:{width:1280,height:720},displaySize:{width:1280,height:720},dialogueDock:{bottomInsetPx:0,safeBottomPx:0},playbackState:state,playbackPath:state.path};
   const previous=compileStoryScene(old,step.lineId,1,options),next=compileStoryScene(current,step.lineId,1,options);
   const {background:_oldBackground,...oldScene}=previous,{background:_newBackground,...newScene}=next;
   expect(newScene).toEqual(oldScene);expect(createHash('sha256').update(next.dialogue.text).digest('hex')).toBe(step.textSha256);
   const corrected=deltas.some(d=>d.lineId===step.lineId);if(!corrected)expect(next.background).toEqual(previous.background);
   for(let n=0;n<4;n++){const ready=advanceEffectPlayback(current,state);if(ready===state)break;state=ready;}
   state=advancePlayback(current,state,route.decisions.find((d:{lineId:string})=>d.lineId===step.lineId)?.choiceId);visits++;
  }
  expect(state).toEqual(route.finalState);
 }
 const result={verifiedAt:'2026-11-02',scope:'Current official Seonnyeo64 Core paths; only233background references differ from sealed pre-weather native input. Not a new64native run.',previousProjectSha256:sha(old),currentProjectSha256:sha(current),paths:edition.routes.length,cutVisits:visits,changedCutCount:deltas.length,nonBackgroundScenesUnchanged:true,allFinalPlaybackUnchanged:true,deltas};
 writeFileSync(new URL('../path-delta.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
},120000);
