/** Local isolated Next test DB only. No live provider credentials or legacy access. */
import {randomUUID,randomBytes,createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from '@playwright/test';
const origin='http://127.0.0.1:15401',output='docs/architecture/evidence/online-works-2026-10-16';
const run=process.env.KNOLSTORY_EVIDENCE_RUN??new Date().toISOString().replace(/[:.]/g,'-');
if(!/^[A-Za-z0-9_-]{1,80}$/.test(run))throw Error('Invalid evidence run name.');
const accountId=randomUUID(),token=randomBytes(32).toString('base64url'),tokenHash=createHash('sha256').update(token).digest('hex');
const sql=text=>execFileSync('docker',['exec','-i','knolstory-next-storage-test-db-1','psql','-U','knolstory_next_storage_test','-d','knolstory_next_storage_test','-v','ON_ERROR_STOP=1','-q'],{input:text,stdio:['pipe','pipe','pipe']});
// All SQL values below are generated UUID/hash/integer primitives, never user input.
sql(`BEGIN; INSERT INTO knolstory_auth.accounts(id,status) VALUES('${accountId}','active'); INSERT INTO knolstory_auth.sessions(token_hash,account_id,expires_at) VALUES('${tokenHash}','${accountId}',${Date.now()+600000}); COMMIT;`);
const browser=await chromium.launch();
try{
 const context=await browser.newContext({viewport:{width:1280,height:900}});
 await context.addCookies([{name:'knolstory-next-session',value:token,url:origin,httpOnly:true,sameSite:'Lax'}]);
 const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto(origin+'/?view=library');await page.getByTestId('library-save-status').filter({hasText:'기기에 저장됨'}).waitFor();
 await page.getByTestId('library-tools').locator('summary').click();await page.getByRole('button',{name:'새 작품 만들기',exact:true}).click();await page.getByLabel('새 작품 제목',{exact:true}).fill('실제 DB 온라인 보존 검사');await page.getByRole('button',{name:'새 작품 생성',exact:true}).click();
 await page.getByLabel('대사 / 해설',{exact:true}).fill('온라인 저장 후에도 보존할 원고 · 한글 😀');await page.getByTestId('save-status').filter({hasText:'기기에 저장됨'}).waitFor();
 await page.getByRole('button',{name:'서재로',exact:true}).click();
 const local=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')));
 const before=await local();
 const panel=page.locator('[data-online-works]');await panel.locator('summary').click();
 await panel.getByLabel('온라인에 보관할 기기 작품').selectOption(before.storyId);
 const createdResponse=page.waitForResponse(r=>r.url()===origin+'/api/v1/documents'&&r.request().method()==='POST');
 await panel.getByRole('button',{name:'선택한 작품 온라인에 보관',exact:true}).click();const created=await createdResponse,receipt=(await created.json()).data;
 if(created.status()!==201||receipt.revision!==1)throw Error('Create failed');
 await panel.getByRole('status').filter({hasText:'보관했어요'}).waitFor();
 await panel.getByRole('button',{name:'목록 새로고침',exact:true}).click();
 await panel.getByRole('button',{name:'실제 DB 온라인 보존 검사 · 기기에 사본으로 열기',exact:true}).click();
 await page.getByRole('region',{name:'작품 설정',exact:true}).waitFor();
 const copy=await local();
 if(copy.document.project.id===before.document.project.id||JSON.stringify(copy.works[before.storyId].project)!==JSON.stringify(before.document.project))throw Error('Independent copy or original preservation failed');
 await page.getByRole('button',{name:'서재로',exact:true}).click();await panel.locator('summary').click();
 await panel.getByLabel('온라인에 보관할 기기 작품').selectOption(copy.storyId);
 const updateResponse=page.waitForResponse(r=>r.url()===origin+'/api/v1/documents/'+receipt.recordId&&r.request().method()==='PUT');
 await panel.getByRole('button',{name:'선택한 작품 온라인에 보관',exact:true}).click();const update=await updateResponse;
 if(update.status()!==200||(await update.json()).data.revision!==2)throw Error('Bound update failed');
 await panel.getByRole('status').filter({hasText:'보관했어요'}).waitFor();
 const remote=await page.evaluate(async recordId=>{const r=await fetch('/api/v1/documents/'+recordId);return {status:r.status,body:await r.json()};},receipt.recordId);
 if(remote.status!==200||remote.body.data.snapshot.content.document.project.id!==before.document.project.id||remote.body.data.revision!==2||errors.length)throw Error('Remote identity/revision or browser failure');
 await mkdir(output,{recursive:true});await page.screenshot({path:output+`/actual-browser-${run}.png`});
 await writeFile(output+`/actual-browser-${run}.json`,JSON.stringify({origin,scope:'Actual production Web + gateway + Docker API/PostgreSQL. Dedicated synthetic session, no mocked HTTP routes and no live OAuth.',createStatus:created.status(),updateStatus:update.status(),remoteRevision:remote.body.data.revision,independentLocalCopy:true,originalProjectPreserved:true,remoteProjectIdentityPreserved:true,pageErrors:errors},null,2)+'\n');
 console.log('Actual production Web/Docker/PostgreSQL create, copy and bound update passed.');
}finally{
 await browser.close();
 sql(`BEGIN; UPDATE knolstory_auth.sessions SET revoked=true WHERE token_hash='${tokenHash}'; UPDATE knolstory_auth.accounts SET status='inactive' WHERE id='${accountId}'; COMMIT;`);
}
