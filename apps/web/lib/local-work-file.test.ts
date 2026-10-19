import {describe, expect, it, vi} from 'vitest';
import {createLocalWorkFileSaver, createLocalWorkFileSession, localWorkFileErrorMessage, type LocalWorkFileHandle} from './local-work-file';

function file(name = 'work.knolstory', initial = '') {
  let text = initial;
  const stream = {write: vi.fn(async (value: string) => {text = value;}), close: vi.fn(async () => {}), abort: vi.fn(async () => {})};
  const handle: LocalWorkFileHandle = {name, getFile: vi.fn(async () => ({text: async () => text})), createWritable: vi.fn(async () => stream)};
  return {handle, stream, edit: (value: string) => {text = value;}};
}
const input = (workKey = 'a', text = 'manuscript') => ({workKey, name: 'work', extension: '.knolstory' as const, serialize: async () => text});

describe('local work file saving', () => {
  it('opens the picker synchronously and reports saved only after close and readback', async () => {
    const selected = file(); const pick = vi.fn(async () => selected.handle);
    const saver = createLocalWorkFileSaver({pick, download: vi.fn()});
    const pending = saver.save(input());
    expect(pick).toHaveBeenCalledOnce();
    expect(selected.stream.close).not.toHaveBeenCalled();
    expect(await pending).toEqual({kind: 'saved', name: 'work.knolstory'});
    expect(selected.stream.close).toHaveBeenCalledOnce();
    expect(selected.handle.getFile).toHaveBeenCalledTimes(3);
  });
  it('reuses only the same work handle and saveAs always opens a picker', async () => {
    const a = file('a.knolstory'); const b = file('b.knolstory'); const c = file('c.knolstory');
    const pick = vi.fn().mockResolvedValueOnce(a.handle).mockResolvedValueOnce(b.handle).mockResolvedValueOnce(c.handle);
    const saver = createLocalWorkFileSaver({pick, download: vi.fn()});
    await saver.save(input()); await saver.save(input('a', 'updated')); await saver.save(input('b'));
    expect(pick).toHaveBeenCalledTimes(2);
    await saver.save({...input(), saveAs: true});
    expect(pick).toHaveBeenCalledTimes(3);
    expect(a.stream.write).toHaveBeenLastCalledWith('updated');
  });
  it('protects external edits and permits an explicit saveAs afterward', async () => {
    const selected = file(); const saver = createLocalWorkFileSaver({pick: async () => selected.handle, download: vi.fn()});
    await saver.save(input()); selected.edit('external');
    await expect(saver.save(input('a', 'new'))).rejects.toThrow(/외부/);
    expect(selected.stream.write).toHaveBeenCalledTimes(1);
    expect((await saver.save({...input(), saveAs: true})).kind).toBe('saved');
  });
  it('protects edits occurring during serialization even on the first save', async () => {
    const selected = file(); const saver = createLocalWorkFileSaver({pick: async () => selected.handle, download: vi.fn()});
    await expect(saver.save({...input(), serialize: async () => {selected.edit('external'); return 'mine';}})).rejects.toThrow(/외부/);
    expect(selected.handle.createWritable).not.toHaveBeenCalled();
  });
  it('cancels a picker without serializing, and propagates permission failure', async () => {
    const serialize = vi.fn(async () => 'text'); const pick = vi.fn().mockRejectedValueOnce(new DOMException('cancel', 'AbortError')).mockRejectedValueOnce(new Error('permission'));
    const saver = createLocalWorkFileSaver({pick, download: vi.fn()});
    expect((await saver.save({...input(), serialize})).kind).toBe('cancelled');
    expect(serialize).not.toHaveBeenCalled();
    await expect(saver.save(input())).rejects.toThrow('permission');
  });
  it('uses a truthful download result and sanitizes filenames', async () => {
    const download = vi.fn(); const saver = createLocalWorkFileSaver({download});
    expect(await saver.save({...input(), name: '../a\\b:story.knolstory'})).toEqual({kind: 'download-requested', name: '.._a_b_story.knolstory'});
    expect(download).toHaveBeenCalledWith('manuscript', '.._a_b_story.knolstory');
    expect((await saver.save({...input(), name: ' ', extension: '.shortstory'})).name).toBe('작품.shortstory');
  });
  it('rejects overlapping saves then releases the lock on serialization failure', async () => {
    let reject!: (error: Error) => void;
    const saver = createLocalWorkFileSaver({download: vi.fn()});
    const pending = saver.save({...input(), serialize: () => new Promise<string>((_, fail) => {reject = fail;})});
    await expect(saver.save(input())).rejects.toThrow(/저장 중/);
    reject(new Error('serialize')); await expect(pending).rejects.toThrow('serialize');
    expect((await saver.save(input())).kind).toBe('download-requested');
  });
  it('stops before writing or downloading when the current work changes', async () => {
    const selected = file(); const download = vi.fn();
    for (const pick of [undefined, async () => selected.handle]) {
      const saver = createLocalWorkFileSaver({pick, download});
      expect((await saver.save({...input(), isCurrent: () => false})).kind).toBe('cancelled');
    }
    expect(selected.handle.createWritable).not.toHaveBeenCalled(); expect(download).not.toHaveBeenCalled();
  });
  it('aborts a failed stream and rejects a mismatching readback without binding it', async () => {
    const selected = file(); selected.stream.write.mockRejectedValueOnce(new Error('disk full'));
    const pick = vi.fn(async () => selected.handle); const saver = createLocalWorkFileSaver({pick, download: vi.fn()});
    await expect(saver.save(input())).rejects.toThrow('disk full'); expect(selected.stream.abort).toHaveBeenCalledOnce();
    selected.stream.close.mockImplementationOnce(async () => {selected.edit('corrupt');});
    await expect(saver.save(input())).rejects.toThrow(/확인/);
    await saver.save(input()); expect(pick).toHaveBeenCalledTimes(3);
  });
  it('rejects an invalid work identity and runtime extension', async () => {
    const saver = createLocalWorkFileSaver({download: vi.fn()});
    await expect(saver.save({...input(), workKey: ''})).rejects.toThrow(/작품/);
    await expect(saver.save({...input(), extension: '.txt' as '.knolstory'})).rejects.toThrow(/형식/);
  });
  it('does not report success when close fails, retaining that error when abort also fails', async () => {
    const selected = file();
    selected.stream.close.mockRejectedValueOnce(new Error('close failure'));
    selected.stream.abort.mockRejectedValueOnce(new Error('abort failure'));
    const saver = createLocalWorkFileSaver({pick: async () => selected.handle, download: vi.fn()});
    await expect(saver.save(input())).rejects.toThrow('close failure');
    expect(selected.stream.abort).toHaveBeenCalledOnce();
  });
  it('cancels after the external-change check if navigation happened while reading', async () => {
    const selected = file();
    const isCurrent = vi.fn().mockReturnValueOnce(true).mockReturnValueOnce(false);
    const saver = createLocalWorkFileSaver({pick: async () => selected.handle, download: vi.fn()});
    expect((await saver.save({...input(), isCurrent})).kind).toBe('cancelled');
    expect(selected.handle.createWritable).not.toHaveBeenCalled();
  });
  it('aborts without writing when navigation happens while opening the stream, then retries with a new picker', async () => {
    const selected = file(); const next = file('next.knolstory');
    let release!: (stream: typeof selected.stream) => void;
    vi.mocked(selected.handle.createWritable).mockImplementationOnce(() => new Promise(resolve => {release = resolve;}));
    const pick = vi.fn().mockResolvedValueOnce(selected.handle).mockResolvedValueOnce(next.handle);
    const saver = createLocalWorkFileSaver({pick, download: vi.fn()});
    let current = true;
    const pending = saver.save({...input(), isCurrent: () => current});
    await vi.waitFor(() => expect(selected.handle.createWritable).toHaveBeenCalledOnce());
    current = false;
    release(selected.stream);
    expect(await pending).toEqual({kind: 'cancelled', name: 'work.knolstory'});
    expect(selected.stream.abort).toHaveBeenCalledOnce();
    expect(selected.stream.write).not.toHaveBeenCalled();
    expect(selected.stream.close).not.toHaveBeenCalled();
    expect((await saver.save(input())).kind).toBe('saved');
    expect(pick).toHaveBeenCalledTimes(2);
    expect(next.stream.write).toHaveBeenCalledWith('manuscript');
  });
  it('reports abort failure instead of cancellation and releases the save lock', async () => {
    const selected = file();
    selected.stream.abort.mockRejectedValueOnce(new Error('abort failed'));
    const pick = vi.fn(async () => selected.handle);
    const saver = createLocalWorkFileSaver({pick, download: vi.fn()});
    const isCurrent = vi.fn().mockReturnValueOnce(true).mockReturnValueOnce(true).mockReturnValueOnce(false);
    await expect(saver.save({...input(), isCurrent})).rejects.toThrow('abort failed');
    expect(selected.stream.abort).toHaveBeenCalledOnce();
    expect(selected.stream.write).not.toHaveBeenCalled();
    expect(selected.stream.close).not.toHaveBeenCalled();
    expect((await saver.save(input())).kind).toBe('saved');
    expect(pick).toHaveBeenCalledTimes(2);
  });
  it('retains a previously verified file binding after cancelling a later stream opening', async () => {
    const selected = file(); const pick = vi.fn(async () => selected.handle);
    const saver = createLocalWorkFileSaver({pick, download: vi.fn()});
    await saver.save(input());
    let current = true;
    vi.mocked(selected.handle.createWritable).mockImplementationOnce(async () => {current = false; return selected.stream;});
    expect((await saver.save({...input('a', 'cancelled draft'), isCurrent: () => current})).kind).toBe('cancelled');
    expect(selected.stream.write).toHaveBeenCalledTimes(1);
    expect(selected.stream.abort).toHaveBeenCalledOnce();
    expect((await saver.save(input('a', 'next draft'))).kind).toBe('saved');
    expect(pick).toHaveBeenCalledOnce();
    expect(selected.stream.write).toHaveBeenLastCalledWith('next draft');
  });
  it('finishes an already-started write even if navigation happens before it resolves', async () => {
    const selected = file();
    let current = true;
    selected.stream.write.mockImplementationOnce(async value => {selected.edit(value); current = false;});
    const saver = createLocalWorkFileSaver({pick: async () => selected.handle, download: vi.fn()});
    expect((await saver.save({...input(), isCurrent: () => current})).kind).toBe('saved');
    expect(selected.stream.close).toHaveBeenCalledOnce();
    expect(selected.stream.abort).not.toHaveBeenCalled();
  });
  it('keeps handles separate for different formats with the same work key', async () => {
    const a = file('a.knolstory'); const b = file('a.shortstory');
    const pick = vi.fn().mockResolvedValueOnce(a.handle).mockResolvedValueOnce(b.handle);
    const saver = createLocalWorkFileSaver({pick, download: vi.fn()});
    await saver.save(input());
    await saver.save({...input(), extension: '.shortstory'});
    expect(pick).toHaveBeenCalledTimes(2);
    expect(a.stream.write).toHaveBeenCalledTimes(1);
  });
  it('rejects oversized UTF-8 content before writing or requesting a download', async () => {
    const selected = file(); const download = vi.fn();
    for (const pick of [undefined, async () => selected.handle]) {
      const saver = createLocalWorkFileSaver({pick, download});
      // Korean characters exercise the byte boundary rather than JS string length.
      await expect(saver.save({...input(), serialize: async () => '가'.repeat(8_333_334)})).rejects.toThrow(/25/);
    }
    expect(selected.handle.createWritable).not.toHaveBeenCalled(); expect(download).not.toHaveBeenCalled();
  });
  it('accepts a file exactly at the 25 MB byte limit', async () => {
    const download = vi.fn(); const saver = createLocalWorkFileSaver({download});
    expect((await saver.save({...input(), serialize: async () => 'a'.repeat(25_000_000)})).kind).toBe('download-requested');
    expect(download).toHaveBeenCalledOnce();
  });
});


