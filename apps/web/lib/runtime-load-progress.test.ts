import { describe, expect, it } from 'vitest';
import { loadProgressDisplay, mergeLoadProgress } from './runtime-load-progress';

const download = (ratio: number) => ({ protocol: 1, type: 'loadProgress', stage: 'download', ratio }) as const;
const start = { protocol: 1, type: 'loadProgress', stage: 'start' } as const;

describe('stage loading progress', () => {
  it('only moves forward and keeps the start step once reached', () => {
    let progress = mergeLoadProgress(null, download(0.4));
    expect(progress).toEqual({ stage: 'download', ratio: 0.4 });
    progress = mergeLoadProgress(progress, download(0.2));
    expect(progress).toEqual({ stage: 'download', ratio: 0.4 });
    progress = mergeLoadProgress(progress, start);
    expect(mergeLoadProgress(progress, download(0.9))).toEqual({ stage: 'start' });
  });

  it('shows the real received share, never 100% before the engine starts, and no number while it starts', () => {
    expect(loadProgressDisplay({ stage: 'download', ratio: 0 })).toEqual({ label: '무대 자료를 받고 있어요', percent: 0, valueText: '0% 받았어요' });
    expect(loadProgressDisplay({ stage: 'download', ratio: 0.426 }).percent).toBe(42);
    expect(loadProgressDisplay({ stage: 'download', ratio: 1 }).percent).toBe(99);
    expect(loadProgressDisplay({ stage: 'start' })).toEqual({ label: '무대를 열고 있어요', percent: 100, valueText: '자료를 모두 받았어요. 무대를 열고 있어요.' });
  });
});
