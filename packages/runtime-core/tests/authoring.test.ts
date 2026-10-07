import { describe, expect, it } from 'vitest';
import { createStoryDocument, parseStoryDocumentJson, serializeStoryDocument } from '@knolstory/story-domain';
import { representativeStories } from '@knolstory/compatibility';
import { addStoryChapter, createBlankStoryProject, insertStoryCut, moveStoryCut, renameStoryChapter, renameStoryProject } from '../src/authoring';
import { advancePlayback, compileStoryScene, createPlayback, orderedLines } from '../src/story-runtime';

const blank = () => createBlankStoryProject({ id: 'new-story', chapterId: 'chapter-1', lineId: 'cut-1', updatedAt: '2026-10-06T00:00:00.000Z' });

describe('new story authoring', () => {
  it('creates one empty narration cut without representative content or assets and compiles it', () => {
    const project = blank();
    expect(project.chapters).toHaveLength(1);
    expect(project.lines).toHaveLength(1);
    expect(project.lines[0]).toMatchObject({ id: 'cut-1', chapterId: 'chapter-1', order: 1, text: '', type: 'narration', speaker: 'narration', leftAssetId: '', rightAssetId: '', backgroundId: '' });
    const scene = compileStoryScene(project, 'cut-1', 1);
    expect(scene.actors).toEqual([]);
    expect(scene.dialogue.text).toBe('');
    expect(scene.background).toBeUndefined();
  });

  it('adds chapters and cuts, renames them, and round-trips the full document', () => {
    const first = blank();
    const before = JSON.stringify(first);
    const withChapter = addStoryChapter(first, { chapterId: 'chapter-2', lineId: 'cut-2', title: '돌아오는 길' });
    const inserted = insertStoryCut(withChapter, 'cut-1', 'cut-1b');
    const renamed = renameStoryChapter(renameStoryProject(inserted, '나의 이야기'), 'chapter-1', '시작');
    expect(renamed.chapters.map(chapter => [chapter.order, chapter.title])).toEqual([[1, '시작'], [2, '돌아오는 길']]);
    expect(orderedLines(renamed).map(line => [line.id, line.order])).toEqual([['cut-1', 1], ['cut-1b', 2], ['cut-2', 1]]);
    const loaded = parseStoryDocumentJson(serializeStoryDocument(createStoryDocument({ project: renamed, savedAt: first.updatedAt, appVersion: 'authoring-test' })));
    expect(loaded.ok).toBe(true);
    if (loaded.ok) expect(loaded.document.project).toEqual(renamed);
    expect(JSON.stringify(first)).toBe(before);
  });

  it('inserts and moves cuts inside one chapter while preserving explicit choice and goto routes', () => {
    const initial = insertStoryCut(insertStoryCut(blank(), 'cut-1', 'cut-2'), 'cut-2', 'cut-3');
    const project = { ...initial, lines: initial.lines.map(line => ({ ...line, flow: line.id === 'cut-1'
      ? { type: 'choice' as const, options: [{ id: 'path', label: '계속', targetLineId: 'cut-3' }, { id: 'end', label: '끝', targetLineId: null }] }
      : { type: 'goto' as const, targetLineId: null } })) };
    const before = JSON.stringify(project);
    const moved = moveStoryCut(insertStoryCut(project, 'cut-1', 'new'), 'cut-3', 'up');
    expect(orderedLines(moved).map(line => line.id)).toEqual(['cut-1', 'new', 'cut-3', 'cut-2']);
    expect(orderedLines(moved).map(line => line.order)).toEqual([1, 2, 3, 4]);
    for (const line of project.lines) expect(moved.lines.find(cut => cut.id === line.id)?.flow).toEqual(line.flow);
    expect(advancePlayback(moved, createPlayback(moved), 'path').lineId).toBe('cut-3');
    expect(advancePlayback(moved, createPlayback(moved), 'end').status).toBe('ended');
    expect(JSON.stringify(project)).toBe(before);
  });

  it('moves in both directions and keeps chapter boundaries intact', () => {
    const project = addStoryChapter(insertStoryCut(blank(), 'cut-1', 'cut-2'), { chapterId: 'chapter-2', lineId: 'cut-3' });
    expect(orderedLines(moveStoryCut(project, 'cut-1', 'down')).map(line => line.id)).toEqual(['cut-2', 'cut-1', 'cut-3']);
    expect(moveStoryCut(project, 'cut-1', 'up')).toBe(project);
    expect(moveStoryCut(project, 'cut-2', 'down')).toBe(project);
    expect(moveStoryCut(project, 'cut-3', 'up')).toBe(project);
  });

  it('carries visible stage actors and background into a new cut without dialogue, flow, ending or presentation', () => {
    const source = representativeStories[1].project;
    const selected = source.lines.find(line => compileStoryScene(source, line.id, 1).actors.length > 0)!;
    const changed = insertStoryCut(source, selected.id, 'visible-stage-copy');
    const newCut = changed.lines.find(line => line.id === 'visible-stage-copy')!;
    const originalScene = compileStoryScene(source, selected.id, 1);
    const nextScene = compileStoryScene(changed, newCut.id, 2);
    expect(nextScene.actors.map(actor => actor.imagePath)).toEqual(originalScene.actors.map(actor => actor.imagePath));
    expect(nextScene.background).toEqual(originalScene.background);
    expect(newCut.text).toBe('');
    expect(newCut.flow).toBeUndefined();
    expect(newCut.ending).toBeUndefined();
    expect(newCut.presentation).toBeUndefined();
    expect(newCut.stageComposition).toBeDefined();
    expect(newCut.stageComposition).not.toBe(selected.stageComposition);
    const hidden = { ...source, lines: source.lines.map(line => line.id === selected.id ? { ...line, backgroundMode: 'none' as const, backgroundId: '' } : line) };
    const hiddenCopy = insertStoryCut(hidden, selected.id, 'no-background-copy');
    expect(compileStoryScene(hiddenCopy, 'no-background-copy', 1).background).toBeUndefined();
  });

  it('preserves authored content and extends explicit exits when inserting into representative stories', () => {
    for (const { project } of representativeStories) {
      const changed = insertStoryCut(project, orderedLines(project)[0].id, 'new-authoring-cut');
      expect(changed.lines).toHaveLength(project.lines.length + 1);
      for (const line of project.lines) {
        const result = changed.lines.find(cut => cut.id === line.id)!;
        const selected = orderedLines(project)[0];
        if (line.id === selected.id && (line.flow?.type === 'goto' || line.ending?.endsStory)) {
          expect({ ...result, order: line.order, flow: line.flow, ending: line.ending }).toEqual({ ...line, ending: line.ending });
          const added = changed.lines.find(cut => cut.id === 'new-authoring-cut')!;
          expect(added.flow).toEqual(line.flow);
          expect(advancePlayback(changed, createPlayback(changed)).lineId).toBe(added.id);
        } else expect({ ...result, order: line.order }).toEqual(line);
      }
    }
  });

  it('rejects duplicate or empty IDs, missing selections, and invalid titles', () => {
    const project = blank();
    expect(() => createBlankStoryProject({ id: '', chapterId: 'ch', lineId: 'cut' })).toThrow();
    expect(() => createBlankStoryProject({ id: 'id', chapterId: '', lineId: 'cut' })).toThrow();
    expect(() => createBlankStoryProject({ id: 'id', chapterId: 'ch', lineId: ' ' })).toThrow();
    expect(() => createBlankStoryProject({ id: 'id', chapterId: 'ch', lineId: 'cut', title: ' ' })).toThrow();
    expect(() => addStoryChapter(project, { chapterId: 'chapter-1', lineId: 'new' })).toThrow();
    expect(() => addStoryChapter(project, { chapterId: 'new', lineId: 'cut-1' })).toThrow();
    expect(() => insertStoryCut(project, 'missing', 'new')).toThrow();
    expect(() => insertStoryCut(project, 'cut-1', 'cut-1')).toThrow();
    expect(() => moveStoryCut(project, 'missing', 'up')).toThrow();
    expect(() => renameStoryChapter(project, 'missing', '제목')).toThrow();
    expect(renameStoryProject(project, ' ').title).toBe(' ');
    expect(renameStoryChapter(project, 'chapter-1', '').chapters[0].title).toBe('');
    expect(() => renameStoryProject(project, 'x'.repeat(201))).toThrow();
    expect(() => renameStoryChapter(project, 'chapter-1', 'x'.repeat(201))).toThrow();
  });
});
