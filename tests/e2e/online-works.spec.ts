import {test,expect,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {startShelfCreation,shelfCoverButton} from './library-entry';
// Fullscreen prompting has its own coverage. Keep these account flows on the current page.
test.beforeEach(async({page})=>{
 await page.addInitScript(()=>{if(window===window.top)sessionStorage.setItem('knolstory-fullscreen-offered-v1','1');});
});

const recordId='22222222-2222-4222-8222-222222222222';
async function onlineHarness(page:Page){
 const content=JSON.parse(readFileSync('docs/architecture/evidence/native-resume-2026-10-15/host-final/artifacts/score-authoring-author-cre-ac9ce-d-reload-on-compact-screens-host/score.knolstory','utf8'));const project=content.document.project;project.title='온라인에 보관한 원고';
 const canonical=(value:unknown):string=>Array.isArray(value)?`[${value.map(canonical).join(',')}]`:value&&typeof value==='object'?`{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${canonical((value as Record<string,unknown>)[key])}`).join(',')}}`:JSON.stringify(value);
 const {savedAt:_savedAt,appVersion:_appVersion,...document}=content.document;const snapshot={payloadVersion:1,content,contentSha256:createHash('sha256').update(canonical({...content,document})).digest('hex'),assetReferences:[]};
 const metadata={recordId,revision:1,format:'knolstory',clientProjectId:project.id,title:project.title,contentSha256:snapshot.contentSha256,createdAt:1,updatedAt:1};let created:unknown;
 await page.route('**/api/v1/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  if(path.endsWith('/auth/config'))return route.fulfill({json:{success:true,data:{signupProvider:'kakao',providers:{kakao:false,google:false}}}});
  if(path.endsWith('/me'))return route.fulfill({json:{success:true,data:{accountId:'11111111-1111-4111-8111-111111111111',csrf:'csrf'}}});
  if(path===`/api/v1/documents/${recordId}`&&route.request().method()==='GET')return route.fulfill({json:{success:true,data:{...metadata,snapshot}}});
  if(path===`/api/v1/documents/${recordId}`&&route.request().method()==='PUT'){const input=route.request().postDataJSON();expect(input.snapshot.content.document.project.id).toBe(project.id);return route.fulfill({json:{success:true,data:{recordId,revision:2,contentSha256:input.snapshot.contentSha256,replayed:false}}});}
  if(path==='/api/v1/documents'&&route.request().method()==='POST'){created=route.request().postDataJSON();expect(route.request().headers()['x-csrf-token']).toBe('csrf');expect(route.request().headers()['idempotency-key']).toBeTruthy();return route.fulfill({status:201,json:{success:true,data:{recordId,revision:1,contentSha256:(created as {snapshot:{contentSha256:string}}).snapshot.contentSha256,createdAt:1,updatedAt:1,replayed:false}}});}
  return route.fulfill({json:{success:true,data:{documents:[metadata],nextCursor:null}}});
 });return {project,snapshot,created:()=>created};
}
async function local(page:Page){return page.evaluate(()=>{const value=JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!);return {...value,works:{...value.works,[value.storyId]:value.document}};});}
const library=(page:Page)=>page.getByRole('main',{name:'놀스토리 서재',exact:true});
async function onlineReady(page:Page){await expect(page.getByRole('button',{name:'온라인 목록 다시 확인',exact:true})).toBeEnabled();}
async function focusWork(page:Page,title:string){
 await page.getByLabel('책 분류',{exact:true}).selectOption('own');
 await shelfCoverButton(page,title).click();return page.getByRole('dialog');
}
async function openRemote(page:Page){const focus=await focusWork(page,'온라인에 보관한 원고');await focus.getByRole('button',{name:/^이 기기에 열기/}).click();}
async function returnToLibrary(page:Page){await page.getByRole('button',{name:'홈 · 서재로 이동',exact:true}).or(page.getByRole('button',{name:'서재로',exact:true}).filter({visible:true})).click();await expect(page.getByTestId('library-save-status')).toHaveText('임시 보관됨');await onlineReady(page);}
async function createLocal(page:Page,title:string,text?:string){
 await expect(page.getByTestId('library-save-status')).toHaveText('임시 보관됨');
 await startShelfCreation(page);await page.getByLabel('새 작품 제목',{exact:true}).fill(title);await page.getByRole('button',{name:'새 작품 생성',exact:true}).click();
 if(text!==undefined)await page.getByLabel('1컷 글',{exact:true}).fill(text);
 await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
}
async function upload(page:Page,title:string,again=false){const focus=await focusWork(page,title);await focus.getByRole('button',{name:again?'다시 업로드':'온라인에 업로드',exact:true}).click();return focus;}
async function afterFrame(page:Page){await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));}
for(const width of [1440,390])test(`explicit online new save and independent copy preserve local originals ${width}`,async({page})=>{
 await page.setViewportSize({width,height:900});const remote=await onlineHarness(page);await page.goto('/?view=library');await expect(page.getByTestId('library-save-status')).toHaveText('임시 보관됨');
 await createLocal(page,'기기에 남길 개인 원고','온라인 작업과 별개로 보존할 글');await returnToLibrary(page);const before=await local(page);
 expect(remote.created()).toBeUndefined();let focus=await upload(page,'기기에 남길 개인 원고');await expect(focus.getByRole('status')).toContainText('업로드했어요');
 expect((remote.created() as {snapshot:{content:{document:{project:unknown}}}}).snapshot.content.document.project).toEqual(before.document.project);expect((await local(page)).document.project).toEqual(before.document.project);
 // The same record is represented by the linked local cover, rather than a duplicate online card.
 await expect(focus.getByRole('button',{name:'온라인 사본 열기',exact:true})).toBeEnabled();await focus.getByRole('button',{name:'온라인 사본 열기',exact:true}).click();
 await expect(page.getByRole('region',{name:'작품 설정',exact:true})).toBeVisible();await expect(page.getByTestId('preparation-save-status')).toHaveText('임시 보관됨');
 const after=await local(page);expect(after.document.project).toEqual({...remote.project,id:after.document.project.id});expect(after.document.project.id).not.toBe(remote.project.id);expect(after.works[before.storyId].project).toEqual(before.document.project);
 await returnToLibrary(page);focus=await focusWork(page,remote.project.title);const update=page.waitForRequest(request=>request.method()==='PUT'&&request.url().endsWith('/'+recordId));await focus.getByRole('button',{name:'다시 업로드',exact:true}).click();await update;await expect(focus.getByRole('status')).toContainText('업로드했어요');expect((await local(page)).document.project.id).toBe(after.document.project.id);
});
test('late online read never replaces a newly edited local work',async({page})=>{
 const remote=await onlineHarness(page);let release:()=>void=()=>{},started=false;const gate=new Promise<void>(resolve=>{release=resolve;});
 await page.route(`**/api/v1/documents/${recordId}`,async route=>{started=true;await gate;await route.fulfill({json:{success:true,data:{recordId,revision:1,format:'knolstory',clientProjectId:remote.project.id,title:remote.project.title,contentSha256:remote.snapshot.contentSha256,createdAt:1,updatedAt:1,snapshot:remote.snapshot}}});});
 await page.goto('/?view=library');await onlineReady(page);await openRemote(page);await expect.poll(()=>started).toBe(true);await page.keyboard.press('Escape');
 await createLocal(page,'늦은 응답과 별개인 원고','지금 쓰는 원고를 유지해요.');const before=await local(page),response=page.waitForResponse(`**/api/v1/documents/${recordId}`);release();await(await response).finished();await afterFrame(page);
 expect((await local(page)).document.project).toEqual(before.document.project);await expect(page.getByLabel('1컷 글',{exact:true})).toHaveValue('지금 쓰는 원고를 유지해요.');
});
test('local save failure prevents an online POST and preserves the original work',async({page})=>{
 await onlineHarness(page);let posted=false;await page.route('**/api/v1/documents',route=>{if(route.request().method()==='POST')posted=true;return route.fulfill({status:503,json:{success:false,error:{code:'SERVICE_UNAVAILABLE'}}});});
 await page.goto('/?view=library');await createLocal(page,'저장 실패에도 남는 글');await returnToLibrary(page);const before=await local(page),focus=await focusWork(page,'저장 실패에도 남는 글');
 await page.evaluate(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='knolstory-next-workspace-v1')throw Error('quota');return original.call(this,key,value);};});
 await focus.getByRole('button',{name:'온라인에 업로드',exact:true}).click();await expect(focus.getByRole('alert')).toContainText('보관하지 못해 업로드를 멈췄어요');expect(posted).toBe(false);expect((await local(page)).document.project).toEqual(before.document.project);
});
test('a response-lost create retries the exact request after reload without duplicating work',async({page})=>{
 await onlineHarness(page);const requests:{key:string;body:unknown}[]=[];
 await page.route('**/api/v1/documents',async route=>{if(route.request().method()!=='POST')return route.fulfill({json:{success:true,data:{documents:[],nextCursor:null}}});const body=route.request().postDataJSON();requests.push({key:route.request().headers()['idempotency-key']!,body});if(requests.length===1)return route.abort('failed');return route.fulfill({json:{success:true,data:{recordId,revision:1,contentSha256:body.snapshot.contentSha256,replayed:true}}});});
 await page.goto('/?view=library');await createLocal(page,'응답 손실 원고');await returnToLibrary(page);const before=await local(page);let focus=await upload(page,'응답 손실 원고');await expect(focus.getByRole('alert')).toBeVisible();
 await page.reload();await onlineReady(page);focus=await upload(page,'응답 손실 원고');await expect(focus.getByRole('status')).toContainText('업로드했어요');expect(requests).toHaveLength(2);expect(requests[1]).toEqual(requests[0]);expect((await local(page)).document.project).toEqual(before.document.project);
});
test('logout invalidates an in-flight online read before any local copy is applied',async({page})=>{
 const remote=await onlineHarness(page);let signedIn=true,started=false,release:()=>void=()=>{};const gate=new Promise<void>(resolve=>{release=resolve;});
 await page.route('**/api/v1/me',route=>route.fulfill(signedIn?{json:{success:true,data:{accountId:'11111111-1111-4111-8111-111111111111',csrf:'csrf'}}}:{status:401,json:{success:false,error:{code:'SESSION_REQUIRED'}}}));
 await page.route('**/api/v1/auth/logout',route=>{signedIn=false;return route.fulfill({json:{success:true,data:{loggedOut:true}}});});
 await page.route(`**/api/v1/documents/${recordId}`,async route=>{started=true;await gate;return route.fulfill({json:{success:true,data:{recordId,revision:1,format:'knolstory',clientProjectId:remote.project.id,title:remote.project.title,contentSha256:remote.snapshot.contentSha256,createdAt:1,updatedAt:1,snapshot:remote.snapshot}}});});
 await page.goto('/?view=library');await expect(page.getByTestId('library-save-status')).toHaveText('임시 보관됨');const before=await local(page);await onlineReady(page);await openRemote(page);await expect.poll(()=>started).toBe(true);await page.keyboard.press('Escape');
 await page.locator('[data-account-menu]>summary').click();await page.getByRole('button',{name:'로그아웃',exact:true}).click();await expect(page.getByText('로그인 전',{exact:true})).toBeVisible();const response=page.waitForResponse(`**/api/v1/documents/${recordId}`);release();await(await response).finished();await afterFrame(page);
 expect((await local(page)).document.project).toEqual(before.document.project);expect(Object.keys((await local(page)).works)).toEqual(Object.keys(before.works));await expect(library(page)).toBeVisible();
});
test('revision conflicts keep the local original and offer comparison without force overwrite',async({page})=>{
 await onlineHarness(page);let writes=0;await page.route(`**/api/v1/documents/${recordId}`,route=>{if(route.request().method()==='PUT'){writes++;return route.fulfill({status:409,json:{success:false,error:{code:'REVISION_CONFLICT',actualRevision:2}}});}return route.fallback();});
 await page.goto('/?view=library');await createLocal(page,'충돌 원고');await returnToLibrary(page);const before=await local(page),focus=await upload(page,'충돌 원고');await expect(focus.getByRole('status')).toContainText('업로드했어요');
 await focus.getByRole('button',{name:'다시 업로드',exact:true}).click();await expect(focus.getByRole('alert')).toContainText('다른 곳에서 수정');expect(writes).toBe(1);expect((await local(page)).document.project).toEqual(before.document.project);await expect(focus.getByRole('button',{name:'온라인 사본 열기',exact:true})).toBeEnabled();await expect(focus.getByRole('button',{name:'다시 업로드',exact:true})).toBeEnabled();
});
test('deleting a local work while online copy validation awaits preserves the deletion checkpoint',async({page})=>{
 await onlineHarness(page);await page.goto('/?view=library');await createLocal(page,'삭제를 유지할 개인 작품');await returnToLibrary(page);const before=await local(page);
 await page.evaluate(()=>{const target=window as unknown as {onlineValidationPaused?:boolean;releaseOnlineValidation?:()=>void};const digest=crypto.subtle.digest.bind(crypto.subtle);let count=0;crypto.subtle.digest=async(...args:Parameters<SubtleCrypto['digest']>)=>{count++;if(count===4){target.onlineValidationPaused=true;await new Promise<void>(resolve=>{target.releaseOnlineValidation=resolve;});}return digest(...args);};});
 await openRemote(page);await expect.poll(()=>page.evaluate(()=>(window as unknown as {onlineValidationPaused?:boolean}).onlineValidationPaused)).toBe(true);await page.keyboard.press('Escape');
 const focus=await focusWork(page,'삭제를 유지할 개인 작품');await focus.getByText('책 꾸미기·작품 도구',{exact:true}).click();await focus.getByRole('button',{name:'이 기기에서 삭제',exact:true}).click();await page.getByRole('dialog',{name:'내 작품 삭제 확인',exact:true}).getByRole('button',{name:'삭제 확인',exact:true}).click();await expect.poll(async()=>Object.keys((await local(page)).works).includes(before.storyId)).toBe(false);const deleted=await local(page);
 await page.evaluate(()=>(window as unknown as {releaseOnlineValidation:()=>void}).releaseOnlineValidation());await afterFrame(page);expect((await local(page)).deletedWork).toEqual(deleted.deletedWork);expect(Object.keys((await local(page)).works)).toEqual(Object.keys(deleted.works));await expect(library(page)).toBeVisible();
});
test('switching accounts hides the previous owner online titles before loading the new account',async({page})=>{
 await onlineHarness(page);let account='11111111-1111-4111-8111-111111111111';await page.route('**/api/v1/me',route=>route.fulfill({json:{success:true,data:{accountId:account,csrf:'csrf'}}}));
 await page.goto('/?view=library');await onlineReady(page);await page.getByLabel('책 분류',{exact:true}).selectOption('own');await expect(shelfCoverButton(page,'온라인에 보관한 원고')).toBeVisible();
 account='33333333-3333-4333-8333-333333333333';await page.route('**/api/v1/documents',route=>route.fulfill({json:{success:true,data:{documents:[],nextCursor:null}}}));
 await page.evaluate(()=>{const target=window as unknown as {leakedOnlineTitle?:boolean};const observer=new MutationObserver(()=>{const bar=document.querySelector('[aria-label="작품 보관 안내"]');const refresh=bar&&Array.from(bar.querySelectorAll('button')).find(button=>button.textContent==='온라인 목록 다시 확인');if(bar&&!bar.textContent?.includes('로그인 확인 중')&&refresh&&!refresh.disabled&&document.querySelector('[data-online-record]')?.textContent?.includes('온라인에 보관한 원고'))target.leakedOnlineTitle=true;});observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true});window.dispatchEvent(new Event('focus'));});
 await onlineReady(page);await expect(shelfCoverButton(page,'온라인에 보관한 원고')).toHaveCount(0);expect(await page.evaluate(()=>(window as unknown as {leakedOnlineTitle?:boolean}).leakedOnlineTitle)).not.toBe(true);await page.getByRole('button',{name:'온라인 목록 다시 확인',exact:true}).click();await onlineReady(page);await expect(shelfCoverButton(page,'온라인에 보관한 원고')).toHaveCount(0);
});
test('deleting the selected local work during online save preparation sends no request',async({page})=>{
 await onlineHarness(page);let posts=0;await page.route('**/api/v1/documents',route=>{if(route.request().method()==='POST')posts++;return route.fulfill({status:503,json:{success:false,error:{code:'SERVICE_UNAVAILABLE'}}});});
 await page.goto('/?view=library');await createLocal(page,'준비 중 삭제할 원고');await returnToLibrary(page);const before=await local(page),focus=await focusWork(page,'준비 중 삭제할 원고');
 await page.evaluate(()=>{const target=window as unknown as {savePreparationPaused?:boolean;releaseSavePreparation?:()=>void};const digest=crypto.subtle.digest.bind(crypto.subtle);let first=true;crypto.subtle.digest=async(...args:Parameters<SubtleCrypto['digest']>)=>{if(first){first=false;target.savePreparationPaused=true;await new Promise<void>(resolve=>{target.releaseSavePreparation=resolve;});}return digest(...args);};});
 await focus.getByRole('button',{name:'온라인에 업로드',exact:true}).click();await expect.poll(()=>page.evaluate(()=>(window as unknown as {savePreparationPaused?:boolean}).savePreparationPaused)).toBe(true);await page.keyboard.press('Escape');
 const deletion=await focusWork(page,'준비 중 삭제할 원고');await deletion.getByText('책 꾸미기·작품 도구',{exact:true}).click();await deletion.getByRole('button',{name:'이 기기에서 삭제',exact:true}).click();await page.getByRole('dialog',{name:'내 작품 삭제 확인',exact:true}).getByRole('button',{name:'삭제 확인',exact:true}).click();await expect.poll(async()=>Object.keys((await local(page)).works).includes(before.storyId)).toBe(false);const deleted=await local(page);
 await page.evaluate(()=>(window as unknown as {releaseSavePreparation:()=>void}).releaseSavePreparation());await onlineReady(page);expect(posts).toBe(0);expect((await local(page)).deletedWork).toEqual(deleted.deletedWork);expect(Object.keys((await local(page)).works)).toEqual(Object.keys(deleted.works));await expect(page.locator('[aria-label="작품 보관 안내"]').getByRole('status').filter({hasText:'업로드했어요'})).toHaveCount(0);
});
test('stale account expectation rejects an online list without changing device manuscripts',async({page})=>{
 await onlineHarness(page);let expected='';await page.route('**/api/v1/documents',route=>{expected=route.request().headers()['x-knolstory-account-id']??'';return route.fulfill({status:409,json:{success:false,error:{code:'ACCOUNT_SESSION_CHANGED'}}});});
 await page.goto('/?view=library');await expect(page.getByTestId('library-save-status')).toHaveText('임시 보관됨');const before=await local(page);await onlineReady(page);await page.getByRole('button',{name:'온라인 목록 다시 확인',exact:true}).click();
 await expect(page.locator('[aria-label="작품 보관 안내"]').getByRole('alert')).toContainText('로그인 계정이 바뀌었어요');expect(expected).toBe('11111111-1111-4111-8111-111111111111');expect((await local(page)).document.project).toEqual(before.document.project);expect(Object.keys((await local(page)).works)).toEqual(Object.keys(before.works));
});
test('account menu session recheck recovers online shelf after initial service failure',async({page})=>{
 await onlineHarness(page);let available=false,failedReads=0,listReads=0;
 await page.route('**/api/v1/me',route=>{if(!available){failedReads++;return route.fulfill({status:503,json:{success:false,error:{code:'SERVICE_UNAVAILABLE'}}});}return route.fulfill({json:{success:true,data:{accountId:'11111111-1111-4111-8111-111111111111',csrf:'csrf'}}});});
 await page.route('**/api/v1/documents',route=>{listReads++;return route.fallback();});
 await page.goto('/?view=library');await expect(page.getByTestId('library-save-status')).toHaveText('임시 보관됨');const before=await local(page);await expect(page.locator('[aria-label="작품 보관 안내"]')).toContainText('계정 서비스를 확인하지 못했어요');
 // The shared session now performs one initial account read rather than two independent menu reads.
 await expect.poll(()=>failedReads).toBeGreaterThanOrEqual(1);expect(listReads).toBe(0);await page.locator('[data-account-menu]>summary').click();await expect(page.getByText('로그인 상태 확인 필요',{exact:true})).toBeVisible();available=true;
 await page.getByRole('button',{name:'로그인 상태 다시 확인',exact:true}).click();await expect(page.getByText('로그인됨',{exact:true})).toBeVisible();await page.keyboard.press('Escape');await onlineReady(page);await page.getByLabel('책 분류',{exact:true}).selectOption('own');await expect(shelfCoverButton(page,'온라인에 보관한 원고')).toBeVisible();expect(listReads).toBe(1);expect((await local(page)).document.project).toEqual(before.document.project);expect((await local(page)).works).toEqual(before.works);
});
for(const logoutFailure of [false,true])test(`session recheck during delayed logout cannot retain a revoked session ${logoutFailure?'response failure':'success'}`,async({page})=>{
 await onlineHarness(page);let signedIn=true,started=false,release:()=>void=()=>{};const gate=new Promise<void>(resolve=>{release=resolve;});
 await page.route('**/api/v1/me',route=>route.fulfill(signedIn?{json:{success:true,data:{accountId:'11111111-1111-4111-8111-111111111111',csrf:'csrf'}}}:{status:401,json:{success:false,error:{code:'SESSION_REQUIRED'}}}));
 await page.route('**/api/v1/auth/logout',async route=>{started=true;await gate;signedIn=false;await route.fulfill(logoutFailure?{status:503,json:{success:false,error:{code:'SERVICE_UNAVAILABLE'}}}:{json:{success:true,data:{loggedOut:true}}});});
 await page.goto('/?view=library');await expect(page.getByTestId('library-save-status')).toHaveText('임시 보관됨');const before=await local(page);await onlineReady(page);await page.locator('[data-account-menu]>summary').click();await page.getByRole('button',{name:'로그아웃',exact:true}).click();await expect.poll(()=>started).toBe(true);
 // A single shared session disables competing rechecks while its logout is unresolved.
 await expect(page.getByRole('button',{name:'로그인 상태 다시 확인',exact:true})).toBeDisabled();release();
 if(logoutFailure){await expect(page.locator('[data-account-menu]').getByRole('alert')).toContainText('로그아웃을 확인하지 못했어요');await page.getByRole('button',{name:'로그인 상태 다시 확인',exact:true}).click();}
 await expect(page.getByText('로그인 전',{exact:true})).toBeVisible();await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'온라인 목록 다시 확인',exact:true})).toHaveCount(0);await expect(page.locator('[aria-label="작품 보관 안내"]')).toContainText('작품은 이 기기에 저장돼요.');expect((await local(page)).works).toEqual(before.works);
});
test('logout completion updates newly mounted menus after leaving and returning to the library',async({page})=>{
 await onlineHarness(page);let signedIn=true,started=false,release:()=>void=()=>{};const gate=new Promise<void>(resolve=>{release=resolve;});
 await page.route('**/api/v1/me',route=>route.fulfill(signedIn?{json:{success:true,data:{accountId:'11111111-1111-4111-8111-111111111111',csrf:'csrf'}}}:{status:401,json:{success:false,error:{code:'SESSION_REQUIRED'}}}));
 await page.route('**/api/v1/auth/logout',async route=>{started=true;await gate;signedIn=false;await route.fulfill({json:{success:true,data:{loggedOut:true}}});});
 await page.goto('/?view=library');await onlineReady(page);await page.locator('[data-account-menu]>summary').click();await page.getByRole('button',{name:'로그아웃',exact:true}).click();await expect.poll(()=>started).toBe(true);await page.keyboard.press('Escape');await createLocal(page,'로그아웃 중에도 남는 원고');await expect(page.locator('[data-account-menu]')).toHaveCount(0);await returnToLibrary(page);const before=await local(page);release();await expect(page.getByRole('button',{name:'온라인 목록 다시 확인',exact:true})).toHaveCount(0);await expect(page.locator('[aria-label="작품 보관 안내"]')).toContainText('작품은 이 기기에 저장돼요.');
 const after=await local(page);expect(Object.keys(after.works)).toEqual(Object.keys(before.works));for(const key of Object.keys(before.works))expect(after.works[key].project).toEqual(before.works[key].project);expect((await local(page)).document.project).toEqual(before.document.project);
});
