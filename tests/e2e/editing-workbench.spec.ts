import {test,expect,type Page,type Locator} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {readFileSync} from 'node:fs';
import type {StoryProject} from '../../packages/story-domain/src/index';
import {shelfCoverButton} from './library-entry';
import {confirmAuthoringImport,parseAuthoringFile} from './authoring-file';

const source=JSON.parse(readFileSync('tests/fixtures/stories/presentation-polish.json','utf8')) as StoryProject;
const fixture={...source,lines:source.lines.slice(0,3).map((line,index)=>index===2?{...line,flow:{type:'goto',targetLineId:null}}:line)};
const cutIds=fixture.lines.map(line=>line.id);
const workbench=(page:Page)=>page.getByRole('region',{name:'여러 컷 편집',exact:true});
const row=(page:Page,index:number)=>page.getByTestId(`editing-cut-${cutIds[index]}`);

async function openWorkMenu(page:Page){
 const menu=page.locator('[data-work-menu]');
 if(!await menu.evaluate(element=>(element as HTMLDetailsElement).open))await menu.locator(':scope>summary').click();
}
async function saved(page:Page){await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');}
async function exported(page:Page){
 await saved(page);await openWorkMenu(page);
 const pending=page.waitForEvent('download');
 await page.getByRole('button',{name:'작품 파일 내보내기',exact:true}).click();
 const file=await pending,raw=await readFile((await file.path())!,'utf8');
 return {raw,project:parseAuthoringFile(raw).project as StoryProject};
}
async function importRaw(page:Page,raw:string){
 await openWorkMenu(page);await page.getByLabel('작품 파일 가져오기',{exact:true}).setInputFiles({name:'workbench.knolstory',mimeType:'application/json',buffer:Buffer.from(raw)});
 await confirmAuthoringImport(page);await saved(page);
}
async function prepare(page:Page){
 await page.route('**/api/**',route=>route.abort());await page.goto('/?view=editor');await saved(page);
 await importRaw(page,JSON.stringify({documentType:'story-maker-project',schemaVersion:7,savedAt:'2026-10-19T00:00:00.000Z',appVersion:'test',project:fixture}));
 await expect(workbench(page)).toBeVisible();
 return (await exported(page)).project;
}
async function settings(page:Page){
 await openWorkMenu(page);const summary=page.getByText('편집 설정',{exact:true});
 const details=summary.locator('..');if(!await details.evaluate(element=>(element as HTMLDetailsElement).open))await summary.click();
 return page.locator('[data-work-menu]');
}
async function mode(page:Page,label:string){await openWorkMenu(page);await page.getByRole('combobox',{name:'편집화면 선택',exact:true}).selectOption({label});}
async function pickBackground(page:Page,target:Locator,label:string){
 const launcher=target.getByRole('button',{name:`${label} 이미지 찾기`,exact:true});
 const current=await launcher.getAttribute('data-asset-value');await launcher.click();
 const dialog=page.getByRole('dialog',{name:`이미지 선택 · ${label}`,exact:true});
 const candidate=dialog.locator(`[data-asset-id]:not([data-asset-id="${current}"]):visible`).first();
 const assetId=(await candidate.getAttribute('data-asset-id'))!;
 await candidate.click();await dialog.getByRole('button',{name:'선택한 이미지 적용',exact:true}).click();return assetId;
}

test('several cut texts edit directly and companion visibility never edits manuscript data',async({page},info)=>{
 const before=await prepare(page);await mode(page,'글 편집');
 await expect(row(page,0).getByRole('textbox',{name:'1컷 글',exact:true})).toBeVisible();
 await expect(row(page,1).getByRole('textbox',{name:'2컷 글',exact:true})).toBeVisible();
 const companion=page.getByRole('checkbox',{name:'배경 함께 보기',exact:true});
 await companion.setChecked(!await companion.isChecked());
 expect((await exported(page)).project).toEqual(before);
 await row(page,0).getByRole('textbox',{name:'1컷 글',exact:true}).fill('앞 컷의 문장을 읽으며 고친 첫 원고.');
 await row(page,1).getByRole('textbox',{name:'2컷 글',exact:true}).fill('다음 컷도 바로 이어서 고친 원고.');
 const after=(await exported(page)).project;
 expect(after).toEqual({...before,updatedAt:after.updatedAt,lines:before.lines.map((line,index)=>({...line,text:index===0?'앞 컷의 문장을 읽으며 고친 첫 원고.':index===1?'다음 컷도 바로 이어서 고친 원고.':line.text}))});
 await page.reload();await mode(page,'글 편집');
 await expect(row(page,0).getByRole('textbox',{name:'1컷 글',exact:true})).toHaveValue(after.lines[0].text);
 await expect(row(page,1).getByRole('textbox',{name:'2컷 글',exact:true})).toHaveValue(after.lines[1].text);
 await page.screenshot({path:info.outputPath('multi-cut-text.png'),fullPage:true});
});

test('background workbench updates separate cuts and preserves their text, stage, audio and effects',async({page})=>{
 const before=await prepare(page);await mode(page,'배경 편집');
 const first=await pickBackground(page,row(page,0),'1컷 배경');
 const second=await pickBackground(page,row(page,1),'2컷 배경');
 const after=(await exported(page)).project;
 expect(after).toEqual({...before,updatedAt:after.updatedAt,lines:before.lines.map((line,index)=>index<2?{...line,backgroundId:index===0?first:second}:line)});
 await page.reload();await mode(page,'배경 편집');
 await expect(row(page,0).getByRole('button',{name:'1컷 배경 이미지 찾기',exact:true})).toHaveAttribute('data-asset-value',first);
 await expect(row(page,1).getByRole('button',{name:'2컷 배경 이미지 찾기',exact:true})).toHaveAttribute('data-asset-value',second);
});

test('audio and direction require separate opt-in, persist real cut ranges and survive local-file reopen',async({page,browser})=>{
 const before=await prepare(page);
 await openWorkMenu(page);for(const label of ['인물 편집','음향 편집','연출 편집'])await expect(page.getByRole('combobox',{name:'편집화면 선택',exact:true}).locator('option').filter({hasText:label})).toHaveCount(0);
 let controls=await settings(page);await controls.getByRole('checkbox',{name:'음향 편집 사용',exact:true}).check();
 await expect(page.getByRole('combobox',{name:'편집화면 선택',exact:true}).locator('option[value=direction]')).toHaveCount(0);
 await mode(page,'음향 편집');await row(page,0).getByText('1컷 음향 수정',{exact:true}).click();
 await row(page,0).getByLabel('컷 배경음 동작',{exact:true}).selectOption('play');
 await row(page,0).getByLabel('배경음 종료 컷',{exact:true}).selectOption(cutIds[2]);
 controls=await settings(page);await controls.getByRole('checkbox',{name:'연출 편집 사용',exact:true}).check();
 await mode(page,'연출 편집');await row(page,1).getByText('2컷 연출 수정',{exact:true}).click();
 await row(page,1).getByLabel('효과',{exact:true}).selectOption('shake');
 await row(page,1).getByLabel('효과 적용 범위',{exact:true}).selectOption('following');
 await row(page,1).getByLabel('효과 종료 컷',{exact:true}).selectOption(cutIds[2]);
 const authored=(await exported(page)).project;
 expect(authored.lines[0].audio?.music).toMatchObject({action:'play',endLineId:cutIds[2]});
 expect(authored.lines[1].presentation?.effects?.[0]).toMatchObject({type:'shake',scope:'following',endLineId:cutIds[2]});
 expect(authored.lines.map(line=>line.text)).toEqual(before.lines.map(line=>line.text));
 expect(authored.lines.map(line=>line.stageComposition)).toEqual(before.lines.map(line=>line.stageComposition));
 controls=await settings(page);await controls.getByRole('checkbox',{name:'음향 편집 사용',exact:true}).uncheck();await controls.getByRole('checkbox',{name:'연출 편집 사용',exact:true}).uncheck();
 expect((await exported(page)).project).toEqual(authored);
 const archive=await exported(page),context=await browser.newContext(),reopened=await context.newPage();
 await reopened.route('**/api/**',route=>route.abort());await reopened.goto('/?view=editor');await saved(reopened);await importRaw(reopened,archive.raw);
 const imported=(await exported(reopened)).project;expect(imported).toEqual({...authored,id:imported.id});
 await context.close();
});

test('character batch view changes placement across cuts without converting left/right speaker roles',async({page})=>{
 const before=await prepare(page),controls=await settings(page);
 await controls.getByRole('checkbox',{name:'인물 편집 사용',exact:true}).check();await mode(page,'인물 편집');
 await row(page,0).getByRole('combobox',{name:'1컷 인물 1 배치 위치',exact:true}).selectOption('center');
 await row(page,1).getByRole('slider',{name:'2컷 인물 1 크기',exact:true}).press('End');
 const after=(await exported(page)).project;
 expect(after.lines[0].stageComposition?.leftActors[0]).toMatchObject({key:before.lines[0].stageComposition!.leftActors[0].key,assetId:before.lines[0].stageComposition!.leftActors[0].assetId,position:'center'});
 expect(after.lines[0].stageComposition?.rightActors).toEqual(before.lines[0].stageComposition?.rightActors);
 expect(after.lines[1].stageComposition?.leftActors[0]).toMatchObject({key:before.lines[1].stageComposition!.leftActors[0].key,scaleMultiplier:1.4});
 for(let index=0;index<after.lines.length;index++){
  expect(after.lines[index].text).toBe(before.lines[index].text);
  expect(after.lines[index].speaker).toBe(before.lines[index].speaker);
  expect(after.lines[index].flow).toEqual(before.lines[index].flow);
  expect(after.lines[index].audio).toEqual(before.lines[index].audio);
  expect(after.lines[index].presentation).toEqual(before.lines[index].presentation);
 }
 await settings(page);await controls.getByRole('checkbox',{name:'인물 편집 사용',exact:true}).uncheck();
 expect((await exported(page)).project).toEqual(after);
 await page.reload();
 const reloaded=(await exported(page)).project;expect(reloaded).toEqual(after);
});

test('basic editing keeps previous and next cut context beside a clear current editor at desktop and phone widths',async({page},info)=>{
 await page.setViewportSize({width:1440,height:900});await prepare(page);
 const menu=page.locator('[data-work-menu]');if(await menu.evaluate(element=>(element as HTMLDetailsElement).open))await menu.locator(':scope>summary').click();
 await mode(page,'글 편집');await row(page,1).getByRole('button',{name:'이 컷 선택',exact:true}).click();await mode(page,'기본편집');
 const current=workbench(page).getByRole('group',{name:'현재 컷 · 2컷',exact:true});
 const previous=workbench(page).getByRole('button',{name:/^이전 컷/}),next=workbench(page).getByRole('button',{name:/^다음 컷/});
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:width===390?844:900});
  await expect(current.getByRole('textbox',{name:'2컷 글',exact:true})).toHaveValue(fixture.lines[1].text);
  await expect(previous).toContainText(fixture.lines[0].text);await expect(next).toContainText(fixture.lines[2].text);
  await expect(previous.locator('img')).toHaveCount(1);await expect(next.locator('img')).toHaveCount(1);
  const text=current.getByRole('textbox',{name:'2컷 글',exact:true});await text.scrollIntoViewIfNeeded();
  const fieldBounds=(await text.boundingBox())!,neighborBounds=(await previous.boundingBox())!;
  expect(fieldBounds.width).toBeGreaterThan(width===390?250:neighborBounds.width);
  expect(fieldBounds.x).toBeGreaterThanOrEqual(0);expect(fieldBounds.x+fieldBounds.width).toBeLessThanOrEqual(width+1);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await workbench(page).screenshot({path:info.outputPath(`basic-neighbors-${width}.png`)});
 }
 await next.click();await expect(workbench(page).getByRole('textbox',{name:'3컷 글',exact:true})).toHaveValue(fixture.lines[2].text);
});

