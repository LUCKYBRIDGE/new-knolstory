import {test,expect} from '@playwright/test';
import {createBlankStoryProject} from '../../packages/runtime-core/src/authoring';
import {confirmAuthoringImport} from './authoring-file';
import {nativeTransitionActionBox,nativeManualTitleActionBox} from './native-transition-action';
test.use({hasTouch:true});
const base=createBlankStoryProject({id:'transition-spacing',chapterId:'chapter',lineId:'cut',title:'확인 전환 간격 검사'});
const project={...base,lines:[{...base.lines[0],text:'전환을 확인한 뒤 이 글을 읽어요.',presentation:{transition:{type:'perspective-blackout' as const,mode:'confirm' as const,durationMs:900,title:'나그네의 시점',actionLabel:'이야기 계속'}}}]};
for(const viewport of [{width:390,height:844},{width:320,height:568},{width:844,height:390},{width:1280,height:800}])test(`native confirmation clears reading tools at ${viewport.width}x${viewport.height}`,async({page},info)=>{
 test.setTimeout(150000);await page.setViewportSize(viewport.width>viewport.height&&viewport.width<900?{width:390,height:844}:viewport);await page.addInitScript(()=>{if(window===window.top)sessionStorage.setItem('knolstory-fullscreen-offered-v1','1');});await page.route('**/api/**',r=>r.abort());
 await page.goto('/?view=editor');await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');await page.locator('[data-work-menu]>summary').click();await page.getByLabel('작품 파일 가져오기',{exact:true}).setInputFiles({name:'spacing.knolstory',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({documentType:'story-maker-project',schemaVersion:8,savedAt:'2026-11-02T00:00:00.000Z',appVersion:'test',project}))});await confirmAuthoringImport(page);
 await page.getByRole('button',{name:'이 컷부터 재생',exact:true}).click();await page.setViewportSize(viewport);const state=page.getByTestId('story-runtime-status');await expect.poll(async()=>Number(await state.getAttribute('data-rendered-revision'))>=0&&await state.getAttribute('data-rendered-revision')===await state.getAttribute('data-scene-revision'),{timeout:120000}).toBe(true);
 const gate=page.getByTestId('story-runtime-frame').contentFrame().getByRole('button',{name:'소리 켜고 시작 · Enter 또는 Space',exact:true});if(await gate.count())await gate.press('Enter');await expect(state).toContainText('전환 화면');
 const action=await nativeTransitionActionBox(page),frame=(await page.getByTestId('story-runtime-frame').boundingBox())!;
 await expect(page.getByRole('button',{name:'빠른 저장',exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'읽기 메뉴',exact:true})).toBeVisible();
 await page.screenshot({path:info.outputPath('confirmation-and-tools.png')});
 expect(action.y+action.height,'native action stays inside the stage').toBeLessThanOrEqual(frame.y+frame.height);expect(action.height,'touch target stays large after stage scaling').toBeGreaterThanOrEqual(43.9);
 if(viewport.width<900)await page.touchscreen.tap(action.x+action.width/2,action.y+action.height/2);else await page.mouse.click(action.x+action.width/2,action.y+action.height/2);await expect(state).not.toContainText('전환 화면');await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.getByRole('button',{name:'빠른 저장',exact:true})).toBeVisible();
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).document.project);expect(saved.lines[0].text).toBe(project.lines[0].text);
});

test('a manual title action stays touchable before and after its effect',async({page},info)=>{
 test.setTimeout(150000);await page.setViewportSize({width:320,height:568});
 await page.addInitScript(()=>{if(window!==window.top)return;sessionStorage.setItem('knolstory-fullscreen-offered-v1','1');window.addEventListener('message',e=>{if(e.origin===location.origin&&e.source===(document.querySelector('[data-testid="story-runtime-frame"]') as HTMLIFrameElement|null)?.contentWindow&&e.data?.type==='presentationDone')(window as unknown as {lastTitleDone:number}).lastTitleDone=e.data.revision;});});
 const manual={...base,id:'manual-title-spacing',lines:[{...base.lines[0],id:'title',speakerName:'시점 전환',text:'나그네의 시점',presentation:{transition:{type:'perspective-blackout',mode:'auto',durationMs:200,title:'나그네의 시점'},effects:[{id:'flash',type:'flash',trigger:'on-click'}]}},{...base.lines[0],id:'body',order:2,text:'이제 이야기를 이어가요.'}]};
 await page.route('**/api/**',r=>r.abort());await page.goto('/?view=editor');await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');await page.locator('[data-work-menu]>summary').click();await page.getByLabel('작품 파일 가져오기',{exact:true}).setInputFiles({name:'manual-spacing.knolstory',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({documentType:'story-maker-project',schemaVersion:8,savedAt:'2026-11-02T00:00:00.000Z',appVersion:'test',project:manual}))});await confirmAuthoringImport(page);await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).document.project.id)).toBe(manual.id);const original=await page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).document.project);
 await page.getByRole('button',{name:'이 컷부터 재생',exact:true}).click();const state=page.getByTestId('story-runtime-status'),ready=()=>expect.poll(async()=>Number(await state.getAttribute('data-rendered-revision'))>=0&&await state.getAttribute('data-rendered-revision')===await state.getAttribute('data-scene-revision'),{timeout:120000}).toBe(true);await ready();
 const gate=page.getByTestId('story-runtime-frame').contentFrame().getByRole('button',{name:'소리 켜고 시작 · Enter 또는 Space',exact:true});if(await gate.count())await gate.press('Enter');
 await expect.poll(()=>page.evaluate(()=>(window as unknown as {lastTitleDone:number}).lastTitleDone===Number(document.querySelector('[data-testid="story-runtime-status"]')?.getAttribute('data-scene-revision')))).toBe(true);
 for(let click=0;click<2;click++){
  const action=await nativeManualTitleActionBox(page);expect(action.height).toBeGreaterThanOrEqual(43.9);expect(action.width).toBeGreaterThanOrEqual(43.9);await expect(page.getByRole('button',{name:'빠른 저장',exact:true})).toHaveCount(0);
  await page.screenshot({path:info.outputPath(`manual-action-${click}.png`)});await page.touchscreen.tap(action.x+action.width/2,action.y+action.height/2);
  if(click===0)await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).playback.effectStep)).toBe(1);else await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).playback.lineId)).toBe('body');await ready();
 }
 await expect(page.getByRole('button',{name:'빠른 저장',exact:true})).toBeVisible();expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).document.project)).toEqual(original);
});
