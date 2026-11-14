import {expectIndependentImportedProject,parseAuthoringFile,confirmAuthoringImport,openFileExchange,currentCutText} from './authoring-file';
import {openChoiceEditing,openCurrentCutDetail,openEditingScreen,enableEditing} from './editor-screens';
import {suppressFullscreenOffer} from './mobile-fullscreen-offer';
import {enterLibrary,startShelfCreation} from './library-entry';
import { test, expect, type Page } from '@playwright/test';
import { readFileSync,appendFileSync } from 'node:fs';
import { PNG } from 'pngjs';

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
// Without the browser's save picker, 작품 파일 저장 falls back to a plain download that the test can observe.
test.beforeEach(async({page})=>{await suppressFullscreenOffer(page);await page.addInitScript(()=>{delete (window as unknown as {showSaveFilePicker?:unknown}).showSaveFilePicker;});});

const title = '작은 화면의 달빛 이야기';
const texts = ['달빛 숲에서 친구와 두 갈래 길을 발견했어요. '.repeat(8), '친구와 집으로 돌아와 따뜻한 차를 마셨어요.', '호숫가에 앉아 반짝이는 별을 바라보았어요.'];

/** The writing field of the cut selected in "현재 장과 컷 이동" (its name is "N컷 글"). */
const cutField=(page:Page)=>currentCutText(page);
/** Changing 진행 방식 may ask for a confirmation; accept it. */
async function setFlow(page:Page,value:string){
  await page.getByLabel('진행 방식',{exact:true}).selectOption(value);
  const confirm=page.getByRole('dialog',{name:'진행 방식 변경 확인',exact:true});if(await confirm.isVisible())await confirm.getByRole('button',{name:'진행 방식 변경',exact:true}).click();
}

async function management(page: Page) {
  const disclosure = page.locator('[data-work-menu]>summary');
  await expect(disclosure).toBeVisible();
  const details = disclosure.locator('..');
  if (!(await details.evaluate(node => (node as HTMLDetailsElement).open))) await disclosure.click();
}

async function saved(page: Page) {
  await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
}

async function exported(page: Page) {
  await management(page);await openFileExchange(page);
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: '작품 파일 내보내기', exact: true }).click({ timeout: 10000 });
  const download = await pending;
  expect(download.suggestedFilename()).toMatch(/\.knolstory$/);
  const path = (await download.path())!;
  return { path, document: parseAuthoringFile(readFileSync(path, 'utf8')) };
}

async function currentId(page: Page) {return page.getByLabel('현재 장과 컷 이동',{exact:true}).inputValue();}
async function selectCut(page:Page,id:string){await page.getByLabel('현재 장과 컷 이동',{exact:true}).selectOption(id);}
async function pick(page:Page,label:string){await page.getByRole('button',{name:new RegExp(`^${`${label} 이미지 찾기`} ·`),exact:false}).click();const dialog=page.getByRole('dialog',{name:`이미지 선택 · ${label}`,exact:true});const card=dialog.locator('[data-asset-id]').first();const id=(await card.getAttribute('data-asset-id'))!;expect(id).toBeTruthy();await card.click();await dialog.getByRole('button',{name:'선택한 이미지 적용',exact:true}).click();await expect(dialog).toHaveCount(0);return id;}
async function importFile(page:Page,path:string){await management(page);await page.getByLabel('작품 파일 가져오기').setInputFiles(path);await confirmAuthoringImport(page);const preparation=page.getByRole('region',{name:'작품 설정',exact:true});await expect(preparation).toBeVisible();await preparation.getByRole('button',{name:'현재 컷 쓰기',exact:true}).click();await saved(page);}

