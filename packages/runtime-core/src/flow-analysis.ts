import { chapterLabel, findStoryFlowIssues, orderedStoryFlowLines, storyFlowTargets, type StoryLine, type StoryProject } from '@knolstory/story-domain';

export type FlowKind = 'choice' | 'goto' | 'linear' | 'ending';
export type FlowEdge = Readonly<{
  id: string;
  sourceLineId: string;
  targetLineId: string | null;
  choiceId?: string;
  label: string;
  kind: FlowKind;
  status: 'connected' | 'pending' | 'ending' | 'missing';
}>;
export type FlowNode = Readonly<{
  lineId: string;
  chapterId: string;
  chapterTitle: string;
  chapterLabel: string;
  order: number;
  text: string;
  kind: FlowKind;
  reachable: boolean;
  shared: boolean;
  incoming: readonly FlowEdge[];
  outgoing: readonly FlowEdge[];
}>;
export type FlowIssue = Readonly<{
  kind: 'pending' | 'unreachable' | 'missing' | 'blank-choice' | 'cycle';
  lineId: string;
  choiceId?: string;
  message: string;
}>;
export type StoryFlowGraph = Readonly<{
  startLineId: string | null;
  nodes: readonly FlowNode[];
  edges: readonly FlowEdge[];
  issues: readonly FlowIssue[];
}>;

function lineKind(line: StoryLine, targets: readonly (string | null)[]): FlowKind {
  if (line.ending?.endsStory) return 'ending';
  if (line.flow?.type === 'choice') return 'choice';
  if (targets[0] === null) return 'ending';
  if (line.flow) return line.flow.type;
  return 'linear';
}

function createEdges(line: StoryLine, targets: readonly (string | null)[], ids: ReadonlySet<string>): FlowEdge[] {
  const kind = lineKind(line, targets);
  return targets.map((target, index) => {
    const option = kind === 'choice' && line.flow?.type === 'choice' ? line.flow.options[index] : undefined;
    const status = target === null ? 'ending' : target === '' ? 'pending' : ids.has(target) ? 'connected' : 'missing';
    return {
      id: JSON.stringify([line.id, index]), sourceLineId: line.id,
      // Invalid targets never participate in graph traversal; preserve strings for repair UI.
      targetLineId: typeof target === 'string' || target === null ? target : null,
      ...(option ? { choiceId: option.id } : {}),
      label: option ? option.label.trim() ? option.label : `선택 ${index + 1}`
        : status === 'ending' ? '이야기 끝' : kind === 'goto' ? '도착 컷' : '다음 컷',
      kind, status,
    };
  });
}

function connectionIssues(line: StoryLine, edges: readonly FlowEdge[]): FlowIssue[] {
  return edges.flatMap(edge => {
    const context = { lineId: line.id, ...(edge.choiceId ? { choiceId: edge.choiceId } : {}) };
    const option = line.flow?.type === 'choice' && edge.kind === 'choice'
      ? line.flow.options.find(item => item.id === edge.choiceId) : undefined;
    const blank: FlowIssue[] = option && !option.label.trim()
      ? [{ ...context, kind: 'blank-choice', message: '선택지 문구를 써 주세요.' }] : [];
    if (edge.status === 'pending') return [...blank, { ...context, kind: 'pending' as const, message: '연결 대기 중이에요. 도착 컷을 고르거나 이야기 끝을 선택해 주세요.' }];
    if (edge.status === 'missing') return [...blank, { ...context, kind: 'missing' as const, message: '도착 컷을 찾을 수 없어요. 연결을 다시 골라 주세요.' }];
    return blank;
  });
}

/** Read-only authoring view of the same ordered cuts and targets used by the domain. */
export function analyzeStoryFlow(project: Pick<StoryProject, 'chapters' | 'lines'>): StoryFlowGraph {
  const lines = orderedStoryFlowLines(project);
  const ids = new Set(lines.map(line => line.id));
  const outgoing = new Map(lines.map((line, index) => [line.id, createEdges(line, storyFlowTargets(lines, index), ids)]));
  const edges = lines.flatMap(line => outgoing.get(line.id)!);
  const incoming = new Map<string, FlowEdge[]>();
  for (const edge of edges) {
    if (edge.status === 'connected' && edge.targetLineId !== null) {
      const list = incoming.get(edge.targetLineId);
      if (list) list.push(edge);
      else incoming.set(edge.targetLineId, [edge]);
    }
  }
  const startLineId = lines[0]?.id ?? null;
  const reachable = new Set<string>();
  const pending = startLineId === null ? [] : [startLineId];
  while (pending.length) {
    const id = pending.pop()!;
    if (reachable.has(id)) continue;
    reachable.add(id);
    for (const edge of outgoing.get(id) ?? []) {
      if (edge.status === 'connected' && edge.targetLineId !== null && !reachable.has(edge.targetLineId)) pending.push(edge.targetLineId);
    }
  }
  const chapters = new Map(project.chapters.map(chapter => [chapter.id, chapter]));
  const nodes = lines.map((line, index): FlowNode => ({
    lineId: line.id, chapterId: line.chapterId, chapterTitle: chapters.get(line.chapterId)!.title, chapterLabel: chapterLabel(chapters.get(line.chapterId)!),
    order: line.order, text: line.text, kind: lineKind(line, storyFlowTargets(lines, index)),
    reachable: reachable.has(line.id), shared: (incoming.get(line.id)?.length ?? 0) >= 2,
    incoming: incoming.get(line.id) ?? [], outgoing: outgoing.get(line.id)!,
  }));
  const issues = [...lines.flatMap(line => connectionIssues(line, outgoing.get(line.id)!)), ...findStoryFlowIssues(project).filter(issue => issue.kind === 'cycle').map(issue => ({ kind: 'cycle' as const, lineId: issue.lineId, message: issue.message }))];
  return { startLineId, nodes, edges, issues: [...issues, ...nodes.filter(node => !node.reachable).map(node => ({
    kind: 'unreachable' as const, lineId: node.lineId, message: '시작 컷에서 도달할 수 없어요. 앞의 선택지나 컷에서 연결해 주세요.',
  }))] };
}
