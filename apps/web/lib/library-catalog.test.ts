import {describe,it,expect} from 'vitest';
import {libraryPage,findLibraryBooks} from './library-catalog';
describe('library browsing preserves the corpus',()=>{
 it('matches Korean titles/authors with normalized whitespace without reordering or modifying works',()=>{
  const items=[{key:'a',project:{title:'흥부와  놀부',cover:{author:'전래 이야기'}}},{key:'b',project:{title:'선녀',cover:{author:'우리 반'}}}];
  expect(findLibraryBooks(items,'흥부와 놀부')).toEqual([items[0]]);
  expect(findLibraryBooks(items,'우리')).toEqual([items[1]]);
  expect(items[0].project.title).toBe('흥부와  놀부');
 });
 it('bounds page after filter/removal and never drops remaining books',()=>{
  const items=Array.from({length:13},(_,key)=>key);
  expect(libraryPage(items,99,8)).toEqual({items:items.slice(8),page:1,pages:2});
  expect(libraryPage(items,-3,8).items).toEqual(items.slice(0,8));
  expect(libraryPage([],4,8)).toEqual({items:[],page:0,pages:1});
  expect([...libraryPage(items,0,8).items,...libraryPage(items,1,8).items]).toEqual(items);
 });
});

import {parseLibraryView} from './library-catalog';
it('restores only valid tab browsing preferences without persisting project data',()=>{
 expect(parseLibraryView('{"version":1,"filter":"example","query":"흥부","pages":{"example":2}}')).toEqual({filter:'example',query:'흥부',pages:{example:2}});
 expect(parseLibraryView('{"version":1,"filter":"admin","query":{},"pages":{"example":-1}}')).toEqual({filter:'all',query:'',pages:{}});
 expect(parseLibraryView('corrupt')).toEqual({filter:'all',query:'',pages:{}});
});

import {shelfLayoutForWidth} from './library-catalog';
it('uses available horizontal space for the owner specified shelf layouts',()=>{
 expect(shelfLayoutForWidth(1200)).toEqual({columns:5,rows:2,capacity:10});
 expect(shelfLayoutForWidth(1000)).toEqual({columns:4,rows:2,capacity:8});
 expect(shelfLayoutForWidth(750)).toEqual({columns:3,rows:3,capacity:9});
 expect(shelfLayoutForWidth(350)).toEqual({columns:2,rows:4,capacity:8});
});

it('stores all-books and original-book pages independently',()=>{
 expect(parseLibraryView('{"version":1,"filter":"all","query":"","pages":{"all":2,"original":0}}').pages).toEqual({all:2,original:0});
});
