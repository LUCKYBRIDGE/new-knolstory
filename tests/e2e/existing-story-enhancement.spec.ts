import {openBuiltinEdition} from './library-entry';
import {enterLibrary,beginSelectedBook} from './library-entry';
import {test,expect} from '@playwright/test';
test('existing originals are directly readable beside KnolStory works',async({page},info)=>{
 await page.goto('/'); await enterLibrary(page);await expect(page.getByTestId('library-save-status')).toHaveText('임시 보관됨');
 await expect(page.locator('article[data-work-id]')).toHaveCount(4);
 await openBuiltinEdition(page,'heungbu','original','start');await beginSelectedBook(page);
 await expect(page.getByTestId('story-stage-viewport')).toContainText('흥부전 · 1장');await expect(page.getByTestId('playback-status')).toHaveText('읽는 중');if(info.project.name==='stories-runtime'){const status=page.getByTestId('story-runtime-status');await expect.poll(()=>status.evaluate(n=>Number(n.getAttribute('data-rendered-revision'))>=0&&n.getAttribute('data-rendered-revision')===n.getAttribute('data-scene-revision')),{timeout:90000}).toBe(true);await page.getByTestId('story-stage-viewport').screenshot({path:info.outputPath('original-native.png')});}
});
