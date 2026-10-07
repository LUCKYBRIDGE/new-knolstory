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
});
