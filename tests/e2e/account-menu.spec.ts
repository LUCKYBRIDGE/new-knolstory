import {test,expect,type Page} from '@playwright/test';
import {startShelfCreation} from './library-entry';
async function mockedAccount(page:Page,enabled=true){
 let signedIn=false;const calls:string[]=[];
 await page.route('**/api/v1/**',async route=>{
  const path=new URL(route.request().url()).pathname;calls.push(path);
  if(path.endsWith('/auth/config'))return route.fulfill({json:{success:true,data:{signupProvider:'kakao',providers:{kakao:enabled,google:enabled}}}});
  if(path.endsWith('/me'))return route.fulfill(signedIn?{json:{success:true,data:{accountId:'browser-account',csrf:'ephemeral-csrf'}}}:{status:401,json:{success:false,error:{code:'SESSION_REQUIRED'}}});
  if(path.endsWith('/auth/logout')){expect(route.request().headers()['x-csrf-token']).toBe('ephemeral-csrf');signedIn=false;return route.fulfill({json:{success:true,data:{loggedOut:true}}});}
  if(path.endsWith('/kakao/start')){signedIn=true;return route.fulfill({status:302,headers:{location:'/?auth=success'}});}
  return route.fulfill({status:503,json:{success:false,error:{code:'PROVIDER_UNAVAILABLE'}}});
 });return calls;
}
async function openAccount(page:Page){const menu=page.locator('[data-account-menu]');await menu.locator('summary').click();await expect(menu.getByRole('button',{name:'로그인 상태 다시 확인',exact:true})).toBeEnabled();return menu;}
async function authored(page:Page){return page.evaluate(()=>{const value=JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!);return {project:value.document.project,works:Object.fromEntries(Object.entries(value.works).map(([id,document])=>[id,(document as {project:unknown}).project])),storyId:value.storyId,lineId:value.lineId};});}
// Envelope savedAt changes during normal hydration; compare every other field.
async function workspaceContent(page:Page){return page.evaluate(()=>{const value=JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!);return {...value,document:{...value.document,savedAt:undefined},works:Object.fromEntries(Object.entries(value.works).map(([id,document])=>[id,{...(document as Record<string,unknown>),savedAt:undefined}]))};});}
for(const width of [1440,768,390,844])test(`account login return and logout preserve local authored work ${width}`,async({page})=>{
 await page.setViewportSize({width,height:width===844?390:900});const calls=await mockedAccount(page);await page.goto('/?view=library');await expect(page.getByTestId('library-save-status')).toHaveText('임시 보관됨');
 await startShelfCreation(page);await page.getByLabel('새 작품 제목',{exact:true}).fill('계정과 독립된 원고');await page.getByRole('button',{name:'새 작품 생성',exact:true}).click();
 const text=page.getByLabel('대사 / 해설',{exact:true});await text.fill('로그인 전에 쓰던 원고\n그대로 남아 있어요.');await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 await expect(page.locator('[data-account-menu]')).toHaveCount(0);await page.getByRole('button',{name:'서재로',exact:true}).click();await expect(page.getByTestId('library-save-status')).toHaveText('임시 보관됨');const before=await authored(page);
 let menu=await openAccount(page);await menu.getByRole('button',{name:'카카오로 가입·로그인',exact:true}).click();await expect(page.getByRole('main',{name:'로컬 서재',exact:true})).toBeVisible();menu=await openAccount(page);await expect(menu.getByText('로그인됨',{exact:true})).toBeVisible();expect(await authored(page)).toEqual(before);expect(await page.evaluate(()=>sessionStorage.getItem('knolstory-account-return-v1'))).toBeNull();
 await menu.getByRole('button',{name:'로그아웃',exact:true}).click();await expect(menu.getByText('로그인 전',{exact:true})).toBeVisible();expect(await authored(page)).toEqual(before);expect(calls).toContain('/api/v1/auth/logout');
 expect(await page.evaluate(()=>Object.keys(localStorage).some(key=>key.includes('csrf')))).toBe(false);await page.keyboard.press('Escape');await expect(menu.locator('summary')).toBeFocused();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.reload();expect(await authored(page)).toEqual(before);
});
test('unconfigured account providers remain optional and service failure is retryable',async({page})=>{
 await mockedAccount(page,false);await page.goto('/?view=library');const menu=await openAccount(page);await expect(menu.getByRole('button',{name:'카카오로 가입·로그인',exact:true})).toBeDisabled();await expect(menu).toContainText('설정 준비 중');
 await page.route('**/api/v1/me',route=>route.fulfill({status:503,json:{success:false,error:{code:'AUTH_UNAVAILABLE'}}}));await menu.getByRole('button',{name:'로그인 상태 다시 확인',exact:true}).click();await expect(menu.getByRole('alert')).toContainText('기기의 작품은 계속');await expect(page.getByTestId('library-tools')).toBeVisible();
});
test('failed local storage blocks account navigation without losing local works',async({page})=>{
 const calls=await mockedAccount(page);await page.goto('/?view=library');await expect(page.getByTestId('library-save-status')).toHaveText('임시 보관됨');const before=await authored(page);const menu=await openAccount(page);
 await page.evaluate(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='knolstory-next-workspace-v1')throw Error('quota');return original.call(this,key,value);};});
 await menu.getByRole('button',{name:'카카오로 가입·로그인',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'로그인 이동을 멈췄어요'})).toBeVisible();expect(calls.filter(path=>path.endsWith('/start'))).toEqual([]);expect(await authored(page)).toEqual(before);await expect(page.getByRole('main',{name:'로컬 서재',exact:true})).toBeVisible();
});
test('a delayed Google link cannot redirect or write a work after leaving the account menu',async({page})=>{
 await mockedAccount(page);let release:()=>void=()=>{};const delayed=new Promise<void>(resolve=>{release=resolve;});
 await page.route('**/api/v1/me',route=>route.fulfill({json:{success:true,data:{accountId:'same-account',csrf:'csrf'}}}));
 await page.route('**/api/v1/auth/google/link/start',async route=>{await delayed;await route.fulfill({json:{success:true,data:{authorizationUrl:'https://accounts.google.com/o/oauth2/v2/auth?state=delayed'}}});});
 const navigations:string[]=[];await page.route('https://accounts.google.com/**',route=>{navigations.push(route.request().url());return route.abort();});
 await page.goto('/?view=library');await expect(page.getByTestId('library-save-status')).toHaveText('임시 보관됨');const menu=await openAccount(page);await menu.getByRole('button',{name:'Google 계정 연결',exact:true}).click();await expect(menu.getByRole('button',{name:'Google 계정 연결',exact:true})).toBeDisabled();await page.keyboard.press('Escape');
 await startShelfCreation(page);await page.getByLabel('새 작품 제목',{exact:true}).fill('연결 대기 중 새 작품');await page.getByRole('button',{name:'새 작품 생성',exact:true}).click();await page.locator('[data-current-cut] textarea').first().fill('이 원고는 늦게 온 연결 응답보다 새롭습니다.');await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');const before=await authored(page);
 const response=page.waitForResponse('**/api/v1/auth/google/link/start');release();await(await response).finished();await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));await page.locator('[data-current-cut] textarea').first().blur();expect(await authored(page)).toEqual(before);expect(navigations).toEqual([]);await expect(page.locator('[data-current-cut] textarea').first()).toHaveValue('이 원고는 늦게 온 연결 응답보다 새롭습니다.');
});
test('focus refresh during delayed logout cannot retain the old session',async({page})=>{
 await mockedAccount(page);let signedIn=true,meRequests=0,release:()=>void=()=>{};const delayed=new Promise<void>(resolve=>{release=resolve;});
 await page.route('**/api/v1/me',route=>{meRequests++;return route.fulfill(signedIn?{json:{success:true,data:{accountId:'same-account',csrf:'csrf'}}}:{status:401,json:{success:false,error:{code:'SESSION_REQUIRED'}}});});
 await page.route('**/api/v1/auth/logout',async route=>{await delayed;signedIn=false;await route.fulfill({json:{success:true,data:{loggedOut:true}}});});
 await page.goto('/?view=library');const menu=await openAccount(page);const before=meRequests;await menu.getByRole('button',{name:'로그아웃',exact:true}).click();await expect(menu.getByRole('button',{name:'로그아웃',exact:true})).toBeDisabled();await page.evaluate(()=>window.dispatchEvent(new Event('focus')));release();await expect(menu.getByText('로그인 전',{exact:true})).toBeVisible();expect(meRequests).toBeGreaterThanOrEqual(before);const anonymous=page.waitForResponse(response=>response.url().endsWith('/api/v1/me')&&response.status()===401);await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await anonymous;await expect(menu.getByText('로그인 전',{exact:true})).toBeVisible();await expect(menu.getByRole('button',{name:'로그아웃',exact:true})).toHaveCount(0);
});
test('a blocked second writer cannot start login or replace the saved work',async({page,context})=>{
 await mockedAccount(page);await page.goto('/?view=library');await expect(page.getByTestId('library-save-status')).toHaveText('임시 보관됨');const before=await authored(page),other=await context.newPage();const calls=await mockedAccount(other);await other.goto('/?view=library');const menu=await openAccount(other);await menu.getByRole('button',{name:'카카오로 가입·로그인',exact:true}).click();await expect(other.getByRole('status').filter({hasText:'로그인 이동을 멈췄어요'})).toBeVisible();expect(calls.filter(path=>path.endsWith('/start'))).toEqual([]);expect(await authored(other)).toEqual(before);await other.close();
});
test('Google linking uses an empty CSRF POST and rechecks session after returning',async({page})=>{
 await mockedAccount(page);let meRequests=0;
 await page.route('**/api/v1/me',route=>{meRequests++;return route.fulfill({json:{success:true,data:{accountId:'same-account',csrf:'csrf'}}});});
 await page.route('**/api/v1/auth/google/link/start',route=>{expect(route.request().method()).toBe('POST');expect(route.request().postData()).toBeNull();expect(route.request().headers()['x-csrf-token']).toBe('csrf');return route.fulfill({json:{success:true,data:{authorizationUrl:'https://accounts.google.com/o/oauth2/v2/auth?state=opaque'}}});});
 await page.route('https://accounts.google.com/**',route=>route.fulfill({status:302,headers:{location:`${new URL(page.url()).origin}/?auth=linked`}}));
 await page.goto('/?view=library');await expect(page.getByTestId('library-save-status')).toHaveText('임시 보관됨');const before=await authored(page),menu=await openAccount(page),requests=meRequests;await menu.getByRole('button',{name:'Google 계정 연결',exact:true}).click();const returned=await openAccount(page);await expect(returned.getByText('로그인됨',{exact:true})).toBeVisible();expect(meRequests).toBeGreaterThan(requests);expect(await authored(page)).toEqual(before);expect(await page.evaluate(()=>sessionStorage.getItem('knolstory-account-return-v1'))).toBeNull();
});

