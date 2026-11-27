import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import type { RuntimeEvent, RuntimeScene } from '../../packages/runtime-contract/src';
import { beginSelectedBook, enterLibrary, openBuiltinEdition } from './library-entry';

type Edition = 'original' | 'knolstory';
type Cut = { id: string; text: string; next: string[] };
type Route = { cuts: Cut[]; choices: Map<string, string> };
type Rendered = Extract<RuntimeEvent, { type: 'sceneRendered' }>;
type NativeObservation = { scene?: RuntimeScene; rendered?: Rendered; finishedTransition?: number; events: RuntimeEvent[] };
type ObservedWindow = Window & { bakssiObservation?: NativeObservation };

function manuscript(edition: Edition) {
  const title = edition === 'original' ? '원작' : '놀스토리';
  const source = readFileSync(new URL(`../../docs/reference/bakssi/박씨전_${title}.md`, import.meta.url), 'utf8');
  const [summary, body] = source.split('## 장·컷 원고');
  const cuts: Cut[] = [];
  const labels = new Map<string, string>();
  for (const line of summary.split('\n')) {
    const [, cut, label, destination] = line.split('|').map(cell => cell.trim());
    if (/^[A-Z]\d{2}$/.test(cut) && /^[A-Z]\d{2}$/.test(destination)) labels.set(`${cut}/${destination}`, label);
  }
  for (const line of body.split('\n')) {
    const [, id, , text, , targets] = line.split('|').map(cell => cell.trim());
    if (/^[A-Z]\d{2}$/.test(id)) cuts.push({ id, text, next: targets ? targets.split(' / ').filter(target => target !== '끝') : [] });
  }
  if (edition === 'original') {
    for (const [index, cut] of cuts.entries()) {
      if (index < cuts.length - 1) cut.next = [cuts[index + 1].id];
    }
  }
  const byId = new Map(cuts.map(cut => [cut.id, cut]));
  function traverse(cut: Cut, path: Cut[], choices: Map<string, string>): Route[] {
    if (path.includes(cut)) throw Error(`Repeated manuscript cut ${cut.id}`);
    const through = [...path, cut];
    if (!cut.next.length) return [{ cuts: through, choices }];
    return cut.next.flatMap(destination => {
      const next = byId.get(destination);
      if (!next) throw Error(`Missing manuscript cut ${destination}`);
      if (cut.next.length === 1) return traverse(next, through, choices);
      const label = labels.get(`${cut.id}/${destination}`);
      if (!label) throw Error(`Missing manuscript choice label ${cut.id}/${destination}`);
      return traverse(next, through, new Map([...choices, [cut.id, label]]));
    });
  }
  const routes = traverse(cuts[0], [], new Map());
  if (routes.length !== (edition === 'original' ? 1 : 8)) throw Error(`Incomplete 박씨전 ${title} route corpus`);
  if (new Set(routes.flatMap(route => route.cuts)).size !== cuts.length) throw Error(`Unreachable 박씨전 ${title} manuscript cuts`);
  return routes;
}

async function observeNative(page: Page) {
  await page.addInitScript(() => {
    const state: NativeObservation = { events: [] };
    (window as ObservedWindow).bakssiObservation = state;
    if (window === window.top) sessionStorage.setItem('knolstory-fullscreen-offered-v1', '1');
    window.addEventListener('message', event => {
      if (event.origin !== location.origin || event.data?.protocol !== 1) return;
      if (window !== window.top) {
        if (event.source === window.parent && event.data.type === 'loadScene') state.scene = event.data.payload;
        return;
      }
      const iframe = document.querySelector<HTMLIFrameElement>('[data-testid="story-runtime-frame"]');
      if (!iframe || event.source !== iframe.contentWindow) return;
      const message = event.data as RuntimeEvent;
      if (message.type === 'sceneRendered') state.rendered = message;
      if (message.type === 'presentationDone') state.finishedTransition = message.revision;
      if (message.type === 'choiceSelected' || message.type === 'error') state.events.push(message);
    });
  });
}

async function renderedScene(page: Page, expectedSceneId?: string) {
  const handle = await page.waitForFunction(expected => {
    const frame = document.querySelector<HTMLIFrameElement>('[data-testid="story-runtime-frame"]');
    const scene = (frame?.contentWindow as ObservedWindow | undefined)?.bakssiObservation?.scene;
    const native = (window as ObservedWindow).bakssiObservation;
    const rendered = native?.rendered;
    const host = document.querySelector('[data-testid="story-runtime-status"]');
    if (!scene || !rendered || scene.revision !== rendered.revision || scene.sceneId !== rendered.sceneId
        || scene.revision !== Number(host?.getAttribute('data-rendered-revision'))
        || (expected && scene.sceneId !== expected)) return false;
    return { scene, rendered };
  }, expectedSceneId, { timeout: 90_000 });
  try {
    return await handle.jsonValue() as { scene: RuntimeScene; rendered: Rendered };
  } finally {
    await handle.dispose();
  }
}

async function finishTransition(page: Page, scene: RuntimeScene) {
  if (!scene.presentation?.transition || scene.transitionOnly) return;
  const handle = await page.waitForFunction(revision =>
    (window as ObservedWindow).bakssiObservation?.finishedTransition === revision, scene.revision, { timeout: 15_000 });
  await handle.dispose();
}

async function advanceNative(page: Page, previous: { scene: RuntimeScene; rendered: Rendered }) {
  await page.getByTestId('story-runtime-frame').contentFrame().locator('#canvas').press('Enter');
  const handle = await page.waitForFunction(({ revision, textPage }) => {
    const current = (window as ObservedWindow).bakssiObservation?.rendered;
    return !!current && (current.revision !== revision || (current.dialoguePage?.index ?? 0) !== textPage);
  }, { revision: previous.scene.revision, textPage: previous.rendered.dialoguePage?.index ?? 0 }, { timeout: 15_000 });
  await handle.dispose();
}

