import {test,expect} from '@playwright/test';
test('mobile capacity, explicit Enter, compact tools and native 40% pages work together',async({page},info)=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/?view=editor');
 const input=page.getByRole('textbox',{name:'대사 / 해설',exact:true});
 await expect(input).toBeVisible();
 await input.fill('가\n'.repeat(12));
 await expect(page.getByText(/Enter 12회/)).toBeVisible();
 await expect(page.getByText(/모바일 세로 참고/)).toContainText('화면 분량');
 const manuscript='토끼는 바다를 바라보았다. 파도 너머로 작은 섬이 모습을 드러냈다. 자라는 물가에 멈춰 서서 토끼를 기다렸다. 처음 보는 바다는 생각했던 것보다 훨씬 넓었다. 토끼는 한 걸음 다가갔다가 차가운 물에 발이 닿자 얼른 뒤로 물러났다. 자라는 그런 토끼를 보고 조용히 웃었다. 멀리서 갈매기 한 마리가 날아와 바위 위에 내려앉았다. 바람이 불 때마다 풀잎들이 같은 방향으로 고개를 숙였다. 토끼는 깊이 숨을 들이쉬었다. 낯선 길이 두려웠지만 여기까지 함께 온 친구가 곁에 있었다. 자라가 등을 내밀자 토끼는 조심스럽게 올라탔다. 두 친구는 서로 준비가 되었는지 확인한 뒤 천천히 바다로 나아갔다. 섬으로 이어지는 길에는 발자국 대신 작은 물결이 남았다.';
 await input.fill(manuscript);
 await page.screenshot({path:info.outputPath('editor-capacity.png'),fullPage:true});
 await page.getByRole('button',{name:'이 컷부터 재생',exact:true}).click();
 const status=page.getByTestId('story-runtime-status');
 await expect.poll(async()=>{
  const rev=await status.getAttribute('data-scene-revision');return rev!==null&&(await status.getAttribute('data-rendered-revision'))===rev;
 },{timeout:120000}).toBe(true);
 const frame=page.getByTestId('story-runtime-frame');
 const gate=frame.contentFrame().getByRole('button',{name:'소리 켜고 시작 · Enter 또는 Space',exact:true});
 if(await gate.count()){await gate.press('Enter');await expect(status).toHaveAttribute('data-audio-unlocked','true',{timeout:15000});}
 const tools=page.getByRole('group',{name:'읽기 도구',exact:true});
 const menu=page.getByRole('button',{name:'읽기 메뉴',exact:true});await expect(menu).toHaveText('메뉴');
 expect(await menu.evaluate(n=>getComputedStyle(n).whiteSpace)).toBe('nowrap');
 expect(await menu.evaluate(n=>getComputedStyle(n).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
 await menu.click();await expect(menu).toHaveAttribute('aria-expanded','true');
 await expect(page.getByRole('button',{name:'읽기 설정',exact:true})).toBeVisible();
 await menu.click();await expect(menu).toHaveAttribute('aria-expanded','false');
 await expect(tools.getByRole('button',{name:'지난기록',exact:true})).toBeVisible();
 await expect(tools.getByRole('button',{name:'빠른 저장',exact:true})).toBeVisible();
 const settings=tools.getByRole('button',{name:'설정',exact:true});await expect(settings).toBeVisible();
 const data=await status.evaluate(n=>({...((n as HTMLElement).dataset)}));
 const rect=JSON.parse(data.textboxRect!);expect(rect.height).toBeLessThanOrEqual(Number(data.sceneHeight)*.4+1);
 const pagination=JSON.parse(data.dialoguePage!);expect(pagination.count).toBeGreaterThan(1);expect(pagination.index).toBe(0);
 const bar=tools.locator('[style*="--reader-tool-font-size"]');expect((await bar.boundingBox())!.height).toBeLessThanOrEqual(25);
 const style=await settings.evaluate(n=>{const s=getComputedStyle(n);return {font:parseFloat(s.fontSize),border:s.borderTopWidth,background:s.backgroundColor};});
 expect(style.font).toBeLessThanOrEqual(12);expect(style.border).toBe('0px');expect(style.background).toBe('rgba(0, 0, 0, 0)');
 await page.screenshot({path:info.outputPath('native-compact-tools.png')});
 await settings.click();
 const dialog=page.getByRole('dialog');
 for(const name of ['저장','불러오기','자동 OFF','빠른 불러오기']){
  const action=dialog.getByRole('button',{name,exact:true});await expect(action).toBeVisible();
  expect(await action.evaluate(n=>getComputedStyle(n).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
 }
 await dialog.getByRole('button',{name:'자동 OFF',exact:true}).click();
 expect(await dialog.getByRole('button',{name:'자동 ON',exact:true}).evaluate(n=>getComputedStyle(n).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
 await page.screenshot({path:info.outputPath('mobile-settings.png')});
 await dialog.getByRole('button',{name:'읽기 메뉴 닫기',exact:true}).click();
 await page.waitForTimeout(3500);
 await expect.poll(async()=>JSON.parse((await status.getAttribute('data-dialogue-page'))!).index,{timeout:10000}).toBeGreaterThan(0);
 await page.setViewportSize({width:844,height:390});
 await expect(tools.getByRole('button',{name:'저장',exact:true})).toBeVisible();
 for(const name of ['지난기록','저장','불러오기','자동 ON','빠른 저장','빠른 불러오기'])await expect(tools.getByRole('button',{name,exact:true})).toBeVisible();
 await expect.poll(async()=>{const d=await status.evaluate(n=>({...((n as HTMLElement).dataset)}));return JSON.parse(d.textboxRect!).width/Number(d.sceneWidth);}).toBeCloseTo(.84,2);
 const landscapeData=await status.evaluate(n=>({...((n as HTMLElement).dataset)}));
 expect(JSON.parse(landscapeData.textboxRect!).height*844/Number(landscapeData.sceneWidth)).toBeLessThan(125);
 expect(await bar.evaluate(n=>getComputedStyle(n).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
 for(const button of await bar.getByRole('button').all()){
  expect(await button.evaluate(n=>getComputedStyle(n).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
  await button.hover();expect(await button.evaluate(n=>getComputedStyle(n).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
 }
 await page.mouse.move(0,0);
 await page.screenshot({path:info.outputPath('landscape-six-tools.png')});
});
