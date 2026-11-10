import {enterLibrary,startShelfCreation} from './library-entry';
import {expectIndependentImportedProject,parseAuthoringFile,confirmAuthoringImport,openFileExchange} from './authoring-file';
import {test,expect,type Page} from '@playwright/test';
import {openCurrentCutDetail} from './editor-screens';
import {suppressFullscreenOffer} from './mobile-fullscreen-offer';
import {readFileSync} from 'node:fs';
const original=' 앞 문장입니다.\n\n다음 한국어👩‍🏫 문장입니다. ';
async function saved(page:Page){await expect(page.locator('[data-testid="save-status"],[data-testid="preparation-save-status"]')).toHaveText('임시 보관됨');}
async function exported(page:Page){
 await saved(page);const tools=page.locator('[data-work-menu]>summary');
 if(!await tools.locator('..').evaluate(node=>(node as HTMLDetailsElement).open))await tools.click();
 await openFileExchange(page);
 const event=page.waitForEvent('download');await page.getByRole('button',{name:'작품 파일 내보내기',exact:true}).click();
 const path=(await(await event).path())!;return {path,project:parseAuthoringFile(readFileSync(path,'utf8')).project};
}
/** The detailed "대사 / 해설" field of the current cut lives in the folded 현재 컷 상세·메모·정리 dock, together with split, merge, move and delete. */
for(const viewport of [{width:1440,height:1000},{width:1024,height:768},{width:768,height:1024},{width:390,height:844},{width:844,height:390}])test(`manuscript split, merge and files preserve Korean at ${viewport.width}x${viewport.height}`,async({page},info)=>{
 test.skip(info.project.name!=='host');await suppressFullscreenOffer(page);await page.setViewportSize(viewport);await page.goto('/');await enterLibrary(page);await startShelfCreation(page);await page.getByLabel('새 작품 제목').fill('컷 나누기와 합치기');await page.getByRole('button',{name:'새 작품 생성',exact:true}).click();await saved(page);
 const dock=async()=>openCurrentCutDetail(page);
 let detail=await dock();const text=()=>detail.getByLabel('대사 / 해설',{exact:true});
 await text().fill(original);await text().focus();await text().press('ControlOrMeta+A');await text().press('ArrowLeft');
 for(let i=0;i<9;i++)await text().press('ArrowRight');
 const position=await text().evaluate(node=>(node as HTMLTextAreaElement).selectionStart);expect(position).toBe(9);
 await detail.getByRole('button',{name:'상세 글의 커서에서 컷 나누기',exact:true}).click();await saved(page);
 let file=await exported(page);expect(file.project.lines.map((line:{text:string})=>line.text)).toEqual([original.slice(0,9),original.slice(9)]);
 const firstId=file.project.lines[0].id;await page.reload();await saved(page);
 await page.getByLabel('현재 장과 컷 이동',{exact:true}).selectOption(firstId);detail=await dock();
 // The dock keeps every button visible: moving the first cut up is a no-op, and merging joins it with the next cut.
 await detail.getByRole('button',{name:'현재 컷 위로',exact:true}).click();await saved(page);expect((await exported(page)).project.lines.map((line:{text:string})=>line.text)).toEqual([original.slice(0,9),original.slice(9)]);
 detail=await dock();await detail.getByRole('button',{name:'다음 컷과 합치기',exact:true}).click();await saved(page);file=await exported(page);expect(file.project.lines).toHaveLength(1);expect(file.project.lines[0]).toMatchObject({id:firstId,text:original});
 // With no next cut left, merging is unavailable.
 detail=await dock();await expect(detail.getByRole('button',{name:'다음 컷과 합치기',exact:true})).toBeDisabled();
 // Position zero produces a recoverable error, preserving the saved manuscript.
 detail=await dock();await text().focus();await text().press('ControlOrMeta+A');await text().press('ArrowLeft');await detail.getByRole('button',{name:'상세 글의 커서에서 컷 나누기',exact:true}).click();await expect(page.getByRole('alert').filter({hasText:'나눌 위치'})).toBeVisible();expect((await exported(page)).project).toEqual(file.project);
 await page.locator('[data-work-menu]>summary').click();await page.getByLabel('작품 파일 가져오기').setInputFiles(file.path); await confirmAuthoringImport(page);await saved(page);await page.reload();expectIndependentImportedProject((await exported(page)).project,file.project);
 await page.getByRole('button',{name:'현재 컷 쓰기',exact:true}).click();detail=await dock();await expect(text()).toHaveValue(original);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:info.outputPath('manuscript.png'),fullPage:true});
});
