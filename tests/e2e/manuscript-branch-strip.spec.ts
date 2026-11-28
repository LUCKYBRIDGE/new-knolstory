import {test,expect,type Page} from '@playwright/test';
import {enterLibrary,openBuiltinEdition} from './library-entry';
import {openChoiceEditing,openEditingScreen} from './editor-screens';
import {suppressFullscreenOffer} from './mobile-fullscreen-offer';

// 원고 · 갈래 줄 (2026-11-28): 원고 stays one path (one chapter); under a choice cut a strip shows every way at once, each can be
// peeked at (read only) or opened in 원고, and a way's chapter starts with where it came from and the other ways.
const choiceStrip=(page:Page)=>page.locator('[data-screen="text"] [data-branch-strip="choice"]');
const originStrip=(page:Page)=>page.locator('[data-screen="text"] [data-branch-strip="origin"]');

async function findChoiceChapter(page:Page){
 const cuts=page.getByLabel('현재 장과 컷 이동');
 const values=await cuts.locator('option').evaluateAll(options=>options.map(option=>(option as HTMLOptionElement).value));
 for(const value of values){
  await cuts.selectOption(value);
  if(await choiceStrip(page).count())return;
 }
 throw Error('no choice cut');
}

for(const viewport of [{width:1280,height:800},{width:390,height:844}])test(`갈래 줄 in 원고 · ${viewport.width}`,async({page},info)=>{
 test.skip(info.project.name!=='host');test.setTimeout(180_000);
 await suppressFullscreenOffer(page);await page.setViewportSize(viewport);await page.goto('/');await enterLibrary(page);
 await openBuiltinEdition(page,'rabbit','knolstory','edit');
 await openEditingScreen(page,'원고');
 await findChoiceChapter(page);
 const strip=choiceStrip(page);
 await expect(strip.getByText('갈래 · 어느 길을 이어서 쓸까요?')).toBeVisible();
 const ways=strip.getByRole('button',{name:/^[A-Z]\. .+ →/});
 expect(await ways.count()).toBeGreaterThan(1);
 const first=(await ways.nth(0).locator('b').textContent())!.replace(/ →$/,''),second=(await ways.nth(1).locator('b').textContent())!.replace(/ →$/,'');
 await expect(ways.nth(0)).toContainText(/장.* · \d+컷/);
 // The ways share the strip's width instead of narrow fixed columns.
 const share=await strip.evaluate(node=>{const ways=[...node.querySelectorAll(':scope>[data-current], :scope>div:has(>button)')];return ways.reduce((sum,way)=>sum+way.getBoundingClientRect().width,0)/node.clientWidth;});
 expect(share).toBeGreaterThan(.85);
 // 펼쳐 보기: the way's cuts, read only.
 const peek=strip.locator('details').first();
 await peek.locator('summary').click();
 await expect(peek.locator('li').first()).toBeVisible();
 await expect(peek.locator('textarea')).toHaveCount(0);
 await strip.scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath('branch-strip.png')});
 // Open way A: 원고 moves to its chapter, which starts with where it came from.
 await ways.nth(0).click();
 const origin=originStrip(page);
 await expect(origin).toBeVisible();
 await expect(origin.getByText(/선택지에서 왔어요$/)).toBeVisible();
 await expect(origin.getByRole('button',{name:new RegExp(`^${first.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')} · 지금 쓰는 갈래`)})).toHaveAttribute('aria-current','true');
 await expect(page.locator('[data-screen="text"] textarea[data-cut-id]').first()).toBeEditable();
 // Switch to way B straight from here.
 await origin.getByRole('button',{name:new RegExp(`^${second.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')} →`)}).click();
 await expect(originStrip(page).getByRole('button',{name:new RegExp(`^${second.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')} · 지금 쓰는 갈래`)})).toBeVisible();
 // And back to the choice.
 await originStrip(page).getByRole('button',{name:/^← 선택지 컷으로/}).click();
 await expect(choiceStrip(page)).toBeVisible();
 if(viewport.width<700)return;
 // A way with no cut yet: write its first cut straight from the strip.
 const choiceId=(await choiceStrip(page).getAttribute('data-choice-line'))!;
 await page.getByLabel('현재 장과 컷 이동').selectOption(choiceId);
 await openEditingScreen(page,'쓰기');await openChoiceEditing(page);
 await page.getByLabel('선택지 2 도착 컷').selectOption('');
 await openEditingScreen(page,'원고');
 const empty=choiceStrip(page).getByText(new RegExp(`^${second.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')} · 아직 비어 있어요$`));
 await expect(empty).toBeVisible();
 await expect(choiceStrip(page).getByText('아직 비어 있는 갈래가 1개 있어요.')).toBeVisible();
 await choiceStrip(page).getByRole('button',{name:'이 갈래 쓰기',exact:true}).click();
 await page.getByRole('dialog',{name:'새 갈래 작성',exact:true}).getByRole('button',{name:'새 갈래 만들고 글쓰기',exact:true}).click();
 await expect(originStrip(page).getByRole('button',{name:new RegExp(`^${second.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')} · 지금 쓰는 갈래`)})).toBeVisible();
 await expect(page.locator('[data-screen="text"] textarea[data-cut-id]')).toHaveCount(1);
});
