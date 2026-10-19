import {previousReadCut} from './reader-actions';
import {parseAuthoringFile,confirmAuthoringImport} from './authoring-file';
import {startShelfCreation,enterLibrary,openShelfAction} from './library-entry';
import {expectIndependentImportedProject} from './authoring-file';
import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { PNG } from 'pngjs';

const title = '달빛 숲의 두 갈래 길';
const texts = ['숲에서 두 갈래 길을 발견했어요.', '친구와 함께 집으로 돌아왔어요.', '호숫가에서 별을 바라보았어요.'];

async function save(page: Page) {
  await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
}

async function menu(page:Page){const root=page.locator('[data-work-menu]');if(!await root.evaluate(node=>(node as HTMLDetailsElement).open))await root.locator(':scope>summary').click();}
async function tool(page:Page,name:string){const pane=page.getByRole('region',{name:'작품 설정',exact:true});if(await pane.isVisible())await pane.getByRole('button',{name:'현재 컷 쓰기',exact:true}).click();const root=page.locator('[data-additional-tools]');if(!await root.evaluate(node=>(node as HTMLDetailsElement).open))await root.locator(':scope>summary').click();await page.getByRole('button',{name,exact:true}).click();}
async function chooseCut(page:Page,id:string){await page.getByLabel('현재 장과 컷 이동',{exact:true}).selectOption(id);}
async function shelf(page:Page){await page.getByRole('button',{name:'서재로',exact:true}).click();await expect(page.getByRole('main',{name:'로컬 서재',exact:true})).toBeVisible();}
async function createBranchingStory(page: Page) {
  await page.goto('/');await enterLibrary(page);await startShelfCreation(page);
  await page.getByLabel('새 작품 제목', { exact: true }).fill(title);
  await page.getByRole('button', { name: '새 작품 생성', exact: true }).click();
  await expect(page.getByLabel('현재 장과 컷 이동').locator('option')).toHaveCount(1);
  await expect(page.getByLabel('대사 / 해설')).toHaveValue('');
  await expect(page.getByRole('button',{name:'현재 컷 삭제',exact:true})).toHaveCount(0);
  await tool(page,'컷 목록');await expect(page.getByLabel('작품 제목', { exact: true })).toHaveValue(title);
  await page.getByLabel('장 제목', { exact: true }).fill('달빛 숲');
  const backgroundId='seonnyeo.background.BG01-valley-day',characterId='seonnyeo.character.M01-base';
  const ids:string[]=[];
  for (let index = 0; index < texts.length; index++) {
    await page.getByRole('button',{name:'글 편집',exact:true}).click();
    if (index > 0) await page.getByRole('button', { name: '현재 컷 뒤에 추가', exact: true }).click();
    ids.push(await page.getByLabel('현재 장과 컷 이동').inputValue());
    await page.getByLabel('대사 / 해설').fill(texts[index]!);
    await page.getByRole('button',{name:'배경·인물 편집',exact:true}).click();
    for(const [label,id,query] of [['배경',backgroundId,'계곡'],['왼쪽 인물',characterId,'나무꾼']]){
      await page.getByRole('button',{name:`${label} 이미지 찾기`,exact:true}).click();
      const picker=page.getByRole('dialog',{name:`이미지 선택 · ${label}`,exact:true});
      await picker.getByLabel('이미지 검색').fill(query);await picker.locator(`[data-asset-id="${id}"]`).click();
      await picker.getByRole('button',{name:'선택한 이미지 적용',exact:true}).click();
    }
  }
  expect(new Set(ids).size).toBe(3);
  for(const id of ids.slice(1)){await chooseCut(page,id);await tool(page,'선택지 편집');await page.getByLabel('진행 방식').selectOption('ending');}
  await chooseCut(page,ids[0]!);await tool(page,'선택지 편집');await page.getByLabel('진행 방식').selectOption('choice');
  await page.getByLabel('선택지 1 문구').fill('집으로 돌아가기');await page.getByLabel('선택지 1 도착 컷').selectOption(ids[1]!);
  await page.getByLabel('선택지 2 문구').fill('호수로 가기');await page.getByLabel('선택지 2 도착 컷').selectOption(ids[2]!);
  await save(page);return { ids, backgroundId, characterId };
}

async function rendered(page: Page) {
  const status = page.getByTestId('story-runtime-status');
  await expect(status).toContainText('연결됨', { timeout: 90000 });
  await expect.poll(() => status.evaluate(node => Number(node.getAttribute('data-rendered-revision')) >= 0 && node.getAttribute('data-rendered-revision') === node.getAttribute('data-scene-revision')), { timeout: 30000 }).toBe(true);
}

