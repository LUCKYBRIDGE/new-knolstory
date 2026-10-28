import {parseAuthoringFile,expectIndependentImportedProject} from './authoring-file';
import {builtinShelfCard,openBuiltinEdition} from './library-entry';
import {startShelfCreation,importShelfFile,openLibraryTools} from './library-entry';
import {openShelfAction} from './library-entry';
import {enterLibrary,beginSelectedBook} from './library-entry';
import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import {nativeDiagnostics} from './native-diagnostics';
import {previousReadCut} from './reader-actions';

const evidence = process.env.KNOL_LIBRARY_EVIDENCE_DIR||`${process.env.KNOL_TEST_EVIDENCE_DIR??process.env.KNOL_NATIVE_EVIDENCE_DIR??'test-results/current-evidence'}/library-native`;
const forestFile = 'docs/architecture/evidence/creative-reading/forest-promise.knolstory';
const forestTitle = '숲의 약속 · 두 길에서 만나는 친구';
const ownTitle = '서재에서 시작한 달빛 편지';
const secondTitle = '다음에 쓸 바다 이야기';
const background = 'seonnyeo.background.BG-forest-roots';
const actor = 'heungbu.character.heungbu-young';
const CHECKPOINT_KEY='knolstory-checkpoints-v1';
/** New imports use registered sounds; keep the historical private-media fixture intact. */
function catalogForestFile() {
  const original=JSON.parse(readFileSync(forestFile,'utf8'));
  const replacements=new Map(original.audioResources.map((resource:{id:string;kind:string})=>[resource.id,resource.kind==='music'?'audio:music:forest':'audio:sound:chime']));
  const project=JSON.parse(JSON.stringify(original.project,(_key,value)=>typeof value==='string'?replacements.get(value)??value:value));
  return {name:'catalog-forest.knolstory',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({...original,project,audioResources:[]}))};
}
const card = (page: Page, kind: string, title: string) => page.getByRole('article', { name: `${kind} · ${title}`, exact: true });
async function saved(page: Page) {
  await expect(page.locator('[data-testid="save-status"], [data-testid="preparation-save-status"], [data-testid="library-save-status"]')).toHaveText('임시 보관됨',{timeout:30000});
}
async function library(page: Page) {
  await saved(page);
  const main = page.getByRole('main', { name: '로컬 서재', exact: true });
  if (!await main.isVisible()) {
    const direct=page.getByRole('button', { name: '서재로', exact: true });
    if(await direct.isVisible())await direct.click();
    else {
      await page.getByRole('button',{name:'읽기 메뉴',exact:true}).click();
      await page.getByRole('button',{name:'서재로 돌아가기',exact:true}).click();
      await page.getByRole('dialog',{name:'서재로 돌아갈까요?',exact:true}).getByRole('button',{name:'보관하고 서재로',exact:true}).click();
    }
  }
  await expect(main).toBeVisible();
}
async function open(page: Page, kind: string, title: string, intent: string) {
  await library(page);
  await openShelfAction(page,card(page, kind, title),intent);
  if(intent==='처음부터 읽기'||intent==='이어읽기')await beginSelectedBook(page,intent==='이어읽기');
}
async function preparation(page: Page) {
  const pane = page.getByRole('region', { name: '작품 설정', exact: true });
  if (!await pane.isVisible()) {
    await manage(page);
    await page.getByRole('button', { name: '작품 정보·표지', exact: true }).click();
  }
  await expect(pane).toBeVisible();
  return pane;
}
async function manage(page: Page) {
  const summary = page.locator('[data-work-menu]>summary');
  if (!await summary.locator('..').evaluate(n => (n as HTMLDetailsElement).open)) await summary.click();
}
async function exportFile(page: Page, path: string) {
  await saved(page); await manage(page);
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: '작품 파일 내보내기', exact: true }).click();
  await (await pending).saveAs(path);
  return parseAuthoringFile(readFileSync(path, 'utf8'));
}
async function create(page: Page, title: string) {
  await library(page);
  await startShelfCreation(page);
  await page.getByLabel('새 작품 제목', { exact: true }).fill(title);
  await page.getByRole('button', { name: '새 작품 생성', exact: true }).click();
  await expect(page.getByLabel('대사 / 해설', { exact: true })).toHaveValue('');
  await expect(page.getByRole('region', { name: '작품 설정', exact: true })).toHaveCount(0);
  await saved(page);
}
async function selectCut(page: Page, id: string) {
  const pane=page.getByRole('region',{name:'작품 설정',exact:true});
  if(await pane.isVisible())await pane.getByRole('button',{name:/^(현재 컷 쓰기|현재 컷으로 돌아가기|메모를 두고 현재 컷 편집으로 돌아가기)$/,exact:true}).click();
  await page.getByLabel('현재 장과 컷 이동',{exact:true}).selectOption(id);
}
async function writer(page:Page){
  const tools=page.locator('[data-writing-tools]');
  if(!await tools.evaluate(node=>(node as HTMLDetailsElement).open))await tools.locator(':scope>summary').click();
  await page.getByRole('button',{name:'장 전체 글 고치기',exact:true}).click();
}
async function next(page:Page){const button=page.getByRole('button',{name:'다음으로',exact:true});await expect(button).toBeEnabled();await button.focus();await page.keyboard.press('Enter');await ready(page);}
async function nativeChoice(page:Page,index:number,target:string){
  await ready(page);await expect(page.getByTestId('playback-status')).toHaveText('선택해 주세요');
  const status=page.getByTestId('story-runtime-status'),box=(await page.getByTestId('story-runtime-frame').boundingBox())!;
  const rect=JSON.parse((await status.getAttribute('data-choices-rect'))!) as {x:number;y:number;width:number;height:number};
  expect(rect).not.toBeNull();
  const width=Number(await status.getAttribute('data-scene-width')),height=Number(await status.getAttribute('data-scene-height')),scale=Math.min(box.width/width,box.height/height);
  await page.mouse.click(box.x+(box.width-width*scale)/2+(rect.x+rect.width/2)*scale,box.y+(box.height-height*scale)/2+(rect.y+Math.min(20,Math.floor(rect.height/8))+25+index*50)*scale);
  await expect(page.locator(`[data-line-id="${target}"]`)).toHaveAttribute('aria-current','true');await ready(page);
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
  for(const [label,id] of [['표지 배경',background],['표지 인물',actor]]){
    await pane.getByRole('button',{name:new RegExp(`^${`${label} 이미지 찾기`} ·`),exact:false}).click();
    const dialog=page.getByRole('dialog',{name:`이미지 선택 · ${label}`,exact:true});
    await dialog.locator(`[data-asset-id="${id}"]`).click();
    await dialog.getByRole('button',{name:'선택한 이미지 적용',exact:true}).click();
  }
  await pane.getByLabel('작품 설정 항목',{exact:true}).selectOption('planning');
  for (const [label, text] of [['핵심 아이디어','달빛 편지로 친구를 찾는다.'], ['주인공','편지를 든 흥부'], ['주인공의 목표','친구에게 편지를 전하기'], ['갈등과 문제','숲의 길이 나뉜다.'], ['시작','편지를 챙긴다.'], ['전개','숲에서 친구를 찾는다.'], ['마무리','편지를 함께 읽는다.']]) await pane.getByLabel(label!, { exact: true }).fill(text!);
  await pane.getByLabel('작품 설정 항목',{exact:true}).selectOption('memos');
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
  const context = await browser.newContext({ baseURL:info.project.use.baseURL,viewport: { width: 1280, height: 900 }, hasTouch: true });
  const diagnostics=nativeDiagnostics(`${evidence}/native-events-${info.repeatEachIndex}.jsonl`);
  diagnostics.attach(context);
  const manualTrace=info.project.use.trace==='off';
  if(manualTrace)await context.tracing.start({screenshots:true,snapshots:true,sources:true});
  let clean:BrowserContext|undefined,cleanClosed=false;
  let stopCaught:(()=>Promise<void>)|undefined;
  const errors:string[]=[];
  const observe=(page:Page)=>{page.on('pageerror',error=>errors.push(error.stack??error.message));page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});};
  context.on('page',observe);
  const page = await context.newPage(); page.setDefaultTimeout(15000);
  try {
    await page.goto('/'); await enterLibrary(page); await library(page);
    await expect(page.getByRole('region', { name: '기본 작품', exact: true }).getByRole('article')).toHaveCount(4);
    await create(page, '달빛 편지 준비'); await fillPreparation(page);
    for (const [width,height,name] of [[1280,900,'desktop'],[1024,768,'tablet'],[390,844,'phone']] as const) {
      await page.setViewportSize({width,height});
      for(const section of ['info','planning','memos']){
        await page.getByLabel('작품 설정 항목',{exact:true}).selectOption(section);
        await shot(page, `preparation-${name}-${section}`);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      }
    }
    await page.setViewportSize({width:1280,height:900});
    const prep = await preparation(page);
    await expect(prep.getByLabel('메모 1 연결 위치')).toHaveValue('');
    await prep.getByRole('article',{name:'메모 2',exact:true}).getByRole('button',{name:/열기$/}).click();
    await preparation(page);
    await prep.getByLabel('작품 설정 항목',{exact:true}).selectOption('memos');
    await prep.getByRole('article', {name:'메모 3',exact:true}).getByRole('button', {name:/컷 열기$/}).click();
    await writer(page);
    const manuscript = page.getByRole('region', {name:'장 전체 글 고치기',exact:true});
    await manuscript.getByLabel('1컷 대사 / 해설', {exact:true}).fill('달빛 편지를 챙겨 숲으로 떠났다.');
    await manuscript.getByRole('button', {name:'대사 컷 추가',exact:true}).click();
    await manuscript.getByLabel('2컷 대사 / 해설', {exact:true}).fill('숲에서 친구에게 편지를 전했다.');
    const ownCut = await page.getByLabel('현재 장과 컷 이동',{exact:true}).inputValue();
    await saved(page); await library(page);
    await expect(card(page,'내 작품',ownTitle)).toContainText('편지를 들고 숲으로 떠나는 아이');
    await expect(card(page,'내 작품',ownTitle).locator('img')).toHaveCount(2);
    await create(page,secondTitle);
    await page.getByLabel('대사 / 해설',{exact:true}).fill('바닷가에 새 이야기를 남겼다.');
    await saved(page);
    const second=await exportFile(page,`${evidence}/sea-story.knolstory`);
    expect(second.project.lines[0].text).toBe('바닷가에 새 이야기를 남겼다.');
    await library(page);
    const registeredForest=catalogForestFile();
    await importShelfFile(page,registeredForest);
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
    await preparation(page);await page.getByLabel('작품 설정 항목',{exact:true}).selectOption('planning');await expect(page.getByLabel('핵심 아이디어',{exact:true})).toHaveValue('달빛 편지로 친구를 찾는다.');
    await page.reload(); await library(page); await open(page,'내 작품',ownTitle,'작품 준비');
    await page.getByLabel('작품 설정 항목',{exact:true}).selectOption('memos');
    await expect(page.getByLabel('메모 3 제목',{exact:true})).toHaveValue('편지를 보여 줄 컷');
    await selectCut(page,ownCut);
    await expect(page.locator('[data-line-id][aria-current="true"]')).toHaveAttribute('data-line-id',ownCut);
    const own = await exportFile(page, `${evidence}/moonlight-letter.knolstory`);
    expect(own.project.creativeMemos).toHaveLength(3); expect(own.project.lines).toHaveLength(2);
    expect(own.project.cover).toMatchObject({author:'서재 검증 작가',subtitle:'아이디어에서 첫 대사까지',authorNote:'여러 작품을 오가도 이야기를 잃지 않아요.',layout:'picture',backgroundId:background,characterId:actor});
    expect(own.project.planning).toMatchObject({premise:'달빛 편지로 친구를 찾는다.',mainCharacter:'편지를 든 흥부',mainGoal:'친구에게 편지를 전하기',centralProblem:'숲의 길이 나뉜다.',opening:'편지를 챙긴다.',middle:'숲에서 친구를 찾는다.',ending:'편지를 함께 읽는다.'});
    await open(page,'가져온 작품',forestTitle,'작품 준비');
    const importedBaseline = parseAuthoringFile(registeredForest.buffer.toString('utf8'));
    await page.getByLabel('작품 소개',{exact:true}).fill('두 갈래에서 만나는 친구 · 서재로 보관한 작품');
    await page.getByLabel('작품 설정 항목',{exact:true}).selectOption('planning');
    await page.getByLabel('핵심 아이디어',{exact:true}).fill('서로 다른 길에서도 같은 친구를 만난다.');
    await page.getByLabel('작품 설정 항목',{exact:true}).selectOption('memos');
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
    clean = await browser.newContext({viewport:{width:1280,height:900}});
    diagnostics.attach(clean);
    if(manualTrace)await clean.tracing.start({screenshots:true,snapshots:true,sources:true});
    clean.on('page',observe);
    const fresh = await clean.newPage(); fresh.setDefaultTimeout(15000); await fresh.goto(new URL('/',page.url()).href); await enterLibrary(fresh); await library(fresh);
    await importShelfFile(fresh,`${evidence}/moonlight-letter.knolstory`);await saved(fresh);await library(fresh);await open(fresh,'가져온 작품',ownTitle,'편집하기');const restoredOwn=await exportFile(fresh,info.outputPath('own-fresh.knolstory'));expect(restoredOwn.project).toEqual(own.project);await library(fresh);
    await importShelfFile(fresh,`${evidence}/forest-library.knolstory`);
    await saved(fresh); await library(fresh); await open(fresh,'가져온 작품',forestTitle,'편집하기');
    const roundtrip = await exportFile(fresh,info.outputPath('fresh.knolstory'));
    expect(roundtrip.project).toEqual(archive.project); expect(roundtrip.audioResources).toEqual(archive.audioResources);
    await library(fresh); await openShelfAction(fresh,card(fresh,'가져온 작품',forestTitle),'처음부터 읽기');
    if(process.env.KNOL_CAPTURE_CAUGHT_EXCEPTIONS==='1')stopCaught=await diagnostics.caught(fresh);
    await beginSelectedBook(fresh);
    await ready(fresh); await unlock(fresh); await shot(fresh,'imported-native-reading');
    for(let i=0;i<5;i++){diagnostics.record('step',{name:'fresh-next',index:i});await next(fresh);}
    await nativeChoice(fresh,1,archive.project.lines[8].id);await saved(fresh);
    await expect(fresh.getByRole('button',{name:'이전 읽은 컷',exact:true})).toHaveCount(1);await previousReadCut(fresh);await ready(fresh);
    await expect(fresh.getByTestId('playback-status')).toHaveText('선택해 주세요');
    await nativeChoice(fresh,1,archive.project.lines[8].id);await saved(fresh);
    await fresh.getByRole('button',{name:'저장',exact:true}).click();
    await fresh.getByRole('button',{name:'1번 저장',exact:true}).click();
    await expect(fresh.getByRole('button',{name:'1번 저장',exact:true})).toContainText('별빛 아래에서 길 잃은 친구를 만났다.');
    await fresh.getByRole('button',{name:'읽기 메뉴 닫기',exact:true}).click();await fresh.getByTestId('story-runtime-frame').evaluate(node=>node.setAttribute('data-library-instance','same'));
    await library(fresh);await expect(fresh.getByTestId('story-runtime-frame')).toHaveAttribute('data-library-instance','same');const parked=await fresh.getByTestId('story-runtime-frame').boundingBox();expect(parked!.width).toBeGreaterThan(0);expect(parked!.height).toBeGreaterThan(0); await fresh.reload(); await library(fresh);
    await openShelfAction(fresh,card(fresh,'가져온 작품',forestTitle),'이어읽기');await beginSelectedBook(fresh,true);await ready(fresh);
    await expect(fresh.getByRole('region',{name:'이야기 무대',exact:true}).getByText('별빛 아래에서 길 잃은 친구를 만났다.',{exact:true})).toBeVisible();
    await fresh.getByRole('button',{name:'읽기 메뉴',exact:true}).click();
    await fresh.getByRole('button',{name:'이 컷 편집하기',exact:true}).click();
    const lineId=archive.project.lines.find((line:{text:string})=>line.text==='별빛 아래에서 길 잃은 친구를 만났다.')?.id;
    expect(lineId).toBeDefined();
    await expect(fresh.getByLabel('현재 장과 컷 이동',{exact:true})).toHaveValue(lineId!);
    const textTool=fresh.getByRole('button',{name:'글 편집',exact:true});if(await textTool.isVisible())await textTool.click();
    await fresh.getByLabel('대사 / 해설',{exact:true}).fill('별빛 아래에서 편지를 기다리는 친구를 만났다.');await saved(fresh);
    await fresh.getByRole('button',{name:'이 컷부터 재생',exact:true}).click();await ready(fresh);
    await expect(fresh.getByRole('region',{name:'이야기 무대',exact:true}).getByText('별빛 아래에서 편지를 기다리는 친구를 만났다.',{exact:true})).toBeVisible();
    await stopCaught?.();stopCaught=undefined;
    if(manualTrace)await clean.tracing.stop({path:`${evidence}/fresh-trace-${info.repeatEachIndex}.zip`});await clean.close();cleanClosed=true;
    await open(page,'내 작품',ownTitle,'처음부터 읽기');await ready(page);await unlock(page);
    await next(page);await saved(page);
    await open(page,'내 작품',secondTitle,'처음부터 읽기');await ready(page);
    await expect(page.getByRole('region',{name:'이야기 무대',exact:true}).getByText('바닷가에 새 이야기를 남겼다.',{exact:true})).toBeVisible();
    await open(page,'내 작품',ownTitle,'이어읽기');await ready(page);
    await expect(page.getByRole('region',{name:'이야기 무대',exact:true}).getByText('숲에서 친구에게 편지를 전했다.',{exact:true})).toBeVisible();
    await library(page);await openLibraryTools(page);await page.getByRole('link',{name:'숏스토리 그림책 열기',exact:true}).click();
    await expect(page.getByRole('heading',{name:'숏스토리 그림책',exact:true})).toBeVisible();await expect(page.locator('iframe')).toHaveCount(0);
    writeFileSync(`${evidence}/run-summary.json`,JSON.stringify({browser:await browser.version(),channel:process.env.KNOL_BROWSER_CHANNEL||'bundled Chromium',authorship:'Two works created through UI; twelve-cut fixture uses two registered sound references; historical private-media fixture unchanged',works:[ownTitle,secondTitle,forestTitle],checks:['info/cover/planning/memos','linked cut jump','per-work edit position','per-work native read resume','reload','export/import exact project/audio equality','existing rich lines/chapters preserved','PC/tablet/phone purpose selection and layout','ShortStory entry'],hardware:'Browser viewport conditions; native reading in desktop viewport; no Android hardware claim'},null,2));
  } finally {
    await stopCaught?.();
    writeFileSync(`${evidence}/browser-errors-${info.repeatEachIndex}.json`,JSON.stringify(errors,null,2));
    if(clean&&!cleanClosed){if(manualTrace)await clean.tracing.stop({path:`${evidence}/fresh-trace-${info.repeatEachIndex}.zip`});await clean.close();}
    if(manualTrace)await context.tracing.stop({path:`${evidence}/main-trace-${info.repeatEachIndex}.zip`});
    await context.close();await browser.close();
  }
});

