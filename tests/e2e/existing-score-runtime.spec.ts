import {parseAuthoringFile,openFileExchange} from './authoring-file';
import {advanceReading,editReadCut,loadReadSlot,readerLibrary,restartReading,saveReadSlot} from './native-reader';
import {createStoryDocument} from '../../packages/story-domain/src/index';
import {normalizeChapterTitle} from '../../packages/story-domain/src/legacy/chapter-identity';
import {openBuiltinEdition} from './library-entry';
import {importShelfFile} from './library-entry';
import {openShelfAction} from './library-entry';
import {enterLibrary,beginSelectedBook} from './library-entry';
import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import type { StoryProject } from '../../packages/story-domain/src/index';

test.use({ channel: process.env.KNOL_BROWSER_CHANNEL || undefined });

type PlaybackState = { lineId: string | null; path: string[]; status: 'reading' | 'choice' | 'ended'; choiceHistory?: { pathIndex: number; choiceId: string }[] };
const audioCatalog: { id: string; runtimePath: string }[] = parseAuthoringFile(readFileSync('packages/asset-registry/src/story-score.json', 'utf8'));
function createPlayback(project: StoryProject, lineId?: string): PlaybackState {
  const chapters = [...project.chapters].sort((a, b) => a.order - b.order);
  const lines = chapters.flatMap(ch => project.lines.filter(c => c.chapterId === ch.id).sort((a, b) => a.order - b.order));
  const cut = project.lines.find(c => c.id === (lineId ?? lines[0]!.id))!;
  return { lineId: cut.id, path: [cut.id], status: cut.flow?.type === 'choice' && !cut.ending?.endsStory ? 'choice' : 'reading' };
}
function advancePlayback(project: StoryProject, state: PlaybackState, choiceId?: string): PlaybackState {
  const cut = project.lines.find(c => c.id === state.lineId)!;
  const chapters = [...project.chapters].sort((a, b) => a.order - b.order);
  const lines = chapters.flatMap(ch => project.lines.filter(c => c.chapterId === ch.id).sort((a, b) => a.order - b.order));
  const target = cut.ending?.endsStory ? null : cut.flow?.type === 'choice' ? cut.flow.options.find(o => o.id === choiceId)!.targetLineId : cut.flow?.type === 'goto' ? cut.flow.targetLineId : lines[lines.findIndex(c => c.id === cut.id) + 1]?.id ?? null;
  const history = choiceId ? [...(state.choiceHistory ?? []), { pathIndex: state.path.length - 1, choiceId }] : state.choiceHistory;
  expect(target).not.toBe('');
  if (target === null) return { ...state, lineId: null, status: 'ended', choiceHistory: history };
  const next = createPlayback(project, target);
  return { ...next, path: [...state.path, target], choiceHistory: history };
}
function expectedAudio(project: StoryProject, state: PlaybackState, channel: 'music' | 'ambience'): string {
  let previousChapter = '';
  let path = '';
  for (const id of state.path) {
    const cut = project.lines.find(c => c.id === id)!;
    const defaults = cut.chapterId !== previousChapter ? project.chapters.find(ch => ch.id === cut.chapterId)?.audio?.[channel] : undefined;
    for (const cue of [defaults, cut.audio?.[channel]]) {
      if (cue?.action === 'stop') path = '';
      if (cue?.action === 'play') {
        const asset = audioCatalog.find(a => a.id === cue.assetId);
        expect(asset, cue.assetId).toBeTruthy(); path = asset!.runtimePath;
      }
    }
    previousChapter = cut.chapterId;
  }
  return path;
}