test('blank authoring saves a real-asset branching work and preserves it through file roundtrip', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'host', 'Host authoring and persistence coverage');
  const { ids, backgroundId, characterId } = await createBranchingStory(page);
  await page.reload();await tool(page,'컷 목록');
  await expect(page.getByLabel('작품 제목', { exact: true })).toHaveValue(title);
  await expect(page.getByLabel('장 제목', { exact: true })).toHaveValue('달빛 숲');
  await expect(page.getByLabel('현재 장과 컷 이동').locator('option')).toHaveCount(3);await tool(page,'선택지 편집');
  await expect(page.getByLabel('선택지 1 문구')).toHaveValue('집으로 돌아가기');
  await expect(page.getByLabel('선택지 2 도착 컷')).toHaveValue(ids[2]!);
  await menu(page);const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '작품 파일 내보내기' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.knolstory$/);
  const path = (await download.path())!;
  const document = parseAuthoringFile(readFileSync(path, 'utf8'));
  expect(document.project.lines).toHaveLength(3);
  for (const line of document.project.lines) {
    expect(line.backgroundId).toBe(backgroundId);
    expect(line.leftAssetId).toBe(characterId);
  }
  expect(document.project.lines[0].flow.options.map((option: { targetLineId: string }) => option.targetLineId)).toEqual(ids.slice(1));
  expect(document.project.lines.slice(1).map((line: { flow: { targetLineId: string | null } }) => line.flow.targetLineId)).toEqual([null, null]);
  await page.getByLabel('대사 / 해설').fill('가져오기로 복원할 임시 문장');
  await save(page);
  await page.getByLabel('작품 파일 가져오기').setInputFiles(path); await confirmAuthoringImport(page);
  await expect(page.getByLabel('대사 / 해설')).toHaveValue(texts[0]!);
  await tool(page,'선택지 편집');await expect(page.getByLabel('선택지 2 문구')).toHaveValue('호수로 가기');
  expectIndependentImportedProject(await exportedProject(page),document.project);
  await expect(page.getByTestId('workspace-error')).toHaveCount(0);
  await save(page);
  await page.reload();
  await expect(page.getByLabel('대사 / 해설')).toHaveValue(texts[0]!);expectIndependentImportedProject(await exportedProject(page),document.project);
});

test('newly authored branching work renders real assets and both native Ren’Py choices reach endings', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'stories-runtime', 'Actual Ren’Py runtime coverage');test.setTimeout(240000);
  const { ids } = await createBranchingStory(page);const authored=await exportedProject(page);
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
  await page.getByRole('button', { name: '이 컷부터 재생',exact:true }).click();
  await rendered(page);
  for (const index of [0,1]) {
    await expect(page.getByTestId('playback-status')).toHaveText('선택해 주세요');
    const status=page.getByTestId('story-runtime-status'),bounds=(await frame.boundingBox())!;
    const rect=JSON.parse((await status.getAttribute('data-choices-rect'))!) as {x:number;y:number;width:number;height:number};expect(rect).not.toBeNull();
    const width=Number(await status.getAttribute('data-scene-width')),height=Number(await status.getAttribute('data-scene-height')),scale=Math.min(bounds.width/width,bounds.height/height),padding=Math.min(20,Math.floor(rect.height/8));
    await page.mouse.click(bounds.x+(bounds.width-width*scale)/2+(rect.x+rect.width/2)*scale,bounds.y+(bounds.height-height*scale)/2+(rect.y+padding+25+index*50)*scale);
    await expect(page.locator(`[data-line-id="${ids[index+1]}"]`), `native choice ${index + 1} reaches its own cut`).toHaveAttribute('aria-current','true', { timeout: 30000 });
    await rendered(page);
    const next=page.getByRole('button', { name: '다음으로', exact: true });await expect(next).toBeEnabled();await next.focus();await next.press('Enter');
    await expect(page.getByTestId('playback-status')).toHaveText('이야기 끝');
    await expect(frame).toHaveAttribute('data-authoring-instance', 'persistent');
    if (index === 0) {
      await previousReadCut(page);
      await previousReadCut(page);
      await rendered(page);
    }
  }
  await page.screenshot({ path: testInfo.outputPath('blank-authored-renpy-ending.png'), fullPage: true });
  await page.getByRole('button',{name:'읽기 메뉴',exact:true}).click();await page.getByRole('button',{name:'이 컷 편집하기',exact:true}).click();
  await expect(page.getByLabel('현재 장과 컷 이동')).toHaveValue(ids[2]!);await expect(page.getByLabel('대사 / 해설')).toHaveValue(texts[2]!);
  expect(await exportedProject(page)).toEqual(authored);await expect(frame).toHaveAttribute('data-authoring-instance','persistent');
});

