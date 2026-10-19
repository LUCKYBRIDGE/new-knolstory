import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {exportStoryTable,serializeTableTsv} from '../../packages/compatibility/src/story-table';
import type {Route} from '@playwright/test';
for(const width of [1440,768,390,844])test(`work menu groups purpose without extra steps ${width}`,async({page},info)=>{
 await page.setViewportSize({width,height:width===844?390:900});await page.goto('/?view=editor');await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');const text=page.getByLabel('대사 / 해설',{exact:true}),original=await text.inputValue();const menu=page.locator('[data-work-menu]');await menu.locator(':scope>summary').click();const settings=menu.getByRole('group',{name:'작품 설정',exact:true}),files=menu.getByRole('group',{name:'파일·저장',exact:true});await expect(settings.getByRole('button',{name:'작품 정보·표지',exact:true})).toBeVisible();await expect(files.getByRole('button',{name:'작품 파일 내보내기',exact:true})).toBeVisible();await expect(files.getByText('기기 저장은 이 브라우저에, 작품 파일은 다른 기기로 옮기거나 따로 보관할 때 사용해요.',{exact:true})).toBeVisible();await expect(files.getByText('다른 작품 파일을 확인한 뒤 내 사본으로 엽니다. 현재 원고는 먼저 저장합니다.',{exact:true})).toBeVisible();await expect(menu.getByRole('button',{name:'새 작품 생성',exact:true})).toHaveCount(0);await expect(menu.getByRole('button',{name:'임시 보관',exact:true})).toHaveText('기기에 저장');expect(await menu.locator(':scope>div').evaluate(node=>{const r=node.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth;})).toBe(true);await page.screenshot({path:info.outputPath(`purpose-menu-${width}.png`),fullPage:true});await menu.locator(':scope>summary').click();await expect(text).toHaveValue(original);
});
test('import confirms independent work and preserves original when saving fails',async({page})=>{
 await page.goto('/?view=editor');await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');const text=page.getByLabel('대사 / 해설',{exact:true});await text.fill('가져오기 전 현재 원고를 보존한다.');await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');await page.locator('[data-work-menu]>summary').click();const pending=page.waitForEvent('download');await page.getByRole('button',{name:'작품 파일 내보내기',exact:true}).click();const file=await pending;const archive=JSON.parse(readFileSync((await file.path())!,'utf8'));archive.document.project.title='다른 파일에서 가져온 작품';await page.getByLabel('작품 파일 가져오기',{exact:true}).setInputFiles({name:'independent.knolstory',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(archive))});const dialog=page.getByRole('dialog',{name:'작품 가져오기 확인',exact:true});await expect(dialog).toBeVisible();await text.dispatchEvent('compositionstart');await dialog.getByRole('button',{name:'내 사본으로 가져오기',exact:true}).click();await expect(dialog).toBeVisible();await expect(dialog.getByRole('alert')).toContainText('한글 입력을 마친 뒤');await text.dispatchEvent('compositionend');const original=await page.evaluateHandle(()=>Storage.prototype.setItem);await page.evaluate(()=>{Storage.prototype.setItem=function(){throw new DOMException('test quota','QuotaExceededError');};});await dialog.getByRole('button',{name:'내 사본으로 가져오기',exact:true}).click();await expect(dialog).toBeVisible();await expect(text).toHaveValue('가져오기 전 현재 원고를 보존한다.');await expect(dialog.getByRole('alert')).toContainText('현재 원고를 저장하지 못해');await page.evaluate(fn=>{Storage.prototype.setItem=fn;},original);await dialog.getByRole('button',{name:'내 사본으로 가져오기',exact:true}).click();await expect(dialog).toHaveCount(0);await expect(page.getByRole('heading',{name:'다른 파일에서 가져온 작품',exact:true})).toBeVisible();await expect(text).toHaveValue('가져오기 전 현재 원고를 보존한다.');await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');await page.reload();await expect(text).toHaveValue('가져오기 전 현재 원고를 보존한다.');await expect(page.getByRole('heading',{name:'다른 파일에서 가져온 작품',exact:true})).toBeVisible();
});

