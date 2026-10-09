import { describe, expect, it } from 'vitest';
import seonnyeo from '../../../tests/fixtures/stories/seonnyeo-classic.json';
import heungbu from '../../../tests/fixtures/stories/heungbu-classic.json';
import onggojib from '../../../tests/fixtures/stories/onggojib-classic.json';
import rabbit from '../../../tests/fixtures/stories/rabbit-classic.json';
import { classicStories, getClassicStory } from '../src/classic-stories';
import { parseStoryDocument, serializeStoryDocument } from '@knolstory/story-domain';
import { advancePlayback, analyzeStoryFlow, compileStoryScene, createPlayback, orderedLines, restorePlayback } from '../../runtime-core/src/index';
import { isRuntimeScene } from '../../runtime-contract/src/index';
import { preflight } from '../../../apps/web/lib/workspace-storage';

const originals = [
  { id: 'seonnyeo-classic' as const, source: seonnyeo, chapters: 6, cuts: 83 },
  { id: 'heungbu-classic' as const, source: heungbu, chapters: 7, cuts: 125 },
  { id: 'onggojib-classic' as const, source: onggojib, chapters: 6, cuts: 71 },
  { id: 'rabbit-classic' as const, source: rabbit, chapters: 5, cuts: 56 },
];

describe('fixed baseline original readings', () => {
  it('exposes four original readings under stable catalog IDs distinct from manuscript IDs', () => {
    expect(classicStories.map(story => story.id)).toEqual(originals.map(story => story.id));
    expect(classicStories.map(story => story.label)).toEqual(originals.map(story => story.source.title));
    expect(classicStories.map(story => story.project.id)).toEqual(originals.map(story => story.source.id));
  });

  it.each(originals)('$id preserves every authored field and roundtrips the complete original', ({ id, source, chapters, cuts }) => {
    const document = getClassicStory(id);
    expect(document.project).toMatchObject(source);
    expect(document.project.chapters).toHaveLength(chapters);
    expect(document.project.lines).toHaveLength(cuts);
    expect(document.project.chapters.map(chapter => chapter.id)).toEqual(source.chapters.map(chapter => chapter.id));
    expect(document.project.lines.map(line => [line.id, line.chapterId, line.text])).toEqual(source.lines.map(line => [line.id, line.chapterId, line.text]));
    const restored = parseStoryDocument(serializeStoryDocument(document));
    expect(restored.ok).toBe(true);
    if (!restored.ok) throw new Error('Original reading roundtrip failed');
    expect(restored.document).toEqual(document);
    expect(restored.document.project).toMatchObject(source);
  });

  it.each(originals)('$id compiles every cut with resolved assets and passes import preflight', ({ id }) => {
    const { project } = getClassicStory(id);
    expect(() => preflight(project)).not.toThrow();
    for (const cut of project.lines) {
      const scene = compileStoryScene(project, cut.id, 0, { mode: 'play' });
      expect(isRuntimeScene(scene)).toBe(true);
      expect(scene.dialogue.text).toBe(cut.text);
      expect(scene.sceneId).toBe(`${project.id}/${cut.id}`);
      expect(scene.actors.every(actor => actor.imagePath?.startsWith('assets/legacy-18da4fc/'))).toBe(true);
      if (scene.background) expect(scene.background.imagePath.startsWith('assets/legacy-18da4fc/')).toBe(true);
    }
  });

  it.each(originals)('$id reads the whole original to its ending and restores the same path', ({ id }) => {
    const { project } = getClassicStory(id);
    const lines = orderedLines(project);
    const graph = analyzeStoryFlow(project);
    expect(graph.issues).toEqual([]);
    expect(graph.nodes.every(node => node.reachable)).toBe(true);
    let state = createPlayback(project);
    for (const cut of lines) {
      expect(state.lineId).toBe(cut.id);
      expect(state.status).toBe('reading');
      state = advancePlayback(project, state);
    }
    expect(state.status).toBe('ended');
    expect(state.path).toEqual(lines.map(cut => cut.id));
    expect(restorePlayback(project, state)).toEqual(state);
  });

  it('returns validated independent clones', () => {
    const first = getClassicStory('seonnyeo-classic');
    const second = getClassicStory('seonnyeo-classic');
    expect(first).toEqual(second);
    expect(first.project).not.toBe(second.project);
    expect(first.project.lines[0]).not.toBe(second.project.lines[0]);
    expect(first.project).not.toBe(classicStories[0].project);
  });
});
