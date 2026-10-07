import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { PNG } from 'pngjs';

const title = '달빛 숲의 두 갈래 길';
const texts = ['숲에서 두 갈래 길을 발견했어요.', '친구와 함께 집으로 돌아왔어요.', '호숫가에서 별을 바라보았어요.'];

async function save(page: Page) {
  await expect(page.getByTestId('save-status')).toHaveText('기기에 저장됨');
}

async function createBranchingStory(page: Page) {
  await page.goto('/?view=editor');
  await page.getByRole('button', { name: '새 작품 만들기', exact: true }).click({ timeout: 10000 });
  await page.getByLabel('새 작품 제목', { exact: true }).fill(title);
  await page.getByRole('button', { name: '빈 작품 시작', exact: true }).click();
  await expect(page.locator('[data-line-id]')).toHaveCount(1);
  await expect(page.getByLabel('대사 / 해설')).toHaveValue('');
  await expect(page.getByLabel('작품 제목', { exact: true })).toHaveValue(title);
  await page.getByLabel('장 제목', { exact: true }).fill('달빛 숲');

  const backgroundId = await page.getByLabel('배경', { exact: true }).locator('option').evaluateAll(options =>
    options.map(option => (option as HTMLOptionElement).value).find(value => value && !value.startsWith('__'))!,
  );
  const characterId = await page.getByLabel('왼쪽 인물', { exact: true }).locator('option').evaluateAll(options =>
    options.map(option => (option as HTMLOptionElement).value).find(value => value)!,
  );
  expect(backgroundId).toBeTruthy();
  expect(characterId).toBeTruthy();

  for (let index = 0; index < texts.length; index++) {
    if (index > 0) await page.getByRole('button', { name: '현재 컷 뒤에 추가', exact: true }).click();
    await page.getByLabel('대사 / 해설').fill(texts[index]!);
    await page.getByLabel('배경', { exact: true }).selectOption(backgroundId);
    await page.getByLabel('왼쪽 인물', { exact: true }).selectOption(characterId);
    if (index > 0) {
      await page.getByLabel('진행 방식').selectOption('goto');
      await page.getByLabel('도착 컷', { exact: true }).selectOption('__ending');
    }
  }
  const ids = await page.locator('[data-line-id]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-line-id')!));
  expect(ids).toHaveLength(3);
  // Appending after an ending extends that path. Mark independent branch endings after all cuts exist.
  for(const id of ids.slice(1)){await page.locator(`[data-line-id="${id}"]`).click();await page.getByLabel('진행 방식').selectOption('goto');await page.getByLabel('도착 컷',{exact:true}).selectOption('__ending');}
  await page.locator(`[data-line-id="${ids[0]}"]`).click();
  await page.getByLabel('진행 방식').selectOption('choice');
  await page.getByLabel('선택지 1 문구').fill('집으로 돌아가기');
  await page.getByLabel('선택지 1 도착 컷').selectOption(ids[1]!);
  await page.getByLabel('선택지 2 문구').fill('호수로 가기');
  await page.getByLabel('선택지 2 도착 컷').selectOption(ids[2]!);
  await save(page);
  return { ids, backgroundId, characterId };
}

async function rendered(page: Page) {
  const status = page.getByTestId('story-runtime-status');
  await expect(status).toContainText('연결됨', { timeout: 90000 });
  await expect.poll(() => status.evaluate(node => node.getAttribute('data-rendered-revision') === node.getAttribute('data-scene-revision')), { timeout: 30000 }).toBe(true);
}

test('blank authoring saves a real-asset branching work and preserves it through file roundtrip', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'host', 'Host authoring and persistence coverage');
  const { ids, backgroundId, characterId } = await createBranchingStory(page);
  await page.reload();
  await expect(page.getByLabel('작품 제목', { exact: true })).toHaveValue(title);
  await expect(page.getByLabel('장 제목', { exact: true })).toHaveValue('달빛 숲');
  await expect(page.locator('[data-line-id]')).toHaveCount(3);
  await expect(page.getByLabel('선택지 1 문구')).toHaveValue('집으로 돌아가기');
  await expect(page.getByLabel('선택지 2 도착 컷')).toHaveValue(ids[2]!);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '작품 파일 내보내기' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.knolstory$/);
  const path = (await download.path())!;
  const document = JSON.parse(readFileSync(path, 'utf8'));
  expect(document.project.lines).toHaveLength(3);
  for (const line of document.project.lines) {
    expect(line.backgroundId).toBe(backgroundId);
    expect(line.leftAssetId).toBe(characterId);
  }
  expect(document.project.lines[0].flow.options.map((option: { targetLineId: string }) => option.targetLineId)).toEqual(ids.slice(1));
  expect(document.project.lines.slice(1).map((line: { flow: { targetLineId: string | null } }) => line.flow.targetLineId)).toEqual([null, null]);
  await page.getByLabel('대사 / 해설').fill('가져오기로 복원할 임시 문장');
  await save(page);
  await page.getByLabel('작품 파일 가져오기').setInputFiles(path);
  await expect(page.getByLabel('대사 / 해설')).toHaveValue(texts[0]!);
  await expect(page.getByLabel('선택지 2 문구')).toHaveValue('호수로 가기');
  await expect(page.getByTestId('workspace-error')).toHaveCount(0);
  await save(page);
  await page.reload();
  await expect(page.getByLabel('대사 / 해설')).toHaveValue(texts[0]!);
});

