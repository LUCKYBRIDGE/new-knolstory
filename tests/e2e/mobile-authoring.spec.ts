import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { PNG } from 'pngjs';

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

const title = '작은 화면의 달빛 이야기';
const texts = ['달빛 숲에서 친구와 두 갈래 길을 발견했어요. '.repeat(8), '친구와 집으로 돌아와 따뜻한 차를 마셨어요.', '호숫가에 앉아 반짝이는 별을 바라보았어요.'];

async function tool(page: Page, name: string) {
  await page.getByRole('button', { name, exact: true }).click({ timeout: 10000 });
}

async function management(page: Page) {
  const disclosure = page.getByText('작품 관리', { exact: true });
  await expect(disclosure).toBeVisible();
  const details = disclosure.locator('..');
  if (!(await details.evaluate(node => (node as HTMLDetailsElement).open))) await disclosure.click();
}

async function saved(page: Page) {
  await expect(page.getByTestId('save-status')).toHaveText('기기에 저장됨');
}

async function exported(page: Page) {
  await management(page);
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: '작품 파일 내보내기', exact: true }).click({ timeout: 10000 });
  const download = await pending;
  expect(download.suggestedFilename()).toMatch(/\.knolstory$/);
  const path = (await download.path())!;
  return { path, document: JSON.parse(readFileSync(path, 'utf8')) };
}

async function currentId(page: Page) {
  await tool(page, '컷 목록');
  const id = await page.locator('[data-line-id][aria-current="true"]').getAttribute('data-line-id');
  expect(id).toBeTruthy();
  return id!;
}

async function create(page: Page) {
  await page.goto('/?view=editor');
  await management(page);
  await page.getByRole('button', { name: '새 작품 만들기', exact: true }).click({ timeout: 10000 });
  await page.getByLabel('새 작품 제목', { exact: true }).fill(title);
  await page.getByRole('button', { name: '빈 작품 시작', exact: true }).click({ timeout: 10000 });
  await tool(page, '자산 편집');
  const backgroundId = await page.getByLabel('배경', { exact: true }).locator('option').evaluateAll(options => options.map(option => (option as HTMLOptionElement).value).find(value => value && !value.startsWith('__'))!);
  const characterId = await page.getByLabel('왼쪽 인물', { exact: true }).locator('option').evaluateAll(options => options.map(option => (option as HTMLOptionElement).value).find(value => value)!);
  expect(backgroundId).toBeTruthy();
  expect(characterId).toBeTruthy();
  await page.getByLabel('배경', { exact: true }).selectOption(backgroundId);
  await page.getByLabel('왼쪽 인물', { exact: true }).selectOption(characterId);
  const ids: string[] = [];
  for (let index = 0; index < texts.length; index++) {
    if (index) await page.getByRole('button', { name: '현재 컷 뒤에 추가', exact: true }).click({ timeout: 10000 });
    ids.push(await currentId(page));
    await tool(page, '글 편집');
    await page.getByLabel('글 종류', { exact: true }).selectOption('dialogue');
    await page.getByLabel('화자 이름', { exact: true }).fill('달빛 친구');
    await page.getByLabel('대사 / 해설', { exact: true }).fill(texts[index]!);
    if (index) {
      await tool(page, '선택지 편집');
      await page.getByLabel('진행 방식').selectOption('goto');
      await page.getByLabel('도착 컷', { exact: true }).selectOption('__ending');
    }
  }
  for(const id of ids.slice(1)){await tool(page,'컷 목록');await page.locator(`[data-line-id="${id}"]`).click();await tool(page,'선택지 편집');await page.getByLabel('진행 방식').selectOption('goto');await page.getByLabel('도착 컷',{exact:true}).selectOption('__ending');}
  await tool(page, '컷 목록');
  await page.locator(`[data-line-id="${ids[0]}"]`).click();
  await tool(page, '선택지 편집');
  await page.getByLabel('진행 방식').selectOption('choice');
  await page.getByLabel('선택지 1 문구').fill('집으로 돌아가기');
  await page.getByLabel('선택지 1 도착 컷').selectOption(ids[1]!);
  await page.getByLabel('선택지 2 문구').fill('호수로 가기');
  await page.getByLabel('선택지 2 도착 컷').selectOption(ids[2]!);
  await saved(page);
  return { ids, backgroundId, characterId };
}

