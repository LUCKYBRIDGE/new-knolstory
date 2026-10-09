import {builtinShelfCard,openBuiltinEdition} from './library-entry';
import {startShelfCreation,importShelfFile} from './library-entry';
import {openShelfAction} from './library-entry';
import {enterLibrary,beginSelectedBook} from './library-entry';
import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const evidence = 'docs/architecture/evidence/four-work-library/local-library';
const forestFile = 'docs/architecture/evidence/creative-reading/forest-promise.knolstory';
const forestTitle = '숲의 약속 · 두 길에서 만나는 친구';
const ownTitle = '서재에서 시작한 달빛 편지';
const secondTitle = '다음에 쓸 바다 이야기';
const background = 'seonnyeo.background.BG-forest-roots';
const actor = 'heungbu.character.heungbu-young';
const card = (page: Page, kind: string, title: string) => page.getByRole('article', { name: `${kind} · ${title}`, exact: true });
async function saved(page: Page) { await expect(page.getByTestId('save-status')).toHaveText('기기에 저장됨'); }
async function library(page: Page) {
  await saved(page);
  const main = page.getByRole('main', { name: '로컬 서재', exact: true });
  if (!await main.isVisible()) await page.getByRole('button', { name: '서재로', exact: true }).click();
  await expect(main).toBeVisible();
}
async function open(page: Page, kind: string, title: string, intent: string) {
  await library(page);
  await openShelfAction(page,card(page, kind, title),intent);
  if(intent==='처음부터 읽기'||intent==='이어읽기')await beginSelectedBook(page,intent==='이어읽기');
}
async function preparation(page: Page) {
  const pane = page.getByRole('region', { name: '작품 준비', exact: true });
  if (!await pane.isVisible()) await page.getByRole('button', { name: '작품 준비', exact: true }).click();
  await expect(pane).toBeVisible();
  return pane;
}
async function manage(page: Page) {
  const summary = page.getByText('작품 관리', { exact: true });
  if (!await summary.locator('..').evaluate(n => (n as HTMLDetailsElement).open)) await summary.click();
}
async function exportFile(page: Page, path: string) {
  await saved(page); await manage(page);
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: '작품 파일 내보내기', exact: true }).click();
  await (await pending).saveAs(path);
  return JSON.parse(readFileSync(path, 'utf8'));
}
async function create(page: Page, title: string) {
  await library(page);
  await startShelfCreation(page);
  await page.getByLabel('새 작품 제목', { exact: true }).fill(title);
  await page.getByRole('button', { name: '빈 작품 시작', exact: true }).click();
  await expect((await preparation(page)).getByLabel('작품 제목', { exact: true })).toHaveValue(title);
}
async function selectCut(page: Page, id: string) {
  await page.getByRole('button', { name: '현재 컷 꾸미기', exact: true }).click();
  const tool = page.getByRole('button', { name: '컷 목록', exact: true });
  if (await tool.isVisible()) await tool.click();
  const cut = page.locator(`[data-line-id="${id}"]`);
  await cut.evaluate(n => { n.closest('details')!.open = true; });
  await cut.click();
}
async function ready(page: Page) {
  const status = page.getByTestId('story-runtime-status');
  await expect(status).toContainText('연결됨', { timeout: 90000 });
  await expect.poll(() => status.evaluate(n => n.getAttribute('data-scene-revision') === n.getAttribute('data-rendered-revision')), { timeout: 30000 }).toBe(true);
}
async function unlock(page: Page) {
  const status=page.getByTestId('story-runtime-status');
  if(await status.getAttribute('data-audio-unlocked')==='false'&&await page.getByRole('button',{name:'다음으로',exact:true}).isDisabled()){
    const box=(await page.getByTestId('story-runtime-frame').boundingBox())!;
    await page.mouse.click(box.x+box.width*.5,box.y+box.height*.1);
    await expect(status).toHaveAttribute('data-audio-unlocked','true');
  }
}
async function shot(page: Page, name: string) { await page.screenshot({ path: `${evidence}/${name}.png`, fullPage: true }); }
async function fillPreparation(page: Page) {
  const pane = await preparation(page);
  await pane.getByLabel('작품 제목', { exact: true }).fill(ownTitle);
  await pane.getByLabel('작품 소개', { exact: true }).fill('편지를 들고 숲으로 떠나는 아이의 짧은 이야기');
  await pane.getByLabel('지은이', { exact: true }).fill('서재 검증 작가');
  await pane.getByLabel('부제', { exact: true }).fill('아이디어에서 첫 대사까지');
  await pane.getByLabel('작가의 말', { exact: true }).fill('여러 작품을 오가도 이야기를 잃지 않아요.');
  await pane.getByText('기본 표지 고르기', { exact: true }).click();
  await pane.getByLabel('표지 색감', { exact: true }).selectOption({ index: 1 });
  await pane.getByLabel('표지 배치', { exact: true }).selectOption('picture');
  await pane.getByLabel('표지 배경', { exact: true }).selectOption(background);
  await pane.getByLabel('표지 인물', { exact: true }).selectOption(actor);
  for (const [label, text] of [['핵심 아이디어','달빛 편지로 친구를 찾는다.'], ['주인공','편지를 든 흥부'], ['주인공의 목표','친구에게 편지를 전하기'], ['갈등과 문제','숲의 길이 나뉜다.'], ['시작','편지를 챙긴다.'], ['전개','숲에서 친구를 찾는다.'], ['마무리','편지를 함께 읽는다.']]) await pane.getByLabel(label!, { exact: true }).fill(text!);
  await pane.getByRole('button', { name: '작품 메모 추가', exact: true }).click();
  await pane.getByLabel('메모 1 제목', { exact: true }).fill('작품 전체 아이디어');
  await pane.getByLabel('메모 1 메모 내용', { exact: true }).fill('달빛과 편지의 색을 함께 생각한다.');
  await pane.getByRole('button', { name: '작품 메모 추가', exact: true }).click();
  await pane.getByLabel('메모 2 제목', { exact: true }).fill('첫 장에서 소개할 것');
  await pane.getByLabel('메모 2 메모 내용', { exact: true }).fill('장에 연결한 메모로 대본을 연다.');
  const chapterOption = pane.getByLabel('메모 2 연결 위치').locator('option[value^="chapter:"]').first();
  await pane.getByLabel('메모 2 연결 위치').selectOption((await chapterOption.getAttribute('value'))!);
  await pane.getByRole('button', { name: '현재 컷 메모 추가', exact: true }).click();
  await pane.getByLabel('메모 3 제목', { exact: true }).fill('편지를 보여 줄 컷');
  await pane.getByLabel('메모 3 메모 내용', { exact: true }).fill('이 컷에서 편지를 소개한다.');
  await saved(page);
}

