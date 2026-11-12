import {test,expect,type Page,type Locator} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {startShelfCreation} from './library-entry';
import {suppressFullscreenOffer} from './mobile-fullscreen-offer';
const evidence='docs/architecture/evidence/accessibility-contrast-2026-10-17';
async function authored(page:Page){return page.evaluate(()=>{const value=JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!);return {project:value.document.project,works:Object.fromEntries(Object.entries({...value.works,[value.storyId]:value.document}).map(([key,entry])=>[key,(entry as {project:unknown}).project]))};});}
async function named(control:Locator,name:string,text:string){
 await expect(control).toHaveAccessibleName(name);await expect(control).toHaveText(text);
 return {role:'button',visibleText:await control.innerText(),expectedName:name,computedAriaSnapshot:await control.ariaSnapshot(),enabled:await control.isEnabled()};
}
for(const width of [390,1440])test(`abbreviated control names and keyboard activation ${width}`,async({page})=>{
 await suppressFullscreenOffer(page);
 await page.setViewportSize({width,height:900});await page.goto('/?view=editor');await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 const controls:Awaited<ReturnType<typeof named>>[]=[];let preview:{first:string,second:string,returned:string,authoredPreserved:boolean}|null=null;
 if(width>=1000){
  const menu=page.locator('[data-work-menu]');await menu.locator(':scope>summary').click();await page.getByText('편집 설정',{exact:true}).click();await page.getByRole('checkbox',{name:'음향 편집 사용',exact:true}).check();await page.getByRole('checkbox',{name:'연출 편집 사용',exact:true}).check();await page.getByRole('combobox',{name:'편집화면 선택',exact:true}).selectOption('audio-direction');
  const timeline=page.locator('[data-combined-timeline]'),previous=timeline.getByRole('button',{name:'이전 컷',exact:true}),next=timeline.getByRole('button',{name:'다음 컷',exact:true});
  controls.push(await named(previous,'이전 컷','‹'),await named(next,'다음 컷','›'));
  const position=page.getByLabel('현재 장과 컷 이동',{exact:true}),first=await position.inputValue(),before=await authored(page);await expect(next).toBeEnabled();await next.focus();await expect(next).toBeFocused();await next.press('Enter');await expect(position).not.toHaveValue(first);const second=await position.inputValue();await expect(previous).toBeEnabled();await previous.focus();await expect(previous).toBeFocused();await previous.press('Enter');await expect(position).toHaveValue(first);await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
  expect(await authored(page)).toEqual(before);preview={first,second,returned:first,authoredPreserved:true};
 }
 await page.getByRole('button',{name:'홈 · 서재로 이동',exact:true}).click();await expect(page.getByTestId('library-save-status')).toHaveText('임시 보관됨');
 for(let index=0;index<(width===390?3:7);index++){
  await startShelfCreation(page);await page.getByLabel('새 작품 제목',{exact:true}).fill(`접근 이름 확인 작품 ${index+1}`);await page.getByRole('button',{name:'새 작품 생성',exact:true}).click();await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');await page.getByRole('button',{name:'홈 · 서재로 이동',exact:true}).click();await expect(page.getByTestId('library-save-status')).toHaveText('임시 보관됨');
 }
 const shelf=page.getByRole('navigation',{name:'서재 선반 페이지',exact:true}),back=shelf.getByRole('button',{name:'이전 선반',exact:true}),forward=shelf.getByRole('button',{name:'다음 선반',exact:true});controls.push(await named(back,'이전 선반','‹'),await named(forward,'다음 선반','›'));
 const projects=await authored(page),status=shelf.getByRole('status'),initialPage=await status.innerText();await expect(forward).toBeEnabled();await forward.focus();await expect(forward).toBeFocused();await forward.press('Enter');await expect(status).not.toHaveText(initialPage);const advancedPage=await status.innerText();await expect(back).toBeEnabled();await back.focus();await expect(back).toBeFocused();await back.press('Enter');await expect(status).toHaveText(initialPage);expect(await authored(page)).toEqual(projects);
 mkdirSync(evidence,{recursive:true});writeFileSync(`${evidence}/control-names-${width}.json`,JSON.stringify({width,scope:'DOM accessible names and explicit programmatic focus plus Enter; no screen-reader, sequential Tab order or voice claims',controls,actions:{preview,shelf:{initialPage,advancedPage,returnedPage:await status.innerText(),authoredPreserved:true}}},null,2)+'\n');
});