for(const change of ['explicit','focus','renewed-csrf','anonymous'] as const)test(`a delayed Google link cannot navigate after a same-mounted ${change} account change`,async({page})=>{
 await mockedAccount(page);let session:{accountId:string;csrf:string}|null={accountId:'first-account',csrf:'first-csrf'},release:()=>void=()=>{};const delayed=new Promise<void>(resolve=>{release=resolve;});
 await page.route('**/api/v1/me',route=>route.fulfill(session?{json:{success:true,data:session}}:{status:401,json:{success:false,error:{code:'SESSION_REQUIRED'}}}));
 await page.route('**/api/v1/auth/google/link/start',async route=>{await delayed;await route.fulfill({json:{success:true,data:{authorizationUrl:'https://accounts.google.com/o/oauth2/v2/auth?state=obsolete'}}});});
 const navigations:string[]=[];await page.route('https://accounts.google.com/**',route=>{navigations.push(route.request().url());return route.fulfill({status:204});});
 await page.goto('/?view=library');await expect(page.getByTestId('library-save-status')).toHaveText('임시 보관됨');const menu=await openAccount(page),before=await workspaceContent(page);
 await menu.getByRole('button',{name:'Google 계정 연결',exact:true}).click();await expect(menu.getByRole('button',{name:'Google 계정 연결',exact:true})).toBeDisabled();session=change==='anonymous'?null:{accountId:change==='renewed-csrf'?'first-account':'second-account',csrf:'second-csrf'};
 const checked=page.waitForResponse('**/api/v1/me');await page.evaluate(change=>window.dispatchEvent(new Event(change==='explicit'||change==='anonymous'?'knolstory-account-session-changed':'focus')),change);await(await checked).finished();await expect(menu.getByText(change==='anonymous'?'로그인 전':'로그인됨',{exact:true})).toBeVisible();
 const response=page.waitForResponse('**/api/v1/auth/google/link/start');release();await(await response).finished();await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
 expect(navigations).toEqual([]);expect(await workspaceContent(page)).toEqual(before);await expect(menu.getByRole('button',{name:change==='anonymous'?'카카오로 가입·로그인':'Google 계정 연결',exact:true})).toBeEnabled();
});
test('an obsolete Google link failure cannot refresh or unlock a newer pending link',async({page})=>{
 await mockedAccount(page);let meRequests=0;const releases:(()=>void)[]=[];
 await page.route('**/api/v1/me',route=>{meRequests++;return route.fulfill({json:{success:true,data:{accountId:'same-account',csrf:'same-csrf'}}});});
 await page.route('**/api/v1/auth/google/link/start',async route=>{await new Promise<void>(resolve=>releases.push(resolve));await route.fulfill({status:503,json:{success:false,error:{code:'PROVIDER_UNAVAILABLE'}}});});
 await page.goto('/?view=library');await expect(page.getByTestId('library-save-status')).toHaveText('임시 보관됨');const menu=await openAccount(page),link=menu.getByRole('button',{name:'Google 계정 연결',exact:true}),before=await workspaceContent(page);
 await link.click();await expect.poll(()=>releases.length).toBe(1);await page.evaluate(()=>window.dispatchEvent(new Event('knolstory-account-session-changed')));await expect(link).toBeEnabled();await link.click();await expect.poll(()=>releases.length).toBe(2);const checked=meRequests;
 const old=page.waitForResponse('**/api/v1/auth/google/link/start');releases[0]!();await(await old).finished();await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));await expect(link).toBeDisabled();expect(meRequests).toBe(checked);await expect(menu.getByRole('alert')).toHaveCount(0);expect(await workspaceContent(page)).toEqual(before);
 await page.evaluate(()=>window.dispatchEvent(new Event('knolstory-account-session-changed')));await expect(link).toBeEnabled();const latest=page.waitForResponse('**/api/v1/auth/google/link/start');releases[1]!();await(await latest).finished();
});