async function create(page: Page) {
  await page.goto('/');await enterLibrary(page);
  await startShelfCreation(page);
  await page.getByLabel('새 작품 제목', { exact: true }).fill(title);
  await page.getByRole('button', { name: '새 작품 생성', exact: true }).click({ timeout: 10000 });
  // Background is chosen in the basic view; the character needs the 인물 편집 screen (switched on in the settings menu).
  const backgroundId=await pick(page,'1컷 배경');
  await enableEditing(page,'인물');await openEditingScreen(page,'인물 편집');
  const characterId=await pick(page,'1컷 인물 추가');
  await openEditingScreen(page,'기본편집');
  const ids: string[] = [];
  for (let index = 0; index < texts.length; index++) {
    // The new cut is appended after the chapter's last cut, where the next-cut card reads "+ 다음 컷 만들기".
    if (index) await page.getByRole('button', { name: /^\+ 다음 컷 만들기/ }).click({ timeout: 10000 });
    ids.push(await currentId(page));
    await page.getByLabel('현재 컷 글 종류', { exact: true }).selectOption('dialogue');
    await page.getByLabel('현재 컷 화자', { exact: true }).fill('달빛 친구');
    await (await cutField(page)).fill(texts[index]!);
  }
  await enableEditing(page,'선택지');
  for(const id of ids.slice(1)){await selectCut(page,id);await openChoiceEditing(page);await setFlow(page,'ending');}
  await selectCut(page,ids[0]!);
  await openChoiceEditing(page);
  await setFlow(page,'choice');
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
  await expect.poll(() => status.evaluate(node => Number(node.getAttribute('data-rendered-revision'))>=0&&node.getAttribute('data-rendered-revision') === node.getAttribute('data-scene-revision')), { timeout: 30000 }).toBe(true);
}