test('multi-cut text composition keeps typing and caret stable while cut and screen navigation wait',async({page},info)=>{
 await page.setViewportSize({width:390,height:844});await prepare(page);await mode(page,'글 편집');
 const companion=page.getByRole('checkbox',{name:'배경 함께 보기',exact:true});await companion.check();
 const field=row(page,1).getByRole('textbox',{name:'2컷 글',exact:true});
 await field.fill('이전 컷과 다음 컷을 보며 이어 쓰는 글. ');await field.focus();await field.press('End');
 await field.evaluate(element=>element.scrollIntoView({block:'center'}));await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
 // Synthetic composition proves editor gating; physical Korean IME is a separate native-device check.
 await field.dispatchEvent('compositionstart',{data:''});await expect(field).toBeEnabled();
 await expect(page.locator('[aria-label="편집화면 선택"]')).toBeDisabled();
 await expect(row(page,1).getByRole('button',{name:'이 컷 선택',exact:true})).toBeDisabled();
 await expect(workbench(page).getByRole('combobox',{name:'편집할 장',exact:true})).toBeDisabled();
 const before=await field.evaluate(element=>{const input=element as HTMLTextAreaElement,panel=input.closest('[data-writer-scroll]');return {panelScroll:panel?.scrollTop??0,windowScroll:scrollY,start:input.selectionStart,fieldTop:input.getBoundingClientRect().top,bodyHeight:document.body.scrollHeight,headers:Array.from(document.querySelectorAll('header')).map(x=>x.getBoundingClientRect().height)};});
 await page.keyboard.insertText('한글 조합 중');await expect(field).toHaveValue('이전 컷과 다음 컷을 보며 이어 쓰는 글. 한글 조합 중');
 const after=await field.evaluate(element=>{const input=element as HTMLTextAreaElement,panel=input.closest('[data-writer-scroll]');return {panelScroll:panel?.scrollTop??0,windowScroll:scrollY,start:input.selectionStart,end:input.selectionEnd,focused:document.activeElement===input,fieldTop:input.getBoundingClientRect().top,bodyHeight:document.body.scrollHeight,headers:Array.from(document.querySelectorAll('header')).map(x=>x.getBoundingClientRect().height)};});
 expect(after.focused).toBe(true);expect(after.start).toBe(before.start+'한글 조합 중'.length);expect(after.end).toBe(after.start);
 // Chromium may scroll the inner list to reveal a caret. Content geometry must remain stable.
 expect(Math.abs(after.fieldTop+after.windowScroll+after.panelScroll-before.fieldTop-before.windowScroll-before.panelScroll)).toBeLessThanOrEqual(2);expect(after.bodyHeight).toBe(before.bodyHeight);expect(after.headers).toEqual(before.headers);expect(after.fieldTop).toBeGreaterThanOrEqual(0);
 await field.dispatchEvent('compositionend',{data:'한글 조합 중'});
 await expect(page.locator('[aria-label="편집화면 선택"]')).toBeEnabled();await saved(page);
 await field.evaluate(element=>(element as HTMLTextAreaElement).setSelectionRange(3,6));
 await mode(page,'배경 편집');await mode(page,'글 편집');await expect(companion).toBeChecked();
 await expect.poll(()=>field.evaluate(element=>{const input=element as HTMLTextAreaElement;return [input.selectionStart,input.selectionEnd,document.activeElement===input];})).toEqual([3,6,true]);
 await expect(field).toHaveValue('이전 컷과 다음 컷을 보며 이어 쓰는 글. 한글 조합 중');
 const afterProject=(await exported(page)).project;expect(afterProject.lines[1].text).toBe('이전 컷과 다음 컷을 보며 이어 쓰는 글. 한글 조합 중');
 expect(afterProject.lines[0].text).toBe(fixture.lines[0].text);expect(afterProject.lines[2].text).toBe(fixture.lines[2].text);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await workbench(page).screenshot({path:info.outputPath('multi-cut-ime-mobile.png')});
});