test('local library prepares three separate works and roundtrips preparation with rich existing content in actual Chrome', async ({ playwright }, info) => {
  test.skip(info.project.name !== 'stories-runtime'); test.setTimeout(420000);
  mkdirSync(evidence, { recursive: true });
  const browser = await playwright.chromium.launch({ channel: process.env.KNOL_BROWSER_CHANNEL || undefined });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, hasTouch: true });
  const page = await context.newPage(); page.setDefaultTimeout(15000);
  try {
    await page.goto('/'); await enterLibrary(page); await library(page);
    await expect(page.getByRole('region', { name: '기본 작품', exact: true }).getByRole('article')).toHaveCount(4);
    await create(page, '달빛 편지 준비'); await fillPreparation(page);
    for (const [width,height,name] of [[1280,900,'desktop'],[1024,768,'tablet'],[390,844,'phone']] as const) {
      await page.setViewportSize({width,height}); await shot(page, `preparation-${name}`);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await page.setViewportSize({width:1280,height:900});
    const prep = await preparation(page);
    await expect(prep.getByLabel('메모 1 연결 위치')).toHaveValue('');
    await prep.getByRole('article',{name:'메모 2',exact:true}).getByRole('button',{name:/열기$/}).click();
    await preparation(page);
    await prep.getByRole('article', {name:'메모 3',exact:true}).getByRole('button', {name:/컷 열기$/}).click();
    await page.getByRole('button', { name: '이 장 대본', exact: true }).click();
    const writer = page.getByRole('region', {name:'이 장 대본',exact:true});
    await writer.getByLabel('1컷 대사 / 해설', {exact:true}).fill('달빛 편지를 챙겨 숲으로 떠났다.');
    await writer.getByRole('button', {name:'대사 컷 추가',exact:true}).click();
    await writer.getByLabel('2컷 대사 / 해설', {exact:true}).fill('숲에서 친구에게 편지를 전했다.');
    const ownCut = (await page.locator('[data-line-id][aria-current="true"]').getAttribute('data-line-id'))!;
    await saved(page); await library(page);
    await expect(card(page,'내 작품',ownTitle)).toContainText('편지를 들고 숲으로 떠나는 아이');
    await expect(card(page,'내 작품',ownTitle).locator('img')).toHaveCount(2);
    await create(page,secondTitle);
    await page.getByRole('button',{name:'이 장 대본 쓰기',exact:true}).click();
    await page.getByLabel('1컷 대사 / 해설',{exact:true}).fill('바닷가에 새 이야기를 남겼다.');
    await saved(page);
    const second=await exportFile(page,`${evidence}/sea-story.knolstory`);
    expect(second.project.lines[0].text).toBe('바닷가에 새 이야기를 남겼다.');
    await library(page);
    await importShelfFile(page,forestFile);
    await saved(page); await library(page);
    await expect(card(page,'가져온 작품',forestTitle)).toBeVisible();
    await expect(page.getByRole('region',{name:'내 작품',exact:true}).getByRole('article')).toHaveCount(2);
    for (const [width,height,name] of [[1280,900,'desktop'],[1024,768,'tablet'],[390,844,'phone']] as const) {
      await page.setViewportSize({width,height}); await shot(page, `library-${name}`);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await page.setViewportSize({width:1280,height:900});
    await open(page,'내 작품',ownTitle,'편집하기');
    await expect(page.locator('[data-line-id][aria-current="true"]')).toHaveAttribute('data-line-id',ownCut);
    await preparation(page); await expect(page.getByLabel('핵심 아이디어',{exact:true})).toHaveValue('달빛 편지로 친구를 찾는다.');
    await page.reload(); await library(page); await open(page,'내 작품',ownTitle,'작품 준비');
    await expect(page.getByLabel('메모 3 제목',{exact:true})).toHaveValue('편지를 보여 줄 컷');
    await page.getByRole('button',{name:'이 장 대본 쓰기',exact:true}).click();
    await expect(page.locator('[data-line-id][aria-current="true"]')).toHaveAttribute('data-line-id',ownCut);
    const own = await exportFile(page, `${evidence}/moonlight-letter.knolstory`);
    expect(own.project.creativeMemos).toHaveLength(3); expect(own.project.lines).toHaveLength(2);
    await open(page,'가져온 작품',forestTitle,'작품 준비');
    const importedBaseline = JSON.parse(readFileSync(forestFile,'utf8'));
    await page.getByLabel('작품 소개',{exact:true}).fill('두 갈래에서 만나는 친구 · 서재로 보관한 작품');
    await page.getByLabel('핵심 아이디어',{exact:true}).fill('서로 다른 길에서도 같은 친구를 만난다.');
    await page.getByRole('button',{name:'작품 메모 추가',exact:true}).click();
    await page.getByLabel('메모 1 제목',{exact:true}).fill('갈래의 감정 확인');
    await page.getByLabel('메모 1 메모 내용',{exact:true}).fill('A와 B에서 같은 합류의 의미를 느끼게 한다.');
    await saved(page); await page.reload(); await library(page);
    await open(page,'가져온 작품',forestTitle,'편집하기');
    const archive = await exportFile(page, `${evidence}/forest-library.knolstory`);
    expect(archive.project.lines).toEqual(importedBaseline.project.lines);
    expect(archive.project.chapters).toEqual(importedBaseline.project.chapters);
    expect(archive.project.cover).toEqual(importedBaseline.project.cover);
    expect(archive.project.id).toEqual(importedBaseline.project.id);
    expect(archive.audioResources).toEqual(importedBaseline.audioResources);
    const clean = await browser.newContext({viewport:{width:1280,height:900}});
    const fresh = await clean.newPage(); fresh.setDefaultTimeout(15000); await fresh.goto('http://127.0.0.1:3000'); await enterLibrary(fresh); await library(fresh);
    await importShelfFile(fresh,`${evidence}/moonlight-letter.knolstory`);await saved(fresh);await library(fresh);await open(fresh,'가져온 작품',ownTitle,'편집하기');const restoredOwn=await exportFile(fresh,info.outputPath('own-fresh.knolstory'));expect(restoredOwn.project).toEqual(own.project);await library(fresh);
    await importShelfFile(fresh,`${evidence}/forest-library.knolstory`);
    await saved(fresh); await library(fresh); await open(fresh,'가져온 작품',forestTitle,'편집하기');
    const roundtrip = await exportFile(fresh,info.outputPath('fresh.knolstory'));
    expect(roundtrip.project).toEqual(archive.project); expect(roundtrip.audioResources).toEqual(archive.audioResources);
    await library(fresh); await openShelfAction(fresh,card(fresh,'가져온 작품',forestTitle),'처음부터 읽기');await beginSelectedBook(fresh);
    await ready(fresh); await unlock(fresh); await shot(fresh,'imported-native-reading');
    for(let i=0;i<5;i++){await fresh.getByRole('button',{name:'다음으로',exact:true}).click();await ready(fresh);}
    await fresh.getByRole('button',{name:'별빛의 길로 가기',exact:true}).click();await ready(fresh);await saved(fresh);
    await fresh.getByRole('button',{name:'읽기 저장',exact:true}).click();
    await fresh.getByRole('region',{name:'1번 읽기 저장'}).getByRole('button',{name:'여기에 저장',exact:true}).click();
    await fresh.getByRole('button',{name:'읽기 메뉴 닫기',exact:true}).click();await fresh.getByTestId('story-runtime-frame').evaluate(node=>node.setAttribute('data-library-instance','same'));
    await library(fresh);await expect(fresh.getByTestId('story-runtime-frame')).toHaveAttribute('data-library-instance','same');const parked=await fresh.getByTestId('story-runtime-frame').boundingBox();expect(parked!.width).toBeGreaterThan(0);expect(parked!.height).toBeGreaterThan(0); await fresh.reload(); await library(fresh);
    await openShelfAction(fresh,card(fresh,'가져온 작품',forestTitle),'이어읽기');await beginSelectedBook(fresh,true);await ready(fresh);
    await expect(fresh.getByText('별빛 아래에서 길 잃은 친구를 만났다.',{exact:true})).toBeVisible();
    await fresh.getByRole('button',{name:'편집으로',exact:true}).click();
    const lineId=archive.project.lines.find((line:{text:string})=>line.text==='별빛 아래에서 길 잃은 친구를 만났다.')?.id;
    if(lineId) await selectCut(fresh,lineId);
    const textTool=fresh.getByRole('button',{name:'글 편집',exact:true});if(await textTool.isVisible())await textTool.click();
    await fresh.getByLabel('대사 / 해설',{exact:true}).fill('별빛 아래에서 편지를 기다리는 친구를 만났다.');await saved(fresh);
    await fresh.getByRole('button',{name:'현재 컷부터 읽기',exact:true}).click();await ready(fresh);
    await expect(fresh.getByText('별빛 아래에서 편지를 기다리는 친구를 만났다.',{exact:true})).toBeVisible();
    await clean.close();
    await open(page,'내 작품',ownTitle,'처음부터 읽기');await ready(page);await unlock(page);
    await page.getByRole('button',{name:'다음으로',exact:true}).click();await ready(page);await saved(page);
    await open(page,'내 작품',secondTitle,'처음부터 읽기');await ready(page);
    await expect(page.getByText('바닷가에 새 이야기를 남겼다.',{exact:true})).toBeVisible();
    await open(page,'내 작품',ownTitle,'이어읽기');await ready(page);
    await expect(page.getByText('숲에서 친구에게 편지를 전했다.',{exact:true})).toBeVisible();
    await library(page);await page.getByRole('link',{name:'숏스토리 그림책 열기',exact:true}).click();
    await expect(page.getByRole('heading',{name:'숏스토리 그림책',exact:true})).toBeVisible();await expect(page.locator('iframe')).toHaveCount(0);
    writeFileSync(`${evidence}/run-summary.json`,JSON.stringify({browser:await browser.version(),authorship:'Two works created through UI; prior twelve-cut work imported through UI',works:[ownTitle,secondTitle,forestTitle],checks:['info/cover/planning/memos','linked cut jump','per-work edit position','per-work native read resume','reload','export/import exact project/audio equality','existing rich lines/chapters preserved','PC/tablet/phone','ShortStory entry'],hardware:'Chrome viewport conditions; no Android hardware claim'},null,2));
  } finally { await context.close(); await browser.close(); }
});

