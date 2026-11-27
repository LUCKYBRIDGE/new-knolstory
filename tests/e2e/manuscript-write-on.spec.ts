import {test,expect,type Page} from '@playwright/test';
import {enterLibrary,openBuiltinEdition,startShelfCreation} from './library-entry';
import {openEditingScreen} from './editor-screens';
import {suppressFullscreenOffer} from './mobile-fullscreen-offer';

// 원고 (2026-11-28): the chapter is one document of seamless cut blocks. Enter twice (or pasted blank lines) starts the next cut,
// Backspace at the start of a cut joins it to the cut before (asking first when they differ), the arrows cross between blocks,
// and one speaker choice serves the cut being written. Existing works use the same cuts.
const cuts=(page:Page)=>page.locator('[data-screen="text"] textarea[data-cut-id]');
const caret=async(page:Page,index:number,at:number)=>{const field=cuts(page).nth(index);await field.focus();await field.evaluate((node,at)=>(node as HTMLTextAreaElement).setSelectionRange(at,at),at);};
const saved=(page:Page)=>expect(page.locator('[data-testid="save-status"]')).toHaveText('임시 보관됨');

for(const viewport of [{width:1024,height:768},{width:390,height:844}])test(`one document of cut blocks in 원고 · ${viewport.width}`,async({page},info)=>{
 test.skip(info.project.name!=='host');test.setTimeout(180_000);
 await suppressFullscreenOffer(page);await page.setViewportSize(viewport);await page.goto('/');await enterLibrary(page);await startShelfCreation(page);
 await page.getByLabel('새 작품 제목').fill('이어 쓰기');await page.getByRole('button',{name:'새 작품 생성',exact:true}).click();await saved(page);
 await openEditingScreen(page,'원고');
 await expect(page.locator('[data-screen="text"] [data-manuscript]')).toBeVisible();
 await expect(cuts(page)).toHaveCount(1);
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
 // One speaker choice, for the cut being written; every block shows its own speaker beside it.
 await expect(page.getByRole('combobox',{name:'2컷 화자',exact:true})).toHaveValue('narration');
 await expect(page.getByRole('button',{name:'2컷 · 해설 · 이 컷 선택',exact:true})).toBeVisible();
 // The arrows cross between blocks at their edges, like one document.
 await caret(page,1,0);await page.keyboard.press('ArrowUp');
 await expect(cuts(page).nth(0)).toBeFocused();
 expect(await cuts(page).nth(0).evaluate(node=>(node as HTMLTextAreaElement).selectionStart)).toBe('첫 문장이에요.\n같은 컷이에요.'.length);
 await page.keyboard.press('ArrowRight');await expect(cuts(page).nth(1)).toBeFocused();
 // Splitting in the middle carries the rest of the text into the new cut.
 await caret(page,1,3);
 await page.keyboard.press('Enter');await page.keyboard.press('Enter');
 await expect(cuts(page)).toHaveCount(3);
 await expect(cuts(page).nth(1)).toHaveValue('밤이 ');await expect(cuts(page).nth(2)).toHaveValue('깊었어요.');
 // Undo keeps the typed blank line instead of the new cut.
 await page.getByRole('button',{name:'되돌리기',exact:true}).click();
 await expect(cuts(page)).toHaveCount(2);await expect(cuts(page).nth(1)).toHaveValue('밤이 \n\n깊었어요.');
 // Pasting writing with blank lines makes one cut per paragraph.
 await cuts(page).nth(1).fill('');await caret(page,1,0);
 await cuts(page).nth(1).evaluate(node=>{const data=new DataTransfer();data.setData('text/plain','별이 떴어요.\n\n바람이 불었어요.\n\n달이 졌어요.');node.dispatchEvent(new ClipboardEvent('paste',{clipboardData:data,bubbles:true,cancelable:true}));});
 await expect(cuts(page)).toHaveCount(4);
 await expect(cuts(page).nth(3)).toHaveValue('달이 졌어요.');await expect(cuts(page).nth(3)).toBeFocused();
 // Backspace at the start joins a cut to the one before; cuts that differ ask first.
 await cuts(page).nth(3).focus();await page.getByRole('combobox',{name:'4컷 화자',exact:true}).selectOption('dialogue');
 await caret(page,3,0);await page.keyboard.press('Backspace');
 const ask=page.getByRole('status').filter({hasText:'앞 컷과 설정이 달라요'});
 await expect(ask).toBeVisible();await expect(cuts(page)).toHaveCount(4);
 await ask.getByRole('button',{name:'따로 두기',exact:true}).click();await expect(ask).toHaveCount(0);await expect(cuts(page)).toHaveCount(4);
 await caret(page,3,0);await page.keyboard.press('Backspace');
 await ask.getByRole('button',{name:'앞 컷 설정으로 합치기',exact:true}).click();
 await expect(cuts(page)).toHaveCount(3);
 await expect(cuts(page).nth(2)).toHaveValue('바람이 불었어요.달이 졌어요.');
 await expect(page.getByRole('button',{name:'3컷 · 해설 · 이 컷 선택',exact:true})).toBeVisible();
 // Same settings join at once, and the caret lands where the two met.
 await caret(page,2,0);await page.keyboard.press('Backspace');
 await expect(cuts(page)).toHaveCount(2);
 await expect(cuts(page).nth(1)).toHaveValue('별이 떴어요.바람이 불었어요.달이 졌어요.');await expect(cuts(page).nth(1)).toBeFocused();
 expect(await cuts(page).nth(1).evaluate(node=>(node as HTMLTextAreaElement).selectionStart)).toBe('별이 떴어요.'.length);
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
 const field=cuts(page).first();await field.focus();const text=await field.inputValue(),speaker=await page.getByRole('combobox',{name:'1컷 화자',exact:true}).inputValue();
 const at=Math.floor(text.length/2);
 await caret(page,0,at);
 await page.keyboard.press('Enter');await page.keyboard.press('Enter');
 await expect(cuts(page)).toHaveCount(count+1);
 await expect(cuts(page).nth(0)).toHaveValue(text.slice(0,at).replace(/\n+$/,''));
 await expect(cuts(page).nth(1)).toHaveValue(text.slice(at).replace(/^\n+/,''));
 await cuts(page).nth(1).focus();await expect(page.getByRole('combobox',{name:'2컷 화자',exact:true})).toHaveValue(speaker);
 // Backspace at the start of the new cut joins the halves again (the same speaker and stage); undo brings the split back.
 await caret(page,1,0);await page.keyboard.press('Backspace');
 await expect(cuts(page)).toHaveCount(count);
 await expect(cuts(page).first()).toHaveValue(text.slice(0,at).replace(/\n+$/,'')+text.slice(at).replace(/^\n+/,''));
 await page.getByRole('button',{name:'되돌리기',exact:true}).click();
 await expect(cuts(page)).toHaveCount(count+1);
});