test('legacy advanced controls remain separately opt-in and preserve existing choices',async({page})=>{
 await prepare(page);await openWorkMenu(page);await expect(page.getByRole('button',{name:'이야기 점수',exact:true})).toHaveCount(0);
 await page.keyboard.press('Escape');await openWorkMenu(page);const settings=page.locator('[data-work-menu]').locator('details').filter({has:page.locator('summary',{hasText:'편집 설정'})}).first();await settings.locator(':scope>summary').click();
 await expect(page.getByRole('button',{name:'이야기 점수 설정 열기',exact:true})).toHaveCount(0);
 await page.getByRole('checkbox',{name:'점수 편집 사용',exact:true}).check();
 await expect(page.getByRole('button',{name:'이야기 점수 설정 열기',exact:true})).toBeVisible();
 await page.getByRole('checkbox',{name:'선택지 편집 사용',exact:true}).check();
 await page.keyboard.press('Escape');const logic=workbench(page).locator('details').filter({has:page.locator('summary',{hasText:'현재 컷의 선택지·분기조건 편집'})}).first();await logic.locator(':scope>summary').click();
 await expect(logic.getByRole('combobox',{name:'진행 방식',exact:true})).toBeVisible();
 await expect(logic.getByRole('combobox',{name:'진행 방식',exact:true}).locator('option[value="goto"]')).toHaveAttribute('disabled','');
 await openWorkMenu(page);await page.getByRole('checkbox',{name:'분기조건 편집 사용',exact:true}).check();await page.keyboard.press('Escape');
 await expect(logic.getByRole('combobox',{name:'진행 방식',exact:true}).locator('option[value="goto"]')).toHaveCount(1);
 await openWorkMenu(page);await page.getByRole('checkbox',{name:'선택지 편집 사용',exact:true}).uncheck();await page.getByRole('checkbox',{name:'분기조건 편집 사용',exact:true}).uncheck();
 await expect(logic).toHaveCount(0);await page.keyboard.press('Escape');
 const details=workbench(page).locator('details').filter({has:page.locator('summary',{hasText:'현재 컷 상세·메모·정리'})}).first();await details.locator(':scope>summary').click();
 await expect(details.getByRole('textbox',{name:'말하는 인물 이름',exact:true})).toBeVisible();await expect(details.getByText('말하는 인물 상세 설정',{exact:true})).toHaveCount(0);
 expect((await exported(page)).project).toEqual(fixture);
});

test('direction edits existing actor motion while keeping one native frame and actor identities',async({page})=>{
 const before=await prepare(page),frame=page.getByTestId('story-runtime-frame');await expect(frame).toHaveCount(1);await frame.evaluate(node=>node.setAttribute('data-workbench-identity','same-frame'));
 const controls=await settings(page);await controls.getByRole('checkbox',{name:'연출 편집 사용',exact:true}).check();await mode(page,'연출 편집');
 await row(page,0).getByText('1컷 연출 수정',{exact:true}).click();await row(page,0).getByText('인물 동작 수정',{exact:true}).click();
 await row(page,0).getByRole('combobox',{name:'1컷 인물 1 동작',exact:true}).selectOption('move');
 await row(page,0).getByRole('slider',{name:'1컷 인물 1 출발 위치',exact:true}).press('End');
 const after=(await exported(page)).project;
 expect(after.lines[0].stageComposition?.leftActors[0]).toMatchObject({key:before.lines[0].stageComposition!.leftActors[0].key,assetId:before.lines[0].stageComposition!.leftActors[0].assetId,motion:{type:'move',fromXAnchor:95,durationMs:600,delayMs:0}});
 expect(after.lines[0].stageComposition?.rightActors).toEqual(before.lines[0].stageComposition?.rightActors);
 expect(after.lines.map(line=>line.text)).toEqual(before.lines.map(line=>line.text));
 await mode(page,'글 편집');await mode(page,'배경 편집');await mode(page,'기본편집');await expect(frame).toHaveCount(1);await expect(frame).toHaveAttribute('data-workbench-identity','same-frame');
});

test('phone basic editor stacks compact context around the current landscape preview and draft',async({page},info)=>{
 await page.setViewportSize({width:390,height:844});await prepare(page);await mode(page,'글 편집');await row(page,1).getByRole('button',{name:'이 컷 선택',exact:true}).click();await mode(page,'기본편집');
 const current=workbench(page).getByRole('group',{name:'현재 컷 · 2컷',exact:true}),previous=workbench(page).getByRole('button',{name:/^이전 컷/}),next=workbench(page).getByRole('button',{name:/^다음 컷/});
 const scene=page.getByTestId('story-stage-viewport');await expect(scene).toBeVisible();
 const boxes=await Promise.all([previous,scene,current,next].map(locator=>locator.boundingBox()));const [p,s,c,n]=boxes as {x:number;y:number;width:number;height:number}[];
 const top=Math.min(s.y,c.y),bottom=Math.max(s.y+s.height,c.y+c.height),height=bottom-top;
 expect(p.y+p.height).toBeLessThanOrEqual(top+2);expect(n.y).toBeGreaterThanOrEqual(bottom-2);
 await expect(workbench(page).locator('[data-editing-body]')).toHaveAttribute('data-cut-arrangement','stacked');
 expect(height).toBeGreaterThan(p.height*3);expect(height).toBeGreaterThan(n.height*3);
 expect(p.height).toBeGreaterThanOrEqual(44);expect(n.height).toBeGreaterThanOrEqual(44);
 await expect(workbench(page).getByRole('textbox',{name:'현재 컷 화자',exact:true})).toBeVisible();
 await expect(workbench(page).locator('[data-stacked-context]')).toBeVisible();
 await expect(page.getByTestId('story-runtime-status')).toHaveAttribute('data-scene-width','1280');await expect(page.getByTestId('story-runtime-status')).toHaveAttribute('data-scene-height','720');
 expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+2&&document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await page.screenshot({path:info.outputPath('phone-basic-stacked.png'),fullPage:true});
 await next.click();await expect(workbench(page).getByRole('textbox',{name:'3컷 글',exact:true})).toHaveValue(fixture.lines[2].text);
 await workbench(page).getByRole('button',{name:/^이전 컷/}).click();await expect(workbench(page).getByRole('textbox',{name:'2컷 글',exact:true})).toHaveValue(fixture.lines[1].text);
});

