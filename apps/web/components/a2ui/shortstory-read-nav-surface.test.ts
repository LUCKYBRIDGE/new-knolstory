import {describe,expect,it} from 'vitest';
import {controlNames,validateSurface} from '@knolstory/ui';
import {readNavSurface} from './shortstory-read-nav-surface';

describe('숏스토리 읽기 쪽 넘김 줄 from the A2UI catalog',()=>{
 it('keeps the catalog rules (a part of the reading page, so no screen root)',()=>{
  for(const [index,count] of [[0,8],[3,8],[7,8],[0,1]] as const)
   expect(validateSurface(readNavSurface({index,count})).filter(issue=>issue.rule!=='root'&&issue.rule!=='orphan')).toEqual([]);
 });
 it('goes back to the cover from the first page and closes the book after the last',()=>{
  const at=(index:number)=>{const surface=readNavSurface({index,count:8});return [surface.components.get('previous')!.name,surface.components.get('place')!.label,surface.components.get('next')!.name];};
  expect(at(0)).toEqual(['표지로','1 / 8','다음 쪽']);
  expect(at(3)).toEqual(['이전 쪽','4 / 8','다음 쪽']);
  expect(at(7)).toEqual(['이전 쪽','8 / 8','책 덮기']);
  expect(controlNames(readNavSurface({index:3,count:8}),'desktop')).toEqual(['‹ 이전 쪽','다음 쪽 ›']);
 });
});
