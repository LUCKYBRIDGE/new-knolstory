import {test,expect,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {parseAuthoringFile,confirmAuthoringImport} from './authoring-file';

/** A protocol acknowledgement harness, never used as a product renderer. */
async function ackRuntime(page:Page){
 await page.route('**/runtime/index.html',route=>route.fulfill({contentType:'text/html',body:`<!doctype html><script>
 const send=(value)=>parent.postMessage({protocol:1,...value},location.origin);
 addEventListener('message',event=>{const scene=event.data?.payload;if(event.data?.type!=='loadScene'||!scene)return;window.scene=scene;send({type:'sceneRendered',sceneId:scene.sceneId,revision:scene.revision,renderMs:1,rendererRect:{x:0,y:0,width:scene.width,height:scene.height},textboxRect:scene.textboxRect,engineLogicalSize:{width:scene.width,height:scene.height},audioState:{unlocked:true,musicPath:null,musicPosition:null,musicStartCount:0,soundPlayCount:0}});send({type:'presentationDone',sceneId:scene.sceneId,revision:scene.revision});});
 send({type:'ready',runtimeVersion:'test-ack-only',contractVersion:1});
 </script>`}));
}
async function start(page:Page){await page.goto('/?view=editor');await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');await page.getByText('보기 설정',{exact:true}).click();await page.getByRole('button',{name:'처음부터 읽기',exact:true}).click();await expect(page.getByRole('button',{name:'빠른 저장',exact:true})).toBeEnabled();}
async function edit(page:Page){await page.getByRole('button',{name:'읽기 메뉴',exact:true}).click();await page.getByRole('button',{name:'이 컷 편집하기',exact:true}).click();}
const labels=['지난기록','저장','불러오기','자동 OFF','빠른 저장','빠른 불러오기'];

test('approved reader manual/quick slots, load confirmation, reopen and history use Core',async({page})=>{
 await ackRuntime(page);await start(page);
 const bar=page.getByRole('button',{name:'지난기록',exact:true}).locator('..');expect(await bar.locator('button').allTextContents()).toEqual(labels);
 await page.getByRole('button',{name:'빠른 불러오기',exact:true}).click();await expect(page.getByTestId('story-stage-viewport').getByRole('alert')).toContainText('빠른 저장한 진행이 없어요');
 await page.getByRole('button',{name:'빠른 저장',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'빠른 저장 완료'})).toBeVisible();
 await page.getByRole('button',{name:'저장',exact:true}).click();await page.getByRole('button',{name:'1번 저장',exact:true}).click();await page.getByRole('button',{name:'읽기 메뉴 닫기',exact:true}).click();
 const slots=await page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-player-v1')!));expect(slots.version).toBe(3);const stored=Object.values(slots.works)[0] as Record<string,unknown>;expect(stored.quick).toBeTruthy();expect(stored['1']).toBeTruthy();expect(stored.auto).toBeTruthy();
 await page.getByRole('button',{name:'불러오기',exact:true}).click();await page.getByRole('button',{name:'1번 불러오기',exact:true}).click();await page.getByRole('button',{name:'취소',exact:true}).click();await expect(page.getByRole('heading',{name:'불러오기',exact:true})).toBeVisible();await page.getByRole('button',{name:'읽기 메뉴 닫기',exact:true}).click();
 await page.getByRole('button',{name:'빠른 불러오기',exact:true}).click();await page.getByRole('button',{name:'확인',exact:true}).click();
 await page.reload();await expect(page.getByRole('button',{name:'빠른 저장',exact:true})).toBeEnabled();
 await page.getByRole('button',{name:'지난기록',exact:true}).click();await expect(page.getByRole('heading',{name:'지난기록',exact:true})).toBeVisible();await page.getByRole('button',{name:'읽기 메뉴 닫기',exact:true}).click();await edit(page);await expect(page.getByLabel('대사 / 해설',{exact:true})).toBeVisible();
});

test('approved phone bar is compact, always visible and exposes secondary actions in settings',async({page})=>{
 await page.setViewportSize({width:390,height:844});await ackRuntime(page);await start(page);
 const frame=await page.getByTestId('story-runtime-frame').elementHandle();
 const bar=page.getByRole('button',{name:'지난기록',exact:true}).locator('..');
 expect(await bar.locator('button').allTextContents()).toEqual(['지난기록','빠른 저장','설정']);
 const rect=await bar.boundingBox();expect(rect!.height).toBeLessThanOrEqual(24);
 const appearance=await bar.locator('button').first().evaluate(node=>{const css=getComputedStyle(node);return {fontSize:Number.parseFloat(css.fontSize),border:css.borderTopWidth,background:css.backgroundColor};});expect(appearance.fontSize).toBeGreaterThanOrEqual(8);expect(appearance.fontSize).toBeLessThanOrEqual(14);expect(appearance.border).toBe('0px');expect(appearance.background).toBe('rgba(0, 0, 0, 0)');
 await expect(page.getByRole('button',{name:'읽기 도구 펼치기'})).toHaveCount(0);
 await page.getByRole('button',{name:'빠른 저장',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'빠른 저장 완료'})).toBeVisible();
 await page.getByRole('button',{name:'설정',exact:true}).click();const settings=page.getByRole('dialog',{name:'읽기 설정',exact:true});
 for(const label of ['저장','불러오기','자동 OFF','빠른 불러오기'])await expect(settings.getByRole('button',{name:label,exact:true})).toBeVisible();
 await settings.getByRole('button',{name:'자동 OFF',exact:true}).click();await expect(settings.getByRole('button',{name:'자동 ON',exact:true})).toHaveAttribute('aria-pressed','true');await settings.getByRole('button',{name:'자동 ON',exact:true}).click();
 await settings.getByRole('button',{name:'저장',exact:true}).click();await page.getByRole('button',{name:'1번 저장',exact:true}).click();await page.keyboard.press('Escape');
 await page.getByRole('button',{name:'설정',exact:true}).click();await settings.getByRole('button',{name:'불러오기',exact:true}).click();await expect(page.getByRole('button',{name:'1번 불러오기',exact:true})).toBeEnabled();await page.keyboard.press('Escape');
 await page.getByRole('button',{name:'설정',exact:true}).click();await settings.getByRole('button',{name:'빠른 불러오기',exact:true}).click();await expect(page.getByRole('dialog',{name:'이 기록을 불러올까요?',exact:true})).toBeVisible();await page.getByRole('button',{name:'취소',exact:true}).click();await page.keyboard.press('Escape');
 expect(await frame!.evaluate(node=>node===document.querySelector('[data-testid="story-runtime-frame"]'))).toBe(true);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('reader failure cannot leave for library and preparing stage has an exit',async({page})=>{
 await ackRuntime(page);await start(page);await page.evaluate(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='knolstory-next-workspace-v1')throw Error('quota injected');original.call(this,key,value);};});
 await page.getByRole('button',{name:'읽기 메뉴',exact:true}).click();await page.getByRole('button',{name:'서재로 돌아가기',exact:true}).click();await page.getByRole('button',{name:'보관하고 서재로'}).click();await expect(page.getByRole('dialog')).toBeVisible();await expect(page.getByRole('dialog').getByRole('alert')).toContainText('quota');await expect(page.getByTestId('story-stage-viewport')).toBeVisible();await page.getByRole('button',{name:'취소',exact:true}).click();await page.getByRole('button',{name:'읽기 메뉴',exact:true}).click();await page.getByRole('button',{name:'이 컷 편집하기',exact:true}).click();await expect(page.getByLabel('대사 / 해설',{exact:true})).toBeVisible();
});

