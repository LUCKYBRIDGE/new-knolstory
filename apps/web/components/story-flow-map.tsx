"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { StoryProject } from "@knolstory/story-domain";
import { analyzeStoryFlow } from "@knolstory/runtime-core";
import styles from "./story-flow-map.module.css";

type Props = {
  project: StoryProject;
  currentLineId: string;
  onSelectCut: (lineId: string, repair?: { choiceId?: string; kind?: string }) => void;
  onClose: () => void;
};
type FlowGraph = ReturnType<typeof analyzeStoryFlow>;
type FlowNode = FlowGraph["nodes"][number];
type FlowEdge = FlowGraph["edges"][number];
type Scope = "all" | "issues" | "unreachable";

function location(node: FlowNode) {
  return `${node.chapterLabel} · ${node.order}컷`;
}
function edgeDestination(edge: FlowEdge, nodes: Map<string, FlowNode>) {
  if (edge.status === "pending") return "연결 대기";
  if (edge.status === "ending") return "이야기 끝";
  const target = edge.targetLineId ? nodes.get(edge.targetLineId) : undefined;
  return target ? location(target) : "도착 컷 없음";
}
function NodeBadges({ node, current, start }: { node: FlowNode; current: boolean; start: boolean }) {
  return <span className={styles.badges}>
    {current && <span className={styles.currentBadge}>현재 편집</span>}
    {start && <span>시작</span>}
    {node.kind === "choice" && <span>선택 · 분기</span>}
    {node.shared && <span className={styles.sharedBadge}>합류 · 공유 컷</span>}
    {node.kind === "ending" && <span>이야기 끝 · 엔딩</span>}
    {!node.reachable && <span className={styles.issueBadge}>도달 불가</span>}
  </span>;
}