async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

async function rendered(page: Page) {
  const status = page.getByTestId('story-runtime-status');
  await expect(status).toContainText('연결됨', { timeout: 90000 });
  await expect.poll(() => status.evaluate(node => node.getAttribute('data-rendered-revision') === node.getAttribute('data-scene-revision')), { timeout: 30000 }).toBe(true);
}

test('phone authoring keeps drafts and runtime while tools, orientation, files and cut order change', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'host', 'Phone authoring and persistence coverage');
  const { ids, backgroundId, characterId } = await create(page);
  const frame = page.getByTestId('story-runtime-frame');
  await frame.evaluate(node => node.setAttribute('data-mobile-instance', 'original'));
  await tool(page, '글 편집');
  await expect(page.getByLabel('대사 / 해설')).toHaveValue(texts[0]!);
  const input = page.getByLabel('대사 / 해설');
  // Portrait editing now scrolls between the readable stage and active tool.
  await page.getByTestId('story-stage-viewport').scrollIntoViewIfNeeded();
  const stageBounds = (await page.getByTestId('story-stage-viewport').boundingBox())!;
  expect(stageBounds.y).toBeGreaterThanOrEqual(-1);
  expect(stageBounds.y + stageBounds.height).toBeLessThanOrEqual(844);
  expect(await input.evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
  for (const name of ['글 편집', '자산 편집', '선택지 편집', '연출 편집', '컷 목록', '도구 닫기']) {
    const button = page.getByRole('button', { name, exact: true });
    const bounds = (await button.boundingBox())!;
    expect(bounds.width, name).toBeGreaterThanOrEqual(44);
    expect(bounds.height, name).toBeGreaterThanOrEqual(44);
  }
  await noOverflow(page);
  await tool(page, '도구 닫기');
  await tool(page, '글 편집');
  const assetTool = page.getByRole('button', { name: '자산 편집', exact: true });
  await assetTool.focus();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Shift+Tab');
  await expect(assetTool).toBeFocused();
  expect(await assetTool.evaluate(node => getComputedStyle(node).outlineStyle)).not.toBe('none');
  await page.keyboard.press('Enter');
  await expect(assetTool).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('배경', { exact: true })).toBeVisible();
  await tool(page, '글 편집');
  await page.getByRole('button', { name: '전체 흐름 보기', exact: true }).click({ timeout: 10000 });
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '전체 흐름 보기', exact: true })).toBeFocused();
  for (const viewport of [{ width: 844, height: 390 }, { width: 1280, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await noOverflow(page);
    await expect(frame).toHaveAttribute('data-mobile-instance', 'original');
    await input.scrollIntoViewIfNeeded();
    const panel = (await page.getByRole('complementary', { name: '현재 컷 편집' }).boundingBox())!;
    const field = (await input.boundingBox())!;
    const stage = (await page.getByTestId('story-stage-viewport').boundingBox())!;
    expect(panel.height).toBeGreaterThan(60);
    expect(field.y + field.height).toBeGreaterThan(Math.max(0, panel.y));
    expect(field.y).toBeLessThan(Math.min(viewport.height, panel.y + panel.height));
    expect(stage.y + stage.height).toBeGreaterThan(0);
    expect(stage.y).toBeLessThan(viewport.height);
    if (viewport.width < 1000) {
      expect(await page.locator('main').evaluate(node => node.scrollTop)).toBe(0);
      const editorScroll = await page.getByRole('complementary', { name: '현재 컷 편집' }).locator('..').boundingBox();
      expect(editorScroll!.y).toBeGreaterThanOrEqual(0);
      expect(editorScroll!.y + editorScroll!.height).toBeLessThanOrEqual(viewport.height + 1);
    }
    await expect(input).toHaveValue(texts[0]!);
  }
  await tool(page, '글 편집');
  await expect(input).toHaveValue(texts[0]!);
  await expect(page.getByLabel('화자 이름', { exact: true })).toHaveValue('달빛 친구');
  await tool(page, '선택지 편집');
  await expect(page.getByLabel('선택지 2 도착 컷')).toHaveValue(ids[2]!);
  await tool(page, '컷 목록');
  await page.locator(`[data-line-id="${ids[2]}"]`).click();
  await page.getByRole('button', { name: '컷 위로 이동', exact: true }).click({ timeout: 10000 });
  expect(await currentId(page)).toBe(ids[2]);
  await page.getByRole('button', { name: '컷 아래로 이동', exact: true }).click({ timeout: 10000 });
  await page.locator(`[data-line-id="${ids[0]}"]`).click();
  await management(page);
  await page.getByRole('button', { name: '지금 저장', exact: true }).click({ timeout: 10000 });
  await saved(page);
  const original = await exported(page);
  expect(original.document.project.lines.map((line: { id: string }) => line.id)).toEqual(ids);
  for (const line of original.document.project.lines) {
    expect(line.backgroundId).toBe(backgroundId);
    expect(line.leftAssetId).toBe(characterId);
  }
  await tool(page, '글 편집');
  await input.fill('복원하기 전 임시 문장');
  await management(page);
  await page.getByLabel('작품 파일 가져오기').setInputFiles(original.path);
  await saved(page);
  await page.reload();
  await tool(page, '글 편집');
  await expect(input).toHaveValue(texts[0]!);
  await tool(page, '선택지 편집');
  await expect(page.getByLabel('선택지 2 도착 컷')).toHaveValue(ids[2]!);
  expect((await exported(page)).document.project).toEqual(original.document.project);
  await expect(page.getByTestId('workspace-error')).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('phone-authoring.png'), fullPage: true });
});