test('editor manuscript edit, file roundtrip, reopen and reading return preserve other fields',async({page})=>{
 await ackRuntime(page);await page.goto('/?view=editor');const original=JSON.parse(readFileSync('tests/fixtures/stories/seonnyeo.json','utf8'));
 await page.locator('[data-work-menu]>summary').click();await page.getByLabel('작품 파일 가져오기').setInputFiles({name:'approved-source.knolstory',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({documentType:'story-maker-project',schemaVersion:5,savedAt:'2026-10-11T00:00:00.000Z',appVersion:'test',project:original}))});await confirmAuthoringImport(page);
 const management=page.locator('[data-work-menu]>summary');if(!await management.locator('..').evaluate(node=>(node as HTMLDetailsElement).open))await management.click();
 const baselineEvent=page.waitForEvent('download');await page.getByRole('button',{name:'작품 파일 내보내기',exact:true}).click();const baselineDownload=await baselineEvent,baseline=parseAuthoringFile(readFileSync((await baselineDownload.path())!,'utf8')).project;
 const text=page.getByLabel('대사 / 해설',{exact:true}),before=await text.inputValue(),updated=before+'\n승인된 도안에서 수정한 한국어 문장입니다.';await text.fill(updated);await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 await page.locator('[data-work-menu]>summary').click();const downloadEvent=page.waitForEvent('download');await page.getByRole('button',{name:'작품 파일 내보내기',exact:true}).click();const download=await downloadEvent,path=(await download.path())!,saved=parseAuthoringFile(readFileSync(path,'utf8')).project;
 const {updatedAt:_savedTime,...savedContent}=saved;const {updatedAt:_baselineTime,...baselineContent}=baseline;
 expect({...savedContent,lines:saved.lines.map((line:{id:string;text:string})=>line.id===baseline.lines[0].id?{...line,text:before}:line)}).toEqual(baselineContent);
 expect(saved.lines.map((line:{flow:unknown;stageComposition:unknown})=>({flow:line.flow,stageComposition:line.stageComposition}))).toEqual(original.lines.map((line:{flow:unknown;stageComposition:unknown})=>({flow:line.flow,stageComposition:line.stageComposition})));
 await page.locator('[data-work-menu]>summary').click();await page.getByLabel('작품 파일 가져오기').setInputFiles(path);await confirmAuthoringImport(page);await page.reload();await expect(text).toHaveValue(updated);
 await page.getByRole('button',{name:'이 컷부터 재생',exact:true}).click();await expect(page.getByRole('button',{name:'빠른 저장',exact:true})).toBeEnabled();await edit(page);await expect(text).toHaveValue(updated);
});

