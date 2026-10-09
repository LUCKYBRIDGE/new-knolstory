import {afterEach, describe, expect, it, vi} from 'vitest';
import {createBlankStoryProject, createPlayback} from '@knolstory/runtime-core';
import {scheduleWorkspaceAutosave} from './workspace-autosave';
import {readWorkspace, writeWorkspace} from './workspace-storage';

function browserHost() {
  const events = new EventTarget();
  return {
    setTimeout: (callback: () => void, delay: number) => Number(setTimeout(callback, delay)),
    clearTimeout: (timer: number) => clearTimeout(timer),
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
    leave: () => events.dispatchEvent(new Event('pagehide')),
  };
}

afterEach(() => vi.useRealTimers());
describe('workspace autosave at browser navigation', () => {
  it('preserves the visible introduction when reloading before the editing debounce expires', () => {
    vi.useFakeTimers();
    const host = browserHost();
    const project = createBlankStoryProject({id: 'saved-work', chapterId: 'chapter', lineId: 'cut'});
    let raw = '';
    const save = () => writeWorkspace({setItem: (_key, value) => {raw = value;}}, project, {}, {}, {
      storyId: 'new:saved-work', lineId: 'cut', mode: 'edit', playback: createPlayback(project),
      editorView: 'cut', activeTool: 'text', writerChapterId: null, previewProfile: 'auto', view: 'home',
    });
    const cancel = scheduleWorkspaceAutosave(host, save);
    host.leave();
    expect(readWorkspace(raw).view).toBe('home');
    expect(readWorkspace(raw).project).toEqual(project);
    cancel();
  });

  it('coalesces editing writes and removes a replaced snapshot on cleanup', () => {
    vi.useFakeTimers();
    const host = browserHost();
    const stale = vi.fn();
    scheduleWorkspaceAutosave(host, stale)();
    const current = vi.fn();
    const cancel = scheduleWorkspaceAutosave(host, current);
    vi.advanceTimersByTime(99);
    expect(current).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(current).toHaveBeenCalledTimes(1);
    cancel();
    host.leave();
    expect(stale).not.toHaveBeenCalled();
    expect(current).toHaveBeenCalledTimes(1);
  });
});