test('phone authoring keeps drafts and runtime while tools, orientation, files and cut order change', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'host', 'Phone authoring and persistence coverage');
  const { ids, backgroundId, characterId } = await create(page);
  const frame = page.getByTestId('story-runtime-frame');
  await frame.evaluate(node => node.setAttribute('data-mobile-instance', 'original'));
  const input = await cutField(page);
  await expect(input).toHaveValue(texts[0]!);
  // Portrait editing now scrolls between the readable stage and active tool.
  await page.getByTestId('story-stage-viewport').scrollIntoViewIfNeeded();
  const stageBounds = (await page.getByTestId('story-stage-viewport').boundingBox())!;
  expect(stageBounds.y).toBeGreaterThanOrEqual(-1);
  expect(stageBounds.y + stageBounds.height).toBeLessThanOrEqual(844);
  expect(await input.evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
  // Phone touch targets: the settings menu, cut creation, branching and the folded cut detail are all at least 44px.
  for (const [name, locator] of [
    ['설정', page.locator('[data-work-menu]>summary')],
    ['+ 이 컷 뒤에 새 컷 넣기', page.getByRole('button', { name: '+ 이 컷 뒤에 새 컷 넣기', exact: true })],
    ['갈래 나누기·선택지 고치기', page.getByRole('button', { name: /^(\+ 여기서 이야기 나누기|선택지 고치기)$/ })],
    ['현재 컷 상세·메모·정리', page.locator('details>summary').filter({ hasText: /^현재 컷 상세·메모·정리$/ })],
    ['이 컷부터 재생', page.getByRole('button', { name: '이 컷부터 재생', exact: true })],
  ] as const) {
    await locator.scrollIntoViewIfNeeded();
    const bounds = (await locator.boundingBox())!;
    expect(bounds.width, name).toBeGreaterThanOrEqual(44);
    expect(bounds.height, name).toBeGreaterThanOrEqual(44);
  }
  await noOverflow(page);
  // Keyboard focus stays visible on the settings menu button and Enter opens it.
  const settings = page.locator('[data-work-menu]>summary');
  await settings.scrollIntoViewIfNeeded();
  await settings.focus();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Shift+Tab');
  await expect(settings).toBeFocused();
  expect(await settings.evaluate(node => getComputedStyle(node).outlineStyle)).not.toBe('none');
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-work-menu]')).toHaveAttribute('open', '');
  await expect(page.getByRole('combobox', { name: '편집화면 선택', exact: true })).toBeVisible();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-work-menu]')).not.toHaveAttribute('open', '');
  await expect(page.getByRole('button',{name:/^1컷 배경 이미지 찾기 ·/,exact:false})).toBeVisible();
  // 전체 흐름 보기 belongs to 분기조건 편집.
  await enableEditing(page, '분기조건');
  await management(page);
  await page.getByRole('button', { name: '전체 흐름 보기', exact: true }).click({ timeout: 10000 });
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  // The map opens from the settings menu, which closes with it; focus returns to the 설정 button.
  await expect(page.locator('[data-work-menu]>summary')).toBeFocused();
  for (const viewport of [{ width: 844, height: 390 }, { width: 1280, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await noOverflow(page);
    await expect(frame).toHaveAttribute('data-mobile-instance', 'original');
    await input.scrollIntoViewIfNeeded();
    const panel = (await page.getByRole('group', { name: /^현재 컷 · / }).boundingBox())!;
    const field = (await input.boundingBox())!;
    const stage = (await page.getByTestId('story-stage-viewport').boundingBox())!;
    appendFileSync(testInfo.outputPath('editor-geometries.jsonl'),JSON.stringify({viewport,panel,field,stage,scrollY:await page.evaluate(()=>scrollY)})+'\n');
    expect(panel.height).toBeGreaterThan(60);
    expect(field.y + field.height).toBeGreaterThan(Math.max(0, panel.y));
    expect(field.y).toBeLessThan(Math.min(viewport.height, panel.y + panel.height));
    if(viewport.width>=1000){expect(stage.y + stage.height).toBeGreaterThan(0);expect(stage.y).toBeLessThan(viewport.height);}
    if (viewport.width < 1000) {
      expect(await page.locator('main').evaluate(node => node.scrollTop)).toBe(0);
      expect(field.y).toBeGreaterThanOrEqual(panel.y-1);expect(field.y+field.height).toBeLessThanOrEqual(panel.y+panel.height+1);
    }
    // Current narrow editor stacks stage and text in a scrollable document.
    // Verify each is reachable without requiring both to fit at once.
    await page.getByTestId('story-stage-viewport').scrollIntoViewIfNeeded();const visibleStage=(await page.getByTestId('story-stage-viewport').boundingBox())!;expect(visibleStage.y+visibleStage.height).toBeGreaterThan(0);expect(visibleStage.y).toBeLessThan(viewport.height);await expect(frame).toHaveAttribute('data-mobile-instance','original');await input.scrollIntoViewIfNeeded();const visibleInput=(await input.boundingBox())!;expect(visibleInput.y+visibleInput.height).toBeGreaterThan(0);expect(visibleInput.y).toBeLessThan(viewport.height);
    await expect(input).toHaveValue(texts[0]!);
  }
  await expect(input).toHaveValue(texts[0]!);
  await expect(page.getByLabel('현재 컷 화자', { exact: true })).toHaveValue('달빛 친구');
  await openChoiceEditing(page);
  await expect(page.getByLabel('선택지 2 도착 컷')).toHaveValue(ids[2]!);
  await selectCut(page,ids[2]!);
  const detail = await openCurrentCutDetail(page);
  await detail.getByRole('button', { name: '현재 컷 위로', exact: true }).click({ timeout: 10000 });
  expect(await currentId(page)).toBe(ids[2]);
  await detail.getByRole('button', { name: '현재 컷 아래로', exact: true }).click({ timeout: 10000 });
  await selectCut(page,ids[0]!);
  await management(page);
  const saving = page.waitForEvent('download');
  await page.getByRole('button', { name: '작품 파일 저장', exact: true }).click({ timeout: 10000 });
  await saving;
  await saved(page);
  const original = await exported(page);
  expect(original.document.project.lines.map((line: { id: string }) => line.id)).toEqual(ids);
  for (const line of original.document.project.lines) {
    expect(line.backgroundId).toBe(backgroundId);
    expect(line.leftAssetId).toBe(characterId);
  }
  await (await cutField(page)).fill('복원하기 전 임시 문장');
  await management(page);
  await importFile(page,original.path);
  await saved(page);
  await page.reload();
  await expect(await cutField(page)).toHaveValue(texts[0]!);
  await openChoiceEditing(page);
  await expect(page.getByLabel('선택지 2 도착 컷')).toHaveValue(ids[2]!);
  expectIndependentImportedProject((await exported(page)).document.project,original.document.project);
  await expect(page.getByTestId('workspace-error')).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('phone-authoring.png'), fullPage: true });
});

