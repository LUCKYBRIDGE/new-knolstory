import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { PNG } from 'pngjs';

const fixturePath = 'tests/fixtures/stories/presentation-polish.json';
const source = JSON.parse(readFileSync(fixturePath, 'utf8'));
const file = { name: 'presentation-polish.knolstory', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ documentType: 'story-maker-project', schemaVersion: 5, savedAt: '2026-10-06T00:00:00.000Z', appVersion: 'knolstory-next-test', project: source })) };

async function management(page: Page) {
  const summary = page.getByText('작품 관리', { exact: true });
  if (!(await summary.locator('..').evaluate(node => (node as HTMLDetailsElement).open))) await summary.click();
}

async function load(page: Page) {
  await page.goto('/?view=editor');
  await expect(page.getByTestId('save-status')).toHaveText('기기에 저장됨');
  await management(page);
  await page.getByLabel('작품 파일 가져오기').setInputFiles(file);
  await expect(page.getByLabel('작품 제목', { exact: true })).toHaveValue(source.title);
  await rendered(page);
}

async function rendered(page: Page) {
  const status = page.getByTestId('story-runtime-status');
  await expect(status).toContainText('연결됨', { timeout: 90000 });
  await expect.poll(() => status.evaluate(node => node.getAttribute('data-rendered-revision') === node.getAttribute('data-scene-revision')), { timeout: 30000 }).toBe(true);
}

async function tool(page: Page, name: string) {
  const button = page.getByRole('button', { name, exact: true });
  if (await button.isVisible()) await button.click();
}

async function cut(page: Page, id: string) {
  await tool(page, '컷 목록');
  await page.locator(`[data-line-id="${id}"]`).click();
  await rendered(page);
}

async function exported(page: Page) {
  await management(page);
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: '작품 파일 내보내기', exact: true }).click();
  const download = await pending;
  return JSON.parse(readFileSync((await download.path())!, 'utf8')).project;
}

function content(project: typeof source) {
  const { updatedAt: _updatedAt, ...rest } = project;
  return rest;
}

function difference(a: PNG, b: PNG) {
  // Fractional CSS layout can quantize a responsive viewport by one screenshot pixel.
  expect(Math.abs(a.width-b.width)).toBeLessThanOrEqual(1);
  expect(Math.abs(a.height-b.height)).toBeLessThanOrEqual(1);
  let total = 0;
  // Exclude dialogue and editing handles: this measures actual Ren’Py scenery.
  for (let y = Math.floor(a.height * .22); y < a.height * .6; y += 2)
    for (let x = Math.floor(a.width * .08); x < a.width * .92; x += 2) {
      const n = (y * a.width + x) * 4;
      const bx=Math.round(x*b.width/a.width),by=Math.round(y*b.height/a.height);
      let delta=Infinity;
      for(const dy of [-1,0,1])for(const dx of [-1,0,1]) {
        const m=((by+dy)*b.width+bx+dx)*4;
        delta=Math.min(delta,Math.abs(a.data[n]!-b.data[m]!)+Math.abs(a.data[n+1]!-b.data[m+1]!)+Math.abs(a.data[n+2]!-b.data[m+2]!));
      }
      total+=delta;
    }
  return total / (a.width * a.height);
}

async function pixels(page: Page) {
  return PNG.sync.read(await page.getByTestId('story-stage-viewport').screenshot({ scale: 'css' }));
}

test('presentation controls provide an explicit current-cut preview action without changing stored composition', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'host', 'Editor preview entry point');
  await page.goto('/?view=editor');
  await expect(page.getByTestId('save-status')).toHaveText('기기에 저장됨');
  await management(page);
  await page.getByLabel('작품 파일 가져오기').setInputFiles(file);
  await expect(page.getByLabel('작품 제목', { exact: true })).toHaveValue(source.title);
  await page.locator('[data-line-id="flashback"]').click();
  const preview = page.getByRole('button', { name: '연출 미리보기', exact: true });
  await expect(preview).toBeVisible();
  await preview.click();
  await expect(page.getByRole('button', { name: '편집으로', exact: true })).toBeVisible();
  await expect(page.locator('[data-line-id="flashback"]')).toHaveAttribute('aria-current', 'true');
  await page.getByRole('button', { name: '편집으로', exact: true }).click();
  expect(content(await exported(page))).toEqual(content(source));
  await page.locator('[data-line-id="shake"]').click();
  await page.getByLabel('효과 강도').selectOption('strong');
  await page.getByLabel('효과 시작').selectOption('after-delay');
  await page.getByLabel('효과 대기 시간').fill('800');
  const authored = await exported(page);
  expect(authored.lines.find((line: { id: string }) => line.id === 'shake').presentation.effects[0]).toMatchObject({ intensity: 'strong', trigger: 'after-delay', delayMs: 800 });
  expect(authored.lines.map((line: { stageComposition: unknown }) => line.stageComposition)).toEqual(source.lines.map((line: { stageComposition: unknown }) => line.stageComposition));
  await page.getByRole('button', { name: '동작 줄이기', exact: true }).click();
  await expect(page.getByRole('button', { name: '동작 줄이기', exact: true })).toHaveAttribute('aria-pressed', 'true');
});

