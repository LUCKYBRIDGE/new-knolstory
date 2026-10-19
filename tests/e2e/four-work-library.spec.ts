import {test,expect} from '@playwright/test';
import {enterLibrary,beginSelectedBook,fillShelfSearch,shelfCoverButton} from './library-entry';
const works=[['rabbit','별주부전'],['onggojib','옹고집전'],['seonnyeo','선녀와 나무꾼'],['heungbu','흥부와 놀부']] as const;
test('the default library groups eight manuscripts into four independent work choices',async({page})=>{
 await page.goto('/');await enterLibrary(page);
 await expect(page.locator('article[data-shelf-book]')).toHaveCount(4);
 for(const [id,title] of works){
  const book=page.locator(`article[data-work-id="${id}"]`);
  await expect(book).toHaveAttribute('aria-label',`기본 작품 · ${title}`);
  await shelfCoverButton(book,title).click();
  const focus=page.getByRole('dialog');
  await expect(focus.getByRole('button',{name:'원작 읽기',exact:true})).toBeEnabled();
  await expect(focus.getByRole('button',{name:'놀스토리 읽기',exact:true})).toBeEnabled();
  await expect(focus.getByRole('link',{name:'숏스토리 읽기',exact:true})).toHaveAttribute('href',`/shortstory/?work=${id}&mode=read`);
  await focus.getByLabel('바탕 판본',{exact:true}).selectOption('original');
  await expect(focus).toHaveAttribute('data-selected-edition','original');
  await expect(focus.getByRole('button',{name:'편집하기',exact:true})).toContainText('원작을 바탕으로');
  await focus.getByLabel('바탕 판본',{exact:true}).focus();await page.keyboard.press('ArrowLeft');await expect(focus).toHaveAttribute('data-work-id',id);
  await focus.getByRole('button',{name:'닫기 · 서재로 돌아가기',exact:true}).click();
 }
 await fillShelfSearch(page,'서로의 몫');await expect(page.locator('article[data-work-id]')).toHaveCount(1);await expect(page.locator('article[data-work-id="heungbu"]')).toBeVisible();
});
for(const [id,title] of works)for(const edition of ['원작','놀스토리'] as const)test(`${title} ${edition}: chosen manuscript opens and returns to its grouped book`,async({page},info)=>{
 await page.goto('/');await enterLibrary(page);
 await page.locator(`article[data-work-id="${id}"]`).getByRole('button').click();
 await page.getByRole('dialog').getByRole('button',{name:`${edition} 읽기`,exact:true}).click();
 const entry=page.getByRole('main',{name:'책 표지와 소개',exact:true});await expect(entry).toBeVisible();
 await beginSelectedBook(page);
 await expect(page.getByTestId('story-runtime-frame')).toBeVisible();if(info.project.name==='stories-runtime'){const status=page.getByTestId('story-runtime-status');await expect.poll(()=>status.evaluate(n=>Number(n.getAttribute('data-rendered-revision'))>=0&&n.getAttribute('data-rendered-revision')===n.getAttribute('data-scene-revision')),{timeout:90000}).toBe(true);await page.getByTestId('story-stage-viewport').screenshot({path:info.outputPath(`${id}-${edition}-native.png`)});}
 await page.getByRole('button',{name:'읽기 메뉴',exact:true}).click();await page.getByRole('button',{name:'서재로 돌아가기',exact:true}).click();const confirm=page.getByRole('dialog',{name:'서재로 돌아갈까요?',exact:true});await expect(confirm).toBeVisible();await confirm.getByRole('button',{name:'보관하고 서재로',exact:true}).click();
 await expect(page.locator(`article[data-work-id="${id}"]`)).toBeVisible();
 await expect(page.locator('article[data-shelf-book]')).toHaveCount(4);
});

test('all four shelf choices open their actual ShortStory and return to the same library',async({page})=>{
 await page.goto('/');await enterLibrary(page);
 for(const [id,title] of works){
  await page.locator(`article[data-work-id="${id}"]`).getByRole('button').click();await page.getByRole('dialog').getByRole('link',{name:'숏스토리 읽기',exact:true}).click();
  await expect(page).toHaveURL(new RegExp(`work=${id}&mode=read`));await expect(page.getByLabel('이야기 제목',{exact:true})).toHaveValue(title);await expect(page.getByRole('region',{name:'숏스토리 읽기'})).toBeVisible();await expect(page.locator('iframe')).toHaveCount(0);
  await page.getByRole('link',{name:'놀스토리 서재로 돌아가기',exact:true}).click();await expect(page.locator('article[data-shelf-book]')).toHaveCount(4);await expect(page.locator(`article[data-work-id="${id}"]`)).toBeVisible();
 }
});
