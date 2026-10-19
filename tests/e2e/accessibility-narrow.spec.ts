import {test,expect} from '@playwright/test';
for(const width of [320,390,1440])test(`library header controls remain reachable at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:740});await page.goto('/?view=library');
 const tools=page.getByText('책 찾기·추가',{exact:true});await expect(tools).toBeVisible();
 const bounds=await tools.boundingBox();expect(bounds).not.toBeNull();expect(bounds!.x).toBeGreaterThanOrEqual(0);expect(bounds!.x+bounds!.width).toBeLessThanOrEqual(width);
 await tools.click();await expect(page.getByRole('searchbox',{name:'책 찾기',exact:true})).toBeVisible();await page.keyboard.press('Escape');
 await page.locator('[data-account-menu]>summary').click();await expect(page.getByRole('region',{name:'놀스토리 계정',exact:true})).toBeVisible();await page.keyboard.press('Escape');
 await page.locator('[data-online-works]>summary').click();await expect(page.getByRole('region',{name:'온라인 작품',exact:true})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
for(const [width,height] of [[320,740],[390,740],[1440,740],[390,390]])test(`account and online panels fit the viewport at ${width}x${height}`,async({page})=>{
 await page.setViewportSize({width,height});await page.goto('/?view=library');
 for(const [selector,label] of [['[data-account-menu]','놀스토리 계정'],['[data-online-works]','온라인 작품']]){
  await page.locator(`${selector}>summary`).click();const panel=page.getByRole('region',{name:label,exact:true});await expect(panel).toBeVisible();
  await expect.poll(async()=>{const box=await panel.boundingBox();return !!box&&box.x>=15.5&&box.y>=15.5&&box.x+box.width<=width-15.5&&box.y+box.height<=height-15.5;}).toBe(true);
  await page.keyboard.press('Escape');
 }
});
test('open account panels remain inside the real Chromium visual viewport after page-scale zoom',async({page,context})=>{
 await page.setViewportSize({width:390,height:740});await page.goto('/?view=library');
 const client=await context.newCDPSession(page);
 for(const selector of ['[data-account-menu]','[data-online-works]']){
  await page.locator(`${selector}>summary`).click();await client.send('Emulation.setPageScaleFactor',{pageScaleFactor:2});
  await expect.poll(()=>page.evaluate(()=>visualViewport!.width<innerWidth)).toBe(true);
  await expect.poll(()=>page.locator(`${selector}>section`).evaluate(node=>{const r=node.getBoundingClientRect(),v=visualViewport!;return r.left>=v.offsetLeft+15.5&&r.top>=v.offsetTop+15.5&&r.right<=v.offsetLeft+v.width-15.5&&r.bottom<=v.offsetTop+v.height-15.5;})).toBe(true);
  await page.keyboard.press('Escape');await client.send('Emulation.setPageScaleFactor',{pageScaleFactor:1});
 }
 await client.detach();
});
