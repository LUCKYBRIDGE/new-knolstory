import {describe,it,expect} from 'vitest';
import {createBlankStoryProject,duplicateStoryCut,insertStoryCut,patchStoryLine,splitStoryCut} from "../src";

import {getRepresentativeStory} from '@knolstory/compatibility';
import {compileStoryScene} from '../src/story-runtime';
import {createStoryDocument,serializeStoryDocument,parseStoryDocument,isStageComposition} from '@knolstory/story-domain';
describe('actor timing resolved in canonical layout',()=>{
 it('resolves authored entry, exit and movement without mutating placement',()=>{
  const p=getRepresentativeStory('onggojib').project,l=p.lines[0];
  const a={key:'actor',assetId:'onggojib.character.classic-master',xAnchor:60,motion:{type:'move' as const,fromXAnchor:30,durationMs:900,delayMs:100}};
  const project={...p,lines:p.lines.map(line=>line.id===l.id?{...line,type:'dialogue' as const,speaker:'left' as const,speakerName:'어른',inheritActors:false,stageComposition:{leftActors:[a],rightActors:[],speakerActorKey:'actor'}}:line)};
  const scene=compileStoryScene(project,l.id,1,{mode:'play',viewport:{width:390,height:844}});
  const wide=compileStoryScene(project,l.id,1,{mode:'play',viewport:{width:1280,height:720}});
  expect(scene.actors[0].motion).toMatchObject({version:1,type:'move',durationMs:900,delayMs:100});
  expect(wide.actors[0].motion?.offsetX).toBeCloseTo((.3-.6)*wide.width);
  expect(scene.actors[0].motion?.offsetX).toBeCloseTo(wide.actors[0].motion!.offsetX*scene.width/wide.width);
  expect(a.xAnchor).toBe(60);
  const restored=parseStoryDocument(serializeStoryDocument(createStoryDocument({project,savedAt:'2026-10-07T00:00:00.000Z',appVersion:'test'})));expect(restored.ok).toBe(true);if(restored.ok)expect(restored.document.project.lines[0].stageComposition?.leftActors[0].motion).toEqual(a.motion);
  for(const type of ['fade-in','fade-out'] as const)expect(isStageComposition({leftActors:[{...a,motion:{type,durationMs:600}}],rightActors:[]})).toBe(true);
 });
 it('rejects unsafe motion timing and unsupported cues',()=>{
  for(const motion of [{type:'fly'},{type:'move',fromXAnchor:101},{type:'fade-in',durationMs:-1},{type:'fade-out',delayMs:10001}])expect(isStageComposition({leftActors:[{key:'a',assetId:'b',motion}],rightActors:[]})).toBe(false);
 });
});

it.each(['exit-left','exit-right'] as const)('compiles %s beyond the visible edge in each reading format',type=>{
 const p=getRepresentativeStory('onggojib').project,l=p.lines[0];
 const direction=type==='exit-right'?1:-1;
 const a={key:'actor',assetId:'onggojib.character.classic-master',xAnchor:direction>0?10:90,
  facing:'left' as const,motion:{type,durationMs:650,delayMs:150}};
 const project={...p,lines:p.lines.map(line=>line.id===l.id?{...line,inheritActors:false,
  stageComposition:{leftActors:[a],rightActors:[]}}:line)};
 expect(isStageComposition(project.lines[0].stageComposition)).toBe(true);
 for(const viewport of [{width:720,height:1280},{width:1280,height:720}]){
  const scene=compileStoryScene(project,l.id,1,{mode:'play',viewport});
  const actor=scene.actors[0];
  expect(actor.motion).toMatchObject({type:'exit',durationMs:650,delayMs:150});
  expect(actor.motion!.offsetX*direction).toBeGreaterThan(0);
  if(direction>0)expect(actor.handle!.x+actor.motion!.offsetX).toBeGreaterThan(scene.width);
  else expect(actor.handle!.x+actor.motion!.offsetX).toBeLessThan(0);
 }
});

it('does not replay a one-cut exit on insertion and preserves it on exact duplication',()=>{
 const initial=createBlankStoryProject({id:'exits',chapterId:'chapter',lineId:'cut'});
 const project=patchStoryLine(initial,'cut',{stageComposition:{leftActors:[{
  key:'actor',assetId:'onggojib.character.classic-master',motion:{type:'exit-left'},
 }],rightActors:[]}});
 const added=insertStoryCut(project,'cut','added');
 expect(added.lines[1].stageComposition?.leftActors[0].motion).toBeUndefined();
 const duplicated=duplicateStoryCut(project,'cut','copy');
 expect(duplicated.lines[1].stageComposition?.leftActors[0].motion).toEqual({type:'exit-left'});
});


it('keeps the exit once at the end when splitting the text of its cut',()=>{
 const initial=createBlankStoryProject({id:'split-exit',chapterId:'chapter',lineId:'cut'});
 const project=patchStoryLine(initial,'cut',{text:'마당에 있었다. 대문 밖으로 밀려났다.',stageComposition:{leftActors:[{
  key:'actor',assetId:'onggojib.character.classic-master',motion:{type:'exit-right',durationMs:700},
 }],rightActors:[]}});
 const [first,second]=splitStoryCut(project,'cut','split',9).lines;
 expect(first.stageComposition?.leftActors[0]).toMatchObject({key:'actor'});
 expect(first.stageComposition?.leftActors[0].motion).toBeUndefined();
 expect(second.stageComposition?.leftActors[0].motion).toEqual({type:'exit-right',durationMs:700});
});