test('native approved dialogue and host bar align on a real RenPy phone stage',async({page},info)=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/?view=editor');await page.getByText('보기 설정',{exact:true}).click();await page.getByRole('button',{name:'처음부터 읽기',exact:true}).click();await expect(page.getByTestId('story-runtime-status')).toHaveAttribute('data-rendered-revision',/^[0-9]+$/,{timeout:120000});await expect(page.getByRole('button',{name:'설정',exact:true})).toBeEnabled();
 await expect.poll(async()=>{const report=page.getByTestId('story-runtime-status');return (await report.getAttribute('data-rendered-revision'))===(await report.getAttribute('data-scene-revision'));},{timeout:30000}).toBe(true);
 const first=await page.getByRole('button',{name:'지난기록',exact:true}).boundingBox(),last=await page.getByRole('button',{name:'설정',exact:true}).boundingBox();expect(first!.height).toBe(24);expect(844-last!.y-last!.height).toBeCloseTo(8,0);await page.screenshot({path:info.outputPath('approved-phone-native.png')});
 await edit(page);await expect(page.getByLabel('대사 / 해설',{exact:true})).toBeVisible();
});

test('automatic reading pauses for menus and advances only after current native acknowledgement',async({page})=>{
 await ackRuntime(page);await start(page);
 const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).playback);
 await page.getByRole('button',{name:'읽기 메뉴',exact:true}).click();await page.getByRole('button',{name:'읽기 설정',exact:true}).click();await page.getByLabel('자동 넘기기 대기 시간').fill('1');await page.getByRole('button',{name:'읽기 메뉴 닫기',exact:true}).click();await page.getByRole('button',{name:'자동 OFF',exact:true}).click();
 await page.getByRole('button',{name:'읽기 메뉴',exact:true}).click();
 // A real waiting interval checks that an open menu cancels the already scheduled advance.
 await page.waitForTimeout(1300);
 const paused=await page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).playback);expect(paused.path).toEqual(before.path);
 await page.getByRole('button',{name:'읽기 메뉴 닫기',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).playback.path.length),{timeout:5000}).toBeGreaterThan(before.path.length);
 await page.getByRole('button',{name:'자동 ON',exact:true}).click();
});

test('reader top menu allows editing exit when native runtime is unavailable',async({page})=>{
 await page.route('**/runtime/index.html',route=>route.fulfill({status:503,body:'Unavailable'}));
 await page.goto('/?view=editor');await page.getByText('보기 설정',{exact:true}).click();await page.getByRole('button',{name:'처음부터 읽기',exact:true}).click();
 await expect(page.getByRole('button',{name:'읽기 메뉴',exact:true})).toBeEnabled();await edit(page);await expect(page.getByLabel('대사 / 해설',{exact:true})).toBeVisible();
});
