import {currentCatalogVisuals} from './current-catalog-visuals';
import {simplifyCatalogPerspectiveCard} from '../src/catalog-perspective-card';
import {describe,expect,it} from 'vitest';
import {orderedStoryFlowLines,storyFlowTargets,type StoryProject} from '@knolstory/story-domain';
import {advanceEffectPlayback,advancePlayback,createPlayback,type PlaybackState} from '../../runtime-core/src/story-runtime';
import {representativeStories,classicStories,resolveProvidedCatalogStory,refineProvidedStory,enhanceExistingStory} from '../src';
import {connectCatalogPerspective} from '../src/catalog-perspective';
import {connectCatalogChapterIdentity} from '../src/catalog-chapter-identity';
import {connectCatalogNarrativeSeams} from '../src/catalog-narrative-seams';
import {createAuthoringArchive,decodeAuthoringArchive,encodeAuthoringArchive} from '../src/authoring-archive';
import {exportAuthoringExcel,importAuthoringExcel} from '../src/authoring-workbook/excel';
const prior=(project:StoryProject)=>simplifyCatalogPerspectiveCard(connectCatalogNarrativeSeams(connectCatalogChapterIdentity(connectCatalogPerspective(enhanceExistingStory(refineProvidedStory(project))))));
const current=(id:string)=>resolveProvidedCatalogStory(representativeStories.find(s=>s.id===id)!.project);
function paths(project:StoryProject){
 const lines=orderedStoryFlowLines(project),indices=new Map(lines.map((l,i)=>[l.id,i])),out:string[][]=[];
 function visit(index:number,path:string[]){const line=lines[index];expect(path.includes(line.id),'reading path must not replay the same cut').toBe(false);const next=[...path,line.id];for(const target of storyFlowTargets(lines,index)){if(target===null)out.push(next);else {expect(indices.has(target),target).toBe(true);visit(indices.get(target)!,next);}}}
 visit(0,[]);return out;
}
function play(project:StoryProject,decisions:readonly string[]){
 const byId=new Map(project.lines.map(l=>[l.id,l]));let state:PlaybackState=createPlayback(project),choice=0;const read:string[]=[];
 for(let step=0;step<project.lines.length*2&&state.lineId!==null;step++){
  const line=byId.get(state.lineId)!;read.push(line.text);let ready=advanceEffectPlayback(project,state);while(ready!==state){state=ready;ready=advanceEffectPlayback(project,state);}
  state=advancePlayback(project,state,line.flow?.type==='choice'?decisions[choice++]:undefined);
 }
 expect(state.status).toBe('ended');expect(choice).toBe(decisions.length);return {state,read};
}
describe('reviewed catalog choice memory',()=>{
 it('does not assert a debt after the family declined the grain loan',()=>{
  const p=current('heungbu');expect(p.lines.find(l=>l.id==='scene-7-13')!.text).toContain('빌린 것이 있으면 갚았다.');
 });
 it('counts the concealed robe from discovery day to the third evening in both memory variants',()=>{
  const p=current('seonnyeo');for(const variant of ['v30','v108']){
   expect(p.lines.find(l=>l.id===`E3-1-${variant}-7`)!.text).toBe('“이틀 전에 찾았소.”');
   expect(p.lines.find(l=>l.id===`E3-1-${variant}-8`)!.text).toBe('“이틀?”');
  }
 });
 it('does not make the rabbit remember both mutually exclusive invitations at the common palace scene',()=>{
  const p=current('rabbit'),byId=new Map(p.lines.map(l=>[l.id,l]));
  for(const id of [3,4,15,16])expect(byId.get(`review-main-002:palace:${id}`)!.text).not.toMatch(/잔치|병자|병든/u);
  expect(byId.get('review-main-002:palace:17')!.text).toContain('가장 중요한 이야기');
  expect(byId.get('review-main-002:palace:18')!.text).toContain('죽을 수도');
 });
 for(const [id,count] of [['seonnyeo',64],['heungbu',4],['onggojib',16],['rabbit',6]] as const)it(`${id}: all ${count} complete reading routes and endings remain the same`,()=>{
  const source=representativeStories.find(s=>s.id===id)!.project,before=currentCatalogVisuals(prior(source)),after=resolveProvidedCatalogStory(source);
  const beforePaths=paths(before),afterPaths=paths(after);expect(afterPaths).toHaveLength(count);expect(afterPaths).toEqual(beforePaths);
  expect(after.lines.map(({text:_text,...line})=>line)).toEqual(before.lines.map(({text:_text,...line})=>line));
  expect({...after,lines:before.lines}).toEqual(before);
 });
 it('Core reaches all rabbit endings after either invitation without replaying the other invitation',()=>{
  const p=current('rabbit');for(const invite of ['obey','hesitate'])for(const ending of [['truth'],['shield','exile'],['shield','return']]){
   const result=play(p,[invite,...ending]);expect(result.state.path.some(id=>id.includes(invite==='obey'?':hesitate-route:':':obey-route:'))).toBe(false);
   expect(result.read).not.toContain('잔치 이야기를 했든…');expect(result.read).not.toContain('병든 이를 도와달라고 했든…');
  }
 },30000);
 it('changes only nine reviewed cuts and preserves old official editions, authored works and both file formats',async()=>{
  let changed=0;for(const entry of [...representativeStories,...classicStories]){
   const before=prior(entry.project),after=resolveProvidedCatalogStory(entry.project,before);changed+=after.lines.filter((l,i)=>l.text!==before.lines[i].text).length;
   const edited={...before,title:before.title+' 내가 편집함'};expect(resolveProvidedCatalogStory(entry.project,edited)).toBe(edited);
   const document={documentType:'story-maker-project' as const,schemaVersion:8 as const,savedAt:'2026-11-01T00:00:00.000Z',appVersion:'test',project:after};
   const archive=await createAuthoringArchive({format:'knolstory',document});expect(await decodeAuthoringArchive(await encodeAuthoringArchive(archive))).toEqual(archive);expect(await importAuthoringExcel(await exportAuthoringExcel(archive))).toEqual(archive);
  }expect(changed).toBe(9);
 },60000);
});
