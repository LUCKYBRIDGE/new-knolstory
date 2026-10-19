import {describe,it,expect} from 'vitest';
import {rememberShortStoryAccountView,consumeShortStoryAccountView} from './shortstory-account-view';
function storage(){const map=new Map<string,string>();return {getItem:(key:string)=>map.get(key)??null,setItem:(key:string,value:string)=>{map.set(key,value);},removeItem:(key:string)=>{map.delete(key);},map};}
describe('ShortStory login view return',()=>{
 it('restores reading or writing only once for the same active book',()=>{const s=storage();rememberShortStoryAccountView(s,'book',false,100);expect(consumeShortStoryAccountView(s,'?auth=success','book',101)).toBe(false);expect(consumeShortStoryAccountView(s,'?auth=success','book',102)).toBeNull();rememberShortStoryAccountView(s,'book',true,100);expect(consumeShortStoryAccountView(s,'?auth=error','book',101)).toBe(true);});
 it('ignores ordinary navigation, other books and expired return state',()=>{const s=storage();rememberShortStoryAccountView(s,'book',false,100);expect(consumeShortStoryAccountView(s,'','book',101)).toBeNull();expect(s.map.size).toBe(1);expect(consumeShortStoryAccountView(s,'?auth=success','other',101)).toBeNull();rememberShortStoryAccountView(s,'book',false,100);expect(consumeShortStoryAccountView(s,'?auth=success','book',2000000)).toBeNull();});
});
