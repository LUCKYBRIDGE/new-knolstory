import {test,expect} from '@playwright/test';
import axe from 'axe-core';
import {writeFile} from 'node:fs/promises';
import {startShelfCreation} from './library-entry';
for(const width of [1440,390])test(`visible host surfaces preserve label names and report A/AA findings ${width}`,async({page},info)=>{
 // Fullscreen offer has its own coverage; keep it from covering the phone-size surfaces under audit.
 await page.addInitScript(()=>{if(window===window.top)sessionStorage.setItem('knolstory-fullscreen-offered-v1','1');});
 await page.setViewportSize({width,height:900});
 const reports:{surface:string;result:unknown}[]=[],violations:{surface:string;id:string;targets:unknown}[]=[],scannerDisagreements:unknown[]=[];
 const path=info.outputPath('axe-host.json');
 async function persist(){await writeFile(path,JSON.stringify({scope:'Automated visible host DOM only. Iframes excluded; raw violations and incomplete checks retained. Scanner disagreements are separate review findings, not a WCAG pass.',width,reports,scannerDisagreements},null,2)+'\n');}
 async function scan(surface:string){
  await page.addScriptTag({content:axe.source});
  const result=await page.evaluate(async()=>{
   const engine=(window as typeof window & {axe:typeof axe}).axe;
   return engine.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']},iframes:false});
  });
  reports.push({surface,result});await persist();
  for(const issue of result.violations){
   const unresolved=[];
   for(const node of issue.nodes){
    const selector=node.target.length===1&&typeof node.target[0]==='string'?node.target[0]:undefined;
    if(issue.id==='label-content-name-mismatch'&&selector){
     const element=page.locator(selector);
     if(await element.count()===1&&await element.isVisible()&&await element.evaluate(node=>node.matches('button[data-shelf-cover="true"]'))){
      const visible=(await element.innerText()).replace(/\s+/g,' ').trim(),name=(await element.getAttribute('aria-label')??'').replace(/\s+/g,' ').trim();
      if(visible&&name.includes(visible)){
       await expect(element).toHaveAccessibleName(name);
       scannerDisagreements.push({surface,rule:issue.id,selector,raw:node,visible,name,reason:'Rendered block-separated label is included verbatim in computed accessible name; axe virtual text concatenates block boundaries. Raw finding retained for review.'});
       continue;
      }
     }
    }
    if(issue.id==='label-content-name-mismatch'&&selector){
     const element=page.locator(selector);
     if(await element.count()===1&&await element.isVisible()&&await element.evaluate(node=>node.matches('button[class*="libraryHome"],button[class*="launcher"][aria-describedby]'))){
      const primary=((await element.locator('strong').count()?await element.locator('strong').first().innerText():await element.innerText())).replace(/\s+/g,' ').trim(),name=(await element.getAttribute('aria-label')??'').replace(/\s+/g,' ').trim(),hint=await element.locator('small').count()?(await element.locator('small').innerText()).replace(/\s+/g,' ').trim():'';
      if(primary&&name.includes(primary)){
       await expect(element).toHaveAccessibleName(name);if(hint)await expect(element).toHaveAccessibleDescription(hint);
       scannerDisagreements.push({surface,rule:issue.id,selector,raw:node,visible:primary,name,hint,reason:'Visible primary label is included in the computed accessible name; any secondary hint is exposed as the accessible description. Raw finding retained for review.'});
       continue;
      }
     }
    }
    unresolved.push(node.target);
   }
   if(unresolved.length)violations.push({surface,id:issue.id,targets:unresolved});
  }
  await persist();
 }
 await page.goto('/?view=library');await expect(page.getByTestId('library-save-status')).toHaveText('임시 보관됨');await scan('library');
 await page.locator('[data-account-menu]>summary').click();await scan('account');await page.keyboard.press('Escape');await expect(page.locator('[data-online-works]')).toHaveCount(0);
 await startShelfCreation(page);await page.getByLabel('새 작품 제목',{exact:true}).fill('접근성 검사 원고');await page.getByRole('button',{name:'새 작품 생성',exact:true}).click();await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');await scan('writer');
 await page.goto('/shortstory');await expect(page.getByLabel('이야기 제목',{exact:true})).toBeVisible();await scan('short-writer');await page.getByRole('button',{name:'읽기',exact:true}).click();await expect(page.getByRole('region',{name:'숏스토리 읽기',exact:true})).toBeVisible();await scan('short-reader');
 await persist();await info.attach('axe-host',{path,contentType:'application/json'});
 expect(violations).toEqual([]);
});
test('bookshelf drawer exposes its existing label through a supported group role',async({page})=>{
 await page.goto('/?view=library');await expect(page.getByTestId('library-save-status')).toHaveText('임시 보관됨');await expect(page.getByRole('group',{name:'책장 서랍',exact:true})).toBeVisible();
});
