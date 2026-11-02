import {it,expect} from 'vitest';
import {writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {representativeStories,classicStories,resolveProvidedCatalogStory} from '../../../../packages/compatibility/src';
import {advancePlayback,advanceEffectPlayback,createPlayback,compileStoryScene,type PlaybackState} from '../../../../packages/runtime-core/src/story-runtime';
import {playbackScores} from '../../../../packages/runtime-core/src/story-scores';
import {sceneSemanticHash} from './scene-semantics';
const hash=(value:unknown)=>createHash('sha256').update(JSON.stringify(value,(_k,v:unknown)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))):v)).digest('hex');
type Step={lineId:string;textSha256:string;semanticSha256:string[]};
type Route={id:string;decisions:Array<{lineId:string;choiceId:string;label:string}>;steps:Step[];terminalLineId:string;finalState:PlaybackState;coverageKeys:string[]};
it('enumerates every current Seonnyeo path and selects a complete semantic/edge cover without relabelling unrun combinations',()=>{
 const editions=[{entry:representativeStories.find(e=>e.id==='seonnyeo')!,edition:'knolstory',expected:64},{entry:classicStories.find(e=>e.id==='seonnyeo-classic')!,edition:'original',expected:1}].map(({entry,edition,expected})=>{
  const project=resolveProvidedCatalogStory(entry.project),byId=new Map(project.lines.map(line=>[line.id,line])),routes:Route[]=[];
  function visit(state:PlaybackState,steps:Step[],decisions:Route['decisions'],keys:string[]){
   const line=byId.get(state.lineId!)!;expect(line).toBeDefined();expect(steps.some(step=>step.lineId===line.id),'cycles need explicit review').toBe(false);
   let ready=state;const scenes=[];
   for(let i=0;i<4;i++){
    scenes.push(compileStoryScene(project,line.id,1,{mode:'play',viewport:{width:1280,height:720},displaySize:{width:1280,height:720},dialogueDock:{bottomInsetPx:0,safeBottomPx:0},playbackState:ready,playbackPath:ready.path}));
    const next=advanceEffectPlayback(project,ready);if(next===ready)break;ready=next;
   }
   const scene=scenes[0],signatures=scenes.map(s=>sceneSemanticHash(s));
   const nextSteps=[...steps,{lineId:line.id,textSha256:createHash('sha256').update(scene.dialogue.text).digest('hex'),semanticSha256:signatures}];
   const visitKeys=[...keys,...signatures.map(sha=>'scene:'+sha),'scores:'+line.id+':'+hash(playbackScores(project,state))];
   const options=scene.choices?.length?scene.choices.map(option=>({choiceId:option.id,label:option.text})):[undefined];
   for(const option of options){
    const next=advancePlayback(project,ready,option?.choiceId),nextDecisions=option?[...decisions,{lineId:line.id,...option}]:decisions;
    expect(['pending','approval-required']).not.toContain(next.status);
    const nextKeys=[...visitKeys,'edge:'+line.id+':'+(option?.choiceId??'next')+':'+(next.lineId??'ended')];
    if(next.status==='ended')routes.push({id:`${edition}-${routes.length+1}`,decisions:nextDecisions,steps:nextSteps,terminalLineId:line.id,finalState:next,coverageKeys:[...new Set([...nextKeys,'ending:'+line.id])].sort()});else visit(next,nextSteps,nextDecisions,nextKeys);
   }
  }
  visit(createPlayback(project),[],[],[]);expect(routes).toHaveLength(expected);
  return {workId:'seonnyeo',edition,projectId:project.id,title:project.title,projectSha256:hash(project),routes};
 });
 const selected=editions.map(edition=>{
  const universe=new Set(edition.routes.flatMap(r=>r.coverageKeys)),uncovered=new Set(universe),picked:Route[]=[];
  while(uncovered.size){
   const candidates=edition.routes.filter(r=>!picked.includes(r)).map(route=>({route,gain:route.coverageKeys.filter(k=>uncovered.has(k)).length})).sort((a,b)=>b.gain-a.gain||a.route.steps.length-b.route.steps.length||a.route.id.localeCompare(b.route.id));
   expect(candidates[0]?.gain).toBeGreaterThan(0);picked.push(candidates[0].route);for(const key of candidates[0].route.coverageKeys)uncovered.delete(key);
  }
  expect(new Set(picked.flatMap(r=>r.coverageKeys)).size).toBe(universe.size);
  return {...edition,routes:picked,coverage:{totalPaths:edition.routes.length,selectedPaths:picked.map(r=>r.id),unrunFullCombinations:edition.routes.filter(r=>!picked.includes(r)).map(r=>r.id),uniqueSemanticStates:[...universe].filter(k=>k.startsWith('scene:')).length,uniqueEdges:[...universe].filter(k=>k.startsWith('edge:')).length,uniqueScoreStates:[...universe].filter(k=>k.startsWith('scores:')).length,endings:[...universe].filter(k=>k.startsWith('ending:')),uncovered:0}};
 });
 const basis='Current official resolver + Core all paths; expected data only. Selected complete routes cover all resolved semantic scene states, manual steps, score states, edges/merge entrances and endings. Other full native combinations remain explicitly unrun.';
 for(const [name,value] of [['manifest-seonnyeo-all.json',editions],['manifest-seonnyeo-selected.json',selected]] as const)writeFileSync(new URL('./'+name,import.meta.url),JSON.stringify({version:1,basis,editions:value},null,2)+'\n');
 console.log('[Seonnyeo coverage]',JSON.stringify(selected.map(e=>({edition:e.edition,cutReads:e.routes.reduce((n,r)=>n+r.steps.length,0),...e.coverage}))));
},120000);
