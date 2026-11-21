import {
  createStoryDocument, parseStoryDocument, stageProjection,
  type Chapter, type PicturebookSketch, type StageActorEntry, type StoryCover, type StoryLine, type StoryProject,
} from '@knolstory/story-domain';
import { advancePlayback, compileStoryScene, createPlayback, orderedLines } from './story-runtime';

/**
 * Picture book → KnolStory: one page becomes one chapter with one blank first cut.
 * The input is the student's own picture book as it is now (page order, text and pictures).
 * Nothing here writes dialogue, speakers, choices or endings for the student.
 */
export type PicturebookPage = Readonly<{ id: string; order: number; title: string; text: string; backgroundId: string; leftAssetId: string; rightAssetId: string }>;
export type PicturebookBook = Readonly<{ id: string; title: string; description: string; authorDisplayName: string; pages: readonly PicturebookPage[] }>;
/** `subject`: who the first (narration) cut is about. Portrait reading shows this actor, not just the left one. */
export type PicturebookStageActor = Readonly<Pick<StageActorEntry, 'assetId' | 'facing' | 'placementPreset' | 'xAnchor' | 'scaleMultiplier'> & { subject?: boolean }>;
/**
 * What the first cut of one page's chapter starts with.
 * - reference: the page picture is kept only as the chapter's starting picture; the stage is empty.
 * - stage: background and actors placed on the first cut. `origin` records where the choice came from.
 */
export type PicturebookPageStage =
  | Readonly<{ kind: 'reference' }>
  | Readonly<{ kind: 'stage'; origin: 'approved' | 'student'; recipeVersion?: number; backgroundId: string; left: readonly PicturebookStageActor[]; right: readonly PicturebookStageActor[] }>;
export type PicturebookConversionInput = Readonly<{
  book: PicturebookBook;
  /** Keyed by page ID. A missing page means ‘reference only’. */
  stages: Readonly<Record<string, PicturebookPageStage>>;
  workId: string;
  createId: () => string;
  updatedAt: string;
  cover?: StoryCover;
}>;
export type PicturebookChapterLink = Readonly<{ pageId: string; chapterId: string; lineId: string }>;
export type PicturebookConversion = Readonly<{ project: StoryProject; chapters: readonly PicturebookChapterLink[] }>;
export type PicturebookConversionIssue = Readonly<{ pageId: string; pageNumber: number; message: string }>;

export class PicturebookConversionError extends Error {
  constructor(readonly issues: readonly PicturebookConversionIssue[]) {
    super(issues.map(issue => issue.pageNumber > 0 ? `${issue.pageNumber}쪽: ${issue.message}` : issue.message).join('\n'));
    this.name = 'PicturebookConversionError';
  }
}

export const PICTUREBOOK_MAX_PAGES = 500;
const MAX_TITLE = 200;
const BLANK_PLANNING = { premise: '', structureMode: 'free', material: '', theme: '', mainCharacter: '', mainGoal: '', centralProblem: '', stakes: '', endingChange: '', opening: '', middle: '', crisis: '', climax: '', ending: '', characterNotes: '', worldNotes: '', mood: '', openQuestions: '', freeNotes: '' } as const;

function sketchOf(page: PicturebookPage): PicturebookSketch | undefined {
  if (!page.backgroundId && !page.leftAssetId && !page.rightAssetId) return undefined;
  return { backgroundId: page.backgroundId, leftAssetId: page.leftAssetId, rightAssetId: page.rightAssetId };
}

function firstCut(lineId: string, chapterId: string, stage: PicturebookPageStage): StoryLine {
  const base = { id: lineId, chapterId, order: 1, type: 'narration' as const, speaker: 'narration' as const, speakerName: '', text: '', purposeNote: '', emotionNote: '', directionNote: '' };
  if (stage.kind === 'reference') {
    // An explicit empty stage: the chapter never borrows the previous chapter's picture.
    return { ...base, stageComposition: { leftActors: [], rightActors: [] }, leftAssetId: '', rightAssetId: '', backgroundId: '', backgroundMode: 'none' };
  }
  const actors = (side: 'L' | 'R', list: readonly PicturebookStageActor[]): StageActorEntry[] => list.map((actor, index) => ({
    key: `${side}${index + 1}`, assetId: actor.assetId,
    ...(actor.facing ? { facing: actor.facing } : {}), ...(actor.placementPreset ? { placementPreset: actor.placementPreset } : {}),
    ...(actor.xAnchor !== undefined ? { xAnchor: actor.xAnchor } : {}), ...(actor.scaleMultiplier !== undefined ? { scaleMultiplier: actor.scaleMultiplier } : {}),
  }));
  const leftActors = actors('L', stage.left), rightActors = actors('R', stage.right);
  const subjectIndex = [...stage.left, ...stage.right].findIndex(actor => actor.subject);
  const subjectKey = subjectIndex < 0 ? undefined : [...leftActors, ...rightActors][subjectIndex]!.key;
  // A narrative cut names its action subject without becoming dialogue (Runtime Core portrait focus).
  const stageComposition = { leftActors, rightActors, ...(subjectKey ? { speakerActorKey: subjectKey } : {}) };
  return { ...base, stageComposition, ...stageProjection(stageComposition), ...(stage.backgroundId ? { backgroundId: stage.backgroundId } : { backgroundId: '', backgroundMode: 'none' as const }) };
}

