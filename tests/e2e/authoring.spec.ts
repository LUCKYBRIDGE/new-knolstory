import {previousReadCut} from './reader-actions';
import {openEditorDetails} from './native-reader';
import {resolveStageComposition,type StoryProject} from '../../packages/story-domain/src';
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
      await page.getByRole('button',{name:new RegExp(`^${`${label} 이미지 찾기`} ·`),exact:false}).click();
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

async function currentScreen(page:Page,screen:string){await menu(page);await page.getByRole('combobox',{name:'편집화면 선택',exact:true}).selectOption(screen);}
async function currentFlow(page:Page,value?:string){
 const preparation=page.getByRole('region',{name:'작품 설정',exact:true});if(await preparation.isVisible())await preparation.getByRole('button',{name:'현재 컷 쓰기',exact:true}).click();await menu(page);await openEditorDetails(page,'편집 설정');for(const feature of ['선택지','분기조건'])await page.getByRole('checkbox',{name:`${feature} 편집 사용`,exact:true}).check();
 await currentScreen(page,'basic');await openEditorDetails(page,'현재 컷 상세·메모·정리');await openEditorDetails(page,'현재 컷의 선택지·분기조건 편집');
 if(value){await page.getByRole('combobox',{name:'진행 방식',exact:true}).selectOption(value);const confirmation=page.getByRole('dialog',{name:'진행 방식 변경 확인',exact:true});if(await confirmation.isVisible())await confirmation.getByRole('button',{name:'진행 방식 변경',exact:true}).click();}
}
async function currentPick(page:Page,label:string,id:string,query:string){
 await page.getByRole('button',{name:new RegExp(`^${label} 이미지 찾기 ·`)}).click();const picker=page.getByRole('dialog',{name:`이미지 선택 · ${label}`,exact:true});await picker.getByLabel('이미지 검색',{exact:true}).fill(query);await picker.locator(`[data-asset-id="${id}"]`).click();await picker.getByRole('button',{name:'선택한 이미지 적용',exact:true}).click();
}
async function createCurrentBranchingStory(page:Page,native=false){
 await page.route('**/api/**',route=>route.abort());if(!native)await page.route('**/runtime/**',route=>route.abort());await page.goto('/');await enterLibrary(page);await startShelfCreation(page);await page.getByLabel('새 작품 제목',{exact:true}).fill(title);await page.getByRole('button',{name:'새 작품 생성',exact:true}).click();
 await expect(page.locator('[data-current-cut] textarea')).toHaveValue('');await menu(page);await openEditorDetails(page,'편집 설정');for(const feature of ['인물','선택지','분기조건'])await page.getByRole('checkbox',{name:`${feature} 편집 사용`,exact:true}).check();await openEditorDetails(page,'현재 컷의 장 설정');await page.locator('[data-chapter-settings]').getByRole('textbox',{name:/ 장 제목$/}).fill('달빛 숲');
 await currentScreen(page,'basic');const backgroundId='seonnyeo.background.BG01-valley-day',characterId='seonnyeo.character.M01-base';await currentPick(page,'1컷 배경',backgroundId,'계곡');await currentScreen(page,'characters');await currentPick(page,'1컷 인물 추가',characterId,'나무꾼');await currentScreen(page,'basic');
 const ids:string[]=[];for(const [index,text] of texts.entries()){
  if(index){await menu(page);await page.getByRole('button',{name:'현재 컷 뒤에 추가',exact:true}).click();await currentScreen(page,'basic');}
  ids.push(await page.getByLabel('현재 장과 컷 이동',{exact:true}).inputValue());await page.locator('[data-current-cut] textarea').fill(text);
 }
 expect(new Set(ids).size).toBe(3);for(const id of ids.slice(1)){await chooseCut(page,id);await currentFlow(page,'ending');}await chooseCut(page,ids[0]!);await currentFlow(page,'choice');await page.getByLabel('선택지 1 문구',{exact:true}).fill('집으로 돌아가기');await page.getByLabel('선택지 1 도착 컷',{exact:true}).selectOption(ids[1]!);await page.getByLabel('선택지 2 문구',{exact:true}).fill('호수로 가기');await page.getByLabel('선택지 2 도착 컷',{exact:true}).selectOption(ids[2]!);await save(page);return {ids,backgroundId,characterId};
}

