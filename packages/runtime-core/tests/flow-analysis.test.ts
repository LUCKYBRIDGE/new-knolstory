import { describe, expect, it } from 'vitest';
import type { StoryLine, StoryProject } from '@knolstory/story-domain';
import { representativeStories } from '@knolstory/compatibility';
import { createBlankStoryProject } from '../src/authoring';
import { analyzeStoryFlow } from '../src/flow-analysis';

const base = createBlankStoryProject({ id: 'p', chapterId: 'chapter', lineId: 'a', updatedAt: '2026-10-06' });
const cut = (id: string, order: number, flow?: StoryLine['flow']): StoryLine => ({ ...base.lines[0], id, order, text: id, flow });
const project = (lines: StoryLine[]): StoryProject => ({ ...base, lines });
const choice = (targets: (string | null)[]): StoryLine['flow'] => ({ type: 'choice', options: targets.map((targetLineId, index) => ({ id: `choice-${index}`, label: `갈래 ${index + 1}`, targetLineId })) });

describe('canonical flow analysis', () => {
  it('analyzes nested branches, merges and endings', () => {
    const graph = analyzeStoryFlow(project([
      cut('a', 1, choice(['b', 'c'])), cut('b', 2, choice(['d', 'e'])),
      cut('c', 3, { type: 'goto', targetLineId: 'f' }), cut('d', 4, { type: 'goto', targetLineId: 'f' }),
      cut('e', 5, { type: 'goto', targetLineId: 'f' }), cut('f', 6),
    ]));
    expect(graph.startLineId).toBe('a');
    expect(graph.nodes.every(node => node.reachable)).toBe(true);
    expect(graph.nodes.find(node => node.lineId === 'f')).toMatchObject({ shared: true, kind: 'ending' });
    expect(graph.nodes.find(node => node.lineId === 'f')?.incoming).toHaveLength(3);
    expect(graph.edges[0]).toMatchObject({ sourceLineId: 'a', targetLineId: 'b', choiceId: 'choice-0', label: '갈래 1', kind: 'choice', status: 'connected' });
    expect(graph.issues).toEqual([]);
    expect(new Set(graph.edges.map(edge => edge.id)).size).toBe(graph.edges.length);
  });

  it('marks same-source double connections shared and terminates disconnected cycles', () => {
    const graph = analyzeStoryFlow(project([cut('a', 1, choice(['b', 'b'])), cut('b', 2, { type: 'goto', targetLineId: null }), cut('c', 3, { type: 'goto', targetLineId: 'd' }), cut('d', 4, { type: 'goto', targetLineId: 'c' })]));
    expect(graph.nodes.find(node => node.lineId === 'b')).toMatchObject({ shared: true, kind: 'ending' });
    expect(graph.nodes.filter(node => !node.reachable).map(node => node.lineId)).toEqual(['c', 'd']);
    expect(graph.issues.map(issue => issue.kind)).toEqual(['cycle', 'unreachable', 'unreachable']);
  });

  it('uses chapter and cut order with implicit next across chapter boundaries', () => {
    const p = { ...base, chapters: [{ ...base.chapters[0], id: 'last', order: 2, title: '마지막' }, { ...base.chapters[0], order: 1, title: '처음' }], lines: [{ ...cut('c', 1), chapterId: 'last' }, cut('b', 2), cut('a', 1)] };
    const graph = analyzeStoryFlow(p);
    expect(graph.nodes.map(node => node.lineId)).toEqual(['a', 'b', 'c']);
    expect(graph.nodes[2]).toMatchObject({ chapterId: 'last', chapterTitle: '마지막', order: 1 });
    expect(graph.edges.map(edge => [edge.targetLineId, edge.label, edge.status])).toEqual([['b', '다음 컷', 'connected'], ['c', '다음 컷', 'connected'], [null, '이야기 끝', 'ending']]);
  });

  it('distinguishes pending, missing and explicit end while reporting blank labels', () => {
    const p = project([cut('a', 1, { type: 'choice', options: [{ id: 'pending', label: ' ', targetLineId: '' }, { id: 'missing', label: '찾기', targetLineId: 'absent' }, { id: 'end', label: '마침', targetLineId: null }] }), cut('b', 2, { type: 'goto', targetLineId: '' })]);
    const graph = analyzeStoryFlow(p);
    expect(graph.edges.map(edge => edge.status)).toEqual(['pending', 'missing', 'ending', 'pending']);
    expect(graph.edges[0]).toMatchObject({ targetLineId: '', label: '선택 1' });
    expect(graph.issues).toEqual(expect.arrayContaining([expect.objectContaining({ kind: 'blank-choice', lineId: 'a', choiceId: 'pending' }), expect.objectContaining({ kind: 'pending', lineId: 'a', choiceId: 'pending' }), expect.objectContaining({ kind: 'missing', lineId: 'a', choiceId: 'missing' }), expect.objectContaining({ kind: 'unreachable', lineId: 'b' })]));
  });

  it('ending annotation overrides dormant choice links and blank labels', () => {
    const p = project([{ ...cut('a', 1, { type: 'choice', options: [{ id: 'x', label: '', targetLineId: '' }, { id: 'y', label: 'y', targetLineId: 'b' }] }), ending: { name: '끝', description: '', endsStory: true } }, cut('b', 2)]);
    const graph = analyzeStoryFlow(p);
    expect(graph.nodes[0].kind).toBe('ending');
    expect(graph.nodes[0].outgoing).toEqual([expect.objectContaining({ kind: 'ending', status: 'ending', targetLineId: null, label: '이야기 끝' })]);
    expect(graph.issues).toEqual([expect.objectContaining({ kind: 'unreachable', lineId: 'b' })]);
  });

  it('keeps nonterminating ending annotations connected', () => {
    const graph = analyzeStoryFlow(project([{ ...cut('a', 1, { type: 'goto', targetLineId: 'b' }), ending: { name: '계속', description: '', endsStory: false } }, cut('b', 2)]));
    expect(graph.nodes[0]).toMatchObject({ kind: 'goto', reachable: true });
    expect(graph.edges[0]).toMatchObject({ label: '도착 컷', status: 'connected' });
  });

  it('handles malformed target values as missing rather than traversing them', () => {
    const p = project([cut('a', 1, { type: 'goto', targetLineId: 123 as unknown as string })]);
    expect(analyzeStoryFlow(p).edges[0].status).toBe('missing');
    expect(analyzeStoryFlow(p).issues[0].kind).toBe('missing');
  });

  it('handles empty works and reachable cycles', () => {
    expect(analyzeStoryFlow(project([]))).toEqual({ startLineId: null, nodes: [], edges: [], issues: [] });
    const graph = analyzeStoryFlow(project([cut('a', 1, { type: 'goto', targetLineId: 'b' }), cut('b', 2, { type: 'goto', targetLineId: 'a' })]));
    expect(graph.nodes.every(node => node.reachable)).toBe(true);
    expect(graph.issues).toEqual([expect.objectContaining({kind:'cycle',lineId:'b'})]);
  });

  it('does not mutate input or retain mutable project data in the snapshot', () => {
    const p = project([cut('a', 1, choice(['b', null])), cut('b', 2)]);
    const before = structuredClone(p);
    const graph = analyzeStoryFlow(p);
    expect(p).toEqual(before);
    p.lines[0].text = 'changed';
    if (p.lines[0].flow?.type === 'choice') p.lines[0].flow.options[0].label = 'changed';
    expect(graph.nodes[0].text).toBe('a');
    expect(graph.edges[0].label).toBe('갈래 1');
  });

  it('analyzes all 2635 representative cuts without recursive traversal', () => {
    const graphs = representativeStories.map(story => analyzeStoryFlow(story.project));
    expect(graphs.reduce((sum, graph) => sum + graph.nodes.length, 0)).toBe(2635);
    expect(graphs.every(graph => graph.nodes[0].reachable)).toBe(true);
    const chain = analyzeStoryFlow(project(Array.from({ length: 12000 }, (_, index) => cut(`cut-${index}`, index + 1))));
    expect(chain.nodes.every(node => node.reachable)).toBe(true);
  });
});
