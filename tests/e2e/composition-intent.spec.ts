import {previousReadCut} from './reader-actions';
import {currentCutRow,currentCutText,expectIndependentImportedProject,openFileExchange,parseAuthoringFile,confirmAuthoringImport} from './authoring-file';
import {openChoiceEditing,openEditingScreen} from './editor-screens';
import { test, expect, type Page } from '@playwright/test';
import { readFileSync,writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';
const assetCatalog=parseAuthoringFile(readFileSync('packages/asset-registry/src/catalog.json','utf8'));
const resolveAsset=(id:string)=>assetCatalog.find((asset:{id:string})=>asset.id===id);

const child = 'onggojib.character.child-pixel';
const adult = 'onggojib.character.classic-master';
const seed = parseAuthoringFile(readFileSync('tests/fixtures/stories/presentation-polish.json', 'utf8'));
const background = seed.lines[0].backgroundId as string;
const source = {
  ...seed, id: 'composition-intent', title: '작은 아이와 나의 시점',
  chapters: [{ ...seed.chapters[0], id: 'intent', title: '구도를 고르는 하루', leftAssetId: child, rightAssetId: adult }],
  lines: [{ ...seed.lines[0], id: 'body', chapterId: 'intent', order: 1, inheritActors: true, stageComposition: undefined,
    leftAssetId: '', rightAssetId: '', speakerName: '아이', text: '작은 아이와 큰 어른이 함께 서 있어요.', presentation: undefined, flow: undefined }],
};
const file = { name: 'composition-intent.knolstory', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ documentType: 'story-maker-project', schemaVersion: 5, savedAt: '2026-10-06T00:00:00.000Z', appVersion: 'knolstory-next-test', project: source })) };

