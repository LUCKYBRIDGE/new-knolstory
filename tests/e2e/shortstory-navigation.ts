import {type Page} from '@playwright/test';

export async function openShortStoryDetails(page: Page, name: string | RegExp) {
 const summary = page.locator('summary').filter({hasText: name});
 // Reading folds the file and management tools behind one button (2026-11-21).
 const more = page.getByRole('button', {name: '파일·관리 더 보기', exact: true});
 if (!await summary.first().isVisible() && await more.isVisible() && await more.getAttribute('aria-expanded') === 'false') await more.click();
 const open = await summary.evaluate(element => (element.parentElement as HTMLDetailsElement).open);
 if (!open) await summary.click();
}
