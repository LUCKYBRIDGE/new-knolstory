import {enterLibrary,openBuiltinEdition,beginSelectedBook} from './library-entry';
import {readFileSync} from 'node:fs';
const firstTextEdits=JSON.parse(readFileSync(new URL('../../packages/compatibility/src/reader-text-rabbit-heungbu.json',import.meta.url),'utf8')) as Array<{projectId:string;lineId:string;after:string}>;
const secondTextEdits=JSON.parse(readFileSync(new URL('../../packages/compatibility/src/reader-text-seonnyeo-onggojib.json',import.meta.url),'utf8')) as Array<{projectId:string;lineId:string;after:string}>;
import {test,expect,type Page} from '@playwright/test';
async function rendered(page:Page){const s=page.getByTestId('story-runtime-status');await expect.poll(async()=>{const rev=await s.getAttribute('data-scene-revision');return rev!==null&&rev===await s.getAttribute('data-rendered-revision');},{timeout:120000}).toBe(true);return s;}
test('fixed story formats, overlay, text preferences and saved page position work in native runtime',async({page},info)=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/?view=editor');
 const input=page.getByRole('textbox',{name:'대사 / 해설',exact:true});await expect(input).toBeVisible();
 await input.fill('가\n'.repeat(12));await page.getByText('글 분량 계산 기준',{exact:true}).click();await expect(page.getByText(/Enter 12회/)).toBeVisible();
 await input.fill('토끼는 바다를 바라보았다. 파도 너머로 작은 섬이 모습을 드러냈다. 자라는 물가에 멈춰 서서 토끼를 기다렸다. 처음 보는 바다는 생각했던 것보다 훨씬 넓었다. 낯선 길이 두려웠지만 함께 온 친구가 곁에 있었다. 두 친구는 바람이 잦아들기를 기다렸다. 구름 사이로 비친 햇살이 바닷물 위에서 반짝였다. 갈매기 한 마리가 섬을 향해 천천히 날아갔다. 토끼는 숨을 고르고 자라의 등에 조심스럽게 올라탔다. 이제 작은 모험을 시작할 시간이었다.');
 await expect(page.getByText(/가로 예상 .*3줄 · 세로 예상 .*5줄/)).toBeVisible();
 await page.screenshot({path:info.outputPath('editor-two-format-hint.png'),fullPage:true});
 await page.getByRole('button',{name:'이 컷부터 재생',exact:true}).click();let status=await rendered(page);
 const frame=page.getByTestId('story-runtime-frame');const gate=frame.contentFrame().getByRole('button',{name:'소리 켜고 시작 · Enter 또는 Space',exact:true});if(await gate.count()){await gate.press('Enter');await expect(status).toHaveAttribute('data-audio-unlocked','true');}
 await expect(status).toHaveAttribute('data-engine-width','720');await expect(status).toHaveAttribute('data-engine-height','1280');
 const before=await status.evaluate(n=>({...((n as HTMLElement).dataset)}));const box=JSON.parse(before.textboxRect!);expect(box.x).toBe(0);expect(box.width).toBe(720);expect(box.y+box.height).toBe(1280);
 const initialPage=JSON.parse(before.dialoguePage!);expect(initialPage.count).toBeGreaterThan(1);
 const tools=page.getByRole('group',{name:'읽기 도구',exact:true});const bar=tools.locator('[style*="--reader-tool-font-size"]');expect(await bar.getByRole('button').allTextContents()).toEqual(['지난기록','빠른 저장','설정']);
 const frameBox=(await frame.boundingBox())!;expect(frameBox.width/frameBox.height).toBeCloseTo(9/16,2);expect(frameBox.y).toBeGreaterThan(20);
 const menu=page.getByRole('button',{name:'읽기 메뉴',exact:true});await expect(menu.locator('svg')).toHaveCount(1);await menu.click();await page.getByRole('button',{name:'읽기 설정',exact:true}).click();
 const dialog=page.getByRole('dialog');const scale=dialog.getByRole('combobox',{name:'본문 글씨 크기',exact:true});await scale.selectOption('1.3');await expect(scale).toHaveValue('1.3');await rendered(page);
 const enlarged=await status.evaluate(n=>({...((n as HTMLElement).dataset)}));expect(enlarged.actorRects).toBe(before.actorRects);expect(enlarged.backgroundRect).toBe(before.backgroundRect);expect(JSON.parse(enlarged.dialoguePage!).count).toBe(initialPage.count);expect(JSON.parse(enlarged.dialoguePage!).offset).toBe(initialPage.offset);expect(JSON.parse(enlarged.textboxRect!).height).toBeGreaterThan(box.height);
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-reader-preferences-v1')!).textScale)).toBe(1.3);
 await page.screenshot({path:info.outputPath('settings-font-size.png')});
 await dialog.getByRole('button',{name:'읽기 메뉴 닫기',exact:true}).click();await page.screenshot({path:info.outputPath('same-page-large.png')});
 await bar.getByRole('button',{name:'설정',exact:true}).click();
 await scale.selectOption('0.9');await rendered(page);
 const smaller=await status.evaluate(n=>({...((n as HTMLElement).dataset)}));expect(JSON.parse(smaller.dialoguePage!).count).toBe(initialPage.count);expect(JSON.parse(smaller.dialoguePage!).offset).toBe(initialPage.offset);expect(JSON.parse(smaller.textboxRect!).height).toBeLessThan(JSON.parse(enlarged.textboxRect!).height);
 await dialog.getByRole('button',{name:'읽기 메뉴 닫기',exact:true}).click();await page.screenshot({path:info.outputPath('same-page-small.png')});
 await bar.getByRole('button',{name:'설정',exact:true}).click();
 await scale.selectOption('1.3');await rendered(page);
 await dialog.getByRole('button',{name:'글씨 크기·대기 시간 기본값으로',exact:true}).click();await expect(scale).toHaveValue('1');await rendered(page);
 await dialog.getByRole('button',{name:'읽기 메뉴 닫기',exact:true}).click();await page.screenshot({path:info.outputPath('portrait-five-lines.png')});
 // Auto uses the same host-to-native page path and must retain actor placement.
 await bar.getByRole('button',{name:'설정',exact:true}).click();await dialog.getByRole('button',{name:'자동 OFF',exact:true}).click();await dialog.getByRole('button',{name:'읽기 메뉴 닫기',exact:true}).click();
 await expect.poll(async()=>JSON.parse((await status.getAttribute('data-dialogue-page'))!).offset,{timeout:10000}).toBeGreaterThan(0);
 await bar.getByRole('button',{name:'설정',exact:true}).click();await dialog.getByRole('button',{name:'자동 ON',exact:true}).click();await dialog.getByRole('button',{name:'읽기 메뉴 닫기',exact:true}).click();
 const savedOffset=JSON.parse((await status.getAttribute('data-dialogue-page'))!).offset;
 await bar.getByRole('button',{name:'빠른 저장',exact:true}).click();await expect(page.getByRole('status').filter({hasText:/^빠른 저장 완료$/})).toBeVisible();
 const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-player-v1')!));const slots=Object.values(stored.works) as Array<Record<string,{dialoguePosition?:{offset:number}}>>;expect(slots.some(work=>work.quick?.dialoguePosition?.offset===savedOffset)).toBe(true);
 await page.setViewportSize({width:844,height:390});await rendered(page);await expect(status).toHaveAttribute('data-engine-width','1280');await expect(status).toHaveAttribute('data-engine-height','720');
 await expect.poll(async()=>bar.getByRole('button').count()).toBe(6);const landscapeFrame=(await frame.boundingBox())!;expect(landscapeFrame.width/landscapeFrame.height).toBeCloseTo(16/9,2);expect(landscapeFrame.x).toBeGreaterThan(30);
 for(const button of await bar.getByRole('button').all())expect(await button.evaluate(n=>getComputedStyle(n).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
 await bar.getByRole('button',{name:'빠른 불러오기',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'확인',exact:true}).click();await rendered(page);
 await expect.poll(async()=>JSON.parse((await status.getAttribute('data-dialogue-page'))!).offset).toBe(savedOffset);
 await expect(page.getByRole('status').filter({hasText:/^읽기 위치와 선택 기록을 불러왔습니다[.]$/})).toBeHidden();
 await page.screenshot({path:info.outputPath('landscape-three-lines.png')});
 await page.setViewportSize({width:1440,height:900});await rendered(page);const wide=(await frame.boundingBox())!;expect(wide.width/wide.height).toBeCloseTo(16/9,2);expect(wide.y).toBeGreaterThan(20);await page.screenshot({path:info.outputPath('desktop-16-10-letterbox.png')});
 await menu.click();await page.getByRole('button',{name:'읽기 설정',exact:true}).click();await scale.selectOption('1.15');await dialog.getByRole('button',{name:'읽기 메뉴 닫기',exact:true}).click();await rendered(page);
 await page.reload();await rendered(page);await page.getByRole('button',{name:'읽기 메뉴',exact:true}).click();await page.getByRole('button',{name:'읽기 설정',exact:true}).click();await expect(page.getByRole('dialog').getByRole('combobox',{name:'본문 글씨 크기',exact:true})).toHaveValue('1.15');
 await page.screenshot({path:info.outputPath('persisted-font-size.png')});
});

test('body tap and Enter advance native story while font changes preserve visible actors',async({page},info)=>{
 await page.setViewportSize({width:1280,height:720});await page.goto('/?view=editor');await page.getByRole('button',{name:'이 컷부터 재생',exact:true}).click();
 const status=await rendered(page),frame=page.getByTestId('story-runtime-frame');
 const gate=frame.contentFrame().getByRole('button',{name:'소리 켜고 시작 · Enter 또는 Space',exact:true});if(await gate.count())await gate.press('Enter');
 const prior=await status.getAttribute('data-scene-revision');const d=JSON.parse((await status.getAttribute('data-dialogue-rects'))!),fb=(await frame.boundingBox())!;
 await page.mouse.click(fb.x+(d.body.x+40)*fb.width/1280,fb.y+(d.body.y+20)*fb.height/720);
 await expect.poll(()=>status.getAttribute('data-scene-revision')).not.toBe(prior);await rendered(page);
 const compactPanel=JSON.parse((await status.getAttribute('data-textbox-rect'))!);expect(compactPanel.height).toBeLessThan(300);
 await page.screenshot({path:info.outputPath('vn-short-dialogue.png')});
 const actors=await status.getAttribute('data-actor-rects');expect(JSON.parse(actors!).length).toBeGreaterThan(0);
 const background=await status.getAttribute('data-background-rect');
 await page.getByRole('button',{name:'읽기 메뉴',exact:true}).click();await page.getByRole('button',{name:'읽기 설정',exact:true}).click();
 await page.getByRole('dialog').getByRole('combobox',{name:'본문 글씨 크기',exact:true}).selectOption('1.3');await rendered(page);
 expect(await status.getAttribute('data-actor-rects')).toBe(actors);expect(await status.getAttribute('data-background-rect')).toBe(background);
 await page.getByRole('dialog').getByRole('button',{name:'읽기 메뉴 닫기',exact:true}).click();await page.screenshot({path:info.outputPath('actors-large-text.png')});
 const keyboardPrior=await status.getAttribute('data-scene-revision');await frame.contentFrame().locator('#canvas').focus();await page.keyboard.press('Enter');
 await expect.poll(()=>status.getAttribute('data-scene-revision')).not.toBe(keyboardPrior);await rendered(page);
});

test('retired classic preferences use widescreen and compact VN dialogue fits small landscape',async({page},info)=>{
 await page.setViewportSize({width:1280,height:960});await page.addInitScript(()=>{if(!localStorage.getItem('knolstory-reader-preferences-v1'))localStorage.setItem('knolstory-reader-preferences-v1',JSON.stringify({version:1,textScale:1,autoDelaySeconds:3,format:'classic'}));});
 await page.goto('/?view=editor');const input=page.getByRole('textbox',{name:'대사 / 해설',exact:true});await input.fill('가나다라마바사아자차카타파하 '.repeat(30));await page.getByRole('button',{name:'이 컷부터 재생',exact:true}).click();
 const status=await rendered(page),frame=page.getByTestId('story-runtime-frame');const gate=frame.contentFrame().getByRole('button',{name:'소리 켜고 시작 · Enter 또는 Space',exact:true});if(await gate.count())await gate.press('Enter');
 await expect(status).toHaveAttribute('data-engine-width','1280');await expect(status).toHaveAttribute('data-engine-height','720');await expect(status).toHaveAttribute('data-artwork-rect','null');
 const pageCount=JSON.parse((await status.getAttribute('data-dialogue-page'))!).count;
 await page.getByRole('button',{name:'읽기 메뉴',exact:true}).click();await page.getByRole('button',{name:'읽기 설정',exact:true}).click();const dialog=page.getByRole('dialog');
 const format=dialog.getByRole('combobox',{name:'화면 비율',exact:true});await expect(format).toHaveValue('landscape');expect(await format.locator('option').allTextContents()).toEqual(['자동','가로 · 16:9','세로 · 9:16']);
 await page.setViewportSize({width:568,height:320});await rendered(page);await dialog.getByRole('combobox',{name:'본문 글씨 크기',exact:true}).selectOption('1.3');await rendered(page);
 const small=await status.evaluate(n=>({...((n as HTMLElement).dataset)}));const box=JSON.parse(small.textboxRect!),rects=JSON.parse(small.dialogueRects!);expect(box.y).toBeGreaterThanOrEqual(0);expect(rects.speaker.y).toBeGreaterThanOrEqual(0);expect(rects.body.y+rects.body.height).toBeLessThan(720);expect(JSON.parse(small.dialoguePage!).count).toBe(pageCount);
 await dialog.getByRole('button',{name:'읽기 메뉴 닫기',exact:true}).click();await page.screenshot({path:info.outputPath('small-landscape-large-text.png')});
});

for(const [label,background] of [['day','rabbit-turtle.background.rabbit-turtle-bg-grassland'],['night','rabbit-turtle.background.rabbit-turtle-bg-grassland-night']] as const)test(`VN dialogue and choices stay readable on ${label} background`,async({page},info)=>{
 await page.setViewportSize({width:1280,height:720});await page.goto('/?view=editor');await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 await page.evaluate(({label,background})=>{
  const stored=JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!);const project=stored.document.project;const first=project.lines[0];
  project.lines=project.lines.map((line:typeof first,index:number)=>index===0?{...first,text:'갈림길 앞에 도착했다. 어느 길로 향할까?',backgroundId:background,backgroundMode:undefined,stageComposition:{leftActors:[{key:'hero',assetId:'onggojib.character.classic-master'}],rightActors:[]},flow:{type:'choice',options:[{id:'one',label:'강을 따라 걸어간다',targetLineId:project.lines[1].id},{id:'two',label:'숲길로 들어간다',targetLineId:project.lines[1].id},{id:'three',label:'잠시 쉬며 주변을 살핀다',targetLineId:project.lines[1].id},{id:'four',label:'친구에게 의견을 묻는다',targetLineId:project.lines[1].id}]}}:line);
  stored.lineId=first.id;stored.mode='edit';stored.view='editor';stored.contexts={};stored.playback=undefined;
  localStorage.setItem('knolstory-next-workspace-v1',JSON.stringify(stored));
 },{label,background});
 await page.reload();await expect(page.getByRole('textbox',{name:'대사 / 해설',exact:true})).toHaveValue('갈림길 앞에 도착했다. 어느 길로 향할까?');await page.getByRole('button',{name:'이 컷부터 재생',exact:true}).click();const status=await rendered(page),frame=page.getByTestId('story-runtime-frame');
 const gate=frame.contentFrame().getByRole('button',{name:'소리 켜고 시작 · Enter 또는 Space',exact:true});if(await gate.count())await gate.press('Enter');
 const box=JSON.parse((await status.getAttribute('data-textbox-rect'))!),choices=JSON.parse((await status.getAttribute('data-choices-rect'))!);expect(box.height).toBeLessThan(300);expect(choices.height).toBeGreaterThan(200);expect(choices.y+choices.height).toBeLessThanOrEqual(box.y);
 await page.screenshot({path:info.outputPath(`vn-${label}-choices.png`)});
 const bounds=(await frame.boundingBox())!,rev=await status.getAttribute('data-scene-revision');await page.mouse.click(bounds.x+(choices.x+choices.width/2)*bounds.width/1280,bounds.y+(choices.y+50)*bounds.height/720);
 await expect.poll(()=>status.getAttribute('data-scene-revision')).not.toBe(rev);await rendered(page);
});


for(const id of ['rabbit','heungbu','seonnyeo','onggojib'])test(`provided ${id} catalog applies concise text and native reading remains usable`,async({page},info)=>{
 await page.setViewportSize({width:1280,height:720});await page.goto('/');await enterLibrary(page);await openBuiltinEdition(page,id,'knolstory','start');await beginSelectedBook(page);await rendered(page);
 const project=await page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).document.project);
 const edits=[...firstTextEdits,...secondTextEdits].filter(edit=>edit.projectId===project.id);expect(edits.length).toBeGreaterThan(0);
 for(const edit of edits)expect(project.lines.find((line:{id:string;text:string})=>line.id===edit.lineId)?.text).toBe(edit.after);
 await expect(page.getByTestId('story-runtime-status')).toHaveAttribute('data-engine-width','1280');
 await page.screenshot({path:info.outputPath(`${id}-provided-story.png`)});
});