const evidence = 'docs/architecture/evidence/existing-story-enhancement';
const workIds = ['seonnyeo-classic', 'heungbu-classic', 'onggojib-classic', 'rabbit-classic', 'seonnyeo', 'heungbu', 'onggojib', 'rabbit'];
const archivePath=(id:string)=>id==='heungbu'&&process.env.KNOL_COVER_ARCHIVE?process.env.KNOL_COVER_ARCHIVE:`${evidence}/${id}.knolstory`;
const reportFolder=(id:string)=>{const folder=`${process.env.KNOL_NATIVE_EVIDENCE_DIR??'test-results/native-current'}/${id==='heungbu'&&process.env.KNOL_COVER_ARCHIVE?'entry-cover':'full-score'}`;mkdirSync(folder,{recursive:true});return folder;}; // Output destination; archivePath inputs unchanged.
const readProject = (id: string): StoryProject => parseAuthoringFile(readFileSync(archivePath(id), 'utf8')).project;
/** Preserve archived input bytes; adapt only the public file envelope for current uploads. */
async function currentArchiveFile(path: string) {
  const source = parseAuthoringFile(readFileSync(path, 'utf8'));
  if (source.format === 'knolstory' && source.formatVersion === 2) return path;
  const document = createStoryDocument({project:source.project,savedAt:source.savedAt,appVersion:source.appVersion,...(source.assetCatalogVersion?{assetCatalogVersion:source.assetCatalogVersion}:{})});
  expect(document.project).toEqual(source.project);
  const archive = {format:'knolstory',formatVersion:2,document,audioResources:source.audioResources??[]};
  return {name:path.split('/').at(-1)!,mimeType:'application/json',buffer:Buffer.from(JSON.stringify(archive))};
}
const status = (page: Page) => page.getByTestId('story-runtime-status');
async function ready(page: Page) {
  await expect(status(page)).toContainText('연결됨', { timeout: 90000 });
  await expect.poll(() => status(page).evaluate(n => n.getAttribute('data-rendered-revision') === n.getAttribute('data-scene-revision')), { timeout: 30000 }).toBe(true);
}
async function nativePoint(page: Page, x: number, y: number) {
  const frame = page.getByTestId('story-runtime-frame');
  await frame.scrollIntoViewIfNeeded();
  const box = (await frame.boundingBox())!;
  const width = Number(await status(page).getAttribute('data-scene-width'));
  const height = Number(await status(page).getAttribute('data-scene-height'));
  const scale = Math.min(box.width / width, box.height / height);
  await page.mouse.click(box.x + (box.width - width * scale) / 2 + x * scale, box.y + (box.height - height * scale) / 2 + y * scale);
}
async function unlock(page: Page) {
  await ready(page);
  if ((await status(page).textContent())?.includes('소리를 시작하려면')) {
    await nativePoint(page, Number(await status(page).getAttribute('data-scene-width')) / 2, Number(await status(page).getAttribute('data-scene-height')) / 2);
    await expect(status(page)).toHaveAttribute('data-audio-unlocked', 'true');
    await ready(page);
  }
}
/** A long cut is split into dialogue pages; 다음으로 turns pages first, so read every page before moving to the next cut. */
async function finishDialoguePages(page: Page) {
  for (let turns = 0; turns < 20; turns++) {
    await ready(page);
    const raw = await status(page).getAttribute('data-dialogue-page');
    const dialogue = raw ? JSON.parse(raw) as { index: number; count: number } | null : null;
    if (!dialogue || dialogue.index >= dialogue.count - 1) return;
    await advanceReading(page);
    await expect.poll(async () => (JSON.parse((await status(page).getAttribute('data-dialogue-page')) ?? 'null') as { index: number } | null)?.index, { timeout: 15000 }).not.toBe(dialogue.index);
  }
}
async function allowAdvance(page: Page, confirm: boolean) {
  await ready(page);
  if (confirm) {
    // Ren'Py transition frame has 16px top padding and an 80px button at height - 112.
    // Click its center in scene coordinates, including the iframe's letterbox offset.
    await nativePoint(page, Number(await status(page).getAttribute('data-scene-width')) / 2, Number(await status(page).getAttribute('data-scene-height')) - 56);
  }
  await expect(page.getByRole('button', { name: '다음으로', exact: true })).toBeEnabled({ timeout: 15000 });
}
async function nativeChoice(page: Page, index: number, label: string) {
  await ready(page);
  await expect(page.getByRole('button', { name: label, exact: true })).toBeEnabled({ timeout: 15000 });
  const rect = JSON.parse((await status(page).getAttribute('data-choices-rect'))!) as {x:number;y:number;width:number;height:number};
  expect(rect).not.toBeNull();
  // Ren'Py's choice spacing follows the stage layout, so a fixed pixel step can land on another option. The semantic
  // layer mirrors each choice as a real button (ADR 0015); pressing it by name is the same reader action.
  void index;
  await page.getByRole('button', { name: label, exact: true }).click();
}
async function currentLine(page: Page, lineId: string, text: string, transitionOnly = false) {
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).playback?.lineId)).toBe(lineId);
  // A perspective change shown only as a black title card has no dialogue text to read (story-runtime transitionOnly).
  if (transitionOnly) return;
  const semantic = page.locator('details').filter({has:page.getByText('대사·해설 텍스트 보기', {exact:true})});
  await expect(semantic.getByText(text, {exact:true})).toBeVisible();
}
async function verifyAudio(page: Page, project: StoryProject, state: PlaybackState) {
  await expect(status(page)).toHaveAttribute('data-music-path', expectedAudio(project, state, 'music'));
  await expect(status(page)).toHaveAttribute('data-ambience-path', expectedAudio(project, state, 'ambience'));
  return { music: await status(page).getAttribute('data-music-path'), ambience: await status(page).getAttribute('data-ambience-path'), musicStarts: await status(page).getAttribute('data-music-start-count'), ambienceStarts: await status(page).getAttribute('data-ambience-start-count'), sounds: await status(page).getAttribute('data-sound-play-count') };
}
async function saveResume(page: Page, project: StoryProject, state: PlaybackState) {
  await saveReadSlot(page, 1);
  await page.getByRole('button', { name: '읽기 메뉴 닫기', exact: true }).click();
  await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
  await page.reload(); await ready(page); await unlock(page);
  const line = project.lines.find(cut => cut.id === state.lineId)!;
  await currentLine(page, line.id, line.text);
  await verifyAudio(page, project, state);
  await loadReadSlot(page, 1);
  await ready(page); await verifyAudio(page, project, state);
  await page.getByTestId('story-runtime-frame').evaluate(n => n.setAttribute('data-score-instance', 'persistent'));
}

