import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
const original=JSON.parse(readFileSync('tests/fixtures/stories/onggojib.json','utf8'));
const rawProject=original.project??original,key='knolstory-next-workspace-v1';
const first='review-main-003:start';
test('an unchanged saved edition refreshes chapter names and numbers while preserving authored manuscripts',async({page})=>{
 await page.addInitScript(({key,project})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify({storyId:'onggojib',view:'editor',mode:'edit',document:{documentType:'story-maker-project',schemaVersion:8,savedAt:'2026-11-01T00:00:00.000Z',appVersion:'test',project},lineId:project.lines[0].id}));sessionStorage.setItem('knolstory-fullscreen-offered-v1','1');},{key,project:rawProject});
 await page.route('**/api/**',r=>r.abort());await page.route('**/runtime/**',r=>r.abort());await page.goto('/?view=editor');
 const select=page.getByLabel('현재 장과 컷 이동',{exact:true});await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 const options=await select.locator('optgroup').evaluateAll(nodes=>nodes.map(node=>(node as HTMLOptGroupElement).label));
 expect(options[0]).toBe('1장 · 아내의 대답');expect(options.filter(s=>s.startsWith('2장'))).toHaveLength(2);expect(options.some(s=>s.startsWith('22장'))).toBe(false);expect(options.filter(s=>s.includes('미연결 원고'))).toHaveLength(5);expect(options.some(s=>s.includes('아이의 이야기를 듣다'))).toBe(true);
 const target=rawProject.lines.find((line:{chapterId:string})=>line.chapterId==='review-main-003:fake-route-cruelty-labor-first__work-promised__wage-wet-wood__shoe-poverty')!;
 await select.selectOption(target.id);await expect(select).toHaveValue(target.id);await expect(select.locator('option:checked')).toContainText('6장');await page.reload();await expect(select).toHaveValue(target.id);await expect(select.locator('option:checked')).toContainText('6장');
 const preserved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).document.project,key);expect(preserved.lines).toHaveLength(rawProject.lines.length);expect(preserved.chapters.find((c:{id:string})=>c.id===first).order).toBe(1);
});
test('actual Onggojib choice advances from chapter 1 to chapter 2A and history uses the same labels',async({page},info)=>{
 test.setTimeout(180000);
 await page.addInitScript(({key,project})=>{localStorage.setItem(key,JSON.stringify({storyId:'onggojib',view:'editor',mode:'edit',document:{documentType:'story-maker-project',schemaVersion:8,savedAt:'2026-11-01T00:00:00.000Z',appVersion:'test',project},lineId:'review-main-003:start:8'}));sessionStorage.setItem('knolstory-fullscreen-offered-v1','1');},{key,project:rawProject});await page.route('**/api/**',r=>r.abort());await page.goto('/?view=editor');await expect(page.getByLabel('현재 장과 컷 이동',{exact:true})).toHaveValue('review-main-003:start:8');await page.getByRole('button',{name:'이 컷부터 재생',exact:true}).click();
 const status=page.getByTestId('story-runtime-status');const rendered=()=>expect.poll(async()=>{const rev=await status.getAttribute('data-rendered-revision');return rev!==null&&Number(rev)>=0&&rev===await status.getAttribute('data-scene-revision');},{timeout:120000}).toBe(true);await rendered();const gate=page.getByTestId('story-runtime-frame').contentFrame().getByRole('button',{name:'소리 켜고 시작 · Enter 또는 Space',exact:true});if(await gate.count())await gate.press('Enter');await expect(page.locator('[data-reader-context]')).toHaveText('1장 · 아내의 대답');
 await page.getByRole('button',{name:'“밥은 거저 못 준다. 장작부터 패라.”',exact:true}).press('Enter');await rendered();await expect(page.locator('[data-reader-context]')).toHaveText('2장A · 대문 앞 사내');await page.screenshot({path:info.outputPath('chapter-two-native.png')});await page.getByRole('button',{name:'지난기록',exact:true}).click();const history=page.getByRole('dialog');await expect(history.getByRole('heading',{name:'2장A · 대문 앞 사내',exact:true})).toBeVisible();await expect(history.locator('[data-reader-previous-chapters]')).toHaveCount(0);
});