for(const [width,height] of [[360,640],[640,360],[768,1024],[1280,720]])test(`editor chrome fits ${width}x${height} while only cut list scrolls`,async({page})=>{
 await page.setViewportSize({width,height});await prepare(page);await mode(page,'글 편집');
 await expect(page.locator('[data-work-menu]>summary')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1&&document.documentElement.scrollHeight<=innerHeight+2)).toBe(true);
  const field=row(page,0).getByRole('textbox',{name:'1컷 글',exact:true});await field.fill(`가용 화면 ${width}×${height}에서 고친 글`);await saved(page);
  const last=row(page,2).getByRole('textbox',{name:'3컷 글',exact:true});const list=workbench(page).locator('[data-writer-scroll]');await list.hover();await page.mouse.wheel(0,1600);await expect(last).toBeInViewport();await last.fill('목록 안에서 내려와 고친 마지막 컷');await saved(page);
  expect(await page.evaluate(()=>Math.abs(scrollY)<=2)).toBe(true);await expect(page.locator('[data-work-menu]>summary')).toBeInViewport();
  // Capture native visuals separately after render acknowledgement; keep resize/scroll assertions independent of compositor capture.
});

test('native frame remains mounted and interactive through editor read return',async({page})=>{
 await page.setViewportSize({width:390,height:844});await prepare(page);const frame=page.getByTestId('story-runtime-frame');await frame.evaluate(node=>node.setAttribute('data-return-identity','native-kept'));
 await workbench(page).getByRole('button',{name:'이 컷부터 재생',exact:true}).click();await expect(frame).toHaveAttribute('data-return-identity','native-kept');
 await expect.poll(()=>frame.evaluate(node=>{
  const frame=node.getBoundingClientRect(),area=node.parentElement!.getBoundingClientRect();
  const width=Number.parseFloat((node as HTMLElement).style.width),height=Number.parseFloat((node as HTMLElement).style.height);
  const scale=Math.min(area.width/width,area.height/height);
  return Math.max(Math.abs(frame.width-width*scale),Math.abs(frame.height-height*scale),Math.abs((frame.x-area.x)*2+frame.width-area.width),Math.abs((frame.y-area.y)*2+frame.height-area.height));
 })).toBeLessThan(2);
 expect(await frame.evaluate(node=>node.closest('[inert],[aria-hidden="true"]')===null)).toBe(true);
 await page.getByRole('button',{name:'읽기 메뉴',exact:true}).click();await page.getByRole('button',{name:'이 컷 편집하기',exact:true}).click();
 await expect(workbench(page).getByRole('textbox',{name:'1컷 글',exact:true})).toBeVisible();await expect(frame).toHaveAttribute('data-return-identity','native-kept');
 await expect.poll(()=>frame.evaluate(node=>{
  const frame=node.getBoundingClientRect(),area=node.parentElement!.getBoundingClientRect();
  const scale=Math.min(area.width/1280,area.height/720);
  return Math.max(Math.abs(frame.width-1280*scale),Math.abs(frame.height-720*scale));
 })).toBeLessThan(2);
 expect((await exported(page)).project).toEqual(fixture);
});

test('actual native basic preview renders landscape inside the phone center without changing manuscript',async({page},info)=>{
 test.setTimeout(150000);await page.setViewportSize({width:390,height:844});const before=await prepare(page);
 const status=page.getByTestId('story-runtime-status'),frame=page.getByTestId('story-runtime-frame');
 await expect.poll(async()=>{const value=await status.getAttribute('data-rendered-revision');return value!==null&&Number(value)>=0&&value===await status.getAttribute('data-scene-revision');},{timeout:120000}).toBe(true);
 const box=(await frame.boundingBox())!;expect(box.width).toBeGreaterThan(0);expect(Math.abs(box.width/box.height-16/9)).toBeLessThan(.01);
 await expect(status).toHaveAttribute('data-scene-width','1280');await expect(status).toHaveAttribute('data-scene-height','720');
 await page.screenshot({path:info.outputPath('phone-native-basic.png'),fullPage:true});expect((await exported(page)).project).toEqual(before);
});

test('editing follows modeled visible viewport shrink and pan while keeping text accessible',async({page},info)=>{
 await page.setViewportSize({width:390,height:844});await page.addInitScript(()=>{const visual=new EventTarget() as EventTarget&{width:number;height:number;offsetLeft:number;offsetTop:number};Object.assign(visual,{width:390,height:844,offsetLeft:0,offsetTop:0});Object.defineProperty(window,'visualViewport',{configurable:true,value:visual});});
 await prepare(page);const main=page.locator('main[data-keyboard-occluded]');
 for(const rect of [{width:390,height:520,left:0,top:20},{width:365,height:420,left:12,top:55}]){
  await page.evaluate(rect=>{Object.assign(window.visualViewport!,{width:rect.width,height:rect.height,offsetLeft:rect.left,offsetTop:rect.top});window.visualViewport!.dispatchEvent(new Event('resize'));window.visualViewport!.dispatchEvent(new Event('scroll'));},rect);
  await expect.poll(async()=>{const b=(await main.boundingBox())!;return Math.max(Math.abs(b.x-rect.left),Math.abs(b.y-rect.top),Math.abs(b.width-rect.width),Math.abs(b.height-rect.height));}).toBeLessThan(1);
  const field=workbench(page).getByRole('textbox',{name:'1컷 글',exact:true});await field.fill('보이는 화면 안에서 이어 고친 글');await saved(page);const box=(await field.boundingBox())!;expect(box.x).toBeGreaterThanOrEqual(rect.left);expect(box.x+box.width).toBeLessThanOrEqual(rect.left+rect.width+1);
 }
 await page.screenshot({path:info.outputPath('editor-visible-viewport-model.png'),fullPage:true});
});

test('one grouped settings menu replaces scattered editor controls',async({page},info)=>{
 await page.setViewportSize({width:390,height:844});const before=await prepare(page),header=page.locator('main[data-keyboard-occluded]>header');await page.keyboard.press('Escape');
 await expect(header.locator(':scope>button')).toHaveCount(0);await expect(header.getByRole('combobox',{name:'현재 장과 컷 이동',exact:true})).toBeVisible();
 await expect(header.locator('[data-work-menu]>summary')).toHaveAccessibleName('설정');await expect(header.getByRole('button',{name:'현재 컷 뒤에 추가',exact:true})).not.toBeVisible();await expect(page.getByText('···',{exact:true})).toHaveCount(0);await expect(workbench(page).getByRole('button',{name:'기본편집',exact:true})).toHaveCount(0);await expect(workbench(page).getByRole('button',{name:'글 편집',exact:true})).toHaveCount(0);
 expect((await header.boundingBox())!.height).toBeLessThanOrEqual(52);
 await openWorkMenu(page);await expect(header.getByRole('button',{name:'서재로',exact:true})).toBeVisible();await expect(header.getByRole('button',{name:'작품 파일 저장',exact:true})).toBeVisible();await expect(header.getByRole('button',{name:'현재 컷 뒤에 추가',exact:true})).toBeVisible();
 await header.getByLabel('보기 설정',{exact:true}).click();await expect(header.getByRole('button',{name:'장 추가',exact:true})).toBeVisible();await page.keyboard.press('Escape');
 await settings(page);await page.getByRole('checkbox',{name:'음향 편집 사용',exact:true}).check();await mode(page,'음향 편집');await expect(header.locator('[data-work-menu]')).not.toHaveAttribute('open','');
 expect((await exported(page)).project).toEqual(before);await page.keyboard.press('Escape');await page.screenshot({path:info.outputPath('grouped-settings-phone.png'),fullPage:true});
});


