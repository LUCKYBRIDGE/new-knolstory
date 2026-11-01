import {test,expect} from '@playwright/test';
import {connectCatalogLayeredScenes} from '../../packages/compatibility/src/catalog-layered-scenes';
import {resolveStageComposition,stageActors} from '../../packages/story-domain/src';
import {confirmAuthoringImport,parseAuthoringFile} from './authoring-file';
import {readFileSync} from 'node:fs';
const cases=[
 {story:'onggojib',line:'review-main-003:fake-route-cruelty-labor-first__work-promised__wage-wet-wood__shoe-poverty:11'},
 {story:'onggojib',line:'review-main-003:b-final-acts:9'},
 {story:'onggojib',line:'review-main-003:fake-route-cruelty-labor-first__work-promised__wage-wet-wood__shoe-poverty:29'},
 {story:'onggojib',line:'review-main-003:b-fake-warning:8'},
 {story:'onggojib',line:'review-main-003:part1-court-cruelty-labor-first__work-promised__wage-wet-wood__shoe-poverty:35'},
 {story:'heungbu',line:'scene-10-9'},
 {story:'rabbit-classic',line:'classic-rabbit-4-line-04'},
];
for(const width of [390,1280])test(`layered action scenes render and survive file/reopen at ${width}`,async({page},info)=>{
 test.setTimeout(240000);await page.setViewportSize({width,height:width===390?844:800});
 await page.addInitScript(()=>sessionStorage.setItem('knolstory-fullscreen-offered-v1','1'));
 await page.route('**/api/**',r=>r.abort());await page.goto('/?view=editor');
 for(const sample of cases){
  const source=JSON.parse(readFileSync(`tests/fixtures/stories/${sample.story}.json`,'utf8'));
  const project=connectCatalogLayeredScenes(source.project??source),line=project.lines.find(l=>l.id===sample.line)!;
  await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
  await page.locator('[data-work-menu]>summary').click();
  await page.getByLabel('작품 파일 가져오기',{exact:true}).setInputFiles({name:sample.story+'.knolstory',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({documentType:'story-maker-project',schemaVersion:8,savedAt:'2026-11-02T00:00:00.000Z',appVersion:'test',project}))});
  await confirmAuthoringImport(page);
  await page.getByLabel('현재 장과 컷 이동',{exact:true}).selectOption(sample.line);
  const imported=await page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).document.project);
  expect(imported.lines.find((l:{id:string})=>l.id===sample.line)).toEqual(line);
  await page.getByRole('button',{name:'이 컷부터 재생',exact:true}).click();
  const status=page.getByTestId('story-runtime-status');
  await expect.poll(async()=>await status.getAttribute('data-rendered-revision')===await status.getAttribute('data-scene-revision')&&Number(await status.getAttribute('data-rendered-revision'))>=0,{timeout:120000}).toBe(true);
  const cast=stageActors(resolveStageComposition(project.chapters.find(c=>c.id===line.chapterId),line,project));
  await expect.poll(async()=>JSON.parse((await status.getAttribute('data-actor-rects'))??'[]').length,{timeout:30000}).toBe(width===390?1:cast.length);
  await page.getByTestId('story-runtime-frame').screenshot({path:info.outputPath(`${sample.story}-${sample.line.split(':').at(-1)}-${width}.png`)});
  await page.getByRole('button',{name:'읽기 메뉴',exact:true}).click();await page.getByRole('button',{name:'이 컷 편집하기',exact:true}).click();
  await page.locator('[data-work-menu]>summary').click();
  const pending=page.waitForEvent('download');await page.getByRole('button',{name:'작품 파일 내보내기',exact:true}).click();const file=await pending,path=info.outputPath(sample.story+'.knolstory');await file.saveAs(path);
  expect(parseAuthoringFile(readFileSync(path,'utf8')).project).toEqual(imported);
  await page.keyboard.press('Escape');await page.reload();
  await expect(page.getByLabel('현재 장과 컷 이동',{exact:true})).toHaveValue(sample.line);
 }
});

test('new costume/action images can be searched, previewed, cancelled and applied in authoring',async({page},info)=>{
 await page.goto('/?view=editor');await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 const raw=JSON.parse(readFileSync('tests/fixtures/stories/onggojib.json','utf8')),project=connectCatalogLayeredScenes(raw);
 await page.locator('[data-work-menu]>summary').click();await page.getByLabel('작품 파일 가져오기',{exact:true}).setInputFiles({name:'picker.knolstory',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({documentType:'story-maker-project',schemaVersion:8,savedAt:'2026-11-02T00:00:00.000Z',appVersion:'test',project}))});await confirmAuthoringImport(page);
 await page.locator('[data-work-menu]>summary').click();await page.getByText('편집 설정',{exact:true}).click();await page.getByRole('checkbox',{name:'인물 편집 사용',exact:true}).check();await page.getByLabel('편집화면 선택',{exact:true}).selectOption('characters');
 const opener=page.locator('button[aria-label^="1컷 인물 1 이미지 찾기"]'),before=await opener.getAttribute('data-asset-value');
 const asset='onggojib.character.layered-ragged-chopping-v1';await opener.click();let dialog=page.getByRole('dialog',{name:'이미지 선택 · 1컷 인물 1',exact:true});
 await dialog.getByLabel('이미지 검색').fill('옹고집 넝마 도끼질');await dialog.locator(`[data-asset-id="${asset}"]`).click();await dialog.screenshot({path:info.outputPath('new-character-picker.png')});await dialog.getByRole('button',{name:'취소',exact:true}).click();await expect(opener).toHaveAttribute('data-asset-value',before!);
 await opener.click();dialog=page.getByRole('dialog',{name:'이미지 선택 · 1컷 인물 1',exact:true});await dialog.getByLabel('이미지 검색').fill('옹고집 넝마 도끼질');await dialog.locator(`[data-asset-id="${asset}"]`).click();await dialog.getByRole('button',{name:'선택한 이미지 적용',exact:true}).click();await expect(opener).toHaveAttribute('data-asset-value',asset);await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');await page.reload();await expect(opener).toHaveAttribute('data-asset-value',asset);
});
