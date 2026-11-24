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
  expect(markup).toContain('1장 · 1컷 ▾');
  expect(markup).toContain('깊은 산속 계곡에는 사람의 발자국 하나 보이지 않았다.');
  expect(markup.match(/aria-current="page"/g)).toHaveLength(1);
  expect(markup).not.toContain('>닫기<');
 });

 it('keeps scene-preview cut cards off phones',()=>{
  expect(html('basic','tablet')).toContain('다음 컷 2컷으로');
  expect(html('basic','phone')).not.toContain('다음 컷 2컷으로');
 });

 it('names icon buttons and binds choices to the data model',()=>{
  const markup=html('direction','tablet');
  expect(markup).toContain('aria-label="서재 · 홈으로 이동"');
  expect(markup).toMatch(/<option value="cut" selected="">바로<\/option>/);
  for(const task of Object.keys(focusScreenBlueprints) as (keyof typeof focusScreenBlueprints)[])expect((html(task,'tablet').match(/data-variant="primary"/g)??[]).length).toBeLessThanOrEqual(1);
  const basicMarkup=html('basic','tablet');
  expect(basicMarkup).toContain('aria-label="현재 컷 화자"');
  expect(basicMarkup).toContain('aria-label="1컷 글"');
 });

 it('renders notices, chips and the collapsed more panel',()=>{
  const surface=surfaceOf(structuredClone(focusScreenBlueprints.audio));
  surface.components.set('empty',{id:'empty',component:'Notice',kind:'empty',text:'아직 소리가 없어요',actions:['retry']});
  surface.components.set('retry',{id:'retry',component:'IconButton',icon:'help',name:'소리 넣는 법',action:{event:{name:'help'}}});
  surface.components.set('chip',{id:'chip',component:'Chip',label:'나무꾼',image:'/a.png'});
  const basicSurface=surfaceOf(structuredClone(focusScreenBlueprints.basic));
  basicSurface.components.set('chip',{id:'chip',component:'Chip',label:'선녀',image:'/a.png'});
  basicSurface.components.set('current',{...basicSurface.components.get('current')!,linkedImages:['chip']});
  expect(renderToStaticMarkup(createElement(FocusSurface,{surface:basicSurface,device:'desktop'}))).toContain('<img src="/a.png" alt=""/>선녀');
  surface.components.delete('chip');
  surface.components.set('work',{...surface.components.get('work')!,children:['list-tools','companions','cut-list','empty']});
  surface.components.set('audio-summary-1',{...surface.components.get('audio-summary-1')!,label:'배경음'});
  surface.components.set('cut-1',{...surface.components.get('cut-1')!,children:['audio-summary-1','audio-edit-1']});
  expect(validateSurface(surface)).toEqual([]);
  const markup=renderToStaticMarkup(createElement(FocusSurface,{surface,device:'desktop'}));
  expect(markup).toContain('role="status"');
  expect(markup).toContain('아직 소리가 없어요');
  expect(markup).toMatch(/<details[^>]*data-a2ui-more="true"><summary>음향 수정<\/summary>/);
  expect(markup).toMatch(/<details[^>]*data-a2ui-more="true"><summary>현재 컷 상세·메모·정리<\/summary>/);
 });
});

describe('list screens',()=>{
 it('selects by the cut label and plays with an icon, like the real list screens',()=>{
  const markup=html('background','tablet');
  expect(markup).toContain('aria-label="1컷 · 해설 · 이 컷 선택"');
  expect(markup).toContain('aria-pressed="true"');
  expect(markup.match(/aria-label="이 컷부터 재생"/g)).toHaveLength(2);
  expect(markup).toContain('aria-label="1컷 배경 이미지 찾기 · 산속 계곡"');
  expect(markup).toContain('aria-label="인물 함께 보기"');
 });

 it('shows only the current cut on phones, without a select button',()=>{
  const markup=html('background','phone');
  expect(markup.match(/<article/g)).toHaveLength(1);
  expect(markup).toContain('<strong>1컷 · 해설</strong>');
  expect(markup).not.toContain('이 컷 선택');
  expect(markup).not.toContain('현재 컷 찾기');
  expect(html('text','phone')).toContain('현재 컷 찾기');
 });

 it('draws sliders, toggles, text areas and pickers from the data model',()=>{
  const characters=html('characters','tablet');
  expect(characters).toContain('크기 · 100%');
  expect(characters).toContain('aria-label="1컷 인물 추가 이미지 찾기 · 선택한 이미지 없음"');
  expect(html('text','tablet')).toContain('aria-label="1컷 글"');
  expect(html('basic','tablet')).toMatch(/<span class="[^"]*">1컷 배경<\/span>/);
 });
});

describe('stage strip',()=>{
 it('starts the 쓰기 stage as a strip on phones only',()=>{
  expect(html('basic','phone')).toContain('aria-label="무대 펼치기"');
  expect(html('basic','tablet')).not.toContain('무대 펼치기');
  expect(html('characters','phone')).not.toContain('무대 펼치기');
 });
});

describe('list toolbar drawn in the real editor',()=>{
 it('is built from catalog components only and fires the real events',async()=>{
  const {listToolsSurface,LIST_TOOLS_EVENTS}=await import('./list-tools-surface');
  const surface=listToolsSurface({task:'text',busy:false,findDisabled:false,companions:[{id:'background',label:'배경',checked:true},{id:'characters',label:'인물',checked:false}]});
  // A toolbar fragment has no FocusScreen root; every other catalog rule must hold.
  expect(validateSurface(surface).filter(issue=>issue.rule!=='root'&&issue.rule!=='orphan')).toEqual([]);
  const tablet=renderToStaticMarkup(createElement(FocusSurface,{surface,device:'tablet',rootId:'companions',inline:true}));
  expect(tablet).toContain('aria-label="배경 함께 보기"');
  expect(tablet).toMatch(/aria-label="배경 함께 보기"[^>]*checked=""|checked=""[^>]*aria-label="배경 함께 보기"/);
  expect(tablet).toContain('함께 보기</span>');
  expect(renderToStaticMarkup(createElement(FocusSurface,{surface,device:'phone',rootId:'companions',inline:true}))).not.toContain('함께 보기');
  expect(renderToStaticMarkup(createElement(FocusSurface,{surface,device:'phone',rootId:'list-tools',inline:true}))).toContain('>현재 컷 찾기<');
  expect(LIST_TOOLS_EVENTS.companion).toBe('toggleCompanion');
  const busy=listToolsSurface({task:'text',busy:true,findDisabled:false,companions:[]});
  expect(renderToStaticMarkup(createElement(FocusSurface,{surface:busy,device:'tablet',rootId:'list-tools'}))).toContain('disabled=""');
  expect(busy.components.has('companions')).toBe(false);
 });
});