describe('local file failure guidance', () => {
  it('keeps the verified file association after denied save-as and failed writes', async () => {
    const selected = file();
    const pick = vi.fn().mockResolvedValueOnce(selected.handle).mockRejectedValueOnce(new DOMException('denied', 'NotAllowedError'));
    const saver = createLocalWorkFileSaver({pick, download: vi.fn()});
    await saver.save(input());
    await expect(saver.save({...input('a', 'draft'), saveAs: true})).rejects.toMatchObject({name: 'NotAllowedError'});
    selected.stream.write.mockRejectedValueOnce(new Error('EIO'));
    await expect(saver.save(input('a', 'draft'))).rejects.toThrow('EIO');
    expect((await saver.save(input('a', 'draft'))).kind).toBe('saved');
    expect(pick).toHaveBeenCalledTimes(2);
    expect(selected.stream.write).toHaveBeenLastCalledWith('draft');
  });
  it('gives permission advice without exposing native paths or English details', () => {
    const message = localWorkFileErrorMessage(new DOMException('Permission denied /private/manuscript', 'NotAllowedError'));
    expect(message).toContain('파일을 사용할 권한');
    expect(message).toContain('다른 파일로 저장');
    expect(message).not.toMatch(/Permission|private|manuscript/);
    expect(localWorkFileErrorMessage(new DOMException('blocked', 'SecurityError'))).toBe(message);
  });
  it('gives storage and generic retry advice without treating stream abort as picker cancellation', () => {
    expect(localWorkFileErrorMessage(new DOMException('disk quota /private', 'QuotaExceededError'))).toContain('저장 공간');
    for (const issue of [new Error('disk full /private'), new DOMException('stream failed', 'AbortError'), 'secret', null]) {
      expect(localWorkFileErrorMessage(issue)).toContain('다시 시도');
      expect(localWorkFileErrorMessage(issue)).not.toMatch(/disk|private|stream|secret|취소했/);
    }
  });
  it('preserves trusted product validation and current file vocabulary', async () => {
    const selected = file(); const saver = createLocalWorkFileSaver({pick: async () => selected.handle, download: vi.fn()});
    await saver.save(input()); selected.edit('external');
    try {await saver.save(input()); throw new Error('expected conflict');}
    catch (issue) {expect(localWorkFileErrorMessage(issue)).toContain('외부에서 변경');}
    try {await saver.save({...input(), serialize: async () => 'a'.repeat(25_000_001)}); throw new Error('expected limit');}
    catch (issue) {expect(localWorkFileErrorMessage(issue)).toContain('작품 파일은 25 MB');}
  });
});


it('creates one file saver per session and retains it when settings remount', () => {
  const session = createLocalWorkFileSession(), other = createLocalWorkFileSession();
  const first = createLocalWorkFileSaver({download: vi.fn()}), second = createLocalWorkFileSaver({download: vi.fn()});
  const factory = vi.fn(() => first);
  expect(session.getOrCreate(factory)).toBe(first);
  expect(session.getOrCreate(() => second)).toBe(first);
  expect(factory).toHaveBeenCalledOnce();
  expect(other.getOrCreate(() => second)).toBe(second);
});
