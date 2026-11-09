import {expect,test} from '@playwright/test';
import {openBuiltinEdition,selectShelfCollection} from './library-entry';

test('catalog edit copies receive numbered titles and identical blue covers',async({page})=>{
 await page.goto('/?view=library');
 await expect(page.getByTestId('library-save-status')).toHaveText('임시 보관됨');
 for(const title of ['[내작품] 선녀와 나무꾼','[내작품] 선녀와 나무꾼 2','[내작품] 선녀와 나무꾼 3']){
  await selectShelfCollection(page,'builtin');
  await openBuiltinEdition(page,'seonnyeo','knolstory','edit');
  await expect(page.getByRole('heading',{name:title,exact:true})).toBeVisible();
  await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
  await page.getByRole('button',{name:'홈 · 서재로 이동',exact:true}).click();
  await expect(page.getByTestId('library-save-status')).toHaveText('임시 보관됨');
 }
 await selectShelfCollection(page,'own');
 const covers=page.locator('[data-shelf-cover] [data-personal-cover="default"]');
 await expect(covers).toHaveCount(3);
 for(let index=0;index<3;index++){
  await expect(covers.nth(index)).toHaveCSS('background-color','rgb(106, 174, 214)');
  await expect(covers.nth(index).getByText('[내작품]',{exact:true})).toBeVisible();
  await expect(covers.nth(index).locator('h2')).toHaveText(index===0?'선녀와 나무꾼':`선녀와 나무꾼 ${index+1}`);
 }
 await page.locator('[data-shelf-cover]').first().click();
 const detail=page.getByRole('dialog');
 await detail.getByText('책 꾸미기·작품 도구',{exact:true}).click();
 await detail.getByRole('button',{name:'책 표지 편집',exact:true}).click();
 const editor=page.getByRole('dialog');
 await editor.getByRole('textbox',{name:'작품 제목',exact:true}).fill('내가 지은 제목');
 await editor.getByLabel('표지 색감',{exact:true}).selectOption('rose');
 await editor.getByRole('button',{name:'표지 적용',exact:true}).click();
 await expect(page.getByLabel('작품 제목',{exact:true})).toHaveValue('내가 지은 제목');
 await expect(page.getByTestId('preparation-save-status')).toHaveText('임시 보관됨');
 await page.reload();
 await expect(page.getByLabel('작품 제목',{exact:true})).toHaveValue('내가 지은 제목');
 await page.getByRole('button',{name:'서재로',exact:true}).click();
 const renamed=page.getByRole('button',{name:/^내가 지은 제목 책 표지와 소개 보기/});
 await expect(renamed.locator('[data-cover-face="front"]')).toHaveCSS('--cover-paper','#743e4e');
 await expect(covers).toHaveCount(2);
});
