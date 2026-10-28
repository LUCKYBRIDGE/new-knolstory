import { expect, it } from 'vitest';
import { isRuntimeEvent, isRuntimeScene } from '../src/index';

const scene = { contractVersion: 1, sceneId: 'reading', revision: 3, width: 1280, height: 720,
  actors: [], dialogue: { speaker: '', text: '이야기' } };
it('accepts optional reader navigation preferences without changing authored content', () => {
  expect(isRuntimeScene(scene)).toBe(true);
  for (const readerTapMode of ['next', 'halves']) {
    expect(isRuntimeScene({ ...scene, readerTapMode, readerCanGoBack: true })).toBe(true);
  }
  expect(isRuntimeScene({ ...scene, readerCanGoBack: false })).toBe(true);
});
it.each(['sideways', null, 1, {}])('rejects malformed tap mode %j', (readerTapMode) => {
  expect(isRuntimeScene({ ...scene, readerTapMode })).toBe(false);
});
it.each(['true', null, 1])('rejects malformed back availability %j', (readerCanGoBack) => {
  expect(isRuntimeScene({ ...scene, readerCanGoBack })).toBe(false);
});
it('validates native previous-cut requests with the same scene and revision boundary', () => {
  const event = { protocol: 1, type: 'backRequested', sceneId: 'reading', revision: 3 };
  expect(isRuntimeEvent(event)).toBe(true);
  for (const invalid of [{ ...event, revision: -1 }, { ...event, revision: 1.5 },
    { ...event, sceneId: '' }, { ...event, protocol: 2 }]) expect(isRuntimeEvent(invalid)).toBe(false);
});
