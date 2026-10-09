import { test, expect } from '@playwright/test';

test('draft and the same iframe survive panel changes and portrait/landscape resize', async ({ page }) => {
  await page.goto('/probe');
  const iframe = page.getByTestId('runtime-frame');
  await expect(iframe).toHaveAttribute('src', '/runtime/index.html');
  await iframe.evaluate(element => { element.setAttribute('data-persistence-marker', 'original'); });
  await page.getByLabel('대사', { exact: true }).fill('화면을 바꿔도 이 한국어 대사는 그대로 남아요.');
  await page.getByRole('button', { name: '편집 패널 접기' }).click();
  await expect(page.locator('#inspector')).toBeHidden();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: '편집 패널 열기' }).click();
  await expect(page.getByLabel('대사', { exact: true })).toHaveValue('화면을 바꿔도 이 한국어 대사는 그대로 남아요.');
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(iframe).toHaveAttribute('data-persistence-marker', 'original');
  await expect(page.getByLabel('대사', { exact: true })).toHaveValue('화면을 바꿔도 이 한국어 대사는 그대로 남아요.');
  const overflows = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflows).toBe(false);
});

test('logical actor coordinates survive viewport changes', async ({ page }) => {
  await page.goto('/probe');
  const x = page.getByRole('spinbutton', { name: '인물 X 좌표' });
  await x.fill('240');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(x).toHaveValue('240');
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(x).toHaveValue('240');
});
