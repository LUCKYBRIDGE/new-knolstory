/** Verify Ren'Py-native dissolve/fade scheduling and ATL actor motion. */
import assert from 'node:assert/strict';
import { PNG } from 'pngjs';
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

const base = process.env.KNOL_VERIFY_URL ?? 'http://127.0.0.1:3000';
const output = process.env.KNOL_VERIFY_OUTPUT ?? 'test-results/native-direction';
await mkdir(output, { recursive: true });
await writeFile('apps/web/public/runtime/verify-native-direction.html', '<!doctype html><html><body style="margin:0"></body></html>');

function changed(left, right, threshold = 30) {
  let count = 0;
  for (let index = 0; index < left.data.length; index += 4) {
    if (Math.abs(left.data[index] - right.data[index]) + Math.abs(left.data[index + 1] - right.data[index + 1]) + Math.abs(left.data[index + 2] - right.data[index + 2]) > threshold) count += 1;
  }
  return count;
}

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${base}/runtime/verify-native-direction.html`);
  await page.evaluate(() => {
    window.presenterEvents = [];
    addEventListener('message', event => { if (event.origin === location.origin) window.presenterEvents.push(event.data); });
    document.body.innerHTML = '<iframe src="/runtime/index.html" width="1280" height="720" style="border:0"></iframe>';
  });
  await page.waitForFunction(() => window.presenterEvents.some(event => event.type === 'ready'), null, { timeout: 90000 });

  let revision = 0;
  const baseScene = {
    contractVersion: 1, sceneId: 'native-a', revision: 0, width: 1280, height: 720, mode: 'play', reducedMotion: false,
    background: { imagePath: 'assets/legacy-18da4fc/onggojib.background.warm-room-pixel.webp' },
    actors: [{ id: 'heungbu', name: '흥부', rect: { x: 130, y: 80, width: 420, height: 620 }, imagePath: 'assets/legacy-18da4fc/heungbu.character.heungbu-swallow-care.webp', depth: 0 }],
    dialogue: { speaker: '흥부', text: '네이티브 전환 전 장면입니다.' }, choices: [], presentationEntry: 'entry-a',
    audio: { version: 1, music: { action: 'stop', fadeOutMs: 0 }, sounds: [] }, presentation: { effects: [] },
  };
  const send = async changes => {
    const scene = { ...baseScene, ...changes, revision: ++revision };
    await page.evaluate(value => document.querySelector('iframe').contentWindow.postMessage({ protocol: 1, type: 'loadScene', seq: value.revision, revision: value.revision, payload: value }, location.origin), scene);
    await page.waitForFunction(value => window.presenterEvents.some(event => event.type === 'sceneRendered' && event.revision === value), revision, { timeout: 30000 });
    return scene;
  };
  const framePng = async name => PNG.sync.read(await page.locator('iframe').screenshot(name ? { path: `${output}/${name}.png` } : undefined));

  await send({});
  await page.waitForTimeout(250);
  const oldScene = await framePng('old-scene');

  const dissolveScene = await send({
    sceneId: 'native-dissolve', presentationEntry: 'entry-b',
    background: { imagePath: 'assets/legacy-18da4fc/seonnyeo.background.classic-sky-realm.webp' },
    actors: [{ id: 'fairy', name: '선녀', rect: { x: 740, y: 70, width: 390, height: 630 }, imagePath: 'assets/legacy-18da4fc/seonnyeo.character.classic-wing-robe.webp', depth: 0 }],
    dialogue: { speaker: '선녀', text: 'Dissolve가 Ren’Py transition으로 진행됩니다.' },
    presentation: { effects: [], transition: { type: 'dissolve', durationMs: 1200, mode: 'auto' } },
  });
  await page.waitForTimeout(160);
  const duringDissolve = await framePng('during-dissolve');
  await page.waitForFunction(value => window.presenterEvents.some(event => event.type === 'presentationDone' && event.revision === value), dissolveScene.revision, { timeout: 10000 });
  await page.waitForTimeout(140);
  const finalDissolve = await framePng('final-dissolve');
  assert.ok(changed(oldScene, duringDissolve) > 1000, 'native dissolve leaves the previous frame');
  assert.ok(changed(finalDissolve, duringDissolve) > 1000, 'native dissolve is not the final frame immediately');

  await send({ ...dissolveScene, presentationEntry: 'entry-b', dialogue: { speaker: '선녀', text: '같은 entry 수정은 전환을 반복하지 않습니다.' } });
  await page.waitForTimeout(160);
  const sameEntry = await framePng('same-entry-no-replay');
  assert.ok(changed(finalDissolve, sameEntry) < 25000, 'same entry revision does not replay native dissolve');

  const fadeScene = await send({
    sceneId: 'native-white-fade', presentationEntry: 'entry-c',
    presentation: { effects: [], transition: { type: 'white-fade', durationMs: 700, mode: 'auto' } },
  });
  await page.waitForFunction(value => window.presenterEvents.some(event => event.type === 'presentationDone' && event.revision === value), fadeScene.revision, { timeout: 10000 });

  const actor = { id: 'master', name: '스승', rect: { x: 140, y: 60, width: 260, height: 450 }, imagePath: 'assets/legacy-18da4fc/onggojib.character.classic-master.webp', motion: { version: 1, type: 'fade-out', offsetX: 0, durationMs: 900, delayMs: 0 } };
  const atlScene = { sceneId: 'native-atl-motion', presentationEntry: 'entry-d', background: { imagePath: 'assets/legacy-18da4fc/onggojib.background.warm-room-pixel.webp' }, actors: [actor], presentation: { effects: [] } };
  await send(atlScene);
  const visible = await framePng('atl-start');
  await page.waitForTimeout(760);
  await send(atlScene);
  await page.waitForTimeout(260);
  const faded = await framePng('atl-same-entry-final');
  assert.ok(changed(visible, faded) > 1000, 'ATL actor fade progresses across same-entry revision instead of restarting');
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ verified: ['native-dissolve', 'native-white-fade', 'same-entry-no-replay', 'atl-motion-same-entry'] }, null, 2));
} finally {
  await browser.close();
}