/** Structural navigation only; story presentation remains in Ren'Py. */
export function StoryFlowMap({ project, currentLineId, onSelectCut, onClose }: Props) {
  const graph = useMemo(() => analyzeStoryFlow(project), [project]);
  const nodeById = useMemo(() => new Map(graph.nodes.map(node => [node.lineId, node])), [graph]);
  const outgoing = useMemo(() => {
    const result = new Map<string, FlowEdge[]>();
    for (const edge of graph.edges) result.set(edge.sourceLineId, [...(result.get(edge.sourceLineId) ?? []), edge]);
    return result;
  }, [graph]);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const legendId = useId();
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<Scope>("all");
  const [expanded, setExpanded] = useState<string[]>(() => graph.nodes.length <= 80
    ? [...new Set(graph.nodes.map(node => node.chapterId))]
    : [nodeById.get(currentLineId)?.chapterId ?? ""]);
  const [issueLimit, setIssueLimit] = useState(50);
  const [chapterLimits, setChapterLimits] = useState<Record<string, number>>({});
  useEffect(() => {
    const dialog = dialogRef.current;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (dialog && !dialog.open) dialog.showModal();
    closeRef.current?.focus();
    return () => { dialog?.close(); if (opener?.isConnected) opener.focus(); };
  }, []);
  const issueIds = useMemo(() => new Set(graph.issues.map(issue => issue.lineId)), [graph]);
  const search = query.trim().toLocaleLowerCase();
  const matches = (node: FlowNode) => (scope === "all" || (scope === "issues" ? issueIds.has(node.lineId) : !node.reachable))
    && (!search || [node.chapterLabel, node.text, node.lineId, ...(outgoing.get(node.lineId) ?? []).map(edge => edge.label)].join(" ").toLocaleLowerCase().includes(search));
  const visible = graph.nodes.filter(matches);
  const chapters = [...new Set(visible.map(node => node.chapterId))].map(id => ({
    id, title: visible.find(node => node.chapterId === id)!.chapterLabel,
    nodes: visible.filter(node => node.chapterId === id),
  }));
  const current = nodeById.get(currentLineId);
  const visibleIssues = graph.issues.filter(issue => {
    const node = nodeById.get(issue.lineId);
    return node && matches(node);
  });
  function openCut(lineId: string) { onSelectCut(lineId); }
  function toggleChapter(id: string) {
    setExpanded(previous => previous.includes(id) ? previous.filter(value => value !== id) : [...previous, id]);
  }
  return <dialog ref={dialogRef} className={styles.dialog} aria-labelledby={titleId} aria-describedby={legendId}
    onCancel={event => { event.preventDefault(); onClose(); }}
    onClick={event => {
      const bounds = event.currentTarget.getBoundingClientRect();
      if (event.target === event.currentTarget && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) onClose();
    }}>
    <header className={styles.header}>
      <div><p className={styles.eyebrow}>이야기의 길을 살펴보세요</p><h2 id={titleId}>전체 이야기 흐름</h2></div>
      <button ref={closeRef} onClick={onClose} aria-label="전체 흐름 닫기">닫기</button>
    </header>
    <div className={styles.body}>
      <p className={styles.context}>현재 위치: <strong>{current ? location(current) : "선택한 컷 없음"}</strong> · 전체 {graph.nodes.length}컷 · 합류 {graph.nodes.filter(node => node.shared).length}곳 · 확인할 항목 {graph.issues.length}개</p>
      <p id={legendId} className={styles.legend}>화살표는 이야기 진행 방향입니다. 분기는 선택지에 따라 길이 나뉘고, 합류 · 공유 컷은 여러 연결이 만나는 장면입니다. 공유 컷을 수정하면 그 컷을 지나는 모든 경로에 반영됩니다.</p>
      <div className={styles.filters}>
        <label>흐름 검색<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="장 제목, 컷 내용, 선택지" /></label>
        <label>표시 범위<select value={scope} onChange={event => setScope(event.target.value as Scope)}><option value="all">전체 컷</option><option value="issues">확인할 연결</option><option value="unreachable">도달할 수 없는 컷</option></select></label>
      </div>
      <p role="status" className={styles.result}>{visible.length}컷 표시 · 컷을 선택하면 편집 화면으로 이동합니다.</p>
      {graph.nodes.length <= 80 && scope === "all" && !search && <FlowDiagram graph={graph} currentLineId={currentLineId} onSelectCut={openCut} />}
      {graph.nodes.length > 80 && <p className={styles.legend}>긴 작품은 장별로 펼쳐 살펴보세요. 검색하거나 표시 범위를 바꾸면 해당 컷을 모아 볼 수 있습니다.</p>}
      <section className={styles.issues} aria-label="흐름 확인 항목">
        <h3>확인할 연결과 컷</h3>
        {visibleIssues.length === 0 ? <p>{graph.issues.length === 0 ? "연결 대기나 도달할 수 없는 컷이 없습니다." : "현재 검색·표시 범위에 확인할 항목이 없습니다."}</p> : <>
          <ul>{visibleIssues.slice(0, issueLimit).map((issue, index) => <li key={`${issue.lineId}:${issue.choiceId ?? issue.kind}:${index}`}>
            <button data-flow-issue-line-id={issue.lineId} onClick={() => onSelectCut(issue.lineId, { choiceId: issue.choiceId, kind: issue.kind })}>
              <strong>{location(nodeById.get(issue.lineId)!)}</strong><span>{issue.message}</span><span className={styles.editHint}>이 컷에서 수정 →</span>
            </button>
          </li>)}</ul>
          {visibleIssues.length > issueLimit && <button onClick={() => setIssueLimit(previous => previous + 50)}>확인 항목 50개 더 보기 ({visibleIssues.length - issueLimit}개 남음)</button>}
        </>}
      </section>
      <section aria-label="장별 이야기 흐름" className={styles.chapters}>
        {chapters.length === 0 && <p>조건에 맞는 컷이 없습니다. 검색어나 표시 범위를 바꿔 보세요.</p>}
        {chapters.map(chapter => {
          const open = Boolean(search) || scope !== "all" || expanded.includes(chapter.id);
          const limit = chapterLimits[chapter.id] ?? 100;
          return <details key={chapter.id} open={open} className={styles.chapter} onToggle={event => {
            if (!search && scope === "all" && event.currentTarget.open !== expanded.includes(chapter.id)) toggleChapter(chapter.id);
          }}>
            <summary>{chapter.title} <span>{chapter.nodes.length}컷{chapter.nodes.some(node => node.lineId === currentLineId) ? " · 현재 편집 장" : ""}</span></summary>
            {open && <><ol className={styles.cuts}>{chapter.nodes.slice(0, limit).map(node => <li key={node.lineId} className={node.lineId === currentLineId ? styles.currentCut : undefined}>
              <button data-flow-list-line-id={node.lineId} className={styles.cutButton} aria-current={node.lineId === currentLineId ? "true" : undefined} onClick={() => openCut(node.lineId)} aria-label={`${location(node)} 편집`}>
                <strong>{location(node)}</strong><NodeBadges node={node} current={node.lineId === currentLineId} start={node.lineId === graph.startLineId} />
                <span className={styles.authoredText}>{node.text || "아직 글이 없는 컷"}</span>
              </button>
              <ul className={styles.connections}>{(outgoing.get(node.lineId) ?? []).map(edge => <li key={edge.id}>
                <span className={styles.arrow} aria-hidden="true">↳ →</span><span className={styles.connectionLabel}>{edge.label || "다음"}</span>
                {edge.status === "connected" && edge.targetLineId ? <button onClick={() => openCut(edge.targetLineId!)} aria-label={`도착 컷 ${edgeDestination(edge, nodeById)} 편집`}>{edgeDestination(edge, nodeById)}</button> : <span className={edge.status === "ending" ? styles.terminal : styles.issueBadge}>{edgeDestination(edge, nodeById)}</span>}
              </li>)}</ul>
            </li>)}</ol>{chapter.nodes.length > limit && <button className={styles.moreCuts} onClick={() => setChapterLimits(previous => ({ ...previous, [chapter.id]: limit + 100 }))}>이 장의 컷 100개 더 보기 ({chapter.nodes.length - limit}컷 남음)</button>}</>}
          </details>;
        })}
      </section>
    </div>
  </dialog>;
}

