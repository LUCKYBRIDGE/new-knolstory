import {openBuiltinEdition} from './library-entry';
import {openShelfAction} from './library-entry';
import {enterLibrary,beginSelectedBook} from './library-entry';
import {test,expect} from '@playwright/test';
test('existing originals are directly readable beside KnolStory works',async({page})=>{
 await page.goto('/'); await enterLibrary(page);await expect(page.getByTestId('library-save-status')).toHaveText('기기에 저장됨');
 await expect(page.locator('article[data-work-id]')).toHaveCount(4);
 await openBuiltinEdition(page,'heungbu','original','start');await beginSelectedBook(page);
 await expect(page.getByRole('heading',{name:'흥부전',exact:true})).toBeVisible();await expect(page.getByTestId('playback-status')).toHaveText('읽는 중');
});
