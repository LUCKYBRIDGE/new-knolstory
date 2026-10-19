import {test,expect,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {registeredWorkbookCopy} from './registered-workbook-copy';
import {parseAuthoringFile,confirmAuthoringImport} from './authoring-file';
async function menu(page:Page){const node=page.locator('[data-work-menu]');if(!await node.evaluate(n=>(n as HTMLDetailsElement).open))await node.locator(':scope>summary').click();}
async function exported(page:Page){await menu(page);const pending=page.waitForEvent('download');await page.getByRole('button',{name:'작품 파일 내보내기',exact:true}).click();const path=(await(await pending).path())!;return {path,archive:parseAuthoringFile(readFileSync(path,'utf8'))};}
for(const source of ['google','excel'])test(`previous actual ${source} Korean content uses a current registered copy and preserves the full work`,async({page})=>{
 const originalPath=`docs/architecture/evidence/authoring-format/story-korean-${source}-edited.xlsx`,copy=await registeredWorkbookCopy(originalPath,'docs/architecture/evidence/remaining-current-2026-10-14/registered-copies');
 await page.goto('/?view=editor');await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');const before=(await exported(page)).archive;
 await page.getByLabel('작품 파일 가져오기').setInputFiles(originalPath);await expect(page.getByTestId('workspace-error')).toContainText('외부 음원이 첨부된 작품');await expect(page.getByRole('dialog',{name:'작품 가져오기 확인',exact:true})).toHaveCount(0);const rejected=(await exported(page)).archive;expect(rejected.project).toEqual(before.project);expect(rejected.audioResources).toEqual(before.audioResources);
 await page.getByLabel('작품 파일 가져오기').setInputFiles({name:`current-korean-${source}.xlsx`,mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:copy.buffer});await confirmAuthoringImport(page);
 await expect(page.getByLabel('대사 / 해설',{exact:true})).toHaveValue('한글 양식에서 수정한 작품 🌳');await expect(page.getByLabel('글 종류',{exact:true})).toHaveValue('narration');await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 await page.reload();await expect(page.getByLabel('글 종류',{exact:true})).toHaveValue('narration');await expect(page.getByLabel('대사 / 해설',{exact:true})).toHaveValue('한글 양식에서 수정한 작품 🌳');
 const first=await exported(page);expect(first.archive.schemaVersion).toBe(8);expect(first.archive.project).toEqual({...copy.archive.document.project,id:first.archive.project.id});expect(first.archive.audioResources).toEqual([]);
 await page.getByLabel('작품 파일 가져오기').setInputFiles(first.path);await confirmAuthoringImport(page);await page.reload();const reopened=(await exported(page)).archive;expect(reopened.project).toEqual({...first.archive.project,id:reopened.project.id});expect(reopened.audioResources).toEqual([]);
});