test('actual auto actors leave a wider center and inverse drag remains correct at desktop, portrait and landscape', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'stories-runtime', 'Native placement and persistent iframe');
  await load(page);
  const frame = page.getByTestId('story-runtime-frame');
  await frame.evaluate(node => node.setAttribute('data-polish-instance', 'original'));
  expect(content(await exported(page))).toEqual(content(source));
  for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport);
    await cut(page, 'neutral');
    const handles = page.getByRole('button', { name: /위치 편집$/ });
    await expect(handles).toHaveCount(viewport.width<viewport.height?1:2);
    const stage = (await frame.boundingBox())!;
    const left = (await handles.nth(0).boundingBox())!;
    if(viewport.width>=viewport.height){
      const right=(await handles.nth(1).boundingBox())!;
      const distance=(right.x+right.width/2-left.x-left.width/2)/stage.width;expect(distance).toBeGreaterThan(.45);
      for(const bounds of [left,right]){expect(bounds.x+bounds.width/2).toBeGreaterThan(stage.x);expect(bounds.x+bounds.width/2).toBeLessThan(stage.x+stage.width);}
    }
    await page.getByTestId('story-stage-viewport').screenshot({ path: testInfo.outputPath(`auto-${viewport.width}.png`) });
    await cut(page, 'center');
    await tool(page, '자산 편집');
    await expect(page.getByLabel('왼쪽 1번 인물 가로 위치', { exact: true })).toHaveValue('50');
    await page.getByRole('button',{name:/위치 편집$/}).scrollIntoViewIfNeeded();
    const handle = (await page.getByRole('button', { name: /위치 편집$/ }).boundingBox())!;
    const currentStage = (await frame.boundingBox())!;
    await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
    await page.mouse.down();
    await page.mouse.move(handle.x + handle.width / 2 + currentStage.width * .05, handle.y + handle.height / 2, { steps: 5 });
    await page.mouse.up();
    await expect.poll(async () => Number(await page.getByLabel('왼쪽 1번 인물 가로 위치', { exact: true }).inputValue())).toBeCloseTo(55, 0);
    await rendered(page);
    await page.getByLabel('왼쪽 1번 인물 가로 위치', { exact: true }).fill('50');
    for (const id of ['single', 'four']) {
      await cut(page, id);
      await expect(page.getByRole('button', { name: /위치 편집$/ })).toHaveCount(viewport.width<viewport.height?1:id === 'single' ? 1 : 4);
      await page.getByTestId('story-stage-viewport').screenshot({ path: testInfo.outputPath(`${id}-${viewport.width}.png`) });
    }
    await expect(frame).toHaveAttribute('data-polish-instance', 'original');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  expect(content(await exported(page))).toEqual(content(source));
});

test('presentation preview visibly renders both native looks then restores neutral on back and restart', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'stories-runtime', 'Native pixels and playback lifecycle');
  await load(page);
  await cut(page, 'neutral');
  await page.getByRole('button', { name: '연출 미리보기', exact: true }).click();
  await rendered(page);
  const neutral = await pixels(page);
  await page.getByRole('button', { name: '편집으로', exact: true }).click();
  for (const look of ['flashback', 'fractured-reality']) {
    await cut(page, look);
    await tool(page, '연출 편집');
    await expect(page.getByLabel('분위기', { exact: true })).toHaveValue(look);
    await page.getByRole('button', { name: '연출 미리보기', exact: true }).click();
    await rendered(page);
    expect(difference(neutral, await pixels(page)), look).toBeGreaterThan(1);
    await page.getByTestId('story-stage-viewport').screenshot({ path: testInfo.outputPath(`${look}-native.png`) });
    await page.getByRole('button', { name: '편집으로', exact: true }).click();
  }
  await cut(page, 'neutral');
  await page.getByRole('button', { name: '연출 미리보기', exact: true }).click();
  await rendered(page);
  await page.getByRole('button', { name: '다음으로', exact: true }).click();
  await rendered(page);
  await page.getByRole('button', { name: '이전으로', exact: true }).click();
  await rendered(page);
  await expect.poll(async () => difference(neutral, await pixels(page)), { timeout: 10000 }).toBeLessThan(.25);
  await page.getByRole('button', { name: '편집으로', exact: true }).click();
  await cut(page, 'choice');
  await page.getByRole('button', { name: '연출 미리보기', exact: true }).click();
  await rendered(page);
  const frame = (await page.getByTestId('story-runtime-frame').boundingBox())!;
  await page.mouse.click(frame.x + frame.width * .5, frame.y + frame.height * (Math.min(110,Number(await page.getByTestId('story-runtime-status').getAttribute('data-textbox-y'))*.2)+45) / Number(await page.getByTestId('story-runtime-status').getAttribute('data-scene-height')));
  await rendered(page);
  await page.getByRole('button', { name: '다음으로', exact: true }).click();
  await expect(page.getByTestId('playback-status')).toHaveText('이야기 끝');
  await page.getByRole('button', { name: '처음부터 읽기', exact: true }).click();
  await rendered(page);
  await expect.poll(async () => difference(neutral, await pixels(page)), { timeout: 10000 }).toBeLessThan(.25);
  await page.getByRole('button', { name: '편집으로', exact: true }).click();
  expect(content(await exported(page))).toEqual(content(source));
});