/** Problems are reported per page; nothing is cut short or left out to make the conversion succeed. */
export function picturebookConversionIssues(book: PicturebookBook, stages: Readonly<Record<string, PicturebookPageStage>>): PicturebookConversionIssue[] {
  const issues: PicturebookConversionIssue[] = [];
  if (!book.pages.length) issues.push({ pageId: '', pageNumber: 0, message: '쪽이 없는 그림책은 놀스토리로 펼칠 수 없어요.' });
  if (book.pages.length > PICTUREBOOK_MAX_PAGES) issues.push({ pageId: '', pageNumber: 0, message: `놀스토리 한 편은 ${PICTUREBOOK_MAX_PAGES}장까지 만들 수 있어요. 지금 그림책은 ${book.pages.length}쪽이에요.` });
  if (book.title.length > MAX_TITLE) issues.push({ pageId: '', pageNumber: 0, message: `그림책 제목은 ${MAX_TITLE}자 이내여야 해요.` });
  const ids = new Set<string>();
  book.pages.forEach((page, index) => {
    const pageNumber = index + 1;
    if (!page.id || ids.has(page.id)) issues.push({ pageId: page.id, pageNumber, message: '쪽 구분 정보가 비어 있거나 겹쳐요.' });
    ids.add(page.id);
    if (page.order !== pageNumber) issues.push({ pageId: page.id, pageNumber, message: '쪽 순서를 확인해 주세요.' });
    if (page.title.length > MAX_TITLE) issues.push({ pageId: page.id, pageNumber, message: `쪽 제목이 ${page.title.length}자예요. 장 제목은 ${MAX_TITLE}자 이내로 줄여 주세요.` });
    const stage = stages[page.id];
    if (stage?.kind === 'stage' && (stage.left.length > 2 || stage.right.length > 2)) issues.push({ pageId: page.id, pageNumber, message: '첫 무대에는 한쪽에 인물을 두 명까지 둘 수 있어요.' });
    if (stage?.kind === 'stage' && [...stage.left, ...stage.right].filter(actor => actor.subject).length > 1) issues.push({ pageId: page.id, pageNumber, message: '첫 컷의 중심 인물은 한 명만 정할 수 있어요.' });
  });
  for (const pageId of Object.keys(stages)) if (!ids.has(pageId)) issues.push({ pageId, pageNumber: 0, message: '그림책에 없는 쪽의 선택이 있어요. 준비 화면을 다시 열어 주세요.' });
  return issues;
}

export function convertPicturebookToChapters(input: PicturebookConversionInput): PicturebookConversion {
  const { book, stages } = input;
  const issues = picturebookConversionIssues(book, stages);
  if (issues.length) throw new PicturebookConversionError(issues);
  const used = new Set<string>([input.workId]);
  const fresh = () => {
    const id = input.createId();
    if (typeof id !== 'string' || !id.trim() || used.has(id)) throw new Error('새 장·컷 구분 정보가 겹쳤어요. 다시 시도해 주세요.');
    used.add(id); return id;
  };
  if (!input.workId.trim()) throw new Error('작품 구분 정보를 확인해 주세요.');
  const links: PicturebookChapterLink[] = [];
  const chapters: Chapter[] = [], lines: StoryLine[] = [];
  book.pages.forEach((page, index) => {
    const chapterId = fresh(), lineId = fresh(), number = index + 1;
    const sketch = sketchOf(page);
    const stage = stages[page.id] ?? { kind: 'reference' as const };
    chapters.push({
      id: chapterId, order: number, chapterNumber: number, title: page.title, summary: page.text,
      purpose: '', mood: '', keyEvents: '', nextChapterIdea: '', storyStageKeys: [], chapterSpeakerNames: [],
      characterAssetIds: [], backgroundAssetIds: [], backgroundId: '', leftAssetId: '', rightAssetId: '',
      ...(sketch ? { picturebookSketch: stage.kind === 'stage' && stage.recipeVersion !== undefined ? { ...sketch, recipeVersion: stage.recipeVersion } : sketch } : {}),
    });
    lines.push(firstCut(lineId, chapterId, stage));
    links.push({ pageId: page.id, chapterId, lineId });
  });
  const project: StoryProject = {
    id: input.workId, title: book.title.trim() ? book.title : '제목 없는 그림책', description: book.description, choiceMode: 'simple',
    planning: { ...BLANK_PLANNING }, creativeMemos: [], sheetUrl: '', sheetEditable: false, speakerNames: [],
    chapters, lines, updatedAt: input.updatedAt, ...(input.cover ? { cover: structuredClone(input.cover) } : {}),
  };
  const loaded = parseStoryDocument(createStoryDocument({ project, savedAt: input.updatedAt, appVersion: 'knolstory-picturebook' }));
  if (!loaded.ok) throw new Error(loaded.issues.map(issue => issue.message).join('\n'));
  assertSequentialReading(project, links);
  return { project, chapters: links };
}

/** Chapters read first to last in page order and the story ends after the last one. */
export function assertSequentialReading(project: StoryProject, links: readonly PicturebookChapterLink[]): void {
  const order = orderedLines(project).map(line => line.id);
  if (order.join('\n') !== links.map(link => link.lineId).join('\n')) throw new Error('장 순서가 그림책 쪽 순서와 달라요.');
  let state = createPlayback(project);
  const visited: string[] = [];
  for (let step = 0; step <= links.length && state.lineId !== null; step++) {
    visited.push(state.lineId);
    compileStoryScene(project, state.lineId, step, { mode: 'play', playbackPath: state.path, playbackState: state });
    state = advancePlayback(project, state);
  }
  if (state.status !== 'ended' || visited.join('\n') !== order.join('\n')) throw new Error('첫 장부터 마지막 장까지 이어 읽히지 않아요.');
}