test('phone file-restored work renders real assets and both native Ren’Py endings with one iframe', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'stories-runtime', 'Actual phone Ren’Py rendering');
  const { ids } = await create(page);
  const original = await exported(page);
  await page.getByLabel('작품 파일 가져오기').setInputFiles(original.path);
  await saved(page);
  await page.reload();
  await rendered(page);
  const frame = page.getByTestId('story-runtime-frame');
  await frame.evaluate(node => node.setAttribute('data-mobile-instance', 'original'));
  await expect.poll(async () => {
    const png = PNG.sync.read(await page.getByTestId('story-stage-viewport').screenshot());
    const colors = new Set<number>();
    for (let y = Math.floor(png.height * .15); y < png.height * .5; y += 2)
      for (let x = Math.floor(png.width * .2); x < png.width * .8; x += 2) {
        const offset = (y * png.width + x) * 4;
        colors.add((png.data[offset]! << 16) + (png.data[offset + 1]! << 8) + png.data[offset + 2]!);
      }
    return colors.size;
  }, { timeout: 30000 }).toBeGreaterThan(150);
  await page.getByRole('button', { name: '현재 컷부터 읽기', exact: true }).click({ timeout: 10000 });
  await rendered(page);
  for (const index of [0,1]) {
    await expect(page.getByTestId('playback-status')).toHaveText('선택해 주세요');
    await page.getByTestId('story-stage-viewport').scrollIntoViewIfNeeded();
    const bounds = (await frame.boundingBox())!;
    const logicalHeight=Number(await page.getByTestId('story-runtime-status').getAttribute('data-scene-height'));
    await page.touchscreen.tap(bounds.x + bounds.width * .5, bounds.y + bounds.height * ((Math.min(110,Number(await page.getByTestId('story-runtime-status').getAttribute('data-textbox-y'))*.2)+45+index*55) / logicalHeight));
    await expect(page.getByTestId('playback-status')).toHaveText('읽는 중', { timeout: 30000 });
    await rendered(page);
    await page.getByRole('button', { name: '다음으로', exact: true }).click({ timeout: 10000 });
    await expect(page.getByTestId('playback-status')).toHaveText('이야기 끝');
    await expect(page.getByText(texts[index + 1]!, { exact: true })).toBeVisible();
    await expect(frame).toHaveAttribute('data-mobile-instance', 'original');
    if (!index) {
      await page.getByRole('button', { name: '처음부터 읽기', exact: true }).click({ timeout: 10000 });
      await rendered(page);
    }
  }
  await noOverflow(page);
  await page.screenshot({ path: testInfo.outputPath('phone-renpy-ending.png'), fullPage: true });
  await page.getByRole('button', { name: '편집으로', exact: true }).click();
  expect((await exported(page)).document.project.lines[0].flow.options.map((option: { targetLineId: string }) => option.targetLineId)).toEqual(ids.slice(1));
});
