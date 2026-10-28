import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {confirmAuthoringImport} from './authoring-file';
const source=JSON.parse(readFileSync('tests/fixtures/stories/presentation-polish.json','utf8'));
const project={...source,id:'phone-task-fixture',chapters:[source.chapters[0],{...source.chapters[0],id:'phone-second-chapter',title:'다음 장',order:2}],lines:Array.from({length:8},(_,i)=>({...source.lines[0],id:`phone-task-${i}`,chapterId:i<4?source.chapters[0].id:'phone-second-chapter',order:i%4+1,text:`${i+1}컷 편집 검사`,flow:{type:'goto',targetLineId:i===7?null:`phone-task-${i+1}`}}))};
test('phone basic background picker displays real thumbnails and cancel preserves the work',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:844},screen:{width:390,height:844},hasTouch:true});await context.addInitScript(()=>sessionStorage.setItem('knolstory-fullscreen-offered-v1','1'));const page=await context.newPage();
 await page.route('**/api/**',r=>r.abort());await page.route('**/runtime/**',r=>r.abort());await page.goto('/?view=editor');await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).document.project);
 const launcher=page.getByRole('button',{name:/^1컷 배경 이미지 찾기 ·/});expect((await launcher.boundingBox())!.height).toBeGreaterThanOrEqual(44);await expect(launcher.locator('img')).toBeHidden();
 await launcher.click();const dialog=page.getByRole('dialog',{name:'이미지 선택 · 1컷 배경',exact:true});await expect(dialog).toBeVisible();const image=dialog.locator('[data-asset-id] img').first();await expect(image).toBeVisible();await expect.poll(()=>image.evaluate((node:HTMLImageElement)=>node.complete&&node.naturalWidth>0)).toBe(true);
 await dialog.getByRole('button',{name:'취소',exact:true}).click();await expect(dialog).toHaveCount(0);expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).document.project)).toEqual(before);
 await launcher.click();await dialog.locator('[data-asset-id="heungbu.background.family-dinner-night"]').click();await dialog.getByRole('button',{name:'선택한 이미지 적용',exact:true}).click();await expect(dialog).toHaveCount(0);await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).document.project.lines[0].backgroundId)).toBe('heungbu.background.family-dinner-night');await context.close();
});
for(const size of [{width:390,height:844,screenWidth:390,screenHeight:844,phone:true},{width:844,height:460,screenWidth:390,screenHeight:844,phone:true},{width:800,height:1100,screenWidth:800,screenHeight:1100,phone:false}])test(`task editors use phone-sized controls and preserve the large-screen workspace ${size.width}`,async({browser},info)=>{
 const context=await browser.newContext({viewport:{width:size.width,height:size.height},screen:{width:size.screenWidth,height:size.screenHeight},hasTouch:true});await context.addInitScript(()=>sessionStorage.setItem('knolstory-fullscreen-offered-v1','1'));const page=await context.newPage();
 await page.route('**/api/**',r=>r.abort());await page.route('**/runtime/**',r=>r.abort());await page.goto('/?view=editor');await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 const menu=page.locator('[data-work-menu]');async function open(){if(!await menu.evaluate(e=>(e as HTMLDetailsElement).open))await menu.locator(':scope>summary').click();}
 await open();await page.getByLabel('작품 파일 가져오기',{exact:true}).setInputFiles({name:'phone.knolstory',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({documentType:'story-maker-project',schemaVersion:8,savedAt:'2026-10-23T00:00:00.000Z',appVersion:'test',project}))});await confirmAuthoringImport(page);await open();await page.getByText('편집 설정',{exact:true}).click();for(const name of ['인물','음향','연출'])await page.getByRole('checkbox',{name:`${name} 편집 사용`,exact:true}).check();
 const workbench=page.getByRole('region',{name:'여러 컷 편집',exact:true});await expect(workbench).toHaveAttribute('data-phone-editor',String(size.phone));
 const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).document.project);
 for(const screen of ['background','characters','audio','direction']){
  await open();await page.getByRole('combobox',{name:'편집화면 선택',exact:true}).selectOption(screen);
  await expect(workbench).toHaveAttribute('data-screen',screen);
  await expect(page.locator('[data-testid^="editing-cut-phone-task-"]:visible')).toHaveCount(size.phone?1:4);
  if(size.phone){const nav=page.getByRole('navigation',{name:'현재 컷 편집 이동',exact:true});await expect(nav).toBeVisible();await nav.getByRole('button',{name:'다음 컷 ›',exact:true}).click();await expect(nav).toContainText('2 / 4컷');await expect(page.getByTestId('editing-cut-phone-task-1')).toBeVisible();await nav.getByRole('button',{name:'‹ 이전 컷',exact:true}).click();await expect(nav).toContainText('1 / 4컷');await expect(page.getByRole('group',{name:'함께 보기',exact:true})).toBeHidden();}
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }
 if(size.phone){await page.getByRole('combobox',{name:'편집할 장',exact:true}).selectOption('phone-second-chapter');await expect(page.getByTestId('editing-cut-phone-task-4')).toBeVisible();await expect(page.getByRole('navigation',{name:'현재 컷 편집 이동',exact:true})).toContainText('1 / 4컷');}
 if(!size.phone){await page.getByRole('combobox',{name:'편집할 장',exact:true}).selectOption('phone-second-chapter');await page.setViewportSize({width:390,height:844});await expect(page.getByTestId('editing-cut-phone-task-0')).toBeVisible();await expect(page.getByRole('combobox',{name:'편집할 장',exact:true})).toHaveValue(project.chapters[0].id);await page.setViewportSize({width:800,height:1100});}
 await open();const selector=page.getByRole('combobox',{name:'편집화면 선택',exact:true}),combined=selector.locator('option[value="audio-direction"]');
 if(size.phone)expect(await combined.evaluate(node=>(node as HTMLOptionElement).disabled)).toBe(true);else{
  expect(await combined.evaluate(node=>(node as HTMLOptionElement).disabled)).toBe(false);await selector.selectOption('audio-direction');await expect(workbench).toHaveAttribute('data-screen','audio-direction');await page.setViewportSize({width:390,height:844});await expect(workbench).toHaveAttribute('data-screen','audio');await expect(page.getByText('통합 시간축은 태블릿·PC에서 사용할 수 있어요. 휴대폰에서는 음향과 연출을 각각 편집해 주세요.',{exact:true})).toBeVisible();await page.setViewportSize({width:800,height:1100});await expect(workbench).toHaveAttribute('data-screen','audio-direction');
 }
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).document.project)).toEqual(before);
 await page.screenshot({path:info.outputPath(`phone-tasks-${size.width}.png`)});await context.close();
});