async function exportedProject(page: Page) {
  await menu(page);
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: '작품 파일 내보내기' }).click();
  return parseAuthoringFile(readFileSync((await (await pending).path())!, 'utf8')).project;
}

test('blank creation preserves existing work and structural editing retains choice identities', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'host', 'Host structural editing coverage');
  await page.goto('/');await enterLibrary(page);await openShelfAction(page,page.locator('article[data-work-id="seonnyeo"]'),'편집하기');
  await save(page);
  await page.getByLabel('대사 / 해설').fill('기존 선녀 작품에 남겨 둔 문장');
  await save(page);const preserved=await exportedProject(page);
  const { ids } = await createBranchingStory(page);
  const newWorkId = (await exportedProject(page)).id;await tool(page,'선택지 편집');
  const original = (await exportedProject(page)).lines[0].flow.options;
  await page.getByRole('button', { name: '선택지 추가', exact: true }).click();
  await page.getByRole('button', { name: '선택지 추가', exact: true }).click();
  await expect(page.getByRole('button', { name: '선택지 추가', exact: true })).toHaveCount(0);
  await expect(page.getByLabel('선택지 4 문구')).toBeVisible();
  await page.getByRole('button', { name: '선택지 4 삭제', exact: true }).click();
  await page.getByRole('button', { name: '선택지 3 삭제', exact: true }).click();
  expect((await exportedProject(page)).lines[0].flow.options).toEqual(original);
  await expect(page.getByRole('button', { name: '선택지 1 삭제', exact: true })).toHaveCount(0);await menu(page);await page.locator('[data-work-menu]>summary').click();
  await page.getByLabel('선택지 2 도착 컷').selectOption('');
  await page.getByRole('button', { name: '선택지 2에 새 장 연결', exact: true }).click();
  await page.getByRole('dialog',{name:'새 갈래 작성',exact:true}).getByRole('button',{name:'새 갈래 만들고 글쓰기',exact:true}).click();
  await tool(page,'컷 목록');
  const chapterStart = await page.locator('[data-line-id][aria-current="true"]').getAttribute('data-line-id');
  expect(chapterStart).toBeTruthy();
  await page.getByLabel('장 제목', { exact: true }).fill('새로운 갈래');
  await page.getByRole('button',{name:'글 편집',exact:true}).click();await page.getByLabel('대사 / 해설').fill('새 장에서 이어지는 이야기');
  await page.getByRole('button', { name: '현재 컷 뒤에 추가', exact: true }).click();
  const movedId = await page.getByLabel('현재 장과 컷 이동').inputValue();
  await tool(page,'컷 목록');await page.getByRole('button', { name: '컷 위로 이동', exact: true }).click();
  const moved = await exportedProject(page);
  expect(moved.lines.find((line: { id: string }) => line.id === movedId).order).toBe(1);
  expect(moved.lines.find((line: { id: string }) => line.id === chapterStart).order).toBe(2);
  const branch = moved.lines.find((line: { id: string }) => line.id === ids[0]);
  expect(branch.flow.options.map((option: { id: string }) => option.id)).toEqual(original.map((option: { id: string }) => option.id));
  expect(branch.flow.options[0].targetLineId).toBe(ids[1]);
  expect(branch.flow.options[1].targetLineId).toBe(chapterStart);
  await page.getByRole('button',{name:'현재 컷 뒤에 추가',exact:true}).click();const disposable=await page.getByLabel('현재 장과 컷 이동').inputValue();
  const writerTools=page.locator('[data-writing-tools]');if(!await writerTools.evaluate(node=>(node as HTMLDetailsElement).open))await writerTools.locator(':scope>summary').click();
  await page.getByRole('button',{name:'장 전체 글 고치기',exact:true}).click();await page.getByText('컷 정리 · 복제/이동/삭제',{exact:true}).click();await page.getByRole('button',{name:'현재 컷 삭제',exact:true}).click();
  await page.getByRole('dialog',{name:'컷 삭제 확인',exact:true}).getByRole('button',{name:'삭제 실행',exact:true}).click();
  const deleted=await exportedProject(page);expect(deleted.lines.map((line:{id:string})=>line.id)).not.toContain(disposable);expect(Date.parse(deleted.updatedAt)).toBeGreaterThanOrEqual(Date.parse(moved.updatedAt));expect(deleted).toEqual({...moved,updatedAt:deleted.updatedAt});
  await menu(page);await page.getByRole('button', { name: '기기에 저장', exact: true }).click();
  await save(page);
  await shelf(page);await openShelfAction(page,page.getByRole('article',{name:`내 작품 · ${preserved.title}`,exact:true}),'편집하기');
  await expect(page.getByLabel('대사 / 해설')).toHaveValue('기존 선녀 작품에 남겨 둔 문장');expect(await exportedProject(page)).toEqual(preserved);
  await save(page);
  await page.reload();
  await expect(page.getByLabel('대사 / 해설')).toHaveValue('기존 선녀 작품에 남겨 둔 문장');
  await shelf(page);await openShelfAction(page,page.getByRole('article',{name:`내 작품 · ${title}`,exact:true}),'편집하기');expect((await exportedProject(page)).id).toBe(newWorkId);await tool(page,'컷 목록');
  await expect(page.getByLabel('작품 제목', { exact: true })).toHaveValue(title);
  await expect(page.getByLabel('현재 장과 컷 이동').locator('option')).toHaveCount(5);
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
  await expect(page.getByTestId('save-status')).toContainText('임시 보관 실패');
  await expect(page.getByLabel('대사 / 해설')).toHaveValue('저장이 실패해도 다시 저장할 수 있는 문장');
  await page.evaluate(() => (window as unknown as { __restoreAuthoringStorage: () => void }).__restoreAuthoringStorage());
  await menu(page);await page.getByRole('button', { name: '기기에 저장', exact: true }).click();
  await save(page);
  await expect(page.getByTestId('workspace-error')).toHaveCount(0);
  await page.reload();
  await expect(page.getByLabel('대사 / 해설')).toHaveValue('저장이 실패해도 다시 저장할 수 있는 문장');
});

