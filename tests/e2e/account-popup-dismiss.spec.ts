import {test,expect} from '@playwright/test';
for(const width of [320,390,1280])test(`account popover dismisses within the unified library without changing local works ${width}`,async({page})=>{
 await page.setViewportSize({width,height:800});
 await page.route('**/api/v1/**',route=>{
  const path=new URL(route.request().url()).pathname;
  if(path.endsWith('/auth/config'))return route.fulfill({json:{success:true,data:{signupProvider:'kakao',providers:{kakao:false,google:false}}}});
  return route.fulfill({status:401,json:{success:false,error:{code:'SESSION_REQUIRED'}}});
 });
 await page.goto('/?view=library');await expect(page.getByTestId('library-save-status')).toHaveText('임시 보관됨');
 const before=await page.evaluate(()=>localStorage.getItem('knolstory-next-workspace-v1'));
 const account=page.locator('[data-account-menu]');await expect(page.locator('[data-online-works]')).toHaveCount(0);
 await account.locator('summary').click();await expect(account).toHaveAttribute('open','');await expect(account.locator('summary')).toHaveAccessibleName('계정 · 로그인 전');
 const panel=account.locator('section');await expect.poll(async()=>{const b=await panel.boundingBox();return b!==null&&b.x>=0&&b.x+b.width<=width;}).toBe(true);const bounds=await panel.boundingBox();expect(bounds).not.toBeNull();expect(bounds!.x).toBeGreaterThanOrEqual(0);expect(bounds!.x+bounds!.width).toBeLessThanOrEqual(width);
 expect(await panel.evaluate(node=>node.scrollWidth<=node.clientWidth+1)).toBe(true);
 await page.keyboard.press('Escape');await expect(account).not.toHaveAttribute('open','');await expect(account.locator('summary')).toBeFocused();
 await account.locator('summary').click();await page.getByRole('main',{name:'놀스토리 서재',exact:true}).click({position:{x:4,y:400}});await expect(account).not.toHaveAttribute('open','');
 await account.locator('summary').click();await account.getByRole('button',{name:'로그인 상태 다시 확인',exact:true}).focus();await page.keyboard.press('Tab');await expect(account).not.toHaveAttribute('open','');
 expect(await page.evaluate(()=>localStorage.getItem('knolstory-next-workspace-v1'))).toEqual(before);
});

test('signed-in account popover and online trash dialog coordinate and preserve local works',async({page})=>{
 let activeReads=0,trashReads=0;
 await page.setViewportSize({width:390,height:844});await page.route('**/api/v1/**',route=>{
  const url=new URL(route.request().url()),path=url.pathname;
  if(path.endsWith('/auth/config'))return route.fulfill({json:{success:true,data:{signupProvider:'kakao',providers:{kakao:true,google:false}}}});
  if(path.endsWith('/me'))return route.fulfill({json:{success:true,data:{accountId:'11111111-1111-4111-8111-111111111111',csrf:'csrf'}}});
  if(path.endsWith('/documents')){if(url.searchParams.get('state')==='trash')trashReads++;else activeReads++;return route.fulfill({json:{success:true,data:{documents:[],nextCursor:null}}});}
  return route.fulfill({status:404,json:{success:false,error:{code:'NOT_FOUND'}}});
 });
 await page.goto('/?view=library');await expect(page.getByTestId('library-save-status')).toHaveText('임시 보관됨');await expect.poll(()=>activeReads).toBeGreaterThanOrEqual(1);
 const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).document.project),account=page.locator('[data-account-menu]'),trashButton=page.getByRole('button',{name:'온라인 휴지통',exact:true});
 await expect(trashButton).toBeEnabled();await account.locator('summary').click();await expect(account).toHaveAttribute('open','');await expect(account.getByText('로그인됨',{exact:true})).toBeVisible();
 await page.keyboard.press('Escape');await expect(account).not.toHaveAttribute('open','');
 await trashButton.click();const dialog=page.getByRole('dialog',{name:'온라인 휴지통',exact:true});await expect(dialog).toBeVisible();await expect(account).not.toHaveAttribute('open','');await expect.poll(()=>trashReads).toBe(1);
 const bounds=await dialog.boundingBox();expect(bounds).not.toBeNull();expect(bounds!.x).toBeGreaterThanOrEqual(0);expect(bounds!.x+bounds!.width).toBeLessThanOrEqual(390);expect(await dialog.evaluate(node=>node.scrollWidth<=node.clientWidth+1)).toBe(true);
 await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(trashButton).toBeFocused();
 const refresh=page.getByRole('button',{name:'온라인 목록 다시 확인',exact:true});await expect(refresh).toBeEnabled();const reads=activeReads;await refresh.click();await expect.poll(()=>activeReads).toBe(reads+1);await expect(refresh).toBeEnabled();
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).document.project)).toEqual(before);
});