test('newly authored branching work renders real assets and both native Ren’Py choices reach endings', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'stories-runtime', 'Actual Ren’Py runtime coverage');
  const { ids } = await createBranchingStory(page);
  await rendered(page);
  const frame = page.getByTestId('story-runtime-frame');
  await frame.evaluate(node => node.setAttribute('data-authoring-instance', 'persistent'));
  await expect.poll(async () => {
    const png = PNG.sync.read(await page.getByTestId('story-stage-viewport').screenshot());
    const colors = new Set<number>();
    for (let y = Math.floor(png.height * .15); y < png.height * .5; y += 3)
      for (let x = Math.floor(png.width * .2); x < png.width * .8; x += 3) {
        const offset = (y * png.width + x) * 4;
        colors.add((png.data[offset]! << 16) + (png.data[offset + 1]! << 8) + png.data[offset + 2]!);
      }
    return colors.size;
  }, { timeout: 30000 }).toBeGreaterThan(150);
  await page.getByRole('button', { name: '현재 컷부터 읽기' }).click();
  await rendered(page);
  for (const index of [0,1]) {
    await expect(page.getByTestId('playback-status')).toHaveText('선택해 주세요');
    const bounds = (await frame.boundingBox())!;
    await page.mouse.click(bounds.x + bounds.width * .5, bounds.y + bounds.height * ((Math.min(110,Number(await page.getByTestId('story-runtime-status').getAttribute('data-textbox-y'))*.2)+45+index*55) / Number(await page.getByTestId('story-runtime-status').getAttribute('data-scene-height'))));
    await expect(page.locator(`[data-line-id="${ids[index + 1]}"]`), `native choice ${index + 1} reaches its own cut`).toHaveAttribute('aria-current', 'true', { timeout: 30000 });
    await rendered(page);
    await page.getByRole('button', { name: '다음으로', exact: true }).click();
    await expect(page.getByTestId('playback-status')).toHaveText('이야기 끝');
    await expect(frame).toHaveAttribute('data-authoring-instance', 'persistent');
    if (index === 0) {
      await page.getByRole('button', { name: '이전으로', exact: true }).click();
      await page.getByRole('button', { name: '이전으로', exact: true }).click();
      await rendered(page);
    }
  }
  await page.screenshot({ path: 'test-results/blank-authored-renpy-ending.png', fullPage: true });
});

async function exportedProject(page: Page) {
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: '작품 파일 내보내기' }).click();
  return JSON.parse(readFileSync((await (await pending).path())!, 'utf8')).project;
}

test('blank creation preserves existing work and structural editing retains choice identities', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'host', 'Host structural editing coverage');
  await page.goto('/?view=editor');
  await save(page);
  await page.getByLabel('대사 / 해설').fill('기존 선녀 작품에 남겨 둔 문장');
  await save(page);
  const { ids } = await createBranchingStory(page);
  const newWorkId = await page.getByLabel('작품 선택').inputValue();
  const original = (await exportedProject(page)).lines[0].flow.options;
  await page.getByRole('button', { name: '선택지 추가', exact: true }).click();
  await page.getByRole('button', { name: '선택지 추가', exact: true }).click();
  await expect(page.getByRole('button', { name: '선택지 추가', exact: true })).toBeDisabled();
  await expect(page.getByLabel('선택지 4 문구')).toBeVisible();
  await page.getByRole('button', { name: '선택지 4 삭제', exact: true }).click();
  await page.getByRole('button', { name: '선택지 3 삭제', exact: true }).click();
  expect((await exportedProject(page)).lines[0].flow.options).toEqual(original);
  await expect(page.getByRole('button', { name: '선택지 1 삭제', exact: true })).toBeDisabled();
  await page.getByLabel('선택지 2 도착 컷').selectOption('');
  await page.getByRole('button', { name: '선택지 2에 새 장 연결', exact: true }).click();
  const chapterStart = await page.locator('[data-line-id][aria-current="true"]').getAttribute('data-line-id');
  expect(chapterStart).toBeTruthy();
  await page.getByLabel('장 제목', { exact: true }).fill('새로운 갈래');
  await page.getByLabel('대사 / 해설').fill('새 장에서 이어지는 이야기');
  await page.getByRole('button', { name: '현재 컷 뒤에 추가', exact: true }).click();
  const movedId = await page.locator('[data-line-id][aria-current="true"]').getAttribute('data-line-id');
  await page.getByRole('button', { name: '컷 위로 이동', exact: true }).click();
  const moved = await exportedProject(page);
  expect(moved.lines.find((line: { id: string }) => line.id === movedId).order).toBe(1);
  expect(moved.lines.find((line: { id: string }) => line.id === chapterStart).order).toBe(2);
  const branch = moved.lines.find((line: { id: string }) => line.id === ids[0]);
  expect(branch.flow.options.map((option: { id: string }) => option.id)).toEqual(original.map((option: { id: string }) => option.id));
  expect(branch.flow.options[0].targetLineId).toBe(ids[1]);
  expect(branch.flow.options[1].targetLineId).toBe(chapterStart);
  await page.getByRole('button', { name: '지금 저장', exact: true }).click();
  await save(page);
  await page.getByLabel('작품 선택').selectOption('seonnyeo');
  await expect(page.getByLabel('대사 / 해설')).toHaveValue('기존 선녀 작품에 남겨 둔 문장');
  await save(page);
  await page.reload();
  await expect(page.getByLabel('대사 / 해설')).toHaveValue('기존 선녀 작품에 남겨 둔 문장');
  await page.getByLabel('작품 선택').selectOption(newWorkId);
  await expect(page.getByLabel('작품 제목', { exact: true })).toHaveValue(title);
  await expect(page.locator('[data-line-id]')).toHaveCount(5);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await expect(page.getByTestId('workspace-error')).toHaveCount(0);
});