function diagramLayout(graph: FlowGraph) {
  const nodeWidth = 164;
  const columnGap = 25;
  const rowGap = 28;
  const margin = 24;
  const nodeById = new Map(graph.nodes.map(node => [node.lineId, node]));
  const connected = graph.edges.filter(edge => edge.status === "connected" && edge.targetLineId && nodeById.has(edge.targetLineId));
  const remaining = new Map(graph.nodes.map(node => [node.lineId, connected.filter(edge => edge.targetLineId === node.lineId).length]));
  const depth = new Map(graph.nodes.map(node => [node.lineId, 0]));
  const queue = graph.nodes.filter(node => remaining.get(node.lineId) === 0).map(node => node.lineId);
  const processed = new Set<string>();
  for (let index = 0; index < queue.length; index += 1) {
    const id = queue[index]!;
    processed.add(id);
    for (const edge of connected.filter(candidate => candidate.sourceLineId === id)) {
      const target = edge.targetLineId!;
      depth.set(target, Math.max(depth.get(target) ?? 0, (depth.get(id) ?? 0) + 1));
      remaining.set(target, (remaining.get(target) ?? 1) - 1);
      if (remaining.get(target) === 0) queue.push(target);
    }
  }
  // Cyclic sections remain navigable without an unbounded depth relaxation.
  let fallback = Math.max(0, ...depth.values()) + 1;
  for (const node of graph.nodes.filter(candidate => !processed.has(candidate.lineId))) depth.set(node.lineId, fallback++);
  const columns = [...new Set(depth.values())].sort((a, b) => a - b).map(value => graph.nodes.filter(node => depth.get(node.lineId) === value));
  const positions = new Map<string, { x: number; y: number; height: number }>();
  let width = margin * 2;
  let height = margin * 2;
  for (const [columnIndex, column] of columns.entries()) {
    let top = margin;
    const left = margin + columnIndex * (nodeWidth + columnGap);
    for (const node of column) {
      const nodeHeight = 72 + Math.ceil(location(node).length / 14) * 20
        + node.outgoing.reduce((sum, edge) => sum + Math.ceil(`${edge.label} → ${edgeDestination(edge, nodeById)}`.length / 18) * 18 + 4, 0);
      positions.set(node.lineId, { x: left, y: top, height: nodeHeight });
      top += nodeHeight + rowGap;
      width = Math.max(width, left + nodeWidth + margin);
      height = Math.max(height, top - rowGap + margin);
    }
  }
  return { positions, width: Math.max(300, width), height: Math.max(180, height), nodeById, nodeWidth };
}

function FlowDiagram({ graph, currentLineId, onSelectCut }: { graph: FlowGraph; currentLineId: string; onSelectCut: (id: string) => void }) {
  const arrowId = useId().replace(/:/g, "");
  const { positions, width, height, nodeById, nodeWidth } = diagramLayout(graph);
  return <section aria-label="이야기 연결 지도" className={styles.diagramSection}>
    <h3>이야기 연결 지도</h3>
    <div className={styles.diagramScroll} tabIndex={0} aria-label="이야기 연결 지도 스크롤 영역" data-testid="story-flow-diagram-scroll">
      <div className={styles.diagram} style={{ width, height }}>
        <svg width={width} height={height} className={styles.wires} aria-hidden="true">
          <defs><marker id={arrowId} markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="currentColor" /></marker></defs>
          {graph.edges.filter(edge => edge.status === "connected" && edge.targetLineId).map(edge => {
            const source = positions.get(edge.sourceLineId)!;
            const target = positions.get(edge.targetLineId!);
            if (!target) return null;
            const startX = source.x + nodeWidth;
            const startY = source.y + source.height / 2;
            const endX = target.x;
            const endY = target.y + target.height / 2;
            const bend = Math.max(42, (endX - startX) / 2);
            const curve = `M ${startX} ${startY} C ${startX + bend} ${startY}, ${endX - bend} ${endY}, ${endX} ${endY}`;
            return <path key={edge.id} d={curve} markerEnd={`url(#${arrowId})`} />;
          })}
        </svg>
        {graph.nodes.map(node => {
          const position = positions.get(node.lineId)!;
          return <button key={node.lineId} data-flow-map-line-id={node.lineId} className={`${styles.mapNode} ${node.lineId === currentLineId ? styles.mapCurrent : ""}`} style={{ left: position.x, top: position.y, width: nodeWidth, minHeight: position.height }}
            onClick={() => onSelectCut(node.lineId)} aria-current={node.lineId === currentLineId ? "true" : undefined} aria-label={`지도 ${location(node)} 편집`}>
            <strong>{location(node)}</strong><NodeBadges node={node} current={node.lineId === currentLineId} start={node.lineId === graph.startLineId} />
            {node.outgoing.map(edge => <span key={edge.id} className={styles.mapConnection}>{edge.label || "다음"} → {edgeDestination(edge, nodeById)}</span>)}
          </button>;
        })}
      </div>
    </div>
    <p className={styles.legend}>위에서 아래로 이야기의 길을 따라가세요. 선택지 문구와 도착지는 각 컷에 표시됩니다. 자세한 글은 아래 장별 연결에서 확인할 수 있습니다.</p>
  </section>;
}
