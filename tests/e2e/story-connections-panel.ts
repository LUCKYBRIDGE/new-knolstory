import {expect,type Page} from '@playwright/test';
/** 쓰기의 ‘이야기 연결’ (branching works): opened in place, it stays open while the author moves between cuts. */
export async function openConnections(page:Page){
 const panel=page.locator('[data-story-connections]');
 await expect(panel).toHaveCount(1);
 if(await panel.getAttribute('data-story-connections')!=='open')await panel.locator(':scope>summary').click();
 await expect(panel).toHaveAttribute('data-story-connections','open');
 return panel;
}