for(const width of [1440,390])test(`memo navigation does not cover text and field-add button matches input height ${width}`,async({page},info)=>{
 test.skip(info.project.name!=='host');
 await page.setViewportSize({width,height:900});await page.goto('/');await enterLibrary(page);
 await create(page,'메모를 확인하며 쓰는 작품');const pane=await preparation(page);
 await pane.getByLabel('작품 설정 항목',{exact:true}).selectOption('memos');
 await pane.getByRole('button',{name:'작품 메모 추가',exact:true}).click();
 await pane.getByLabel('메모 1 제목',{exact:true}).fill('대사 사이에 확인할 창작 메모');
 const hint=pane.locator('[data-creative-memos] p').first();
 await hint.evaluate(node=>window.scrollTo(0,node.getBoundingClientRect().top+window.scrollY-8));
 await page.screenshot({path:info.outputPath(`memo-scroll-${width}.png`),fullPage:true});
 const navigation=pane.getByRole('button',{name:'메모를 두고 현재 컷 편집으로 돌아가기',exact:true});
 const [buttonRect,textRect]=await Promise.all([navigation.boundingBox(),hint.boundingBox()]);
 expect(buttonRect).not.toBeNull();expect(textRect).not.toBeNull();
 expect(buttonRect!.y+buttonRect!.height<=textRect!.y||buttonRect!.y>=textRect!.y+textRect!.height).toBe(true);
 const form=pane.getByRole('article',{name:'메모 1',exact:true}).locator('form');
 const [input,add]=await Promise.all([form.getByLabel('메모 1 새 항목 이름',{exact:true}).boundingBox(),form.getByRole('button',{name:'메모 항목 추가',exact:true}).boundingBox()]);
 expect(add!.height).toBeLessThanOrEqual(input!.height+2);
});

