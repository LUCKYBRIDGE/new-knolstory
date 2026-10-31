import { describe, expect, it } from 'vitest';
import { parseRuntimeEvent } from './runtime-events';
describe('runtime event boundary', () => {
  it('accepts only compatible ready events', () => {
    expect(parseRuntimeEvent({ protocol: 1, type: 'ready', contractVersion: 1, runtimeVersion: '8.5.3' })?.type).toBe('ready');
    expect(parseRuntimeEvent({ protocol: 1, type: 'ready', contractVersion: 2, runtimeVersion: 'x' })).toBeNull();
  });
  it('rejects malformed renderer rectangles and revisions', () => {
    expect(parseRuntimeEvent({ protocol: 1, type: 'sceneRendered', revision: -1 })).toBeNull();
    expect(parseRuntimeEvent(null)).toBeNull();
    expect(parseRuntimeEvent({ protocol: 2, type: 'ready' })).toBeNull();
    expect(parseRuntimeEvent({ protocol: 1, type: 'unknown' })).toBeNull();
  });
  it('accepts finite reported renderer bounds and complete rendered events', () => {
    const rect = { x: 0, y: 10, width: 1280, height: 720 };
    expect(parseRuntimeEvent({ protocol: 1, type: 'viewportChanged', rendererRect: rect })?.type).toBe('viewportChanged');
    expect(parseRuntimeEvent({ protocol: 1, type: 'viewportChanged', rendererRect: { ...rect, width: Infinity } })).toBeNull();
    expect(parseRuntimeEvent({ protocol: 1, type: 'sceneRendered', revision: 3, sceneId: 'x', renderMs: 10, rendererRect: rect, textboxRect: rect })?.type).toBe('sceneRendered');
    expect(parseRuntimeEvent({ protocol: 1, type: 'error', message: 'failed' })?.type).toBe('error');
    expect(parseRuntimeEvent({ protocol: 1, type: 'error' })).toBeNull();
  });
  it('accepts only real download shares and the engine start step as load progress', () => {
    for (const ratio of [0, 0.42, 1]) expect(parseRuntimeEvent({ protocol: 1, type: 'loadProgress', stage: 'download', ratio })?.type).toBe('loadProgress');
    expect(parseRuntimeEvent({ protocol: 1, type: 'loadProgress', stage: 'start' })?.type).toBe('loadProgress');
    for (const event of [{ stage: 'download' }, { stage: 'download', ratio: 1.01 }, { stage: 'download', ratio: -0.1 }, { stage: 'download', ratio: NaN },
      { stage: 'download', ratio: '0.5' }, { stage: 'start', ratio: 1 }, { stage: 'finish', ratio: 1 }])
      expect(parseRuntimeEvent({ protocol: 1, type: 'loadProgress', ...event })).toBeNull();
  });
  it('preserves page changes reported for the same scene revision', () => {
    const rect = { x: 0, y: 10, width: 390, height: 330 };
    const report = { protocol: 1, type: 'sceneRendered', revision: 3, sceneId: 'x', renderMs: 10, rendererRect: rect, textboxRect: rect };
    for (const index of [0, 1, 2, 1]) {
      const event = parseRuntimeEvent({ ...report, dialoguePage: { index, count: 3 } });
      expect(event?.type === 'sceneRendered' && event.dialoguePage).toEqual({ index, count: 3 });
    }
    expect(parseRuntimeEvent({ ...report, dialoguePage: { index: 3, count: 3 } })).toBeNull();
    const event = parseRuntimeEvent({ ...report, dialoguePage: { index: 1, count: 3, offset: 42 } });
    expect(event?.type === 'sceneRendered' && event.dialoguePage?.offset).toBe(42);
    for (const offset of [-1, 1.5, '42', Number.MAX_SAFE_INTEGER + 1]) expect(parseRuntimeEvent({ ...report, dialoguePage: { index: 1, count: 3, offset } })).toBeNull();
  });
});
