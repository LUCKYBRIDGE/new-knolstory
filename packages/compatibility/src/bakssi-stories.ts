import {
  DEFAULT_COVER,
  parseStoryDocument,
  stageProjection,
  type Chapter,
  type StoryDocumentEnvelope,
  type StoryFlow,
  type StoryLine,
  type StoryPlanning,
  type StoryProject,
} from '@knolstory/story-domain';
import manuscripts from './bakssi-manuscripts.json';
import {bakssiCharacterCatalog, bakssiCutEmotionNote, bakssiCutStage} from './bakssi-staging';

type ManuscriptCut = {
  id: string;
  speaker: string;
  text: string;
  direction: string;
  next?: string | null;
  choices?: {label: string; target: string}[];
};

type Manuscript = {
  intro: string;
  chapters: {number: number; branch: string; title: string; cuts: ManuscriptCut[]}[];
};

const metadata = {savedAt: '2026-11-28T00:00:00.000Z', appVersion: 'knolstory-next-bakssi'};
const narration = '나레이션';
const title = '박씨전';
const unique = <T>(items: readonly T[]) => [...new Set(items)];
const cutId = (id: string) => `bakssi-${id.toLowerCase()}`;

const planning: StoryPlanning = {
  premise: '외면받던 박씨가 피화당을 살피고, 전란이 닥치자 그곳에 모인 사람을 지킨다.',
  structureMode: 'five',
  material: '고전소설 박씨전',
  theme: '겉모습으로 판단하는 일과 위험 속에서 서로의 자리를 만드는 일',
  mainCharacter: '박씨',
  mainGoal: '자신의 삶을 스스로 꾸리고 피화당을 찾아온 사람들을 지키기',
  centralProblem: '가족이 박씨를 외면하고, 조정이 북쪽의 위협을 알리는 경고를 물리친다.',
  stakes: '박씨와 가족, 피화당을 찾은 이웃들의 안위',
  endingChange: '박씨와 가족이 같은 문을 열고 이웃을 맞는 방식이 달라진다.',
  opening: '금강산 혼례 첫날 밤에 이시백이 먼저 자리를 뜬다.',
  middle: '박씨와 계화가 피화당에서 말을 돌보고, 연적을 마련한다.',
  crisis: '기홍대가 찾아오고 병자호란이 일어난다.',
  climax: '박씨가 피화당 사람들을 데려가려는 장수들 앞에 선다.',
  ending: '전란이 지난 뒤 피화당을 함께 지킨 사람들에게 자리가 생긴다.',
  characterNotes: '박씨가 판단하고 행동하며, 계화는 박씨와 이웃 사이의 일을 함께 꾸린다.',
  worldNotes: '조선 인조 때 한양과 금강산을 배경으로 삼은 고전소설의 재화.',
  mood: '따뜻한 일상에서 긴박한 겨울을 거쳐 다시 일상으로 돌아온다.',
  openQuestions: '',
  freeNotes: '첨부 원고와 한국민족문화대백과사전 〈박씨전〉 작품 해설을 바탕으로 재구성.',
};

function flowFor(cut: ManuscriptCut, nextOrderedCut?: string): StoryFlow | undefined {
  if (cut.choices) {
    return {
      type: 'choice',
      options: cut.choices.map((choice, index) => ({
        id: `${cutId(cut.id)}-choice-${index + 1}`,
        label: choice.label,
        targetLineId: cutId(choice.target),
      })),
    };
  }
  // Keep ordinary adjacency implicit so insertions use the editor's usual reading order.
  if (cut.next === undefined || cut.next === nextOrderedCut) return undefined;
  return {type: 'goto', targetLineId: cut.next === null ? null : cutId(cut.next)};
}

function authoredLine(
  cut: ManuscriptCut,
  chapterId: string,
  order: number,
  nextOrderedCut?: string,
): StoryLine {
  const staged = bakssiCutStage(cut.id, cut.speaker);
  const narrationLine = cut.speaker === narration;
  const flow = flowFor(cut, nextOrderedCut);
  return {
    id: cutId(cut.id),
    chapterId,
    order,
    type: narrationLine ? 'narration' : 'dialogue',
    speaker: narrationLine ? 'narration' : staged.speaker,
    speakerName: narrationLine ? '해설' : cut.speaker,
    text: cut.text,
    stageComposition: staged.composition,
    ...stageProjection(staged.composition),
    backgroundId: staged.backgroundId,
    purposeNote: '',
    emotionNote: bakssiCutEmotionNote(cut.id),
    directionNote: cut.direction,
    ...(staged.presentation ? {presentation: staged.presentation} : {}),
    ...(staged.audio ? {audio: staged.audio} : {}),
    ...(flow ? {flow} : {}),
  };
}

