import { describe, expect, it } from 'vitest';
import { representativeStories } from '@knolstory/compatibility';
import { advancePlayback, backPlayback, compileStoryScene, createPlayback, orderedLines, patchStoryLine, restorePlayback } from '../src/index';

describe('representative story compiler', () => {
  it.each(representativeStories)('compiles every cut of $label with actual assets and full text', ({ project }) => {
    for (const line of project.lines) {
      const scene = compileStoryScene(project, line.id, 1, { mode: 'edit' });
      expect(scene.dialogue.text).toBe(line.text);
      expect(scene.sceneId).toBe(`${project.id}/${line.id}`);
      expect(scene.actors.every(a => a.imagePath?.startsWith('assets/legacy-18da4fc/'))).toBe(true);
      if (line.flow?.type === 'choice') expect(scene.choices?.map(c => c.id)).toEqual(line.flow.options.map(c => c.id));
      expect(scene.presentation?.effects?.map(({originEntry:_origin,...cue})=>cue)??[]).toEqual(line.presentation?.effects??[]);
    }
  },15000);
  it('updates a cut without mutating other cuts, flow or presentation', () => {
    const project = representativeStories[2].project;
    const before = JSON.stringify(project);
    const changed = patchStoryLine(project, project.lines[0].id, { text: '새로운 대사' });
    expect(changed.lines[0].text).toBe('새로운 대사');
    expect(changed.lines[0].flow).toEqual(project.lines[0].flow);
    expect(changed.lines[0].presentation).toEqual(project.lines[0].presentation);
    expect(JSON.stringify(project)).toBe(before);
  });
  it.each(representativeStories)('follows every declared branch and join in $label', ({ project }) => {
    const lines = orderedLines(project);
    for (const [index, line] of lines.entries()) {
      const state = createPlayback(project, line.id);
      const targets = line.ending?.endsStory ? [{ id: undefined, target: null }]
        : line.flow?.type === 'choice' ? line.flow.options.map(c => ({ id: c.id, target: c.targetLineId }))
        : [{ id: undefined, target: line.flow?.type === 'goto' ? line.flow.targetLineId : lines[index + 1]?.id ?? null }];
      for (const { id, target } of targets) {
        const next = advancePlayback(project, state, id);
        if (target === null) expect(next.status).toBe('ended');
        else if (target === '') expect(next.status).toBe('pending');
        else {
          expect(next.lineId).toBe(target);
          expect(backPlayback(project, next)).toEqual(state);
        }
      }
    }
  });
  it('resolves actor overrides and intentionally empty backgrounds independently of viewport', () => {
    const project = representativeStories[2].project;
    const line = project.lines.find(cut => compileStoryScene(project, cut.id, 1).actors.length > 0)!;
    const changed = patchStoryLine(project, line.id, { presentation: { ...line.presentation,
      actors: { left: { spectral: true }, right: { spectral: true } } } });
    const scene = compileStoryScene(changed, line.id, 8, { mode: 'play', reducedMotion: true });
    expect(scene.actors.some(actor => actor.spectral)).toBe(true);
    expect(scene.reducedMotion).toBe(true);
    const blank = patchStoryLine(project, line.id, { backgroundMode: 'none', backgroundId: '' });
    expect(compileStoryScene(blank, line.id, 9).background).toBeUndefined();
    expect(() => patchStoryLine(project, line.id, { id: 'changed' })).toThrow();
  });
});

describe('playback branch outcomes', () => {
  const source = representativeStories[1].project;
  const lines = orderedLines(source);
  const project = { ...source, lines: lines.slice(0, 3).map((line, index) => ({ ...line, flow: index === 0
    ? { type: 'choice' as const, options: [{ id: 'end', label: '끝', targetLineId: null }, { id: 'pending', label: '연결 대기', targetLineId: '' }, { id: 'next', label: '다음', targetLineId: lines[1].id }] }
    : { type: 'goto' as const, targetLineId: index === 1 ? lines[2].id : null } })) };
  it('keeps explicit endings distinct from incomplete links', () => {
    const state = createPlayback(project);
    expect(state.status).toBe('choice');
    expect(advancePlayback(project, state, 'end').status).toBe('ended');
    const pending = advancePlayback(project, state, 'pending');
    expect(pending.status).toBe('pending');
    expect(pending.lineId).toBe(state.lineId);
    expect(() => advancePlayback(project, state, 'missing')).toThrow();
  });
  it('records choice paths, follows goto, and returns from endings', () => {
    const first = createPlayback(project);
    const second = advancePlayback(project, first, 'next');
    expect(second.lineId).toBe(lines[1].id);
    expect(second.path).toEqual([lines[0].id, lines[1].id]);
    const third = advancePlayback(project, second);
    expect(third.lineId).toBe(lines[2].id);
    expect(backPlayback(project, third)).toEqual(second);
    const ended = advancePlayback(project, third);
    expect(ended.status).toBe('ended');
    expect(backPlayback(project, ended)).toEqual(third);
  });
  it('does not guess destinations for invalid links or unknown cut IDs', () => {
    expect(() => createPlayback(project, 'missing')).toThrow();
    expect(() => compileStoryScene(project, 'missing', 1, { mode: 'play' })).toThrow();
    expect(() => patchStoryLine(project, 'missing', { text: 'x' })).toThrow();
  });
  it('handles empty stories, missing destinations, repeated next and first-cut back without guessing', () => {
    const empty = { ...source, lines: [] };
    expect(createPlayback(empty).status).toBe('ended');
    const state = createPlayback(project);
    expect(advancePlayback(project, state).status).toBe('choice');
    expect(backPlayback(project, state)).toBe(state);
    const broken = { ...project, lines: [{ ...project.lines[0], flow: { type: 'goto' as const, targetLineId: 'missing' } }] };
    expect(advancePlayback(broken, createPlayback(broken)).status).toBe('pending');
    const ended = advancePlayback(project, state, 'end');
    expect(advancePlayback(project, ended)).toBe(ended);
  });
  it('restores actual branch history and ending without accepting changed or forged paths', () => {
    const first = createPlayback(project);
    const second = advancePlayback(project, first, 'next');
    expect(restorePlayback(project, second)).toEqual(second);
    expect(restorePlayback(project, advancePlayback(project, first, 'end'))).toEqual(advancePlayback(project, first, 'end'));
    expect(restorePlayback(project, advancePlayback(project, first, 'pending')).status).toBe('pending');
    expect(() => restorePlayback(project, { ...second, path: ['missing'] })).toThrow();
    expect(() => restorePlayback(project, { ...second, lineId: null })).toThrow();
    expect(() => restorePlayback(project, { ...second, status: 'ended' })).toThrow();
    expect(() => restorePlayback(project, { ...second, path: [lines[2].id, lines[0].id] })).toThrow();
    expect(() => restorePlayback(project, null)).toThrow();
    expect(() => restorePlayback(project, { path: 'bad' })).toThrow();
    expect(restorePlayback(project, { path: [] })).toEqual(first);
  });
});
