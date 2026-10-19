import {expect,test,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {parseAuthoringFile,confirmAuthoringImport} from './authoring-file';
import {createStoryDocument} from '../../packages/story-domain/src';
import {registeredWorkbookCopy} from './registered-workbook-copy';
const source=parseAuthoringFile(readFileSync('tests/fixtures/responsive-audio.json','utf8'));
async function edit(page:Page,label:string,value:string){const input=page.getByLabel(label,{exact:true});await input.fill(value);await input.blur();}
async function menu(page:Page){const node=page.locator('[data-work-menu]');if(!await node.evaluate(n=>(n as HTMLDetailsElement).open))await node.locator(':scope>summary').click();}
async function sound(page:Page,kind:string){const tools=page.locator('[data-additional-tools]');if(!await tools.evaluate(n=>(n as HTMLDetailsElement).open))await tools.locator(':scope>summary').click();await page.getByRole('button',{name:'소리 편집',exact:true}).click();await page.getByLabel('조정할 소리',{exact:true}).selectOption(kind);}
async function exported(page:Page){await menu(page);const pending=page.waitForEvent('download');await page.getByRole('button',{name:'작품 파일 내보내기',exact:true}).click();const path=(await(await pending).path())!;return {path,document:parseAuthoringFile(readFileSync(path,'utf8'))};}
test('decimal seconds preserve exact milliseconds through save, reload and file reopening',async({page},info)=>{
 test.skip(info.project.name!=='host');await page.goto('/?view=editor');await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');await menu(page);
 await page.getByLabel('작품 파일 가져오기').setInputFiles({name:'seconds.knolstory',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(createStoryDocument({project:source,savedAt:'2026-10-14T00:00:00.000Z',appVersion:'current-seconds-test'})))});await confirmAuthoringImport(page);
 const before=(await exported(page)).document.project;
 await sound(page,'music');await expect(page.getByLabel('컷 배경음 동작',{exact:true})).toHaveValue('default');await page.getByLabel('컷 배경음 동작',{exact:true}).selectOption('play');await edit(page,'컷 배경음 서서히 크게 시작 (초)','0.23');await edit(page,'컷 배경음 기존 소리 사라짐 (초)','0.1');
 await sound(page,'sounds');await edit(page,'1번 효과음 재생 대기 (초)','0.001');await sound(page,'music');await edit(page,'컷 배경음 서서히 크게 시작 (초)','');
 await expect(page.getByRole('alert').filter({hasText:'기존 값은 유지됩니다'})).toBeVisible();await expect(page.getByLabel('컷 배경음 서서히 크게 시작 (초)',{exact:true})).toHaveValue('0.23');await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 await page.reload();await sound(page,'music');await expect(page.getByLabel('컷 배경음 서서히 크게 시작 (초)',{exact:true})).toHaveValue('0.23');const {path,document}=await exported(page);
 expect(document.project.lines[0].audio.music).toMatchObject({fadeInMs:230,fadeOutMs:100});expect(document.project.lines[0].audio.sounds[0].delayMs).toBe(1);
 const expected={...before,updatedAt:document.project.updatedAt,lines:before.lines.map((line:typeof before.lines[number],index:number)=>index?line:{...line,audio:{...line.audio,music:{action:'play',assetId:'audio:music:forest',volume:.7,loop:true,fadeInMs:230,fadeOutMs:100},sounds:line.audio.sounds.map((cue:typeof line.audio.sounds[number],i:number)=>i?cue:{...cue,delayMs:1})}})};expect(document.project).toEqual(expected);
 await page.getByLabel('작품 파일 가져오기').setInputFiles(path);await confirmAuthoringImport(page);await sound(page,'music');await expect(page.getByLabel('컷 배경음 서서히 크게 시작 (초)',{exact:true})).toHaveValue('0.23');const reopened=(await exported(page)).document.project;expect(reopened).toEqual({...document.project,id:reopened.id});
});
for(const app of ['excel','google'])test(`previous actual ${app} seconds artifact rejects new private attachment and its explicit registered copy preserves exact work`,async({page},info)=>{
 test.skip(info.project.name!=='host');page.setDefaultTimeout(15000);const path=`docs/architecture/evidence/editor-terminology/seconds-${app}-edited.xlsx`,copy=await registeredWorkbookCopy(path);
 await page.goto('/?view=editor');await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');const before=(await exported(page)).document.project;
 await page.getByLabel('작품 파일 가져오기').setInputFiles(path);await expect(page.getByTestId('workspace-error')).toContainText('외부 음원이 첨부된 작품');await expect(page.getByRole('dialog',{name:'작품 가져오기 확인',exact:true})).toHaveCount(0);expect((await exported(page)).document.project).toEqual(before);
 await page.getByLabel('작품 파일 가져오기').setInputFiles({name:`registered-${app}.xlsx`,mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:copy.buffer});await confirmAuthoringImport(page);
 await page.getByRole('button',{name:'배경·인물 편집',exact:true}).click();const placement=page.locator('[data-placement-details]');if(!await placement.evaluate(n=>(n as HTMLDetailsElement).open))await placement.locator(':scope>summary').click();await expect(page.getByLabel('왼쪽 1번 인물 동작 시간 (초)',{exact:true})).toHaveValue('0.45');
 await page.locator('[data-writing-tools]>summary').click();await page.getByRole('button',{name:'장 전체 글 고치기',exact:true}).click();const setting=page.getByText('장 설정 · 말하는 인물과 기본 자료',{exact:true});if(!await setting.locator('..').evaluate(n=>(n as HTMLDetailsElement).open))await setting.click();
 const writer=page.getByRole('region',{name:'장 전체 글 고치기',exact:true});await writer.getByLabel('조정할 소리',{exact:true}).selectOption('music');await expect(page.getByLabel('장 배경음 서서히 크게 시작 (초)',{exact:true})).toHaveValue('0.23');await writer.getByLabel('조정할 소리',{exact:true}).selectOption('sounds');await expect(page.getByLabel('장 1번 효과음 재생 대기 (초)',{exact:true})).toHaveValue('0.1');await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');await page.reload();await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');if(!await setting.locator('..').evaluate(n=>(n as HTMLDetailsElement).open))await setting.click();await writer.getByLabel('조정할 소리',{exact:true}).selectOption('sounds');await expect(page.getByLabel('장 1번 효과음 재생 대기 (초)',{exact:true})).toHaveValue('0.1');
 const exportedCopy=(await exported(page)).document;expect(exportedCopy.project).toEqual({...copy.archive.document.project,id:exportedCopy.project.id});expect(exportedCopy.audioResources).toEqual([]);
});
