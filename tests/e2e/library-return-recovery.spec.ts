import {test,expect,type Page} from '@playwright/test';
import {createBlankStoryProject} from '../../packages/runtime-core/src/authoring';
import {createStoryDocument} from '../../packages/story-domain/src';
import {shelfCoverButton} from './library-entry';
const key='knolstory-next-workspace-v1';
const project=createBlankStoryProject({id:'return-draft',chapterId:'chapter',lineId:'cut',title:'서재 이동의 원고'});
async function open(page:Page){
 const document=createStoryDocument({project,savedAt:'2026-11-01T00:00:00.000Z',appVersion:'test'});
 await page.addInitScript(({key,document})=>{sessionStorage.setItem('knolstory-fullscreen-offered-v1','1');if(localStorage.getItem(key)===null)localStorage.setItem(key,JSON.stringify({document,storyId:'new:return-draft',view:'editor',mode:'edit'}));},{key,document});
 await page.route('**/api/**',route=>route.abort());await page.route('**/runtime/**',route=>route.abort());await page.goto('/?view=editor');await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
}
async function quota(page:Page){await page.evaluate(key=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(name,value){if(name===key)throw new DOMException('full','QuotaExceededError');return original.call(this,name,value);};},key);}
const dialog=(page:Page)=>page.getByRole('dialog',{name:'서재로 이동할까요?',exact:true});
for(const width of [1280,390])test(`failed temporary storage allows explicit library return and draft reopening ${width}`,async({page},info)=>{
 await page.setViewportSize({width,height:844});await open(page);const stored=await page.evaluate(key=>localStorage.getItem(key),key);await quota(page);
 const field=page.locator('[data-current-cut] textarea');await field.fill('임시 보관에 실패해도 사라지면 안 되는 원고');await expect(page.getByTestId('save-status')).toContainText('실패');
 await page.getByRole('button',{name:'홈 · 서재로 이동',exact:true}).click();await expect(dialog(page)).toBeVisible();await expect(dialog(page)).toContainText('화면의 원고');await expect(dialog(page).getByRole('button',{name:'계속 편집하기',exact:true})).toBeFocused();
 await dialog(page).getByRole('button',{name:'계속 편집하기',exact:true}).click();await expect(field).toHaveValue('임시 보관에 실패해도 사라지면 안 되는 원고');expect(await page.evaluate(key=>localStorage.getItem(key),key)).toBe(stored);
 await page.getByRole('button',{name:'홈 · 서재로 이동',exact:true}).click();await dialog(page).screenshot({path:info.outputPath('library-return-failure.png')});await dialog(page).getByRole('button',{name:'서재로 이동',exact:true}).click();
 await expect(page.getByRole('main',{name:'놀스토리 서재',exact:true})).toBeVisible();await shelfCoverButton(page,'서재 이동의 원고').click();await page.getByRole('dialog').getByRole('button',{name:'편집하기',exact:true}).click();
 await expect(field).toHaveValue('임시 보관에 실패해도 사라지면 안 되는 원고');expect(await page.evaluate(key=>localStorage.getItem(key),key)).toBe(stored);
});
test('verified work file permits library return even while temporary storage fails',async({page})=>{
 await page.addInitScript(()=>{let text='';Object.assign(window,{showSaveFilePicker:async()=>({name:'safe.knolstory',getFile:async()=>({text:async()=>text}),createWritable:async()=>({write:async(value:string)=>{text=value;},close:async()=>{},abort:async()=>{}})})});});
 await open(page);await quota(page);await page.locator('[data-current-cut] textarea').fill('실제 파일 검증을 마치고 서재로 갈 원고');await expect(page.getByTestId('save-status')).toContainText('실패');
 await page.getByRole('button',{name:'홈 · 서재로 이동',exact:true}).click();await dialog(page).getByRole('button',{name:'작품 파일 저장하고 서재로',exact:true}).click();await expect(page.getByRole('main',{name:'놀스토리 서재',exact:true})).toBeVisible();
 expect(await page.evaluate(()=>{const event=new Event('beforeunload',{cancelable:true});window.dispatchEvent(event);return event.defaultPrevented;})).toBe(false);
});
test('download request and cancelled save keep the current draft until explicit departure',async({page})=>{
 await page.addInitScript(()=>Object.defineProperty(window,'showSaveFilePicker',{configurable:true,value:undefined}));await open(page);await quota(page);await page.locator('[data-current-cut] textarea').fill('다운로드 확인 전에도 남아 있어야 할 원고');await expect(page.getByTestId('save-status')).toContainText('실패');
 await page.getByRole('button',{name:'홈 · 서재로 이동',exact:true}).click();const download=page.waitForEvent('download');await dialog(page).getByRole('button',{name:'작품 파일 저장하고 서재로',exact:true}).click();await download;
 await expect(dialog(page)).toBeVisible();await expect(dialog(page)).toContainText('다운로드');await dialog(page).getByRole('button',{name:'계속 편집하기',exact:true}).click();await expect(page.locator('[data-current-cut] textarea')).toHaveValue('다운로드 확인 전에도 남아 있어야 할 원고');
});

for(const outcome of ['cancelled','failed'] as const)test(`file ${outcome} preserves draft and keeps the library confirmation open`,async({page})=>{
 await page.addInitScript(outcome=>Object.assign(window,{showSaveFilePicker:async()=>{throw new DOMException('test file rejection',outcome==='cancelled'?'AbortError':'NotAllowedError');}}),outcome);
 await open(page);await quota(page);const field=page.locator('[data-current-cut] textarea');await field.fill('취소와 오류에서 유지할 원고');await expect(page.getByTestId('save-status')).toContainText('실패');
 await page.getByRole('button',{name:'홈 · 서재로 이동',exact:true}).click();await dialog(page).getByRole('button',{name:'작품 파일 저장하고 서재로',exact:true}).click();await expect(dialog(page)).toBeVisible();await expect(dialog(page)).toContainText('완료하지 못했어요');
 await dialog(page).getByRole('button',{name:'계속 편집하기',exact:true}).click();await expect(field).toHaveValue('취소와 오류에서 유지할 원고');
});
test('temporary storage retry recovers and leaves after the failure clears',async({page})=>{
 await open(page);await page.evaluate(key=>{const original=Storage.prototype.setItem;let fail=true;(window as typeof window&{allowTemporaryStorage:()=>void}).allowTemporaryStorage=()=>{fail=false;};Storage.prototype.setItem=function(name,value){if(name===key&&fail)throw new DOMException('full','QuotaExceededError');return original.call(this,name,value);};},key);
 await page.locator('[data-current-cut] textarea').fill('보관 재시도 후 이동하는 원고');await expect(page.getByTestId('save-status')).toContainText('실패');await page.getByRole('button',{name:'홈 · 서재로 이동',exact:true}).click();
 await page.evaluate(()=>(window as typeof window&{allowTemporaryStorage:()=>void}).allowTemporaryStorage());await dialog(page).getByRole('button',{name:'임시 보관 다시 시도',exact:true}).click();await expect(page.getByRole('main',{name:'놀스토리 서재',exact:true})).toBeVisible();expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).document.project.lines[0].text,key)).toBe('보관 재시도 후 이동하는 원고');
});
