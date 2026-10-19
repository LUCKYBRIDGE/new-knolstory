import { describe, expect, it } from 'vitest';
import { normalizeAndValidateStoryProject } from '../src/legacy/story-project-validation';
import { isStoryScoreCondition, isStoryScoreDefinitions, isStoryScoreEffects } from '../src/legacy/story-scores';
import { createStoryBranches, disconnectStoryFlowTargets, isStoryFlow, storyFlowTargets } from '../src/legacy/story-flow';
const condition = { mode: 'all' as const, terms: [{ scoreId: 'trust', operator: 'gte' as const, value: 3 }] };
function scoredProject() {
  const p = normalizeAndValidateStoryProject({ id: 'story', title: '이야기', description: '', sheetUrl: '', sheetEditable: false, updatedAt: '',
    chapters: [{ id: 'chapter', order: 1, title: '첫 장', summary: '' }],
    lines: [0, 1, 2].map(i => ({ id: `cut-${i}`, chapterId: 'chapter', order: i + 1, type: 'narration', speaker: 'narration', speakerName: '해설', text: '', leftAssetId: '', rightAssetId: '', backgroundId: '' })),
  }).project!;
  return { ...p, scores: [{ id: 'trust', name: '신뢰', description: '이야기 속 신뢰', initial: 0 }], lines: p.lines.map((l, i) => ({ ...l, flow: i === 0 ? { type: 'choice' as const, options: [{ id: 'help', label: '돕는다', targetLineId: p.lines[1].id, condition, effects: [{ scoreId: 'trust', operation: 'add' as const, value: 1 }] }, { id: 'pass', label: '지나간다', targetLineId: null, effects: [] }] } : i === 1 ? { type: 'goto' as const, targetLineId: null, routes: [{ id: 'good', condition, targetLineId: p.lines[2].id }] } : l.flow })) };
}
describe('score authoring contract', () => {
  it('preserves the complete score structure and optional empty versus absent values', () => {
    const p = scoredProject(); expect(normalizeAndValidateStoryProject(p).project).toEqual(p);
    const empty = { ...p, scores: [] , lines: p.lines.map(({ flow: _flow, ...l }) => l) }; expect(normalizeAndValidateStoryProject(empty).project?.scores).toEqual([]);
    const { scores: _scores, ...absent } = empty; expect(normalizeAndValidateStoryProject(absent).project).not.toHaveProperty('scores');
  });
  it('rejects unknown keys, unsafe numbers, empty conditions and duplicate definition IDs', () => {
    expect(isStoryScoreDefinitions([{ id: 'a', name: '점수', description: '', initial: 0, extra: true }])).toBe(false);
    expect(isStoryScoreDefinitions([{ id: 'a', name: '점수', description: '', initial: 1.5 }])).toBe(false);
    expect(isStoryScoreDefinitions(Array(2).fill({ id: 'a', name: '점수', description: '', initial: 0 }))).toBe(false);
    expect(isStoryScoreCondition({ mode: 'all', terms: [] })).toBe(false);
    expect(isStoryScoreCondition({ mode: 'all', terms: Array(1) })).toBe(false);
    expect(isStoryScoreDefinitions(Array(1))).toBe(false);
    expect(isStoryScoreEffects(Array(1))).toBe(false);
    expect(isStoryScoreCondition({ ...condition, script: 'evil' })).toBe(false);
    expect(isStoryScoreEffects([{ scoreId: 'a', operation: 'add', value: 1000001 }])).toBe(false);
    expect(isStoryScoreEffects([{ scoreId: 'a', operation: 'multiply', value: 2 }])).toBe(false);
  });
  it('validates score and conditional route references', () => {
    const p = scoredProject(); expect(normalizeAndValidateStoryProject({ ...p, scores: [] }).issues.some(i => i.code === 'broken-reference')).toBe(true);
    const missing = structuredClone(p); if (missing.lines[1].flow?.type === 'goto') missing.lines[1].flow.routes![0].targetLineId = 'missing';
    expect(normalizeAndValidateStoryProject(missing).issues.some(i => i.code === 'broken-reference')).toBe(true);
  });
  it('includes and disconnects every conditional destination without dropping rules', () => {
    const p = scoredProject(); expect(storyFlowTargets(p.lines, 1)).toEqual([p.lines[2].id, null]);
    const changed = disconnectStoryFlowTargets(p.lines, new Set([p.lines[2].id])); expect(changed[1].flow).toMatchObject({ routes: [{ id: 'good', condition, targetLineId: '' }], targetLineId: null }); expect(p.lines[1].flow).toMatchObject({ routes: [{ targetLineId: p.lines[2].id }] });
  });
  it('preserves conditional goto when building joined branches and refuses lossy assigned branches', () => {
    const p = scoredProject(); let n = 0; const id = () => `new-${++n}`;
    const next = createStoryBranches(p, p.lines[1].id, 2, id);
    expect(next.lines.at(-1)?.flow).toEqual(p.lines[1].flow);
    expect(() => createStoryBranches(p, p.lines[1].id, 2, id, 0)).toThrow(/条件|조건/);
    expect(p.lines[1].flow).toMatchObject({ routes: [{ id: 'good' }] });
  });
  it('enforces bounds while allowing negative scores, duplicate names and ordered effects', () => {
    expect(isStoryScoreDefinitions([{ id: 'a', name: '점수', description: '', initial: -1000000 }, { id: 'b', name: '점수', description: '', initial: 1000000 }])).toBe(true);
    expect(isStoryScoreDefinitions(Array.from({ length: 33 }, (_, i) => ({ id: String(i), name: '점수', description: '', initial: 0 })))).toBe(false);
    expect(isStoryScoreCondition({ mode: 'any', terms: Array(9).fill(condition.terms[0]) })).toBe(false);
    expect(isStoryScoreEffects(Array(17).fill({ scoreId: 'a', operation: 'add', value: 1 }))).toBe(false);
    expect(isStoryScoreEffects([{ scoreId: 'a', operation: 'set', value: -5 }, { scoreId: 'a', operation: 'add', value: 3 }])).toBe(true);
  });
  it('rejects duplicate route IDs and unknown flow or choice fields', () => {
    const route = { id: 'a', condition, targetLineId: null }; expect(isStoryFlow({ type: 'goto', targetLineId: null, routes: [route, route] })).toBe(false);
    expect(isStoryFlow({ type: 'goto', targetLineId: null, script: 'evil' })).toBe(false);
    expect(isStoryFlow({ type: 'choice', options: [{ id: 'a', label: '', targetLineId: null, script: 'evil' }, { id: 'b', label: '', targetLineId: null }] })).toBe(false);
  });
});