function narrativeStage(number: number, interactive: boolean): Chapter['storyStageKeys'] {
  if (number <= 2) return ['opening'];
  if (number <= (interactive ? 8 : 5)) return ['middle'];
  if (number < (interactive ? 11 : 7)) return ['crisis'];
  if (number === (interactive ? 11 : 7)) return ['climax'];
  return ['ending'];
}

function draft(id: string, source: Manuscript, interactive: boolean): StoryProject {
  const orderedChapters = [...source.chapters].sort((left, right) => left.number - right.number);
  const chapterEntries = orderedChapters.map((chapter, index): {chapter: Chapter; lines: StoryLine[]} => {
    const chapterId = `${id}-chapter-${chapter.cuts[0].id.toLowerCase()}`;
    const firstOfNextChapter = orderedChapters[index + 1]?.cuts[0].id;
    const lines = chapter.cuts.map((cut, cutIndex) => authoredLine(
      cut,
      chapterId,
      cutIndex + 1,
      chapter.cuts[cutIndex + 1]?.id ?? firstOfNextChapter,
    ));
    return {
      chapter: {
        id: chapterId,
        order: index + 1,
        title: chapter.title,
        chapterNumber: chapter.number,
        ...(chapter.branch ? {branchLabel: chapter.branch} : {}),
        summary: '',
        purpose: '',
        mood: '',
        keyEvents: '',
        nextChapterIdea: '',
        storyStageKeys: narrativeStage(chapter.number, interactive),
        chapterSpeakerNames: unique(lines.filter(line => line.type === 'dialogue').map(line => line.speakerName)),
        characterAssetIds: unique(lines.flatMap(line => {
          const stage = line.stageComposition!;
          return [...stage.leftActors, ...stage.rightActors].map(actor => actor.assetId);
        })),
        backgroundAssetIds: unique(lines.map(line => line.backgroundId)),
        backgroundId: lines[0].backgroundId,
        leftAssetId: '',
        rightAssetId: '',
      },
      lines,
    };
  });
  return {
    id,
    title,
    description: source.intro,
    choiceMode: interactive ? 'choice' : 'simple',
    cover: {
      ...DEFAULT_COVER,
      author: interactive ? '고전소설 「박씨전」 각색' : '작자 미상 · 고전소설 재화',
      authorNote: interactive
        ? '박씨가 내린 선택이 피화당을 찾아온 사람들에게 어떤 영향을 주었는지 생각해 보세요.'
        : '고전소설의 대표적인 줄거리를 따라 현대어로 다시 썼습니다.',
      subtitle: interactive ? '피화당의 불을 함께 지키는 이야기' : '피화당에 불을 켠 사람',
      theme: 'cream',
      titleSize: 40,
      backgroundId: 'bakssi-stage-courtyard-snow',
      characterId: 'bakssi-character-bakssi',
    },
    planning: {...planning},
    creativeMemos: [],
    sheetUrl: '',
    sheetEditable: false,
    chapters: chapterEntries.map(entry => entry.chapter),
    lines: chapterEntries.flatMap(entry => entry.lines),
    speakerNames: unique(chapterEntries.flatMap(entry => entry.chapter.chapterSpeakerNames)),
    characters: bakssiCharacterCatalog(),
    updatedAt: metadata.savedAt,
  };
}

function validatedDocument(project: StoryProject): StoryDocumentEnvelope {
  const loaded = parseStoryDocument(project, metadata);
  if (!loaded.ok) {
    throw new Error(`${project.id}: ${loaded.issues.map(issue => `${issue.path}: ${issue.message}`).join('\n')}`);
  }
  return loaded.document;
}

export const bakssiClassicStory = validatedDocument(draft('classic-bakssi-tale', manuscripts.classic, false)).project;
export const bakssiKnolStory = validatedDocument(draft('bakssi-knolstory', manuscripts.knolstory, true)).project;

export const getBakssiClassicStory = () => validatedDocument(bakssiClassicStory);
export const getBakssiKnolStory = () => validatedDocument(bakssiKnolStory);