test('library keeps blank planning optional and separates examples from a UI-created work', async ({ page }, info) => {
  test.skip(info.project.name !== 'host');
  await page.goto('/'); await enterLibrary(page); await library(page);
  await expect(page.getByRole('region',{name:'내 작품',exact:true})).toContainText('아직 내 작품이 없어요');
  await expect(page.getByRole('region',{name:'기본 작품',exact:true}).getByRole('article')).toHaveCount(4);
  await create(page,'기획 없이 시작한 이야기');
  const text=page.getByLabel('대사 / 해설',{exact:true});
  await expect(page.getByRole('button',{name:'소리 편집',exact:true})).toBeHidden();
  await text.fill('첫 문장부터 시작해도 괜찮아요.');
  await saved(page);
  const position=await page.getByLabel('현재 장과 컷 이동',{exact:true}).inputValue();
  const pane=await preparation(page);
  await pane.getByLabel('작품 설정 항목',{exact:true}).selectOption('planning');
  await expect(pane.getByLabel('핵심 아이디어',{exact:true})).toHaveValue('');
  await pane.getByRole('button',{name:'현재 컷으로 돌아가기',exact:true}).click();
  await expect(text).toHaveValue('첫 문장부터 시작해도 괜찮아요.');
  await expect(page.getByLabel('현재 장과 컷 이동',{exact:true})).toHaveValue(position);
  await saved(page); await library(page);
  await expect(card(page,'내 작품','기획 없이 시작한 이야기')).toContainText('최근 수정');
  await card(page,'내 작품','기획 없이 시작한 이야기').getByRole('button',{name:/ 책 표지와 소개 보기(?: ·|$)/}).click();await expect(page.getByRole('dialog').getByRole('button',{name:'이어읽기',exact:true})).toHaveCount(0);await page.keyboard.press('Escape');
  await page.reload(); await library(page);
  await open(page,'내 작품','기획 없이 시작한 이야기','편집하기');
  await expect(text).toHaveValue('첫 문장부터 시작해도 괜찮아요.');
  await expect(page.getByLabel('현재 장과 컷 이동',{exact:true})).toHaveValue(position);
  await preparation(page);
  await pane.getByLabel('작품 설정 항목',{exact:true}).selectOption('planning');
  await expect(pane.getByLabel('핵심 아이디어',{exact:true})).toHaveValue('');
  await library(page);
  await expect(page.getByRole('region',{name:'기본 작품',exact:true}).getByRole('article')).toHaveCount(4);
});

