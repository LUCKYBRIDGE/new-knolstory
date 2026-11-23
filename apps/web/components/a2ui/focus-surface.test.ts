import {describe,expect,it} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {applyMessages,focusComponentNames,focusScreenBlueprints,validateSurface,type A2uiMessage,type Device} from '@knolstory/ui';
import {FocusSurface,focusRenderers} from './focus-surface';

const surfaceOf=(messages:A2uiMessage[])=>[...applyMessages(messages).values()][0]!;
const html=(task:keyof typeof focusScreenBlueprints,device:Device)=>renderToStaticMarkup(createElement(FocusSurface,{surface:surfaceOf(focusScreenBlueprints[task]),device}));

describe('FocusSurface',()=>{
 it('has exactly one renderer per catalog component',()=>{
  expect(Object.keys(focusRenderers).sort()).toEqual([...focusComponentNames].sort());
 });

 it.each(Object.keys(focusScreenBlueprints) as (keyof typeof focusScreenBlueprints)[])('draws the %s skeleton with the cut place and current text',task=>{
  const markup=html(task,'tablet');
  expect(markup).toContain(`data-a2ui-screen="${task}"`);
  expect(markup).toContain('1장 · 3컷 ▾');
  expect(markup).toContain('사슴아, 어서 이 나뭇짐 뒤로 숨으렴.');
  expect(markup.match(/aria-current="page"/g)).toHaveLength(1);
  expect(markup).not.toContain('>닫기<');
 });

 it('keeps scene-preview cut cards off phones',()=>{
  expect(html('basic','tablet')).toContain('이전 컷 2컷으로');
  expect(html('basic','phone')).not.toContain('이전 컷 2컷으로');
 });

 it('names icon buttons and binds choices to the data model',()=>{
  const markup=html('background','phone');
  expect(markup).toContain('aria-label="서재로 나가기"');
  expect(markup).toMatch(/<option value="default" selected="">자료 기본 표시<\/option>/);
  expect(markup).toContain('data-variant="primary"');
  expect(markup.match(/data-variant="primary"/g)).toHaveLength(1);
 });

 it('renders notices, chips and the collapsed more panel',()=>{
  const surface=surfaceOf(structuredClone(focusScreenBlueprints.audio));
  surface.components.set('empty',{id:'empty',component:'Notice',kind:'empty',text:'아직 소리가 없어요',actions:['retry']});
  surface.components.set('retry',{id:'retry',component:'IconButton',icon:'help',name:'소리 넣는 법',action:{event:{name:'help'}}});
  surface.components.set('chip',{id:'chip',component:'Chip',label:'나무꾼',image:'/a.png'});
  surface.components.set('current',{...surface.components.get('current')!,linkedImages:['chip']});
  surface.components.set('work-tools',{...surface.components.get('work')!,id:'work-tools'});
  surface.components.set('work',{id:'work',component:'Column',gap:12,children:['work-tools','empty']});
  expect(validateSurface(surface)).toEqual([]);
  const markup=renderToStaticMarkup(createElement(FocusSurface,{surface,device:'desktop'}));
  expect(markup).toContain('role="status"');
  expect(markup).toContain('아직 소리가 없어요');
  expect(markup).toContain('<img src="/a.png" alt=""/>나무꾼');
  expect(markup).toMatch(/<details[^>]*data-a2ui-more="true"><summary>더보기<\/summary>/);
 });
});
