/** Actual loopback HTTP + isolated Next PostgreSQL only. No production or live OAuth. */
import {randomUUID,randomBytes,createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {chromium,expect} from '@playwright/test';
const origin='http://127.0.0.1:15401',output='docs/architecture/evidence/online-trash-combined-2026-10-20';
const run=process.env.KNOLSTORY_EVIDENCE_RUN??new Date().toISOString().replace(/[:.]/g,'-');
if(!/^[A-Za-z0-9_-]{1,80}$/.test(run))throw Error('Invalid evidence run.');
const directory=`${output}/${run}`;await mkdir(output,{recursive:true});await mkdir(directory);
const sql=text=>execFileSync('docker',['exec','-i','knolstory-next-storage-test-db-1','psql','-U','knolstory_next_storage_test','-d','knolstory_next_storage_test','-v','ON_ERROR_STOP=1','-q','-tA'],{input:text,stdio:['pipe','pipe','pipe']}).toString().trim();
const version=Number(sql('SELECT max(version) FROM knolstory_storage.migrations;'));
if(!Number.isSafeInteger(version)||version<7)throw Error('Isolated test DB must already have the trash migration.');
const config=await(await fetch(origin+'/api/v1/auth/config')).json();
if(config.data?.providers?.kakao!==false||config.data?.providers?.google!==false)throw Error('Expected isolated API with live providers disabled.');
const account=randomUUID(),token=randomBytes(32).toString('base64url'),hash=createHash('sha256').update(token).digest('hex');
// Only generated UUID/hash/integer values reach SQL. No credentials or author data read.
sql(`BEGIN; INSERT INTO knolstory_auth.accounts(id,status) VALUES('${account}','active'); INSERT INTO knolstory_auth.sessions(token_hash,account_id,expires_at) VALUES('${hash}','${account}',${Date.now()+600000}); COMMIT;`);
let browser;const results=[];
try{
 browser=await chromium.launch();
 for(const format of ['knolstory','shortstory']){
  const context=await browser.newContext({viewport:{width:390,height:844}});
  try{
   await context.addInitScript(()=>Object.defineProperty(window,'showSaveFilePicker',{configurable:true,value:undefined}));
   await context.addCookies([{name:'knolstory-next-session',value:token,url:origin,httpOnly:true,sameSite:'Lax'}]);
   const page=await context.newPage();page.setDefaultTimeout(20000);await page.goto(origin+(format==='knolstory'?'/?view=editor':'/shortstory'));
   if(format==='knolstory'){
    await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
    await page.locator('[data-work-menu]>summary').click();
    const project=JSON.parse(await readFile('tests/fixtures/stories/presentation-polish.json','utf8'));project.id=randomUUID();project.title='실제 휴지통 결합 검사';
    await page.getByLabel('작품 파일 가져오기',{exact:true}).setInputFiles({name:'trash.knolstory',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({documentType:'story-maker-project',schemaVersion:7,savedAt:'2026-10-20T00:00:00.000Z',appVersion:'test',project}))});
    await page.getByRole('dialog',{name:'작품 가져오기 확인',exact:true}).getByRole('button',{name:'내 사본으로 가져오기',exact:true}).click();await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
    const menu=page.locator('[data-work-menu]');if(!await menu.evaluate(node=>node.open))await menu.locator(':scope>summary').click();await page.getByRole('button',{name:'서재로',exact:true}).click();
   }else{
    await page.getByLabel('이야기 제목',{exact:true}).fill('실제 휴지통 그림책 검사');await page.getByLabel('이 쪽의 이야기',{exact:true}).fill('온라인 휴지통과 별개로 유지할 한글 원고');
   }
   const local=()=>page.evaluate(format=>{const key=format==='knolstory'?'knolstory-next-workspace-v1':'knolstory-shortstory-library-v1',value=JSON.parse(localStorage.getItem(key));return format==='knolstory'?{project:value.document.project,works:Object.fromEntries(Object.entries(value.works).map(([key,document])=>{const {savedAt:_savedAt,...content}=document;return [key,content];})),selected:value.storyId}:{books:value.books,activeId:value.activeId,selected:'shortstory:'+value.activeId};},format);
   const before=await local();await page.locator('[data-online-works]>summary').click();const panel=page.getByRole('region',{name:'온라인 작품',exact:true});
   await expect(panel.getByRole('button',{name:'목록 새로고침',exact:true})).toBeEnabled();await panel.getByLabel('온라인에 업로드할 기기 작품',{exact:true}).selectOption(before.selected);
   await context.setOffline(true);
   await panel.getByRole('button',{name:'선택한 작품 업로드',exact:true}).click();await expect(panel.getByRole('alert')).toBeVisible();expect(await local()).toEqual(before);
   await page.locator('[data-online-works]>summary').click();
   const downloaded=page.waitForEvent('download',{timeout:60000});void downloaded.catch(()=>{});
   if(format==='knolstory'){
    await page.getByLabel('책 분류',{exact:true}).selectOption('imported');await page.getByRole('button',{name:/^실제 휴지통 결합 검사 책 표지와 소개 보기/}).click();
    const book=page.getByRole('dialog');await book.getByText('책 꾸미기·작품 도구',{exact:true}).click();await book.getByRole('button',{name:'작품 파일 내보내기',exact:true}).click();await page.screenshot({path:directory+'/'+format+'-offline-export.png',fullPage:true});await writeFile(directory+'/'+format+'-offline-status.txt',await page.locator('body').innerText());
   }else {await page.locator('[data-local-file-actions]').getByRole('button',{name:'작품 파일 저장',exact:true}).click();}
   const file=await downloaded,archive=JSON.parse(await readFile(await file.path(),'utf8'));
   expect(archive.format).toBe(format);const savedProject=format==='knolstory'?archive.document.project:archive.project;
   expect(savedProject).toEqual(format==='knolstory'?before.project:before.books.find(book=>book.id===before.activeId));
   await context.setOffline(false);
   if(await page.getByRole('dialog').count()&&await page.getByRole('dialog').isVisible())await page.keyboard.press('Escape');
   const online=page.locator('[data-online-works]');if(!await online.evaluate(node=>node.open))await online.locator(':scope>summary').click();
   const created=page.waitForResponse(response=>response.url()===origin+'/api/v1/documents'&&response.request().method()==='POST');await panel.getByRole('button',{name:'선택한 작품 업로드',exact:true}).click();const response=await created,receipt=(await response.json()).data;
   expect(response.status()).toBe(201);await expect(panel.getByRole('status').filter({hasText:'업로드했어요'})).toBeVisible();await panel.getByRole('button',{name:'목록 새로고침',exact:true}).click();
   const remote=async()=>page.evaluate(async id=>{const response=await fetch('/api/v1/documents/'+id);return {status:response.status,body:await response.json()};},receipt.recordId);
   const original=await remote();expect(original.status).toBe(200);
   const record=panel.locator('li').filter({hasText:original.body.data.title}).last();
   await record.getByRole('button',{name:/온라인 휴지통으로 이동$/}).click();const confirmation=panel.getByRole('group',{name:'온라인 휴지통 이동 확인',exact:true});await confirmation.getByRole('button',{name:'취소',exact:true}).click();expect((await remote()).status).toBe(200);
   await record.getByRole('button',{name:/온라인 휴지통으로 이동$/}).click();
   const requests=[];let lostResponse=false,committedStatus;
   await page.route('**/api/v1/documents/'+receipt.recordId+'/trash',async route=>{
    const request=route.request();requests.push({key:request.headers()['idempotency-key'],body:request.postDataJSON()});
    const upstream=await route.fetch();
    if(!lostResponse){lostResponse=true;committedStatus=upstream.status();await route.abort('failed');}
    else await route.fulfill({response:upstream});
   });
   await confirmation.getByRole('button',{name:'확인하고 온라인 휴지통으로 이동',exact:true}).click();
   await expect(panel.getByRole('alert')).toBeVisible();expect(committedStatus).toBe(200);expect((await remote()).status).toBe(409);
   const trashed=page.waitForResponse(r=>r.url().endsWith('/'+receipt.recordId+'/trash')&&r.request().method()==='POST');
   await confirmation.getByRole('button',{name:'확인하고 온라인 휴지통으로 이동',exact:true}).click();
   const retried=await trashed;expect(retried.status()).toBe(200);expect((await retried.json()).data.replayed).toBe(true);expect(requests).toHaveLength(2);expect(requests[1]).toEqual(requests[0]);
   await expect(panel.getByRole('status').filter({hasText:'이전에 보낸 요청의 처리를 확인했어요'})).toBeVisible();
   const denied=await remote();expect(denied.status).toBe(409);expect(denied.body.error.code).toBe('DOCUMENT_TRASHED');
   await panel.getByRole('button',{name:'온라인 휴지통',exact:true}).click();const restoreResponse=page.waitForResponse(r=>r.url().endsWith('/'+receipt.recordId+'/restore')&&r.request().method()==='POST');await panel.getByRole('button',{name:original.body.data.title+' · 온라인 작품 복구',exact:true}).click();expect((await restoreResponse).status()).toBe(200);
   await expect(panel.getByRole('status').filter({hasText:'같은 온라인 작품과 이력'})).toBeVisible();const restored=await remote();expect(restored.status).toBe(200);expect(restored.body.data.recordId).toBe(receipt.recordId);expect(restored.body.data.revision).toBe(original.body.data.revision);expect(restored.body.data.snapshot).toEqual(original.body.data.snapshot);expect(restored.body.data.stateVersion).toBe(original.body.data.stateVersion+2);expect(await local()).toEqual(before);
   await page.screenshot({path:`${directory}/${format}-restored.png`,fullPage:true});
   await panel.getByRole('button',{name:'업로드한 작품',exact:true}).click();
   await panel.getByRole('button',{name:original.body.data.title+' · 기기에 사본으로 열기',exact:true}).click();
   await expect.poll(async()=>{const value=await local();return format==='knolstory'?value.project.id!==before.project.id:value.activeId!==before.activeId;}).toBe(true);
   const opened=await local(),copy=format==='knolstory'?opened.project:opened.books.find(book=>book.id===opened.activeId),originalProject=format==='knolstory'?restored.body.data.snapshot.content.document.project:restored.body.data.snapshot.content.project;
   expect(copy).toEqual({...originalProject,id:copy.id});
   if(format==='knolstory'){for(const [key,document] of Object.entries(before.works))expect(opened.works[key]).toEqual(document);}
   else for(const book of before.books)expect(opened.books.find(value=>value.id===book.id)).toEqual(book);
   results.push({format,recordId:receipt.recordId,create:201,trash:200,restore:200,revision:restored.body.data.revision,stateVersion:restored.body.data.stateVersion,snapshotUnchanged:true,trashedReadDenied:409,responseLossRetrySameKey:true,offlineUploadFailurePreservesLocal:true,offlineFileDownloadMatchesProject:true,restoredOnlineCopyExact:true,previousLocalWorksPreserved:true,localUnchangedBeforeCopy:true});
  }finally{await context.close();}
 }
 await writeFile(`${directory}/result.json`,JSON.stringify({scope:'Actual static Web + loopback gateway + dedicated test API/PostgreSQL. Real upstream HTTP throughout; first trash response deliberately dropped after server commit, then exact retry. Bounded browser offline file save. No live OAuth.',results},null,2)+'\n');console.log('Actual browser/API/PostgreSQL trash/restore passed for both formats.');
}finally{
 try{await browser?.close();}finally{sql(`BEGIN; UPDATE knolstory_auth.sessions SET revoked=true WHERE token_hash='${hash}'; UPDATE knolstory_auth.accounts SET status='inactive' WHERE id='${account}'; COMMIT;`);const cleaned=sql(`SELECT status='inactive' AND NOT EXISTS(SELECT 1 FROM knolstory_auth.sessions WHERE account_id='${account}' AND revoked=false) FROM knolstory_auth.accounts WHERE id='${account}';`);if(cleaned!=='t')throw Error('Test session cleanup not confirmed.');await writeFile(directory+'/cleanup.json',JSON.stringify({testAccountInactive:true,testSessionsRevoked:true})+'\n');}
}
