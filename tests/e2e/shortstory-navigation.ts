import {type Locator,type Page} from '@playwright/test';

/** Book details, files, print and the book list wait behind ‘작품 도구’ (2026-11-21). */
export async function openShortStoryTools(page: Page) {
 const tools = page.getByRole('button', {name: '작품 도구', exact: true});
 if (await tools.isVisible() && await tools.getAttribute('aria-expanded') === 'false') await tools.click();
}

export async function openShortStoryDetails(page: Page, name: string | RegExp) {
 const summary = page.locator('summary').filter({hasText: name});
 if (!await summary.first().isVisible()) await openShortStoryTools(page);
 const open = await summary.evaluate(element => (element.parentElement as HTMLDetailsElement).open);
 if (!open) await summary.click();
}

/** Adding, moving and deleting pages are the page's ‘쪽’ tab (글 · 그림 · 쪽). */
export async function openPageTools(scope: Page | Locator) {
 const tab = scope.getByRole('tab', {name: '쪽', exact: true});
 if (await tab.getAttribute('aria-selected') !== 'true') await tab.click();
}
/** The page's background and characters are its ‘그림’ tab. */
export async function openPictureTools(scope: Page | Locator) {
 const tab = scope.getByRole('tab', {name: '그림', exact: true});
 if (await tab.getAttribute('aria-selected') !== 'true') await tab.click();
}
/** The page title and story text are its ‘글’ tab. */
export async function openTextTools(scope: Page | Locator) {
 const tab = scope.getByRole('tab', {name: '글', exact: true});
 if (await tab.getAttribute('aria-selected') !== 'true') await tab.click();
}