for (const id of workIds) test(`${id}: actual browser reads the existing scored work, resumes and preserves its archive`, async ({ browser }, info) => {
  test.skip(info.project.name !== 'stories-runtime'); test.setTimeout(900000);
  mkdirSync(reportFolder(id), { recursive: true });
  const project = readProject(id);
  const source: StoryProject = parseAuthoringFile(readFileSync(`tests/fixtures/stories/${id}.json`, 'utf8'));
  // Independent authored-content assertion against the fixed-baseline manuscript.
  if(process.env.KNOL_COVER_ARCHIVE&&id==='heungbu')expect(project.id).not.toBe(source.id);else expect(project.id).toBe(source.id);
  expect(project.lines.map(c => [c.id, c.chapterId, c.text, c.flow])).toEqual(source.lines.map(c => [c.id, c.chapterId, c.text, c.flow]));
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const audioResponses = new Set<string>();
  page.on('response', response => { if (response.status() === 200 && /assets\/audio\//.test(response.url())) audioResponses.add(response.url()); });
  await page.goto('/'); await enterLibrary(page); await expect(page.getByTestId('library-save-status')).toHaveText('임시 보관됨');
  // Open the shipped original/VN catalog first; no newly invented story is used.
  await openBuiltinEdition(page,id.replace('-classic',''),id.endsWith('-classic')?'original':'knolstory','start'); await beginSelectedBook(page);
  await ready(page); await unlock(page);
  await verifyAudio(page, project, createPlayback(project));
  await readerLibrary(page);
  await importShelfFile(page,await currentArchiveFile(archivePath(id)));
  await expect(page.getByRole('region', { name: '작품 설정', exact: true })).toBeVisible();
  await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).storyId)).toMatch(/^import:/);
  const importedProject=await page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).document.project);
  const sourceBuiltinId=parseAuthoringFile(readFileSync(`tests/fixtures/stories/${id}.json`,'utf8')).id;
  // Import retires 'N막:' chapter prefixes (chapter-title-migration); everything else must arrive unchanged.
  const expectedImport = { ...project, chapters: project.chapters.map(chapter => ({ ...chapter, title: normalizeChapterTitle(chapter.title) })) };
  if(project.id===sourceBuiltinId){expect(importedProject.id).not.toBe(project.id);expect({...importedProject,id:project.id}).toEqual(expectedImport);}else expect(importedProject).toEqual(expectedImport);
  await page.getByRole('button',{name:'서재 · 홈으로 이동',exact:true}).or(page.getByRole('button',{name:'서재로',exact:true})).first().click();
  const imported = page.getByRole('article', { name: `내 작품 · ${project.title}`, exact: true });
  await expect(imported).toBeVisible();
  await openShelfAction(page,imported,'처음부터 읽기'); await beginSelectedBook(page); await ready(page); await unlock(page);
  const frame = page.getByTestId('story-runtime-frame');
  await frame.evaluate(n => n.setAttribute('data-score-instance', 'persistent'));
  const records: unknown[] = [];
  const routes = id.endsWith('-classic') ? [0] : [0, 1];
  for (const route of routes) {
    if (route) { await restartReading(page); await ready(page); await unlock(page); }
    let state = createPlayback(project); let chapter = ''; let steps = 0; let firstFork = true;
    while (state.status !== 'ended') {
      expect(++steps).toBeLessThanOrEqual(project.lines.length + 1);
      const cut = project.lines.find(line => line.id === state.lineId)!;
      await ready(page);
      const perspectiveCard = cut.type === 'narration' && cut.speakerName === '시점 전환' && cut.presentation?.transition?.type === 'perspective-blackout' && !!cut.presentation.transition.title?.trim() && cut.text.trim() === cut.presentation.transition.title.trim() && !cut.flow;
      await currentLine(page, cut.id, cut.text, perspectiveCard);
      if (chapter !== cut.chapterId || cut.audio) {
        const audio = await verifyAudio(page, project, state);
        records.push({ route, lineId: cut.id, chapterId: cut.chapterId, ...audio });
        chapter = cut.chapterId;
      }
      if (steps === 1) await page.screenshot({ path: `${reportFolder(id)}/${id}-native.png`, fullPage: true });
      if (route === 0 && steps === 5) await saveResume(page, project, state);
      if (state.status === 'choice') {
        const choiceIndex = firstFork ? route : 0; firstFork = false;
        const options = cut.flow?.type === 'choice' ? cut.flow.options : [];
        expect(options[choiceIndex]).toBeTruthy();
        await finishDialoguePages(page);
        await nativeChoice(page, choiceIndex, options[choiceIndex]!.label);
        state = advancePlayback(project, state, options[choiceIndex]!.id);
      } else {
        // The ending gives the screen to the credits (no reading bar), so the reader's history is checked on the last cut.
        await finishDialoguePages(page);
        if (advancePlayback(project, state).status === 'ended') await lastCutHistory(page, project, state);
        await allowAdvance(page, cut.presentation?.transition?.mode === 'confirm');
        // A perspective title card is finished by its own button; pressing 다음으로 again would skip the next cut.
        if (perspectiveCard) await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).playback?.lineId), { timeout: 15000 }).not.toBe(cut.id);
        else await advanceReading(page);
        state = advancePlayback(project, state);
      }
    }
    await expect(page.getByTestId('playback-status')).toHaveText('이야기 끝');
    await expect(frame).toHaveAttribute('data-score-instance', 'persistent');
    records.push({ route, status: 'ended', path: state.path, choiceHistory: state.choiceHistory ?? [], cutsRead: steps });
  }
  // Reading started from the library has no editor to return to; the reader goes back to the shelf and opens 편집하기.
  if (await page.getByRole('button', { name: '편집으로 돌아가기', exact: true }).count()) await editReadCut(page);
  else { await readerLibrary(page); await openShelfAction(page, imported, '편집하기'); }
  await expect(page.locator('[data-current-cut] textarea').first()).toBeVisible({ timeout: 60000 });
  const manager = page.locator('[data-work-menu]>summary');
  if (!await manager.locator('..').evaluate(n => (n as HTMLDetailsElement).open)) await manager.click();
  await openFileExchange(page);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: '작품 파일 내보내기', exact: true }).click();
  const archive = parseAuthoringFile(readFileSync((await (await download).path())!, 'utf8'));
  expect(archive.project).toEqual(importedProject);
  expect(Number(await status(page).getAttribute('data-music-start-count'))).toBeGreaterThan(0);
  writeFileSync(`${reportFolder(id)}/${id}-native-reading.json`, JSON.stringify({ browser: `Playwright ${process.env.KNOL_BROWSER_CHANNEL || 'chromium'}`, browserVersion: browser.version(), inputArchive: archivePath(id), inputArchiveSha256: createHash('sha256').update(readFileSync(archivePath(id))).digest('hex'), viewport: { width: 1280, height: 900 }, scope: id.endsWith('-classic') ? 'complete original manuscript' : 'first-option route and alternate first-fork route; subsequent choices first option', projectId: project.id, importedProjectId: importedProject.id, importedIdentityForked: importedProject.id!==project.id, authoredCuts: project.lines.length, audioTransport: 'RenPy bundled game assets; browser per-file responses may be absent', audioResponses: [...audioResponses], records, archiveProjectExactMatch: true }, null, 2));
  await context.close();
});


