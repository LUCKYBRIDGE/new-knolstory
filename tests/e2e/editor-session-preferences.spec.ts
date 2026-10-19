import {test,expect,type Page} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {confirmAuthoringImport,parseAuthoringFile} from './authoring-file';

async function menu(page:Page){
 const node=page.locator('[data-work-menu]');
 if(!await node.evaluate(element=>(element as HTMLDetailsElement).open))await node.locator(':scope>summary').click();
 return node;
}
async function settings(page:Page){
 const node=await menu(page),details=node.getByText('편집 설정',{exact:true}).locator('..');
 if(!await details.evaluate(element=>(element as HTMLDetailsElement).open))await details.locator(':scope>summary').click();
 return node;
}
async function screen(page:Page,value:string){await menu(page);await page.getByRole('combobox',{name:'편집화면 선택',exact:true}).selectOption(value);}
async function ready(page:Page){await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');}
async function exported(page:Page){
 await ready(page);await menu(page);const pending=page.waitForEvent('download');
 await page.getByRole('button',{name:'작품 파일 내보내기',exact:true}).click();
 return parseAuthoringFile(await readFile((await (await pending).path())!,'utf8')).project;
}
async function start(page:Page){
 await page.route('**/api/**',route=>route.abort());
 // These assertions exercise host UI preferences; native startup is covered separately.
 await page.route('**/runtime/**',route=>route.abort());
 await page.goto('/?view=editor');await ready(page);
}

test('editor session restores screen, companion and explicit opt-ins without changing work files',async({page},info)=>{
 await start(page);const original=await exported(page);const controls=await settings(page);
 for(const label of ['인물','음향','연출','선택지','점수','분기조건'])await controls.getByRole('checkbox',{name:`${label} 편집 사용`,exact:true}).check();
 await screen(page,'text');await page.getByRole('checkbox',{name:'배경 함께 보기',exact:true}).check();
 await page.reload();await ready(page);
 await expect(page.locator('[data-editing-screen="text"]')).toBeVisible();
 await expect(page.getByRole('checkbox',{name:'배경 함께 보기',exact:true})).toBeChecked();
 const restored=await settings(page);
 for(const label of ['인물','음향','연출','선택지','점수','분기조건'])await expect(restored.getByRole('checkbox',{name:`${label} 편집 사용`,exact:true})).toBeChecked();
 expect(await exported(page)).toEqual(original);
 await screen(page,'audio');const toggles=await settings(page);
 await toggles.getByRole('checkbox',{name:'음향 편집 사용',exact:true}).uncheck();
 await page.reload();await ready(page);await expect(page.locator('[data-editing-screen="basic"]')).toBeVisible();
 await expect((await settings(page)).getByRole('checkbox',{name:'음향 편집 사용',exact:true})).not.toBeChecked();
 expect(await exported(page)).toEqual(original);
 await page.screenshot({path:info.outputPath('session-settings.png'),fullPage:true});
});

test('a separate work and a fresh browser session start with basic editing and closed advanced tools',async({page,browser})=>{
 await start(page);const before=await exported(page);
 await (await settings(page)).getByRole('checkbox',{name:'인물 편집 사용',exact:true}).check();
 await screen(page,'text');await page.getByRole('checkbox',{name:'배경 함께 보기',exact:true}).check();
 await menu(page);await page.getByLabel('작품 파일 가져오기',{exact:true}).setInputFiles({name:'separate.knolstory',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({documentType:'story-maker-project',schemaVersion:8,savedAt:'2026-10-19T00:00:00.000Z',appVersion:'test',project:{...before,id:'session-preference-other',title:'별도 설정 작품'}}))});
 await confirmAuthoringImport(page);await ready(page);
 await expect(page.locator('[data-editing-screen="basic"]')).toBeVisible();
 const controls=await settings(page);
 for(const label of ['인물','음향','연출','선택지','점수','분기조건'])await expect(controls.getByRole('checkbox',{name:`${label} 편집 사용`,exact:true})).not.toBeChecked();
 await screen(page,'text');await expect(page.getByRole('checkbox',{name:'배경 함께 보기',exact:true})).not.toBeChecked();
 const context=await browser.newContext();
 try{
 const fresh=await context.newPage();await start(fresh);
 await expect(fresh.locator('[data-editing-screen="basic"]')).toBeVisible();
 const defaults=await settings(fresh);
 for(const label of ['인물','음향','연출','선택지','점수','분기조건'])await expect(defaults.getByRole('checkbox',{name:`${label} 편집 사용`,exact:true})).not.toBeChecked();
 }finally{await context.close();}
});

for(const storageState of ['corrupt','blocked'] as const)test(`session storage ${storageState} keeps editor and local file usable`,async({page})=>{
 await page.addInitScript(state=>{
  if(state==='blocked')Object.defineProperty(window,'sessionStorage',{get(){throw Error('Session storage denied for focused test');}});
  else {const original=Storage.prototype.getItem;Storage.prototype.getItem=function(key){return this===window.sessionStorage&&key.startsWith('knolstory-editor-session-v1:')?'{corrupt':original.call(this,key);};}
 },storageState);
 await start(page);await expect(page.locator('[data-editing-screen="basic"]')).toBeVisible();
 const before=await exported(page);
 await (await settings(page)).getByRole('checkbox',{name:'음향 편집 사용',exact:true}).check();
 await screen(page,'audio');await expect(page.locator('[data-editing-screen="audio"]')).toBeVisible();
 await screen(page,'text');await page.getByRole('checkbox',{name:'배경 함께 보기',exact:true}).check();
 expect(await exported(page)).toEqual(before);
});
