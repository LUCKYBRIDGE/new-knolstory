import {openEditorDetails} from './native-reader';
import {resolveStageComposition,type StoryProject} from '../../packages/story-domain/src';
import {expectIndependentImportedProject,parseAuthoringFile,confirmAuthoringImport} from './authoring-file';
import {startShelfCreation,enterLibrary,openBuiltinEdition} from './library-entry';
import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

type Cut = { id: string; chapterId: string; text: string; backgroundId?: string; leftAssetId?: string; flow?: { type: string; targetLineId?: string | null; options?: { id: string; label: string; targetLineId: string | null }[] } };
type Project = { chapters: { id: string; title: string }[]; lines: Cut[] };
const texts = ['숲 입구에서 길을 골라요.', '숲 안에서 다시 길을 골라요.', '강을 따라 걸었어요.', '작은 꽃밭을 지났어요.', '큰 나무를 지났어요.', '모두 같은 다리에서 만났어요.', '집으로 돌아와 쉬었어요.', '호숫가에서 별을 보았어요.'];

async function saved(page: Page) {
  await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
}
async function exportStory(page: Page) {
  await saved(page);
  const menu=page.locator('[data-work-menu]');if(!await menu.evaluate(node=>(node as HTMLDetailsElement).open))await menu.locator(':scope>summary').click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: '작품 파일 내보내기', exact: true }).click();
  const path = (await (await pending).path())!;
  return { path, project: parseAuthoringFile(readFileSync(path, 'utf8')).project as Project };
}
async function menu(page:Page){const details=page.locator('[data-work-menu]');if(!await details.evaluate(node=>(node as HTMLDetailsElement).open))await details.locator(':scope>summary').click();}
async function flowTool(page:Page){
 const preparation=page.getByRole('region',{name:'작품 설정',exact:true});if(await preparation.isVisible())await preparation.getByRole('button',{name:'현재 컷 쓰기',exact:true}).click();
 await menu(page);await openEditorDetails(page,'편집 설정');for(const feature of ['선택지','분기조건'])await page.getByRole('checkbox',{name:`${feature} 편집 사용`,exact:true}).check();
 await page.getByRole('combobox',{name:'편집화면 선택',exact:true}).selectOption('basic');await openEditorDetails(page,'현재 컷 상세·메모·정리');await openEditorDetails(page,'현재 컷의 선택지·분기조건 편집');
}
async function changeFlow(page:Page,value:string){await page.getByLabel('진행 방식',{exact:true}).selectOption(value);const dialog=page.getByRole('dialog',{name:'진행 방식 변경 확인',exact:true});if(await dialog.isVisible())await dialog.getByRole('button',{name:'진행 방식 변경',exact:true}).click();await openEditorDetails(page,'현재 컷의 선택지·분기조건 편집');}
async function selectCut(page: Page, id: string) {await page.getByLabel('현재 장과 컷 이동').selectOption(id);await flowTool(page);}
async function choices(page: Page, targets: string[]) {
  await changeFlow(page,'choice');
  for (const [index, target] of targets.entries()) {
    await page.getByLabel(`선택지 ${index + 1} 문구`).fill(`갈래 ${index + 1}`);
    await page.getByLabel(`선택지 ${index + 1} 도착 컷`).selectOption(target);
  }
}
async function pick(page:Page,label:string,id:string,query:string){await page.getByRole('button',{name:new RegExp(`^${label} 이미지 찾기 ·`)}).click();const dialog=page.getByRole('dialog',{name:`이미지 선택 · ${label}`,exact:true});await dialog.getByLabel('이미지 검색').fill(query);await dialog.locator(`[data-asset-id="${id}"]`).click();await dialog.getByRole('button',{name:'선택한 이미지 적용',exact:true}).click();}
async function createNestedStory(page: Page) {
  await page.goto('/');await enterLibrary(page);await startShelfCreation(page);
  await page.getByLabel('새 작품 제목', { exact: true }).fill('숲에서 만나 두 엔딩으로');await page.getByRole('button', { name: '새 작품 생성', exact: true }).click();
  await menu(page);await openEditorDetails(page,'편집 설정');for(const feature of ['인물','선택지','분기조건'])await page.getByRole('checkbox',{name:`${feature} 편집 사용`,exact:true}).check();
  await openEditorDetails(page,'현재 컷의 장 설정');await page.locator('[data-chapter-settings]').getByRole('textbox',{name:/ 장 제목$/}).fill('갈림길과 만남');
  const backgroundId='seonnyeo.background.BG01-valley-day',characterId='seonnyeo.character.M01-base';
  await page.getByRole('combobox',{name:'편집화면 선택',exact:true}).selectOption('basic');await pick(page,'1컷 배경',backgroundId,'계곡');
  await menu(page);await page.getByRole('combobox',{name:'편집화면 선택',exact:true}).selectOption('characters');await pick(page,'1컷 인물 추가',characterId,'나무꾼');
  await menu(page);await page.getByRole('combobox',{name:'편집화면 선택',exact:true}).selectOption('basic');const ids:string[]=[];
  for(const [index,text] of texts.entries()){if(index){await menu(page);await page.getByRole('button',{name:'현재 컷 뒤에 추가',exact:true}).click();}ids.push(await page.getByLabel('현재 장과 컷 이동').inputValue());await page.locator('[data-current-cut] textarea').fill(text);}
  await selectCut(page,ids[0]!);await choices(page,[ids[1]!,ids[2]!]);await selectCut(page,ids[1]!);await choices(page,[ids[3]!,ids[4]!]);
  for(const index of [2,3,4]){await selectCut(page,ids[index]!);await changeFlow(page,'goto');await page.getByLabel('도착 컷',{exact:true}).selectOption(ids[5]!);}
  await selectCut(page,ids[5]!);await choices(page,[ids[6]!,ids[7]!]);for(const index of [6,7]){await selectCut(page,ids[index]!);await changeFlow(page,'ending');}
  await menu(page);await openEditorDetails(page,'보기 설정');await page.getByRole('button',{name:'장 추가',exact:true}).click();const unreachableId=await page.getByLabel('현재 장과 컷 이동').inputValue();await menu(page);await openEditorDetails(page,'현재 컷의 장 설정');await page.locator('[data-chapter-settings]').getByRole('textbox',{name:/ 장 제목$/}).fill('아직 연결하지 않은 장');await page.locator('[data-current-cut] textarea').fill('연결을 기다리는 숨겨진 이야기');await flowTool(page);await changeFlow(page,'ending');await selectCut(page,ids[5]!);await saved(page);return {ids,unreachableId,backgroundId,characterId};
}
async function openMap(page: Page) {
  await menu(page);await openEditorDetails(page,'편집 설정');await page.getByRole('checkbox',{name:'분기조건 편집 사용',exact:true}).check();
  await page.getByRole('button', { name: '전체 흐름 보기', exact: true }).click({ timeout: 10000 });
  const dialog = page.getByRole('dialog', { name: '전체 이야기 흐름',exact:true });await expect(dialog).toBeVisible();return dialog;
}

