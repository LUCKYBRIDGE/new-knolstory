import {expect,type Page} from '@playwright/test';
/** Exercise actual first-visit introduction when a test needs the library. */
export async function enterLibrary(page:Page){
 await expect.poll(async()=>await page.getByRole('main',{name:'로컬 서재',exact:true}).isVisible()||await page.getByRole('button',{name:'서재로 가기',exact:true}).isEnabled().catch(()=>false)).toBe(true);
 if(await page.getByRole('main',{name:'책 소개',exact:true}).isVisible())await page.getByRole('button',{name:'서재로 가기',exact:true}).click();
 await expect(page.getByRole('main',{name:'로컬 서재',exact:true})).toBeVisible();
}
export async function beginSelectedBook(page:Page,resume=false){
 await expect(page.getByRole('main',{name:'책 표지와 소개',exact:true})).toBeVisible();
 await page.getByRole('main',{name:'책 표지와 소개',exact:true}).getByRole('button',{name:resume?'이어읽기':'처음부터 읽기',exact:true}).click();
}
