import {expect,type Page} from '@playwright/test';

/** Use the reader's keyboard/semantic control without clicking clipped visual text. */
export async function previousReadCut(page:Page){
 const button=page.getByRole('button',{name:'이전 읽은 컷',exact:true});
 await expect(button).toBeEnabled();
 await button.focus();
 await page.keyboard.press('Enter');
}
