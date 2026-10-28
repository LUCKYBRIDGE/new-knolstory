import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {enterLibrary,startShelfCreation,openShelfAction} from './library-entry';
import {parseAuthoringFile} from './authoring-file';
for(const width of [1440,768,390,844])test(`new work starts writing without required settings ${width}`,async({page},info)=>{
 await page.setViewportSize({width,height:width===844?390:900});await page.goto('/');await enterLibrary(page);await startShelfCreation(page);const title=`첫 문장을 바로 쓰는 작품 ${width}`;await page.getByLabel('새 작품 제목',{exact:true}).fill(title);await page.getByRole('button',{name:'새 작품 생성',exact:true}).click();const text=page.getByLabel('대사 / 해설',{exact:true});await expect(text).toBeVisible();await expect(page.getByRole('region',{name:'작품 설정',exact:true})).toHaveCount(0);await expect(text).toHaveValue('');await expect(page.getByLabel('진행 방식',{exact:true})).toBeHidden();await expect(page.getByRole('button',{name:'소리 편집',exact:true})).toBeHidden();await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');const id=await page.getByLabel('현재 장과 컷 이동').inputValue();await text.fill('첫 문장을 바로 쓴다.\n다음 장면을 생각한다.');await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');await page.reload();await expect(text).toHaveValue('첫 문장을 바로 쓴다.\n다음 장면을 생각한다.');await expect(page.getByLabel('현재 장과 컷 이동')).toHaveValue(id);
 await page.getByRole('button',{name:'서재로',exact:true}).click();await expect(page.getByRole('main',{name:'로컬 서재',exact:true})).toBeVisible();const book=page.locator('article[data-shelf-book]').filter({has:page.getByRole('heading',{name:title,exact:true})});await openShelfAction(page,book,'편집하기');await expect(text).toHaveValue('첫 문장을 바로 쓴다.\n다음 장면을 생각한다.');await page.locator('[data-work-menu]>summary').click();const pending=page.waitForEvent('download');await page.getByRole('button',{name:'작품 파일 내보내기',exact:true}).click();const file=await pending,saved=parseAuthoringFile(readFileSync((await file.path())!,'utf8'));expect(saved.project.title).toBe(title);expect(saved.project.lines).toHaveLength(1);expect(saved.project.lines[0].id).toBe(id);expect(saved.project.lines[0].text).toBe('첫 문장을 바로 쓴다.\n다음 장면을 생각한다.');expect(saved.project.scores??[]).toHaveLength(0);expect(saved.project.creativeMemos).toHaveLength(0);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await expect.poll(async()=>{const state=page.getByTestId('story-runtime-status');return Number(await state.getAttribute('data-rendered-revision'))>=0&&(await state.getAttribute('data-rendered-revision'))===(await state.getAttribute('data-scene-revision'));},{timeout:120000}).toBe(true);await page.screenshot({path:info.outputPath(`create-writing-${width}.png`),fullPage:true});const frame=await page.getByTestId('story-runtime-frame').elementHandle();await page.getByRole('button',{name:'이 컷부터 재생',exact:true}).click();await expect(page.getByRole('button',{name:'읽기 메뉴',exact:true})).toBeVisible();await expect.poll(async()=>{const state=page.getByTestId('story-runtime-status');return Number(await state.getAttribute('data-rendered-revision'))>=0&&(await state.getAttribute('data-rendered-revision'))===(await state.getAttribute('data-scene-revision'));},{timeout:120000}).toBe(true);await page.getByRole('button',{name:'읽기 메뉴',exact:true}).click();await page.getByRole('button',{name:'이 컷 편집하기',exact:true}).click();await expect(text).toHaveValue('첫 문장을 바로 쓴다.\n다음 장면을 생각한다.');await expect(page.getByLabel('현재 장과 컷 이동')).toHaveValue(id);expect(await frame!.evaluate(node=>node===document.querySelector('[data-testid="story-runtime-frame"]'))).toBe(true);
});
test('failed creation retains the title form and original work before another work is created',async({page})=>{
 await page.goto('/');await enterLibrary(page);await startShelfCreation(page);await page.getByLabel('새 작품 제목',{exact:true}).fill('먼저 쓴 작품');await page.getByRole('button',{name:'새 작품 생성',exact:true}).click();await page.getByLabel('대사 / 해설',{exact:true}).fill('첫 작품의 원고를 보존한다.');await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');await page.getByRole('button',{name:'서재로',exact:true}).click();await startShelfCreation(page);await page.getByLabel('새 작품 제목',{exact:true}).fill('두 번째 작품');const original=await page.evaluateHandle(()=>Storage.prototype.setItem);await page.evaluate(()=>{Storage.prototype.setItem=function(){throw new DOMException('test quota','QuotaExceededError');};});await page.getByRole('button',{name:'새 작품 생성',exact:true}).click();await expect(page.getByRole('main',{name:'로컬 서재',exact:true})).toBeVisible();await expect(page.getByLabel('새 작품 제목',{exact:true})).toHaveValue('두 번째 작품');await expect(page.getByRole('main',{name:'로컬 서재',exact:true})).toContainText('새 작품을 시작하지 못했어요');await page.evaluate(fn=>{Storage.prototype.setItem=fn;},original);await page.getByRole('button',{name:'새 작품 생성',exact:true}).click();await expect(page.getByLabel('대사 / 해설',{exact:true})).toHaveValue('');await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');await page.getByRole('button',{name:'서재로',exact:true}).click();await openShelfAction(page,page.locator('article[data-shelf-book]').filter({has:page.getByRole('heading',{name:'먼저 쓴 작품',exact:true})}),'편집하기');await expect(page.getByLabel('대사 / 해설',{exact:true})).toHaveValue('첫 작품의 원고를 보존한다.');
});

