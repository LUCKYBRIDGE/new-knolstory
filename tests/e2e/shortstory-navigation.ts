import {type Page} from '@playwright/test';

export async function openShortStoryDetails(page: Page, name: string | RegExp) {
 const summary = page.locator('summary').filter({hasText: name});
 const open = await summary.evaluate(element => (element.parentElement as HTMLDetailsElement).open);
 if (!open) await summary.click();
}