async function management(page: Page) {
  const summary = page.locator('[data-work-menu]>summary');
  if (!(await summary.locator('..').evaluate(node => (node as HTMLDetailsElement).open))) await summary.click();
  await openFileExchange(page);
}
async function closeManagement(page: Page) {
  const summary = page.locator('[data-work-menu]>summary');
  if (await summary.locator('..').evaluate(node => (node as HTMLDetailsElement).open)) await summary.click();
}
/** Characters are placed on the 인물 편집 screen; the other screens keep their own jobs. */
async function characters(page: Page) { await openEditingScreen(page, '인물 편집'); }
async function basic(page: Page) { await openEditingScreen(page, '기본편집'); }
/** The 1-based position of the selected cut inside the screen's cut list ("N컷 편집"). */
async function cutNo(page: Page) { return ((await (await currentCutRow(page)).getAttribute('aria-label')) ?? '').replace(/컷 편집$/, ''); }
async function actorEditors(page: Page) { return (await currentCutRow(page)).getByRole('button', { name: /^\d+컷 인물 \d+ 이미지 찾기/ }); }
/** `pattern` is the picker label as a regular expression source, e.g. "\\d+컷 배경". */
async function pick(page:Page,pattern:string,id:string){
 await page.getByRole('button',{name:new RegExp(`^${pattern} 이미지 찾기`)}).click();const dialog=page.getByRole('dialog',{name:new RegExp(`^이미지 선택 · ${pattern}$`)});await expect(dialog).toBeVisible();if(id==='__none')await dialog.getByRole('button',{name:'이미지 없음',exact:true}).click();else await dialog.locator('[data-asset-id="'+id+'"]').click();await dialog.getByRole('button',{name:'선택한 이미지 적용',exact:true}).click();await expect(dialog).toHaveCount(0);
}
/** Keep the same focus state so the optional semantic layer does not cover native pixels. */
async function settleStageFocus(page: Page) { await page.getByRole('button', { name: '읽기 메뉴', exact: true }).focus(); }
async function next(page: Page) {
  const button = page.getByRole('button', { name: '다음으로', exact: true });
  await expect(button).toBeEnabled();
  await button.focus();
  await button.press('Enter');
}
async function exported(page: Page) {
  await management(page);
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: '작품 파일 내보내기', exact: true }).click();
  const download = await pending;
  const path = (await download.path())!;
  await closeManagement(page);
  return { path, project: parseAuthoringFile(readFileSync(path, 'utf8')).project };
}
async function rendered(page: Page) {
  const status = page.getByTestId('story-runtime-status');
  await expect(status).toContainText('연결됨', { timeout: 90000 });
  await expect.poll(() => status.evaluate(node => node.getAttribute('data-rendered-revision') === node.getAttribute('data-scene-revision')), { timeout: 30000 }).toBe(true);
}
async function selectCut(page: Page, id: string) {
  await page.getByLabel('현재 장과 컷 이동', { exact: true }).selectOption(id);
  await characters(page);
}
async function addCut(page: Page, text: string) {
  await basic(page);
  await page.getByRole('button', { name: /^\+ (다음 컷 만들기|이 컷 뒤에 새 컷 넣기)/ }).click();
  const id = await page.getByLabel('현재 장과 컷 이동', { exact: true }).inputValue();
  const field = await currentCutText(page);
  await field.fill(text);
  await characters(page);
  return id;
}
async function author(page: Page, native = false) {
  page.setDefaultTimeout(10000);
  await page.goto('/?view=editor');
  await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
  await management(page);
  await page.getByLabel('작품 파일 가져오기').setInputFiles(file); await confirmAuthoringImport(page);
  await closeManagement(page);
  await expect(await currentCutText(page)).toHaveValue(source.lines[0].text);
  if (native) await rendered(page);
  await characters(page);
  const editors = await actorEditors(page);
  const row = await currentCutRow(page);
  await expect(editors).toHaveCount(2, {timeout:20000});
  await row.getByLabel('1컷 인물 1 크기', { exact: true }).fill('90');
  const centered = await addCut(page, '나는 가운데 선 아이를 바라보았다.');
  const centeredRow = await currentCutRow(page);
  await expect(await actorEditors(page)).toHaveCount(2);
  await centeredRow.getByLabel(/^\d+컷 인물 1 배치 위치$/).selectOption('center');
  await centeredRow.getByRole('button', { name: '인물 2 빼기', exact: true }).click();
  await expect(await actorEditors(page)).toHaveCount(1);
  const front = await addCut(page, '어른이 정면으로 나를 바라본다.');
  await pick(page, `${await cutNo(page)}컷 인물 1`, adult);
  const frontRow = await currentCutRow(page);
  await frontRow.getByLabel(/^\d+컷 인물 1 크기$/).fill('100');
  await frontRow.getByLabel(/^\d+컷 인물 1 방향$/).selectOption('original');
  const empty = await addCut(page, '텅 빈 마을에는 바람만 불었다.');
  await (await currentCutRow(page)).getByRole('button', { name: '인물 1 빼기', exact: true }).click();
  await expect(await actorEditors(page)).toHaveCount(0);
  const pov = await addCut(page, '나는 잠시 눈을 감고 내 마음의 소리를 들었다.');
  const povNo = await cutNo(page);
  await basic(page);
  await pick(page, `${povNo}컷 배경`, '__none');
  await page.getByLabel('현재 컷 글 종류', { exact: true }).selectOption('dialogue');
  await page.getByLabel('현재 컷 화자', { exact: true }).fill('나');
  await openChoiceEditing(page, '분기조건');
  await chooseFlow(page, 'goto');
  await page.getByLabel('도착 컷', { exact: true }).selectOption('__ending');
  await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
  return ['body', centered, front, empty, pov];
}
async function chooseFlow(page: Page, value: string) {
  await page.getByLabel('진행 방식', { exact: true }).selectOption(value);
  const confirmation = page.getByRole('dialog', { name: '진행 방식 변경 확인', exact: true });
  if (await confirmation.isVisible()) await confirmation.getByRole('button', { name: '진행 방식 변경', exact: true }).click();
}
function sceneryColors(png: PNG) {
  const colors = new Set<number>();
  for (let y = Math.floor(png.height * .12); y < png.height * .55; y += 2)
    for (let x = Math.floor(png.width * .1); x < png.width * .9; x += 2) {
      const offset = (y * png.width + x) * 4;
      colors.add((png.data[offset]! << 16) + (png.data[offset + 1]! << 8) + png.data[offset + 2]!);
    }
  return colors.size;
}

test('composition authoring separates body scale, center, original facing and actor exits through files', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'host', 'Editor composition controls and roundtrip');
  const ids = await author(page);
  const original = await exported(page);
  const lines = original.project.lines;
  expect(lines).toHaveLength(5);
  expect(lines[0].stageComposition.leftActors[0]).toMatchObject({ assetId: child, scaleMultiplier: .9 });
  expect(lines[0].stageComposition.rightActors[0].assetId).toBe(adult);
  expect(lines[1].stageComposition.leftActors[0].position).toBe('center');
  expect(lines[1].stageComposition.rightActors).toEqual([]);
  expect(lines[2].stageComposition.leftActors[0]).toMatchObject({ assetId: adult, facing: 'original', position: 'center' });
  for (const line of lines.slice(3)) expect(line.stageComposition).toMatchObject({ leftActors: [], rightActors: [] });
  expect(lines[3].backgroundId).toBe(background);
  expect(lines[4]).toMatchObject({ speakerName: '나', type: 'dialogue', backgroundMode: 'none', backgroundId: '' });
  await basic(page);
  await (await currentCutText(page)).fill('복원 전 임시 문장');
  await management(page);
  await page.getByLabel('작품 파일 가져오기').setInputFiles(original.path); await confirmAuthoringImport(page);
  await page.reload();
  expectIndependentImportedProject((await exported(page)).project,original.project);
  for (const [index, id] of ids.entries()) {
    await selectCut(page, id);
    await expect(await actorEditors(page)).toHaveCount(index === 0 ? 2 : index < 3 ? 1 : 0);
  }
  await expect(page.getByTestId('workspace-error')).toHaveCount(0);
});

