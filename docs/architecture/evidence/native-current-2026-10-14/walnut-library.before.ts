import {test,expect} from '@playwright/test';
import {enterLibrary} from './library-entry';
import {mkdirSync} from 'node:fs';
const evidence='docs/architecture/evidence/walnut-library';
test('owner-selected legacy honey oak finish keeps window wall clearance',async({page},info)=>{
 await page.setViewportSize({width:1200,height:900});await page.goto('/');await enterLibrary(page);
 const cabinet=page.locator('[data-cabinet-base]').locator('..');const oak=await cabinet.evaluate(node=>getComputedStyle(node).backgroundImage);expect(oak).toContain('152, 95, 48');expect(oak).toContain('99, 55, 22');expect(oak).not.toContain('80, 57, 43');
 const rect=await cabinet.boundingBox();expect(rect!.x-1200*.082).toBeGreaterThanOrEqual(24-1);await expect(page.locator('[data-shelf-book]')).toHaveCount(4);await page.screenshot({path:info.outputPath('legacy-honey-oak.png'),fullPage:true});
});
for(const [width,height] of [[1365,900],[820,1180],[390,844],[844,390],[320,740]])test(`walnut cabinet supports the plant and books at ${width}x${height}`,async({browser})=>{
 const context=await browser.newContext({viewport:{width,height},hasTouch:width<900});const page=await context.newPage();await page.goto('/');await enterLibrary(page);
 const cabinet=page.locator('[data-cabinet-base]').locator('..');
 const contact=await cabinet.evaluate(c=>{const plant=c.querySelector<HTMLElement>('[class*=topPlant]')!;const p=plant.getBoundingClientRect(),box=c.getBoundingClientRect();const shadow=getComputedStyle(plant,'::before');return {potFoot:p.y+p.height*(514/900),top:box.y,shadow:shadow.backgroundImage,plantPointer:getComputedStyle(plant).pointerEvents,sidePointer:getComputedStyle(c,'::after').pointerEvents};});
 expect(contact.potFoot-contact.top).toBeGreaterThanOrEqual(0);expect(contact.potFoot-contact.top).toBeLessThan(3);expect(contact.shadow).toContain('radial-gradient');expect(contact.plantPointer).toBe('none');expect(contact.sidePointer).toBe('none');
 const books=page.locator('[data-shelf-book]');await expect(books).toHaveCount(4);
 const touching=await books.evaluateAll(nodes=>nodes.map(book=>Math.abs(book.querySelector('[data-shelf-cover]')!.getBoundingClientRect().bottom-book.querySelector('[class*=plank]')!.getBoundingClientRect().top)));expect(Math.max(...touching)).toBeLessThanOrEqual(2);
 const sideGaps=await cabinet.boundingBox();expect(sideGaps!.x).toBeGreaterThanOrEqual(width>900?width*.07:20);expect(width-sideGaps!.x-sideGaps!.width).toBeGreaterThanOrEqual(width>900?width*.07:20);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);mkdirSync(evidence,{recursive:true});await page.screenshot({path:`${evidence}/after-${width}.png`,fullPage:true});
 await books.first().getByRole('button').click();await expect(page.getByRole('dialog').getByRole('button',{name:'원작 읽기',exact:true})).toBeVisible();await page.keyboard.press('Escape');await expect(books.first().getByRole('button')).toBeFocused();await context.close();
});

test('cabinet keeps two shelf rows with four books, a single match or an empty collection',async({page})=>{
 await page.setViewportSize({width:1365,height:900});await page.goto('/');await enterLibrary(page);
 const shelf=page.locator('[data-shelf-room]');await expect(shelf).toHaveAttribute('data-rows','2');await expect(page.locator('[data-cabinet-rail]')).toHaveCount(2);
 await page.getByLabel('책 분류',{exact:true}).selectOption('own');await expect(page.locator('[data-shelf-book]')).toHaveCount(0);await expect(shelf).toHaveAttribute('data-rows','2');await expect(page.locator('[data-cabinet-rail]')).toHaveCount(2);
 await page.getByLabel('책 분류',{exact:true}).selectOption('all');await page.getByTestId('library-tools').locator('summary').click();await page.getByRole('searchbox',{name:'책 찾기',exact:true}).fill('별주부전');await page.getByRole('searchbox',{name:'책 찾기',exact:true}).press('Enter');await expect(page.locator('[data-shelf-book]')).toHaveCount(1);await expect(shelf).toHaveAttribute('data-rows','2');await expect(page.locator('[data-cabinet-rail]')).toHaveCount(2);
});
