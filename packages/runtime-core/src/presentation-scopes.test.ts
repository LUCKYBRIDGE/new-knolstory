import {describe,it,expect} from 'vitest';
import {compileStoryPresentation} from './presentation-scopes';
import {isStoryPresentation,type StoryProject} from '@knolstory/story-domain';
const project={lines:[{id:'a',presentation:{effects:[{id:'rain',type:'shake',scope:'following',repeat:'loop',target:{kind:'background'}}]}},{id:'b',presentation:{effects:[{type:'flash',target:{kind:'actor',actorKey:'left-a'}}]}},{id:'c',presentation:{clearFollowingEffects:true}}]} as unknown as StoryProject;
describe('presentation scopes',()=>{
 it('resolves only actual visited path and preserves independent target',()=>{expect(compileStoryPresentation(project,'b',['a','b'])?.effects).toHaveLength(2);expect(compileStoryPresentation(project,'b',['b'])?.effects).toHaveLength(1);expect(compileStoryPresentation(project,'b',['b'])?.effects?.[0]?.target).toEqual({kind:'actor',actorId:'left-a'});});
 it('clears following effects and excludes cut-only on subsequent cuts',()=>{expect(compileStoryPresentation(project,'c',['a','b','c'])?.effects).toEqual([])});
 it('validates bounded repetitions and target identity',()=>{expect(isStoryPresentation({effects:[{type:'shake',scope:'following',repeat:'loop',periodMs:600,target:{kind:'background'}}]})).toBe(true);expect(isStoryPresentation({effects:[{type:'shake',periodMs:0}]})).toBe(false);expect(isStoryPresentation({effects:[{type:'flash',target:{kind:'actor',actorKey:''}}]})).toBe(false)});
 it('rejects mismatched paths',()=>{expect(()=>compileStoryPresentation(project,'b',['a'])).toThrow()});
});
