import { describe, expect, it } from 'vitest';
import { initialRuntimeStatus, runtimeStatusReducer } from './runtime-status';

describe('runtime status recovery', () => {
  it('keeps renderer details out of the user message and gives an editing exit', () => {
    const status = runtimeStatusReducer(initialRuntimeStatus, { protocol: 1, type: 'error', message: 'Traceback /private/assets/secret.ogg' });
    expect(status.message).not.toMatch(/Traceback|private|secret/);
    expect(status.message).toContain('편집');
    expect(status.message).toContain('다시 읽기');
    expect(runtimeStatusReducer(status, { type: 'waiting' })).toBe(status);
  });

  it('does not claim recovery merely because the renderer is connected', () => {
    const failed = runtimeStatusReducer(initialRuntimeStatus, { type: 'audioFailed' });
    expect(failed.message).toContain('음원');
    expect(failed.message).toContain('편집');
    const connected = runtimeStatusReducer(failed, { protocol: 1, type: 'ready', contractVersion: 1, runtimeVersion: '8.5.3' });
    expect(connected).toBe(failed);
    expect(runtimeStatusReducer(failed, { type: 'rendered' }).message).toBe('이야기 무대 연결됨');
  });

  it('provides an actionable wait message before and after connection', () => {
    const waiting = runtimeStatusReducer(initialRuntimeStatus, { type: 'waiting' });
    expect(waiting.message).toContain('편집');
    expect(waiting.message).toContain('다시 읽기');
    const connected = runtimeStatusReducer(initialRuntimeStatus, { protocol: 1, type: 'ready', contractVersion: 1, runtimeVersion: '8.5.3' });
    expect(runtimeStatusReducer(connected, { type: 'waiting' })).toEqual(waiting);
    expect(runtimeStatusReducer(waiting, { type: 'rendered' }).message).toBe('이야기 무대 연결됨');
  });
});
