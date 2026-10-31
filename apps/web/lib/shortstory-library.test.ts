import { describe,it,expect } from 'vitest';
import { newShortStory, encodeShortStory } from '@knolstory/compatibility';
import { SHORTSTORY_LIBRARY_KEY, SHORTSTORY_LEGACY_KEY, loadShortStoryLibrary, addShortStoryBook, deleteShortStoryBook, restoreShortStoryBook, saveShortStoryLibrary, parseShortStoryLibrary, emptyShortStoryLibrary, mergeShortStoryLibraries } from './shortstory-library';
const storage=()=>{const values=new Map<string,string>();return {getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{values.set(key,value);},values};};
describe('safe multiple personal picture books',()=>{
 it('backs up and preserves old workspace before migrating',()=>{const s=storage(),p=newShortStory();const raw=encodeShortStory(p);s.setItem(SHORTSTORY_LEGACY_KEY,raw);const library=loadShortStoryLibrary(s);expect(library.books[0].id).toBe(p.id);expect(s.getItem(SHORTSTORY_LEGACY_KEY)).toBe(raw);expect(s.getItem(`${SHORTSTORY_LEGACY_KEY}-backup`)).toBe(raw);expect(s.getItem(SHORTSTORY_LIBRARY_KEY)).toBeTruthy();});
 it('adds and imports duplicates as independent books without replacing IDs or content',()=>{const p=newShortStory();p.pages[0].text='saved';const initial={version:1 as const,books:[p],positions:{},deleted:[],activeId:p.id};const added=addShortStoryBook(initial,p);expect(added.books).toHaveLength(2);expect(added.books[1].id).not.toBe(p.id);expect(initial.books).toHaveLength(1);expect(added.books[0].pages[0].text).toBe('saved');});
 it('soft deletes and restores complete content and positions',()=>{const p=newShortStory();const initial={version:1 as const,books:[p],positions:{[p.id]:0},deleted:[],activeId:p.id};const removed=deleteShortStoryBook(initial,p.id);expect(removed.books).toHaveLength(0);expect(removed.deleted[0]).toEqual(p);const restored=restoreShortStoryBook(removed,p.id);expect(restored.books[0]).toEqual(p);expect(restored.positions[p.id]).toBe(0);});
 it('refuses corrupted, future and builtin IDs before overwriting storage',()=>{const s=storage();s.setItem(SHORTSTORY_LIBRARY_KEY,'broken');expect(()=>loadShortStoryLibrary(s)).toThrow();expect(s.getItem(SHORTSTORY_LIBRARY_KEY)).toBe('broken');expect(()=>parseShortStoryLibrary('{"version":2}')).toThrow();const p={...newShortStory(),id:'shortstory-original-rabbit'};expect(()=>saveShortStoryLibrary(s,{version:1,books:[p],positions:{},deleted:[],activeId:p.id})).toThrow();});
});

describe('two tabs saving the same picture-book library',()=>{
 const library=(...books:ReturnType<typeof newShortStory>[])=>books.reduce((current,book)=>addShortStoryBook(current,book),emptyShortStoryLibrary());
 const withText=(book:ReturnType<typeof newShortStory>,text:string)=>({...book,pages:book.pages.map((page,index)=>index===0?{...page,text}:page)});
 it('takes the other tab’s save when this tab only changed nothing or other books',()=>{
  const a=newShortStory(),b=newShortStory(),base=library(a,b);
  const stored={...base,books:base.books.map(book=>book.id===b.id?withText(book,'다른 탭의 글'):book)};
  const {library:merged,conflict}=mergeShortStoryLibraries({...base,activeId:a.id},stored,base,a.id);
  expect(conflict).toBe(false);expect(merged.books.find(book=>book.id===b.id)!.pages[0]!.text).toBe('다른 탭의 글');expect(merged.activeId).toBe(a.id);
 });
 it('keeps this tab’s change to the current book and the other tab’s new books',()=>{
  const a=newShortStory(),base=library(a);
  const mine={...base,books:base.books.map(book=>withText(book,'이 탭의 글'))};
  const stored=addShortStoryBook(base,newShortStory());
  const {library:merged,conflict}=mergeShortStoryLibraries(mine,stored,base,a.id);
  expect(conflict).toBe(false);expect(merged.books).toHaveLength(2);expect(merged.books.find(book=>book.id===a.id)!.pages[0]!.text).toBe('이 탭의 글');
 });
 it('keeps both versions as separate books when both tabs changed the current book',()=>{
  const a=newShortStory(),base=library(a);
  const mine={...base,books:base.books.map(book=>withText(book,'이 탭의 글'))};
  const stored={...base,books:base.books.map(book=>withText(book,'다른 탭의 글'))};
  const {library:merged,conflict}=mergeShortStoryLibraries(mine,stored,base,a.id);
  expect(conflict).toBe(true);expect(merged.books).toHaveLength(2);
  expect(merged.books.find(book=>book.id===a.id)!.pages[0]!.text).toBe('이 탭의 글');
  const other=merged.books.find(book=>book.id!==a.id)!;expect(other.title).toMatch(/· 다른 탭$/);expect(other.pages[0]!.text).toBe('다른 탭의 글');expect(merged.activeId).toBe(base.activeId);
  expect(()=>parseShortStoryLibrary(JSON.stringify(merged))).not.toThrow();
 });
});