test('blank authoring saves a real-asset branching work and preserves it through file roundtrip', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'host', 'Host authoring and persistence coverage');page.setDefaultTimeout(12000);
  const { ids, backgroundId, characterId } = await createCurrentBranchingStory(page);
  await page.reload();await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');await expect(page.getByLabel('현재 장과 컷 이동').locator('option')).toHaveCount(3);await currentFlow(page);
  await expect(page.getByLabel('선택지 1 문구',{exact:true})).toHaveValue('집으로 돌아가기');await expect(page.getByLabel('선택지 2 도착 컷',{exact:true})).toHaveValue(ids[2]!);
  await menu(page);const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'작품 파일 내보내기',exact:true}).click();const download=await downloadPromise;expect(download.suggestedFilename()).toMatch(/\.knolstory$/);const path=(await download.path())!,document=parseAuthoringFile(readFileSync(path,'utf8')),project=document.project as StoryProject;
  expect(project.title).toBe(title);expect(project.chapters[0].title).toBe('달빛 숲');expect(project.lines.map(line=>line.text)).toEqual(texts);expect(project.lines).toHaveLength(3);
  for(const line of project.lines){expect(line.backgroundId).toBe(backgroundId);expect(resolveStageComposition(project.chapters.find(ch=>ch.id===line.chapterId),line,project).leftActors.map(actor=>actor.assetId)).toContain(characterId);}
  expect(project.lines[0].flow?.type).toBe('choice');const choice=project.lines[0].flow;if(choice?.type!=='choice')throw Error('Expected choice');expect(choice.options.map(option=>option.targetLineId)).toEqual(ids.slice(1));expect(project.lines.slice(1).map(line=>line.flow?.type==='goto'?line.flow.targetLineId:undefined)).toEqual([null,null]);
  await currentScreen(page,'basic');await page.locator('[data-current-cut] textarea').fill('가져오기로 복원할 임시 문장');await save(page);await menu(page);await page.getByLabel('작품 파일 가져오기',{exact:true}).setInputFiles(path);await confirmAuthoringImport(page);await expect(page.locator('[data-current-cut] textarea')).toHaveValue(texts[0]!);await currentFlow(page);await expect(page.getByLabel('선택지 2 문구',{exact:true})).toHaveValue('호수로 가기');expectIndependentImportedProject(await exportedProject(page),project);await save(page);await page.reload();await expect(page.locator('[data-current-cut] textarea')).toHaveValue(texts[0]!);expectIndependentImportedProject(await exportedProject(page),project);
});

test('newly authored branching work renders real assets and both native Ren’Py choices reach endings', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'stories-runtime', 'Actual Ren’Py runtime coverage');test.setTimeout(240000);page.setDefaultTimeout(15000);
  const {ids}=await createCurrentBranchingStory(page,true);const authored=await exportedProject(page);await rendered(page);
  const frame=page.getByTestId('story-runtime-frame'),identity=await frame.elementHandle();
  await expect.poll(async()=>{const png=PNG.sync.read(await page.getByTestId('story-stage-viewport').screenshot());const colors=new Set<number>();for(let y=Math.floor(png.height*.15);y<png.height*.5;y+=3)for(let x=Math.floor(png.width*.2);x<png.width*.8;x+=3){const offset=(y*png.width+x)*4;colors.add((png.data[offset]!<<16)+(png.data[offset+1]!<<8)+png.data[offset+2]!);}return colors.size;},{timeout:30000}).toBeGreaterThan(150);
  for(const index of [0,1]){
    await chooseCut(page,ids[0]!);await page.getByRole('button',{name:'이 컷부터 재생',exact:true}).click();await rendered(page);await expect(page.getByTestId('playback-status')).toHaveText('선택해 주세요');
    const runtime=page.frames().find(f=>f.url().includes('/runtime/'))!;const layout=await runtime.evaluate(()=>(window as unknown as {renpy_exec:(code:string)=>Promise<{rect:{x:number;y:number;width:number;height:number};padding:number;headerHeight:number;gap:number;buttonHeights:number[]}>}).renpy_exec('result = knol_choice_layout(knol_scene)'));
    expect(layout.buttonHeights).toHaveLength(2);const status=page.getByTestId('story-runtime-status'),bounds=(await frame.boundingBox())!,width=Number(await status.getAttribute('data-scene-width')),height=Number(await status.getAttribute('data-scene-height')),scale=Math.min(bounds.width/width,bounds.height/height),y=layout.rect.y+layout.padding+layout.headerHeight+(index?layout.buttonHeights[0]!+layout.gap:0)+layout.buttonHeights[index]!/2;
    await page.mouse.click(bounds.x+(bounds.width-width*scale)/2+(layout.rect.x+layout.rect.width/2)*scale,bounds.y+(bounds.height-height*scale)/2+y*scale);await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).playback.lineId),{timeout:30000}).toBe(ids[index+1]);await rendered(page);
    await page.getByRole('button',{name:'다음으로',exact:true}).press('Enter');await expect(page.getByTestId('playback-status')).toHaveText('이야기 끝');await page.getByRole('button',{name:'읽기 메뉴',exact:true}).click();await page.getByRole('button',{name:'이 컷 편집하기',exact:true}).click();await expect(page.getByLabel('현재 장과 컷 이동',{exact:true})).toHaveValue(ids[index+1]!);await expect(page.locator('[data-current-cut] textarea')).toHaveValue(texts[index+1]!);expect(await identity!.evaluate(e=>e===document.querySelector('[data-testid=story-runtime-frame]'))).toBe(true);
  }
  await page.screenshot({path:testInfo.outputPath('blank-authored-renpy-return.png')});expect(await exportedProject(page)).toEqual(authored);
});

