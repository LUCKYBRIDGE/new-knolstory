import { storyBranchConditionTerms, type StoryBranchChoice, type StoryBranchCondition, type StoryLine, type StoryMusicCue } from '@knolstory/story-domain';

/** Rebind only references to the duplicated cut; other destinations stay literal. */
export function remapClonedCutReferences(
  clone: StoryLine,
  sourceLineId: string,
  choiceIds: ReadonlyMap<string, string>,
): StoryLine {
  const target = (id: string | null) => id === sourceLineId ? clone.id : id;
  const branch = <T extends { branchCondition?: StoryBranchCondition }>(cue: T): T => {
    const condition = cue.branchCondition;
    if (!condition || !storyBranchConditionTerms(condition).some(term => term.sourceLineId === sourceLineId)) return cue;
    const remap = (term: StoryBranchChoice): StoryBranchChoice => {
      if (term.sourceLineId !== sourceLineId) return term;
      const choiceId = choiceIds.get(term.choiceId);
      if (!choiceId) throw new Error('복제할 컷의 선택 조건에 연결된 선택 항목을 찾을 수 없어요. 선택지를 확인해 주세요.');
      return { ...term, sourceLineId: clone.id, choiceId };
    };
    return { ...cue, branchCondition: 'terms' in condition ? { ...condition, terms: condition.terms.map(remap) } : remap(condition) };
  };
  const music = (cue: StoryMusicCue): StoryMusicCue => {
    if (cue.action !== 'play' && cue.action !== 'sequence') return cue;
    return branch(cue.endLineId === sourceLineId ? { ...cue, endLineId: clone.id } : cue);
  };
  const flow = clone.flow;
  return {
    ...clone,
    ...(clone.visibility?.choices?{visibility:{...clone.visibility,choices:branch({branchCondition:clone.visibility.choices}).branchCondition}}:{}),
    ...(flow ? { flow: flow.type === 'choice'
      ? { ...flow, options: flow.options.map(option => ({ ...option, targetLineId: target(option.targetLineId) })) }
      : { ...flow, targetLineId: target(flow.targetLineId),
        ...(flow.routes !== undefined ? { routes: flow.routes.map(route => ({ ...route, targetLineId: target(route.targetLineId) })) } : {}),
      } } : {}),
    ...(clone.presentation?.effects !== undefined ? { presentation: {
      ...clone.presentation,
      effects: clone.presentation.effects.map(cue => branch(
        cue.scope === 'following' && cue.endLineId === sourceLineId ? { ...cue, endLineId: clone.id } : cue,
      )),
    } } : {}),
    ...(clone.audio ? { audio: {
      ...clone.audio,
      ...(clone.audio.music !== undefined ? { music: music(clone.audio.music) } : {}),
      ...(clone.audio.ambience !== undefined ? { ambience: music(clone.audio.ambience) } : {}),
      ...(clone.audio.sounds !== undefined ? { sounds: clone.audio.sounds.map(cue => branch(cue)) } : {}),
    } } : {}),
  };
}
