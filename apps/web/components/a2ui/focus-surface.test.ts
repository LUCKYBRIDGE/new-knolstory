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
  expect(renderToStaticMarkup(createElement(FocusSurface,{surface:basicSurface,device:'desktop'}))).toContain('<img src="/a.png" alt=""/><span>선녀</span>');
  surface.components.delete('chip');
  surface.components.set('work',{...surface.components.get('work')!,children:['list-tools','companions','cut-list','empty']});
  surface.components.set('audio-summary-1',{...surface.components.get('audio-summary-1')!,label:'배경음'});
  surface.components.set('cut-1',{...surface.components.get('cut-1')!,children:['audio-summary-1','audio-edit-1']});
  expect(validateSurface(surface)).toEqual([]);
  const markup=renderToStaticMarkup(createElement(FocusSurface,{surface,device:'desktop'}));
  expect(markup).toContain('role="status"');
  expect(markup).toContain('아직 소리가 없어요');
  expect(markup).toMatch(/<details[^>]*data-a2ui-more="true"[^>]*><summary>음향 수정<\/summary>/);
  expect(markup).toMatch(/<details[^>]*data-a2ui-more="true"[^>]*><summary>현재 컷 상세·메모·정리<\/summary>/);
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

describe('real editor parts drawn by the catalog renderer',()=>{
 it('draws work tabs with the host skin, hints and the real attribute',async()=>{
  const {workTabsSurface}=await import('./editor-surfaces');
  const surface=workTabsSurface({tabs:['basic','text','background'],current:'text',titles:{basic:'지금 컷'},disabled:false});
  // A part of a screen has no FocusScreen root or parent; every other catalog rule holds.
  expect(validateSurface(surface).filter(issue=>issue.rule!=='root'&&issue.rule!=='orphan')).toEqual([]);
  const markup=renderToStaticMarkup(createElement(FocusSurface,{surface,device:'tablet',rootId:'work-tabs',inline:true,skin:{workTabs:'host-tabs'},attrs:()=>({'data-editor-work-tabs':''})}));
  expect(markup).toContain('<nav class="host-tabs" aria-label="편집 작업" data-editor-work-tabs="">');
  expect(markup).toContain('title="지금 컷"');
  expect(markup.match(/aria-current="page"/g)).toHaveLength(1);
 });

 it('draws a cut card and puts the screen tools in its Slot',async()=>{
  const {cutItemSurface}=await import('./editor-surfaces');
  const make=(phoneShowsAll:boolean)=>cutItemSurface({lineId:'a',cut:2,speaker:'',text:'글',current:true,disabled:false,showText:false,phoneShowsAll});
  expect(validateSurface(make(false)).filter(issue=>issue.rule!=='root'&&issue.rule!=='orphan')).toEqual([]);
  const tablet=renderToStaticMarkup(createElement(FocusSurface,{surface:make(false),device:'tablet',rootId:'cut',skin:{cutItem:'row'},attrs:c=>c.component==='CutItem'?{'data-testid':'editing-cut-a'}:undefined,slots:{tools:createElement('i',null,'도구')}}));
  expect(tablet).toContain('class="row" aria-current="step" aria-label="2컷 편집" data-testid="editing-cut-a"');
  expect(tablet).toContain('aria-label="2컷 · 이 컷 선택"');
  expect(tablet).toContain('<i>도구</i>');
  expect(tablet).not.toContain('data-cut-text');
  expect(renderToStaticMarkup(createElement(FocusSurface,{surface:make(false),device:'phone',rootId:'cut'}))).toContain('<strong>2컷</strong>');
  expect(renderToStaticMarkup(createElement(FocusSurface,{surface:make(true),device:'phone',rootId:'cut'}))).toContain('이 컷 선택');
 });
});

describe('쓰기 head drawn by the catalog renderer',()=>{
 it('keeps names, the play icon, host classes and the linked-art place',async()=>{
  const {basicHeadSurface}=await import('./editor-surfaces');
  const surface=basicHeadSurface({speaker:'해설',kind:'narration',busy:false,kindDisabled:true});
  expect(validateSurface(surface).filter(issue=>issue.rule!=='root'&&issue.rule!=='orphan')).toEqual([]);
  const markup=renderToStaticMarkup(createElement(FocusSurface,{surface,device:'tablet',rootId:'head',inline:true,
   attrs:c=>c.id==='head'?{className:'head'}:c.id==='kind'?{className:'kind'}:c.id==='linked'?{className:'empty'}:undefined}));
  expect(markup).toContain('<div role="group" aria-label="현재 컷의 화자" class="head">');
  expect(markup).toContain('aria-label="현재 컷 화자" maxLength="200" value="해설"');
  expect(markup).toMatch(/<label class="kind"><span>종류<\/span><select aria-label="현재 컷 글 종류" title="글 종류 설정" disabled=""/);
  expect(markup).toMatch(/aria-label="이 컷부터 재생"[^>]*><svg/);
  expect(markup).toContain('</label><span class="empty"></span><label class="kind">');
  const linked=basicHeadSurface({speaker:'나무꾼',kind:'dialogue',busy:false,kindDisabled:false,images:[{key:'a',assetId:'x',name:'나무꾼'}]});
  const withImages=renderToStaticMarkup(createElement(FocusSurface,{surface:linked,device:'tablet',rootId:'head',inline:true,custom:{AssetThumbnail:()=>createElement('img',{alt:''})}}));
  expect(withImages).toContain('role="group" aria-label="현재 컷 화자에 연결된 이미지"');
  expect(withImages).toContain('<img alt=""/><span>나무꾼</span>');
 });
});