for(const fail of [false,true])test(`public sheet import uses current edits and save guard ${fail}`,async({page})=>{
 await page.goto('/?view=editor');
 await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 const text=page.getByLabel('대사 / 해설',{exact:true}),menu=page.locator('[data-work-menu]');
 const openMenu=async()=>{if(!await menu.evaluate(node=>(node as HTMLDetailsElement).open))await menu.locator(':scope>summary').click();};
 await openMenu();const pending=page.waitForEvent('download');
 await page.getByRole('button',{name:'작품 파일 내보내기',exact:true}).click();
 const archive=JSON.parse(readFileSync((await(await pending).path())!,'utf8'));
 const originalId=archive.document.project.id;
 archive.document.project.title='공개 시트에서 가져온 작품';
 const audio=readFileSync('apps/web/public/assets/audio/forest.wav'),audioId=`audio:custom:${createHash('sha256').update(audio).digest('hex')}:wav`;
 const resource={id:audioId,name:'시트 첨부.wav',mime:'audio/wav',data:audio.toString('base64'),kind:'music'};
 const forbiddenBody=serializeTableTsv(exportStoryTable(archive.document,[resource]));
 const body=serializeTableTsv(exportStoryTable(archive.document,[]));
 let waiting:Route|undefined;
 await page.route('https://docs.google.com/spreadsheets/d/menu-purpose/export?*',route=>{waiting=route;});
 await openMenu();await page.getByText('Excel · Google 시트',{exact:true}).click();
 await page.getByText('간단 표 v1 · 공개 시트',{exact:true}).click();
 await page.getByLabel('공개 Google 시트 주소',{exact:true}).fill('https://docs.google.com/spreadsheets/d/menu-purpose/edit');
 const requestSheet=async()=>{waiting=undefined;await openMenu();await page.getByRole('button',{name:'Google 시트 가져오기',exact:true}).click();await expect.poll(()=>!!waiting).toBe(true);await menu.locator(':scope>summary').click();};
 const savedProject=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).document.project);
 const hasPrivateAudio=()=>page.evaluate(id=>new Promise<boolean>((resolve,reject)=>{
  const request=indexedDB.open('knolstory-audio-assets-v1',2);
  request.onsuccess=()=>{const db=request.result;const tx=db.transaction('resources','readonly');const resource=tx.objectStore('resources').get(id);tx.oncomplete=()=>{db.close();resolve(!!resource.result);};tx.onerror=()=>reject(tx.error);};request.onerror=()=>reject(request.error);
 }),audioId);
 const preview=page.getByRole('dialog',{name:'작품 가져오기 확인',exact:true});
 // A public sheet cannot introduce a new private attachment. Reject it before any preview or IDB write.
 await requestSheet();await text.fill('첨부 거부 중에도 현재 원고와 배치를 보존한다.');
 await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 const beforeRejection=await savedProject();
 await waiting!.fulfill({status:200,contentType:'text/tab-separated-values',body:forbiddenBody});
 await expect(page.getByTestId('workspace-error')).toContainText('외부 음원이 첨부된 작품');
 await expect(preview).toHaveCount(0);expect(await savedProject()).toEqual(beforeRejection);expect(await hasPrivateAudio()).toBe(false);
 // The supported limited table projection keeps the current complete document in its preservation rows.
 await requestSheet();await text.fill('시트 응답을 기다리며 고친 현재 글.');
 await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 const edited=await savedProject();
 await waiting!.fulfill({status:200,contentType:'text/tab-separated-values',body});await expect(preview).toBeVisible();
 expect(await savedProject()).toEqual(edited);expect(await hasPrivateAudio()).toBe(false);
 await preview.getByRole('button',{name:'가져오기 취소',exact:true}).click();
 await expect(preview).toHaveCount(0);await expect(text).toHaveValue('시트 응답을 기다리며 고친 현재 글.');expect(await savedProject()).toEqual(edited);
 await requestSheet();await waiting!.fulfill({status:200,contentType:'text/tab-separated-values',body});await expect(preview).toBeVisible();
 const write=await page.evaluateHandle(()=>Storage.prototype.setItem);
 if(fail)await page.evaluate(()=>{Storage.prototype.setItem=function(){throw new DOMException('test quota','QuotaExceededError');};});
 await preview.getByRole('button',{name:'내 사본으로 가져오기',exact:true}).click();
 if(fail){
  await expect(preview).toBeVisible();await expect(preview.getByRole('alert')).toContainText('현재 원고를 저장하지 못해');
  await expect(text).toHaveValue('시트 응답을 기다리며 고친 현재 글.');expect(await savedProject()).toEqual(edited);
  await expect(page.getByRole('heading',{name:'공개 시트에서 가져온 작품',exact:true})).toHaveCount(0);
  await page.evaluate(fn=>{Storage.prototype.setItem=fn;},write);
  await preview.getByRole('button',{name:'가져오기 취소',exact:true}).click();await page.reload();
  await expect(text).toHaveValue('시트 응답을 기다리며 고친 현재 글.');expect(await savedProject()).toEqual(edited);
 }else{
  await expect(page.getByRole('heading',{name:'공개 시트에서 가져온 작품',exact:true})).toBeVisible();
  await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
  const preserved=await page.evaluate(id=>Object.values(JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).works).map(document=>(document as {project:{id:string;updatedAt:string}}).project).find(project=>project.id===id)!,originalId);
  expect(preserved).toEqual({...edited,updatedAt:preserved.updatedAt});
  const imported=await savedProject();expect(imported.id).not.toBe(originalId);expect(imported).toEqual({...archive.document.project,id:imported.id});
  await page.reload();await expect(page.getByRole('heading',{name:'공개 시트에서 가져온 작품',exact:true})).toBeVisible();expect(await savedProject()).toEqual(imported);
 }
 expect(await hasPrivateAudio()).toBe(false);
});

