import {test,expect,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {PNG} from 'pngjs';
import {confirmAuthoringImport} from './authoring-file';
async function nativeReady(page:Page){await page.getByTestId('story-stage-viewport').scrollIntoViewIfNeeded();await expect.poll(async()=>{const el=page.getByTestId('story-runtime-status');return Number(await el.getAttribute('data-rendered-revision'))>=0&&(await el.getAttribute('data-rendered-revision'))===(await el.getAttribute('data-scene-revision'));},{timeout:120000}).toBe(true);}
async function nativeGlyphPixels(page:Page,kind:'speaker'|'body'){
 const data=await page.getByTestId('story-runtime-status').evaluate(node=>({...((node as HTMLElement).dataset)}));const rect=JSON.parse(data.dialogueRects!)[kind],frame=(await page.getByTestId('story-runtime-frame').boundingBox())!,scale=frame.width/Number(data.sceneWidth);
 const inset=kind==='speaker'?{x:12,y:3}: {x:2,y:2};
 const pixels=PNG.sync.read(await page.screenshot({clip:{x:frame.x+(rect.x+inset.x)*scale,y:frame.y+(rect.y+inset.y)*scale,width:(rect.width-inset.x*2)*scale,height:(rect.height-inset.y*2)*scale}}));let count=0;
 for(let i=0;i<pixels.data.length;i+=4){const r=pixels.data[i],g=pixels.data[i+1],b=pixels.data[i+2];if(kind==='speaker'?r>190&&g>190&&b>190:r<100&&g<110&&b<110)count++;}
 return count;
}
async function importOnggojib(page:Page){
 const project=JSON.parse(readFileSync('tests/fixtures/stories/onggojib.json','utf8'));await page.goto('/?view=editor');await page.locator('[data-work-menu]>summary').click();await page.getByLabel('작품 파일 가져오기').setInputFiles({name:'onggo-ui.knolstory',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({documentType:'story-maker-project',schemaVersion:project.scores?6:5,savedAt:'2026-10-11T00:00:00.000Z',appVersion:'test',project}))});await confirmAuthoringImport(page);const cut=project.lines.find((line:{speakerName:string;text:string})=>line.speakerName==='시점 전환'&&line.text==='옹고집의 시점');await page.getByLabel('현재 장과 컷 이동').selectOption(cut.id);return cut;
}
for(const size of [{width:1440,height:900},{width:768,height:1024},{width:390,height:844},{width:844,height:390}])test(`measured native label never overlaps original viewpoint text ${size.width}`,async({page},info)=>{
 await page.setViewportSize(size);const cut=await importOnggojib(page);await nativeReady(page);
 await expect(page.getByLabel('말하는 인물 이름',{exact:true})).toHaveValue('시점 전환');await expect(page.getByLabel('대사 / 해설',{exact:true})).toHaveValue('옹고집의 시점');
 const report=()=>page.getByTestId('story-runtime-status').getAttribute('data-dialogue-rects');
 let rects=JSON.parse((await report())!);expect(rects.speaker.y+rects.speaker.height).toBeLessThanOrEqual(rects.body.y-8);expect(rects.body.height).toBeGreaterThan(0);
 await page.getByLabel('말하는 인물 이름',{exact:true}).fill('긴 화자 이름을 읽기 쉽게 표시합니다 '.repeat(6));await nativeReady(page);rects=JSON.parse((await report())!);expect(rects.speaker.y).toBeGreaterThanOrEqual(0);expect(rects.speaker.y+rects.speaker.height).toBeLessThanOrEqual(rects.body.y-8);
 await page.getByLabel('말하는 인물 이름',{exact:true}).fill(cut.speakerName);await nativeReady(page);await page.screenshot({path:info.outputPath('viewpoint-edit.png'),fullPage:true});
 await page.getByRole('button',{name:'이 컷부터 재생',exact:true}).click();await nativeReady(page);await page.screenshot({path:info.outputPath('viewpoint-read-before-glyph.png')});await expect.poll(()=>nativeGlyphPixels(page,'speaker'),{timeout:8000}).toBeGreaterThan(50);await expect.poll(()=>nativeGlyphPixels(page,'body'),{timeout:8000}).toBeGreaterThan(80);await page.screenshot({path:info.outputPath('viewpoint-read.png')});
 rects=JSON.parse((await report())!);expect(rects.speaker.y+rects.speaker.height).toBeLessThanOrEqual(rects.body.y-8);
 await page.getByRole('button',{name:'읽기 메뉴',exact:true}).click();await page.getByRole('button',{name:'이 컷 편집하기',exact:true}).click();await expect(page.getByLabel('대사 / 해설',{exact:true})).toHaveValue(cut.text);
});
for(const size of [{width:1440,height:900},{width:768,height:1024},{width:390,height:844},{width:844,height:390}])test(`clear tools stay reachable and form rows do not overlap ${size.width}`,async({page})=>{
 await page.setViewportSize(size);await page.goto('/?view=editor');
 await expect(page.getByText('현재 컷을 글자로 읽기',{exact:true})).toHaveCount(0);await expect(page.getByText('대사·해설 텍스트 보기',{exact:true})).toBeVisible();
 for(const tool of ['배경·인물 편집','선택지 편집','연출 편집','소리 편집']){
  await page.getByRole('button',{name:tool,exact:true}).click();const panel=page.locator('[data-inspector-section]:visible').last();
  const overlap=await panel.evaluate(node=>{const controls=[...node.querySelectorAll('input:not([type=hidden]),select,textarea,button')].filter(el=>{const r=el.getBoundingClientRect();return el.checkVisibility()&&r.width>0&&r.height>0});const bad=[];for(let i=0;i<controls.length;i++)for(let j=i+1;j<controls.length;j++){const a=controls[i].getBoundingClientRect(),b=controls[j].getBoundingClientRect();if(Math.min(a.right,b.right)-Math.max(a.left,b.left)>2&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>2)bad.push([controls[i].getAttribute('aria-label')||controls[i].textContent,controls[j].getAttribute('aria-label')||controls[j].textContent]);}return bad;});expect(overlap).toEqual([]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }
 await page.getByRole('button',{name:'선택지 편집',exact:true}).click();await page.getByLabel('진행 방식',{exact:true}).selectOption('choice');
 const card=page.locator('[class*="choiceCard"]').first();await card.locator('summary').click();await expect(card.getByText('점수 변화 추가',{exact:true})).toBeVisible();await expect(card.locator('summary').filter({hasText:'점수 변화·표시 조건'})).toHaveCount(0);
});

test('long Korean choice labels scroll inside their own area above dialogue',async({page},info)=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/?view=editor');
 await page.getByRole('button',{name:'선택지 편집',exact:true}).click();await page.getByLabel('진행 방식',{exact:true}).selectOption('choice');
 await page.getByLabel('선택지 1 문구').fill('주변 사람들과 충분히 이야기를 나눈 뒤 함께 길을 찾아가기로 결정한다. '.repeat(12));
 await page.getByRole('button',{name:'이 컷부터 재생',exact:true}).click();await nativeReady(page);
 const status=page.getByTestId('story-runtime-status'),dialogue=JSON.parse((await status.getAttribute('data-dialogue-rects'))!),choices=JSON.parse((await status.getAttribute('data-choices-rect'))!);
 expect(choices.y+choices.height).toBeLessThanOrEqual(dialogue.speaker.y-4);expect(choices.x).toBeGreaterThanOrEqual(0);await page.screenshot({path:info.outputPath('long-choice-scroll.png')});
});
for(const size of [{width:1440,height:900},{width:390,height:844},{width:844,height:390}])test(`work/settings menus and image dialog remain within screen ${size.width}`,async({page})=>{
 await page.setViewportSize(size);await page.goto('/?view=editor');await page.getByText('보기 설정',{exact:true}).click();await page.locator('[data-work-menu]>summary').click();
 await expect(page.getByText('보기 설정',{exact:true}).locator('..')).not.toHaveAttribute('open','');await page.keyboard.press('Escape');
 await expect(page.locator('[data-work-menu]>summary').locator('..')).not.toHaveAttribute('open','');
 await page.locator('[data-work-menu]>summary').click();await page.getByLabel('대사 / 해설',{exact:true}).click();await expect(page.locator('[data-work-menu]>summary').locator('..')).not.toHaveAttribute('open','');
 await page.getByRole('button',{name:'배경·인물 편집',exact:true}).click();await page.getByRole('button',{name:'배경 이미지 찾기',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'이미지 선택 · 배경'});await expect(dialog).toBeVisible();const rect=await dialog.boundingBox();expect(rect!.x).toBeGreaterThanOrEqual(0);expect(rect!.y).toBeGreaterThanOrEqual(0);expect(rect!.x+rect!.width).toBeLessThanOrEqual(size.width);expect(rect!.y+rect!.height).toBeLessThanOrEqual(size.height);
 const footer=dialog.getByRole('button',{name:'선택한 이미지 적용',exact:true});await expect(footer).toBeVisible();await footer.scrollIntoViewIfNeeded();const footerRect=await footer.boundingBox();expect(footerRect!.y+footerRect!.height).toBeLessThanOrEqual(size.height);
 await dialog.getByRole('button',{name:'이미지 선택 닫기'}).click();await expect(page.getByLabel('대사 / 해설',{exact:true})).toBeVisible();
});

 test('effect undo belongs to the cut that was edited',async({page})=>{
 await page.goto('/?view=editor');await page.getByRole('button',{name:'연출 편집',exact:true}).click();
 await page.getByLabel('효과',{exact:true}).selectOption('shake');await expect(page.getByRole('button',{name:'마지막 효과 변경 취소',exact:true})).toBeEnabled();
 const position=page.getByLabel('현재 장과 컷 이동');const next=await position.locator('option').evaluateAll(options=>(options[1] as HTMLOptionElement).value);await position.selectOption(next);
 await expect(page.getByRole('button',{name:'마지막 효과 변경 취소',exact:true})).toBeDisabled();
 await page.getByLabel('효과',{exact:true}).selectOption('flash');await page.getByRole('button',{name:'마지막 효과 변경 취소',exact:true}).click();await expect(page.getByLabel('효과',{exact:true})).toHaveValue('');
 });

for(const size of [{width:768,height:1024},{width:390,height:844},{width:844,height:390}])test(`cut range fields fit their panel ${size.width}`,async({page})=>{
 await page.setViewportSize(size);await page.goto('/?view=editor');await page.getByRole('button',{name:'연출 편집',exact:true}).click();await page.getByLabel('효과',{exact:true}).selectOption('shake');await page.getByLabel('효과 적용 범위',{exact:true}).selectOption('following');
 const range=page.getByLabel('효과 종료 컷',{exact:true});const panel=page.getByTestId('story-effect-controls');const bounds=await panel.boundingBox(),rect=await range.boundingBox();expect(rect!.x+rect!.width).toBeLessThanOrEqual(bounds!.x+bounds!.width+1);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
