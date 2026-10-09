import { resolveStageComposition, stageProjection } from "./story-stage-composition";
import type { StoryLine, StoryProject } from "./story-data";

export type StoryChoice = { id: string; label: string; targetLineId: string | null };
// No flow means the next ordered cut; null is an explicit ending, "" an unfinished link.
export type StoryFlow =
  | { type: "choice"; options: StoryChoice[] }
  | { type: "goto"; targetLineId: string | null };

export function isStoryFlow(value: unknown): value is StoryFlow {
  if (!value || typeof value !== "object") return false;
  const flow = value as StoryFlow;
  const target = (v: unknown) => v === null || typeof v === "string";
  if (flow.type === "goto") return target(flow.targetLineId);
  return flow.type === "choice" && Array.isArray(flow.options) &&
    [2, 3, 4].includes(flow.options.length) && flow.options.every(option =>
      option && typeof option.id === "string" && !!option.id.trim() &&
      typeof option.label === "string" && target(option.targetLineId)) &&
    new Set(flow.options.map(option => option.id)).size === flow.options.length;
}

export function orderedStoryFlowLines(project: Pick<StoryProject, "chapters" | "lines">) {
  return [...project.chapters].sort((a, b) => a.order - b.order).flatMap(chapter =>
    project.lines.filter(line => line.chapterId === chapter.id).sort((a, b) => a.order - b.order));
}

export function storyFlowTargets(lines: StoryLine[], index: number): (string | null)[] {
  const line = lines[index];
  if (!line) return [];
  if (line.ending?.endsStory) return [null];
  if (line.flow?.type === "choice") return line.flow.options.map(option => option.targetLineId);
  if (line.flow?.type === "goto") return [line.flow.targetLineId];
  return [lines[index + 1]?.id ?? null];
}

export type StoryFlowIssue = { lineId: string; message: string; kind: "link" | "label" | "cycle" };
export function findStoryFlowIssues(project: Pick<StoryProject, "chapters" | "lines">): StoryFlowIssue[] {
  const lines = orderedStoryFlowLines(project);
  const ids = new Set(lines.map(line => line.id));
  const issues: StoryFlowIssue[] = [];
  const edges = new Map<string, string[]>();
  lines.forEach((line, index) => {
    if (line.flow?.type === "choice") {
      line.flow.options.forEach((option, i) => {
        if (!option.label.trim()) issues.push({ lineId: line.id, kind: "label", message: `선택지 ${i + 1}의 문구를 써 주세요.` });
      });
    }
    const targets = storyFlowTargets(lines, index);
    targets.forEach(target => {
      if (target !== null && !ids.has(target)) issues.push({ lineId: line.id, kind: "link", message: "연결할 컷이 없어요. 도착 컷을 고르거나 ‘이야기 끝’을 선택해 주세요." });
    });
    edges.set(line.id, targets.filter((id): id is string => id !== null && ids.has(id)));
  });
  // Iterative DFS avoids overflowing the stack on long student works.
  const color = new Map<string, number>();
  for (const line of lines) {
    if (color.has(line.id)) continue;
    const stack: { id: string; exit: boolean }[] = [{ id: line.id, exit: false }];
    while (stack.length) {
      const item = stack.pop()!;
      if (item.exit) { color.set(item.id, 2); continue; }
      if (color.has(item.id)) continue;
      color.set(item.id, 1);
      stack.push({ id: item.id, exit: true });
      for (const target of edges.get(item.id) ?? []) {
        if (color.get(target) === 1) issues.push({ lineId: item.id, kind: "cycle", message: "이 연결은 앞의 컷으로 계속 되돌아가요. 순환하지 않도록 도착 컷을 바꿔 주세요." });
        else if (!color.has(target)) stack.push({ id: target, exit: false });
      }
    }
  }
  return issues;
}

/** A deleted destination becomes explicitly unfinished, never silently linear. */
export function disconnectStoryFlowTargets(lines: StoryLine[], removedIds: Set<string>): StoryLine[] {
  return lines.map(line => {
    const flow = line.flow;
    if (!flow) return line;
    if (flow.type === "goto") return flow.targetLineId && removedIds.has(flow.targetLineId)
      ? { ...line, flow: { ...flow, targetLineId: "" } } : line;
    return { ...line, flow: { ...flow, options: flow.options.map(option =>
      option.targetLineId && removedIds.has(option.targetLineId) ? { ...option, targetLineId: "" } : option) } };
  });
}

/** Create editable empty branches and a common continuation without writing the story for the student. */
export type ExistingStoryPlacement = "join" | 0 | 1 | 2;

