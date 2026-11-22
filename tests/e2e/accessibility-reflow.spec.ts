import {test,expect,type Locator} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
import {builtinShelfCard,openBookMore} from './library-entry';
import {BUILTIN_WORKS} from '../../apps/web/lib/builtin-works';
for(const [width,height] of [[320,256],[640,360],[320,740]])test(`book service text and actions reflow at CSS viewport ${width}x${height}`,async({page},info)=>{
 await page.setViewportSize({width,height});await page.goto('/?view=library');await expect(page.getByTestId('library-save-status')).toHaveText('임시 보관됨');
 const authored=()=>page.evaluate(()=>{const value=JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!);return {project:value.document.project,works:Object.fromEntries(Object.entries({...value.works,[value.storyId]:value.document}).map(([key,entry])=>[key,(entry as {project:unknown}).project]))};});
 await builtinShelfCard(page,'seonnyeo').getByRole('button',{name:/ 책 표지와 소개 보기(?: ·|$)/}).click();const focus=page.getByRole('dialog');await expect(focus).toBeVisible();await focus.getByRole('radio',{name:'원작',exact:true}).check();
 const before=await authored(),reports=[];
 async function capture(name:string,root:Locator){
  const geometry=await root.evaluate(node=>{const box=node.getBoundingClientRect();return {box:{x:box.x,y:box.y,width:box.width,height:box.height},clientWidth:node.clientWidth,scrollWidth:node.scrollWidth,clientHeight:node.clientHeight,scrollHeight:node.scrollHeight,controls:[...node.querySelectorAll('button,a,input,summary')].map(target=>{const rect=target.getBoundingClientRect();return {text:target.textContent,x:rect.x,y:rect.y,width:rect.width,height:rect.height,disabled:(target as HTMLButtonElement).disabled};}),texts:[...node.querySelectorAll('h1,h2,p,small,figcaption')].map(target=>({text:target.textContent,display:getComputedStyle(target).display,visible:!!(target as HTMLElement).offsetWidth&&!!(target as HTMLElement).offsetHeight}))};});
  reports.push({surface:name,geometry});await page.screenshot({path:info.outputPath(`${name}.png`),fullPage:true});
  await writeFile(info.outputPath('reflow-raw.json'),JSON.stringify({width,height,scope:'CSS layout viewport equivalent only; not actual browser zoom',reports},null,2)+'\n');
 }
 await capture('focus-initial',focus);
 const meta=focus.locator('section').first();
 for(const target of await meta.locator(':scope>h2,:scope>p,:scope>small').all())await expect.soft(target).toBeVisible();await expect.soft(focus.getByText('원작 이야기를 그대로 읽어요',{exact:true})).toBeVisible();
 expect.soft(await focus.evaluate(node=>node.scrollWidth<=node.clientWidth+1)).toBe(true);
 await openBookMore(focus);
 for(const control of await focus.locator('button:not(:disabled),a,input,summary').all()){
  await control.click({trial:true});
  const box=await control.boundingBox();expect(box).not.toBeNull();
  expect.soft(box!.x).toBeGreaterThanOrEqual(0);expect.soft(box!.x+box!.width).toBeLessThanOrEqual(width+1);
 }
 await focus.getByRole('button',{name:'내 사본으로 편집',exact:true}).scrollIntoViewIfNeeded();await expect(focus.getByRole('button',{name:'내 사본으로 편집',exact:true})).toBeInViewport();await capture('focus-action-scrolled',focus);
 // Reading chosen in the dialog opens the story itself; the title page stays for the home screen, so reflow it from there.
 await focus.getByRole('button',{name:'원작 읽기',exact:true}).click();await expect(page.getByRole('main',{name:'책 표지와 소개',exact:true})).toHaveCount(0);await expect.poll(async()=>(await authored()).project.id).toBe(BUILTIN_WORKS.find(work=>work.id==='seonnyeo')!.originalDocumentId);
 await page.goto('/');await page.getByRole('button',{name:/이야기 읽기/}).click();const start=page.getByRole('main',{name:'책 표지와 소개',exact:true});await expect(start).toBeVisible();
 const selected=await authored();await capture('book-start-initial',start);await expect.soft(start.locator('h1')).not.toHaveText('');
 await expect.soft(start.locator('section>p').first()).toBeVisible();expect.soft(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 for(const control of await start.locator('button:not(:disabled),summary').all())await control.click({trial:true});
 const read=start.locator('[data-book-start-action]').first();await read.scrollIntoViewIfNeeded();await expect(read).toBeInViewport();await capture('book-start-action-scrolled',start);expect((await authored()).works).toEqual(selected.works);for(const [key,project] of Object.entries(before.works))expect(selected.works[key]).toEqual(project);
 await start.getByRole('button',{name:'서재로',exact:true}).click();await expect(page.getByRole('main',{name:'놀스토리 서재',exact:true})).toBeVisible();
});