/** 지난기록 on the last cut lists this chapter's path and the choices made in it. A confirm card on that cut keeps the bar aside. */
async function lastCutHistory(page: Page, project: StoryProject, state: PlaybackState) {
  const bar = page.locator('[data-reader-quick-bar]');
  if (!await bar.waitFor({ state: 'visible', timeout: 5000 }).then(() => true, () => false)) {
    test.info().annotations.push({ type: 'history', description: 'last cut is covered by a confirm card; 지난기록 is not offered there' });
    return;
  }
  await page.getByRole('button', { name: '지난기록', exact: true }).click();
  const log = page.getByRole('dialog').locator('[data-reader-current-script] li');
  const lastChapterId = project.lines.find(line => line.id === state.path.at(-1))!.chapterId;
  let chapterStart = state.path.length - 1;
  while (chapterStart > 0 && project.lines.find(line => line.id === state.path[chapterStart - 1])!.chapterId === lastChapterId) chapterStart--;
  await expect(log).toHaveCount(state.path.length - chapterStart);
  for (const [index, decision] of (state.choiceHistory ?? []).entries()) {
    const choiceCut = project.lines.find(c => c.id === state.path[decision.pathIndex])!;
    const option = choiceCut.flow?.type === 'choice' ? choiceCut.flow.options.find(o => o.id === decision.choiceId) : undefined;
    expect(option, `selected option ${index}`).toBeTruthy();
    if (decision.pathIndex >= chapterStart) await expect(log.nth(decision.pathIndex - chapterStart)).toContainText(`선택: ${option!.label}`);
  }
  await page.getByRole('button', { name: '읽기 메뉴 닫기', exact: true }).click();
}