test('new title composition does not create a work or dismiss the library tools',async({page},info)=>{
 test.skip(info.project.name!=='host');
 await page.addInitScript(()=>sessionStorage.setItem('knolstory-fullscreen-offered-v1','1'));
 await page.route('**/api/**',route=>route.abort());
 await page.route('**/runtime/**',route=>route.abort());
 await page.goto('/');await enterLibrary(page);await startShelfCreation(page);
 const title=page.getByLabel('새 작품 제목',{exact:true}),tools=page.getByTestId('library-tools');
 const before=await page.evaluate(()=>localStorage.getItem('knolstory-next-workspace-v1'));
 await title.fill('한글 제목');
 await title.dispatchEvent('compositionstart',{data:'목'});
 await title.press('Enter');
 await expect(title).toBeVisible();await expect(title).toHaveValue('한글 제목');await expect(title).toBeFocused();
 expect(await page.evaluate(()=>localStorage.getItem('knolstory-next-workspace-v1'))).toBe(before);
 await title.press('Escape');await expect(tools).toHaveAttribute('open','');await expect(title).toBeFocused();
 await title.dispatchEvent('keydown',{key:'Escape',code:'Escape',isComposing:true,keyCode:229});
 await expect(tools).toHaveAttribute('open','');await expect(title).toBeFocused();
 await title.dispatchEvent('compositionend',{data:'목'});
 await title.dispatchEvent('keydown',{key:'Escape',code:'Escape',keyCode:229});
 await expect(tools).toHaveAttribute('open','');
 await title.press('Escape');await expect(tools).not.toHaveAttribute('open','');await expect(tools.locator(':scope>summary')).toBeFocused();
 await tools.locator(':scope>summary').click();await expect(title).toHaveValue('한글 제목');
 await title.dispatchEvent('compositionstart',{data:'목'});
 await page.getByRole('button',{name:'취소',exact:true}).click();
 await page.getByRole('button',{name:'새 작품 만들기',exact:true}).click();await expect(title).toHaveValue('한글 제목');
 await title.press('Enter');await expect(page.locator('[data-current-cut] textarea')).toHaveValue('');
 await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 await expect(page.getByRole('heading',{name:'한글 제목',exact:true})).toBeVisible();
});