test('flow overview navigates nested branches and diagnoses pending and unreachable cuts without losing authored content', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'host', 'Host flow authoring and persistence');
  await page.addInitScript(()=>sessionStorage.setItem('knolstory-fullscreen-offered-v1','1'));
  test.setTimeout(180000);page.setDefaultTimeout(12000);await page.route('**/api/**',route=>route.abort());await page.route('**/runtime/**',route=>route.abort());
  const { ids, unreachableId, backgroundId, characterId } = await createNestedStory(page);
  await openEditorDetails(page,'현재 컷의 선택지·분기조건 편집');
  await page.getByRole('button',{name:'현재 컷 연결 살펴보기',exact:true}).click();const context=page.getByRole('dialog',{name:'현재 컷 연결 살펴보기',exact:true});
  await expect(context).toContainText('여러 길이 다시 만나는 지점');await expect(context).toContainText('모든 길에 반영');await page.keyboard.press('Escape');
  const original = (await exportStory(page)).project;
  await flowTool(page);
  await page.getByRole('button', { name: '선택지 추가', exact: true }).click();
  await page.getByLabel('선택지 3 문구').fill('아직 연결하지 않은 갈래');
  const dialog = await openMap(page);
  await expect(dialog.locator('[data-flow-map-line-id]')).toHaveCount(9);
  await expect.poll(async () => dialog.getByTestId('story-flow-diagram-scroll').evaluate((node) => node.scrollHeight <= node.clientHeight + 1)).toBe(true);
  await expect(dialog).toContainText('갈림길과 만남');
  await expect(dialog).toContainText('아직 연결하지 않은 장');
  await expect(dialog.locator(`[data-flow-map-line-id="${ids[5]}"]`)).toHaveAttribute('aria-current', 'true');
  await expect(dialog.locator(`[data-flow-map-line-id="${ids[5]}"]`)).toContainText('여러 갈래에서 함께 쓰는 컷');
  await expect(dialog.locator(`[data-flow-map-line-id="${ids[0]}"]`)).toContainText('분기');
  await expect(dialog.locator(`[data-flow-map-line-id="${ids[6]}"]`)).toContainText('엔딩');
  await expect(dialog).toContainText('도착 컷을 정해 주세요');
  await page.screenshot({ path: testInfo.outputPath('flow-map-desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.screenshot({ path: testInfo.outputPath('flow-map-phone.png'), fullPage: true });
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(page.locator('[data-work-menu]>summary')).toBeFocused();
  await page.setViewportSize({ width: 1280, height: 720 });
  await openMap(page);
  await dialog.locator(`[data-flow-issue-line-id="${ids[5]}"]`).first().click();
  await expect(dialog).not.toBeVisible();
  await expect(page.locator('[data-current-cut] textarea')).toHaveValue(texts[5]!);await flowTool(page);
  await page.getByLabel('선택지 3 도착 컷').selectOption(unreachableId);
  const connected = await openMap(page);
  await expect(connected.locator(`[data-flow-issue-line-id="${unreachableId}"]`)).toHaveCount(0);
  await connected.locator(`[data-flow-map-line-id="${ids[5]}"]`).click();await flowTool(page);
  await page.getByRole('button', { name: '선택지 3 삭제', exact: true }).click();
  const disconnected = await openMap(page);
  await disconnected.locator(`[data-flow-issue-line-id="${unreachableId}"]`).first().click();
  await expect(page.locator('[data-current-cut] textarea')).toHaveValue('연결을 기다리는 숨겨진 이야기');
  await selectCut(page, ids[5]!);
  await page.getByLabel('선택지 2 도착 컷').selectOption(ids[6]!);
  await page.getByLabel('선택지 2 도착 컷').selectOption(ids[7]!);
  const exported = await exportStory(page);
  expect(exported.project.chapters).toEqual(original.chapters);
  expect(exported.project.lines).toEqual(original.lines);
  const manuscript=exported.project as unknown as StoryProject;
  for (const cut of manuscript.lines.slice(0, 8)) {
    expect(cut.backgroundId).toBe(backgroundId);expect(resolveStageComposition(manuscript.chapters.find(chapter=>chapter.id===cut.chapterId),cut,manuscript).leftActors.map(actor=>actor.assetId)).toContain(characterId);
  }
  await page.locator('[data-current-cut] textarea').fill('파일에서 복원할 임시 수정');
  await saved(page);
  const menu=page.locator('[data-work-menu]');if(!await menu.evaluate(node=>(node as HTMLDetailsElement).open))await menu.locator(':scope>summary').click();await page.getByLabel('작품 파일 가져오기').setInputFiles(exported.path); await confirmAuthoringImport(page);
  await expect(page.getByTestId('preparation-save-status')).toHaveText('임시 보관됨');await page.getByRole('button',{name:'현재 컷 쓰기',exact:true}).click();await saved(page); await page.reload();
  expectIndependentImportedProject((await exportStory(page)).project,exported.project);
  const restored = await openMap(page);
  await restored.locator(`[data-flow-map-line-id="${ids[5]}"]`).click();
  await expect(page.locator('[data-current-cut] textarea')).toHaveValue(texts[5]!);
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
  const textPanel=page.getByText('대사·해설 텍스트 보기',{exact:true});
  if(await textPanel.locator('..').evaluate(node=>node.matches(':focus-within'))){await textPanel.focus();await textPanel.press('Enter');}
  const status=page.getByTestId('story-runtime-status'),bounds=(await page.getByTestId('story-runtime-frame').boundingBox())!;
  const runtime=page.frames().find(frame=>frame.url().includes('/runtime/'));expect(runtime).toBeDefined();
  const currentId=await page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).playback.lineId as string);
  await expect.poll(async()=>runtime!.evaluate(()=>(window as unknown as {renpy_exec:(code:string)=>Promise<string>}).renpy_exec('result = knol_scene["sceneId"]')),{timeout:30000}).toMatch(new RegExp(`/${currentId}$`));
  const layout=await runtime!.evaluate(()=>(window as unknown as {renpy_exec:(code:string)=>Promise<{rect:{x:number;y:number;width:number;height:number};padding:number;headerHeight:number;gap:number;buttonHeights:number[]}>}).renpy_exec('result = knol_choice_layout(knol_scene)'));
  expect(layout.buttonHeights).toHaveLength(2);
  const width=Number(await status.getAttribute('data-scene-width')),height=Number(await status.getAttribute('data-scene-height')),scale=Math.min(bounds.width/width,bounds.height/height);
  const y=layout.rect.y+layout.padding+layout.headerHeight+(index?layout.buttonHeights[0]!+layout.gap:0)+layout.buttonHeights[index]!/2;
  await page.mouse.click(bounds.x+(bounds.width-width*scale)/2+(layout.rect.x+layout.rect.width/2)*scale,bounds.y+(bounds.height-height*scale)/2+y*scale);
  await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).playback.lineId),{timeout:30000}).toBe(targetId);
  await rendered(page);
}
async function advanceWithKeyboard(page:Page){
  const summary=page.getByText('대사·해설 텍스트 보기',{exact:true});
  if(!await summary.locator('..').evaluate(node=>(node as HTMLDetailsElement).open)){await summary.focus();await summary.press('Enter');}
  const next=page.getByRole('button',{name:'다음으로',exact:true});await next.focus();await next.press('Enter');
}