test('actual Ren’Py preserves authored bodies, front center and empty POV across back and viewport changes', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'stories-runtime', 'Native composition and pixel verification');
  test.setTimeout(240000);
  const ids = await author(page, true);
  const original = await exported(page);
  await page.getByLabel('작품 파일 가져오기').setInputFiles(original.path); await confirmAuthoringImport(page);
  await page.reload();
  await rendered(page);
  const frame = page.getByTestId('story-runtime-frame');
  await frame.evaluate(node => node.setAttribute('data-composition-instance', 'original'));
  await selectCut(page, ids[0]);
  await rendered(page);
  const handles = page.getByRole('button', { name: /위치 편집$/ });
  const childHeight = Number(await handles.nth(0).getAttribute('data-actor-height'));
  const adultHeight = Number(await handles.nth(1).getAttribute('data-actor-height'));
  expect(childHeight).toBeGreaterThan(0);
  const childGeometry=resolveAsset(child)!.geometry!, adultGeometry=resolveAsset(adult)!.geometry!;
  const paintedRatio=childHeight*(childGeometry.bottom-childGeometry.top)/(adultHeight*(adultGeometry.bottom-adultGeometry.top));
  expect(paintedRatio).toBeCloseTo(.9 * (childGeometry.bottom-childGeometry.top)/(adultGeometry.bottom-adultGeometry.top), 6);
  await page.getByTestId('story-stage-viewport').screenshot({ path: testInfo.outputPath('small-and-big-native.png') });
  for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }, { width: 1280, height: 900 }]) {
    await page.setViewportSize(viewport);
    await selectCut(page, ids[1]);
    await rendered(page);
    await expect(handles).toHaveCount(1);
    await expect(frame).toHaveAttribute('data-composition-instance', 'original');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await selectCut(page, ids[2]);
  await rendered(page);
  await expect(handles).toHaveCount(1);
  await expect(handles).toHaveAttribute('data-actor-flip', 'original');
  await page.getByTestId('story-stage-viewport').screenshot({ path: testInfo.outputPath('front-center-native.png') });
  await page.getByRole('button', { name: '이 컷부터 재생', exact: true }).click();
  await rendered(page);
  await next(page);await expect(page.getByLabel('현재 장과 컷 이동', { exact: true })).toHaveValue(ids[3]);
  await rendered(page);
  await page.getByTestId('story-stage-viewport').screenshot({path:testInfo.outputPath('semantic-forward-focus.png')});
  await settleStageFocus(page);
  const backgroundOnly = PNG.sync.read(await page.getByTestId('story-stage-viewport').screenshot({ scale: 'css' }));
  writeFileSync(testInfo.outputPath('background-only-before-back.png'),PNG.sync.write(backgroundOnly));
  expect(sceneryColors(backgroundOnly)).toBeGreaterThan(150);
  await next(page);await expect(page.getByLabel('현재 장과 컷 이동', { exact: true })).toHaveValue(ids[4]);
  await rendered(page);
  await settleStageFocus(page);
  const textOnly = PNG.sync.read(await page.getByTestId('story-stage-viewport').screenshot({ scale: 'css' }));
  expect(sceneryColors(textOnly)).toBeLessThan(5);
  await expect(page.getByText(source.lines[0].text, { exact: true })).toHaveCount(0);
  await page.getByTestId('story-stage-viewport').screenshot({ path: testInfo.outputPath('first-person-text-only-native.png') });
  await previousReadCut(page);await expect(page.getByLabel('현재 장과 컷 이동', { exact: true })).toHaveValue(ids[3]);
  await rendered(page);
  await page.getByTestId('story-stage-viewport').screenshot({path:testInfo.outputPath('semantic-back-focus.png')});
  await settleStageFocus(page);
  const restored = PNG.sync.read(await page.getByTestId('story-stage-viewport').screenshot({ scale: 'css' }));
  writeFileSync(testInfo.outputPath('background-only-restored.png'),PNG.sync.write(restored));expect(restored.width).toBe(backgroundOnly.width);expect(restored.height).toBe(backgroundOnly.height);
  expect(restored.data.equals(backgroundOnly.data),'the entire returned stage pixel buffer is identical').toBe(true);
  await previousReadCut(page);await expect(page.getByLabel('현재 장과 컷 이동', { exact: true })).toHaveValue(ids[2]);
  await rendered(page);
  expect(sceneryColors(PNG.sync.read(await page.getByTestId('story-stage-viewport').screenshot({ scale: 'css' })))).toBeGreaterThan(150);
  await expect(frame).toHaveAttribute('data-composition-instance', 'original');
  await page.getByRole('button',{name:'읽기 메뉴',exact:true}).click();await page.getByRole('button',{name:'이 컷 편집하기',exact:true}).click();
  expectIndependentImportedProject((await exported(page)).project,original.project);
});