test('corrupt stored workspace preserves raw bytes and blocks applying a pending import while drafts export', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'host', 'Host corrupt-storage recovery coverage');
  const originalRaw = '{broken workspace content that must remain recoverable';
  await page.addInitScript(raw => localStorage.setItem('knolstory-next-workspace-v1', raw), originalRaw);
  await page.goto('/?view=editor');
  await expect(page.getByTestId('save-status')).toHaveText('저장 내용을 불러오지 못함');await menu(page);
  await expect(page.getByRole('button', { name: '기기에 저장', exact: true })).toBeDisabled();
  const cutId=await page.getByLabel('현재 장과 컷 이동').inputValue();
  const draft='손상된 저장 내용 대신 파일로 보관할 새 문장';await page.getByLabel('대사 / 해설').fill(draft);
  await expect(page.getByTestId('save-status')).toContainText('파일로 보관');
  const before=await exportedProject(page);expect(before.lines.find((line:{id:string})=>line.id===cutId).text).toBe(draft);
  const project = parseAuthoringFile(readFileSync('tests/fixtures/stories/seonnyeo.json', 'utf8'));
  await page.getByLabel('작품 파일 가져오기').setInputFiles({name:'recoverable.knolstory',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({documentType:'story-maker-project',schemaVersion:5,savedAt:'2026-10-06T00:00:00.000Z',appVersion:'corrupt-storage-test',project}))});
  const preview=page.getByRole('dialog',{name:'작품 가져오기 확인',exact:true});await expect(preview).toBeVisible();
  await preview.getByRole('button',{name:'내 사본으로 가져오기',exact:true}).click();await expect(preview).toBeVisible();
  await expect(page.getByTestId('workspace-error')).toContainText('저장');await expect(page.getByLabel('대사 / 해설')).toHaveValue(draft);
  expect(await page.evaluate(() => localStorage.getItem('knolstory-next-workspace-v1'))).toBe(originalRaw);
  await preview.getByRole('button',{name:'가져오기 취소',exact:true}).click();await expect(preview).toHaveCount(0);
  expect(await exportedProject(page)).toEqual(before);
  await page.getByRole('button',{name:'서재로',exact:true}).click();await expect(page.getByRole('main',{name:'로컬 서재',exact:true})).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('knolstory-next-workspace-v1'))).toBe(originalRaw);
});
