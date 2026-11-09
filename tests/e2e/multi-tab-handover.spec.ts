import {test,expect,type Page} from '@playwright/test';
import {enterLibrary,openBuiltinEdition,beginSelectedBook,shelfCoverButton} from './library-entry';
import {createStoryDocument} from '../../packages/story-domain/src';
import {createBlankStoryProject} from '../../packages/runtime-core/src/authoring';
import {readFile} from 'node:fs/promises';
/** Several tabs on one browser (2026-11-01 user report): the tab in use becomes the local writer by
 * itself, adopts what the other tab saved, and no tab shows a storage warning or blocks leaving a story. */
const workspace='knolstory-next-workspace-v1',shortstory='knolstory-shortstory-library-v1';
const writer=(page:Page)=>page.locator('html');
const noTabWarning=async(page:Page)=>{await expect(page.getByText(/다른 탭에서 보관함|보관함을 사용 중/)).toHaveCount(0);};
async function use(page:Page){await page.bringToFront();await page.locator('body').dispatchEvent('pointerdown');await expect(writer(page)).toHaveAttribute('data-local-writer','owned');}
async function open(page:Page,path:string){await page.addInitScript(()=>sessionStorage.setItem('knolstory-fullscreen-offered-v1','1'));await page.route('**/api/**',route=>route.abort());await page.goto(path);}
const storedText=(page:Page,id:string)=>page.evaluate(({key,id})=>JSON.parse(localStorage.getItem(key)!).document.project.lines.find((line:{id:string})=>line.id===id)?.text,{key:workspace,id});
/** Changes the text without focus, pointer or key events, as if typed just before this tab took over. */
const setTextQuietly=(page:Page,text:string)=>page.locator('[data-current-cut] textarea').evaluate((field,value)=>{const area=field as HTMLTextAreaElement;Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value')!.set!.call(area,value);area.dispatchEvent(new Event('input',{bubbles:true}));},text);
/** Small authored work exercises checkpoint preservation independently of the bounded history store.
 * The separate oversized-work case must verify its fallback rather than assuming it fits history. */
async function openSmallWork(page:Page){
 const project=createBlankStoryProject({id:'tab-handover',chapterId:'chapter',lineId:'cut',title:'두 탭의 작품'});
 const document=createStoryDocument({project,savedAt:'2026-11-01T00:00:00.000Z',appVersion:'test'});
 await page.addInitScript(({key,document})=>{if(localStorage.getItem(key)===null)localStorage.setItem(key,JSON.stringify({document,storyId:'new:tab-handover',view:'editor',mode:'edit'}));},{key:workspace,document});
 await open(page,'/?view=editor');
}

test('a second tab reads a story and returns to the library without any storage warning',async({page,context})=>{
 await open(page,'/');await enterLibrary(page);await expect(writer(page)).toHaveAttribute('data-local-writer','owned');
 const second=await context.newPage();await open(second,'/');await enterLibrary(second);
 await expect(writer(second)).toHaveAttribute('data-local-writer','owned');await expect(writer(page)).toHaveAttribute('data-local-writer','standby');
 await openBuiltinEdition(second,'heungbu','original');await beginSelectedBook(second);
 await expect(second.getByTestId('story-runtime-frame')).toBeVisible();await noTabWarning(second);
 await second.getByRole('button',{name:'읽기 메뉴',exact:true}).click();await second.getByRole('button',{name:'서재로 돌아가기',exact:true}).click();
 await second.getByRole('dialog',{name:'서재로 돌아갈까요?',exact:true}).getByRole('button',{name:'보관하고 서재로',exact:true}).click();
 await expect(second.getByRole('main',{name:'놀스토리 서재',exact:true})).toBeVisible();await noTabWarning(second);
 // The first tab takes the writer back as soon as it is used again, also without a warning.
 await use(page);await noTabWarning(page);await expect(writer(second)).toHaveAttribute('data-local-writer','standby');
});

test('switching between two editing tabs keeps the latest text in both and in storage',async({page,context})=>{
 await open(page,'/?view=editor');await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 const field=page.locator('[data-current-cut] textarea'),id=(await field.getAttribute('data-cut-id'))!;
 await field.fill('첫 탭에서 쓴 글');await expect.poll(()=>storedText(page,id)).toBe('첫 탭에서 쓴 글');
 const second=await context.newPage();await open(second,'/?view=editor');await expect(writer(second)).toHaveAttribute('data-local-writer','owned');
 const secondField=second.locator('[data-current-cut] textarea');await expect(secondField).toHaveValue('첫 탭에서 쓴 글');await noTabWarning(second);
 await secondField.fill('둘째 탭에서 고친 글');await expect.poll(()=>storedText(second,id)).toBe('둘째 탭에서 고친 글');
 await use(page);await expect(field).toHaveValue('둘째 탭에서 고친 글');await noTabWarning(page);
 await field.fill('첫 탭에서 이어 쓴 글');await expect.poll(()=>storedText(page,id)).toBe('첫 탭에서 이어 쓴 글');await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 await use(second);await expect(secondField).toHaveValue('첫 탭에서 이어 쓴 글');await noTabWarning(second);
 await second.reload();await expect(second.locator('[data-current-cut] textarea')).toHaveValue('첫 탭에서 이어 쓴 글');
});

test('when both tabs changed the same cut, this tab keeps its text and the other version stays in previous manuscripts',async({page,context})=>{
 await openSmallWork(page);await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 const field=page.locator('[data-current-cut] textarea'),id=(await field.getAttribute('data-cut-id'))!;
 await field.fill('처음 보관한 글');await expect.poll(()=>storedText(page,id)).toBe('처음 보관한 글');
 const second=await context.newPage();await open(second,'/?view=editor');await expect(writer(second)).toHaveAttribute('data-local-writer','owned');
 await second.locator('[data-current-cut] textarea').fill('다른 탭이 보관한 글');await expect.poll(()=>storedText(second,id)).toBe('다른 탭이 보관한 글');
 await setTextQuietly(page,'이 탭에서 막 쓴 글');await expect(writer(page)).toHaveAttribute('data-local-writer','standby');
 await use(page);
 await expect(field).toHaveValue('이 탭에서 막 쓴 글');await expect.poll(()=>storedText(page,id)).toBe('이 탭에서 막 쓴 글');
 await expect(page.getByText('다른 탭에서도 이 작품을 고쳤어요',{exact:false})).toBeVisible();
 const kept=await page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-checkpoints-v1')??'[]').map((record:{document:{project:{lines:{text:string}[]}}})=>record.document.project.lines.map(line=>line.text)).flat());
 expect(kept).toContain('다른 탭이 보관한 글');
});

test('two picture-book tabs hand the writer over and keep each other’s writing',async({page,context})=>{
 await open(page,'/shortstory');await page.getByLabel('이야기 제목',{exact:true}).fill('두 탭의 그림책');await page.getByLabel('이 쪽의 이야기').fill('첫 탭의 글');
 await expect.poll(()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).books[0].pages[0].text,shortstory)).toBe('첫 탭의 글');
 const second=await context.newPage();await open(second,'/shortstory');await expect(writer(second)).toHaveAttribute('data-local-writer','owned');await noTabWarning(second);
 await expect(second.getByLabel('이 쪽의 이야기')).toHaveValue('첫 탭의 글');await second.getByLabel('이 쪽의 이야기').fill('둘째 탭이 고친 글');
 await expect.poll(()=>second.evaluate(key=>JSON.parse(localStorage.getItem(key)!).books[0].pages[0].text,shortstory)).toBe('둘째 탭이 고친 글');
 await use(page);await expect(page.getByLabel('이 쪽의 이야기')).toHaveValue('둘째 탭이 고친 글');await noTabWarning(page);
 await page.getByLabel('이 쪽의 이야기').fill('첫 탭이 이어 쓴 글');
 await expect.poll(()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).books.map((book:{pages:{text:string}[]})=>book.pages[0]!.text),shortstory)).toEqual(['첫 탭이 이어 쓴 글']);
 await use(second);await expect(second.getByLabel('이 쪽의 이야기')).toHaveValue('첫 탭이 이어 쓴 글');
});

