import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

const source = JSON.parse(readFileSync('tests/fixtures/responsive-audio.json', 'utf8'));
const fixture = { name: 'responsive-audio.knolstory', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ documentType: 'story-maker-project', schemaVersion: 5, savedAt: '2026-10-06T00:00:00.000Z', appVersion: 'knolstory-next-test', project: source })) };
async function management(page: Page) {
  const summary = page.getByText('작품 관리', { exact: true });
  if (!(await summary.locator('..').evaluate(n => (n as HTMLDetailsElement).open))) await summary.click();
}
async function saved(page: Page) { await expect(page.getByTestId('save-status')).toHaveText('기기에 저장됨'); }
async function tool(page: Page, name: string) { const button = page.getByRole('button', { name, exact: true }); if (await button.isVisible()) await button.click(); }
async function load(page: Page) {
  await page.goto('/?view=editor'); await saved(page); await management(page);
  await page.getByLabel('작품 파일 가져오기').setInputFiles(fixture); await saved(page);
  await expect(page.getByLabel('작품 제목', { exact: true })).toHaveValue(source.title);
}
async function exported(page: Page) {
  await saved(page); await management(page); const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: '작품 파일 내보내기', exact: true }).click();
  const path = (await (await pending).path())!;
  return { path, document: JSON.parse(readFileSync(path, 'utf8')) };
}
async function selectCut(page: Page, id: string) {
  await tool(page, '컷 목록'); const cut = page.locator(`[data-line-id="${id}"]`);
  await cut.evaluate(n => { const detail = n.closest('details'); if (detail) detail.open = true; }); await cut.click();
}
async function rendered(page: Page) {
  const status = page.getByTestId('story-runtime-status');
  await expect(status).toContainText('연결됨', { timeout: 90000 });
  await expect.poll(() => status.evaluate(n => n.getAttribute('data-scene-revision') === n.getAttribute('data-rendered-revision')), { timeout: 30000 }).toBe(true);
  return status;
}
async function uploadSound(page: Page) {
  await tool(page, '연출 편집');
  // A different filename forces custom registration, while real WAV bytes remain audible.
  await page.getByLabel('1번 효과음 파일 등록').setInputFiles({ name: '내-종소리.wav', mimeType: 'audio/wav', buffer: readFileSync('apps/web/public/assets/audio/chime.wav') });
  await expect(page.getByLabel('1번 효과음', { exact: true })).toHaveValue(/^audio:custom:[a-f0-9]{64}:wav$/);
  const id = await page.getByLabel('1번 효과음', { exact: true }).inputValue();
  const preview = page.getByLabel('1번 효과음 미리 듣기');
  await expect(preview).toHaveAttribute('src', /^data:audio\/wav;base64,/);
  await preview.evaluate(async n => { const audio = n as HTMLAudioElement; await audio.play(); });
  await expect.poll(() => preview.evaluate(n => (n as HTMLAudioElement).currentTime)).toBeGreaterThan(0);
  await preview.evaluate(n => (n as HTMLAudioElement).pause());
  return id;
}
for (const width of [1280, 390]) test(`responsive audiovisual authoring and portable custom audio at ${width}px`, async ({ page, context }, info) => {
  test.skip(info.project.name !== 'host'); await page.setViewportSize({ width, height: width === 390 ? 844 : 900 }); await load(page);
  await page.getByRole('button',{name:'이 장 대본',exact:true}).click();await page.getByText('장 설정 · 화자와 기본 자료',{exact:true}).click();
  await page.getByLabel('장 1번 효과음',{exact:true}).selectOption('audio:sound:step');await page.getByLabel('장 1번 효과음 지연').fill('175');
  await page.getByRole('button',{name:'현재 컷 꾸미기',exact:true}).click();
  await tool(page, '연출 편집'); await page.getByLabel('컷 배경음 동작').selectOption('play');
  await page.getByLabel('컷 배경음', { exact: true }).selectOption('audio:music:forest');
  await page.getByLabel('컷 배경음 시작 페이드').fill('400'); await page.getByLabel('컷 배경음 변경 페이드').fill('300');
  await page.getByLabel('컷 배경음 반복').check(); const customId = await uploadSound(page);
  await page.getByLabel('1번 효과음 지연').fill('120');
  await tool(page, '자산 편집'); await page.getByLabel('왼쪽 1번 인물 인물 동작').selectOption('fade-in'); await page.getByLabel('왼쪽 1번 인물 동작 시간').fill('800');await page.getByLabel('왼쪽 1번 인물 동작 대기').fill('100');await page.getByLabel('배경 표시').selectOption('cover'); await page.getByLabel('배경 중심 가로').fill('0.7'); await page.getByLabel('배경 중심 세로').fill('0.35');
  const preset = page.getByLabel('화면 구도', { exact: true });
  for (const value of ['desktop', 'portrait', 'landscape']) { await preset.selectOption(value); await expect(preset).toHaveValue(value); }
  await preset.selectOption('auto');
  const file = await exported(page); const first = file.document.project.lines[0];expect(file.document.project.chapters[0].audio.sounds[0]).toMatchObject({assetId:'audio:sound:step',delayMs:175});
  expect(first.audio.music).toMatchObject({ action: 'play', assetId: 'audio:music:forest', fadeInMs: 400, fadeOutMs: 300, loop: true });
  expect(first.audio.sounds[0]).toMatchObject({ assetId: customId, delayMs: 120 }); expect(first.presentation.backgroundFocal).toEqual({ x: .7, y: .35 });expect(first.stageComposition.leftActors[0].motion).toEqual({type:'fade-in',durationMs:800,delayMs:100});
  await page.reload(); expect((await exported(page)).document.project).toEqual(file.document.project);
  // Restore into an isolated browser: no original IDB audio remains to mask missing file data.
  const fresh = await context.browser()!.newContext({ viewport: { width, height: width === 390 ? 844 : 900 } }); const restored = await fresh.newPage();
  try {
    await restored.goto('http://127.0.0.1:3000/?view=editor'); await saved(restored); await management(restored);
    await restored.getByLabel('작품 파일 가져오기').setInputFiles(file.path); await saved(restored);
    expect((await exported(restored)).document.project).toEqual(file.document.project); await tool(restored, '연출 편집');
    await expect(restored.getByLabel('1번 효과음', { exact: true })).toHaveValue(customId);
    const preview = restored.getByLabel('1번 효과음 미리 듣기'); await preview.evaluate(async n => { await (n as HTMLAudioElement).play(); });
    await expect.poll(() => preview.evaluate(n => (n as HTMLAudioElement).currentTime)).toBeGreaterThan(0);
    expect(await restored.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await restored.screenshot({ path: info.outputPath(`portable-audio-${width}.png`) });
  } finally { await fresh.close(); }
});

test('native RenPy preserves music, runs custom sound once, adapts viewports and reaches both branches', async ({ page, context }, info) => {
  test.skip(info.project.name !== 'stories-runtime'); test.setTimeout(240000); await load(page); const customId = await uploadSound(page);
  await selectCut(page, 'end-night'); await tool(page, '연출 편집');
  await page.getByLabel('컷 배경음 파일 등록').setInputFiles({ name: '내-숲의-음악.wav', mimeType: 'audio/wav', buffer: readFileSync('apps/web/public/assets/audio/forest.wav') });
  await expect(page.getByLabel('컷 배경음', { exact: true })).toHaveValue(/^audio:custom:[a-f0-9]{64}:wav$/);
  const customMusicId = await page.getByLabel('컷 배경음', { exact: true }).inputValue();
  const customMusicPath = `assets/audio/${customMusicId.split(':')[2]}.wav`;
  await selectCut(page, 'opening');await tool(page,'자산 편집');await page.getByLabel('왼쪽 1번 인물 인물 동작').selectOption('move');await page.getByLabel('왼쪽 1번 인물 출발 위치').fill('25');await page.getByLabel('왼쪽 1번 인물 동작 시간').fill('800'); const file = await exported(page);
  // Native playback also happens after restoring custom bytes into a clean browser.
  const fresh = await context.browser()!.newContext(); const runtime = await fresh.newPage();
  try {
    await runtime.goto('http://127.0.0.1:3000/?view=editor'); await saved(runtime); await management(runtime);
    await runtime.getByLabel('작품 파일 가져오기').setInputFiles(file.path); await saved(runtime); await rendered(runtime);
    const frame = runtime.getByTestId('story-runtime-frame'); await frame.evaluate(n => n.setAttribute('data-av-instance', 'persistent'));
    for (const [preset, width, height] of [['desktop',1280,720],['portrait',720,1600],['landscape',1280,576]] as const) {
      await runtime.getByLabel('화면 구도', { exact: true }).selectOption(preset); const status = await rendered(runtime);
      await expect(status).toHaveAttribute('data-scene-width', String(width)); await expect(status).toHaveAttribute('data-scene-height', String(height));
      const actualRatio = Number(await status.getAttribute('data-renderer-width')) / Number(await status.getAttribute('data-renderer-height'));
      expect(actualRatio).toBeCloseTo(width / height, 2);
      await runtime.getByTestId('story-stage-viewport').screenshot({ path: info.outputPath(`native-${preset}.png`) });
    }
    await runtime.setViewportSize({ width: 390, height: 844 });
    await runtime.getByLabel('화면 구도', { exact: true }).selectOption('auto'); await rendered(runtime);
    await expect.poll(async () => Number(await runtime.getByTestId('story-runtime-status').getAttribute('data-scene-height'))).toBeGreaterThan(720);
    expect(await runtime.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await runtime.getByTestId('story-stage-viewport').screenshot({ path: info.outputPath('native-phone-auto.png') });
    await runtime.setViewportSize({width:844,height:390});await rendered(runtime);
    await runtime.getByTestId('story-stage-viewport').screenshot({path:info.outputPath('native-phone-landscape.png')});
    await runtime.setViewportSize({ width: 1280, height: 900 });
    await runtime.getByLabel('화면 구도', { exact: true }).selectOption('desktop');
    await runtime.getByRole('button', { name: '처음부터 읽기', exact: true }).click(); const status = await rendered(runtime);
    await expect(status).toHaveAttribute('data-audio-unlocked','false');
    await expect(status).toHaveAttribute('data-music-start-count','0');
    // A real game click unlocks native WebAudio and starts the presentation clock.
    const bounds = (await frame.boundingBox())!; await runtime.mouse.click(bounds.x + bounds.width * .5, bounds.y + bounds.height * .1);
    await runtime.getByRole('button', { name: '동작 줄이기', exact: true }).click(); await rendered(runtime);
    await expect(status).toHaveAttribute('data-audio-unlocked','true');
    await expect(status).toHaveAttribute('data-music-path', 'assets/audio/forest.wav');
    const starts = Number(await status.getAttribute('data-music-start-count')); const sounds = Number(await status.getAttribute('data-sound-play-count'));
    expect(starts).toBeGreaterThan(0); expect(sounds).toBeGreaterThanOrEqual(2); // Chapter entry and the authored cut sound both execute.
    await runtime.getByRole('button', { name: '다음으로', exact: true }).click(); await rendered(runtime);
    await expect(runtime.locator('[data-line-id="center"]')).toHaveAttribute('aria-current', 'true');
    expect(Number(await status.getAttribute('data-music-start-count'))).toBe(starts);
    expect(Number(await status.getAttribute('data-sound-play-count'))).toBe(sounds);
    await runtime.screenshot({ path: info.outputPath('native-center.png') });
    await runtime.getByLabel('화면 구도').selectOption('auto');await runtime.setViewportSize({width:844,height:390});await rendered(runtime);
    const readingBox=(await runtime.getByTestId('story-stage-viewport').boundingBox())!;expect(readingBox.width).toBeGreaterThan(760);
    await runtime.getByTestId('story-stage-viewport').screenshot({path:info.outputPath('native-phone-landscape-reading.png')});
    await runtime.setViewportSize({width:1280,height:900});await runtime.getByLabel('화면 구도').selectOption('desktop');await rendered(runtime);
    // Same-scene updates must not restart BGM or emit the sound again.
    await runtime.getByRole('button', { name: '동작 줄이기', exact: true }).click(); await rendered(runtime);
    expect(Number(await status.getAttribute('data-music-start-count'))).toBe(starts); expect(Number(await status.getAttribute('data-sound-play-count'))).toBe(sounds);
    for (const ending of ['end-light','end-night']) {
      await runtime.getByRole('button', { name: '처음부터 읽기', exact: true }).click(); await rendered(runtime);
      for (let i=0;i<3;i++) { await runtime.getByRole('button', { name: '다음으로', exact: true }).click(); await rendered(runtime); }
      await expect(runtime.locator('[data-line-id="pov"]')).toHaveAttribute('aria-current', 'true');
      await runtime.screenshot({ path: info.outputPath(`native-pov-${ending}.png`) });
      const box = (await frame.boundingBox())!; await runtime.mouse.click(box.x+box.width*.5,box.y+box.height*(ending==='end-light'?155:210)/720);
      await expect(runtime.locator(`[data-line-id="${ending}"]`)).toHaveAttribute('aria-current', 'true'); await rendered(runtime);
      await expect(status).toHaveAttribute('data-music-path', ending==='end-light'?'':customMusicPath);
      if(ending==='end-night') {
        await runtime.getByRole('button',{name:'이전으로',exact:true}).click();await rendered(runtime);
        await expect(status).toHaveAttribute('data-music-path','assets/audio/forest.wav');
        const choiceBox=(await frame.boundingBox())!;await runtime.mouse.click(choiceBox.x+choiceBox.width*.5,choiceBox.y+choiceBox.height*210/720);
        await rendered(runtime);await expect(status).toHaveAttribute('data-music-path',customMusicPath);
        await expect(frame).toHaveAttribute('data-av-instance','persistent');
        await saved(runtime);await runtime.reload();await rendered(runtime);
        await expect(runtime.locator('[data-line-id="end-night"]')).toHaveAttribute('aria-current','true');
        await expect(runtime.getByTestId('story-runtime-status')).toHaveAttribute('data-audio-unlocked','false');
        const resumeFrame=(await frame.boundingBox())!;await runtime.mouse.click(resumeFrame.x+resumeFrame.width*.5,resumeFrame.y+resumeFrame.height*.5);
        await expect(runtime.getByTestId('story-runtime-status')).toHaveAttribute('data-music-path',customMusicPath);
      }
      await runtime.getByRole('button', { name: '다음으로', exact: true }).click(); await expect(runtime.getByTestId('playback-status')).toHaveText('이야기 끝');
    }
    await expect(frame).toHaveCount(1);
    await runtime.getByRole('button', { name: '편집으로', exact: true }).click();
    const result = await exported(runtime); expect(result.document.project).toEqual(file.document.project);
    expect(result.document.project.lines[0].audio.sounds[0].assetId).toBe(customId);
  } finally { await fresh.close(); }
});

test('delivered portable branching demo opens with embedded audio and plays both native endings',async({page},info)=>{
 test.skip(info.project.name!=='stories-runtime');
 const demo=JSON.parse(readFileSync('docs/architecture/evidence/responsive-audio/branching-demo.knolstory','utf8'));
 await page.goto('/?view=editor');await saved(page);await management(page);
 await page.getByLabel('작품 파일 가져오기').setInputFiles('docs/architecture/evidence/responsive-audio/branching-demo.knolstory');await saved(page);
 await expect(page.getByRole('heading',{name:demo.project.title,exact:true})).toBeVisible();
 await page.getByLabel('화면 구도').selectOption('desktop');
 const frame=page.getByTestId('story-runtime-frame');
 for(const option of ['light','night']) {
  await page.getByRole('button',{name:'처음부터 읽기',exact:true}).click();const status=await rendered(page);
  if(option==='light') {
   await expect(status).toHaveAttribute('data-audio-unlocked','false');
   const box=(await frame.boundingBox())!;await page.mouse.click(box.x+box.width*.5,box.y+box.height*.5);
  }
  await expect(status).toHaveAttribute('data-music-path','assets/audio/forest.wav');
  for(let i=0;i<3;i++){await page.getByRole('button',{name:'다음으로',exact:true}).click();await rendered(page);}
  const box=(await frame.boundingBox())!;await page.mouse.click(box.x+box.width*.5,box.y+box.height*(option==='light'?155:210)/720);
  await expect(page.locator(`[data-line-id="end-${option}"]`)).toHaveAttribute('aria-current','true');await rendered(page);
  const music=demo.audioResources.find((r:{kind:string})=>r.kind==='music');
  await expect(status).toHaveAttribute('data-music-path',option==='light'?'':`assets/audio/${music.id.split(':')[2]}.wav`);
  await page.getByRole('button',{name:'다음으로',exact:true}).click();await expect(page.getByTestId('playback-status')).toHaveText('이야기 끝');
 }
 await page.getByTestId('story-stage-viewport').screenshot({path:info.outputPath('delivered-demo-ending.png')});
});

test('ending keeps the last entrance confirmed and does not replay its sounds',async({page},info)=>{
 test.skip(info.project.name!=='stories-runtime');
 const project={...source,lines:source.lines.map((line:{id:string})=>line.id==='opening'?{...line,flow:{type:'goto',targetLineId:null}}:line)};
 await page.goto('/?view=editor');await saved(page);await management(page);
 await page.getByLabel('작품 파일 가져오기').setInputFiles({name:'single-ending.knolstory',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({...JSON.parse(fixture.buffer.toString()),project}))});
 await saved(page);await page.getByRole('button',{name:'처음부터 읽기',exact:true}).click();const status=await rendered(page);
 const box=(await page.getByTestId('story-runtime-frame').boundingBox())!;await page.mouse.click(box.x+box.width*.5,box.y+box.height*.1);
 await expect.poll(async()=>Number(await status.getAttribute('data-sound-play-count'))).toBe(2);
 await page.getByRole('button',{name:'다음으로',exact:true}).click();await rendered(page);
 await expect(page.getByTestId('playback-status')).toHaveText('이야기 끝');
 await expect(status).toHaveAttribute('data-sound-play-count','2');
 await page.getByRole('button',{name:'동작 줄이기',exact:true}).click();await rendered(page);
 await expect(status).toHaveAttribute('data-sound-play-count','2');
});
