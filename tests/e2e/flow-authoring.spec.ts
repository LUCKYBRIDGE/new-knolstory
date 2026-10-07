import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

type Cut = { id: string; chapterId: string; text: string; backgroundId?: string; leftAssetId?: string; flow?: { type: string; targetLineId?: string | null; options?: { id: string; label: string; targetLineId: string | null }[] } };
type Project = { chapters: { id: string; title: string }[]; lines: Cut[] };
const texts = ['숲 입구에서 길을 골라요.', '숲 안에서 다시 길을 골라요.', '강을 따라 걸었어요.', '작은 꽃밭을 지났어요.', '큰 나무를 지났어요.', '모두 같은 다리에서 만났어요.', '집으로 돌아와 쉬었어요.', '호숫가에서 별을 보았어요.'];

async function saved(page: Page) {
  await expect(page.getByTestId('save-status')).toHaveText('기기에 저장됨');
}
async function exportStory(page: Page) {
  await saved(page);
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: '작품 파일 내보내기', exact: true }).click();
  const path = (await (await pending).path())!;
  return { path, project: JSON.parse(readFileSync(path, 'utf8')).project as Project };
}
async function selectCut(page: Page, id: string) {
  const button = page.locator(`[data-line-id="${id}"]`);
  await button.evaluate(node => { const details = node.closest('details'); if (details) details.open = true; });
  await button.click();
}
async function choices(page: Page, targets: string[]) {
  await page.getByLabel('진행 방식').selectOption('choice');
  for (const [index, target] of targets.entries()) {
    await page.getByLabel(`선택지 ${index + 1} 문구`).fill(`갈래 ${index + 1}`);
    await page.getByLabel(`선택지 ${index + 1} 도착 컷`).selectOption(target);
  }
}
async function createNestedStory(page: Page) {
  await page.goto('/?view=editor');
  await page.getByRole('button', { name: '새 작품 만들기', exact: true }).click();
  await page.getByLabel('새 작품 제목', { exact: true }).fill('숲에서 만나 두 엔딩으로');
  await page.getByRole('button', { name: '빈 작품 시작', exact: true }).click();
  await page.getByLabel('장 제목', { exact: true }).fill('갈림길과 만남');
  const backgroundId = await page.getByLabel('배경', { exact: true }).locator('option').evaluateAll(options => options.map(option => (option as HTMLOptionElement).value).find(value => value && !value.startsWith('__'))!);
  const characterId = await page.getByLabel('왼쪽 인물', { exact: true }).locator('option').evaluateAll(options => options.map(option => (option as HTMLOptionElement).value).find(Boolean)!);
  expect(backgroundId).toBeTruthy();
  expect(characterId).toBeTruthy();
  const ids: string[] = [];
  for (const [index, text] of texts.entries()) {
    if (index) await page.getByRole('button', { name: '현재 컷 뒤에 추가', exact: true }).click();
    ids.push((await page.locator('[data-line-id][aria-current="true"]').getAttribute('data-line-id'))!);
    await page.getByLabel('대사 / 해설').fill(text);
    await page.getByLabel('배경', { exact: true }).selectOption(backgroundId);
    await page.getByLabel('왼쪽 인물', { exact: true }).selectOption(characterId);
  }
  await selectCut(page, ids[0]!); await choices(page, [ids[1]!, ids[2]!]);
  await selectCut(page, ids[1]!); await choices(page, [ids[3]!, ids[4]!]);
  for (const index of [2, 3, 4]) {
    await selectCut(page, ids[index]!);
    await page.getByLabel('진행 방식').selectOption('goto');
    await page.getByLabel('도착 컷', { exact: true }).selectOption(ids[5]!);
  }
  await selectCut(page, ids[5]!); await choices(page, [ids[6]!, ids[7]!]);
  for (const index of [6, 7]) {
    await selectCut(page, ids[index]!);
    await page.getByLabel('진행 방식').selectOption('ending');
  }
  await page.getByRole('button', { name: '새 장 추가', exact: true }).click();
  const unreachableId = (await page.locator('[data-line-id][aria-current="true"]').getAttribute('data-line-id'))!;
  await page.getByLabel('장 제목', { exact: true }).fill('아직 연결하지 않은 장');
  await page.getByLabel('대사 / 해설').fill('연결을 기다리는 숨겨진 이야기');
  await page.getByLabel('진행 방식').selectOption('ending');
  await selectCut(page, ids[5]!);
  await saved(page);
  return { ids, unreachableId, backgroundId, characterId };
}
async function openMap(page: Page) {
  await page.getByRole('button', { name: '전체 흐름 보기', exact: true }).click({ timeout: 10000 });
  const dialog = page.getByRole('dialog', { name: '전체 이야기 흐름' });
  await expect(dialog).toBeVisible();
  return dialog;
}

