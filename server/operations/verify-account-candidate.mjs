/** Isolated Next candidate only: real HTTP/DB, synthetic sessions, no live OAuth. */
import {randomUUID,randomBytes,createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium,expect} from '@playwright/test';
const origin='http://127.0.0.1:15401',output='docs/architecture/evidence/account-api-candidate-2026-10-16';
const run=randomUUID(),accounts=[randomUUID(),randomUUID()],sessions=[],createdAccounts=[];
const sql=value=>execFileSync('docker',['exec','-i','knolstory-next-storage-test-db-1','psql','-U','knolstory_next_storage_test','-d','knolstory_next_storage_test','-v','ON_ERROR_STOP=1','-q'],{input:value,stdio:['pipe','pipe','pipe']});
// Every interpolated SQL primitive below is generated UUID/hash/integer, never user input.

function session(accountId){const token=randomBytes(32).toString('base64url'),hash=createHash('sha256').update(token).digest('hex');sql(`INSERT INTO knolstory_auth.sessions(token_hash,account_id,expires_at) VALUES('${hash}','${accountId}',${Date.now()+600000});`);const value={token,hash};sessions.push(value);return value;}
let browser,primaryFailure;
try{
 for(const id of accounts){sql(`INSERT INTO knolstory_auth.accounts(id,status) VALUES('${id}','active');`);createdAccounts.push(id);}
 const first=session(accounts[0]),second=session(accounts[1]);
 browser=await chromium.launch();
 const context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage(),pageErrors=[];
 page.setDefaultTimeout(15000);page.on('pageerror',error=>pageErrors.push(error.message));
 const cookie=token=>context.addCookies([{name:'knolstory-next-session',value:token,url:origin,httpOnly:true,sameSite:'Lax'}]);
 const local=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-shortstory-library-v1')));
 const journals=()=>page.evaluate(()=>Object.fromEntries(Object.keys(localStorage).filter(key=>key.startsWith('knolstory-online-work-v1:')).map(key=>[key,JSON.parse(localStorage.getItem(key))])));
 const panel=page.locator('[data-online-works]');
 const openPanel=async()=>{if(!await panel.evaluate(node=>node.open))await panel.locator('summary').click();};
 const refresh=async()=>{await openPanel();await panel.getByRole('button',{name:'로그인 상태 다시 확인',exact:true}).click();await expect(panel.getByRole('button',{name:'목록 새로고침',exact:true})).toBeEnabled();};
 const save=async method=>{await openPanel();const state=await local();await panel.getByLabel('온라인에 보관할 기기 작품').selectOption(`shortstory:${state.activeId}`);const response=page.waitForResponse(r=>new URL(r.url()).pathname.startsWith('/api/v1/documents')&&r.request().method()===method);await panel.getByRole('button',{name:'선택한 작품 온라인에 보관',exact:true}).click();return response;};
 const read=async(id,expected)=>{const response=await context.request.get(origin+'/api/v1/documents'+(id?'/'+id:''),{headers:{'x-knolstory-account-id':expected}});return {status:response.status(),body:await response.json()};};
 await cookie(first.token);await page.goto(origin+'/shortstory');await page.getByLabel('이야기 제목',{exact:true}).fill('계정 경계 실제 후보 '+run);await page.getByRole('textbox',{name:'이 쪽의 이야기',exact:true}).fill('두 계정과 세션 재시도에서도 보존할 원고');await page.getByRole('button',{name:'이 기기에 저장',exact:true}).click();
 const before=await local(),created=await save('POST');expect(created.status()).toBe(201);const recordA=(await created.json()).data;await expect(panel.getByRole('status')).toContainText('보관했어요');
 const initialBody=created.request().postDataJSON();expect(created.request().headers()['x-knolstory-account-id']).toBe(accounts[0]);
 // Change the real cookie without a UI session refresh, reproducing a stale consumer.
 await cookie(second.token);const listed=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/v1/documents'&&r.request().method()==='GET');await panel.getByRole('button',{name:'목록 새로고침',exact:true}).click();const deniedList=await listed;expect(deniedList.status()).toBe(409);expect((await deniedList.json()).error.code).toBe('ACCOUNT_SESSION_CHANGED');await expect(panel.getByRole('alert')).toContainText('로그인 계정이 바뀌었어요');
 const deniedRead=await read(recordA.recordId,accounts[0]);expect(deniedRead).toEqual({status:409,body:{success:false,error:{code:'ACCOUNT_SESSION_CHANGED'}}});
 const me=await(await context.request.get(origin+'/api/v1/me')).json();expect(me.data.accountId).toBe(accounts[1]);
 const deniedWrite=await context.request.post(origin+'/api/v1/documents',{headers:{origin,'x-csrf-token':me.data.csrf,'x-knolstory-account-id':accounts[0],'idempotency-key':randomUUID()},data:initialBody});expect(deniedWrite.status()).toBe(409);expect((await deniedWrite.json()).error.code).toBe('ACCOUNT_SESSION_CHANGED');expect((await read(undefined,accounts[1])).body.data.documents).toEqual([]);expect((await local()).books).toEqual(before.books);
 // Explicit recheck changes the displayed account. Its binding stays independent.
 await refresh();const otherCreated=await save('POST');expect(otherCreated.status()).toBe(201);const recordB=(await otherCreated.json()).data;expect(recordB.recordId).not.toBe(recordA.recordId);await expect(panel.getByRole('status')).toContainText('보관했어요');
 const linked=Object.values(await journals());expect(linked).toHaveLength(2);expect(linked.map(value=>value.binding.recordId).sort()).toEqual([recordA.recordId,recordB.recordId].sort());
 await cookie(first.token);await refresh();const updated=await save('PUT');expect(updated.status()).toBe(200);expect((await updated.json()).data).toMatchObject({recordId:recordA.recordId,revision:2});await expect(panel.getByRole('status')).toContainText('보관했어요');
 // A real revoked session rejects before saving. Reauthentication uses a fresh token.
 sql(`UPDATE knolstory_auth.sessions SET revoked=true WHERE token_hash='${first.hash}';`);
 const rejected=await save('PUT');expect(rejected.status()).toBe(401);await expect(panel.getByRole('alert')).toContainText('로그인을 다시 확인');const rejectedBody=rejected.request().postData(),rejectedKey=rejected.request().headers()['idempotency-key'];
 const renewed=session(accounts[0]);await cookie(renewed.token);await refresh();const retry=await save('PUT');expect(retry.status()).toBe(200);expect(retry.request().postData()).toBe(rejectedBody);expect(retry.request().headers()['idempotency-key']).toBe(rejectedKey);expect(retry.request().headers()['x-csrf-token']).not.toBe(rejected.request().headers()['x-csrf-token']);expect((await retry.json()).data).toMatchObject({recordId:recordA.recordId,revision:3});await expect(panel.getByRole('status')).toContainText('보관했어요');expect((await local()).books).toEqual(before.books);
 await cookie(second.token);const otherRemote=await read(recordB.recordId,accounts[1]);expect(otherRemote.status).toBe(200);expect(otherRemote.body.data.revision).toBe(1);
 await refresh();await page.keyboard.press('Escape');await page.locator('[data-account-menu]>summary').click();await page.getByRole('button',{name:'로그아웃',exact:true}).click();await expect(page.getByText('로그인 전',{exact:true})).toBeVisible();await page.keyboard.press('Escape');await openPanel();await expect(panel).toContainText('계정 메뉴에서 로그인한 뒤 이용할 수 있어요.');expect((await local()).books).toEqual(before.books);expect(pageErrors).toEqual([]);
 await mkdir(output,{recursive:true});await writeFile(`${output}/actual-${run}.json`,JSON.stringify({origin,scope:'New static Web + gateway + rebuilt Docker API/PostgreSQL; real synthetic sessions and cookie changes. No mocked requests, no live OAuth.',create201:true,staleAccountList409:true,staleAccountRead409:true,staleAccountWrite409WithCurrentCsrf:true,otherAccountEmptyBeforeExplicitSave:true,accountBindingsIsolated:true,originalAccountUpdateRevision:2,actualRevokedSession401:true,exactPendingRetryWithRenewedCsrf:true,finalRevision:3,otherAccountRevision:1,logoutPropagated:true,localBooksPreserved:true,pageErrors},null,2)+'\n',{flag:'wx'});console.log('Actual candidate account pinning, session recheck, exact retry and local preservation passed.');
}catch(error){primaryFailure=error;throw error;}finally{
 const failures=[];
 try{await browser?.close();}catch{failures.push(Error('Synthetic browser cleanup failed.'));}
 for(const value of sessions){try{sql(`UPDATE knolstory_auth.sessions SET revoked=true WHERE token_hash='${value.hash}';`);}catch{failures.push(Error('Synthetic session cleanup failed.'));}}
 for(const id of createdAccounts){try{sql(`UPDATE knolstory_auth.accounts SET status='inactive' WHERE id='${id}';`);}catch{failures.push(Error('Synthetic account cleanup failed.'));}}
 if(failures.length)throw new AggregateError([...(primaryFailure?[primaryFailure]:[]),...failures],'Candidate verification cleanup incomplete.');
}
