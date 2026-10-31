import { describe, expect, it } from 'vitest';
import { orderedStoryFlowLines } from '../src/legacy/story-flow';
import type { StoryProject } from '../src/legacy/story-data';

type Line = StoryProject['lines'][number];
type Chapter = StoryProject['chapters'][number];
const line = (id: string, chapterId: string, order: number) => ({ id, chapterId, order }) as unknown as Line;
const chapter = (id: string, order: number) => ({ id, order }) as unknown as Chapter;
/** The ordering rule before memoization, kept as the oracle. */
const reference = (project: Pick<StoryProject, 'chapters' | 'lines'>) => [...project.chapters].sort((a, b) => a.order - b.order)
  .flatMap(item => project.lines.filter(cut => cut.chapterId === item.id).sort((a, b) => a.order - b.order));
const ids = (lines: readonly Line[]) => lines.map(item => item.id);
const project = () => ({
  chapters: [chapter('b', 2), chapter('a', 1)],
  lines: [line('b2', 'b', 2), line('a1', 'a', 1), line('b1', 'b', 1), line('tie-1', 'a', 5), line('tie-2', 'a', 5), line('lost', 'missing', 0)],
});

describe('ordered story cuts', () => {
  it('keeps the reading order rules: chapter order, cut order, stable ties and cuts of unknown chapters left out', () => {
    const value = project();
    expect(ids(orderedStoryFlowLines(value))).toEqual(['a1', 'tie-1', 'tie-2', 'b1', 'b2']);
    const repeated = { chapters: [chapter('a', 1), chapter('a', 3)], lines: [line('x', 'a', 1)] };
    expect(ids(orderedStoryFlowLines(repeated))).toEqual(ids(reference(repeated)));
  });

  it('returns a separate array every time', () => {
    const value = project();
    const first = orderedStoryFlowLines(value);
    first.reverse(); first.push(line('extra', 'a', 0));
    expect(ids(orderedStoryFlowLines(value))).toEqual(ids(reference(value)));
  });

  it('follows in-place edits, replaced cuts, added cuts and replaced chapters', () => {
    const value = project() as { chapters: Chapter[]; lines: Line[] };
    orderedStoryFlowLines(value);
    (value.lines[1] as { order: number }).order = 9;
    expect(ids(orderedStoryFlowLines(value))).toEqual(ids(reference(value)));
    value.lines[2] = line('b1-moved', 'a', 0);
    expect(ids(orderedStoryFlowLines(value))).toEqual(ids(reference(value)));
    value.lines.push(line('a-last', 'a', 10));
    expect(ids(orderedStoryFlowLines(value))).toEqual(ids(reference(value)));
    (value.lines[0] as { chapterId: string }).chapterId = 'a';
    expect(ids(orderedStoryFlowLines(value))).toEqual(ids(reference(value)));
    (value.chapters[0] as { order: number }).order = 0;
    expect(ids(orderedStoryFlowLines(value))).toEqual(ids(reference(value)));
    value.chapters = [chapter('a', 1)];
    expect(ids(orderedStoryFlowLines(value))).toEqual(ids(reference(value)));
    (value.chapters[0] as { id: string }).id = 'b';
    expect(ids(orderedStoryFlowLines(value))).toEqual(ids(reference(value)));
  });

  it('orders an unchanged project once, however often it is asked', () => {
    const value = project();
    let passes = 0;
    const filter = value.lines.filter.bind(value.lines);
    Object.defineProperty(value.lines, 'filter', { value: (...args: Parameters<typeof filter>) => { passes += 1; return filter(...args); } });
    for (let index = 0; index < 50; index++) expect(ids(orderedStoryFlowLines(value))).toEqual(['a1', 'tie-1', 'tie-2', 'b1', 'b2']);
    expect(passes).toBe(value.chapters.length);
  });
});
