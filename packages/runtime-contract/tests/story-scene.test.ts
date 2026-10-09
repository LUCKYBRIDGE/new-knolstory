import { describe, expect, it } from 'vitest';
import { isRuntimeEvent, isRuntimeScene } from '../src/index';

const scene = {
  contractVersion: 1, sceneId: 'story/cut', revision: 1, width: 1280, height: 720,
  actors: [{ id: 'L1', name: '선녀', imagePath: 'assets/legacy-18da4fc/fairy.webp',
    rect: { x: -20, y: 30, width: 280, height: 500 }, opacity: 0.8, depth: 2, flipX: true }],
  background: { imagePath: 'assets/legacy-18da4fc/forest.webp' },
  dialogue: { speaker: '선녀', text: '{이것도 원문입니다}' }, mode: 'play', reducedMotion: true,
  choices: [{ id: 'choice-a', text: '도움을 청한다' }, { id: 'choice-b', text: '돌아간다' }],
  presentation: { effects: [{ type: 'shake', intensity: 'normal', trigger: 'after-delay', delayMs: 100 }],
    look: { type: 'flashback', intensity: 'soft' }, transition: { type: 'dissolve', mode: 'auto', durationMs: 700 } },
};
describe('story presentation boundary', () => {
  it('accepts canonical image actors with clipped transparent margins and resolved presentation', () => {
    expect(isRuntimeScene(scene)).toBe(true);
    expect(isRuntimeScene({ ...scene, presentation: { transition: { type: 'perspective-blackout', mode: 'confirm', durationMs: 900 } } })).toBe(true);
  });
  it.each([
    { ...scene, background: { imagePath: '../secrets' } },
    { ...scene, actors: [{ ...scene.actors[0], imagePath: 'https://example.com/a.webp' }] },
    { ...scene, actors: [{ ...scene.actors[0], opacity: 2 }] },
    { ...scene, presentation: { effects: [{ type: 'invented' }] } },
    { ...scene, presentation: { transition: { type: 'fade-black', durationMs: Infinity } } },
    { ...scene, choices: [{ id: 'duplicate', text: 'a' }, { id: 'duplicate', text: 'b' }] },
    { ...scene, reducedMotion: 'false' },
  ])('rejects invalid renderer inputs', value => expect(isRuntimeScene(value)).toBe(false));
  it('checks cut revision on playback events', () => {
    expect(isRuntimeEvent({ protocol: 1, type: 'choiceSelected', sceneId: 'a', revision: 3, choiceId: 'b' })).toBe(true);
    expect(isRuntimeEvent({ protocol: 1, type: 'advanceRequested', sceneId: 'a', revision: 3 })).toBe(true);
    expect(isRuntimeEvent({ protocol: 1, type: 'presentationDone', sceneId: 'a', revision: 3 })).toBe(true);
    expect(isRuntimeEvent({ protocol: 1, type: 'choiceSelected', sceneId: 'a', revision: 3 })).toBe(false);
  });
});
