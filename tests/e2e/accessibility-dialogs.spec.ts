import {test,expect,type Page,type Locator,type TestInfo} from '@playwright/test';
import axe from 'axe-core';
import {writeFile} from 'node:fs/promises';
import {startShelfCreation,shelfCoverButton,builtinShelfCard} from './library-entry';
const authored=(page:Page)=>page.evaluate(()=>{const state=JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!);return {active:state.document.project,works:Object.fromEntries(Object.entries(state.works).map(([id,document])=>[id,(document as {project:unknown}).project]))};});
async function create(page:Page){await page.goto('/?view=library');await expect(page.getByTestId('library-save-status')).toHaveText('임시 보관됨');await startShelfCreation(page);await page.getByLabel('새 작품 제목',{exact:true}).fill('열린 화면 접근성 검사');await page.getByRole('button',{name:'새 작품 생성',exact:true}).click();await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');}
async function scan(page:Page,root:Locator,surface:string,info:TestInfo){
 await page.addScriptTag({content:axe.source});
 const result=await root.evaluate(async node=>{const engine=(window as typeof window & {axe:typeof axe}).axe;return engine.run(node,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']},iframes:false});});
 const path=info.outputPath(`${surface}-axe.json`);await writeFile(path,JSON.stringify({surface,scope:'Active surface only; raw label/scanner disagreements and incomplete checks retained for separate DOM review. No full WCAG claim.',result},null,2)+'\n');await info.attach(surface+'-axe',{path,contentType:'application/json'});
 const unresolved=[],scannerDisagreements=[];
 for(const issue of result.violations)for(const node of issue.nodes){
  const selector=node.target.length===1&&typeof node.target[0]==='string'?node.target[0]:undefined;
  if(issue.id==='label-content-name-mismatch'&&selector){
   const action=root.locator(selector);
   if(await action.count()===1&&await action.isVisible()&&await action.evaluate(node=>node.matches('button[data-focus-action],a[data-focus-action]'))){
    const label=await action.locator('strong').innerText(),hint=await action.locator('small').innerText();expect(label.trim()).not.toBe('');expect(hint.trim()).not.toBe('');
    await expect(action).toHaveAccessibleName(label);await expect(action).toHaveAccessibleDescription(hint);
    scannerDisagreements.push({rule:issue.id,selector,label,hint,raw:node,reason:'Primary visible action label is the computed name; the separate visible hint is its computed description.'});continue;
   }
  }
  unresolved.push({rule:issue.id,raw:node});
 }
 await writeFile(path,JSON.stringify({surface,result,scannerDisagreements,scope:'Active surface raw findings retained; only verified primary-name/separate-description controls are classified as scanner disagreements. No global rule exclusion.'},null,2)+'\n');
 expect(unresolved).toEqual([]);
}
for(const width of [1440,390])for(const kind of ['own','builtin'] as const)test(`book focus exposes visible close label and action descriptions ${kind} ${width}`,async({page},info)=>{
 await page.setViewportSize({width,height:900});
 if(kind==='own'){await create(page);await page.getByRole('button',{name:'서재로',exact:true}).click();}else{await page.goto('/?view=library');await expect(page.getByTestId('library-save-status')).toHaveText('임시 보관됨');}
 const opener=kind==='own'?shelfCoverButton(page,'열린 화면 접근성 검사'):builtinShelfCard(page,'seonnyeo').getByRole('button',{name:/ 책 표지와 소개 보기(?: ·|$)/});const before=await authored(page);await opener.click();const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();
 const close=dialog.locator('header button');await expect.soft(close).toHaveAccessibleName('닫기 · 서재로 돌아가기',{timeout:500});await expect(close).toHaveText('닫기');
 await dialog.getByText('책 꾸미기·작품 도구',{exact:true}).click();const actions=dialog.locator('button:has(strong),a:has(strong)');expect(await actions.count()).toBeGreaterThanOrEqual(7);const descriptions=[];
 for(const action of await actions.all()){
  const name=await action.locator('strong').innerText(),description=await action.locator('small').innerText();await expect(action).toHaveAccessibleName(name);await expect.soft(action).toHaveAccessibleDescription(description,{timeout:500});descriptions.push({name,description,ids:await action.getAttribute('aria-describedby')});
 }
 const ids=descriptions.map(item=>item.ids);expect(ids.every(Boolean)).toBe(true);expect(new Set(ids).size).toBe(ids.length);expect(await page.evaluate(ids=>ids.every(id=>Array.from(document.querySelectorAll('[id]')).filter(node=>node.id===id).length===1),ids)).toBe(true);
 await scan(page,dialog,'focus-open-tools',info);
 const last=actions.last();await last.focus();await page.keyboard.press('Tab');await expect(close).toBeFocused();await page.keyboard.press('Shift+Tab');await expect(last).toBeFocused();await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(opener).toBeFocused();await opener.click();await close.focus();await close.press('Enter');await expect(dialog).toHaveCount(0);await expect(opener).toBeFocused();expect(await authored(page)).toEqual(before);
 await writeFile(info.outputPath('action-descriptions.json'),JSON.stringify({kind,width,descriptions,scope:'Computed names/descriptions, explicit boundary Tab traversal and Escape return; no real screen-reader/voice claim.'},null,2)+'\n');
});
for(const width of [1440,390])test(`preparation cover and recovery surfaces retain names and authored content ${width}`,async({page},info)=>{
 await page.setViewportSize({width,height:900});await create(page);const menu=page.locator('[data-work-menu]');await menu.locator(':scope>summary').click();await page.getByRole('button',{name:'작품 정보·표지',exact:true}).click();await expect(page.getByTestId('preparation-save-status')).toHaveText('임시 보관됨');const before=await authored(page),preparation=page.getByRole('region',{name:'작품 설정',exact:true});await scan(page,preparation,'preparation',info);
 await page.getByRole('button',{name:'책 표지 편집',exact:true}).click();const cover=page.getByRole('dialog',{name:'내 책 표지 꾸미기',exact:true});await expect(cover).toBeVisible();await expect.soft(cover.getByRole('group',{name:'표지 직접 조정',exact:true})).toBeVisible({timeout:500});await scan(page,cover,'cover-editor',info);await page.keyboard.press('Escape');await expect(cover).toHaveCount(0);expect(await authored(page)).toEqual(before);
 if(!await menu.evaluate(node=>(node as HTMLDetailsElement).open))await menu.locator(':scope>summary').click();const summary=page.getByText('이전 원고',{exact:true});await summary.click();const recovery=summary.locator('..');const record=recovery.getByRole('button',{name:'현재 원고 보관',exact:true});await record.focus();await record.press('Enter');await expect(recovery.getByRole('button',{name:'이 원고를 사본으로 열기',exact:true})).toBeVisible();await scan(page,recovery,'recovery',info);expect(await authored(page)).toEqual(before);
});
for(const width of [1440,390])test(`open surface chrome contrast against actual backgrounds ${width}`,async({page},info)=>{
 const {renderedTextContrast}=await import('./rendered-contrast');await page.setViewportSize({width,height:900});await page.emulateMedia({reducedMotion:'reduce'});await create(page);await page.getByRole('button',{name:'서재로',exact:true}).click();await shelfCoverButton(page,'열린 화면 접근성 검사').click();const focus=page.getByRole('dialog');await expect(focus).toBeVisible();await focus.getByText('책 꾸미기·작품 도구',{exact:true}).click();const reports=[];
 async function measure(surface:string,targets:Locator){for(let index=0;index<await targets.count();index++){const target=targets.nth(index);if(!await target.isVisible())continue;const value=await renderedTextContrast(target,info.outputPath(`${surface}-${index}`));const threshold=value.info.fontSize>=24||value.info.fontSize>=56/3&&value.info.fontWeight>=700?3:4.5;reports.push({surface,threshold,...value});}}
 await measure('book-focus',focus.locator('header p,header button,figcaption,h2,section>p,[data-focus-action]>strong,[data-focus-action]>small'));
 await focus.getByRole('button',{name:'작품 정보·기획',exact:true}).click();await expect(page.getByTestId('preparation-save-status')).toHaveText('임시 보관됨');await page.getByRole('button',{name:'책 표지 편집',exact:true}).click();const cover=page.getByRole('dialog',{name:'내 책 표지 꾸미기',exact:true});await expect(cover).toBeVisible();
 await measure('cover-editor',cover.locator('header h2,header small,header>button,footer>button'));
 await page.keyboard.press('Escape');const menu=page.locator('[data-work-menu]');if(!await menu.evaluate(node=>(node as HTMLDetailsElement).open))await menu.locator(':scope>summary').click();const summary=page.getByText('이전 원고',{exact:true});await summary.click();const recovery=summary.locator('..');await recovery.getByRole('button',{name:'현재 원고 보관',exact:true}).click();await expect(recovery.getByRole('button',{name:'이 원고를 사본으로 열기',exact:true})).toBeVisible();await measure('recovery',recovery.locator('p,button,strong,time,li span'));
 const path=info.outputPath('open-surface-contrast.json');await writeFile(path,JSON.stringify({width,reports,scope:'Selected plain-text service chrome on actual rendered backgrounds; authored cover preview colors and all fields are not covered.'},null,2)+'\n');await info.attach('open-surface-contrast',{path,contentType:'application/json'});
 expect(reports.length).toBeGreaterThan(10);for(const report of reports)expect(report.minimum,`${report.surface}: ${report.info.text}`).toBeGreaterThanOrEqual(report.threshold);
});