test('flow overview navigates nested branches and diagnoses pending and unreachable cuts without losing authored content', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'host', 'Host flow authoring and persistence');
  const { ids, unreachableId, backgroundId, characterId } = await createNestedStory(page);
  await expect(page.getByTestId('flow-context')).toContainText('현재 편집 위치');
  await expect(page.getByTestId('flow-context')).toContainText('공유 컷');
  await expect(page.getByTestId('flow-context')).toContainText('모든 갈래에 반영');
  const original = (await exportStory(page)).project;
  await page.getByRole('button', { name: '선택지 추가', exact: true }).click();
  await page.getByLabel('선택지 3 문구').fill('아직 연결하지 않은 갈래');
  const dialog = await openMap(page);
  await expect(dialog.locator('[data-flow-map-line-id]')).toHaveCount(9);
  await expect.poll(async () => dialog.getByTestId('story-flow-diagram-scroll').evaluate((node) => node.scrollHeight <= node.clientHeight + 1)).toBe(true);
  await expect(dialog).toContainText('갈림길과 만남');
  await expect(dialog).toContainText('아직 연결하지 않은 장');
  await expect(dialog.locator(`[data-flow-map-line-id="${ids[5]}"]`)).toHaveAttribute('aria-current', 'true');
  await expect(dialog.locator(`[data-flow-map-line-id="${ids[5]}"]`)).toContainText('합류');
  await expect(dialog.locator(`[data-flow-map-line-id="${ids[0]}"]`)).toContainText('분기');
  await expect(dialog.locator(`[data-flow-map-line-id="${ids[6]}"]`)).toContainText('엔딩');
  await expect(dialog).toContainText('연결 대기');
  await page.screenshot({ path: testInfo.outputPath('flow-map-desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.screenshot({ path: testInfo.outputPath('flow-map-phone.png'), fullPage: true });
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole('button', { name: '전체 흐름 보기', exact: true })).toBeFocused();
  await page.setViewportSize({ width: 1280, height: 720 });
  await openMap(page);
  await dialog.locator(`[data-flow-issue-line-id="${ids[5]}"]`).first().click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByLabel('대사 / 해설')).toHaveValue(texts[5]!);
  await page.getByLabel('선택지 3 도착 컷').selectOption(unreachableId);
  const connected = await openMap(page);
  await expect(connected.locator(`[data-flow-issue-line-id="${unreachableId}"]`)).toHaveCount(0);
  await connected.locator(`[data-flow-map-line-id="${ids[5]}"]`).click();
  await page.getByRole('button', { name: '선택지 3 삭제', exact: true }).click();
  const disconnected = await openMap(page);
  await disconnected.locator(`[data-flow-issue-line-id="${unreachableId}"]`).first().click();
  await expect(page.getByLabel('대사 / 해설')).toHaveValue('연결을 기다리는 숨겨진 이야기');
  await selectCut(page, ids[5]!);
  await page.getByLabel('선택지 2 도착 컷').selectOption(ids[6]!);
  await page.getByLabel('선택지 2 도착 컷').selectOption(ids[7]!);
  const exported = await exportStory(page);
  expect(exported.project.chapters).toEqual(original.chapters);
  expect(exported.project.lines).toEqual(original.lines);
  for (const cut of exported.project.lines.slice(0, 8)) {
    expect(cut.backgroundId).toBe(backgroundId); expect(cut.leftAssetId).toBe(characterId);
  }
  await page.getByLabel('대사 / 해설').fill('파일에서 복원할 임시 수정');
  await saved(page);
  await page.getByLabel('작품 파일 가져오기').setInputFiles(exported.path);
  await saved(page); await page.reload();
  expect((await exportStory(page)).project).toEqual(exported.project);
  const restored = await openMap(page);
  await restored.locator(`[data-flow-map-line-id="${ids[5]}"]`).click();
  await expect(page.getByLabel('대사 / 해설')).toHaveValue(texts[5]!);
  await page.screenshot({ path: testInfo.outputPath('flow-host.png'), fullPage: true });
});