test('a conflict too large for previous manuscripts preserves the stored work and exports this tab’s draft',async({page,context})=>{
 await page.addInitScript(()=>Object.defineProperty(window,'showSaveFilePicker',{configurable:true,value:undefined}));
 await open(page,'/?view=editor');await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 const field=page.locator('[data-current-cut] textarea'),id=(await field.getAttribute('data-cut-id'))!;
 await field.fill('긴 작품의 첫 보관');await expect.poll(()=>storedText(page,id)).toBe('긴 작품의 첫 보관');
 const second=await context.newPage();await open(second,'/?view=editor');await expect(writer(second)).toHaveAttribute('data-local-writer','owned');
 await second.locator('[data-current-cut] textarea').fill('다른 탭이 보관한 긴 작품');
 await expect.poll(()=>storedText(second,id)).toBe('다른 탭이 보관한 긴 작품');
 const incoming=await second.evaluate(key=>localStorage.getItem(key)!,workspace);
 // The provided long work exceeds the bounded 2 MiB history store. Do not erase it to make room.
 expect(JSON.stringify([JSON.parse(incoming).document]).length*2).toBeGreaterThan(2*1024*1024);
 await setTextQuietly(page,'파일로 지켜야 할 현재 탭의 초안');await useFailedTakeover(page);
 await expect(field).toHaveValue('파일로 지켜야 할 현재 탭의 초안');
 await expect(page.getByTestId('save-status')).toContainText('중지');
 expect(await page.evaluate(key=>localStorage.getItem(key),workspace)).toBe(incoming);
 await page.locator('[data-work-menu]>summary').click();
 const pending=page.waitForEvent('download');
 await page.getByRole('group',{name:'로컬 작품 파일',exact:true}).getByRole('button',{name:'작품 파일 저장',exact:true}).click();
 const exported=JSON.parse(await readFile((await(await pending).path())!,'utf8')).document.project;
 const original=JSON.parse(incoming).document.project;
 expect(exported).toEqual({...original,updatedAt:exported.updatedAt,lines:original.lines.map((cut:{id:string})=>cut.id===id?{...cut,text:'파일로 지켜야 할 현재 탭의 초안'}:cut)});
 expect(await page.evaluate(key=>localStorage.getItem(key),workspace)).toBe(incoming);
});