test('library navigation is inside settings and returns to the same edited work',async({page})=>{
 const before=await prepare(page);await mode(page,'글 편집');await row(page,1).getByRole('textbox',{name:'2컷 글',exact:true}).fill('설정 안에서 서재로 갔다 돌아와도 남는 원고');await row(page,1).getByRole('button',{name:'이 컷 선택',exact:true}).click();
 await expect(page.getByRole('button',{name:'서재로',exact:true})).not.toBeVisible();await openWorkMenu(page);await page.getByRole('button',{name:'서재로',exact:true}).click();await expect(page.getByRole('main',{name:'로컬 서재',exact:true})).toBeVisible();
 await shelfCoverButton(page,before.title).click();await page.getByRole('dialog').getByRole('button',{name:'편집하기',exact:true}).click();await expect(workbench(page)).toBeVisible();await mode(page,'글 편집');await expect(row(page,1).getByRole('textbox',{name:'2컷 글',exact:true})).toHaveValue('설정 안에서 서재로 갔다 돌아와도 남는 원고');
 const after=(await exported(page)).project;expect(after.id).toBe(before.id);expect(after.lines[1].text).toBe('설정 안에서 서재로 갔다 돌아와도 남는 원고');expect(after.lines[1].stageComposition).toEqual(before.lines[1].stageComposition);expect(after.lines[1].flow).toEqual(before.lines[1].flow);
});

test('failed recovery write keeps the editor open when library navigation is requested',async({page})=>{
 await prepare(page);await page.evaluate(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='knolstory-next-workspace-v1')throw Error('quota');return original.call(this,key,value);};});
 await openWorkMenu(page);await page.getByRole('button',{name:'서재로',exact:true}).click();await expect(workbench(page)).toBeVisible();await expect(page.getByTestId('workspace-error')).toContainText('현재 편집을 유지');
});


test('background fit and focus edits preserve other presentation data and reset only focus',async({page})=>{
 const before=await prepare(page);await mode(page,'배경 편집');await row(page,0).getByText('1컷 배경 표시 조정',{exact:true}).click();await row(page,0).getByRole('combobox',{name:'1컷 배경 표시',exact:true}).selectOption('contain');await row(page,0).getByRole('slider',{name:'1컷 배경 중심 가로',exact:true}).press('End');await row(page,0).getByRole('slider',{name:'1컷 배경 중심 세로',exact:true}).press('Home');
 const after=(await exported(page)).project;expect(after.lines[0].presentation).toEqual({...before.lines[0].presentation,backgroundFit:'contain',backgroundFocal:{x:1,y:0}});expect(after.lines[0].stageComposition).toEqual(before.lines[0].stageComposition);expect(after.lines[0].audio).toEqual(before.lines[0].audio);expect(after.lines[0].flow).toEqual(before.lines[0].flow);expect(after.lines[1]).toEqual(before.lines[1]);
 await row(page,0).getByRole('button',{name:'1컷 배경 중심 초기화',exact:true}).click();const reset=(await exported(page)).project;expect(reset.lines[0].presentation).toEqual({...before.lines[0].presentation,backgroundFit:'contain'});await page.reload();await mode(page,'배경 편집');await row(page,0).getByText('1컷 배경 표시 조정',{exact:true}).click();await expect(row(page,0).getByRole('combobox',{name:'1컷 배경 표시',exact:true})).toHaveValue('contain');
});

for(const width of [320,390,1280])test(`story-game system menus preserve editor and reader actions ${width}`,async({page},info)=>{
 test.setTimeout(150000);await page.setViewportSize({width,height:width===390?844:720});const before=await prepare(page);await openWorkMenu(page);
 const editor=page.locator('[data-system-menu=editor]');await expect(editor).toBeVisible();await expect(editor.getByRole('button',{name:'서재로',exact:true})).toBeVisible();await expect(editor.getByRole('button',{name:'작품 파일 저장',exact:true})).toBeVisible();
 await page.getByRole('combobox',{name:'편집화면 선택',exact:true}).focus();expect((await page.getByRole('combobox',{name:'편집화면 선택',exact:true}).boundingBox())!.width).toBeGreaterThan((await editor.boundingBox())!.width-65);expect(await editor.evaluate(node=>node.scrollWidth<=node.clientWidth+1)).toBe(true);for(const button of await editor.getByRole('button').all()){if(await button.isVisible()){const b=(await button.boundingBox())!,e=(await editor.boundingBox())!;expect(b.x).toBeGreaterThanOrEqual(e.x);expect(b.x+b.width).toBeLessThanOrEqual(e.x+e.width+1);}}await page.screenshot({path:info.outputPath(`editor-system-menu-${width}.png`),fullPage:true});await page.keyboard.press('Escape');await expect(editor).not.toBeVisible();await expect(page.locator('[data-work-menu]>summary')).toBeFocused();
 await mode(page,'기본편집');await workbench(page).getByRole('button',{name:'이 컷부터 재생',exact:true}).click();const status=page.getByTestId('story-runtime-status');await expect.poll(async()=>{const revision=await status.getAttribute('data-rendered-revision');return revision!==null&&Number(revision)>=0&&revision===await status.getAttribute('data-scene-revision');},{timeout:120000}).toBe(true);
 await page.getByRole('button',{name:'읽기 메뉴',exact:true}).click();const player=page.locator('[data-system-menu=player]');await expect(player).toBeVisible();await page.screenshot({path:info.outputPath(`player-system-menu-${width}.png`),fullPage:true});await player.getByRole('button',{name:'읽기 설정',exact:true}).click();const dialog=page.getByRole('dialog',{name:'읽기 설정',exact:true});await expect(dialog).toBeVisible();const waitField=dialog.getByRole('spinbutton');const inputBox=(await waitField.boundingBox())!,unitBox=(await waitField.locator('..').locator(':scope>span').boundingBox())!;expect(Math.abs((inputBox.y+inputBox.height/2)-(unitBox.y+unitBox.height/2))).toBeLessThanOrEqual(2);expect(await dialog.evaluate(node=>node.scrollWidth<=node.clientWidth+1)).toBe(true);await dialog.getByRole('combobox',{name:'본문 글씨 크기',exact:true}).selectOption('1.15');await page.screenshot({path:info.outputPath(`player-settings-${width}.png`),fullPage:true});await page.keyboard.press('Escape');await expect(dialog).not.toBeVisible();await page.getByRole('button',{name:'읽기 메뉴',exact:true}).click();await player.getByRole('button',{name:'이 컷 편집하기',exact:true}).click();expect((await exported(page)).project).toEqual(before);
});

async function popupFits(dialog:Locator,page:Page){const b=(await dialog.boundingBox())!;expect(b.x).toBeGreaterThanOrEqual(0);expect(b.y).toBeGreaterThanOrEqual(0);expect(b.x+b.width).toBeLessThanOrEqual(page.viewportSize()!.width+1);expect(b.y+b.height).toBeLessThanOrEqual(page.viewportSize()!.height+1);expect(await dialog.evaluate(n=>n.scrollWidth<=n.clientWidth+1)).toBe(true);}

