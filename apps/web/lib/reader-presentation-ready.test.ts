import {describe,it,expect} from 'vitest';
import {compileStoryScene} from '@knolstory/runtime-core';
import {representativeStories} from '@knolstory/compatibility';
import {presentationPhase} from './presentation-phase';
import {readerPresentationReady} from './reader-presentation-ready';

describe('reader native readiness',()=>{
 const work=representativeStories[0]!.project;
 const base={...compileStoryScene(work,work.lines[0]!.id,12,{mode:'play'}),presentation:undefined,presentationEntry:'read-1'};
 it('requires current rendered revision and usable audio/runtime',()=>{
  expect(readerPresentationReady(base,11,null,false,false)).toBe(false);
  expect(readerPresentationReady(base,12,null,true,false)).toBe(false);
  expect(readerPresentationReady(base,12,null,false,true)).toBe(false);
  expect(readerPresentationReady(base,12,null,false,false)).toBe(true);
 });
 it('never starts for an edit scene',()=>expect(readerPresentationReady({...base,mode:'edit'},12,null,false,false)).toBe(false));
 it('waits for automatic transitions too',()=>{
  const scene={...base,presentation:{transition:{type:'fade-black' as const,mode:'auto' as const,durationMs:1000}}};
  expect(readerPresentationReady(scene,12,null,false,false)).toBe(false);
  expect(readerPresentationReady(scene,12,presentationPhase(scene),false,false)).toBe(true);
  expect(readerPresentationReady({...scene,presentationEntry:'read-2'},12,presentationPhase(scene),false,false)).toBe(false);
 });
});