test('previous device workspace opens in library without changing its authored content or legacy keys', async ({page},info) => {
  test.skip(info.project.name !== 'host');
  const document=parseAuthoringFile(readFileSync(forestFile,'utf8'));
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
  await expect(page.getByLabel('현재 장과 컷 이동',{exact:true})).toHaveValue(selected);
  const pending=page.waitForEvent('download');await manage(page);await page.getByRole('button',{name:'작품 파일 내보내기',exact:true}).click();
  const downloaded=await (await pending).path();const archive=parseAuthoringFile(readFileSync(downloaded!,'utf8'));
  expect(archive.project).toEqual(document.project);
  expect(archive.audioResources).toEqual(document.audioResources);
  expect(await page.evaluate(()=>localStorage.getItem('storygame-original'))).toBe('legacy work bytes');
  await library(page);await page.reload();await library(page);
  await expect(card(page,'내 작품',forestTitle)).toBeVisible();
});

test('corrupt device storage preserves its raw bytes while a new draft and checkpoint copy can be exported', async({page},info)=>{
  test.skip(info.project.name !== 'host');
  const raw='{preserve original broken workspace';
  const document=parseAuthoringFile(catalogForestFile().buffer.toString('utf8'));
  const checkpoint=JSON.stringify([{id:'library-recovery',projectId:document.project.id,createdAt:'2026-10-12T00:00:00.000Z',reason:'manual',document}]);
  await page.addInitScript(({raw,checkpoint,key})=>{
    if(!sessionStorage.getItem('test-library-seeded')){
      localStorage.setItem('knolstory-next-workspace-v1',raw);
      localStorage.setItem('storygame-original','legacy work bytes');
      localStorage.setItem(key,checkpoint);
      sessionStorage.setItem('test-library-seeded','yes');
    }
  },{raw,checkpoint,key:CHECKPOINT_KEY});
  await page.goto('/'); await enterLibrary(page);
  await expect(page.getByTestId('library-save-status')).toHaveText('저장 내용을 불러오지 못함');
  await expect(page.getByRole('region',{name:'기기 보관함 복구',exact:true})).toContainText('원본을 유지하고 자동 저장을 중지');
  await startShelfCreation(page);await page.getByLabel('새 작품 제목',{exact:true}).fill('파일로 보관할 복구 작품');
  await page.getByRole('button',{name:'새 작품 생성',exact:true}).click();
  const text=page.getByLabel('대사 / 해설',{exact:true});
  await expect(text).toHaveValue('');
  await expect(page.getByRole('region',{name:'작품 설정',exact:true})).toHaveCount(0);
  await expect(page.getByTestId('save-status')).toContainText('임시 보관 중지');
  await text.fill('손상 원본을 바꾸지 않고 파일로 보관할 새 초안');
  await manage(page);
  const draftDownload=page.waitForEvent('download');
  await page.getByRole('button',{name:'작품 파일 내보내기',exact:true}).click();
  const draftPath=await(await draftDownload).path();
  const draft=parseAuthoringFile(readFileSync(draftPath!,'utf8'));
  expect(draft.project.title).toBe('파일로 보관할 복구 작품');
  expect(draft.project.lines[0].text).toBe('손상 원본을 바꾸지 않고 파일로 보관할 새 초안');
  expect(await page.evaluate(()=>localStorage.getItem('knolstory-next-workspace-v1'))).toBe(raw);
  await manage(page);
  await page.getByRole('button',{name:'작품 정보·표지',exact:true}).click();
  await expect(page.getByTestId('workspace-error')).toContainText('작품 설정을 열기 전 저장에 실패');
  await expect(page.getByRole('region',{name:'작품 설정',exact:true})).toHaveCount(0);
  await expect(text).toHaveValue('손상 원본을 바꾸지 않고 파일로 보관할 새 초안');
  expect(await page.evaluate(()=>localStorage.getItem('knolstory-next-workspace-v1'))).toBe(raw);
  await page.getByText('이전 원고',{exact:true}).click();
  await page.getByLabel('모든 작품의 이전 원고 보기',{exact:true}).check();
  const recordDownload=page.waitForEvent('download');
  await page.getByRole('button',{name:'이전 원고 파일로 저장',exact:true}).click();
  const recordPath=await(await recordDownload).path();
  expect(parseAuthoringFile(readFileSync(recordPath!,'utf8')).project).toEqual(document.project);
  await manage(page);
  const recordSummary=page.getByText('이전 원고',{exact:true});
  if(!await recordSummary.locator('..').evaluate(node=>(node as HTMLDetailsElement).open))await recordSummary.click();
  await page.getByLabel('모든 작품의 이전 원고 보기',{exact:true}).check();
  await page.getByRole('button',{name:'이 원고를 사본으로 열기',exact:true}).click();
  const prep=page.getByRole('region',{name:'작품 설정',exact:true});
  await expect(prep.getByLabel('작품 제목',{exact:true})).toHaveValue(`${forestTitle} · 내 사본`);
  await prep.getByLabel('작품 소개',{exact:true}).fill('기존 원본은 보존하고 새 내용은 파일로 옮긴다.');
  await manage(page);
  const pending=page.waitForEvent('download');await page.getByRole('button',{name:'작품 파일 내보내기',exact:true}).click();
  const path=await(await pending).path();const archive=parseAuthoringFile(readFileSync(path!,'utf8'));
  expect(archive.project.title).toBe(`${forestTitle} · 내 사본`);
  expect(archive.project.id).not.toBe(document.project.id);
  expect(archive.project.lines).toEqual(document.project.lines);
  expect(archive.project.chapters).toEqual(document.project.chapters);
  expect(archive.project.creativeMemos).toEqual(document.project.creativeMemos);
  expect(archive.project.planning).toEqual(document.project.planning);
  expect(archive.project.description).toBe('기존 원본은 보존하고 새 내용은 파일로 옮긴다.');
  expect(await page.evaluate(()=>localStorage.getItem('knolstory-next-workspace-v1'))).toBe(raw);
  expect(await page.evaluate(()=>localStorage.getItem('storygame-original'))).toBe('legacy work bytes');
  expect(await page.evaluate(key=>localStorage.getItem(key),CHECKPOINT_KEY)).toBe(checkpoint);
});

