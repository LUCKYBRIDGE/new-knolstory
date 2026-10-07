import { test, expect, type Page } from '@playwright/test';
import { PNG } from 'pngjs';

async function expectPixelAlignment(page: Page) {
  await expect.poll(async () => {
    const handle = await page.getByRole('button', { name: '흥부 위치 편집' }).boundingBox();
    const stage = await page.getByTestId('stage-viewport').boundingBox();
    if (!handle || !stage) return 1000;
    const png = PNG.sync.read(await page.getByTestId('stage-viewport').screenshot({ scale: 'css', style: '.actor-handle { visibility: hidden !important; }' }));
    let left = png.width, right = -1, top = png.height;
    for (let y = 0; y < png.height; y += 1) for (let x = 0; x < png.width; x += 1) {
      const offset = (y * png.width + x) * 4;
      if (png.data[offset] === 231 && png.data[offset + 1] === 170 && png.data[offset + 2] === 66) { left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); }
    }
    return Math.max(Math.abs(handle.x + handle.width / 2 - (stage.x + (left + right + 1) / 2)), Math.abs(handle.y + handle.height / 2 - (stage.y + top)));
  }, { timeout: 10000 }).toBeLessThan(2);
}


test('real Ren’Py acknowledges editing and keeps canvas aligned through responsive resize', async ({ page }) => {
  await page.goto('/probe');
  await expect(page.getByRole('status')).toContainText('연결됨', { timeout: 90000 });
  await expect(page.getByRole('status')).toContainText('표시 r0', { timeout: 30000 });
  await page.getByLabel('대사', { exact: true }).fill('실제 렌파이에 한국어 편집 결과가 반영됩니다.');
  await expect(page.getByRole('status')).toContainText('표시 r1', { timeout: 30000 });
  const frame = page.getByTestId('runtime-frame');
  await frame.evaluate(element => element.setAttribute('data-real-runtime', 'same-frame'));
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(frame).toHaveAttribute('data-real-runtime', 'same-frame');
  await expect(page.getByLabel('대사', { exact: true })).toHaveValue('실제 렌파이에 한국어 편집 결과가 반영됩니다.');
  await expect(page.getByRole('button', { name: '흥부 위치 편집' })).toBeVisible();
  await page.getByRole('spinbutton', { name: '인물 X 좌표' }).fill('240');
  await expect(page.getByRole('status')).toContainText('표시 r2', { timeout: 30000 });
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(frame).toHaveAttribute('data-real-runtime', 'same-frame');
  await expect(page.getByRole('spinbutton', { name: '인물 X 좌표' })).toHaveValue('240');
  await expectPixelAlignment(page);
  await page.screenshot({ path: 'test-results/renpy-landscape.png', fullPage: true });
  await page.setViewportSize({ width: 1440, height: 900 });
  const dialogue = page.getByLabel('대사', { exact: true });
  for (let index = 0; index < 8; index += 1) await dialogue.fill(`빠른 편집 ${index}`);
  await expect(page.getByRole('status')).toContainText('표시 r10', { timeout: 30000 });
  await expect(dialogue).toHaveValue('빠른 편집 7');
  // Synthetic composition checks host gating; native Korean IME remains a device QA item.
  await dialogue.dispatchEvent('compositionstart', { data: '' });
  await dialogue.fill('한국어 조합 중');
  await page.waitForTimeout(150);
  await expect(page.getByRole('status')).toContainText('편집 r11');
  await expect(page.getByRole('status')).toContainText('표시 r10');
  await dialogue.dispatchEvent('compositionend', { data: '한국어 조합 중' });
  await expect(page.getByRole('status')).toContainText('표시 r11', { timeout: 30000 });
  const handle = page.getByRole('button', { name: '흥부 위치 편집' });
  const bounds = await handle.boundingBox();
  expect(bounds).not.toBeNull();
  const before = Number(await page.getByRole('spinbutton', { name: '인물 X 좌표' }).inputValue());
  await page.mouse.move(bounds!.x + bounds!.width / 2, bounds!.y + bounds!.height / 2);
  await page.evaluate(() => {
    document.body.dataset.observedAcks = '0';
    const runtime = document.querySelector<HTMLIFrameElement>('[data-testid="runtime-frame"]');
    window.addEventListener('message', event => {
      if (event.origin === location.origin && event.source === runtime?.contentWindow && event.data?.type === 'sceneRendered') document.body.dataset.observedAcks = String(Number(document.body.dataset.observedAcks) + 1);
    });
  });
  await page.mouse.down();
  for (let step = 1; step <= 30; step += 1) {
    await page.mouse.move(bounds!.x + bounds!.width / 2 + step * 2, bounds!.y + bounds!.height / 2);
    await page.waitForTimeout(17); // Model continuous human pointer movement across many frames.
  }
  expect(Number(await page.locator('body').getAttribute('data-observed-acks'))).toBeGreaterThan(1);
  await page.mouse.up();
  await expect.poll(async () => Number(await page.getByRole('spinbutton', { name: '인물 X 좌표' }).inputValue())).toBeGreaterThan(before);
  await page.getByRole('button', { name: '편집 패널 접기' }).click();
  await page.getByRole('button', { name: '편집 패널 열기' }).click();
  await expect(page.getByLabel('선택한 인물')).toHaveValue('heungbu');
  await expect(frame).toHaveAttribute('data-real-runtime', 'same-frame');
  await expect.poll(async () => {
    const status = await page.getByRole('status').innerText();
    return status.match(/편집 r(\d+)/)?.[1] === status.match(/표시 r(\d+)/)?.[1];
  }).toBe(true);
  await expectPixelAlignment(page);
  const cancellationHandle = await handle.boundingBox();
  await page.mouse.move(cancellationHandle!.x + 22, cancellationHandle!.y + 22);
  await page.mouse.down();
  const beforeResize = await page.getByRole('spinbutton', { name: '인물 X 좌표' }).inputValue();
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.waitForTimeout(100);
  await page.mouse.move(cancellationHandle!.x + 90, cancellationHandle!.y + 22);
  await page.mouse.up();
  await expect(page.getByRole('spinbutton', { name: '인물 X 좌표' })).toHaveValue(beforeResize);
  await expectPixelAlignment(page);
  await page.screenshot({ path: 'test-results/renpy-desktop.png', fullPage: true });
});
