import {test,expect,type Locator} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
import {builtinShelfCard} from './library-entry';
import {BUILTIN_WORKS} from '../../apps/web/lib/builtin-works';
import {renderedTextContrast} from './rendered-contrast';
for(const width of [390,1440])test(`original large front cover contrast on actual backgrounds ${width}`,async({page},info)=>{
 await page.setViewportSize({width,height:900});await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/?view=library');await expect(page.getByTestId('library-save-status')).toHaveText('임시 보관됨');
 const reports=[];
 const authored=()=>page.evaluate(()=>{const value=JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!);return {project:value.document.project,works:Object.fromEntries(Object.entries(value.works).map(([key,entry])=>[key,(entry as {project:unknown}).project]))};});
 async function measure(surface:string,root:Locator){
  await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(image=>image.complete?Promise.resolve():new Promise<void>(resolve=>{image.addEventListener('load',()=>resolve(),{once:true});image.addEventListener('error',()=>resolve(),{once:true});})));});
  const authoredBefore=await authored();
  const targets=root.locator('[data-cover-face="front"] h2,[data-cover-face="front"] p,[data-cover-face="front"] span[class*="edition"]');
  expect(await targets.count()).toBeGreaterThan(0);
  for(let index=0;index<await targets.count();index++){
   const target=targets.nth(index);if(!await target.isVisible())continue;
   const value=await renderedTextContrast(target,info.outputPath(`${surface}-${index}`));
   const large=value.info.fontSize>=24||(value.info.fontSize>=56/3&&value.info.fontWeight>=700);
   reports.push({surface,large,threshold:large?3:4.5,...value});
  }
  expect(await authored()).toEqual(authoredBefore);
 }
 for(const work of ['seonnyeo','heungbu','onggojib','rabbit']){
  await builtinShelfCard(page,work).getByRole('button',{name:/ 책 표지와 소개 보기(?: ·|$)/}).click();const focus=page.getByRole('dialog');await expect(focus).toBeVisible();await focus.getByLabel('바탕 판본',{exact:true}).selectOption('original');await measure(`${work}-focus`,focus);
  await focus.getByRole('button',{name:'원작 읽기',exact:true}).click();const start=page.getByRole('main',{name:'책 표지와 소개',exact:true});await expect(start).toBeVisible();
  const selectedId=BUILTIN_WORKS.find(item=>item.id===work)!.originalDocumentId;
  // BookStart renders before the debounced workspace writer commits selection.
  // Begin the immutable measurement window only after that intended write.
  await expect.poll(async()=>(await authored()).project.id).toBe(selectedId);
  await expect.poll(async()=>(await authored()).project.title).toBe(await start.locator('h1').innerText());
  await measure(`${work}-book-start`,start);
  await start.getByRole('button',{name:'서재로',exact:true}).click();await expect(page.getByTestId('library-save-status')).toHaveText('임시 보관됨');
 }
 const path=info.outputPath('large-cover-initial.json');await writeFile(path,JSON.stringify({width,scope:'Actual default original front covers; classified by rendered CSS font size and weight; book-start only without native playback',reports},null,2)+'\n');await info.attach('large-cover-initial',{path,contentType:'application/json'});
 for(const report of reports)expect.soft(report.minimum,`${report.surface}: ${report.info.text}; ${report.info.fontSize}px/${report.info.fontWeight}; threshold ${report.threshold}`).toBeGreaterThanOrEqual(report.threshold);
});