test('library keeps blank planning optional and separates examples from a UI-created work', async ({ page }, info) => {
  test.skip(info.project.name !== 'host');
  await page.goto('/'); await enterLibrary(page); await library(page);
  await expect(page.getByRole('region',{name:'내 작품',exact:true})).toContainText('아직 내 작품이 없어요');
  await expect(page.getByRole('region',{name:'기본 작품',exact:true}).getByRole('article')).toHaveCount(4);
  await create(page,'기획 없이 시작한 이야기');
  await expect(page.getByLabel('핵심 아이디어',{exact:true})).toHaveValue('');
  await page.getByRole('button',{name:'이 장 대본 쓰기',exact:true}).click();
  await page.getByLabel('1컷 대사 / 해설',{exact:true}).fill('첫 문장부터 시작해도 괜찮아요.');
  await saved(page); await library(page);
  await expect(card(page,'내 작품','기획 없이 시작한 이야기')).toContainText('최근 수정');
  await card(page,'내 작품','기획 없이 시작한 이야기').getByRole('button',{name:/책 표지와 소개 보기$/}).click();await expect(page.getByRole('dialog').getByRole('button',{name:'이어읽기',exact:true})).toHaveCount(0);await page.keyboard.press('Escape');
  await page.reload(); await library(page);
  await open(page,'내 작품','기획 없이 시작한 이야기','편집하기');
  await expect(page.getByLabel('1컷 대사 / 해설',{exact:true})).toHaveValue('첫 문장부터 시작해도 괜찮아요.');
  await preparation(page);
  await expect(page.getByLabel('핵심 아이디어',{exact:true})).toHaveValue('');
  await library(page);
  await expect(page.getByRole('region',{name:'기본 작품',exact:true}).getByRole('article')).toHaveCount(4);
});