for(const width of [320,390,748])test(`fullscreen shortcut enters and exits without overlapping editor navigation ${width}`,async({browser},info)=>{
 const context=await browser.newContext({viewport:{width,height:width===748?259:740},screen:{width:390,height:844},hasTouch:true});
 await context.addInitScript(()=>sessionStorage.setItem('knolstory-fullscreen-offered-v1','1'));const page=await context.newPage();
 await page.route('**/api/**',r=>r.abort());await page.route('**/runtime/**',r=>r.abort());await page.goto('/?view=editor');await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).document.project);
 const enter=page.getByRole('button',{name:'편집 화면 전체 화면',exact:true});await expect(enter).toBeVisible();
 const inspect=async()=>page.locator('header').filter({has:page.locator('[data-work-menu]')}).evaluate(header=>{const targets=[...header.querySelectorAll(':scope>[data-fullscreen-shortcut],:scope>[data-work-menu]>summary,:scope>[aria-label="홈 · 서재로 이동"],select[aria-label="현재 장과 컷 이동"]')].filter(e=>e.checkVisibility()).map(e=>({name:e.getAttribute('aria-label')||e.textContent,rect:e.getBoundingClientRect().toJSON(),hit:e.contains(document.elementFromPoint(e.getBoundingClientRect().x+e.getBoundingClientRect().width/2,e.getBoundingClientRect().y+e.getBoundingClientRect().height/2))}));return {targets,width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth};});
 const initial=await inspect();expect(initial.targets).toHaveLength(4);expect(initial.overflow).toBe(false);for(const t of initial.targets){expect(t.rect.height).toBeGreaterThanOrEqual(44);expect(t.rect.left).toBeGreaterThanOrEqual(0);expect(t.rect.right).toBeLessThanOrEqual(initial.width);expect(t.hit).toBe(true);}
 for(const [i,a] of initial.targets.entries())for(const b of initial.targets.slice(i+1))expect(Math.min(a.rect.right,b.rect.right)-Math.max(a.rect.left,b.rect.left)).toBeLessThanOrEqual(0);
 await enter.click();await expect.poll(()=>page.evaluate(()=>document.fullscreenElement===document.documentElement)).toBe(true);
 const exit=page.getByRole('button',{name:'편집 화면 전체 화면 해제',exact:true});await expect(exit).toHaveAttribute('aria-pressed','true');await exit.click();await expect.poll(()=>page.evaluate(()=>document.fullscreenElement===null)).toBe(true);await expect(enter).toHaveAttribute('aria-pressed','false');
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).document.project)).toEqual(before);await page.screenshot({path:info.outputPath(`fullscreen-shortcut-${width}.png`)});await context.close();
});