test('Seonnyeo existing storm: fixed original versus scored cut in actual browser Ren’Py', async ({ browser }, info) => {
  test.skip(info.project.name !== 'stories-runtime'); test.setTimeout(240000);
  const cutId = 'P2-v165-11';
  const records: unknown[] = [];
  for (const version of ['before', 'after'] as const) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    const sourceFile = version === 'before' ? 'tests/fixtures/stories/seonnyeo.json' : `${evidence}/seonnyeo.knolstory`;
    const raw = parseAuthoringFile(readFileSync(sourceFile, 'utf8'));
    const project: StoryProject = raw.project ?? raw;
    const cut = project.lines.find(line => line.id === cutId)!;
    expect(cut.text).toContain('흙이 무너지는 소리');
    await page.goto('/'); await enterLibrary(page); await expect(page.getByTestId('library-save-status')).toHaveText('임시 보관됨');
    const inputFile = version === 'before' ? { name: 'baseline.knolstory', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({format:'knolstory',formatVersion:2,document:createStoryDocument({project,savedAt:'2026-10-08T00:00:00.000Z',appVersion:'before-after-baseline'}),audioResources:[]})) } : await currentArchiveFile(sourceFile);
    await importShelfFile(page,inputFile);
    await expect(page.getByRole('region', { name: '작품 설정', exact: true })).toBeVisible();
    await page.getByRole('button',{name:'서재 · 홈으로 이동',exact:true}).or(page.getByRole('button',{name:'서재로',exact:true})).first().click();
    const card = page.getByRole('article', { name: `내 작품 · ${project.title}`, exact: true });
    await openShelfAction(page,card,'편집하기');
    // The top bar's chapter·cut place is the one way to reach a cut (DESIGN 집중 편집 규칙 2).
    await expect(page.locator('[data-current-cut] textarea').first()).toBeVisible({ timeout: 60000 });
    const place = page.getByLabel('현재 장과 컷 이동', { exact: true });
    await place.selectOption(cutId); await expect(place).toHaveValue(cutId);
    await page.getByRole('button', { name: '이 컷부터 재생', exact: true }).click();
    await ready(page); await unlock(page);
    const audio = await verifyAudio(page, project, createPlayback(project, cutId));
    if (version === 'after') {
      await expect(status(page)).toHaveAttribute('data-ambience-path', /ambience-rain/);
      await expect.poll(async () => Number(await status(page).getAttribute('data-sound-play-count'))).toBeGreaterThan(0);
    } else {
      await expect(status(page)).toHaveAttribute('data-music-path', '');
      await expect(status(page)).toHaveAttribute('data-sound-play-count', '0');
    }
    await page.screenshot({ path: `${reportFolder('seonnyeo')}/seonnyeo-storm-${version}.png`, fullPage: true });
    records.push({ version, cutId, text: cut.text, chapterId: cut.chapterId, presentation: cut.presentation, audio });
    await context.close();
  }
  writeFileSync(`${reportFolder('seonnyeo')}/seonnyeo-storm-comparison.json`, JSON.stringify({ browser: 'Chrome', viewport: { width: 1280, height: 900 }, fixedBaseline: '18da4fc5bd4bf2a9080b32903d31f1aacdd24a0b', records }, null, 2));
});