async function useFailedTakeover(page:Page){
 await page.bringToFront();await page.locator('body').dispatchEvent('pointerdown');
 await expect(writer(page)).toHaveAttribute('data-local-writer','unavailable');
}

test('a work deleted in another tab is not resurrected and this tab’s remaining draft can be exported',async({page,context})=>{
 await page.addInitScript(()=>Object.defineProperty(window,'showSaveFilePicker',{configurable:true,value:undefined}));
 await openSmallWork(page);await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 const field=page.locator('[data-current-cut] textarea'),id=(await field.getAttribute('data-cut-id'))!;
 await field.fill('삭제 전 보관한 글');await expect.poll(()=>storedText(page,id)).toBe('삭제 전 보관한 글');
 const original=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).document.project,workspace);
 const second=await context.newPage();await open(second,'/?view=library');
 await expect(writer(second)).toHaveAttribute('data-local-writer','owned');
 await setTextQuietly(page,'현재 탭에만 남아 있는 초안');
 await shelfCoverButton(second,'두 탭의 작품').click();
 const focus=second.getByRole('dialog');await focus.locator('summary').filter({hasText:'책 꾸미기·작품 도구'}).click();
 await focus.getByRole('button',{name:'이 기기에서 삭제',exact:true}).click();
 await second.getByRole('dialog',{name:'내 작품 삭제 확인',exact:true}).getByRole('button',{name:'삭제 확인',exact:true}).click();
 await expect.poll(()=>second.evaluate(key=>{const value=JSON.parse(localStorage.getItem(key)!);return Object.hasOwn({...value.works,[value.storyId]:value.document},'new:tab-handover');},workspace)).toBe(false);
 // Release the deleting tab after flushing its pending snapshot; its savedAt may otherwise
 // legitimately change while the old tab is taking over.
 await second.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true})));
 await expect.poll(()=>second.evaluate(async key=>(await navigator.locks.query()).held?.some(lock=>lock.name===`${key}-writer`),workspace)).toBe(false);
 const deleted=await second.evaluate(key=>localStorage.getItem(key)!,workspace);
 await useFailedTakeover(page);await expect(field).toHaveValue('현재 탭에만 남아 있는 초안');
 expect(await page.evaluate(key=>localStorage.getItem(key),workspace)).toBe(deleted);
 await page.locator('[data-work-menu]>summary').click();const pending=page.waitForEvent('download');
 await page.getByRole('group',{name:'로컬 작품 파일',exact:true}).getByRole('button',{name:'작품 파일 저장',exact:true}).click();
 const exported=JSON.parse(await readFile((await(await pending).path())!,'utf8')).document.project;
 expect(exported).toEqual({...original,updatedAt:exported.updatedAt,lines:original.lines.map((cut:{id:string})=>cut.id===id?{...cut,text:'현재 탭에만 남아 있는 초안'}:cut)});
 expect(await page.evaluate(key=>localStorage.getItem(key),workspace)).toBe(deleted);
});

