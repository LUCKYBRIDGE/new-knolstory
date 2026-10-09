/** Verify native presentation timing/reset, preserving one Ren'Py instance. */
import assert from 'node:assert/strict';
import { PNG } from 'pngjs';
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

const base = process.env.KNOL_VERIFY_URL ?? 'http://127.0.0.1:3000';
const output = 'test-results/presentation-refinement';
await mkdir(output, { recursive: true });
await writeFile('apps/web/public/runtime/verify-refinement.html', '<!doctype html><html><body style="margin:0"></body></html>');
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto(`${base}/runtime/verify-refinement.html`);
  await page.evaluate(() => {
    window.presenterEvents = [];
    addEventListener('message', event => {
      if (event.origin === location.origin) window.presenterEvents.push(event.data);
    });
    document.body.innerHTML = '<iframe src="/runtime/index.html" width="1280" height="720" style="border:0"></iframe>';
  });
  await page.waitForFunction(() => window.presenterEvents.some(event => event.type === 'ready'), null, { timeout: 90000 });
  let revision = 0;
  const neutral = {
    contractVersion: 1, sceneId: 'neutral', revision: 0, width: 1280, height: 720,
    mode: 'play', reducedMotion: false, ended: false,
    background: { imagePath: 'assets/legacy-18da4fc/BG04-cottage-day.webp' },
    actors: [{ id: 'heungbu', name: '흥부', rect: { x: 160, y: 90, width: 420, height: 620 }, imagePath: 'assets/legacy-18da4fc/heungbu.character.heungbu-swallow-care.webp', flipX: false, opacity: 1, depth: 0, emphasis: 'normal', spectral: false }],
    dialogue: { speaker: '흥부', text: '연출은 사라지고, 이야기와 선택은 계속됩니다.' }, choices: [], presentation: { effects: [] },
  };
  const send = async (changes = {}) => {
    const scene = { ...neutral, ...changes, revision: ++revision };
    await page.evaluate(value => document.querySelector('iframe').contentWindow.postMessage({ protocol: 1, type: 'loadScene', seq: value.revision, revision: value.revision, payload: value }, location.origin), scene);
    await page.waitForFunction(value => window.presenterEvents.some(event => event.type === 'sceneRendered' && event.revision === value), revision, { timeout: 30000 });
    return revision;
  };
  const capture = async name => PNG.sync.read(await page.screenshot({ ...(name ? { path: `${output}/${name}.png` } : {}), clip: { x: 0, y: 0, width: 1280, height: 500 } }));
  const difference = (left, right) => {
    let count = 0;
    for (let index = 0; index < left.data.length; index += 4) {
      if (Math.abs(left.data[index] - right.data[index]) + Math.abs(left.data[index + 1] - right.data[index + 1]) + Math.abs(left.data[index + 2] - right.data[index + 2]) > 30) count++;
    }
    return count;
  };
  await send();
  await page.waitForTimeout(200);
  const baseline = await capture('neutral');
  await send({ sceneId: 'speaker-emphasis', actors: neutral.actors.map(actor => ({ ...actor, emphasis: 'dim' })) });
  assert.ok(difference(baseline, await capture('listener-dim')) > 1000, 'listener dim visibly distinguishes the speaker image');
  await send({ sceneId: 'speaker-normal' });
  assert.ok(difference(baseline, await capture('speaker-normal')) < 1000, 'normal speaker restores un-dimmed image');
  const effect = type => ({ type, intensity: 'normal', trigger: 'after-delay', delayMs: 800 });
  const pixels = {};
  for (const type of ['shake', 'flash', 'flash-red', 'fade-black', 'crack', 'screen-crack', 'spotlight']) {
    await send({ sceneId: `delayed-${type}`, presentation: { effects: [effect(type)] } });
    assert.ok(difference(baseline, await capture()) < 1000, `${type}: no effect before authored delay`);
    await page.waitForTimeout(850);
    pixels[type] = difference(baseline, await capture(type));
    assert.ok(pixels[type] > 1000, `${type}: normal intensity visibly renders after authored delay`);
    await send({ sceneId: `reset-${type}` });
    assert.ok(difference(baseline, await capture()) < 1000, `${type}: neutral next scene clears effect`);
  }
  for (const type of ['shake', 'flash', 'flash-red']) {
    await send({ sceneId: `reduced-${type}`, reducedMotion: true, presentation: { effects: [effect(type)] } });
    await page.waitForTimeout(850);
    assert.ok(difference(baseline, await capture()) < 1000, `reduced motion suppresses ${type}`);
  }
  for (const type of ['crack', 'spotlight']) {
    await send({ sceneId: `reduced-${type}`, reducedMotion: true, presentation: { effects: [effect(type)] } });
    await page.waitForTimeout(1050);
    assert.ok(difference(baseline, await capture(`reduced-${type}`)) > 1000, `reduced motion keeps ${type} readable`);
  }
  const replay = { sceneId: 'replay', presentation: { effects: [{ type: 'flash-red', intensity: 'normal', trigger: 'scene-enter', delayMs: 0 }] } };
  await send(replay);
  await page.waitForTimeout(1000);
  await send({ ...replay, dialogue: { ...neutral.dialogue, text: '글 수정은 연출을 다시 시작하지 않습니다.' } });
  assert.ok(difference(baseline, await capture()) < 1000, 'same-scene text revision does not replay effect');
  await send({ ...replay, ended: true });
  await send(replay);
  await page.waitForTimeout(180);
  assert.ok(difference(baseline, await capture('replayed')) > 1000, 'ended→play on same scene restarts effect clock');
  const transition = { sceneId: 'transition-edit', presentation: { effects: [], transition: { type: 'perspective-blackout', durationMs: 900, mode: 'confirm', title: '다른 시점', actionLabel: '계속' } } };
  await send(transition);
  await send({ ...transition, dialogue: { ...neutral.dialogue, text: '전환 중 입력 수정' } });
  assert.ok(difference(baseline, await capture('transition-edit')) > 1000, 'same-scene revision preserves active confirm transition');
  await page.mouse.click(640, 475);
  await page.waitForFunction(value => window.presenterEvents.some(event => event.type === 'presentationDone' && event.revision === value), revision, { timeout: 10000 });
  await send({ ...transition, ended: true });
  await send(transition);
  assert.ok(difference(baseline, await capture('transition-replayed')) > 1000, 'same-scene replay restarts transition');
  assert.equal(await page.locator('iframe').count(), 1);
  console.log(JSON.stringify({ normalEffectChangedPixels: pixels, verified: ['authored-delay', 'neutral-reset', 'reduced-motion', 'same-scene-edit', 'same-scene-replay', 'transition-replay'] }, null, 2));
} finally {
  await browser.close();
}