test('example preparation makes an independent own copy and duplicate import keeps the original',async({page},info)=>{
 test.skip(info.project.name!=='host');await page.goto('/'); await enterLibrary(page);await library(page);
 const originalTitle='선녀와 나무꾼';await openBuiltinEdition(page,'seonnyeo','knolstory','prepare');
 await expect(page.getByRole('region',{name:'작품 설정',exact:true}).getByLabel('작품 제목',{exact:true})).toHaveValue(`${originalTitle} · 내 사본`);await library(page);await expect(builtinShelfCard(page,'seonnyeo')).toContainText(originalTitle);await expect(page.getByRole('region',{name:'내 작품',exact:true}).getByRole('article')).toHaveCount(1);
 const catalogFile=catalogForestFile();
 await importShelfFile(page,catalogFile);await saved(page);await library(page);
 const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!));
 const originalKey=before.storyId;
 await importShelfFile(page,catalogFile);await saved(page);await library(page);
 await expect(page.getByRole('region',{name:'가져온 작품'}).getByRole('article')).toHaveCount(2);
 const after=await page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!));
 expect(after.storyId).not.toBe(originalKey);
 expectIndependentImportedProject(after.document.project,before.works[originalKey].project);
 expect(Object.keys(after.works)).toHaveLength(Object.keys(before.works).length+1);
 for(const [key,document] of Object.entries(before.works))expect(after.works[key]).toEqual({...document as object,savedAt:after.works[key].savedAt});
 await page.reload();await library(page);
 await expect(page.getByRole('region',{name:'가져온 작품'}).getByRole('article')).toHaveCount(2);
 const restored=await page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!));
 expect(restored.works[originalKey]).toEqual({...before.works[originalKey],savedAt:restored.works[originalKey].savedAt});
 expect(restored.works[after.storyId]).toEqual({...after.works[after.storyId],savedAt:restored.works[after.storyId].savedAt});
});
