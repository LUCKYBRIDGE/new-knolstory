import {test,expect,type Page,type Locator} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {PNG} from 'pngjs';
import {createStoryDocument} from '../../packages/story-domain/src';
import {confirmAuthoringImport,currentCutRow,currentCutText} from './authoring-file';
import {enableEditing,openChoiceEditing,openEditingScreen,openEditingTool} from './editor-screens';
import {suppressFullscreenOffer} from './mobile-fullscreen-offer';
test.beforeEach(async({page})=>{await suppressFullscreenOffer(page);});
/** Choosing an effect opens its tip dialog; "사용" applies it. */
async function chooseEffect(page:Page,value:string,name:string){
 await page.getByLabel('효과',{exact:true}).selectOption(value);
 await page.getByRole('dialog',{name,exact:true}).getByRole('button',{name:'사용',exact:true}).click();
}
async function openTool(page:Page,name:string){
 page.setDefaultTimeout(15000);
 await openEditingTool(page,name);
 if(name==='연출 편집')await page.getByLabel('조정할 연출',{exact:true}).selectOption('effects');
}
/** Changing 진행 방식 may ask for a confirmation; accept it. */
async function setFlowType(page:Page,value:string){
 await page.getByLabel('진행 방식',{exact:true}).selectOption(value);
 const confirm=page.getByRole('dialog',{name:'진행 방식 변경 확인',exact:true});if(await confirm.isVisible())await confirm.getByRole('button',{name:'진행 방식 변경',exact:true}).click();
}
/** Reports controls of an editing area that visibly overlap each other. */
function overlappingControls(area:Locator){
 return area.evaluate(node=>{const controls=[...node.querySelectorAll('input:not([type=hidden]),select,textarea,button')].filter(el=>{const r=el.getBoundingClientRect();return el.checkVisibility()&&r.width>0&&r.height>0});const bad=[];for(let i=0;i<controls.length;i++)for(let j=i+1;j<controls.length;j++){const a=controls[i].getBoundingClientRect(),b=controls[j].getBoundingClientRect();if(Math.min(a.right,b.right)-Math.max(a.left,b.left)>2&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>2)bad.push([controls[i].getAttribute('aria-label')||controls[i].textContent,controls[j].getAttribute('aria-label')||controls[j].textContent]);}return bad;});
}
async function nativeReady(page:Page){await page.getByTestId('story-stage-viewport').scrollIntoViewIfNeeded();await expect.poll(async()=>{const el=page.getByTestId('story-runtime-status');return Number(await el.getAttribute('data-rendered-revision'))>=0&&(await el.getAttribute('data-rendered-revision'))===(await el.getAttribute('data-scene-revision'));},{timeout:120000}).toBe(true);}
async function nativeGlyphPixels(page:Page,kind:'speaker'|'body'){
 const data=await page.getByTestId('story-runtime-status').evaluate(node=>({...((node as HTMLElement).dataset)}));const rect=JSON.parse(data.dialogueRects!)[kind],frame=(await page.getByTestId('story-runtime-frame').boundingBox())!,scale=frame.width/Number(data.sceneWidth);
 const inset=kind==='speaker'?{x:12,y:3}: {x:2,y:2};
 const pixels=PNG.sync.read(await page.screenshot({clip:{x:frame.x+(rect.x+inset.x)*scale,y:frame.y+(rect.y+inset.y)*scale,width:(rect.width-inset.x*2)*scale,height:(rect.height-inset.y*2)*scale}}));
 // The perspective card paints light text on a dark panel (speaker dimmer than body); count pixels that clearly differ from the region's median brightness.
 const lum:number[]=[];for(let i=0;i<pixels.data.length;i+=4)lum.push(.299*pixels.data[i]+.587*pixels.data[i+1]+.114*pixels.data[i+2]);
 const median=[...lum].sort((a,b)=>a-b)[Math.floor(lum.length/2)];let count=0;
 for(const value of lum)if(Math.abs(value-median)>(kind==='speaker'?40:70))count++;
 return count;
}
async function importOnggojib(page:Page){
 const project=JSON.parse(readFileSync('tests/fixtures/stories/onggojib.json','utf8'));await page.goto('/?view=editor');await page.locator('[data-work-menu]>summary').click();await page.getByLabel('작품 파일 가져오기').setInputFiles({name:'onggo-ui.knolstory',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(createStoryDocument({savedAt:'2026-10-14T00:00:00.000Z',appVersion:'current-ui-test',project})))});await confirmAuthoringImport(page);const cut=project.lines.find((line:{speakerName:string;text:string})=>line.speakerName==='시점 전환'&&line.text==='옹고집의 시점');await page.getByLabel('현재 장과 컷 이동').selectOption(cut.id);return cut;
}
for(const size of [{width:1440,height:900},{width:768,height:1024},{width:390,height:844},{width:844,height:390}])test(`measured native label never overlaps original viewpoint text ${size.width}`,async({page},info)=>{
 await page.setViewportSize(size);const cut=await importOnggojib(page);await nativeReady(page);
 await expect(page.getByLabel('현재 컷 화자',{exact:true})).toHaveValue('시점 전환');await expect(await currentCutText(page)).toHaveValue('옹고집의 시점');
 const report=()=>page.getByTestId('story-runtime-status').getAttribute('data-dialogue-rects');
 let rects=JSON.parse((await report())!);expect(rects.speaker.y+rects.speaker.height).toBeLessThanOrEqual(rects.body.y-8);expect(rects.body.height).toBeGreaterThan(0);
 await page.getByLabel('현재 컷 화자',{exact:true}).fill('긴 화자 이름을 읽기 쉽게 표시해요 '.repeat(6));await nativeReady(page);rects=JSON.parse((await report())!);expect(rects.speaker.y).toBeGreaterThanOrEqual(0);expect(rects.speaker.y+rects.speaker.height).toBeLessThanOrEqual(rects.body.y-8);
 await page.getByLabel('현재 컷 화자',{exact:true}).fill(cut.speakerName);await nativeReady(page);await page.screenshot({path:info.outputPath('viewpoint-edit.png'),fullPage:true});
 await page.getByRole('button',{name:'이 컷부터 재생',exact:true}).click();await nativeReady(page);await page.screenshot({path:info.outputPath('viewpoint-read-before-glyph.png')});await expect.poll(()=>nativeGlyphPixels(page,'speaker'),{timeout:8000}).toBeGreaterThan(50);await expect.poll(()=>nativeGlyphPixels(page,'body'),{timeout:8000}).toBeGreaterThan(80);await page.screenshot({path:info.outputPath('viewpoint-read.png')});
 rects=JSON.parse((await report())!);expect(rects.speaker.y+rects.speaker.height).toBeLessThanOrEqual(rects.body.y-8);
 await page.getByRole('button',{name:'읽기 메뉴',exact:true}).click();await page.getByRole('button',{name:'이 컷 편집하기',exact:true}).click();await expect(await currentCutText(page)).toHaveValue(cut.text);
});
for(const size of [{width:1440,height:900},{width:768,height:1024},{width:390,height:844},{width:844,height:390}])test(`clear tools stay reachable and form rows do not overlap ${size.width}`,async({page})=>{
 page.setDefaultTimeout(15000);await page.setViewportSize(size);await page.goto('/?view=editor');
 await expect(page.getByText('현재 컷을 글자로 읽기',{exact:true})).toHaveCount(0);await expect(await currentCutText(page)).toBeVisible();
 // Each editing screen (and the choice dock) exposes its own controls for the selected cut without overlapping rows or page overflow.
 for(const tool of ['배경 편집','인물 편집','선택지 편집','연출 편집','소리 편집']){
  let area:Locator;
  if(tool==='배경 편집'||tool==='인물 편집'){await openEditingScreen(page,tool);area=await currentCutRow(page);}
  else if(tool==='선택지 편집')area=(await openChoiceEditing(page)).locator('[data-inspector-section="flow"]');
  else{await openTool(page,tool);area=await currentCutRow(page);}
  await expect(area).toBeVisible();expect(await overlappingControls(area)).toEqual([]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }
 await openEditingScreen(page,'기본편집');const flow=await openChoiceEditing(page);await setFlowType(page,'choice');
 const card=flow.locator('[class*="choiceCard"]').first();
 await expect(card.getByText('선택 결과·표시 조건',{exact:true})).toHaveCount(0);
 await expect(card.getByRole('button',{name:'점수 변화 추가',exact:true})).toHaveCount(0);
 await enableEditing(page,'점수');await page.locator('[data-work-menu]>summary').click();await page.getByRole('button',{name:'이야기 점수',exact:true}).click();
 const scores=page.getByRole('region',{name:'이야기 점수 설정',exact:true});await scores.getByLabel('새 점수 이름',{exact:true}).fill('함께 찾은 길');await scores.getByRole('button',{name:'점수 만들기',exact:true}).click();
 await page.getByRole('button',{name:'현재 컷으로 돌아가기',exact:true}).click();await openChoiceEditing(page);
 await card.getByText('선택 결과·표시 조건',{exact:true}).click();await expect(card.getByRole('button',{name:'점수 변화 추가',exact:true})).toBeEnabled();
 await expect(card.locator('summary').filter({hasText:'점수 변화·표시 조건'})).toHaveCount(0);
});

test('long Korean choice labels stay inside the choice popup within the stage',async({page},info)=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/?view=editor');
 await openChoiceEditing(page);await setFlowType(page,'choice');
 await page.getByLabel('선택지 1 문구').fill('주변 사람들과 충분히 이야기를 나눈 뒤 함께 길을 찾아가기로 결정한다. '.repeat(12));
 await page.getByRole('button',{name:'이 컷부터 재생',exact:true}).click();await nativeReady(page);
 // The sound-start gate must be passed before the choices are drawn.
 const gate=page.getByTestId('story-runtime-frame').contentFrame().getByRole('button',{name:'소리 켜고 시작 · Enter 또는 Space',exact:true});if(await gate.count())await gate.press('Enter');
 const status=page.getByTestId('story-runtime-status');await expect.poll(async()=>await status.getAttribute('data-choices-rect'),{timeout:20000}).not.toBeNull();await nativeReady(page);
 // Choices are a popup over the stage (reading-interface-design.md "기본 2~4개 선택지"): long labels must stay inside the stage, never be cut off, and every option stays reachable.
 const choices=JSON.parse((await status.getAttribute('data-choices-rect'))!),width=Number(await status.getAttribute('data-scene-width')),height=Number(await status.getAttribute('data-scene-height'));
 await page.screenshot({path:info.outputPath('long-choice-scroll.png')});expect(choices.x).toBeGreaterThanOrEqual(0);expect(choices.y).toBeGreaterThanOrEqual(0);expect(choices.x+choices.width).toBeLessThanOrEqual(width);expect(choices.y+choices.height).toBeLessThanOrEqual(height);
 await expect(page.getByTestId('playback-status')).toHaveText('선택해 주세요');
});
for(const size of [{width:1440,height:900},{width:390,height:844},{width:844,height:390}])test(`work/settings menus and image dialog remain within screen ${size.width}`,async({page})=>{
 await page.setViewportSize(size);await page.goto('/?view=editor');
 const menu=page.locator('[data-work-menu]'),summary=menu.locator(':scope>summary'),text=await currentCutText(page);
 // The 보기 설정 group now sits inside the single 설정 menu; Escape and a click on the writing field both close the whole menu.
 await summary.click();await menu.getByText('보기 설정',{exact:true}).click();await expect(menu).toHaveAttribute('open','');
 const panel=await menu.locator(':scope>div').first().boundingBox();expect(panel!.x).toBeGreaterThanOrEqual(0);expect(panel!.x+panel!.width).toBeLessThanOrEqual(size.width);
 await page.keyboard.press('Escape');await expect(menu).not.toHaveAttribute('open','');
 // Narrow screens cover the field with the menu panel, so click the visible margin outside it instead.
 await summary.click();const covered=await text.evaluate(node=>{const r=node.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)!==node;});if(covered)await page.mouse.click(3,size.height/2);else await text.click();await expect(menu).not.toHaveAttribute('open','');
 await page.getByRole('button',{name:/배경 이미지 찾기 ·/}).click();
 const dialog=page.getByRole('dialog',{name:'이미지 선택 · 1컷 배경'});await expect(dialog).toBeVisible();const rect=await dialog.boundingBox();expect(rect!.x).toBeGreaterThanOrEqual(0);expect(rect!.y).toBeGreaterThanOrEqual(0);expect(rect!.x+rect!.width).toBeLessThanOrEqual(size.width);expect(rect!.y+rect!.height).toBeLessThanOrEqual(size.height);
 const footer=dialog.getByRole('button',{name:'선택한 이미지 적용',exact:true});await expect(footer).toBeVisible();await footer.scrollIntoViewIfNeeded();const footerRect=await footer.boundingBox();expect(footerRect!.y+footerRect!.height).toBeLessThanOrEqual(size.height);
 await dialog.getByRole('button',{name:'이미지 선택 닫기'}).click();await expect(text).toBeVisible();
});

 test('effect undo belongs to the cut that was edited',async({page})=>{
 await page.goto('/?view=editor');await openTool(page,'연출 편집');
 await chooseEffect(page,'shake','화면 흔들림');await expect(page.getByRole('button',{name:'마지막 효과 변경 취소',exact:true})).toBeEnabled();
 const position=page.getByLabel('현재 장과 컷 이동');const next=await position.locator('option').evaluateAll(options=>(options[1] as HTMLOptionElement).value);await position.selectOption(next);await openTool(page,'연출 편집');
 await expect(page.getByRole('button',{name:'마지막 효과 변경 취소',exact:true})).toHaveCount(0);
 await chooseEffect(page,'flash','하얀 섬광');await page.getByRole('button',{name:'마지막 효과 변경 취소',exact:true}).click();await expect(page.getByLabel('효과',{exact:true})).toHaveValue('');
 });

for(const size of [{width:768,height:1024},{width:390,height:844},{width:844,height:390}])test(`cut range fields fit their panel ${size.width}`,async({page})=>{
 await page.setViewportSize(size);await page.goto('/?view=editor');await openTool(page,'연출 편집');await chooseEffect(page,'shake','화면 흔들림');await page.getByLabel('효과 적용 범위',{exact:true}).selectOption('following');
 const range=page.getByLabel('효과 종료 컷',{exact:true});const panel=page.getByTestId('story-effect-controls');const bounds=await panel.boundingBox(),rect=await range.boundingBox();expect(rect!.x+rect!.width).toBeLessThanOrEqual(bounds!.x+bounds!.width+1);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