test('previous device workspace opens in library without changing its authored content or legacy keys', async ({page},info) => {
  test.skip(info.project.name !== 'host');
  const document=JSON.parse(readFileSync(forestFile,'utf8'));
  const selected=document.project.lines[8].id;
  const raw=JSON.stringify({document,works:{'new:previous-device':document},storyId:'new:previous-device',lineId:selected,mode:'edit'});
  await page.addInitScript(({raw,resources})=>{
    if(!sessionStorage.getItem('test-library-seeded')){
      localStorage.setItem('knolstory-next-workspace-v1',raw);
      localStorage.setItem('storygame-original','legacy work bytes');
      sessionStorage.setItem('test-library-seeded','yes');
      const request=indexedDB.open('knolstory-audio-assets-v1',1);
      request.onupgradeneeded=()=>request.result.createObjectStore('resources',{keyPath:'id'});
      request.onsuccess=()=>{const db=request.result;const tx=db.transaction('resources','readwrite');for(const resource of resources)tx.objectStore('resources').put(resource);tx.oncomplete=()=>db.close();};
    }
  },{raw,resources:document.audioResources});
  await page.goto('/'); await enterLibrary(page);await saved(page);
  await expect(card(page,'내 작품',forestTitle)).toBeVisible();
  await library(page);
  await expect(card(page,'내 작품',forestTitle)).toBeVisible();
  await open(page,'내 작품',forestTitle,'편집하기');
  await expect(page.locator('[data-line-id][aria-current="true"]')).toHaveAttribute('data-line-id',selected);
  const pending=page.waitForEvent('download');await manage(page);await page.getByRole('button',{name:'작품 파일 내보내기',exact:true}).click();
  const downloaded=await (await pending).path();const archive=JSON.parse(readFileSync(downloaded!,'utf8'));
  expect(archive.project).toEqual(document.project);
  expect(await page.evaluate(()=>localStorage.getItem('storygame-original'))).toBe('legacy work bytes');
  await library(page);await page.reload();await library(page);
  await expect(card(page,'내 작품',forestTitle)).toBeVisible();
});

