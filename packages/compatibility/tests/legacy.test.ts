import seonnyeoSource from '../../../tests/fixtures/stories/seonnyeo.json';
import heungbuSource from '../../../tests/fixtures/stories/heungbu.json';
import onggojibSource from '../../../tests/fixtures/stories/onggojib.json';
import rabbitSource from '../../../tests/fixtures/stories/rabbit.json';
import { describe, expect, it } from 'vitest';
import { getRepresentativeStory, representativeStories } from '../src/index';
import { parseStoryDocument, serializeStoryDocument, updateStoryLine, storyFlowTargets, orderedStoryFlowLines } from '@knolstory/story-domain';

describe('fixed legacy manuscript fidelity', () => {
  for (const story of representativeStories) {
    it(`${story.id} imports every line, branch and presentation and roundtrips edits`, () => {
      const document = getRepresentativeStory(story.id);
      expect(document.project.lines.length).toBeGreaterThan(10);
      const serialized = serializeStoryDocument(document);
      const roundtrip = parseStoryDocument(serialized);
      expect(roundtrip.ok).toBe(true);
      if (!roundtrip.ok) throw new Error('roundtrip failed');
      expect(roundtrip.document).toEqual(document);
      const line = document.project.lines[0];
      const updated = updateStoryLine(document, line.id, { text: '수정한 대사\n둘째 줄' });
      expect(updated.project.lines[0].text).toBe('수정한 대사\n둘째 줄');
      expect(document.project.lines[0].text).toBe(line.text);
      expect(updated.project.lines.slice(1)).toEqual(document.project.lines.slice(1));
      expect(updated.project.chapters).toEqual(document.project.chapters);
      expect(updated.project.planning).toEqual(document.project.planning);
      expect(updated.project.cover).toEqual(document.project.cover);
      expect(updated.project.lines[0].flow).toEqual(line.flow);
      expect(updated.project.lines[0].presentation).toEqual(line.presentation);
    });
  }
  it('distinguishes explicit ending and unfinished link', () => {
    const original = getRepresentativeStory('heungbu');
    const first = original.project.lines[0];
    const ending = updateStoryLine(original, first.id, { flow: { type: 'goto', targetLineId: null } });
    const pending = updateStoryLine(original, first.id, { flow: { type: 'goto', targetLineId: '' } });
    expect(storyFlowTargets(orderedStoryFlowLines(ending.project), 0)).toEqual([null]);
    expect(storyFlowTargets(orderedStoryFlowLines(pending.project), 0)).toEqual(['']);
  });
  for (const version of [1,2,3,4,5]) {
    it(`loads schema v${version} and migrates to v5`, () => {
      const document = getRepresentativeStory('rabbit');
      const lines = document.project.lines.map(({ presentation: _presentation, backgroundMode: _mode, ...line }) => line);
      const candidate = { ...document, schemaVersion: version, project: { ...document.project, lines } };
      const loaded = parseStoryDocument(candidate);
      expect(loaded.ok).toBe(true);
      if (loaded.ok) expect(loaded.document.schemaVersion).toBe(5);
    });
  }
  it('rejects future versions and broken references without changing source', () => {
    const original = getRepresentativeStory('rabbit');
    const invalid = { ...original, schemaVersion: 6 };
    expect(parseStoryDocument(invalid).ok).toBe(false);
    expect(() => updateStoryLine(original, original.project.lines[0].id, {flow:{type:'goto',targetLineId:'missing'}})).toThrow();
  });
});

// These cases exercise schema boundaries, rather than relabeling an already-current file.
describe('legacy schema boundaries', () => {
  it('migrates a v1 effect into ordered presentation cues without mutating input', () => {
    const document = getRepresentativeStory('rabbit');
    const effect = { type: 'shake', intensity: 'strong', trigger: 'after-delay', delayMs: 350 };
    const candidate = { ...document, schemaVersion: 1, project: { ...document.project, lines: document.project.lines.map((line, index) => {
      const { presentation: _presentation, ...rest } = line;
      return index === 0 ? { ...rest, effect } : rest;
    }) } };
    const loaded = parseStoryDocument(candidate);
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) throw new Error('v1 migration failed');
    expect(loaded.document.project.lines[0].presentation).toEqual({ effects: [effect] });
    expect(candidate.project.lines[0]).toHaveProperty('effect');
    expect(loaded.document.project.lines[0]).not.toHaveProperty('effect');
    expect(parseStoryDocument({ ...candidate, schemaVersion: 2 }).ok).toBe(false);
  });
  it('v2 presentation keeps cue order, actor opacity and confirmation transitions', () => {
    const document = getRepresentativeStory('rabbit');
    const presentation = { effects: [{ type: 'flash' as const }, { type: 'screen-crack' as const, delayMs: 80 }], actors: { left: { opacity: .35, spectral: true, facing: 'right' as const } }, transition: { type: 'perspective-blackout' as const, mode: 'confirm' as const, title: '다른 눈', durationMs: 900 } };
    const candidate = { ...document, schemaVersion: 2, project: { ...document.project, lines: document.project.lines.map((line,index) => index === 0 ? { ...line, presentation } : line) } };
    const loaded = parseStoryDocument(candidate);
    expect(loaded.ok).toBe(true);
    if (loaded.ok) expect(loaded.document.project.lines[0].presentation).toEqual(presentation);
    expect(parseStoryDocument({ ...candidate, schemaVersion: 1 }).ok).toBe(false);
  });
  it('background none is a v5-only meaning; empty string keeps inheritance', () => {
    const document = getRepresentativeStory('rabbit');
    const none = updateStoryLine(document, document.project.lines[0].id, { backgroundMode: 'none', backgroundId: '' });
    expect(parseStoryDocument(none).ok).toBe(true);
    expect(parseStoryDocument({ ...none, schemaVersion: 4 }).ok).toBe(false);
    expect(none.project.lines[0].backgroundMode).toBe('none');
  });
  it('reports duplicate IDs, broken chapter references, invalid metadata and invalid JSON', () => {
    const original = getRepresentativeStory('rabbit');
    const line = original.project.lines[0];
    expect(parseStoryDocument({ ...original, project: { ...original.project, lines: [...original.project.lines, line] } }).ok).toBe(false);
    expect(parseStoryDocument({ ...original, project: { ...original.project, lines: [{ ...line, chapterId: 'missing' }] } }).ok).toBe(false);
    expect(parseStoryDocument({ ...original, savedAt: 'yesterday' }).ok).toBe(false);
    expect(parseStoryDocument('{')).toEqual({ ok: false, issues: [{ code: 'invalid-json', path: '$', message: 'Document JSON could not be parsed.' }] });
  });
});

const sourceManuscripts = { seonnyeo: seonnyeoSource, heungbu: heungbuSource, onggojib: onggojibSource, rabbit: rabbitSource };
describe('every authored baseline field is retained', () => {
  for (const story of representativeStories) {
    it(`${story.id} preserves every chapter, cut, text, branch, asset ID and cue`, () => {
      const project = getRepresentativeStory(story.id).project;
      const source = sourceManuscripts[story.id];
      expect(project).toMatchObject(source);
      expect(project.lines.map(line => line.id)).toEqual(source.lines.map(line => line.id));
      expect(project.chapters.map(chapter => chapter.id)).toEqual(source.chapters.map(chapter => chapter.id));
    });
  }
});