test('reader fullscreen actions return keyboard focus to their visible menu button',async({page})=>{
 await page.addInitScript(()=>sessionStorage.setItem('knolstory-fullscreen-offered-v1','1'));await page.route('**/api/**',r=>r.abort());await page.route('**/runtime/**',r=>r.abort());await page.goto('/?view=editor');await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).document.project);
 await page.locator('[data-work-menu]>summary').click();await page.getByText('보기 설정',{exact:true}).click();await page.getByRole('button',{name:'처음부터 읽기',exact:true}).click();
 const trigger=page.getByRole('button',{name:'읽기 메뉴',exact:true});await trigger.click();const enter=page.getByRole('button',{name:'전체 화면',exact:true});await enter.focus();await enter.press('Enter');await expect.poll(()=>page.evaluate(()=>document.fullscreenElement!==null)).toBe(true);await expect(trigger).toBeFocused();
 await trigger.press('Enter');const exit=page.getByRole('button',{name:'전체 화면 해제',exact:true});await exit.focus();await exit.press('Enter');await expect.poll(()=>page.evaluate(()=>document.fullscreenElement===null)).toBe(true);await expect(trigger).toBeFocused();expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).document.project)).toEqual(before);
});

test('fullscreen shortcut follows an external exit and a rejected request preserves the manuscript',async({page})=>{
 await page.addInitScript(()=>sessionStorage.setItem('knolstory-fullscreen-offered-v1','1'));await page.route('**/api/**',r=>r.abort());await page.route('**/runtime/**',r=>r.abort());await page.goto('/?view=editor');await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).document.project);
 const enter=page.getByRole('button',{name:'편집 화면 전체 화면',exact:true});await enter.click();await expect(page.getByRole('button',{name:'편집 화면 전체 화면 해제',exact:true})).toBeVisible();
 await page.evaluate(()=>document.exitFullscreen());await expect(enter).toHaveAttribute('aria-pressed','false');
 await page.evaluate(()=>{document.documentElement.requestFullscreen=async()=>{throw new DOMException('Denied','NotAllowedError');};});await enter.click();await expect(page.getByText('전체 화면을 전환하지 못했어요. 현재 화면에서 계속하거나 다시 눌러 주세요.',{exact:true})).toBeVisible();await expect(enter).toHaveAttribute('aria-pressed','false');expect(await page.evaluate(()=>document.fullscreenElement)).toBeNull();expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).document.project)).toEqual(before);
});
