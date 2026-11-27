import {test,expect,type Page} from '@playwright/test';
import {enterLibrary,openBuiltinEdition,startShelfCreation} from './library-entry';
import {openEditingScreen} from './editor-screens';
import {suppressFullscreenOffer} from './mobile-fullscreen-offer';

// 원고 이어 쓰기: in 원고, Enter twice starts the next cut at the caret, Backspace at the start of a cut joins it to
// the cut before, and every cut says who speaks it (해설 or a name the work knows). Existing works use the same cuts.
const cuts=(page:Page)=>page.locator('[data-screen="text"] textarea[data-cut-id]');
const caret=async(page:Page,index:number,at:number)=>{const field=cuts(page).nth(index);await field.focus();await field.evaluate((node,at)=>(node as HTMLTextAreaElement).setSelectionRange(at,at),at);};
const saved=(page:Page)=>expect(page.locator('[data-testid="save-status"]')).toHaveText('임시 보관됨');

for(const viewport of [{width:1024,height:768},{width:390,height:844}])test(`write on across cuts in 원고 · ${viewport.width}`,async({page},info)=>{
 test.skip(info.project.name!=='host');test.setTimeout(180_000);
 await suppressFullscreenOffer(page);await page.setViewportSize(viewport);await page.goto('/');await enterLibrary(page);await startShelfCreation(page);
 await page.getByLabel('새 작품 제목').fill('이어 쓰기');await page.getByRole('button',{name:'새 작품 생성',exact:true}).click();await saved(page);
 await openEditingScreen(page,'원고');
 await expect(cuts(page)).toHaveCount(1);
 const first=cuts(page).first();
 await caret(page,0,0);await page.keyboard.type('첫 문장이에요.');
 // One Enter stays a line break inside the cut.
 await page.keyboard.press('Enter');await page.keyboard.type('같은 컷이에요.');
 await expect(cuts(page)).toHaveCount(1);
 // Enter twice: the next cut starts here and the caret moves into it.
 await page.keyboard.press('Enter');await page.keyboard.press('Enter');
 await expect(cuts(page)).toHaveCount(2);
 await expect(cuts(page).nth(0)).toHaveValue('첫 문장이에요.\n같은 컷이에요.');
 await expect(cuts(page).nth(1)).toBeFocused();
 await page.keyboard.type('해설: 밤이 깊었어요.');
 await expect(cuts(page).nth(1)).toHaveValue('밤이 깊었어요.');
 await expect(page.getByRole('combobox',{name:'2컷 화자',exact:true})).toHaveValue('narration');
 // Splitting in the middle carries the rest of the text into the new cut.
 await caret(page,1,3);
 await page.keyboard.press('Enter');await page.keyboard.press('Enter');
 await expect(cuts(page)).toHaveCount(3);
 await expect(cuts(page).nth(1)).toHaveValue('밤이 ');await expect(cuts(page).nth(2)).toHaveValue('깊었어요.');
 await expect(page.getByRole('combobox',{name:'3컷 화자',exact:true})).toHaveValue('narration');
 // Undo keeps the typed blank line instead of the new cut.
 await page.getByRole('button',{name:'되돌리기',exact:true}).click();
 await expect(cuts(page)).toHaveCount(2);await expect(cuts(page).nth(1)).toHaveValue('밤이 \n\n깊었어요.');
 // Backspace at the start joins a cut to the one before only when they say the same kind of thing: a different speaker is kept apart and explained.
 await cuts(page).nth(1).fill('');await page.getByRole('combobox',{name:'2컷 화자',exact:true}).selectOption('dialogue');
 await cuts(page).nth(1).fill('이어지는 말');await caret(page,1,0);await page.keyboard.press('Backspace');
 await expect(page.getByRole('alert').filter({hasText:'합칠 수 없어요'})).toBeVisible();await expect(cuts(page)).toHaveCount(2);
 await page.getByRole('combobox',{name:'2컷 화자',exact:true}).selectOption('narration');
 await caret(page,1,0);await page.keyboard.press('Backspace');
 await expect(cuts(page)).toHaveCount(1);
 await expect(cuts(page).first()).toHaveValue('첫 문장이에요.\n같은 컷이에요.이어지는 말');
 await expect(cuts(page).first()).toBeFocused();
 expect(await cuts(page).first().evaluate(node=>(node as HTMLTextAreaElement).selectionStart)).toBe('첫 문장이에요.\n같은 컷이에요.'.length);
 await saved(page);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:info.outputPath('write-on.png')});
});

test('an existing work writes on in 원고 with its own cuts',async({page},info)=>{
 test.skip(info.project.name!=='host');test.setTimeout(240_000);
 await suppressFullscreenOffer(page);await page.setViewportSize({width:1024,height:768});await page.goto('/?view=library');await enterLibrary(page);
 await openBuiltinEdition(page,'seonnyeo','knolstory','edit');
 await expect(page.locator('[data-current-cut] textarea').first()).toBeVisible({timeout:60_000});
 await openEditingScreen(page,'원고');
 const count=await cuts(page).count();expect(count).toBeGreaterThan(2);
 const field=cuts(page).first(),text=await field.inputValue(),speaker=await page.getByRole('combobox',{name:'1컷 화자',exact:true}).inputValue();
 const at=Math.floor(text.length/2);
 await caret(page,0,at);
 await page.keyboard.press('Enter');await page.keyboard.press('Enter');
 await expect(cuts(page)).toHaveCount(count+1);
 await expect(cuts(page).nth(0)).toHaveValue(text.slice(0,at).replace(/\n+$/,''));
 await expect(cuts(page).nth(1)).toHaveValue(text.slice(at).replace(/^\n+/,''));
 await expect(page.getByRole('combobox',{name:'2컷 화자',exact:true})).toHaveValue(speaker);
 // Backspace at the start of the new cut joins the halves again (the same speaker and stage); undo brings the split back.
 await caret(page,1,0);await page.keyboard.press('Backspace');
 await expect(cuts(page)).toHaveCount(count);
 await expect(cuts(page).first()).toHaveValue(text.slice(0,at).replace(/\n+$/,'')+text.slice(at).replace(/^\n+/,''));
 await page.getByRole('button',{name:'되돌리기',exact:true}).click();
 await expect(cuts(page)).toHaveCount(count+1);
});
