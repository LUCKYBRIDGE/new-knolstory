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

/** Adding, moving and deleting pages sit under the page in ‘쪽 추가·순서·삭제’. */
export async function openPageTools(scope: Page | Locator) {
 const summary = scope.locator('summary').filter({hasText: '쪽 추가·순서·삭제'});
 if (!await summary.evaluate(element => (element.parentElement as HTMLDetailsElement).open)) await summary.click();
}