async function exportedProject(page: Page) {
  await menu(page);
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: '작품 파일 내보내기' }).click();
  return parseAuthoringFile(readFileSync((await (await pending).path())!, 'utf8')).project;
}

test('blank creation preserves existing work and structural editing retains choice identities', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'host', 'Host structural editing coverage');
  page.setDefaultTimeout(12000);
  await page.route('**/api/**',route=>route.abort());await page.route('**/runtime/**',route=>route.abort());
  await page.goto('/');await enterLibrary(page);await openShelfAction(page,page.locator('article[data-work-id="seonnyeo"]'),'편집하기');
  await save(page);
  await page.locator('[data-current-cut] textarea').fill('기존 선녀 작품에 남겨 둔 문장');
  await save(page);const preserved=await exportedProject(page);
  const { ids } = await createCurrentBranchingStory(page);
  const newWorkId = (await exportedProject(page)).id;await currentFlow(page);
  const original = (await exportedProject(page)).lines[0].flow.options;await currentFlow(page);
  await page.getByRole('button', { name: '선택지 추가', exact: true }).click();
  await page.getByRole('button', { name: '선택지 추가', exact: true }).click();
  await expect(page.getByRole('button', { name: '선택지 추가', exact: true })).toHaveCount(0);
  await expect(page.getByLabel('선택지 4 문구')).toBeVisible();
  await page.getByRole('button', { name: '선택지 4 삭제', exact: true }).click();
  await page.getByRole('button', { name: '선택지 3 삭제', exact: true }).click();
  expect((await exportedProject(page)).lines[0].flow.options).toEqual(original);await currentFlow(page);
  await expect(page.getByRole('button', { name: '선택지 1 삭제', exact: true })).toHaveCount(0);
  await page.getByLabel('선택지 2 도착 컷').selectOption('');
  await page.getByRole('button', { name: '선택지 2에 새 장 연결', exact: true }).click();
  await page.getByRole('dialog',{name:'새 갈래 작성',exact:true}).getByRole('button',{name:'새 갈래 만들고 글쓰기',exact:true}).click();
  const chapterStart = await page.getByLabel('현재 장과 컷 이동',{exact:true}).inputValue();
  expect(chapterStart).toBeTruthy();
  await menu(page);await openEditorDetails(page,'현재 컷의 장 설정');await page.locator('[data-chapter-settings]').getByRole('textbox',{name:/ 장 제목$/}).fill('새로운 갈래');
  await currentScreen(page,'basic');await page.locator('[data-current-cut] textarea').fill('새 장에서 이어지는 이야기');
  await menu(page);await page.getByRole('button', { name: '현재 컷 뒤에 추가', exact: true }).click();
  await page.locator('[data-work-menu]>summary').click();
  const movedId = await page.getByLabel('현재 장과 컷 이동').inputValue();
  await openEditorDetails(page,'현재 컷 상세·메모·정리');await page.getByRole('button', { name: '현재 컷 위로', exact: true }).click();
  const moved = await exportedProject(page);
  expect(moved.lines.find((line: { id: string }) => line.id === movedId).order).toBe(1);
  expect(moved.lines.find((line: { id: string }) => line.id === chapterStart).order).toBe(2);
  const branch = moved.lines.find((line: { id: string }) => line.id === ids[0]);
  expect(branch.flow.options.map((option: { id: string }) => option.id)).toEqual(original.map((option: { id: string }) => option.id));
  expect(branch.flow.options[0].targetLineId).toBe(ids[1]);
  expect(branch.flow.options[1].targetLineId).toBe(chapterStart);
  await menu(page);await page.getByRole('button',{name:'현재 컷 뒤에 추가',exact:true}).click();const disposable=await page.getByLabel('현재 장과 컷 이동').inputValue();
  await page.locator('[data-work-menu]>summary').click();
  await openEditorDetails(page,'현재 컷 상세·메모·정리');await page.getByRole('button',{name:'현재 컷 삭제',exact:true}).click();
  await page.getByRole('dialog',{name:'컷 삭제 확인',exact:true}).getByRole('button',{name:'삭제 실행',exact:true}).click();
  const deleted=await exportedProject(page);expect(deleted.lines.map((line:{id:string})=>line.id)).not.toContain(disposable);expect(Date.parse(deleted.updatedAt)).toBeGreaterThanOrEqual(Date.parse(moved.updatedAt));expect(deleted).toEqual({...moved,updatedAt:deleted.updatedAt});
  await menu(page);await page.getByRole('button', { name: '임시 보관', exact: true }).click();
  await save(page);
  await menu(page);await shelf(page);await openShelfAction(page,page.getByRole('article',{name:`내 작품 · ${preserved.title}`,exact:true}),'편집하기');
  await expect(page.locator('[data-current-cut] textarea')).toHaveValue('기존 선녀 작품에 남겨 둔 문장');expect(await exportedProject(page)).toEqual(preserved);
  await save(page);
  await page.reload();
  await expect(page.locator('[data-current-cut] textarea')).toHaveValue('기존 선녀 작품에 남겨 둔 문장');
  await menu(page);await shelf(page);await openShelfAction(page,page.getByRole('article',{name:`내 작품 · ${title}`,exact:true}),'편집하기');const reopened=await exportedProject(page);expect(reopened.id).toBe(newWorkId);expect(reopened).toEqual(deleted);
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
  await page.locator('[data-current-cut] textarea').fill('저장이 실패해도 다시 저장할 수 있는 문장');
  await expect(page.getByTestId('save-status')).toContainText('임시 보관 실패');
  await expect(page.locator('[data-current-cut] textarea')).toHaveValue('저장이 실패해도 다시 저장할 수 있는 문장');
  await page.evaluate(() => (window as unknown as { __restoreAuthoringStorage: () => void }).__restoreAuthoringStorage());
  await menu(page);await page.getByRole('button', { name: '임시 보관', exact: true }).click();
  await save(page);
  await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
  await page.reload();
  await expect(page.locator('[data-current-cut] textarea')).toHaveValue('저장이 실패해도 다시 저장할 수 있는 문장');
});