for(const width of [1440,768,390,844])test(`one global score settings screen returns to choice editing ${width}`,async({page},info)=>{
 await page.setViewportSize({width,height:width===844?390:900});
 await page.goto('/?view=editor');await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 const text=page.getByLabel('대사 / 해설',{exact:true});await text.fill('점수 설정을 다녀와도 이 컷과 선택을 보존한다.');
 await page.locator('[data-additional-tools]>summary').click();await page.getByRole('button',{name:'선택지 편집',exact:true}).click();
 await page.getByLabel('진행 방식',{exact:true}).selectOption('choice');await page.getByLabel('선택지 1 문구',{exact:true}).fill('이웃을 돕는다');await page.getByLabel('선택지 1 도착 컷',{exact:true}).selectOption('__ending');
 const exportProject=async()=>{const menu=page.locator('[data-work-menu]');if(!await menu.evaluate(node=>(node as HTMLDetailsElement).open))await menu.locator(':scope>summary').click();const pending=page.waitForEvent('download');await menu.getByRole('button',{name:'작품 파일 내보내기',exact:true}).click();return JSON.parse(readFileSync((await (await pending).path())!,'utf8')).document.project;};
 const original=await exportProject();
 await expect(page.locator('[data-additional-panel]').getByRole('region',{name:'이야기 점수 설정',exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'이야기 점수 설정 열기',exact:true}).click();
 const settings=page.getByRole('region',{name:'작품 설정',exact:true});await expect(settings.getByLabel('작품 설정 항목')).toHaveValue('scores');
 await settings.getByLabel('새 점수 이름',{exact:true}).fill('도움 횟수');await settings.getByLabel('새 점수 설명',{exact:true}).fill('이웃을 도운 선택 수');await settings.getByRole('button',{name:'점수 만들기',exact:true}).click();
 await expect(page.getByTestId('preparation-save-status')).toHaveText('임시 보관됨');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await page.screenshot({path:info.outputPath(`global-score-settings-${width}.png`),fullPage:true});
 await settings.getByRole('button',{name:'현재 컷으로 돌아가기',exact:true}).click();
 await expect(page.getByLabel('선택지 1 문구',{exact:true})).toHaveValue('이웃을 돕는다');await expect(text).toHaveValue('점수 설정을 다녀와도 이 컷과 선택을 보존한다.');
 const saved=await exportProject();expect(saved).toEqual({...original,updatedAt:saved.updatedAt,scores:[{id:expect.any(String),name:'도움 횟수',description:'이웃을 도운 선택 수',initial:0}]});
 const menu=page.locator('[data-work-menu]');if(!await menu.evaluate(node=>(node as HTMLDetailsElement).open))await menu.locator(':scope>summary').click();await menu.getByRole('button',{name:'이야기 점수',exact:true}).click();await expect(settings.getByLabel('점수 1 이름')).toHaveValue('도움 횟수');
 await settings.getByRole('button',{name:'현재 컷으로 돌아가기',exact:true}).click();await page.reload();await expect(page.getByLabel('선택지 1 문구',{exact:true})).toHaveValue('이웃을 돕는다');
});

test('score settings return preserves editing context when composing or device saving fails',async({page})=>{
 await page.goto('/?view=editor');await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 await page.locator('[data-additional-tools]>summary').click();await page.getByRole('button',{name:'선택지 편집',exact:true}).click();await page.getByLabel('진행 방식',{exact:true}).selectOption('choice');
 await page.getByLabel('선택지 1 문구',{exact:true}).fill('돌아갈 선택지');await page.getByRole('button',{name:'이야기 점수 설정 열기',exact:true}).click();
 const settings=page.getByRole('region',{name:'작품 설정',exact:true}),name=settings.getByLabel('새 점수 이름',{exact:true}),back=settings.getByRole('button',{name:'현재 컷으로 돌아가기',exact:true});
 await name.fill('입력 중인 점수');await name.dispatchEvent('compositionstart');await expect(back).toBeDisabled();await expect(page.locator('[data-work-menu]').getByRole('button',{name:'이야기 점수',exact:true,includeHidden:true})).toBeDisabled();await name.dispatchEvent('compositionend');
 const write=await page.evaluateHandle(()=>Storage.prototype.setItem);await page.evaluate(()=>{Storage.prototype.setItem=function(){throw new DOMException('test quota','QuotaExceededError');};});
 await back.click();await expect(settings).toBeVisible();await expect(name).toHaveValue('입력 중인 점수');await expect(page.getByRole('alert').filter({hasText:'현재 원고를 저장하지 못해 컷 편집으로 돌아가지 않았어요.'})).toBeVisible();
 await page.evaluate(fn=>{Storage.prototype.setItem=fn;},write);await back.click();await expect(page.getByLabel('선택지 1 문구',{exact:true})).toHaveValue('돌아갈 선택지');await expect(page.getByRole('alert').filter({hasText:'컷 편집으로 돌아가지 않았어요.'})).toHaveCount(0);
});
