import {chromium,expect} from '@playwright/test';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {mkdirSync,writeFileSync} from 'node:fs';
const root='docs/architecture/evidence/combined-navigation-2026-10-21/browser-v2';mkdirSync(root,{recursive:true});
const browser=await chromium.launch();const errors=[];const observations=[];
for(const size of [{width:1280,height:800},{width:390,height:844},{width:844,height:390}]){
 const context=await browser.newContext({viewport:size,hasTouch:true});const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));await page.goto(pathToFileURL(resolve('docs/architecture/evidence/editor-finish-2026-10-21/audio-direction-concept.html')).href);
 const viewport=page.getByRole('region',{name:'음향·연출 작업 영역',exact:true}),canvas=page.locator('#timeline-canvas');
 await expect(page.getByLabel('지속 시간 (초)',{exact:true})).toBeHidden();
 const original=await page.locator('#origin').textContent();await page.getByRole('button',{name:'확대',exact:true}).click();await expect(page.locator('#zoom-value')).toHaveText('150%');await page.getByLabel('확대 비율',{exact:true}).selectOption('400');await expect(page.locator('#zoom-value')).toHaveText('400%');
 expect(await viewport.evaluate(el=>el.scrollWidth>el.clientWidth*2)).toBe(true);
 await page.getByRole('button',{name:'다음 컷',exact:true}).click();await expect(page.locator('#cut-title')).toHaveText('3컷 · 재회');expect(await viewport.evaluate(el=>el.scrollLeft)).toBeGreaterThan(0);
 await page.getByRole('button',{name:'다음 컷',exact:true}).click();await expect(page.getByRole('button',{name:'다음 컷',exact:true})).toBeDisabled();await page.getByRole('button',{name:'이전 컷',exact:true}).click();await expect(page.locator('#cut-title')).toHaveText('3컷 · 재회');
 await page.getByRole('button',{name:'3컷으로 이동',exact:true}).focus();await page.keyboard.press('Enter');await expect(page.getByRole('button',{name:'3컷으로 이동',exact:true})).toBeFocused();
 await viewport.focus();await page.keyboard.press('Home');await expect.poll(()=>viewport.evaluate(el=>el.scrollLeft)).toBe(0);await page.keyboard.press('ArrowRight');expect(await viewport.evaluate(el=>el.scrollLeft)).toBeGreaterThan(0);
 await viewport.hover();await page.keyboard.down('Shift');await page.mouse.wheel(0,200);await page.keyboard.up('Shift');expect(await viewport.evaluate(el=>el.scrollLeft)).toBeGreaterThan(80);
 await viewport.focus();await page.keyboard.press('Home');await page.getByRole('button',{name:'화면 이동',exact:true}).click();const box=await viewport.boundingBox();await page.mouse.move(box.x+box.width*.8,box.y+box.height*.6);await page.mouse.down();await page.mouse.move(box.x+box.width*.25,box.y+box.height*.3,{steps:8});await page.mouse.up();expect(await viewport.evaluate(el=>el.scrollLeft)).toBeGreaterThan(30);await expect(page.locator('#origin')).toHaveText(original);
 expect(await viewport.evaluate(el=>el.scrollHeight>el.clientHeight)).toBe(true);await viewport.hover();await page.mouse.wheel(0,300);await expect.poll(()=>viewport.evaluate(el=>el.scrollTop)).toBeGreaterThan(0);
 await viewport.focus();await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'화면 이동',exact:true})).toHaveAttribute('aria-pressed','false');
 await page.getByRole('button',{name:'전체 보기',exact:true}).click();await expect(page.locator('#zoom-value')).toHaveText('100%');expect(await viewport.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
 await page.getByRole('button',{name:'컷 안의 시간 보기',exact:true}).click();await expect(page.locator('#scope')).toContainText('3컷의 시작 기준');await expect(page.locator('[data-item=effect]')).toBeHidden();await expect(page.locator('[data-item=actor]')).toBeVisible();
 await page.getByRole('button',{name:'다음 컷',exact:true}).click();await expect(page.locator('#outside-cut')).toBeVisible();await page.getByRole('button',{name:'이전 컷',exact:true}).click();await expect(page.locator('#outside-cut')).toBeHidden();
 await page.getByRole('button',{name:'이전 컷',exact:true}).click();await expect(page.locator('#scope')).toContainText('2컷의 시작 기준');await expect(page.locator('[data-item=effect]')).toBeVisible();await expect(page.locator('[data-item=actor]')).toBeHidden();
 await page.getByRole('button',{name:'확대',exact:true}).click();await viewport.focus();await page.keyboard.press('+');await expect(page.locator('#zoom-value')).toHaveText('200%');await page.keyboard.press('-');await expect(page.locator('#zoom-value')).toHaveText('150%');
 await viewport.hover();await page.keyboard.down('Control');await page.mouse.wheel(0,-120);await page.keyboard.up('Control');await expect(page.locator('#zoom-value')).toHaveText('200%');
 await page.getByRole('button',{name:'컷별 적용 구간 보기',exact:true}).click();await page.getByRole('button',{name:'현재 컷으로',exact:true}).click();
 await expect(page.locator('#origin')).toHaveText(original);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 if(size.width===390){await page.getByRole('button',{name:'확대',exact:true}).tap();await expect(page.locator('#zoom-value')).toHaveText('250%');await page.getByRole('button',{name:'축소',exact:true}).tap();await expect(page.locator('#zoom-value')).toHaveText('200%');}
 const label=page.locator('.track>span').first();const bounds=await label.boundingBox(),area=await viewport.boundingBox();expect(bounds.x).toBeGreaterThanOrEqual(area.x-1);expect(bounds.x+bounds.width).toBeLessThanOrEqual(area.x+110);
 await page.screenshot({path:`${root}/navigation-${size.width}.png`,fullPage:true});observations.push({size,zoom:await page.locator('#zoom-value').textContent(),scroll:await viewport.evaluate(el=>({left:el.scrollLeft,top:el.scrollTop,width:el.scrollWidth,height:el.scrollHeight})),unchangedOrigin:await page.locator('#origin').textContent()});await context.close();
}
expect(errors).toEqual([]);writeFileSync(`${root}/browser-observations.json`,JSON.stringify({errors,observations},null,2));console.log('3 viewport navigation checks passed: zoom, anchor pan, previous/next boundaries, keyboard, wheel, drag, sticky labels, vertical scroll, per-cut timing and unchanged settings.');await browser.close();