describe('top bar, text box and neighbour places drawn by the catalog renderer',()=>{
 it('draws the cut place with grouped options and the steps Slot, and arrows that keep focus',async()=>{
  const {cutPlaceSurface,cutStepsSurface}=await import('./editor-surfaces');
  const place=cutPlaceSurface({short:'1장 · 3컷',value:'b',groups:[{label:'1장',options:[{value:'a',label:'1컷'},{value:'b',label:'2컷'}]}],disabled:false,chapter:1,cut:3});
  expect(validateSurface(place).filter(issue=>issue.rule!=='root'&&issue.rule!=='orphan')).toEqual([]);
  const markup=renderToStaticMarkup(createElement(FocusSurface,{surface:place,device:'tablet',rootId:'place',inline:true,slots:{steps:createElement('span',{className:'steps'})}}));
  expect(markup).toContain('<span class="steps"></span>');
  expect(markup).toMatch(/<select aria-label="현재 장과 컷 이동"><optgroup label="1장"><option value="a">1컷<\/option><option value="b" selected="">2컷<\/option>/);
  const steps=cutStepsSurface({previousDisabled:true,nextDisabled:false});
  expect(renderToStaticMarkup(createElement(FocusSurface,{surface:steps,device:'tablet',rootId:'previous',inline:true}))).toContain('aria-label="이전 컷 편집" title="이전 컷" disabled=""');
 });

 it('draws the settings drawer with its head, groups and Slots, and the shortcuts',async()=>{
  const {topBarSurface}=await import('./editor-surfaces');
  const surface=topBarSurface({unified:true,title:'작품',open:true,disabled:false,scores:false,fullscreen:true,fullscreenAvailable:true,loadComplete:true});
  expect(validateSurface(surface).filter(issue=>issue.rule!=='root'&&issue.rule!=='orphan')).toEqual([]);
  const drawer=renderToStaticMarkup(createElement(FocusSurface,{surface,device:'tablet',rootId:'drawer',inline:true,skin:{drawerPanel:'panel'},custom:{CutSettings:()=>'S',FileTools:()=>'F',LeaveActions:()=>'L'}}));
  expect(drawer).toMatch(/<details open=""[^>]*><summary aria-label="설정">/);
  expect(drawer).toContain('<div class="panel" data-system-menu="editor">');
  expect(drawer).toContain('aria-label="편집 설정 닫기"');
  expect(drawer).not.toContain('이야기 점수');
  expect(renderToStaticMarkup(createElement(FocusSurface,{surface,device:'tablet',rootId:'fullscreen',inline:true}))).toContain('aria-label="편집 화면 전체 화면 해제"');
  expect(renderToStaticMarkup(createElement(FocusSurface,{surface,device:'tablet',rootId:'library',inline:true}))).toContain('<span>서재</span>');
 });

 it('draws the text box, neighbour cards and forks; scene cards stay off phones',async()=>{
  const {textBoxSurface,cutCardSurface,forkSurface}=await import('./editor-surfaces');
  expect(renderToStaticMarkup(createElement(FocusSurface,{surface:textBoxSurface({lineId:'a',label:'1컷 글',value:'글',readOnly:true,disabled:false}),device:'phone',rootId:'text',inline:true,attrs:()=>({'data-cut-id':'a'})})))
   .toMatch(/aria-label="1컷 글" maxLength="20000" readOnly=""[^>]*data-cut-id="a">글<\/textarea>/);
  const card=cutCardSurface({side:'next',kind:'cut',label:'다음 컷',order:'원고 순서',text:'글',lineId:'b'});
  expect(renderToStaticMarkup(createElement(FocusSurface,{surface:card,device:'tablet',rootId:'card',inline:true,custom:{ScenePreview:()=>'P'}}))).toContain('<strong>다음 컷<small>원고 순서</small></strong>P');
  expect(renderToStaticMarkup(createElement(FocusSurface,{surface:card,device:'phone',rootId:'card',inline:true}))).toBe('');
  const fork=forkSurface({kind:'choice',title:'갈림길',choices:[{id:'x',label:'A. 가 →',where:'2장',lineId:'c',separateName:'2장 길만 따로 쓰기'},{id:'y',label:'B. 나',pending:'B. 나 · 도착 컷을 정해 주세요'}],disabled:false,separateDisabled:false});
  const markup=renderToStaticMarkup(createElement(FocusSurface,{surface:fork,device:'phone',rootId:'fork',inline:true,attrs:c=>c.component==='Notice'?{className:'pending'}:undefined}));
  expect(markup).toContain('<b>A. 가 →</b><span>2장</span>');
  expect(markup).toContain('aria-label="2장 길만 따로 쓰기"');
  expect(markup).toContain('<p class="pending">B. 나 · 도착 컷을 정해 주세요</p>');
 });
});
