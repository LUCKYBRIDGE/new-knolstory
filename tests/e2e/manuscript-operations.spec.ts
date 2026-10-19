import {enterLibrary,startShelfCreation} from './library-entry';
import {expectIndependentImportedProject,parseAuthoringFile,confirmAuthoringImport} from './authoring-file';
import {test,expect,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
const original=' 앞 문장입니다.\n\n다음 한국어👩‍🏫 문장입니다. ';
async function saved(page:Page){await expect(page.locator('[data-testid="save-status"],[data-testid="preparation-save-status"]')).toHaveText('임시 보관됨');}
async function exported(page:Page){
 await saved(page);const tools=page.locator('[data-work-menu]>summary');
 if(!await tools.locator('..').evaluate(node=>(node as HTMLDetailsElement).open))await tools.click();
 const event=page.waitForEvent('download');await page.getByRole('button',{name:'작품 파일 내보내기',exact:true}).click();
 const path=(await(await event).path())!;return {path,project:parseAuthoringFile(readFileSync(path,'utf8')).project};
}
for(const viewport of [{width:1440,height:1000},{width:1024,height:768},{width:768,height:1024},{width:390,height:844},{width:844,height:390}])test(`manuscript split, merge and files preserve Korean at ${viewport.width}x${viewport.height}`,async({page},info)=>{
 test.skip(info.project.name!=='host');await page.setViewportSize(viewport);await page.goto('/');await enterLibrary(page);await startShelfCreation(page);await page.getByLabel('새 작품 제목').fill('컷 나누기와 합치기');await page.getByRole('button',{name:'새 작품 생성',exact:true}).click();await saved(page);
 await page.locator('[data-writing-tools]>summary').click();await page.getByRole('button',{name:'장 전체 글 고치기',exact:true}).click();const writer=page.getByRole('region',{name:'장 전체 글 고치기',exact:true});
 const text=writer.getByLabel('1컷 대사 / 해설');await text.fill(original);await text.focus();await text.press('ControlOrMeta+A');await text.press('ArrowLeft');
 for(let i=0;i<9;i++)await text.press('ArrowRight');
 const position=await text.evaluate(node=>(node as HTMLTextAreaElement).selectionStart);expect(position).toBe(9);
 await writer.getByRole('button',{name:'커서 위치에서 컷 나누기',exact:true}).click();await saved(page);
 let file=await exported(page);expect(file.project.lines.map((line:{text:string})=>line.text)).toEqual([original.slice(0,9),original.slice(9)]);
 const firstId=file.project.lines[0].id;await page.reload();await saved(page);
 await expect(writer).toBeVisible();await expect(writer.getByRole('button',{name:'이 컷 편집 화면 열기',exact:true})).toHaveCount(1);const excerpt=writer.getByRole('button',{name:'1컷 글 고치기',exact:true});expect(await excerpt.evaluate(node=>{const style=getComputedStyle(node);return style.borderStyle!=='none'&&style.borderColor!=='transparent'&&style.borderColor!=='rgba(0, 0, 0, 0)';})).toBe(true);await writer.getByRole('button',{name:'1컷 글 고치기',exact:true}).click();
 await writer.getByText('컷 정리 · 복제/이동/삭제',{exact:true}).click();await expect(writer.getByRole('button',{name:'현재 컷 위로',exact:true})).toHaveCount(0);await expect(writer.getByRole('button',{name:'현재 컷 아래로',exact:true})).toBeVisible();await writer.getByText('컷 정리 · 복제/이동/삭제',{exact:true}).click();await expect(writer.getByRole('button',{name:/^1컷 · 해설/})).toHaveCount(0);await writer.getByRole('button',{name:'다음 컷과 합치기',exact:true}).click();await expect(writer.getByRole('button',{name:'다음 컷과 합치기',exact:true})).toHaveCount(0);await saved(page);file=await exported(page);expect(file.project.lines).toHaveLength(1);expect(file.project.lines[0]).toMatchObject({id:firstId,text:original});
 // Position zero produces a recoverable error, preserving the saved manuscript.
 await writer.getByLabel('1컷 대사 / 해설').focus();await writer.getByLabel('1컷 대사 / 해설').press('ControlOrMeta+A');await writer.getByLabel('1컷 대사 / 해설').press('ArrowLeft');await writer.getByRole('button',{name:'커서 위치에서 컷 나누기',exact:true}).click();await expect(writer.getByRole('alert')).toContainText('나눌 위치');expect((await exported(page)).project).toEqual(file.project);
 await page.locator('[data-work-menu]>summary').click();await page.getByLabel('작품 파일 가져오기').setInputFiles(file.path); await confirmAuthoringImport(page);await saved(page);await page.reload();expectIndependentImportedProject((await exported(page)).project,file.project);
 await page.getByRole('button',{name:'현재 컷 쓰기',exact:true}).click();await page.locator('[data-writing-tools]>summary').click();await page.getByRole('button',{name:'장 전체 글 고치기',exact:true}).click();await expect(writer.getByLabel('1컷 대사 / 해설')).toHaveValue(original);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:info.outputPath('manuscript.png'),fullPage:true});
});
