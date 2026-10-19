import {test,expect,type Locator} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
import {builtinShelfCard} from './library-entry';
import {BUILTIN_WORKS} from '../../apps/web/lib/builtin-works';
for(const [width,height] of [[320,256],[640,360],[320,740]])test(`book service text and actions reflow at CSS viewport ${width}x${height}`,async({page},info)=>{
 await page.setViewportSize({width,height});await page.goto('/?view=library');await expect(page.getByTestId('library-save-status')).toHaveText('임시 보관됨');
 const authored=()=>page.evaluate(()=>{const value=JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!);return {project:value.document.project,works:Object.fromEntries(Object.entries(value.works).map(([key,entry])=>[key,(entry as {project:unknown}).project]))};});
 await builtinShelfCard(page,'seonnyeo').getByRole('button',{name:/ 책 표지와 소개 보기(?: ·|$)/}).click();const focus=page.getByRole('dialog');await expect(focus).toBeVisible();await focus.getByLabel('바탕 판본',{exact:true}).selectOption('original');
 const before=await authored(),reports=[];
 async function capture(name:string,root:Locator){
  const geometry=await root.evaluate(node=>{const box=node.getBoundingClientRect();return {box:{x:box.x,y:box.y,width:box.width,height:box.height},clientWidth:node.clientWidth,scrollWidth:node.scrollWidth,clientHeight:node.clientHeight,scrollHeight:node.scrollHeight,controls:[...node.querySelectorAll('button,a,select,summary')].map(target=>{const rect=target.getBoundingClientRect();return {text:target.textContent,x:rect.x,y:rect.y,width:rect.width,height:rect.height,disabled:(target as HTMLButtonElement).disabled};}),texts:[...node.querySelectorAll('h1,h2,p,small,figcaption')].map(target=>({text:target.textContent,display:getComputedStyle(target).display,visible:!!(target as HTMLElement).offsetWidth&&!!(target as HTMLElement).offsetHeight}))};});
  reports.push({surface:name,geometry});await page.screenshot({path:info.outputPath(`${name}.png`),fullPage:true});
  await writeFile(info.outputPath('reflow-raw.json'),JSON.stringify({width,height,scope:'CSS layout viewport equivalent only; not actual browser zoom',reports},null,2)+'\n');
 }
 await capture('focus-initial',focus);
 const meta=focus.locator('section').first();
 for(const target of await meta.locator('h2,p,small').all())await expect.soft(target).toBeVisible();await expect.soft(focus.getByText('읽기 기록과 저장은 판본별로 보관해요. 편집하면 선택한 판본의 내 사본을 만들어요.',{exact:true})).toBeVisible();
 expect.soft(await focus.evaluate(node=>node.scrollWidth<=node.clientWidth+1)).toBe(true);
 await focus.locator('summary').filter({hasText:'책 꾸미기·작품 도구'}).click();
 for(const control of await focus.locator('button:not(:disabled),a,select,summary').all()){
  await control.click({trial:true});
  const box=await control.boundingBox();expect(box).not.toBeNull();
  expect.soft(box!.x).toBeGreaterThanOrEqual(0);expect.soft(box!.x+box!.width).toBeLessThanOrEqual(width+1);
 }
 await focus.getByRole('button',{name:'편집하기',exact:true}).scrollIntoViewIfNeeded();await expect(focus.getByRole('button',{name:'편집하기',exact:true})).toBeInViewport();await capture('focus-action-scrolled',focus);
 await focus.getByRole('button',{name:'원작 읽기',exact:true}).click();const start=page.getByRole('main',{name:'책 표지와 소개',exact:true});await expect(start).toBeVisible();await expect.poll(async()=>(await authored()).project.id).toBe(BUILTIN_WORKS.find(work=>work.id==='seonnyeo')!.originalDocumentId);
 const selected=await authored();await capture('book-start-initial',start);await expect.soft(start.locator('h1')).toHaveText('선녀와 나무꾼');await expect.soft(start.locator('p').filter({hasText:'이야기 시작'})).toBeVisible();
 const description=start.locator('section>p').filter({hasText:selected.project.description});await expect.soft(description).toBeVisible();expect.soft(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 for(const control of await start.locator('button:not(:disabled),summary').all())await control.click({trial:true});
 await start.getByRole('button',{name:'처음부터 읽기',exact:true}).scrollIntoViewIfNeeded();await expect(start.getByRole('button',{name:'처음부터 읽기',exact:true})).toBeInViewport();await capture('book-start-action-scrolled',start);expect(await authored()).toEqual(selected);for(const [key,project] of Object.entries(before.works))expect(selected.works[key]).toEqual(project);
 await start.getByRole('button',{name:'서재로',exact:true}).click();await expect(page.getByRole('main',{name:'로컬 서재',exact:true})).toBeVisible();
});
