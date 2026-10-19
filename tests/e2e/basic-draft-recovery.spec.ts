import {test,expect,type Page} from '@playwright/test';
import {readFile} from 'node:fs/promises';
const key='knolstory-next-workspace-v1';
async function savedRaw(page:Page){return page.evaluate(key=>localStorage.getItem(key)!,key);}
async function openOwned(page:Page){
 await page.addInitScript(()=>Object.defineProperty(window,'showSaveFilePicker',{configurable:true,value:undefined}));
 await page.route('**/api/**',route=>route.abort());await page.goto('/?view=editor');
 await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 const field=page.locator('[data-current-cut] textarea');await field.fill('기기에 보관한 원래 원고');
 await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');return savedRaw(page);
}
for(const state of ['blocked','unavailable'] as const)test(`basic current-cut Korean draft survives ${state} storage and exports without replacing the stored work`,async({page,context},info)=>{
 const raw=await openOwned(page),source=JSON.parse(raw).document.project;
 const draftPage=state==='blocked'?await context.newPage():page;
 await draftPage.addInitScript(()=>Object.defineProperty(window,'showSaveFilePicker',{configurable:true,value:undefined}));
 if(state==='unavailable')await draftPage.addInitScript(()=>Object.defineProperty(navigator,'locks',{configurable:true,value:undefined}));
 await draftPage.route('**/api/**',route=>route.abort());await draftPage.goto('/?view=editor');
 await expect(draftPage.getByRole('alert').filter({hasText:state==='blocked'?'다른 탭에서 보관함':'현재 원고를 임시 보관할 수 없어요'})).toBeVisible();
 const protectedRaw=await savedRaw(draftPage);
 const field=draftPage.locator('[data-current-cut] textarea'),id=await field.getAttribute('data-cut-id');
 await expect(field).toBeEnabled({timeout:2000});
 await field.dispatchEvent('compositionstart');await expect(field).toBeEnabled();
 const draft='저장소를 덮어쓰지 않는 한글 초안입니다.\n이 글은 작품 파일에 그대로 남습니다.';await field.fill(draft);
 await expect(draftPage.getByRole('button',{name:/컷 배경 이미지 찾기/})).toBeDisabled();
 await expect(draftPage.getByRole('button',{name:/^다음 컷/})).toBeDisabled();
 await draftPage.locator('[data-work-menu]>summary').click();
 await expect(draftPage.getByLabel('편집화면 선택',{exact:true})).toBeDisabled();
 await expect(draftPage.getByRole('group',{name:'로컬 작품 파일',exact:true}).getByRole('button',{name:'작품 파일 저장',exact:true})).toBeDisabled();
 await field.dispatchEvent('compositionend');await expect(field).toHaveValue(draft);
 await expect(draftPage.getByTestId('save-status')).toHaveText('임시 보관 중지');
 const pending=draftPage.waitForEvent('download');await draftPage.getByRole('group',{name:'로컬 작품 파일',exact:true}).getByRole('button',{name:'작품 파일 저장',exact:true}).click();
 const archive=JSON.parse(await readFile((await(await pending).path())!,'utf8')),actual=archive.document.project;
 expect(actual).toEqual({...source,updatedAt:actual.updatedAt,lines:source.lines.map((line:{id:string;text:string})=>line.id===id?{...line,text:draft}:line)});
 expect(await savedRaw(draftPage)).toBe(protectedRaw);
 if(state==='blocked')expect(await page.evaluate(async key=>(await navigator.locks.query()).held?.filter(lock=>lock.name===`${key}-writer`).length,key)).toBe(1);
 else expect(await draftPage.evaluate(()=>navigator.locks)).toBeUndefined();
 await draftPage.setViewportSize({width:390,height:844});await draftPage.keyboard.press('Escape');await draftPage.screenshot({path:info.outputPath(`${state}-basic-draft.png`)});
});
test('owned basic current-cut text still autosaves',async({page})=>{
 await openOwned(page);const field=page.locator('[data-current-cut] textarea'),id=await field.getAttribute('data-cut-id');await field.fill('소유권이 있는 기본편집의 한글 원고');
 await expect.poll(async()=>JSON.parse(await savedRaw(page)).document.project.lines.find((line:{id:string})=>line.id===id).text).toBe('소유권이 있는 기본편집의 한글 원고');
 await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
});