test.describe('cut creation return',()=>{
 test.use({hasTouch:true,screen:{width:390,height:844}});
for(const width of [1280,390,844])test(`adding a cut from settings returns to writing ${width}`,async({page},info)=>{
 test.skip(info.project.name!=='host');
 await page.setViewportSize({width:width===844?390:width,height:900});
 await page.addInitScript(()=>{sessionStorage.setItem('knolstory-fullscreen-offered-v1','1');Object.defineProperty(window,'showSaveFilePicker',{configurable:true,value:undefined});});
 await page.route('**/api/**',route=>route.abort());await page.route('**/runtime/**',route=>route.abort());
 await page.goto('/');await enterLibrary(page);await startShelfCreation(page);
 await page.getByLabel('새 작품 제목',{exact:true}).fill('첫 두 컷 이어 쓰기');await page.getByRole('button',{name:'새 작품 생성',exact:true}).click();
 const current=page.locator('[data-current-cut] textarea'),position=page.getByLabel('현재 장과 컷 이동',{exact:true}),menu=page.locator('[data-work-menu]');
 const firstId=await position.inputValue();await current.fill('첫 컷에서 이야기가 시작됩니다.');await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 if(width===844)await page.setViewportSize({width:844,height:390});
 await menu.locator(':scope>summary').click();const add=page.getByRole('button',{name:'현재 컷 뒤에 추가',exact:true});await add.focus();await add.press('Enter');
 await expect(menu).not.toHaveAttribute('open','');
 if(width===844){await expect(current).toHaveAttribute('readonly','');await expect(menu.locator(':scope>summary')).toBeFocused();await page.setViewportSize({width:390,height:900});await expect(current).not.toHaveAttribute('readonly','');}
 else await expect(current).toBeFocused();
 await expect(current).toHaveValue('');
 const secondId=await position.inputValue();expect(secondId).not.toBe(firstId);await current.fill('다음 컷에서도 이야기를 이어 씁니다.');
 await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 let thirdId:string|undefined,fourthId:string|undefined;
 if(width===1280){
  await menu.locator(':scope>summary').click();await page.getByRole('combobox',{name:'편집화면 선택',exact:true}).selectOption('background');
  await menu.locator(':scope>summary').click();await page.getByRole('button',{name:'현재 컷 뒤에 추가',exact:true}).click();
  await expect(menu).not.toHaveAttribute('open','');await expect(menu.locator(':scope>summary')).toBeFocused();
  await expect(page.locator('[data-editing-screen=background]')).toBeVisible();thirdId=await position.inputValue();expect(thirdId).not.toBe(secondId);
  await menu.locator(':scope>summary').click();await page.getByRole('combobox',{name:'편집화면 선택',exact:true}).selectOption('basic');
  await menu.locator(':scope>summary').click();await menu.locator('summary[aria-label="보기 설정"]').click();
  const chapterAdd=page.getByRole('button',{name:'장 추가',exact:true});await chapterAdd.focus();await chapterAdd.press('Enter');
  await expect(menu).not.toHaveAttribute('open','');await expect(current).toBeFocused();await expect(current).toHaveValue('');
  fourthId=await position.inputValue();expect(fourthId).not.toBe(thirdId);
 }
 await menu.locator(':scope>summary').click();
 const pending=page.waitForEvent('download');await page.getByRole('button',{name:'작품 파일 저장',exact:true}).click();const file=await pending;
 const project=parseAuthoringFile(readFileSync((await file.path())!,'utf8')).project;
 expect(project.lines.map(line=>({id:line.id,text:line.text}))).toEqual([{id:firstId,text:'첫 컷에서 이야기가 시작됩니다.'},{id:secondId,text:'다음 컷에서도 이야기를 이어 씁니다.'},...(thirdId?[{id:thirdId,text:''}]:[]),...(fourthId?[{id:fourthId,text:''}]:[])]);
 expect(project.chapters).toHaveLength(width===1280?2:1);
});

});