test('corrupt device storage is kept intact while UI-created recovery work can be exported', async({page},info)=>{
  test.skip(info.project.name !== 'host');
  const raw='{preserve original broken workspace';
  await page.addInitScript(({raw})=>{
    if(!sessionStorage.getItem('test-library-seeded')){
      localStorage.setItem('knolstory-next-workspace-v1',raw);
      localStorage.setItem('storygame-original','legacy work bytes');
      sessionStorage.setItem('test-library-seeded','yes');
    }
  },{raw});
  await page.goto('/'); await enterLibrary(page);
  await expect(page.getByTestId('library-save-status')).toHaveText('저장 내용을 불러오지 못함');
  await expect(page.getByRole('main',{name:'로컬 서재',exact:true})).toContainText('원본을 유지하고 자동 저장을 중지');
  await startShelfCreation(page);await page.getByLabel('새 작품 제목',{exact:true}).fill('파일로 보관할 복구 작품');
  await page.getByRole('button',{name:'빈 작품 시작',exact:true}).click();
  const prep=page.getByRole('region',{name:'작품 준비',exact:true});
  await prep.getByLabel('작품 소개',{exact:true}).fill('기존 원본은 보존하고 새 내용은 파일로 옮긴다.');
  const pending=page.waitForEvent('download');await page.getByRole('button',{name:'작품 파일 내보내기',exact:true}).click();
  const path=await(await pending).path();const archive=JSON.parse(readFileSync(path!,'utf8'));
  expect(archive.project.title).toBe('파일로 보관할 복구 작품');
  expect(archive.project.description).toBe('기존 원본은 보존하고 새 내용은 파일로 옮긴다.');
  expect(await page.evaluate(()=>localStorage.getItem('knolstory-next-workspace-v1'))).toBe(raw);
  expect(await page.evaluate(()=>localStorage.getItem('storygame-original'))).toBe('legacy work bytes');
});