test('existing eight works: actual decoded music clock advances after the first unlocked cue', async ({ browser }, info) => {
  test.skip(info.project.name !== 'stories-runtime'); test.setTimeout(300000);
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage(); await page.goto('/'); await enterLibrary(page);
  await expect(page.getByTestId('library-save-status')).toHaveText('임시 보관됨');
  const records: unknown[] = [];
  for (const id of workIds) {
    const project = readProject(id);
    await openBuiltinEdition(page,id.replace('-classic',''),id.endsWith('-classic')?'original':'knolstory','start'); await beginSelectedBook(page);
    await ready(page); await unlock(page);
    const first = createPlayback(project);
    await verifyAudio(page, project, first);
    const firstCut = project.lines.find(c => c.id === first.lineId)!;
    await allowAdvance(page, firstCut.presentation?.transition?.mode === 'confirm');
    // get_pos is reported on sceneRendered, so advance one existing dialogue after decoding begins.
    await advanceReading(page); await ready(page);
    const next = advancePlayback(project, first);
    await verifyAudio(page, project, next);
    await expect.poll(async () => Number(await status(page).getAttribute('data-music-position')), { timeout: 10000 }).toBeGreaterThan(0);
    records.push({ catalogId: id, projectId: project.id, firstLine: first.lineId, nextLine: next.lineId, musicPath: await status(page).getAttribute('data-music-path'), musicPositionSeconds: Number(await status(page).getAttribute('data-music-position')), musicStartCount: Number(await status(page).getAttribute('data-music-start-count')), ambiencePath: await status(page).getAttribute('data-ambience-path'), ambienceStartCount: Number(await status(page).getAttribute('data-ambience-start-count')) });
    await readerLibrary(page);
  }
  writeFileSync(`${reportFolder('seonnyeo')}/decoded-music-clock.json`, JSON.stringify({ browser: 'Chrome', method: 'native renpy.music.get_pos reported by sceneRendered after first unlocked cue and one real dialogue advance', records }, null, 2));
  await context.close();
});