test('popup audit: import confirmation traps focus, cancels without modifying the work',async({page},info)=>{
 await page.setViewportSize({width:320,height:640});const before=await prepare(page);await openWorkMenu(page);await page.getByLabel('작품 파일 가져오기',{exact:true}).setInputFiles({name:'long.knolstory',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({documentType:'story-maker-project',schemaVersion:7,savedAt:'2026-10-19T00:00:00.000Z',appVersion:'test',project:{...fixture,title:'아주긴제목공백없이표시해도창밖으로넘치지않는작품제목'.repeat(3)}}))});
 const dialog=page.getByRole('dialog',{name:'작품 가져오기 확인',exact:true});await popupFits(dialog,page);const cancel=dialog.getByRole('button',{name:'가져오기 취소',exact:true}),apply=dialog.getByRole('button',{name:'내 사본으로 가져오기',exact:true});await cancel.focus();await page.keyboard.press('Shift+Tab');await expect(apply).toBeFocused();await page.keyboard.press('Tab');await expect(cancel).toBeFocused();await page.screenshot({path:info.outputPath('import-confirm-320.png'),fullPage:true});await page.keyboard.press('Escape');await expect(dialog).not.toBeVisible();expect((await exported(page)).project).toEqual(before);
});

for(const [width,height] of [[320,640],[640,360]])test(`popup audit: image selection pending cancel stays safe ${width}x${height}`,async({page},info)=>{
 await page.setViewportSize({width,height});const before=await prepare(page);await mode(page,'배경 편집');const opener=row(page,0).getByRole('button',{name:'1컷 배경 이미지 찾기',exact:true});await opener.click();const dialog=page.getByRole('dialog',{name:'이미지 선택 · 1컷 배경',exact:true});await popupFits(dialog,page);const current=await opener.getAttribute('data-asset-value');await dialog.locator(`[data-asset-id]:not([data-asset-id="${current}"])`).first().click();await page.screenshot({path:info.outputPath(`asset-selector-${width}.png`),fullPage:true});await dialog.getByRole('button',{name:'취소',exact:true}).click();await expect(opener).toBeFocused();expect((await exported(page)).project).toEqual(before);
});

test('popup audit: term search and flow map close back to settings without changing content',async({page},info)=>{
 await page.setViewportSize({width:320,height:480});const before=await prepare(page);await openWorkMenu(page);await page.getByLabel('보기 설정',{exact:true}).click();await page.getByRole('button',{name:'편집 용어 안내',exact:true}).click();const guide=page.getByRole('dialog',{name:'편집 용어 안내',exact:true});await popupFits(guide,page);await guide.getByRole('searchbox',{name:'용어 검색',exact:true}).fill('점수');await expect(guide).toContainText('점수');await page.screenshot({path:info.outputPath('terms-320-short.png'),fullPage:true});await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'편집 용어 안내',exact:true})).toBeFocused();await page.keyboard.press('Escape');await settings(page);await page.getByRole('checkbox',{name:'분기조건 편집 사용',exact:true}).check();await page.getByRole('button',{name:'전체 흐름 보기',exact:true}).click();const flow=page.getByRole('dialog',{name:/전체.*흐름|이야기 흐름/});await expect(flow).toBeVisible();await popupFits(flow,page);await page.screenshot({path:info.outputPath('flow-map-320.png'),fullPage:true});await page.keyboard.press('Escape');expect((await exported(page)).project).toEqual(before);
});

test('popup audit: cut deletion opens compact and safe cancel keeps all authored data',async({page},info)=>{
 await page.setViewportSize({width:320,height:640});const before=await prepare(page);await page.keyboard.press('Escape');const detail=workbench(page).locator('details').filter({has:page.locator('summary',{hasText:'현재 컷 상세·메모·정리'})}).first();await detail.locator(':scope>summary').click();await detail.getByRole('button',{name:'현재 컷 삭제',exact:true}).click();const dialog=page.getByRole('dialog',{name:'컷 삭제 확인',exact:true});await popupFits(dialog,page);await expect(dialog.getByRole('button',{name:'삭제 취소',exact:true})).toBeFocused();await page.screenshot({path:info.outputPath('cut-delete-320.png'),fullPage:true});await page.keyboard.press('Escape');await expect(dialog).not.toBeVisible();expect((await exported(page)).project).toEqual(before);
});

for(const [width,height] of [[320,640],[640,360]])test(`popup audit: book details and cover draft stay bounded ${width}x${height}`,async({page},info)=>{
 await page.setViewportSize({width,height});const before=await prepare(page);await openWorkMenu(page);await page.getByRole('button',{name:'서재로',exact:true}).click();await shelfCoverButton(page,before.title).click();const book=page.getByRole('dialog');await popupFits(book,page);await page.screenshot({path:info.outputPath(`library-book-${width}.png`),fullPage:true});await book.locator('summary').filter({hasText:'책 꾸미기·작품 도구'}).click();await book.getByRole('button',{name:'책 표지 편집',exact:true}).click();const cover=page.getByRole('dialog',{name:'내 책 표지 꾸미기',exact:true});await popupFits(cover,page);await cover.getByRole('textbox',{name:'작품 제목',exact:true}).fill('취소하면 남지 않을 표지 초안');await page.screenshot({path:info.outputPath(`cover-draft-${width}.png`),fullPage:true});await cover.getByRole('button',{name:'취소',exact:true}).click();await expect(cover).not.toBeVisible();await page.getByRole('button',{name:'현재 컷 쓰기',exact:true}).click();expect((await exported(page)).project).toEqual(before);
});

test('popup audit: staging import and current flow context cancel without authoring changes',async({page},info)=>{
 await page.setViewportSize({width:320,height:640});const before=await prepare(page);const controls=await settings(page);await controls.getByRole('checkbox',{name:'인물 편집 사용',exact:true}).check();await mode(page,'인물 편집');await row(page,1).getByRole('button',{name:'다른 컷 배치 가져오기',exact:true}).click();const staging=page.getByRole('dialog',{name:'다른 컷 배치 가져오기',exact:true});await popupFits(staging,page);await page.screenshot({path:info.outputPath('staging-import-320.png'),fullPage:true});await page.keyboard.press('Escape');expect((await exported(page)).project).toEqual(before);
 await settings(page);await page.getByRole('checkbox',{name:'분기조건 편집 사용',exact:true}).check();await page.keyboard.press('Escape');const logic=workbench(page).locator('details').filter({has:page.locator('summary',{hasText:'현재 컷의 선택지·분기조건 편집'})}).first();await logic.locator(':scope>summary').click();await page.getByRole('button',{name:'현재 컷 연결 살펴보기',exact:true}).click();const context=page.getByRole('dialog',{name:'현재 컷 연결 살펴보기',exact:true});await popupFits(context,page);await page.screenshot({path:info.outputPath('flow-context-320.png'),fullPage:true});await page.keyboard.press('Escape');expect((await exported(page)).project).toEqual(before);
});

