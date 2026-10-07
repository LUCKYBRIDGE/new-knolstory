import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';
import { isRuntimeScene } from '../../packages/runtime-contract/src/index';

const scene = { contractVersion: 1, sceneId: 'probe', revision: 1, width: 1280, height: 720,
  actors: [{ id: 'heungbu', name: '흥부', rect: { x: 20, y: 20, width: 100, height: 200 } }],
  dialogue: { speaker: '흥부', text: '안녕하세요' } };
function bridge() {
  const listeners: Record<string, (event: unknown) => void> = {};
  const events: unknown[] = [];
  const parent = { postMessage: (event: unknown) => events.push(event) };
  const window: Record<string, unknown> = { KnolRuntimeContract: { isRuntimeScene } };
  runInNewContext(readFileSync('spikes/renpy-web/bridge.js', 'utf8'), {
    window, parent, location: { origin: 'https://story.knolquiz.com' }, structuredClone,
    addEventListener: (name: string, fn: (event: unknown) => void) => { listeners[name] = fn; },
    document: { getElementById: () => ({ getBoundingClientRect: () => ({ x: 0, y: 0, width: 800, height: 600 }) }) },
  });
  const api = window.knolBridge as { drain(): string; emit(event: unknown): void };
  const send = (revision = 1, seq = revision, payload: unknown = { ...scene, revision }, overrides = {}) => listeners.message({
    origin: 'https://story.knolquiz.com', source: parent,
    data: { protocol: 1, type: 'loadScene', seq, revision, payload }, ...overrides,
  });
  return { api, events, send };
}
describe('actual runtime iframe bridge', () => {
  it('accepts complete resolved scene and drains only once', () => {
    const { api, send } = bridge(); send(); expect(JSON.parse(api.drain())[0].payload).toEqual(scene); expect(api.drain()).toBe('[]');
  });
  it('accepts portrait runtime dimensions without forcing a desktop canvas', () => {
    const {api,send}=bridge(); send(1,1,{...scene,width:720,height:1600});
    expect(JSON.parse(api.drain())[0].payload.height).toBe(1600);
  });
  it('rejects messages from another origin or source', () => {
    const { api, send } = bridge(); send(1, 1, scene, { origin: 'https://attacker.invalid' }); send(1, 1, scene, { source: {} }); expect(api.drain()).toBe('[]');
  });
  it('coalesces bursts and rejects stale or duplicate revisions', () => {
    const { api, send } = bridge(); send(1); send(2); send(1, 3); send(3, 1); expect(JSON.parse(api.drain()).map((c: { revision: number }) => c.revision)).toEqual([2]);
  });
  it('uses canonical contract validation and reports malformed actors', () => {
    const { api, events, send } = bridge(); send(1, 1, { ...scene, actors: [{ ...scene.actors[0], rect: { x: -1, y: 20, width: 100, height: 200 } }] });
    expect(api.drain()).toBe('[]'); expect(events).toEqual([expect.objectContaining({ type: 'error', code: 'INVALID_SCENE' })]);
  });
  it('passes resolved images, presentation and play choices without receiving a StoryDocument', () => {
    const { api, send } = bridge();
    const playable = { ...scene, mode: 'play', reducedMotion: true,
      background: { imagePath: 'assets/legacy-18da4fc/BG04-cottage-day.webp' },
      actors: [{ ...scene.actors[0], imagePath: 'assets/legacy-18da4fc/heungbu.character.heungbu-swallow-care.webp', opacity: .7, flipX: true, spectral: true, emphasis: 'dim', depth: 1 }],
      choices: [{ id: 'branch-a', text: '도와준다' }],
      presentation: { effects: [{ type: 'crack', intensity: 'strong', trigger: 'after-delay', delayMs: 80 }], look: { type: 'flashback', intensity: 'normal' } } };
    send(1, 1, playable);
    expect(JSON.parse(api.drain())[0].payload).toEqual(playable);
  });
  it('rejects traversal and host URLs in native image paths', () => {
    for (const imagePath of ['../secret', 'https://example.com/image.webp', '/assets/image.webp']) {
      const { api, events, send } = bridge();
      send(1, 1, { ...scene, background: { imagePath } });
      expect(api.drain()).toBe('[]');
      expect(events).toEqual([expect.objectContaining({ code: 'INVALID_SCENE' })]);
    }
  });
  it('uses engine transform instead of assuming a centered canvas viewport', () => {
    const { api, events } = bridge(); api.emit({ protocol: 1, type: 'sceneRendered', engineViewport: { x: 40, y: 0, width: 720, height: 450, physicalWidth: 800, physicalHeight: 600 } });
    expect(events).toEqual([expect.objectContaining({ rendererRect: { x: 40, y: 0, width: 720, height: 450 } })]);
  });
  it('reports actual fitted renderer rect including letterbox offset', () => {
    const { api, events } = bridge(); api.emit({ protocol: 1, type: 'ready' }); expect(events).toEqual([expect.objectContaining({ rendererRect: { x: 0, y: 75, width: 800, height: 450 } })]);
  });
});