test('a save from another tab that this tab had not heard of yet is adopted instead of failing',async({page})=>{
 await openSmallWork(page);await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 const field=page.locator('[data-current-cut] textarea'),id=(await field.getAttribute('data-cut-id'))!;
 await field.fill('처음 보관한 글');await expect.poll(()=>storedText(page,id)).toBe('처음 보관한 글');
 // Another tab took the writer over and saved before this tab heard that it lost the writer
 // (no storage event reaches this tab for its own window, as in that race).
 await page.evaluate(({key,id})=>{const stored=JSON.parse(localStorage.getItem(key)!);for(const document of [stored.document,stored.works[stored.storyId]].filter(Boolean))document.project.lines.find((line:{id:string})=>line.id===id).text='다른 탭이 막 보관한 글';localStorage.setItem(key,JSON.stringify(stored));},{key:workspace,id});
 await setTextQuietly(page,'이 탭에서 이어 쓴 글');
 await expect.poll(()=>storedText(page,id)).toBe('이 탭에서 이어 쓴 글');await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 await expect(field).toHaveValue('이 탭에서 이어 쓴 글');await expect(page.getByText(/임시 보관 실패|보관하지 못했어요/)).toHaveCount(0);
 const kept=await page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-checkpoints-v1')??'[]').map((record:{document:{project:{lines:{text:string}[]}}})=>record.document.project.lines.map(line=>line.text)).flat());
 expect(kept).toContain('다른 탭이 막 보관한 글');
});

test('clearing the stored collection does not let an old tab recreate it',async({page,context})=>{
 await openSmallWork(page);await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 const second=await context.newPage();await open(second,'/?view=library');await expect(writer(second)).toHaveAttribute('data-local-writer','owned');
 await second.evaluate(key=>localStorage.removeItem(key),workspace);
 await setTextQuietly(page,'삭제된 보관함을 덮지 않는 초안');await useFailedTakeover(page);
 expect(await page.evaluate(key=>localStorage.getItem(key),workspace)).toBeNull();
 await expect(page.locator('[data-current-cut] textarea')).toHaveValue('삭제된 보관함을 덮지 않는 초안');
});

test('a picture-book draft reports a quota failure after taking over instead of claiming it was saved',async({page,context})=>{
 await open(page,'/shortstory');await page.getByLabel('이 쪽의 이야기').fill('처음 보관한 그림책');
 await expect.poll(()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).books[0].pages[0].text,shortstory)).toBe('처음 보관한 그림책');
 const second=await context.newPage();await open(second,'/shortstory');await expect(writer(second)).toHaveAttribute('data-local-writer','owned');
 const stored=await second.evaluate(key=>localStorage.getItem(key),shortstory);
 await page.evaluate(key=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(name,value){if(name===key)throw new DOMException('full','QuotaExceededError');return original.call(this,name,value);};},shortstory);
 await page.getByLabel('이 쪽의 이야기').evaluate(el=>{const field=el as HTMLTextAreaElement;Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value')!.set!.call(field,'공간 부족에도 남아야 하는 그림책');field.dispatchEvent(new Event('input',{bubbles:true}));});
 await expect(page.getByRole('alert').filter({hasText:'자동으로 보관하지 못했어요'})).toBeVisible();
 await expect(page.getByLabel('이 쪽의 이야기')).toHaveValue('공간 부족에도 남아야 하는 그림책');
 expect(await page.evaluate(key=>localStorage.getItem(key),shortstory)).toBe(stored);
});
