import { describe, expect, it } from 'vitest';
import { isRuntimeEvent, isRuntimeScene } from '../src/index';

const scene = {
  contractVersion: 1, sceneId: 'probe', revision: 1, width: 1280, height: 720,
  actors: [{ id: 'actor', name: '흥부', rect: { x: 100, y: 100, width: 200, height: 300 } }],
  dialogue: { speaker: '흥부', text: '안녕!' },
};

describe('spike scene boundary', () => {
  it('accepts the explicit versioned probe contract', () => expect(isRuntimeScene(scene)).toBe(true));
  it.each([null, {}, { ...scene, contractVersion: 2 }, { ...scene, revision: -1 }, { ...scene, width: NaN },
    { ...scene, actors: [{ ...scene.actors[0], rect: { x: 1200, y: 0, width: 200, height: 100 } }] },
    { ...scene, actors: [scene.actors[0], scene.actors[0]] },
    { ...scene, dialogue: { speaker: '흥부', text: 4 } },
  ])('rejects invalid scene payload', (value) => expect(isRuntimeScene(value)).toBe(false));

  it('checks runtime events before they reach editing state', () => {
    expect(isRuntimeEvent({ protocol: 1, type: 'ready', runtimeVersion: '8.5.3', contractVersion: 1 })).toBe(true);
    expect(isRuntimeEvent({ protocol: 1, type: 'sceneRendered', sceneId: 'probe', revision: 2, renderMs: 20,
      textboxRect: { x: 0, y: 530, width: 1280, height: 190 }, rendererRect: { x: 0, y: 0, width: 640, height: 360 } })).toBe(true);
    expect(isRuntimeEvent({ protocol: 1, type: 'sceneRendered', revision: -1, renderMs: NaN })).toBe(false);
    expect(isRuntimeEvent({ protocol: 2, type: 'ready', runtimeVersion: '8.5.3', contractVersion: 1 })).toBe(false);
    expect(isRuntimeEvent({ protocol: 1, type: 'surprise' })).toBe(false);
  });
});