async function rendered(page: Page) {
  const status = page.getByTestId('story-runtime-status');
  await expect(status).toContainText('연결됨', { timeout: 90000 });
  await expect.poll(() => status.evaluate(node => node.getAttribute('data-rendered-revision') === node.getAttribute('data-scene-revision')), { timeout: 30000 }).toBe(true);
}
async function nativeChoice(page: Page, index: number, targetId: string) {
  await rendered(page);
  await expect(page.getByTestId('playback-status')).toHaveText('선택해 주세요');
  const bounds = (await page.getByTestId('story-runtime-frame').boundingBox())!;
  await page.mouse.click(bounds.x + bounds.width * .5, bounds.y + bounds.height * ((Math.min(110,Number(await page.getByTestId('story-runtime-status').getAttribute('data-textbox-y'))*.2)+45+index*55) / Number(await page.getByTestId('story-runtime-status').getAttribute('data-scene-height'))));
  await expect(page.locator(`[data-line-id="${targetId}"]`)).toHaveAttribute('aria-current', 'true', { timeout: 30000 });
  await rendered(page);
}

test('native Ren’Py follows all six nested and merged routes to two independent endings with a persistent renderer', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'stories-runtime', 'Actual Ren’Py route verification');
  test.setTimeout(240000);
  const { ids } = await createNestedStory(page);
  const exported = await exportStory(page);
  await page.getByLabel('작품 파일 가져오기').setInputFiles(exported.path);
  await saved(page); await page.reload();
  await rendered(page);
  const frame = page.getByTestId('story-runtime-frame');
  await frame.evaluate(node => node.setAttribute('data-flow-instance', 'persistent'));
  for (const route of [3, 4, 2]) {
    for (const ending of [6, 7]) {
      await page.getByRole('button', { name: '처음부터 읽기', exact: true }).click();
      await rendered(page);
      const beforeMenu = await page.locator('[data-line-id][aria-current="true"]').getAttribute('data-line-id');
      await page.getByRole('button', { name: '지난 기록', exact: true }).click();
      const menuDuringPlay = page.getByRole('dialog', { name: '지난 기록' });
      await page.keyboard.press('Escape');
      await expect(menuDuringPlay).not.toBeVisible();
      await expect(page.locator(`[data-line-id="${beforeMenu}"]`)).toHaveAttribute('aria-current', 'true');
      await expect(page.getByTestId('playback-status')).toHaveText('선택해 주세요');
      await nativeChoice(page, route === 2 ? 1 : 0, ids[route === 2 ? 2 : 1]!);
      if (route !== 2) await nativeChoice(page, route === 3 ? 0 : 1, ids[route]!);
      await page.getByRole('button', { name: '다음으로', exact: true }).click();
      await expect(page.locator(`[data-line-id="${ids[5]}"]`)).toHaveAttribute('aria-current', 'true');
      await nativeChoice(page, ending === 6 ? 0 : 1, ids[ending]!);
      await page.getByRole('button', { name: '다음으로', exact: true }).click();
      await expect(page.getByTestId('playback-status')).toHaveText('이야기 끝');
      await expect(frame).toHaveAttribute('data-flow-instance', 'persistent');
    }
  }
  await page.screenshot({ path: testInfo.outputPath('flow-native.png'), fullPage: true });
});


test('large inherited work can find and edit a cut beyond the initial chapter page', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'host', 'Host large-work flow navigation');
  await page.goto('/?view=editor');
  await page.getByLabel('작품 선택').selectOption('seonnyeo');
  const original = (await exportStory(page)).project;
  expect(original.lines.length).toBeGreaterThan(100);
  const target = [...original.lines].reverse().find(cut => cut.text.length > 25)!;
  const dialog = await openMap(page);
  await dialog.getByLabel('흐름 검색').fill(target.text.slice(0, 25));
  const result = dialog.locator(`[data-flow-list-line-id="${target.id}"]`);
  await expect(result).toBeVisible();
  await result.click();
  await expect(page.getByLabel('대사 / 해설')).toHaveValue(target.text);
  await expect(page.locator(`[data-line-id="${target.id}"]`)).toHaveAttribute('aria-current', 'true');
  expect((await exportStory(page)).project).toEqual(original);
});