test('popup audit: ShortStory delete cancel preserves book and page',async({page},info)=>{
 await page.setViewportSize({width:320,height:640});await page.goto('/shortstory');await page.getByLabel('이야기 제목',{exact:true}).fill('확인창에서 보존할 그림책');await page.getByLabel('이 쪽의 이야기',{exact:true}).fill('삭제 취소 뒤에도 그대로인 글');await page.getByRole('button',{name:'임시 보관',exact:true}).click();const before=await page.evaluate(()=>localStorage.getItem('knolstory-shortstory-library-v1'));await page.getByRole('button',{name:'이 그림책 삭제',exact:true}).click();const dialog=page.getByRole('dialog',{name:'삭제 확인',exact:true});await popupFits(dialog,page);await page.screenshot({path:info.outputPath('shortstory-delete-320.png'),fullPage:true});await page.keyboard.press('Escape');expect(await page.evaluate(()=>localStorage.getItem('knolstory-shortstory-library-v1'))).toBe(before);
});

test('popup audit: new branch preview and local-work deletion cancel safely',async({page},info)=>{
 await page.setViewportSize({width:320,height:640});await prepare(page);await settings(page);await page.getByRole('checkbox',{name:'선택지 편집 사용',exact:true}).check();await page.getByRole('checkbox',{name:'분기조건 편집 사용',exact:true}).check();await page.keyboard.press('Escape');const detail=workbench(page).locator('details').filter({has:page.locator('summary',{hasText:'현재 컷의 선택지·분기조건 편집'})}).first();await detail.locator(':scope>summary').click();await detail.getByRole('combobox',{name:'진행 방식',exact:true}).selectOption('choice');const before=(await exported(page)).project;await page.keyboard.press('Escape');await detail.getByRole('button',{name:'선택지 1에 새 장 연결',exact:true}).click();const branch=page.getByRole('dialog',{name:'새 갈래 작성',exact:true});await popupFits(branch,page);await page.screenshot({path:info.outputPath('new-branch-320.png'),fullPage:true});await page.keyboard.press('Escape');expect((await exported(page)).project).toEqual(before);await page.keyboard.press('Escape');await openWorkMenu(page);await page.getByRole('button',{name:'서재로',exact:true}).click();await shelfCoverButton(page,before.title).click();const book=page.getByRole('dialog');await book.locator('summary').filter({hasText:'책 꾸미기·작품 도구'}).click();await book.getByRole('button',{name:/작품 삭제|내 작품 삭제|이 작품 삭제/}).click();const deletion=page.getByRole('dialog',{name:'내 작품 삭제 확인',exact:true});await popupFits(deletion,page);await page.screenshot({path:info.outputPath('work-delete-320.png'),fullPage:true});await page.keyboard.press('Escape');await expect(shelfCoverButton(page,before.title)).toBeVisible();
});

test('popup audit: corrupt ShortStory recovery uses explicit app confirmation and preserves original bytes',async({page},info)=>{
 await page.setViewportSize({width:320,height:640});await page.addInitScript(()=>localStorage.setItem('knolstory-shortstory-library-v1','broken-original-workspace'));await page.goto('/shortstory');await page.getByRole('button',{name:'보관함 새로 시작',exact:true}).click();const dialog=page.getByRole('dialog',{name:'보관함 새로 시작',exact:true});await popupFits(dialog,page);await expect(dialog.getByRole('button',{name:'취소',exact:true})).toBeFocused();await page.screenshot({path:info.outputPath('shortstory-recovery-320.png'),fullPage:true});await page.keyboard.press('Escape');expect(await page.evaluate(()=>localStorage.getItem('knolstory-shortstory-library-v1'))).toBe('broken-original-workspace');await page.getByRole('button',{name:'보관함 새로 시작',exact:true}).click();await dialog.getByRole('button',{name:'새 보관함 시작',exact:true}).click();await expect(dialog).not.toBeVisible();expect(await page.evaluate(()=>Object.keys(localStorage).filter(key=>key.startsWith('knolstory-shortstory-recovery-')).map(key=>localStorage.getItem(key)))).toContain('broken-original-workspace');
});

test('connection information names source chapters choices and score thresholds without altering the work',async({page},info)=>{
 // Exercise actual engine startup while the rule editor hides its preview.
 await page.setViewportSize({width:390,height:844});await prepare(page);
 const source={...fixture,scores:[{id:'trust',name:'신뢰',description:'친구를 믿는 마음',initial:0}],chapters:fixture.chapters.map((chapter,index)=>index===0?{...chapter,chapterNumber:2}:chapter),lines:fixture.lines.map((line,index)=>index===0?{...line,flow:{type:'choice',options:[{id:'help',label:'친구를 돕는다',targetLineId:cutIds[2]},{id:'wait',label:'기다린다',targetLineId:cutIds[1]}]}}:index===1?{...line,flow:{type:'goto',targetLineId:null,routes:[{id:'trust-route',condition:{mode:'all',terms:[{scoreId:'trust',operator:'gte',value:3}]},targetLineId:cutIds[2]}]}}:line)};
 await importRaw(page,JSON.stringify({documentType:'story-maker-project',schemaVersion:8,savedAt:'2026-10-19T00:00:00.000Z',appVersion:'test',project:source}));const before=(await exported(page)).project;
 await settings(page);await page.getByRole('checkbox',{name:'분기조건 편집 사용',exact:true}).check();await mode(page,'글 편집');await row(page,2).getByRole('button',{name:'이 컷 선택',exact:true}).click();const detail=workbench(page).locator('details').filter({has:page.locator('summary',{hasText:'현재 컷 상세·메모·정리'})}).first();await detail.locator(':scope>summary').click();await detail.getByRole('button',{name:'현재 컷 삭제',exact:true}).click();const deletion=page.getByRole('dialog',{name:'컷 삭제 확인',exact:true});await expect(deletion).toContainText('‘친구를 돕는다’를 선택하면');await expect(deletion).toContainText('신뢰 3점 이상일 때');await expect(deletion).toContainText('2장');await expect(deletion).not.toContainText('명시 연결');await page.screenshot({path:info.outputPath('friendly-delete-connections.png'),fullPage:true});await page.keyboard.press('Escape');await page.keyboard.press('Escape');
 const logic=workbench(page).locator('details').filter({has:page.locator('summary',{hasText:'현재 컷의 선택지·분기조건 편집'})}).first();await logic.locator(':scope>summary').click();await page.getByRole('button',{name:'현재 컷 연결 살펴보기',exact:true}).click();const context=page.getByRole('dialog',{name:'현재 컷 연결 살펴보기',exact:true});await expect(context).toContainText('‘친구를 돕는다’를 선택하면');await expect(context).toContainText('신뢰 3점 이상일 때');await expect(context).toContainText('여러 길이 다시 만나는 지점');await page.screenshot({path:info.outputPath('friendly-connection-context.png'),fullPage:true});await page.keyboard.press('Escape');await settings(page);await page.getByRole('button',{name:'전체 흐름 보기',exact:true}).click();const map=page.getByRole('dialog',{name:'전체 이야기 흐름',exact:true});await map.locator('summary').filter({hasText:'여러 길이 다시 만나는 지점'}).click();await expect(map).toContainText('‘친구를 돕는다’를 선택하면');await expect(map).toContainText('신뢰 3점 이상일 때');await page.screenshot({path:info.outputPath('join-points-map.png'),fullPage:true});await page.keyboard.press('Escape');await page.keyboard.press('Escape');expect((await exported(page)).project).toEqual(before);
});