test('native Ren’Py follows all six nested and merged routes to two independent endings with a persistent renderer', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'stories-runtime', 'Actual Ren’Py route verification');
  test.setTimeout(240000);page.setDefaultTimeout(15000);
  const { ids } = await createNestedStory(page);
  const exported = await exportStory(page);
  const menu=page.locator('[data-work-menu]');if(!await menu.evaluate(node=>(node as HTMLDetailsElement).open))await menu.locator(':scope>summary').click();await page.getByLabel('작품 파일 가져오기').setInputFiles(exported.path); await confirmAuthoringImport(page);
  await expect(page.getByTestId('preparation-save-status')).toHaveText('임시 보관됨');await page.getByRole('button',{name:'현재 컷 쓰기',exact:true}).click();await saved(page); await page.reload();
  await rendered(page);
  const frame = page.getByTestId('story-runtime-frame');
  await frame.evaluate(node => node.setAttribute('data-flow-instance', 'persistent'));
  let started=false;
  for (const route of [3, 4, 2]) {
    for (const ending of [6, 7]) {
      if(!started){await page.getByLabel('현재 장과 컷 이동',{exact:true}).selectOption(ids[0]!);await page.getByRole('button',{name:'이 컷부터 재생',exact:true}).click();started=true;}else{await page.getByRole('button',{name:'읽기 메뉴',exact:true}).click();await page.getByRole('button',{name:'처음부터 읽기',exact:true}).click();await page.getByRole('dialog',{name:'처음부터 읽을까요?',exact:true}).getByRole('button',{name:'처음부터 읽기',exact:true}).click();}
      await rendered(page);
      const beforeMenu = await page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).playback.lineId);expect(beforeMenu).toBe(ids[0]);
      await page.getByRole('button', { name: '지난기록', exact: true }).click();
      const menuDuringPlay = page.getByRole('dialog', { name: '지난기록' });
      await page.keyboard.press('Escape');
      await expect(menuDuringPlay).not.toBeVisible();
      await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).playback.lineId)).toBe(beforeMenu);
      await expect(page.getByTestId('playback-status')).toHaveText('선택해 주세요');
      await nativeChoice(page, route === 2 ? 1 : 0, ids[route === 2 ? 2 : 1]!);
      if (route !== 2) await nativeChoice(page, route === 3 ? 0 : 1, ids[route]!);
      await advanceWithKeyboard(page);
      await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).playback.lineId),{timeout:30000}).toBe(ids[5]);
      await nativeChoice(page, ending === 6 ? 0 : 1, ids[ending]!);
      await advanceWithKeyboard(page);
      await expect(page.getByTestId('playback-status')).toHaveText('이야기 끝');
      await expect(frame).toHaveAttribute('data-flow-instance', 'persistent');
    }
  }
  await rendered(page);await page.screenshot({ path: testInfo.outputPath('flow-native.png'), fullPage: true });
  await page.getByRole('button',{name:'읽기 메뉴',exact:true}).click();await page.getByRole('button',{name:'이 컷 편집하기',exact:true}).click();await expect(page.getByLabel('현재 장과 컷 이동')).toHaveValue(ids[7]!);await expect(page.locator('[data-current-cut] textarea')).toHaveValue(texts[7]!);expectIndependentImportedProject((await exportStory(page)).project,exported.project);await expect(frame).toHaveAttribute('data-flow-instance','persistent');
});


