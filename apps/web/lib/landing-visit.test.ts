import {describe,it,expect} from 'vitest';
import {LANDING_VISIT_KEY,loadLandingVisit,markLandingVisited,resolveEntryView} from './landing-visit';
describe('first visit, return and explicit workspace restoration',()=>{
 it('a saved introduction stays open on fresh navigation regardless of prior visits',()=>{
  for(const visited of [false,true])expect(resolveEntryView({visited,hasWorkspace:true,reload:false,storedView:'home'})).toBe('home');
 });
 it('an explicit editor URL still overrides a saved introduction',()=>{
  expect(resolveEntryView({visited:true,hasWorkspace:true,reload:false,storedView:'home',directEditor:true})).toBe('editor');
 });
 it('fresh introduction remains the default even after a recorded prior visit',()=>{let raw:string|null=null;const storage={getItem:()=>raw,setItem:(key:string,value:string)=>{expect(key).toBe('knolstory-landing-visit-v1');raw=value;}};expect(loadLandingVisit(storage)).toBe(false);expect(resolveEntryView({visited:false,hasWorkspace:false,reload:false})).toBe('home');expect(markLandingVisited(storage)).toBe(true);expect(loadLandingVisit(storage)).toBe(true);for(const storedView of ['library','editor','prepare','book','cover'] as const)expect(resolveEntryView({visited:true,hasWorkspace:true,reload:false,storedView})).toBe('home');});
 it('reload restores current editing or reading view while an empty reload introduces books',()=>{for(const view of ['editor','prepare','book','cover','home','library'] as const)expect(resolveEntryView({visited:true,hasWorkspace:true,reload:true,storedView:view})).toBe(view);expect(resolveEntryView({visited:true,hasWorkspace:false,reload:true})).toBe('home');});
 it('explicit library and editor routes override persisted introduction',()=>{expect(resolveEntryView({visited:false,hasWorkspace:true,reload:false,storedView:'home',directLibrary:true})).toBe('library');expect(resolveEntryView({visited:false,hasWorkspace:false,reload:false,directLibrary:true})).toBe('library');expect(resolveEntryView({visited:false,hasWorkspace:false,reload:false,directEditor:true})).toBe('editor');});
 it('malformed or unavailable optional preferences do not prevent entry',()=>{expect(loadLandingVisit({getItem:()=>'{broken'})).toBe(false);expect(loadLandingVisit({getItem:()=>JSON.stringify({visited:true,version:999})})).toBe(false);expect(loadLandingVisit({getItem:()=>{throw Error('blocked');}})).toBe(false);expect(markLandingVisited({setItem:()=>{throw Error('blocked');}})).toBe(false);expect(LANDING_VISIT_KEY.startsWith('storygame')).toBe(false);});
});