test('corrupt stored workspace preserves raw bytes and blocks applying a pending import while drafts export', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'host', 'Host corrupt-storage recovery coverage');
  const originalRaw = '{broken workspace content that must remain recoverable';
  await page.addInitScript(raw => localStorage.setItem('knolstory-next-workspace-v1', raw), originalRaw);
  await page.goto('/?view=editor');
  await expect(page.getByTestId('save-status')).toHaveText('임시 보관 중지');await menu(page);
  await expect(page.getByRole('button', { name: '임시 보관', exact: true })).toBeDisabled();
  const cutId=await page.getByLabel('현재 장과 컷 이동').inputValue();
  const draft='손상된 저장 내용 대신 파일로 보관할 새 문장';await page.locator('[data-current-cut] textarea').fill(draft);
  await expect(page.getByTestId('save-status')).toHaveText('임시 보관 중지');await expect(page.getByRole('region',{name:'기기 보관함 복구',exact:true})).toContainText('작품 파일로 저장');
  const before=await exportedProject(page);expect(before.lines.find((line:{id:string})=>line.id===cutId).text).toBe(draft);
  const project = parseAuthoringFile(readFileSync('tests/fixtures/stories/seonnyeo.json', 'utf8'));
  await page.getByLabel('작품 파일 가져오기').setInputFiles({name:'recoverable.knolstory',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({documentType:'story-maker-project',schemaVersion:5,savedAt:'2026-10-06T00:00:00.000Z',appVersion:'corrupt-storage-test',project}))});
  const preview=page.getByRole('dialog',{name:'작품 가져오기 확인',exact:true});await expect(preview).toBeVisible();
  await preview.getByRole('button',{name:'내 사본으로 가져오기',exact:true}).click();await expect(preview).toBeVisible();
  await expect(preview.getByRole('alert')).toContainText('보관');await expect(page.locator('[data-current-cut] textarea')).toHaveValue(draft);
  expect(await page.evaluate(() => localStorage.getItem('knolstory-next-workspace-v1'))).toBe(originalRaw);
  await preview.getByRole('button',{name:'가져오기 취소',exact:true}).click();await expect(preview).toHaveCount(0);
  expect(await exportedProject(page)).toEqual(before);
  await menu(page);await page.getByRole('button',{name:'서재로',exact:true}).click();
  await expect(page.getByTestId('workspace-error')).toContainText('현재 편집을 유지합니다');
  await expect(page.getByTestId('workspace-error')).not.toContainText('Error:');
  await expect(page.locator('[data-current-cut] textarea')).toHaveValue(draft);
  expect(await page.evaluate(() => localStorage.getItem('knolstory-next-workspace-v1'))).toBe(originalRaw);
});
