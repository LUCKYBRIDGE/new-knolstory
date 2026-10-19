import {describe,it,expect} from 'vitest';
import type {StoryProject} from '@knolstory/story-domain';
import {compileStoryPresentation} from './presentation-scopes';
import {compileStoryAudio} from './audio';
const project={chapters:[{id:'ch',order:0}],lines:[{id:'a',chapterId:'ch',order:0,presentation:{effects:[{id:'range',type:'shake',scope:'following',endLineId:'b'},{id:'persist',type:'flash',scope:'following'}]},audio:{music:{action:'play',assetId:'track',endLineId:'b'}}},{id:'b',chapterId:'ch',order:1},{id:'c',chapterId:'ch',order:2}]} as unknown as StoryProject;
const resolve=()=>({runtimePath:'assets/audio/track.ogg'});
describe('inclusive cut ranges',()=>{
 it('keeps end cut then expires only ranged effect',()=>{expect(compileStoryPresentation(project,'b',['a','b'])?.effects).toHaveLength(2);expect(compileStoryPresentation(project,'c',['a','b','c'])?.effects?.map(e=>e.id)).toEqual(['persist']);});
 it('does not expire when a branch bypasses end and restarts upon revisiting owner',()=>{expect(compileStoryPresentation(project,'c',['a','c'])?.effects).toHaveLength(2);expect(compileStoryPresentation(project,'a',['a','b','c','a'])?.effects).toHaveLength(2);});
 it('strips authored end IDs from runtime',()=>{expect(compileStoryPresentation(project,'a')?.effects?.[0]).not.toHaveProperty('endLineId');});
 it('stops music after inclusive end, preserving replacement',()=>{expect(compileStoryAudio(project,'b',resolve,['a','b']).music?.action).toBe('play');expect(compileStoryAudio(project,'c',resolve,['a','b','c']).music?.action).toBe('stop');const replacement={...project,lines:project.lines.map(l=>l.id==='c'?{...l,audio:{music:{action:'play' as const,assetId:'new'}}}:l)};expect(compileStoryAudio(replacement,'c',resolve,['a','b','c']).music?.action).toBe('play');});
});