test('large inherited work can find and edit a cut beyond the initial chapter page', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'host', 'Host large-work flow navigation');
  test.setTimeout(90000);page.setDefaultTimeout(12000);await page.route('**/api/**',route=>route.abort());await page.route('**/runtime/**',route=>route.abort());
  await page.goto('/');await enterLibrary(page);await openBuiltinEdition(page,'seonnyeo','knolstory','edit');
  const original = (await exportStory(page)).project;
  expect(original.lines.length).toBeGreaterThan(100);
  const target = [...original.lines].reverse().find(cut => cut.text.length > 25)!;
  const dialog = await openMap(page);
  await dialog.getByLabel('흐름 검색').fill(target.text.slice(0, 25));
  const result = dialog.locator(`[data-flow-list-line-id="${target.id}"]`);
  await expect(result).toBeVisible();
  await result.click();
  await expect(page.locator('[data-current-cut] textarea')).toHaveValue(target.text);
  await expect(page.getByLabel('현재 장과 컷 이동')).toHaveValue(target.id);
  expect((await exportStory(page)).project).toEqual(original);
  const editedText=`${target.text}\n긴 원고의 마지막 부분에서 덧붙인 문장입니다.`;
  await page.locator('[data-current-cut] textarea').fill(editedText);await saved(page);
  const edited=await exportStory(page);
  const originalFull=original as StoryProject,editedFull=edited.project as StoryProject;
  expect(editedFull).toEqual({...originalFull,updatedAt:editedFull.updatedAt,lines:originalFull.lines.map(line=>line.id===target.id?{...line,text:editedText}:line)});
  await menu(page);await page.getByLabel('작품 파일 가져오기',{exact:true}).setInputFiles(edited.path);await confirmAuthoringImport(page);
  const preparation=page.getByRole('region',{name:'작품 설정',exact:true});if(await preparation.isVisible())await preparation.getByRole('button',{name:'현재 컷 쓰기',exact:true}).click();
  await saved(page);await page.reload();await saved(page);
  expectIndependentImportedProject((await exportStory(page)).project,edited.project);
  const reopened=await openMap(page);await reopened.getByLabel('흐름 검색').fill(editedText.slice(0,25));await reopened.locator(`[data-flow-list-line-id="${target.id}"]`).click();
  await expect(page.locator('[data-current-cut] textarea')).toHaveValue(editedText);
});
