import {describe,expect,it} from 'vitest';
import {BUILTIN_WORKS,groupBuiltinWorks} from './builtin-works';
const book=(key:string,id:string,kind:'original'|'example'|'own'|'imported'='example')=>({key,kind,project:{id,title:'같은 제목'},canResume:false});
describe('four builtin works preserve independent edition identities',()=>{
 it('groups eight actual document IDs into four books without rewriting a manuscript',()=>{
  const books=BUILTIN_WORKS.flatMap(work=>[book(`${work.id}-classic`,work.originalDocumentId,'original'),book(work.id,work.knolstoryDocumentId)]);
  const before=JSON.stringify(books),shelf=groupBuiltinWorks(books);
  expect(shelf).toHaveLength(4);
  expect(shelf.map(item=>item.builtin?.id)).toEqual(['rabbit','onggojib','seonnyeo','heungbu']);
  expect(shelf[0].builtin?.original?.key).toBe('rabbit-classic');
  expect(shelf[0].builtin?.knolstory?.key).toBe('rabbit');
  expect(JSON.stringify(books)).toBe(before);
 });
 it('keeps user/imported documents independent even when ID or title resembles a builtin',()=>{
  const original=book('rabbit-classic','classic-rabbit-tale','original');
  const own=book('new:copy','classic-rabbit-tale','own'),imported=book('import:copy','pinky-review-main-002','imported'),unknown=book('extra','unrecognized','original');
  const shelf=groupBuiltinWorks([original,own,imported,unknown]);
  expect(shelf).toHaveLength(4);expect(shelf.slice(1)).toEqual([own,imported,unknown]);
  expect(shelf[0].builtin?.knolstory).toBeUndefined();
 });
 it('never groups unrelated documents by their display title or key',()=>{
  const unrelated=book('rabbit','changed-id');expect(groupBuiltinWorks([unrelated])).toEqual([unrelated]);
 });
});

import {representativeStories,classicStories} from '@knolstory/compatibility';
it('connects every shipped manuscript exactly once using the actual corpus identities',()=>{
 const corpus=[...classicStories.map(story=>({...book(story.id,story.project.id,'original'),project:story.project})),...representativeStories.map(story=>({...book(story.id,story.project.id),project:story.project}))];
 const shelf=groupBuiltinWorks(corpus);
 expect(shelf).toHaveLength(4);
 const editions=shelf.flatMap(work=>[work.builtin?.original,work.builtin?.knolstory]);
 expect(editions).toHaveLength(8);expect(new Set(editions.map(work=>work?.project.id)).size).toBe(8);
 expect(editions.every(work=>corpus.includes(work!))).toBe(true);
 for(const definition of BUILTIN_WORKS){const work=shelf.find(work=>work.builtin?.id===definition.id)!;expect(work.builtin!.original?.key).toBe(`${definition.id}-classic`);expect(work.builtin!.knolstory?.key).toBe(definition.id);}
});

import {builtinShelfCoverProject} from './builtin-works';
it('uses the work title only for pristine builtin thumbnails and preserves authored cover text',()=>{
 const project=classicStories.find(work=>work.id==='heungbu-classic')!.project;
 const grouped=(p:typeof project)=>groupBuiltinWorks([{key:'heungbu-classic',kind:'original' as const,project:p}])[0];
 expect(builtinShelfCoverProject(grouped(project),classicStories).title).toBe('흥부와 놀부');expect(project.title).toBe('흥부전');
 const title={...project,title:'내가 쓴 표지 문구'};expect(builtinShelfCoverProject(grouped(title),classicStories)).toEqual(title);
 const cover={...project,cover:{...project.cover!,author:'내가 정한 지은이'}};expect(builtinShelfCoverProject(grouped(cover),classicStories)).toEqual(cover);
 expect(builtinShelfCoverProject(grouped(project),[])).toEqual(project);
 const own={key:'new:mine',kind:'own' as const,project:title};expect(builtinShelfCoverProject(own,classicStories)).toEqual(title);
});
