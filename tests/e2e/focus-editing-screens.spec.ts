import {test,expect,type Page} from '@playwright/test';
import {selectEditingScreen} from './authoring-file';
import {suppressFullscreenOffer} from './mobile-fullscreen-offer';
import {auditDensity} from './mobile-focus-audit';
/**
 * Focus editing screens (2026-11-24 rules, DESIGN.md ‘집중 편집 화면 규칙’): every screen keeps one compact
 * chapter/cut slot in the top bar, shows what the current cut says, has no second way to do the same
 * move, and closes with a small ×.
 */
test.beforeEach(async({page})=>{await suppressFullscreenOffer(page);});
const phone={width:390,height:844},narrow={width:320,height:700},tablet={width:768,height:1024},desktop={width:1280,height:800};
const screens=['basic','text','background','characters','audio','direction'] as const;
async function editor(page:Page,size:{width:number;height:number}){
 await page.setViewportSize(size);await page.goto('/?view=editor');await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
}
async function addCut(page:Page){
 const menu=page.locator('[data-work-menu]');if(!await menu.evaluate(node=>(node as HTMLDetailsElement).open))await menu.locator(':scope>summary').click();
 await menu.getByRole('button',{name:'현재 컷 뒤에 추가',exact:true}).click();
 if(await menu.evaluate(node=>(node as HTMLDetailsElement).open))await menu.locator(':scope>summary').click();
}
for(const size of [narrow,phone,tablet,desktop])test(`one compact chapter/cut slot on every screen ${size.width}x${size.height}`,async({page})=>{
 await editor(page,size);
 const text=page.locator('[data-current-cut] textarea').first();await text.fill('지금 컷에서 하는 말이에요.');
 await addCut(page);
 for(const screen of screens){
  await selectEditingScreen(page,screen);
  const nav=page.locator('[data-cut-nav]');
  await expect(nav).toBeVisible();
  // ‘1장 · 2컷’ to the eye, the full list in the select; one row of 36px, touch areas of 44px.
  await expect(nav).toContainText(/\d+장 · \d+컷/);
  const box=(await nav.boundingBox())!;expect(box.height).toBeLessThanOrEqual(44);expect(box.y).toBeLessThan(60);
  for(const name of ['이전 컷 편집','다음 컷 편집'])await expect(nav.getByRole('button',{name,exact:true})).toHaveCount(1);
  // No second way to move between cuts or back to 쓰기.
  await expect(page.getByRole('navigation',{name:'현재 컷 편집 이동',exact:true})).toHaveCount(0);
  await expect(page.getByRole('navigation',{name:'글 편집 중 컷 이동',exact:true})).toHaveCount(0);
  await expect(page.getByRole('button',{name:'← 쓰기로',exact:true})).toHaveCount(0);
  const density=await auditDensity(page,page.locator('main').first());
  expect(density.duplicates.filter(item=>/이전 컷|다음 컷|장과 컷/.test(item))).toEqual([]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }
});
for(const size of [phone,tablet])test(`every focus screen shows what the current cut says ${size.width}x${size.height}`,async({page})=>{
 await editor(page,size);
 const id=await page.getByLabel('현재 장과 컷 이동',{exact:true}).inputValue();
 await page.locator(`textarea[data-cut-id="${id}"]`).fill('바람이 대나무 숲을 지나갔다.');
 for(const screen of ['background','characters','audio','direction'] as const){
  await selectEditingScreen(page,screen);
  await expect(page.getByTestId(`editing-cut-${id}`).locator('[data-cut-text]')).toHaveText('바람이 대나무 숲을 지나갔다.');
 }
 // The text is always there, so 함께 보기 no longer offers it.
 await expect(page.getByRole('checkbox',{name:'글 함께 보기',exact:true})).toHaveCount(0);
});
test('phones reach every kind of work from the top bar and keep the writing first',async({page})=>{
 await editor(page,phone);
 const tabs=page.getByRole('navigation',{name:'편집 작업',exact:true});
 await expect(tabs).toBeVisible();
 await expect(tabs.getByRole('button',{name:'원고',exact:true})).toBeVisible();
 await tabs.getByRole('button',{name:'원고',exact:true}).click();
 await expect(page.locator('[data-screen]').first()).toHaveAttribute('data-screen','text');
 await tabs.getByRole('button',{name:'쓰기',exact:true}).click();
 // The plain previous/next cards are gone on phones; the writing follows the stage directly.
 const stage=(await page.locator('[data-editing-body] > div').first().boundingBox())!,current=(await page.locator('[data-current-cut]').boundingBox())!;
 expect(current.y-(stage.y+stage.height)).toBeLessThanOrEqual(16);
 for(const button of await tabs.getByRole('button').all()){const b=(await button.boundingBox())!;expect(b.height).toBeGreaterThanOrEqual(32);expect(b.height).toBeLessThanOrEqual(36);}
});
test('menus close with a small ×',async({page})=>{
 await editor(page,phone);
 const menu=page.locator('[data-work-menu]');await menu.locator(':scope>summary').click();
 const close=page.getByRole('button',{name:'편집 설정 닫기',exact:true});
 await expect(close).toHaveText('');
 const box=(await close.boundingBox())!;expect(box.width).toBeLessThanOrEqual(36);expect(box.height).toBeLessThanOrEqual(36);
 await close.click();await expect(menu).not.toHaveAttribute('open','');
});
