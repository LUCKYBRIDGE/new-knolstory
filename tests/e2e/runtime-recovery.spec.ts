import {test,expect} from '@playwright/test';

test('a blocked stage offers retry, preserves authored work and reconnects the real native engine',async({page},info)=>{
 test.setTimeout(180000);await page.setViewportSize({width:390,height:844});await page.addInitScript(()=>{if(window!==window.top)return;sessionStorage.setItem('knolstory-fullscreen-offered-v1','1');const original=window.setTimeout;window.setTimeout=((handler:TimerHandler,delay?:number,...args:unknown[])=>original(handler,delay===90000?500:delay,...args)) as typeof window.setTimeout;});
 await page.route('**/api/**',route=>route.abort());
 let requests=0;await page.route('**/runtime/index.html*',route=>{requests++;return requests===1?route.abort('connectionfailed'):route.continue();});
 await page.goto('/?view=editor');await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 const textarea=page.locator('textarea[aria-label$="컷 글"]').first();await textarea.fill('연결이 끊겨도 내가 쓴 글은 남아 있어야 합니다.');await textarea.blur();
 await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 const stored=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).document.project);
 const before=await stored(),frame=page.getByTestId('story-runtime-frame');await frame.evaluate(n=>n.setAttribute('data-recovery-identity','same-frame'));

 const retry=page.getByRole('button',{name:'무대 다시 연결',exact:true});await expect(retry).toBeVisible();
 const buttons=page.locator('[data-recovery=true] button');
 for(const button of await buttons.all())expect(await button.evaluate(n=>n.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
 expect(await buttons.nth(1).evaluate(n=>getComputedStyle(n).backgroundColor)).toBe('rgb(40, 65, 61)');
 await page.screenshot({path:info.outputPath('blocked-stage-recovery.png')});await retry.click();
 const status=page.getByTestId('story-runtime-status');await expect.poll(async()=>Number(await status.getAttribute('data-rendered-revision'))>=0&&await status.getAttribute('data-rendered-revision')===await status.getAttribute('data-scene-revision'),{timeout:120000}).toBe(true);
 await expect(frame).not.toHaveAttribute('data-recovery-identity','same-frame');await expect(frame).toHaveAttribute('src','/runtime/index.html?retry=1');await expect(retry).toHaveCount(0);expect(await stored()).toEqual(before);
 // Verify an authenticated native error report also offers a usable editing exit.
 await page.getByRole('button',{name:'이 컷부터 재생',exact:true}).click();
 await frame.evaluate(node=>{const win=(node as HTMLIFrameElement).contentWindow!;win.eval("window.parent.postMessage({protocol:1,type:'error',message:'private diagnostic only'},location.origin)");});
 await expect(retry).toBeVisible();await expect(page.getByText('private diagnostic only')).toHaveCount(0);
 await page.getByRole('button',{name:'편집으로 돌아가기',exact:true}).filter({visible:true}).first().click();
 await expect(textarea).toBeVisible();await expect(textarea).toHaveValue('연결이 끊겨도 내가 쓴 글은 남아 있어야 합니다.');expect(await stored()).toEqual(before);
});

test('an unavailable registered music file can be fetched again without losing the manuscript',async({page})=>{
 test.setTimeout(150000);await page.addInitScript(()=>{if(window===window.top)sessionStorage.setItem('knolstory-fullscreen-offered-v1','1');});await page.route('**/api/**',r=>r.abort());
 let failed=true,requests=0;await page.route('**/assets/audio/cc0/oga-once-upon-a-time/v1/once-upon-a-time-loop.ogg',route=>{requests++;return failed?route.fulfill({status:503,body:'unavailable'}):route.continue();});
 await page.goto('/?view=editor');await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 const project=await page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).document.project);
 const source={...project,id:'audio-recovery-check',chapters:project.chapters.map((c:Record<string,unknown>)=>({...c,audio:undefined})),lines:project.lines.map((l:Record<string,unknown>)=>({...l,audio:{music:{action:'play',assetId:'audio.cc0.oga-once-upon-a-time.once-upon-a-time-loop',volume:.2,loop:true}}}))};
 await page.locator('[data-work-menu]>summary').click();await page.getByLabel('작품 파일 가져오기',{exact:true}).setInputFiles({name:'audio-recovery.knolstory',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({documentType:'story-maker-project',schemaVersion:8,savedAt:'2026-11-02T00:00:00.000Z',appVersion:'test',project:source}))});
 const preview=page.getByRole('dialog',{name:'작품 가져오기 확인',exact:true});await preview.getByRole('button',{name:'내 사본으로 가져오기',exact:true}).click();
 await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).document.project);
 const retry=page.getByRole('button',{name:'무대 다시 연결',exact:true});await expect(retry).toBeVisible({timeout:120000});expect(requests).toBeGreaterThan(0);
 failed=false;const previousRequests=requests;await retry.click();const state=page.getByTestId('story-runtime-status');await expect.poll(async()=>await state.getAttribute('data-rendered-revision')===await state.getAttribute('data-scene-revision')&&Number(await state.getAttribute('data-rendered-revision'))>=0,{timeout:120000}).toBe(true);
 expect(requests).toBeGreaterThan(previousRequests);await expect(retry).toHaveCount(0);expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).document.project)).toEqual(before);
});
