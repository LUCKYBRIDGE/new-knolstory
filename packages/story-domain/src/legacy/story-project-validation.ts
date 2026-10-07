import { isStoryAudio } from "./story-audio";
import { isStageComposition, stageProjection } from "./story-stage-composition";
import { isStoryPresentation, migrateLegacyPresentation, normalizePresentation } from "./story-presentation";
import { isStorySource } from "./story-source";
import { isStoryFlow } from "./story-flow";
import { isStoryCover } from "./story-cover";
import { isStorySceneEffect } from "./story-scene-effect";
import { normalizeCreativeMemos } from "./creative-memos";
import type { Chapter, StoryLine, StoryPlanning, StoryProject } from "./story-data";
import {
  canonicalizeStoryStageKeys,
  isStoryStageKey,
  type StoryStageKey,
} from "./story-stages";

export type StoryDocumentIssue = {
  code:
    | "invalid-json"
    | "invalid-type"
    | "missing-required-field"
    | "invalid-value"
    | "unsupported-document-type"
    | "unsupported-schema-version"
    | "legacy-metadata-required"
    | "invalid-legacy-metadata"
    | "duplicate-id"
    | "broken-reference";
  path: string;
  message: string;
};

type UnknownRecord = Record<string, unknown>;

const EMPTY_PLANNING: StoryPlanning = {
  premise: "",
  structureMode: "five",
  material: "",
  theme: "",
  mainCharacter: "",
  mainGoal: "",
  centralProblem: "",
  stakes: "",
  endingChange: "",
  opening: "",
  middle: "",
  crisis: "",
  climax: "",
  ending: "",
  characterNotes: "",
  worldNotes: "",
  mood: "",
  openQuestions: "",
  freeNotes: "",
};

const PLANNING_TEXT_FIELDS = [
  "premise",
  "material",
  "theme",
  "mainCharacter",
  "mainGoal",
  "centralProblem",
  "stakes",
  "endingChange",
  "opening",
  "middle",
  "crisis",
  "climax",
  "ending",
  "characterNotes",
  "worldNotes",
  "mood",
  "openQuestions",
  "freeNotes",
] as const;

function addIssue(
  issues: StoryDocumentIssue[],
  code: StoryDocumentIssue["code"],
  path: string,
  message: string,
) {
  issues.push({ code, path, message });
}

function asRecord(value: unknown): UnknownRecord | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : undefined;
}

function requiredString(
  record: UnknownRecord,
  key: string,
  path: string,
  issues: StoryDocumentIssue[],
) {
  const value = record[key];
  if (typeof value === "string") return value;
  addIssue(
    issues,
    value === undefined ? "missing-required-field" : "invalid-type",
    `${path}.${key}`,
    value === undefined ? `${key} is required.` : `${key} must be a string.`,
  );
  return "";
}

function optionalString(
  record: UnknownRecord,
  key: string,
  path: string,
  issues: StoryDocumentIssue[],
) {
  const value = record[key];
  if (value === undefined) return "";
  if (typeof value === "string") return value;
  addIssue(issues, "invalid-type", `${path}.${key}`, `${key} must be a string.`);
  return "";
}

function requiredBoolean(
  record: UnknownRecord,
  key: string,
  path: string,
  issues: StoryDocumentIssue[],
) {
  const value = record[key];
  if (typeof value === "boolean") return value;
  addIssue(
    issues,
    value === undefined ? "missing-required-field" : "invalid-type",
    `${path}.${key}`,
    value === undefined ? `${key} is required.` : `${key} must be a boolean.`,
  );
  return false;
}

function requiredNumber(
  record: UnknownRecord,
  key: string,
  path: string,
  issues: StoryDocumentIssue[],
) {
  const value = record[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  addIssue(
    issues,
    value === undefined ? "missing-required-field" : "invalid-type",
    `${path}.${key}`,
    value === undefined
      ? `${key} is required.`
      : `${key} must be a finite number.`,
  );
  return 0;
}

function optionalStringArray(
  record: UnknownRecord,
  key: string,
  path: string,
  issues: StoryDocumentIssue[],
) {
  const value = record[key];
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    addIssue(
      issues,
      "invalid-type",
      `${path}.${key}`,
      `${key} must be an array of strings.`,
    );
    return [];
  }
  return [...value];
}

