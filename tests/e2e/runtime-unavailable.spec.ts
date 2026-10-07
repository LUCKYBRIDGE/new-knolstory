import { test, expect } from '@playwright/test';

test('runtime load failure preserves authored text without a substitute stage', async ({ page }) => {
  await page.route('**/runtime/index.html', route => route.fulfill({ status: 503, contentType: 'text/plain', body: 'Runtime unavailable' }));
  await page.goto('/probe');
  const dialogue = page.getByLabel('대사', { exact: true });
  await dialogue.fill('엔진 연결에 실패해도 작성한 대사는 유지됩니다.');
  await page.getByRole('button', { name: '편집 패널 접기' }).click();
  await page.getByRole('button', { name: '편집 패널 열기' }).click();
  await expect(dialogue).toHaveValue('엔진 연결에 실패해도 작성한 대사는 유지됩니다.');
  await expect(page.getByRole('status')).not.toContainText('연결됨');
  await expect(page.locator('.actor-handle')).toHaveCount(0);
});