test('phone file-restored work renders real assets and both native Ren’Py endings with one iframe', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'stories-runtime', 'Actual phone Ren’Py rendering');
  const { ids } = await create(page);
  const original = await exported(page);
  await importFile(page,original.path);
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
  await page.getByRole('button', { name: '이 컷부터 재생', exact: true }).click({ timeout: 10000 });
  await rendered(page);
  for (const index of [0,1]) {
    await expect(page.getByTestId('playback-status')).toHaveText('선택해 주세요');
    await page.getByTestId('story-stage-viewport').scrollIntoViewIfNeeded();
    const bounds = (await frame.boundingBox())!;
    const status=page.getByTestId('story-runtime-status'),rect=JSON.parse((await status.getAttribute('data-choices-rect'))!) as {x:number;y:number;width:number;height:number};expect(rect).not.toBeNull();const width=Number(await status.getAttribute('data-scene-width')),height=Number(await status.getAttribute('data-scene-height')),scale=Math.min(bounds.width/width,bounds.height/height);
    await page.touchscreen.tap(bounds.x+(bounds.width-width*scale)/2+(rect.x+rect.width/2)*scale,bounds.y+(bounds.height-height*scale)/2+(rect.y+Math.min(20,Math.floor(rect.height/8))+25+index*60)*scale);
    await expect(page.getByTestId('playback-status')).toHaveText('읽는 중', { timeout: 30000 });
    await rendered(page);
    const next=page.getByRole('button',{name:'다음으로',exact:true});await next.focus();await next.press('Enter');
    await expect(page.getByTestId('playback-status')).toHaveText('이야기 끝');
    await rendered(page);await expect(page.getByRole('region',{name:'이야기 무대',exact:true}).getByText(texts[index + 1]!, { exact: true })).toBeVisible();
    expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).playback.path)).toEqual([ids[0],ids[index+1]]);await page.getByRole('button',{name:'읽기 메뉴',exact:true}).focus();await page.getByTestId('story-stage-viewport').screenshot({path:testInfo.outputPath(`phone-native-ending-${index+1}.png`)});
    await expect(frame).toHaveAttribute('data-mobile-instance', 'original');
    if (!index) {
      await page.getByRole('button',{name:'읽기 메뉴',exact:true}).click();await page.getByRole('button',{name:'처음부터 읽기',exact:true}).click();await page.getByRole('dialog',{name:'처음부터 읽을까요?',exact:true}).getByRole('button',{name:'처음부터 읽기',exact:true}).click();
      await rendered(page);
    }
  }
  await noOverflow(page);
  await page.screenshot({ path: testInfo.outputPath('phone-renpy-ending.png'), fullPage: true });
  await page.getByRole('button',{name:'읽기 메뉴',exact:true}).click();await page.getByRole('button',{name:'이 컷 편집하기',exact:true}).click();
  const returned=(await exported(page)).document.project;expect(returned.lines[0].flow.options.map((option: { targetLineId: string }) => option.targetLineId)).toEqual(ids.slice(1));expectIndependentImportedProject(returned,original.document.project);await expect(page.getByLabel('현재 장과 컷 이동',{exact:true})).toHaveValue(ids[2]!);
});
