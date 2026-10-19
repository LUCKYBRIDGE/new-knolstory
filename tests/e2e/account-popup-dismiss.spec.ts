import {test,expect} from '@playwright/test';
for(const width of [320,390,1280])test(`account popovers coordinate and dismiss without changing local works ${width}`,async({page})=>{
 await page.setViewportSize({width,height:800});
 await page.route('**/api/v1/**',route=>{
  const path=new URL(route.request().url()).pathname;
  if(path.endsWith('/auth/config'))return route.fulfill({json:{success:true,data:{signupProvider:'kakao',providers:{kakao:false,google:false}}}});
  return route.fulfill({status:401,json:{success:false,error:{code:'SESSION_REQUIRED'}}});
 });
 await page.goto('/?view=library');await expect(page.getByTestId('library-save-status')).toHaveText('임시 보관됨');
 const before=await page.evaluate(()=>localStorage.getItem('knolstory-next-workspace-v1'));
 const account=page.locator('[data-account-menu]'),online=page.locator('[data-online-works]');
 await account.locator('summary').click();await expect(account).toHaveAttribute('open','');
 await online.locator('summary').click();await expect(online).toHaveAttribute('open','');await expect(account).not.toHaveAttribute('open','');
 const panel=online.locator('section');await expect.poll(async()=>{const b=await panel.boundingBox();return b!==null&&b.x>=0&&b.x+b.width<=width;}).toBe(true);const bounds=await panel.boundingBox();expect(bounds).not.toBeNull();expect(bounds!.x).toBeGreaterThanOrEqual(0);expect(bounds!.x+bounds!.width).toBeLessThanOrEqual(width);
 expect(await panel.evaluate(node=>node.scrollWidth<=node.clientWidth+1)).toBe(true);
 await page.keyboard.press('Escape');await expect(online).not.toHaveAttribute('open','');await expect(online.locator('summary')).toBeFocused();
 await account.locator('summary').click();await page.getByRole('main',{name:'로컬 서재',exact:true}).click({position:{x:4,y:400}});await expect(account).not.toHaveAttribute('open','');
 await online.locator('summary').click();await online.getByRole('button',{name:'로그인 상태 다시 확인',exact:true}).focus();await page.keyboard.press('Tab');await expect(online).not.toHaveAttribute('open','');
 expect(await page.evaluate(()=>localStorage.getItem('knolstory-next-workspace-v1'))).toEqual(before);
});

test('signed-in account and online popup actions remain usable after outside-dismiss changes',async({page})=>{
 let reads=0;await page.setViewportSize({width:390,height:844});await page.route('**/api/v1/**',route=>{const path=new URL(route.request().url()).pathname;if(path.endsWith('/auth/config'))return route.fulfill({json:{success:true,data:{signupProvider:'kakao',providers:{kakao:false,google:false}}}});if(path.endsWith('/me'))return route.fulfill({json:{success:true,data:{accountId:'11111111-1111-4111-8111-111111111111',csrf:'csrf'}}});if(path.endsWith('/documents')){reads++;return route.fulfill({json:{success:true,data:{documents:[],nextCursor:null}}});}return route.fulfill({status:404,json:{success:false,error:{code:'NOT_FOUND'}}});});
 await page.goto('/?view=library');await expect(page.getByTestId('library-save-status')).toHaveText('임시 보관됨');const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).document.project);const online=page.locator('[data-online-works]');await online.locator('summary').click();await online.getByRole('button',{name:'목록 새로고침',exact:true}).click();await expect.poll(()=>reads).toBe(1);await expect(online).toHaveAttribute('open','');await page.keyboard.press('Escape');await expect(online.locator('summary')).toBeFocused();expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).document.project)).toEqual(before);
});
