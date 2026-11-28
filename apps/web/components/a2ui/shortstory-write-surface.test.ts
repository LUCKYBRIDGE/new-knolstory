import {describe,expect,it} from 'vitest';
import {controlNames,validateSurface} from '@knolstory/ui';
import {pictureHelpSurface,writeTabsSurface} from './shortstory-write-surface';

describe('숏스토리 쪽 쓰기 탭과 그림 도움말 from the A2UI catalog',()=>{
 it('keeps the catalog rules',()=>{
  for(const surface of [writeTabsSurface({selected:'text',pictures:true}),writeTabsSurface({selected:'pages',pictures:false}),pictureHelpSurface()])
   expect(validateSurface(surface).filter(issue=>issue.rule!=='root'&&issue.rule!=='orphan')).toEqual([]);
 });
 it('shows 그림 only when the work may change pictures, and keeps the panels’ ids',()=>{
  const tabs=(pictures:boolean)=>writeTabsSurface({selected:'text',pictures}).components.get('root')!;
  expect(tabs(true).tabs).toEqual([{value:'text',label:'글'},{value:'picture',label:'그림'},{value:'pages',label:'쪽'}]);
  expect(tabs(false).tabs).toEqual([{value:'text',label:'글'},{value:'pages',label:'쪽'}]);
  expect(tabs(true).panels).toBe('write');
  expect(writeTabsSurface({selected:'pages',pictures:true}).data).toEqual({selected:'pages'});
 });
 it('explains the 그림 tab through a named help button, not a standing sentence',()=>{
  expect(controlNames(pictureHelpSurface(),'phone')).toEqual(['쪽 그림 도움말']);
  expect([...pictureHelpSurface().components.values()].some(component=>component.component==='Notice')).toBe(false);
  expect(pictureHelpSurface(true).data).toEqual({open:true});expect(pictureHelpSurface().data).toEqual({open:false});
 });
});