test('score branching edits 그리고 or 또는 explicitly and keeps both score terms on file reopen',async({page})=>{
 await page.setViewportSize({width:390,height:844});await prepare(page);const source={...fixture,scores:[{id:'trust',name:'신뢰',description:'',initial:0},{id:'courage',name:'용기',description:'',initial:0}],lines:fixture.lines.map((line,index)=>index===0?{...line,flow:{type:'goto',targetLineId:cutIds[1],routes:[{id:'two-scores',targetLineId:cutIds[2],condition:{mode:'all',terms:[{scoreId:'trust',operator:'gte',value:3},{scoreId:'courage',operator:'gte',value:2}]}}]}}:line)};await importRaw(page,JSON.stringify({documentType:'story-maker-project',schemaVersion:8,savedAt:'2026-10-19T00:00:00.000Z',appVersion:'test',project:source}));await settings(page);await page.getByRole('checkbox',{name:'점수 편집 사용',exact:true}).check();await page.getByRole('checkbox',{name:'분기조건 편집 사용',exact:true}).check();await page.keyboard.press('Escape');const detail=workbench(page).locator('details').filter({has:page.locator('summary',{hasText:'현재 컷의 선택지·분기조건 편집'})}).first();await detail.locator(':scope>summary').click();await detail.getByText('점수 조건에 따른 진행',{exact:true}).click();const combine=detail.getByRole('combobox',{name:'진행 1 조건 묶음',exact:true});await expect(combine.locator('option[value=all]')).toHaveText('그리고 · 모든 조건을 만족할 때');await expect(combine.locator('option[value=any]')).toHaveText('또는 · 하나라도 만족할 때');await combine.selectOption('any');await page.keyboard.press('Escape');const after=(await exported(page)).project,flow=after.lines[0].flow;expect(flow).toEqual({...source.lines[0].flow,routes:[{...source.lines[0].flow!.routes![0],condition:{...source.lines[0].flow!.routes![0].condition,mode:'any'}}]});await importRaw(page,(await exported(page)).raw);const reopened=(await exported(page)).project;expect(reopened.lines).toEqual(after.lines);
});

test('speaker and choice Korean composition keep active inputs editable while blocking cut and screen changes',async({page})=>{
 await prepare(page);const detail=workbench(page).locator('details').filter({has:page.locator('summary',{hasText:'현재 컷 상세·메모·정리'})}).first();await detail.locator(':scope>summary').click();
 const name=detail.getByRole('textbox',{name:'말하는 인물 이름',exact:true});await name.focus();await name.dispatchEvent('compositionstart');
 await expect(name).toBeEnabled();await expect(page.getByRole('combobox',{name:'현재 장과 컷 이동',exact:true})).toBeDisabled();await expect(detail.getByRole('combobox',{name:'글 종류',exact:true})).toBeDisabled();
 await name.fill('한글 이름 조합');await name.dispatchEvent('compositionend');await expect(page.getByRole('combobox',{name:'현재 장과 컷 이동',exact:true})).toBeEnabled();
 await settings(page);await page.getByRole('checkbox',{name:'선택지 편집 사용',exact:true}).check();await page.keyboard.press('Escape');
 const flow=workbench(page).locator('details').filter({has:page.locator('summary',{hasText:'현재 컷의 선택지·분기조건 편집'})}).first();await flow.locator(':scope>summary').click();await flow.getByRole('combobox',{name:'진행 방식',exact:true}).selectOption('choice');
 const choice=flow.getByRole('textbox',{name:'선택지 1 문구',exact:true});await choice.focus();await choice.dispatchEvent('compositionstart');await expect(choice).toBeEnabled();
 await expect(page.getByRole('combobox',{name:'현재 장과 컷 이동',exact:true})).toBeDisabled();await expect(flow.getByRole('combobox',{name:'진행 방식',exact:true})).toBeDisabled();
 await choice.fill('조합 중인 선택 문구');await choice.dispatchEvent('compositionend');await expect(flow.getByRole('combobox',{name:'진행 방식',exact:true})).toBeEnabled();
 const after=(await exported(page)).project;expect(after.lines[0].speakerName).toBe('한글 이름 조합');expect(after.lines[0].flow?.type).toBe('choice');if(after.lines[0].flow?.type==='choice')expect(after.lines[0].flow.options[0].label).toBe('조합 중인 선택 문구');
});

test('character opt-in restores speaker linking and registration without opening tools by default',async({page},info)=>{
 await prepare(page);let detail=workbench(page).locator('details').filter({has:page.locator('summary',{hasText:'현재 컷 상세·메모·정리'})}).first();await detail.locator(':scope>summary').click();
 await expect(detail.getByText('말하는 인물 상세 설정',{exact:true})).toHaveCount(0);
 await settings(page);await page.getByRole('checkbox',{name:'인물 편집 사용',exact:true}).check();await page.keyboard.press('Escape');
 if(!await detail.evaluate(node=>(node as HTMLDetailsElement).open))await detail.locator(':scope>summary').click();
 await detail.getByText('말하는 인물 상세 설정',{exact:true}).click();
 const link=detail.getByRole('combobox',{name:'말하는 인물 그림',exact:true}),current=await link.inputValue(),keys=await link.locator('option').evaluateAll(nodes=>nodes.map(node=>(node as HTMLOptionElement).value).filter(Boolean)),key=keys.find(value=>value!==current);expect(key).toBeTruthy();
 const before=(await exported(page)).project;
 // Export dismisses the detail. Reopen through the same current settings entry.
 await page.keyboard.press('Escape');if(!await detail.evaluate(node=>(node as HTMLDetailsElement).open))await detail.locator(':scope>summary').click();
 const speakerDetail=detail.getByText('말하는 인물 상세 설정',{exact:true}).locator('..');if(!await speakerDetail.evaluate(node=>(node as HTMLDetailsElement).open))await speakerDetail.locator(':scope>summary').click();
 await link.selectOption(key!);await detail.getByText('말하는 인물 설정 · 기본 이미지',{exact:true}).click();
 const name=detail.getByRole('textbox',{name:'새 말하는 인물 이름',exact:true});await name.focus();await name.dispatchEvent('compositionstart');await expect(name).toBeEnabled();await expect(page.getByRole('combobox',{name:'현재 장과 컷 이동',exact:true})).toBeDisabled();await expect(detail.getByRole('button',{name:'말하는 인물 등록',exact:true})).toBeDisabled();
 await name.fill('새로 등록한 인물');await name.dispatchEvent('compositionend');await detail.getByRole('button',{name:'말하는 인물 등록',exact:true}).click();
 await expect(detail.getByRole('combobox',{name:'등록된 말하는 인물',exact:true}).locator('option').filter({hasText:'새로 등록한 인물'})).toHaveCount(1);
 const after=(await exported(page)).project;expect(after.lines.map(line=>line.text)).toEqual(before.lines.map(line=>line.text));expect(after.lines.map(line=>line.flow)).toEqual(before.lines.map(line=>line.flow));expect(after.chapters[0].chapterSpeakerNames).toContain('새로 등록한 인물');expect(after.lines[0].stageComposition?.speakerActorKeys).toEqual([key]);expect(after.lines.slice(1)).toEqual(before.lines.slice(1));
 await settings(page);await page.getByRole('checkbox',{name:'인물 편집 사용',exact:true}).uncheck();expect((await exported(page)).project).toEqual(after);
 const archive=await exported(page);await importRaw(page,archive.raw);const reopened=(await exported(page)).project;expect(reopened).toEqual({...after,id:reopened.id});
 await page.screenshot({path:info.outputPath('speaker-opt-in-preserved.png')});
});