test('example preparation makes an independent own copy and duplicate import keeps the original',async({page},info)=>{
 test.skip(info.project.name!=='host');await page.goto('/'); await enterLibrary(page);await library(page);
 const originalTitle='선녀와 나무꾼';await openBuiltinEdition(page,'seonnyeo','knolstory','prepare');
 await expect(page.getByRole('region',{name:'작품 준비',exact:true}).getByLabel('작품 제목',{exact:true})).toHaveValue(`${originalTitle} · 내 사본`);await library(page);await expect(builtinShelfCard(page,'seonnyeo')).toContainText(originalTitle);await expect(page.getByRole('region',{name:'내 작품',exact:true}).getByRole('article')).toHaveCount(1);
 await importShelfFile(page,forestFile);await saved(page);await library(page);const raw=await page.evaluate(()=>Object.fromEntries(Object.entries(JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).works).map(([key,value])=>[key,(value as {project:unknown}).project])));await importShelfFile(page,forestFile);await expect(page.getByRole('main',{name:'로컬 서재'})).toContainText('같은 작품이 이미');await expect(page.getByRole('region',{name:'가져온 작품'}).getByRole('article')).toHaveCount(1);expect(await page.evaluate(()=>Object.fromEntries(Object.entries(JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).works).map(([key,value])=>[key,(value as {project:unknown}).project])))).toEqual(raw);
});