export function createStoryBranches(project: StoryProject, lineId: string, count: 2 | 3, createId: () => string, existingPlacement: ExistingStoryPlacement = "join"): StoryProject {
  const ordered = orderedStoryFlowLines(project);
  const sourceIndex = ordered.findIndex(line => line.id === lineId);
  const source = ordered[sourceIndex];
  const chapter = project.chapters.find(chapter => chapter.id === source?.chapterId);
  if (!source || !chapter || source.flow?.type === "choice") return project;
  const usedIds = new Set([...project.lines, ...project.chapters].map(item => item.id));
  const nextId = () => {
    const id = createId();
    if (!id || usedIds.has(id)) throw new Error("새 흐름 ID가 중복됐어요. 다시 시도해 주세요.");
    usedIds.add(id); return id;
  };
  const joinChapterId = nextId(), joinLineId = nextId();
  const branches = Array.from({ length: count }, (_, i) => ({ chapterId: nextId(), lineId: nextId(), optionId: nextId(), label: `선택 ${i + 1}` }));
  const oldNext = source.flow?.type === "goto" ? source.flow.targetLineId : ordered[sourceIndex + 1]?.id ?? null;
  if (existingPlacement !== "join" && existingPlacement >= count) throw new Error("기존 이야기를 연결할 선택지가 없어요.");
  const assignedBranch = oldNext && existingPlacement !== "join" ? existingPlacement : null;
  const newBranches = branches.filter((_, index) => index !== assignedBranch);
  const oldLast = ordered.at(-1);
  const baseOrder = Math.max(0, ...project.chapters.map(chapter => chapter.order));
  const nextNumber = (chapter.chapterNumber ?? chapter.order) + 1;
  const newChapter = (id: string, title: string, order: number, chapterNumber: number, branchLabel?: string) => ({ ...chapter, id, title, order, chapterNumber, branchLabel, summary: "", purpose: "", mood: "", keyEvents: "", nextChapterIdea: "", storyStageKeys: [] });
  const composition = resolveStageComposition(chapter,source,project);
  const actorFields = source.inheritActors
    ? {stageComposition:undefined,leftAssetId:'',rightAssetId:''}
    : {stageComposition:structuredClone(composition),...stageProjection(composition)};
  const newLine = (id: string, chapterId: string, targetLineId: string | null): StoryLine => ({ ...source, ...actorFields, ending: undefined, audio: undefined, id, chapterId, order: 1, type: "narration", speaker: "narration", speakerName: "해설", text: "", purposeNote: "", emotionNote: "", directionNote: "", presentation: source.presentation?.actors ? {actors:structuredClone(source.presentation.actors)} : undefined, flow: { type: "goto", targetLineId } });
  return {
    ...project,
    chapters: [...project.chapters, ...newBranches.map((branch, i) => newChapter(branch.chapterId, `갈래 ${branches.indexOf(branch) + 1}`, baseOrder + i + 1, nextNumber, String.fromCharCode(65 + branches.indexOf(branch)))), newChapter(joinChapterId, "다시 만나는 이야기", baseOrder + newBranches.length + 1, nextNumber + 1)],
    lines: [...project.lines.map((line): StoryLine => line.id === lineId
      ? { ...line, ...actorFields, ending: undefined, flow: { type: "choice", options: branches.map((branch, index) => ({ id: branch.optionId, label: branch.label, targetLineId: index === assignedBranch ? oldNext : branch.lineId })) } }
      : line.id === oldLast?.id && !line.flow ? { ...line, flow: { type: "goto", targetLineId: null } } : line),
      ...newBranches.map(branch => newLine(branch.lineId, branch.chapterId, joinLineId)), newLine(joinLineId, joinChapterId, assignedBranch === null ? oldNext : null)],
  };
}

/** Add a blank destination for one unfinished choice without moving or deleting existing cuts. */
export function createStoryChoiceChapter(project: StoryProject, lineId: string, optionId: string, createId: () => string) {
  const source = project.lines.find(line => line.id === lineId);
  const chapter = project.chapters.find(item => item.id === source?.chapterId);
  const option = source?.flow?.type === "choice" ? source.flow.options.find(item => item.id === optionId) : undefined;
  if (!source || !chapter || !option || option.targetLineId !== "") throw new Error("연결되지 않은 선택지를 다시 골라 주세요.");
  const usedIds = new Set([...project.chapters, ...project.lines].map(item => item.id));
  const chapterId = createId();
  const cutId = createId();
  if (!chapterId || !cutId || chapterId === cutId || usedIds.has(chapterId) || usedIds.has(cutId)) throw new Error("새 장 ID가 중복됐어요. 다시 시도해 주세요.");
  const composition = resolveStageComposition(chapter, source, project);
  const nextChapter = {
    ...chapter, id: chapterId, chapterNumber: (chapter.chapterNumber ?? chapter.order) + 1, branchLabel: String.fromCharCode(65 + (source.flow?.type === "choice" ? source.flow.options.findIndex(item => item.id === optionId) : 0)), order: Math.max(0, ...project.chapters.map(item => item.order)) + 1,
    title: option.label.trim() || "새 갈래", summary: "", purpose: "", mood: "", keyEvents: "", nextChapterIdea: "", storyStageKeys: [],
  };
  const nextLine: StoryLine = {
    ...source, audio: undefined, id: cutId, chapterId, order: 1, type: "narration", speaker: "narration", speakerName: "해설",
    text: "", workingTitle: "", coSpeakerNames: [], purposeNote: "", emotionNote: "", directionNote: "", ending: undefined,
    ...(source.inheritActors
      ? {stageComposition:undefined,leftAssetId:'',rightAssetId:''}
      : {stageComposition:structuredClone(composition),...stageProjection(composition)}),
    presentation: source.presentation?.actors ? { actors: structuredClone(source.presentation.actors) } : undefined,
    flow: undefined,
  };
  const oldLastId = orderedStoryFlowLines(project).at(-1)?.id;
  return { project: {
    ...project, chapters: [...project.chapters, nextChapter],
    lines: [...project.lines.map(line => line.id === lineId && line.flow?.type === "choice"
      ? { ...line, flow: { ...line.flow, options: line.flow.options.map(item => item.id === optionId ? { ...item, targetLineId: cutId } : item) } } as StoryLine
      : line.id === oldLastId && !line.flow ? { ...line, flow: { type: "goto", targetLineId: null } } as StoryLine : line), nextLine],
  }, line: nextLine };
}