test('explicit save retries a failed device write while preserving the draft', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'host', 'Host save retry coverage');
  await page.goto('/?view=editor');
  await save(page);
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Object.defineProperty(window, '__restoreAuthoringStorage', { configurable: true, value: () => { Storage.prototype.setItem = original; } });
    Storage.prototype.setItem = function (key, value) {
      if (key === 'knolstory-next-workspace-v1') throw new DOMException('Storage unavailable', 'QuotaExceededError');
      return original.call(this, key, value);
    };
  });
  await page.getByLabel('대사 / 해설').fill('저장이 실패해도 다시 저장할 수 있는 문장');
  await expect(page.getByTestId('save-status')).toContainText('기기 저장 실패');
  await expect(page.getByLabel('대사 / 해설')).toHaveValue('저장이 실패해도 다시 저장할 수 있는 문장');
  await page.evaluate(() => (window as unknown as { __restoreAuthoringStorage: () => void }).__restoreAuthoringStorage());
  await page.getByRole('button', { name: '지금 저장', exact: true }).click();
  await save(page);
  await expect(page.getByTestId('workspace-error')).toHaveCount(0);
  await page.reload();
  await expect(page.getByLabel('대사 / 해설')).toHaveValue('저장이 실패해도 다시 저장할 수 있는 문장');
});

test('corrupt stored workspace remains untouched while switching and importing file-only drafts', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'host', 'Host corrupt-storage recovery coverage');
  const originalRaw = '{broken workspace content that must remain recoverable';
  await page.addInitScript(raw => localStorage.setItem('knolstory-next-workspace-v1', raw), originalRaw);
  await page.goto('/?view=editor');
  await expect(page.getByTestId('save-status')).toHaveText('저장 내용을 불러오지 못함');
  await expect(page.getByRole('button', { name: '지금 저장', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: '새 작품 만들기', exact: true })).toBeDisabled();
  await page.getByLabel('작품 선택').selectOption('heungbu');
  await page.getByLabel('대사 / 해설').fill('손상된 저장 내용 대신 파일로 보관할 새 문장');
  await expect(page.getByRole('button', { name: '지금 저장', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: '새 작품 만들기', exact: true })).toBeDisabled();
  await expect(page.getByTestId('save-status')).toContainText('파일로 보관');
  expect(await page.evaluate(() => localStorage.getItem('knolstory-next-workspace-v1'))).toBe(originalRaw);
  const project = JSON.parse(readFileSync('tests/fixtures/stories/seonnyeo.json', 'utf8'));
  await page.getByLabel('작품 파일 가져오기').setInputFiles({
    name: 'recoverable.knolstory',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ documentType: 'story-maker-project', schemaVersion: 5, savedAt: '2026-10-06T00:00:00.000Z', appVersion: 'corrupt-storage-test', project })),
  });
  await expect(page.getByLabel('작품 선택')).toHaveValue(/import:/);
  await page.getByLabel('대사 / 해설').fill('파일로 가져온 뒤에도 원본 저장은 유지해요.');
  await expect(page.getByRole('button', { name: '지금 저장', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: '새 작품 만들기', exact: true })).toBeDisabled();
  await expect(page.getByTestId('save-status')).toContainText('파일로 보관');
  const exported = await exportedProject(page);
  expect(exported.lines[0].text).toBe('파일로 가져온 뒤에도 원본 저장은 유지해요.');
  expect(await page.evaluate(() => localStorage.getItem('knolstory-next-workspace-v1'))).toBe(originalRaw);
});
