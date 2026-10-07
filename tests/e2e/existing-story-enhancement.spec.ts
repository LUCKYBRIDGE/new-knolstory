import {enterLibrary,beginSelectedBook} from './library-entry';
import {test,expect} from '@playwright/test';
test('existing originals are directly readable beside KnolStory works',async({page})=>{
 await page.goto('/'); await enterLibrary(page);await expect(page.getByTestId('library-save-status')).toHaveText('기기에 저장됨');
 const originals=page.getByRole('region',{name:'원작',exact:true});await expect(originals.getByRole('article')).toHaveCount(4);
 await expect(page.getByRole('region',{name:'기본 예제',exact:true}).getByRole('article')).toHaveCount(4);
 await originals.getByRole('article').filter({has:page.getByRole('heading',{name:'흥부전',exact:true})}).getByRole('button',{name:'처음부터 읽기',exact:true}).click();await beginSelectedBook(page);
 await expect(page.getByRole('heading',{name:'흥부전',exact:true})).toBeVisible();await expect(page.getByTestId('playback-status')).toHaveText('읽는 중');
});