function normalizePlanning(value: unknown, issues: StoryDocumentIssue[]) {
  if (value === undefined) return { ...EMPTY_PLANNING };
  const record = asRecord(value);
  if (!record) {
    addIssue(issues, "invalid-type", "$.project.planning", "planning must be an object.");
    return { ...EMPTY_PLANNING };
  }
  const planning = { ...EMPTY_PLANNING };
  for (const key of PLANNING_TEXT_FIELDS) {
    const fieldValue = record[key];
    if (fieldValue === undefined) continue;
    if (typeof fieldValue === "string") planning[key] = fieldValue;
    else {
      addIssue(
        issues,
        "invalid-type",
        `$.project.planning.${key}`,
        `${key} must be a string.`,
      );
    }
  }
  if (record.structureMode !== undefined) {
    if (["free", "five", "four", "three"].includes(String(record.structureMode))) {
      planning.structureMode = record.structureMode as StoryPlanning["structureMode"];
    } else {
      addIssue(
        issues,
        "invalid-value",
        "$.project.planning.structureMode",
        "structureMode must be five, four, or three.",
      );
    }
  }
  return planning;
}

function optionalStoryStageKeys(
  record: UnknownRecord,
  key: string,
  path: string,
  issues: StoryDocumentIssue[],
): StoryStageKey[] {
  const value = record[key];
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    addIssue(
      issues,
      "invalid-type",
      `${path}.${key}`,
      `${key} must be an array of story stage keys.`,
    );
    return [];
  }
  for (let i = 0; i < value.length; i++) {
    const item = value[i];
    if (typeof item !== "string") {
      addIssue(
        issues,
        "invalid-type",
        `${path}.${key}[${i}]`,
        `${key}[${i}] must be a string.`,
      );
    } else if (!isStoryStageKey(item)) {
      addIssue(
        issues,
        "invalid-value",
        `${path}.${key}[${i}]`,
        `${item} is not a valid story stage key.`,
      );
    }
  }
  return canonicalizeStoryStageKeys(value);
}

function emptyChapter(index: number): Chapter {
  return {
    id: `invalid-chapter-${index + 1}`,
    order: index + 1,
    title: "",
    summary: "",
    purpose: "",
    mood: "",
    keyEvents: "",
    nextChapterIdea: "",
    storyStageKeys: [],
    chapterSpeakerNames: [],
    characterAssetIds: [],
    backgroundAssetIds: [],
    backgroundId: "",
    leftAssetId: "",
    rightAssetId: "",
  };
}

function normalizeChapters(value: unknown, issues: StoryDocumentIssue[]): Chapter[] {
  if (!Array.isArray(value)) {
    addIssue(
      issues,
      value === undefined ? "missing-required-field" : "invalid-type",
      "$.project.chapters",
      "chapters must be an array.",
    );
    return [];
  }
  return value.map((rawChapter, index) => {
    const path = `$.project.chapters[${index}]`;
    const record = asRecord(rawChapter);
    if (!record) {
      addIssue(issues, "invalid-type", path, "chapter must be an object.");
      return emptyChapter(index);
    }
    if (record.chapterNumber !== undefined && (!Number.isSafeInteger(record.chapterNumber) || (record.chapterNumber as number) < 1)) addIssue(issues, "invalid-value", `${path}.chapterNumber`, "장 번호는 1 이상의 정수로 입력해 주세요.");
    if (record.branchLabel !== undefined && (typeof record.branchLabel !== "string" || record.branchLabel.length > 20)) addIssue(issues, "invalid-value", `${path}.branchLabel`, "갈래 표시는 20자 이내로 입력해 주세요.");
    if (record.audio !== undefined && !isStoryAudio(record.audio)) addIssue(issues, "invalid-value", `${path}.audio`, "장 오디오 설정을 확인해 주세요.");
    return {
      ...(typeof record.chapterNumber === "number" ? { chapterNumber: record.chapterNumber } : {}),
      ...(typeof record.branchLabel === "string" ? { branchLabel: record.branchLabel } : {}),
      ...(isStoryAudio(record.audio) ? {audio: structuredClone(record.audio)} : {}),
      id: requiredString(record, "id", path, issues),
      order: requiredNumber(record, "order", path, issues),
      title: requiredString(record, "title", path, issues),
      summary: requiredString(record, "summary", path, issues),
      purpose: optionalString(record, "purpose", path, issues),
      mood: optionalString(record, "mood", path, issues),
      keyEvents: optionalString(record, "keyEvents", path, issues),
      nextChapterIdea: optionalString(record, "nextChapterIdea", path, issues),
      storyStageKeys: optionalStoryStageKeys(record, "storyStageKeys", path, issues),
      chapterSpeakerNames: optionalStringArray(record, "chapterSpeakerNames", path, issues),
      characterAssetIds: optionalStringArray(record, "characterAssetIds", path, issues),
      backgroundAssetIds: optionalStringArray(record, "backgroundAssetIds", path, issues),
      backgroundId: optionalString(record, "backgroundId", path, issues),
      leftAssetId: optionalString(record, "leftAssetId", path, issues),
      rightAssetId: optionalString(record, "rightAssetId", path, issues),
    };
  });
}

