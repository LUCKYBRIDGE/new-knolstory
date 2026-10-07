import { createStoryDocument, parseStoryDocument, resolveStageComposition, stageProjection, type Chapter, type StoryLine, type StoryProject } from '@knolstory/story-domain';

export type BlankStoryInput = Readonly<{ id: string; chapterId: string; lineId: string; title?: string; updatedAt?: string }>;
export type NewChapterInput = Readonly<{ chapterId: string; lineId: string; title?: string }>;

function requireId(id: string): void {
  if (typeof id !== 'string' || !id.trim()) throw new Error('작품·장·컷 ID를 확인해 주세요.');
}

function titleText(title: string, requireNonBlank = false): string {
  if (typeof title !== 'string' || title.length > 200 || (requireNonBlank && !title.trim()))
    throw new Error('제목은 200자 이내로 입력해 주세요.');
  return title;
}

/** Validate the candidate without mutating or canonicalizing already authored fields. */
function validated(project: StoryProject, touch = true): StoryProject {
  const candidate = touch ? { ...project, updatedAt: new Date().toISOString() } : project;
  const loaded = parseStoryDocument(createStoryDocument({ project: candidate, savedAt: new Date().toISOString(), appVersion: 'knolstory-next' }));
  if (!loaded.ok) throw new Error(loaded.issues.map(issue => issue.message).join('\n'));
  return candidate;
}

function emptyChapter(id: string, order: number, title: string): Chapter {
  return { id, order, chapterNumber: order, title, summary: '', purpose: '', mood: '', keyEvents: '', nextChapterIdea: '',
    storyStageKeys: [], chapterSpeakerNames: [], characterAssetIds: [], backgroundAssetIds: [],
    backgroundId: '', leftAssetId: '', rightAssetId: '' };
}

function emptyCut(id: string, chapterId: string): StoryLine {
  return { id, chapterId, order: 1, type: 'narration', speaker: 'narration', speakerName: '', text: '',
    stageComposition: { leftActors: [], rightActors: [] },
    leftAssetId: '', rightAssetId: '', backgroundId: '', purposeNote: '', emotionNote: '', directionNote: '' };
}

export function createBlankStoryProject(input: BlankStoryInput): StoryProject {
  [input.id, input.chapterId, input.lineId].forEach(requireId);
  return validated({ id: input.id, title: titleText(input.title ?? '새 이야기', true), description: '',
    choiceMode: 'simple', planning: { premise: '', structureMode: 'free', material: '', theme: '', mainCharacter: '',
      mainGoal: '', centralProblem: '', stakes: '', endingChange: '', opening: '', middle: '', crisis: '',
      climax: '', ending: '', characterNotes: '', worldNotes: '', mood: '', openQuestions: '', freeNotes: '' },
    creativeMemos: [], sheetUrl: '', sheetEditable: false, speakerNames: [],
    chapters: [emptyChapter(input.chapterId, 1, '첫 번째 장')], lines: [emptyCut(input.lineId, input.chapterId)],
    updatedAt: input.updatedAt ?? new Date().toISOString() }, false);
}

function requireNewIds(project: StoryProject, chapterId: string | undefined, lineId: string): void {
  requireId(lineId);
  if (project.lines.some(line => line.id === lineId)) throw new Error('이미 사용 중인 컷 ID예요.');
  if (chapterId !== undefined) {
    requireId(chapterId);
    if (project.chapters.some(chapter => chapter.id === chapterId)) throw new Error('이미 사용 중인 장 ID예요.');
  }
}

export function addStoryChapter(project: StoryProject, input: NewChapterInput): StoryProject {
  requireNewIds(project, input.chapterId, input.lineId);
  const order = Math.max(0, ...project.chapters.map(chapter => chapter.order)) + 1;
  const chapterNumber = Math.max(0, ...project.chapters.map(chapter => chapter.chapterNumber ?? chapter.order)) + 1;
  return validated({ ...project, chapters: [...project.chapters, { ...emptyChapter(input.chapterId, order, titleText(input.title ?? "새 장")), chapterNumber }],
    lines: [...project.lines, emptyCut(input.lineId, input.chapterId)] });
}

function requireCut(project: StoryProject, lineId: string): StoryLine {
  const line = project.lines.find(cut => cut.id === lineId);
  if (!line) throw new Error('이야기 컷을 찾을 수 없어요.');
  return line;
}

function chapterCuts(project: StoryProject, chapterId: string): StoryLine[] {
  return project.lines.filter(line => line.chapterId === chapterId).sort((a, b) => a.order - b.order);
}

function replaceChapterCuts(project: StoryProject, chapterId: string, cuts: StoryLine[]): StoryProject {
  const ordered = cuts.map((cut, index) => ({ ...cut, order: index + 1 }));
  return validated({ ...project, lines: [...project.lines.filter(line => line.chapterId !== chapterId), ...ordered] });
}

/** Extend the selected path: move its exit to the new cut rather than skipping authored text. */
export function insertStoryCut(project: StoryProject, afterLineId: string, newLineId: string): StoryProject {
  const selected = requireCut(project, afterLineId);
  requireNewIds(project, undefined, newLineId);
  const chapter = project.chapters.find(item => item.id === selected.chapterId);
  const stageComposition = resolveStageComposition(chapter, selected, project);
  const cut: StoryLine = { ...emptyCut(newLineId, selected.chapterId), stageComposition, ...stageProjection(stageComposition),
    backgroundId: selected.backgroundMode === 'none' ? '' : selected.backgroundId || chapter?.backgroundId || project.stageDefaults?.backgroundId || '',
    ...(selected.backgroundMode === 'none' ? { backgroundMode: 'none' as const } : {}),
    ...(selected.flow?.type === 'goto' ? { flow: structuredClone(selected.flow) } : {}),
    ...(selected.ending?.endsStory ? { ending: structuredClone(selected.ending) } : {}) };
  const previous: StoryLine = selected.flow?.type === 'goto' || selected.ending?.endsStory
    ? { ...selected, flow: undefined, ending: selected.ending?.endsStory ? undefined : selected.ending } : selected;
  const cuts = chapterCuts(project, selected.chapterId).map(line => line.id === selected.id ? previous : line);
  const index = cuts.findIndex(line => line.id === afterLineId) + 1;
  return replaceChapterCuts(project, selected.chapterId, [...cuts.slice(0, index), cut, ...cuts.slice(index)]);
}

export function moveStoryCut(project: StoryProject, lineId: string, direction: 'up' | 'down'): StoryProject {
  const selected = requireCut(project, lineId);
  const cuts = chapterCuts(project, selected.chapterId);
  const index = cuts.findIndex(line => line.id === lineId);
  const target = index + (direction === 'up' ? -1 : 1);
  if (target < 0 || target >= cuts.length) return project;
  return replaceChapterCuts(project, selected.chapterId, cuts.map((cut, position) => position === index ? cuts[target] : position === target ? selected : cut));
}

export function renameStoryProject(project: StoryProject, title: string): StoryProject {
  return validated({ ...project, title: titleText(title) });
}

export function renameStoryChapter(project: StoryProject, chapterId: string, title: string): StoryProject {
  if (!project.chapters.some(chapter => chapter.id === chapterId)) throw new Error('이야기 장을 찾을 수 없어요.');
  const nextTitle = titleText(title);
  return validated({ ...project, chapters: project.chapters.map(chapter => chapter.id === chapterId ? { ...chapter, title: nextTitle } : chapter) });
}
