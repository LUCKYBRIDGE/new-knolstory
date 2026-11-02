import {it,expect} from 'vitest';
import {writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {representativeStories,classicStories,resolveProvidedCatalogStory} from '../../../../packages/compatibility/src';
import {advancePlayback,advanceEffectPlayback,createPlayback,compileStoryScene,type PlaybackState} from '../../../../packages/runtime-core/src/story-runtime';
const canonical=(value:unknown):string=>JSON.stringify(value,(_key,item:unknown)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.entries(item).sort(([a],[b])=>a.localeCompare(b))):item);
for(const [workId,classicId,pathCount,output] of [['heungbu','heungbu-classic',4,'manifest.json'],['rabbit','rabbit-classic',6,'manifest-rabbit.json']] as const)it(`exports current ${workId} complete paths`,()=>{
 const editions=[{entry:representativeStories.find(e=>e.id===workId)!,edition:'knolstory',expected:pathCount},{entry:classicStories.find(e=>e.id===classicId)!,edition:'original',expected:1}];
 const result=editions.map(({entry,edition,expected})=>{
  const project=resolveProvidedCatalogStory(entry.project),byId=new Map(project.lines.map(line=>[line.id,line]));
  const routes:Array<{id:string;decisions:Array<{lineId:string;choiceId:string;label:string}>;steps:Array<{lineId:string;textSha256:string}>;terminalLineId:string;finalState:PlaybackState}>=[];
  function visit(state:PlaybackState,steps:Array<{lineId:string;textSha256:string}>,decisions:Array<{lineId:string;choiceId:string;label:string}>){
   expect(state.lineId).not.toBeNull();const line=byId.get(state.lineId!)!;expect(line).toBeDefined();expect(steps.some(step=>step.lineId===line.id),'cycles must be reviewed explicitly').toBe(false);
   const scene=compileStoryScene(project,line.id,1,{mode:'play',playbackState:state,playbackPath:state.path});
   const nextSteps=[...steps,{lineId:line.id,textSha256:createHash('sha256').update(scene.dialogue.text).digest('hex')}];
   let ready=state;for(let n=0;n<4;n++){const next=advanceEffectPlayback(project,ready);if(next===ready)break;ready=next;}
   const options=scene.choices.length?scene.choices.map(option=>({choiceId:option.id,label:option.text})): [undefined];
   for(const option of options){
    const next=advancePlayback(project,ready,option?.choiceId),nextDecisions=option?[...decisions,{lineId:line.id,...option}]:decisions;
    expect(['pending','approval-required']).not.toContain(next.status);
    if(next.status==='ended'){expect(next.lineId).toBeNull();routes.push({id:`${edition}-${routes.length+1}`,decisions:nextDecisions,steps:nextSteps,terminalLineId:line.id,finalState:next});}
    else visit(next,nextSteps,nextDecisions);
   }
  }
  visit(createPlayback(project),[],[]);expect(routes).toHaveLength(expected);
  return {workId,edition,projectId:project.id,title:project.title,projectSha256:createHash('sha256').update(canonical(project)).digest('hex'),routes};
 });
 writeFileSync(new URL('./'+output,import.meta.url),JSON.stringify({version:1,basis:'Current resolveProvidedCatalogStory + Runtime Core complete traversal; expected data only, never injected into the browser',editions:result},null,2)+'\n');
});