function emptyLine(index: number): StoryLine {
  return {
    id: `invalid-line-${index + 1}`,
    chapterId: "",
    order: index + 1,
    type: "narration",
    speaker: "narration",
    speakerName: "",
    text: "",
    leftAssetId: "",
    rightAssetId: "",
    backgroundId: "",
    purposeNote: "",
    emotionNote: "",
    directionNote: "",
  };
}

function normalizeLines(value: unknown, issues: StoryDocumentIssue[]): StoryLine[] {
  if (!Array.isArray(value)) {
    addIssue(
      issues,
      value === undefined ? "missing-required-field" : "invalid-type",
      "$.project.lines",
      "lines must be an array.",
    );
    return [];
  }
  return value.map((rawLine, index) => {
    const path = `$.project.lines[${index}]`;
    const record = asRecord(rawLine);
    if (!record) {
      addIssue(issues, "invalid-type", path, "line must be an object.");
      return emptyLine(index);
    }
    if (record.audio !== undefined && !isStoryAudio(record.audio)) addIssue(issues, "invalid-value", `${path}.audio`, "컷 오디오 설정을 확인해 주세요.");
    if (record.effect !== undefined && !isStorySceneEffect(record.effect)) {
      addIssue(issues, "invalid-value", `${path}.effect`, "Invalid scene effect settings.");
    }
    if (record.presentation !== undefined && !isStoryPresentation(record.presentation)) {
      addIssue(issues, "invalid-value", `${path}.presentation`, "Invalid presentation settings.");
    }
    if (record.effect !== undefined && record.presentation !== undefined) addIssue(issues, "invalid-value", path, "Conflicting legacy effect and presentation.");
    if (record.flow !== undefined && !isStoryFlow(record.flow)) {
      addIssue(issues, "invalid-value", `${path}.flow`, "선택지는 2개 또는 3개이며 문구와 도착 컷이 있어야 해요.");
    }
    if (record.stageComposition !== undefined && !isStageComposition(record.stageComposition)) addIssue(issues, "invalid-value", `${path}.stageComposition`, "무대에는 각 영역에 두 명까지, 서로 다른 인물 키와 유효한 화자가 필요해요.");
    if (record.inheritActors !== undefined && typeof record.inheritActors !== "boolean") addIssue(issues, "invalid-type", `${path}.inheritActors`, "인물 상속 설정을 확인해 주세요.");
    if (record.backgroundMode !== undefined && (record.backgroundMode !== "none" || record.backgroundId !== "")) addIssue(issues, "invalid-value", `${path}.backgroundMode`, "그림 없음으로 설정할 때는 배경 ID를 비워 주세요.");
    const type = record.type;
    const speaker = record.speaker;
    if (type !== "dialogue" && type !== "narration") {
      addIssue(issues, "invalid-value", `${path}.type`, "type must be dialogue or narration.");
    }
    if (speaker !== "left" && speaker !== "right" && speaker !== "narration") {
      addIssue(issues, "invalid-value", `${path}.speaker`, "speaker must be left, right, or narration.");
    }
    return {
      id: requiredString(record, "id", path, issues),
      chapterId: requiredString(record, "chapterId", path, issues),
      order: requiredNumber(record, "order", path, issues),
      type: type === "dialogue" || type === "narration" ? type : "narration",
      speaker:
        speaker === "left" || speaker === "right" || speaker === "narration"
          ? speaker
          : "narration",
      speakerName: requiredString(record, "speakerName", path, issues),
      ...(record.coSpeakerNames !== undefined ? {coSpeakerNames: optionalStringArray(record, "coSpeakerNames", path, issues)} : {}),
      text: requiredString(record, "text", path, issues),
      leftAssetId: requiredString(record, "leftAssetId", path, issues),
      rightAssetId: requiredString(record, "rightAssetId", path, issues),
      backgroundId: requiredString(record, "backgroundId", path, issues),
      ...(record.backgroundMode === "none" ? {backgroundMode: "none" as const} : {}),
      ...(typeof record.inheritActors === "boolean" ? {inheritActors:record.inheritActors} : {}),
      ...(record.workingTitle !== undefined ? { workingTitle: optionalString(record, "workingTitle", path, issues) } : {}),
      ...(record.ending && typeof record.ending === "object" && typeof (record.ending as Record<string, unknown>).name === "string" ? { ending: { name: String((record.ending as Record<string, unknown>).name), description: String((record.ending as Record<string, unknown>).description ?? ""), endsStory: (record.ending as Record<string, unknown>).endsStory !== false } } : {}),
      purposeNote: optionalString(record, "purposeNote", path, issues),
      emotionNote: optionalString(record, "emotionNote", path, issues),
      directionNote: optionalString(record, "directionNote", path, issues),
      ...(isStoryAudio(record.audio) ? {audio: structuredClone(record.audio)} : {}),
      ...(isStageComposition(record.stageComposition) ? {stageComposition: structuredClone(record.stageComposition), ...stageProjection(record.stageComposition)} : {}),
      ...(isStoryFlow(record.flow) ? { flow: structuredClone(record.flow) } : {}),
      ...(isStoryPresentation(record.presentation) ? { presentation: normalizePresentation(record.presentation) } : isStorySceneEffect(record.effect) ? { presentation: migrateLegacyPresentation(record.effect) } : {}),
    };
  });
}

