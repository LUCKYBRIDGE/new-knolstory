import {test,expect,type Locator} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
import {builtinShelfCard} from './library-entry';
import {renderedTextContrast} from './rendered-contrast';
for(const width of [390,1440])test(`original large front cover contrast on actual backgrounds ${width}`,async({page},info)=>{
 await page.setViewportSize({width,height:900});await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/?view=library');await expect(page.getByTestId('library-save-status')).toHaveText('임시 보관됨');
 const reports=[];
 const authored=()=>page.evaluate(()=>{const value=JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!);return {project:value.document.project,works:Object.fromEntries(Object.entries({...value.works,[value.storyId]:value.document}).map(([key,entry])=>[key,(entry as {project:unknown}).project]))};});
 async function measure(surface:string,root:Locator){
  await root.evaluate(async node=>{await document.fonts.ready;await Promise.all([...node.querySelectorAll('img')].filter(image=>image.loading!=='lazy'||image.getBoundingClientRect().top<innerHeight).map(image=>image.complete?Promise.resolve():new Promise<void>(resolve=>{image.addEventListener('load',()=>resolve(),{once:true});image.addEventListener('error',()=>resolve(),{once:true});})));});
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
  await builtinShelfCard(page,work).getByRole('button',{name:/ 책 표지와 소개 보기(?: ·|$)/}).click();const focus=page.getByRole('dialog');await expect(focus).toBeVisible();
  // The dialog shows the shelf's representative cover — the original front cover of every built-in work.
  const before=await authored();await expect(focus).toHaveAttribute('data-cover-edition','original');await measure(`${work}-focus`,focus);
  await page.keyboard.press('Escape');await expect(focus).toHaveCount(0);expect(await authored()).toEqual(before);
 }
 const path=info.outputPath('large-cover-initial.json');await writeFile(path,JSON.stringify({width,scope:'Actual default original front covers; classified by rendered CSS font size and weight; book dialog only without native playback',reports},null,2)+'\n');await info.attach('large-cover-initial',{path,contentType:'application/json'});
 for(const report of reports)expect.soft(report.minimum,`${report.surface}: ${report.info.text}; ${report.info.fontSize}px/${report.info.fontWeight}; threshold ${report.threshold}`).toBeGreaterThanOrEqual(report.threshold);
});
