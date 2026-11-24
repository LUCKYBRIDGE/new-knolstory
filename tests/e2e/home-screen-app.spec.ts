import {test,expect,type Browser,type Page} from '@playwright/test';

// 홈 화면 앱 (2026-11-23): installed, 놀스토리 opens without the address bar, so phones skip the
// browser's own fullscreen exit notice. The in-page fullscreen offer and buttons stay as they were.
const phone={viewport:{width:390,height:844},screen:{width:390,height:844},hasTouch:true};
async function editor(page:Page){await page.route('**/api/**',r=>r.abort());await page.route('**/runtime/**',r=>r.abort());await page.goto('/?view=editor');await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');}
async function offerInstall(page:Page){await page.evaluate(()=>{const event=Object.assign(new Event('beforeinstallprompt',{cancelable:true}),{prompt:async()=>{(window as unknown as {prompted:number}).prompted=((window as unknown as {prompted?:number}).prompted??0)+1;},userChoice:Promise.resolve({outcome:'accepted'})});dispatchEvent(event);});}
async function openSettings(page:Page){const menu=page.locator('[data-work-menu]');if(!await menu.evaluate(n=>(n as HTMLDetailsElement).open))await menu.locator(':scope>summary').click();return menu;}
async function phonePage(browser:Browser,init?:()=>void,userAgent?:string){const context=await browser.newContext({...phone,...(userAgent?{userAgent}:{})});await context.addInitScript(()=>sessionStorage.setItem('knolstory-fullscreen-offered-v1','1'));if(init)await context.addInitScript(init);return context.newPage();}

test('the app can be added to a home screen with its own icon and opens in fullscreen',async({page},info)=>{
 test.skip(info.project.name!=='host');await page.goto('/');
 const href=await page.locator('link[rel=manifest]').getAttribute('href');expect(href).toBe('/manifest.webmanifest');
 const manifest=await(await page.request.get(href!)).json();
 expect(manifest).toMatchObject({name:'놀스토리',short_name:'놀스토리',lang:'ko',start_url:'/',scope:'/',display:'fullscreen'});
 expect(manifest.icons.map((icon:{sizes:string;purpose:string})=>`${icon.sizes} ${icon.purpose}`)).toEqual(['192x192 any','512x512 any','512x512 maskable']);
 for(const src of [...manifest.icons.map((icon:{src:string})=>icon.src),await page.locator('link[rel=apple-touch-icon]').getAttribute('href')]){const response=await page.request.get(src);expect(response.status(),src).toBe(200);expect(response.headers()['content-type']).toContain('image/png');}
});

test('‘홈 화면에 추가’ asks the browser from the reading menu and the editor settings',async({browser},info)=>{
 test.skip(info.project.name!=='host');const page=await phonePage(browser);await editor(page);
 await expect(page.locator('[data-app-install]')).toHaveCount(0);
 await offerInstall(page);const menu=await openSettings(page);
 const fromSettings=menu.getByRole('button',{name:'홈 화면에 추가',exact:true});await expect(fromSettings).toBeVisible();expect((await fromSettings.boundingBox())!.height).toBeGreaterThanOrEqual(44);
 await fromSettings.click();await expect.poll(()=>page.evaluate(()=>(window as unknown as {prompted?:number}).prompted)).toBe(1);
 // One question per browser offer: the button leaves once it has been used.
 await expect(page.locator('[data-app-install]')).toHaveCount(0);
 await offerInstall(page);await page.getByText('보기 설정',{exact:true}).click();await page.getByRole('button',{name:'처음부터 읽기',exact:true}).click();
 await page.getByRole('button',{name:'읽기 메뉴',exact:true}).click();
 await expect(page.getByRole('button',{name:'전체 화면',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'홈 화면에 추가',exact:true}).click();await expect.poll(()=>page.evaluate(()=>(window as unknown as {prompted?:number}).prompted)).toBe(2);
 await page.context().close();
});

test('iPhone explains the Share sheet step instead of a browser question',async({browser},info)=>{
 test.skip(info.project.name!=='host');
 const page=await phonePage(browser,undefined,'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1');await editor(page);
 const menu=await openSettings(page);const button=menu.getByRole('button',{name:'홈 화면에 추가',exact:true});
 await expect(button).toHaveAttribute('aria-expanded','false');await button.click();await expect(button).toHaveAttribute('aria-expanded','true');
 await expect(menu.locator('[data-app-install-note]')).toHaveText(/공유 버튼을 누른 뒤 ‘홈 화면에 추가’/);
 await page.context().close();
});

test('opened from the home screen, there is nothing to add and no fullscreen question',async({browser},info)=>{
 test.skip(info.project.name!=='host');
 const context=await browser.newContext(phone);await context.addInitScript(()=>{const original=window.matchMedia.bind(window);window.matchMedia=(query:string)=>/display-mode: fullscreen/.test(query)?{...original(query),matches:true,media:query}:original(query);});
 const page=await context.newPage();await editor(page);
 await expect(page.getByRole('dialog',{name:'휴대폰 전체 화면 안내',exact:true})).toHaveCount(0);
 await offerInstall(page);const menu=await openSettings(page);await expect(menu.getByRole('button',{name:'홈 화면에 추가',exact:true})).toHaveCount(0);
 await context.close();
});

test('in the browser the phone fullscreen question still comes once',async({browser},info)=>{
 test.skip(info.project.name!=='host');const context=await browser.newContext(phone);const page=await context.newPage();await editor(page);
 await expect(page.getByRole('dialog',{name:'휴대폰 전체 화면 안내',exact:true})).toBeVisible();
 await context.close();
});
