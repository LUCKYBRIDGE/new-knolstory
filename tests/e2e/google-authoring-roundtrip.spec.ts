import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {registeredWorkbookCopy} from './registered-workbook-copy';
import {parseAuthoringFile,confirmAuthoringImport} from './authoring-file';
test('previous actual Google artifact rejects new private attachment and registered copy preserves extended values and complete archive',async({page},info)=>{
 const originalPath='docs/architecture/evidence/authoring-format/story-google-edited.xlsx',copy=await registeredWorkbookCopy(originalPath);expect(copy.original.audioResources).toHaveLength(1);
 await page.goto('/?view=editor');await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 const menu=async()=>{const node=page.locator('[data-work-menu]');if(!await node.evaluate(n=>(n as HTMLDetailsElement).open))await node.locator(':scope>summary').click();};
 const exported=async()=>{await menu();const pending=page.waitForEvent('download');await page.getByRole('button',{name:'작품 파일 내보내기',exact:true}).click();const path=(await(await pending).path())!;return {path,archive:parseAuthoringFile(readFileSync(path,'utf8'))};};
 const before=(await exported()).archive;
 await page.getByLabel('작품 파일 가져오기').setInputFiles(originalPath);await expect(page.getByTestId('workspace-error')).toContainText('외부 음원이 첨부된 작품');await expect(page.getByRole('dialog',{name:'작품 가져오기 확인',exact:true})).toHaveCount(0);const rejected=(await exported()).archive;expect(rejected.project).toEqual(before.project);expect(rejected.audioResources).toEqual(before.audioResources);
 await page.getByLabel('작품 파일 가져오기').setInputFiles({name:'registered-google-copy.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:copy.buffer});await confirmAuthoringImport(page);
 await expect(page.getByLabel('대사 / 해설',{exact:true})).toHaveValue('Google 시트에서 고친 한국어\n001 =문구와 이모지 🌱');await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');await page.reload();await expect(page.getByLabel('대사 / 해설',{exact:true})).toHaveValue('Google 시트에서 고친 한국어\n001 =문구와 이모지 🌱');
 const first=await exported();expect(first.archive.formatVersion).toBe(2);expect(first.archive.project.lines[0].stageComposition.leftActors[0].xAnchor).toBe(40);expect(first.archive.project.creativeMemos[0].fields[0].value).toBe('Google에서 편집한 메모\n🌱 001');expect(first.archive.audioResources).toEqual([]);expect(first.archive.project).toEqual({...copy.archive.document.project,id:first.archive.project.id});
 await page.getByLabel('작품 파일 가져오기').setInputFiles(first.path);await confirmAuthoringImport(page);await page.reload();const reopened=(await exported()).archive;expect(reopened.project).toEqual({...first.archive.project,id:reopened.project.id});expect(reopened.audioResources).toEqual([]);await page.screenshot({path:info.outputPath('google-registered-reopened.png'),fullPage:true});
});
test('actual Google picture book exported XLSX opens at its edited page',async({page})=>{
 await page.goto('/shortstory');await page.getByLabel('숏스토리 파일 가져오기').setInputFiles('docs/architecture/evidence/authoring-format/shortstory-google-edited.xlsx');const dialog=page.getByRole('dialog',{name:'작품 가져오기 확인'});await expect(dialog).toBeVisible();await dialog.getByRole('button',{name:'내 사본으로 가져오기'}).click();await expect(page.getByLabel('이 쪽의 이야기')).toHaveValue('001 한국어 첫 문장\n=문구와 이모지 🌳를 그대로 보존합니다.');await page.reload();await expect(page.getByLabel('이 쪽의 이야기')).toHaveValue('001 한국어 첫 문장\n=문구와 이모지 🌳를 그대로 보존합니다.');await page.getByRole('button',{name:'읽기',exact:true}).click();await expect(page.getByRole('region',{name:'숏스토리 읽기'})).toContainText('001 한국어 첫 문장');
});
