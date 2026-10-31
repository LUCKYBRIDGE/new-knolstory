import type { RuntimeEvent } from '@knolstory/runtime-contract';

/** What the stage loading screen shows before the runtime is ready (contract event loadProgress). */
export type LoadProgress = Readonly<{ stage: 'download'; ratio: number }> | Readonly<{ stage: 'start' }>;
type LoadProgressEvent = Extract<RuntimeEvent, { type: 'loadProgress' }>;

/** Never moves backwards: a late download share cannot undo the engine start step. */
export function mergeLoadProgress(previous: LoadProgress | null, event: LoadProgressEvent): LoadProgress {
  if (event.stage === 'start' || previous?.stage === 'start') return { stage: 'start' };
  return { stage: 'download', ratio: Math.max(previous?.stage === 'download' ? previous.ratio : 0, event.ratio) };
}

/** Real share of received bytes only. The engine start reports no amount, so it shows no percentage. */
export function loadProgressDisplay(progress: LoadProgress): Readonly<{ label: string; percent: number; valueText: string }> {
  if (progress.stage === 'start') return { label: '무대를 열고 있어요', percent: 100, valueText: '자료를 모두 받았어요. 무대를 열고 있어요.' };
  const percent = Math.min(99, Math.max(0, Math.floor(progress.ratio * 100)));
  return { label: '무대 자료를 받고 있어요', percent, valueText: `${percent}% 받았어요` };
}