function normalizeContinuation(value: unknown, issues: StoryDocumentIssue[]) {
  if (value === undefined) return undefined;
  const record = asRecord(value);
  if (!record) {
    addIssue(issues, "invalid-type", "$.project.continuation", "continuation must be an object.");
    return undefined;
  }
  return {
    chapterId: requiredString(record, "chapterId", "$.project.continuation", issues),
    lineId: requiredString(record, "lineId", "$.project.continuation", issues),
    label: requiredString(record, "label", "$.project.continuation", issues),
  };
}

function validateUniqueIds(
  values: Array<{ id: string }>,
  path: string,
  label: string,
  issues: StoryDocumentIssue[],
) {
  const seen = new Set<string>();
  values.forEach((value, index) => {
    if (seen.has(value.id)) {
      addIssue(
        issues,
        "duplicate-id",
        `${path}[${index}].id`,
        `${label} ID '${value.id}' is duplicated.`,
      );
    }
    seen.add(value.id);
  });
}

export function normalizeAndValidateStoryProject(value: unknown) {
  const issues: StoryDocumentIssue[] = [];
  const record = asRecord(value);
  if (!record) {
    addIssue(issues, "invalid-type", "$.project", "project must be an object.");
    return { issues };
  }
  if (record.cover !== undefined && !isStoryCover(record.cover)) {
    addIssue(issues, "invalid-value", "$.project.cover", "표지 설정을 읽을 수 없어요. 원본을 보관하고 표지 설정을 확인해 주세요.");
  }
  if (record.source !== undefined && !isStorySource(record.source)) {
    addIssue(issues, "invalid-value", "$.project.source", "작품 출처 정보를 읽을 수 없어요.");
  }
  if (record.choiceMode !== undefined && !["simple","choice","free"].includes(String(record.choiceMode))) addIssue(issues,"invalid-value","$.project.choiceMode","이야기 모드를 확인해 주세요.");
  const stageDefaults = record.stageDefaults === undefined ? undefined : asRecord(record.stageDefaults);
  if (record.stageDefaults !== undefined && !stageDefaults) addIssue(issues, "invalid-type", "$.project.stageDefaults", "작품 기본 무대 설정을 확인해 주세요.");
  const project: StoryProject = {
    ...(isStorySource(record.source) ? { source: structuredClone(record.source) } : {}),
    ...(isStoryCover(record.cover) ? { cover: structuredClone(record.cover) } : {}),
    ...(record.choiceMode === "simple" || record.choiceMode === "choice" || record.choiceMode === "free" ? {choiceMode:record.choiceMode} : {}),
    ...(stageDefaults ? {stageDefaults:{backgroundId:optionalString(stageDefaults,"backgroundId","$.project.stageDefaults",issues),leftAssetId:optionalString(stageDefaults,"leftAssetId","$.project.stageDefaults",issues),rightAssetId:optionalString(stageDefaults,"rightAssetId","$.project.stageDefaults",issues)}} : {}),
    id: requiredString(record, "id", "$.project", issues),
    title: requiredString(record, "title", "$.project", issues),
    description: requiredString(record, "description", "$.project", issues),
    planning: normalizePlanning(record.planning, issues),
    creativeMemos: normalizeCreativeMemos(record.creativeMemos),
    ...(Array.isArray(record.characters) ? { characters: record.characters.filter((value): value is Record<string, unknown> => Boolean(value && typeof value === "object" && !Array.isArray(value))).map((value, index) => ({
      id: typeof value.id === "string" && value.id ? value.id : `character-${index+1}`,
      name: typeof value.name === "string" ? value.name : "",
      role: typeof value.role === "string" ? value.role : "",
      description: typeof value.description === "string" ? value.description : "",
      defaultImageId: typeof value.defaultImageId === "string" ? value.defaultImageId : "",
    })) } : {}),
    sheetUrl: requiredString(record, "sheetUrl", "$.project", issues),
    sheetEditable: requiredBoolean(record, "sheetEditable", "$.project", issues),
    speakerNames: optionalStringArray(record, "speakerNames", "$.project", issues),
    chapters: normalizeChapters(record.chapters, issues),
    lines: normalizeLines(record.lines, issues),
    updatedAt: requiredString(record, "updatedAt", "$.project", issues),
  };
  if (record.creativeMemos !== undefined && !Array.isArray(record.creativeMemos)) {
    addIssue(issues, "invalid-type", "$.project.creativeMemos", "creativeMemos must be an array when present.");
  }
  const continuation = normalizeContinuation(record.continuation, issues);
  if (continuation) project.continuation = continuation;

  validateUniqueIds(project.chapters, "$.project.chapters", "chapter", issues);
  validateUniqueIds(project.lines, "$.project.lines", "line", issues);
  if (project.characters) validateUniqueIds(project.characters, "$.project.characters", "character", issues);
  validateUniqueIds(project.creativeMemos, "$.project.creativeMemos", "memo", issues);
  const chapterIds = new Set(project.chapters.map((chapter) => chapter.id));
  const linesById = new Map(project.lines.map((line) => [line.id, line]));
  project.lines.forEach((line, index) => {
    if (!chapterIds.has(line.chapterId)) {
      addIssue(
        issues,
        "broken-reference",
        `$.project.lines[${index}].chapterId`,
        `line '${line.id}' references missing chapter '${line.chapterId}'.`,
      );
    }
  });
  project.lines.forEach((line, index) => {
    const targets = line.flow?.type === "choice" ? line.flow.options.map(option => option.targetLineId) : line.flow ? [line.flow.targetLineId] : [];
    for (const target of targets) {
      if (target && !linesById.has(target)) addIssue(issues, "broken-reference", `$.project.lines[${index}].flow`, "연결된 도착 컷을 찾을 수 없어요.");
    }
  });
  if (project.continuation) {
    if (!chapterIds.has(project.continuation.chapterId)) {
      addIssue(
        issues,
        "broken-reference",
        "$.project.continuation.chapterId",
        `continuation references missing chapter '${project.continuation.chapterId}'.`,
      );
    }
    const line = linesById.get(project.continuation.lineId);
    if (!line) {
      addIssue(
        issues,
        "broken-reference",
        "$.project.continuation.lineId",
        `continuation references missing line '${project.continuation.lineId}'.`,
      );
    } else if (line.chapterId !== project.continuation.chapterId) {
      addIssue(
        issues,
        "broken-reference",
        "$.project.continuation",
        "continuation line must belong to its continuation chapter.",
      );
    }
  }
  return issues.length > 0 ? { issues } : { project, issues };
}
