import { describe, expect, it } from 'vitest';
import { createBlankStoryProject, insertStoryCut } from '@knolstory/runtime-core';
import { createStoryDocument } from '@knolstory/story-domain';
import { WORKSPACE_CHECKS_KEY, readWorkspaceChecks, workFingerprint, writeWorkspaceChecks } from './workspace-checks';
import { readWorkspace } from './workspace-storage';

const work = (id = 'a') => insertStoryCut(createBlankStoryProject({ id, chapterId: `${id}-chapter`, lineId: `${id}-first` }), `${id}-first`, `${id}-second`);
const doc = (project = work(), savedAt = '2026-10-31T00:00:00.000Z') => createStoryDocument({ project, savedAt, appVersion: 'test' });
/** Parses, but its scene check fails: the background is not in the catalog. */
const unchecked = () => { const p = work('bad'); return { ...p, lines: p.lines.map(line => ({ ...line, backgroundId: 'not-a-real-background' })) }; };
const raw = (current = work(), works: Record<string, unknown> = {}) => JSON.stringify({ storyId: `new:${current.id}`, lineId: current.lines[0].id, mode: 'edit', view: 'library', document: doc(current), works: { [`new:${current.id}`]: doc(current, '2026-10-31T00:00:01.000Z'), ...works } });
function memory(initial: Record<string, string> = {}) {
  const items = new Map(Object.entries(initial));
  return { getItem: (key: string) => items.get(key) ?? null, setItem: (key: string, value: string) => { items.set(key, value); }, items };
}

describe('remembered startup checks', () => {
  it('fingerprints the checked content, not the save time', () => {
    const p = work();
    expect(workFingerprint(doc(p))).toMatch(/^[0-9a-f]{16}$/);
    expect(workFingerprint(doc(p, '2027-01-01T00:00:00.000Z'))).toBe(workFingerprint(doc(p)));
    expect(workFingerprint({ ...doc(p), schemaVersion: 7 })).not.toBe(workFingerprint(doc(p)));
    expect(workFingerprint(doc({ ...p, title: '바뀐 제목' }))).not.toBe(workFingerprint(doc(p)));
    expect(workFingerprint(null)).toBeUndefined();
    expect(workFingerprint([])).toBeUndefined();
  });

  it('keeps checks only for the same build and ignores anything malformed', () => {
    const storage = memory();
    writeWorkspaceChecks(storage, 'build-1', ['0123456789abcdef', '0123456789abcdef', 'not-a-fingerprint']);
    expect(JSON.parse(storage.items.get(WORKSPACE_CHECKS_KEY)!)).toEqual({ version: 1, build: 'build-1', fingerprints: ['0123456789abcdef'] });
    expect([...readWorkspaceChecks(storage, 'build-1')]).toEqual(['0123456789abcdef']);
    expect(readWorkspaceChecks(storage, 'build-2').size).toBe(0);
    expect(readWorkspaceChecks(storage, undefined).size).toBe(0);
    for (const value of ['{', '[]', '{"version":2,"build":"build-1","fingerprints":[]}', '{"version":1,"build":"build-1","fingerprints":["XYZ"]}',
      JSON.stringify({ version: 1, build: 'build-1', fingerprints: Array.from({ length: 201 }, (_, i) => i.toString(16).padStart(16, '0')) })])
      expect(readWorkspaceChecks(memory({ [WORKSPACE_CHECKS_KEY]: value }), 'build-1').size).toBe(0);
  });

  it('never writes without a build and never throws when the browser refuses to store', () => {
    const storage = memory();
    writeWorkspaceChecks(storage, undefined, ['0123456789abcdef']);
    expect(storage.items.size).toBe(0);
    expect(() => writeWorkspaceChecks({ setItem: () => { throw new DOMException('full', 'QuotaExceededError'); } }, 'build-1', ['0123456789abcdef'])).not.toThrow();
    expect(readWorkspaceChecks({ getItem: () => { throw new Error('blocked'); } }, 'build-1').size).toBe(0);
  });

  it('skips only the scene check of a work that already passed, and still parses it', () => {
    const bad = unchecked(), stored = raw(work(), { [`new:${bad.id}`]: doc(bad) });
    expect(() => readWorkspace(stored)).toThrow('배경 자산을 찾을 수 없어요');
    const verified = new Set([workFingerprint(doc(bad))!]);
    expect(readWorkspace(stored, { verified }).works[`new:${bad.id}`]).toEqual(bad);
    const broken = raw(work(), { 'new:broken': { documentType: 'story-maker-project', schemaVersion: 8, project: { id: 'broken' } } });
    expect(() => readWorkspace(broken, { verified: new Set([workFingerprint(JSON.parse(broken).works['new:broken'])!]) })).toThrow('저장된 작품 목록에 읽을 수 없는 작품이 있습니다');
  });

  it('reports each checked work once, so the current work and its library copy share a check', () => {
    const current = work(), other = work('b');
    const loaded = readWorkspace(raw(current, { 'new:b': doc(other) }));
    expect(new Set(loaded.checked)).toEqual(new Set([workFingerprint(doc(current))!, workFingerprint(doc(other))!]));
    expect(loaded.checked).toHaveLength(2);
  });
});
