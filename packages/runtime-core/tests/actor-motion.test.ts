import {describe,it,expect} from 'vitest';
import {getRepresentativeStory} from '@knolstory/compatibility';
import {compileStoryScene} from '../src/story-runtime';
import {createStoryDocument,serializeStoryDocument,parseStoryDocument,isStageComposition} from '@knolstory/story-domain';
describe('actor timing resolved in canonical layout',()=>{
 it('resolves authored entry, exit and movement without mutating placement',()=>{
  const p=getRepresentativeStory('onggojib').project,l=p.lines[0];
  const a={key:'actor',assetId:'onggojib.character.classic-master',xAnchor:60,motion:{type:'move' as const,fromXAnchor:30,durationMs:900,delayMs:100}};
  const project={...p,lines:p.lines.map(line=>line.id===l.id?{...line,type:'dialogue' as const,speaker:'left' as const,speakerName:'어른',inheritActors:false,stageComposition:{leftActors:[a],rightActors:[],speakerActorKey:'actor'}}:line)};
  const scene=compileStoryScene(project,l.id,1,{mode:'play',viewport:{width:390,height:844}});
  expect(scene.actors[0].motion).toEqual({version:1,type:'move',offsetX:-144,durationMs:900,delayMs:100});
  expect(a.xAnchor).toBe(60);
  const restored=parseStoryDocument(serializeStoryDocument(createStoryDocument({project,savedAt:'2026-10-07T00:00:00.000Z',appVersion:'test'})));expect(restored.ok).toBe(true);if(restored.ok)expect(restored.document.project.lines[0].stageComposition?.leftActors[0].motion).toEqual(a.motion);
  for(const type of ['fade-in','fade-out'] as const)expect(isStageComposition({leftActors:[{...a,motion:{type,durationMs:600}}],rightActors:[]})).toBe(true);
 });
 it('rejects unsafe motion timing and unsupported cues',()=>{
  for(const motion of [{type:'fly'},{type:'move',fromXAnchor:101},{type:'fade-in',durationMs:-1},{type:'fade-out',delayMs:10001}])expect(isStageComposition({leftActors:[{key:'a',assetId:'b',motion}],rightActors:[]})).toBe(false);
 });
});
