import {test,expect,type Page} from '@playwright/test';
import {createBlankStoryProject} from '../../packages/runtime-core/src/authoring';
import {confirmAuthoringImport} from './authoring-file';
const project=createBlankStoryProject({id:'direction-tips',chapterId:'a',lineId:'first',title:'연출 팁 확인'});
async function work(page:Page){return page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).document.project);}
test('contextual direction tips explain recommended use and preserve draft and focus',async({page},info)=>{
 page.setDefaultTimeout(12000);await page.route('**/api/**',route=>route.abort());await page.goto('/?view=editor');
 await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');await page.locator('[data-work-menu]>summary').click();
 await page.getByLabel('작품 파일 가져오기',{exact:true}).setInputFiles({name:'tips.knolstory',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({documentType:'story-maker-project',schemaVersion:8,savedAt:'2026-10-20T00:00:00.000Z',appVersion:'test',project}))});await confirmAuthoringImport(page);
 const menu=page.locator('[data-work-menu]');if(!await menu.evaluate(node=>(node as HTMLDetailsElement).open))await menu.locator(':scope>summary').click();
 const settings=page.getByText('편집 설정',{exact:true});if(!await settings.locator('..').evaluate(node=>(node as HTMLDetailsElement).open))await settings.click();
 await page.getByRole('checkbox',{name:'연출 편집 사용',exact:true}).check();await page.getByRole('combobox',{name:'편집화면 선택',exact:true}).selectOption({label:'연출 편집'});
 await page.getByText('1컷 연출 수정',{exact:true}).click();
 await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');const original=await work(page);
 const field=page.getByLabel('화면 전환',{exact:true});await field.selectOption('perspective-blackout');
 let dialog=page.getByRole('dialog',{name:'시점 전환',exact:true});await expect(dialog).toBeVisible();
 expect(await work(page)).toEqual(original);await expect(field).toHaveValue('');
 const description=dialog.locator('details');await expect(description).not.toHaveAttribute('open','');await description.locator('summary').click();await expect(description).toContainText('누구의 시점');
 await dialog.getByRole('button',{name:'팁',exact:true}).click();await expect(dialog).toContainText('1인칭');
 await page.keyboard.press('Escape');await expect(dialog).not.toBeVisible();await expect(field).toBeFocused();expect(await work(page)).toEqual(original);
 for(const viewport of [{width:1280,height:800},{width:390,height:844},{width:844,height:390}]){await page.setViewportSize(viewport);await field.selectOption('white-fade');dialog=page.getByRole('dialog',{name:'흰 화면 전환',exact:true});const bounds=(await dialog.boundingBox())!;expect(bounds.x).toBeGreaterThanOrEqual(0);expect(bounds.y).toBeGreaterThanOrEqual(0);expect(bounds.y+bounds.height).toBeLessThanOrEqual(viewport.height+1);expect(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);await page.screenshot({path:info.outputPath(`choice-${viewport.width}.png`)});await dialog.getByRole('button',{name:'연출 선택 닫기',exact:true}).click();expect(await work(page)).toEqual(original);}
 await field.selectOption('perspective-blackout');dialog=page.getByRole('dialog',{name:'시점 전환',exact:true});await dialog.getByRole('button',{name:'사용',exact:true}).click();await expect(field).toHaveValue('perspective-blackout');await expect(field).toBeFocused();
 await page.getByText('전환에 표시할 글',{exact:true}).click();await page.getByLabel('전환 제목',{exact:true}).fill('민아의 시점');await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');const applied=await work(page);
 const reopen=page.getByRole('button',{name:'화면 전환 설명·팁',exact:true});await reopen.click();dialog=page.getByRole('dialog',{name:'시점 전환',exact:true});await expect(dialog).toBeVisible();await page.keyboard.press('Escape');await expect(reopen).toBeFocused();expect(await work(page)).toEqual(applied);await reopen.click();await page.getByRole('dialog',{name:'시점 전환',exact:true}).getByRole('button',{name:'사용',exact:true}).click();expect(await work(page)).toEqual(applied);

 await field.selectOption('fade-black');await page.getByRole('dialog',{name:'암전',exact:true}).getByRole('button',{name:'연출 선택 닫기',exact:true}).click();expect(await work(page)).toEqual(applied);await expect(page.getByLabel('전환 제목',{exact:true})).toHaveValue('민아의 시점');
 await page.getByLabel('조정할 연출',{exact:true}).selectOption('look');await page.getByLabel('분위기',{exact:true}).selectOption('flashback');dialog=page.getByRole('dialog',{name:'회상',exact:true});expect(await work(page)).toEqual(applied);await dialog.getByRole('button',{name:'사용',exact:true}).click();await expect(page.getByLabel('분위기',{exact:true})).toHaveValue('flashback');
 await page.getByLabel('조정할 연출',{exact:true}).selectOption('effects');const effect=page.getByLabel('효과',{exact:true});await effect.selectOption('shake');dialog=page.getByRole('dialog',{name:'화면 흔들림',exact:true});await dialog.getByRole('button',{name:'사용',exact:true}).click();await expect(effect).toHaveValue('shake');
 await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');const after=await work(page);expect(after.lines[0].text).toEqual(original.lines[0].text);expect(after.lines[0].presentation).toMatchObject({transition:{type:'perspective-blackout',title:'민아의 시점'},look:{type:'flashback'},effects:[{type:'shake'}]});
});