async function selectNative(page: Page, state: { scene: RuntimeScene; rendered: Rendered }, label: string) {
  const { scene, rendered } = state;
  const choices = scene.choices ?? [];
  expect(choices).toHaveLength(2);
  const index = choices.findIndex(choice => choice.text === label);
  expect(index, label).toBeGreaterThanOrEqual(0);
  const rect = rendered.choicesRect;
  if (!rect) throw Error('Ren’Py did not report the choice panel');
  const frame = page.getByTestId('story-runtime-frame');
  await frame.scrollIntoViewIfNeeded();
  const bounds = await frame.boundingBox();
  if (!bounds) throw Error('Ren’Py frame is missing');
  const scale = Math.min(bounds.width / scene.width, bounds.height / scene.height);
  // Each option is at least 96px high; with two choices, the first and last
  // buttons can both be reached even when a label wraps to a second line.
  const y = index === 0 ? rect.y + 24 + 92 + 48 : rect.y + rect.height - 24 - 48;
  await page.mouse.click(
    bounds.x + (bounds.width - scene.width * scale) / 2 + (rect.x + rect.width / 2) * scale,
    bounds.y + (bounds.height - scene.height * scale) / 2 + y * scale,
  );
  return choices[index].id;
}

test.describe('박씨전 제공 원고의 Ren’Py 전체 읽기', () => {
  test.describe.configure({ mode: 'parallel' });
  for (const edition of ['original', 'knolstory'] as const) {
    const projectId = edition === 'original' ? 'classic-bakssi-tale' : 'bakssi-knolstory';
    for (const [routeIndex, route] of manuscript(edition).entries()) {
      const title = `bakssi ${edition} path ${routeIndex + 1} to ${route.cuts.at(-1)!.id}`;
      test(title, async ({ page }, info) => {
        test.setTimeout(360_000);
        const portrait = edition === 'knolstory' && routeIndex === 7;
        await page.setViewportSize(portrait ? { width: 390, height: 844 } : { width: 1280, height: 800 });
        await observeNative(page);
        await page.route('**/api/**', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ success: false }) }));
        const errors: string[] = [];
        const selections: string[] = [];
        const visited: string[] = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto('/');
        await enterLibrary(page);
        await openBuiltinEdition(page, 'bakssi', edition);
        await beginSelectedBook(page);
        const audio = page.getByTestId('story-runtime-frame').contentFrame().getByRole('button', { name: '소리 켜고 시작 · Enter 또는 Space', exact: true });
        try {
          for (const cut of route.cuts) {
            const lineId = `bakssi-${cut.id.toLowerCase()}`;
            const id = `${projectId}/${lineId}`;
            let state = await renderedScene(page, id);
            if (await audio.count()) {
              await audio.press('Enter');
              await expect(page.getByTestId('story-runtime-status')).toHaveAttribute('data-audio-unlocked', 'true');
              state = await renderedScene(page, id);
            }
            await finishTransition(page, state.scene);
            expect(state.scene.mode).toBe('play');
            expect(state.scene.dialogue.text, cut.id).toBe(cut.text);
            expect(state.scene.width < state.scene.height).toBe(portrait);
            visited.push(cut.id);
            const label = route.choices.get(cut.id);
            if (state.scene.transitionOnly && state.scene.presentation?.transition?.mode === 'auto') {
              expect(label).toBeUndefined();
              continue;
            }
            for (let inputs = 0; ; inputs++) {
              const textContinues = (state.rendered.dialoguePage?.index ?? 0) < (state.rendered.dialoguePage?.count ?? 1) - 1;
              const effectsContinue = (state.scene.effectSteps?.current ?? 0) < (state.scene.effectSteps?.total ?? 0);
              if (!textContinues && !effectsContinue) break;
              expect(inputs, `bounded page and effect inputs in ${cut.id}`).toBeLessThan(40);
              await advanceNative(page, state);
              state = await renderedScene(page, id);
            }
            if (label) {
              if (selections.length === 0) await page.getByTestId('story-stage-viewport').screenshot({ path: info.outputPath('first-native-choice.png') });
              selections.push(await selectNative(page, state, label));
            } else {
              expect(state.scene.choices ?? []).toEqual([]);
              await advanceNative(page, state);
            }
          }
          await expect(page.getByTestId('playback-status')).toHaveText('이야기 끝');
          expect((await renderedScene(page)).scene.ended).toBe(true);
          await expect.poll(() => page.evaluate(() => {
            const state = JSON.parse(localStorage.getItem('knolstory-next-workspace-v1') ?? 'null');
            return state?.playback?.path;
          })).toEqual(visited.map(id => `bakssi-${id.toLowerCase()}`));
          const events = await page.evaluate(() => (window as ObservedWindow).bakssiObservation?.events ?? []);
          expect(events.filter(event => event.type === 'error')).toEqual([]);
          expect(events.flatMap(event => event.type === 'choiceSelected' ? [event.choiceId] : [])).toEqual(selections);
          expect(errors).toEqual([]);
          await page.getByTestId('story-stage-viewport').screenshot({ path: info.outputPath('ending.png') });
        } finally {
          await info.attach('native-reading-path', {
            body: JSON.stringify({ edition, projectId, portrait, visited, expectedCuts: route.cuts.length, selections, errors }, null, 2),
            contentType: 'application/json',
          });
        }
      });
    }
  }
});
