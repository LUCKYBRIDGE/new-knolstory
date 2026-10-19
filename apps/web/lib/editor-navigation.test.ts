import {describe,it,expect} from 'vitest';
import {normalizeEditingPath,visitEditingCut,returnToEditingVisit,MAX_EDITING_VISITS} from './editor-navigation';
describe('editing visits are derived UI state',()=>{
 const ids=['a','b','c'];
 it('records chosen joins and cycles without inferring graph routes',()=>{let path:readonly string[]=['a'];for(const id of ['c','b','c','a'])path=visitEditingCut(path,id,ids,'a');expect(path).toEqual(['a','c','b','c','a']);expect(visitEditingCut(path,'a',ids,'a')).toEqual(path);});
 it('returns to a specific repeated visit by truncating rather than appending',()=>{const path=['a','c','b','c'];expect(returnToEditingVisit(path,1,ids,'c')).toEqual(['a','c']);expect(path).toEqual(['a','c','b','c']);expect(returnToEditingVisit(path,-1,ids,'c')).toEqual(path);});
 it('validates primitive IDs and drops stale derived visits without mutating content',()=>{expect(normalizeEditingPath(['a',{},'missing','b',null],ids,'c')).toEqual(['a','b']);expect(normalizeEditingPath('a',ids,'c')).toEqual(['c']);expect(visitEditingCut(['a'],'missing',ids,'a')).toEqual(['a']);});
 it('caps recent visits while retaining repeat choices',()=>{const path=Array.from({length:100},(_,i)=>ids[i%3]);expect(normalizeEditingPath(path,ids,'a')).toEqual(path.slice(-MAX_EDITING_VISITS));expect(visitEditingCut(path,'b',ids,'a')).toHaveLength(MAX_EDITING_VISITS);});
 it('keeps the actual editing path when reader playback or editor return changes the current cut',()=>{expect(normalizeEditingPath(['a','b'],ids,'c')).toEqual(['a','b']);});
});
