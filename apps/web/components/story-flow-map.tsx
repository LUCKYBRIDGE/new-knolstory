"use client";
import dialogSurface from './story-dialog-surface.module.css';
import {trapDialogTab} from '../lib/dialog-keyboard';

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { StoryProject } from "@knolstory/story-domain";
import { analyzeStoryFlow } from "@knolstory/runtime-core";
import { describeStoryEdge } from "../lib/story-connection-labels";
import styles from "./story-flow-map.module.css";
import { ChapterStoryMap } from "./chapter-story-map";
import { StoryStructureMap, revealStructureBlock, STRUCTURE_GROUPED_AFTER } from "./story-structure-map";
import { FocusSurface } from "./a2ui/focus-surface";
import { structureSurface } from "./a2ui/editor-surfaces";
import { storyStructure } from "../lib/story-structure-map";

type Props = {
  project: StoryProject;
  currentLineId: string;
  onSelectCut: (lineId: string, repair?: { choiceId?: string; kind?: string }) => void;
  onClose: () => void;
  onArrange?: (renumber: boolean) => void;
  /** Where the author was on the map last time (kept by the editor while the work stays open). */
  memory?: FlowMapMemory;
  onRemember?: (memory: FlowMapMemory) => void;
};
export type FlowMapMemory = Readonly<{ view: "structure" | "chapters"; scrollTop: number }>;
type FlowGraph = ReturnType<typeof analyzeStoryFlow>;
type FlowNode = FlowGraph["nodes"][number];
type FlowEdge = FlowGraph["edges"][number];
function issueDescription(issue: FlowGraph["issues"][number]) {
  if (issue.kind === "pending") return "도착 컷을 정해 주세요. 이야기를 마칠 곳이라면 이야기 끝을 선택해 주세요.";
  if (issue.kind === "unreachable") return "시작부터 이 컷까지 이어지는 길이 없어요. 앞의 컷이나 선택지에서 이 컷으로 오는 길을 정해 주세요.";
  return issue.message;
}
type Scope = "all" | "issues" | "unreachable";

function location(node: FlowNode) {
  return `${node.chapterLabel} · ${node.order}컷`;
}
function edgeDestination(edge: FlowEdge, nodes: Map<string, FlowNode>) {
  if (edge.status === "pending") return "도착 컷을 정해 주세요";
  if (edge.status === "ending") return "이야기 끝";
  const target = edge.targetLineId ? nodes.get(edge.targetLineId) : undefined;
  return target ? location(target) : "도착 컷 없음";
}
function NodeBadges({ node, current, start }: { node: FlowNode; current: boolean; start: boolean }) {
  return <span className={styles.badges}>
    {current && <span className={styles.currentBadge}>현재 편집</span>}
    {start && <span>시작</span>}
    {node.kind === "choice" && <span>선택지</span>}
    {node.shared && <span className={styles.sharedBadge}>여러 갈래에서 함께 쓰는 컷</span>}
    {node.kind === "ending" && <span>이야기 끝</span>}
    {!node.reachable && <span className={styles.issueBadge}>시작부터 이어지는 길 없음</span>}
  </span>;
}

/** Structural navigation only; story presentation remains in Ren'Py. */
export function StoryFlowMap({ project, currentLineId, onSelectCut, onClose, onArrange, memory, onRemember }: Props) {
  const graph = useMemo(() => analyzeStoryFlow(project), [project]);
  const structure = useMemo(() => storyStructure(project, graph), [project, graph]);
  const bodyRef = useRef<HTMLDivElement>(null);
  const nodeById = useMemo(() => new Map(graph.nodes.map(node => [node.lineId, node])), [graph]);
  const outgoing = useMemo(() => {
    const result = new Map<string, FlowEdge[]>();
    for (const edge of graph.edges) result.set(edge.sourceLineId, [...(result.get(edge.sourceLineId) ?? []), edge]);
    return result;
  }, [graph]);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const composing = useRef(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const legendId = useId();
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<Scope>("all");
  // The branch structure reads the same for short and long works (long ones fold by chapter); 장 지도 is the overview.
  const [view, setView] = useState<FlowMapMemory["view"]>(() => memory?.view ?? "structure");
  const viewRef = useRef(view);
  useEffect(() => { viewRef.current = view; }, [view]);
  // Reopening returns to where the author was; selecting a cut closes the map, so remember on the way out.
  // The dialog is closed before this cleanup runs (its scroll then reads 0), so keep the last scroll as it happens.
  const scrolled = useRef(memory?.scrollTop ?? 0);
  useEffect(() => {
    const body = bodyRef.current;
    if (body && memory?.scrollTop) requestAnimationFrame(() => { body.scrollTop = memory.scrollTop; });
    return () => { onRemember?.({ view: viewRef.current, scrollTop: scrolled.current }); };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- restore once on open, remember once on close
  }, []);
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
    return () => {
      dialog?.close();
      const target=opener?.isConnected&&opener!==document.body&&opener.checkVisibility()?opener:document.querySelector<HTMLElement>('[data-work-menu]>summary');
      target?.focus({preventScroll:true});
    };
  }, []);
  const issueIds = useMemo(() => new Set(graph.issues.map(issue => issue.lineId)), [graph]);
  const search = query.trim().toLocaleLowerCase();
  const matches = (node: FlowNode) => (scope === "all" || (scope === "issues" ? issueIds.has(node.lineId) : !node.reachable))
    && (!search || [node.chapterLabel, node.text, node.lineId, ...(outgoing.get(node.lineId) ?? []).map(edge => describeStoryEdge(project, edge))].join(" ").toLocaleLowerCase().includes(search));
  const visible = graph.nodes.filter(matches);
  const chapters = [...new Set(visible.map(node => node.chapterId))].map(id => ({
    id, title: visible.find(node => node.chapterId === id)!.chapterLabel,
    nodes: visible.filter(node => node.chapterId === id),
  }));
  const current = nodeById.get(currentLineId);
  // Which block (and way) a cut belongs to on 갈래 구조; ending cuts belong to the way that ends there.
  const blockOf = (lineId: string) => structure.member.get(lineId)?.block ?? structure.blocks.find(block => block.legs.some(leg => "lineId" in leg.end && leg.end.lineId === lineId))?.lineId;
  const currentBlock = blockOf(currentLineId);
  function whereInStructure(lineId: string) {
    const member = structure.member.get(lineId);
    const block = structure.blocks.find(item => item.lineId === (member?.block ?? blockOf(lineId)));
    if (!block) return "갈래 구조에 없는 컷";
    const head = `${block.roles.includes("branch") ? "◆" : block.roles.includes("join") ? "●" : "▶"} ${block.place}`;
    if (member && member.leg === undefined) return block.roles.includes("branch") ? `${head} 갈림길이에요` : block.roles.includes("join") ? `${head} · 여러 길이 만나는 곳이에요` : `${head}이에요`;
    const legIndex = member?.leg ?? block.legs.findIndex(leg => "lineId" in leg.end && leg.end.lineId === lineId);
    const leg = block.legs[legIndex];
    if (!leg) return head;
    const way = `${leg.mark ? `${leg.mark}. ` : ""}${leg.words.label}${leg.words.condition ? ` · ${leg.words.condition}` : ""}`;
    const plain = leg.words.label === "순서대로" || leg.words.label === "이동";
    if (member?.position !== undefined) return plain ? `${head} 뒤로 ${member.position + 1}번째 컷` : `${head}에서 ${way} 길 · ${member.position + 1}번째 컷`;
    return plain ? `${head} 뒤 길의 끝` : `${head}에서 ${way} 길의 끝`;
  }
  const visibleIssues = graph.issues.filter(issue => {
    const node = nodeById.get(issue.lineId);
    return node && matches(node);
  });
  function openCut(lineId: string) { onSelectCut(lineId); }
  function toggleChapter(id: string) {
    setExpanded(previous => previous.includes(id) ? previous.filter(value => value !== id) : [...previous, id]);
  }
  return <dialog ref={dialogRef} className={`${styles.dialog} ${dialogSurface.surface}`} aria-labelledby={titleId} aria-describedby={legendId}
    onCompositionStart={()=>{composing.current=true;}}
    onCompositionEnd={()=>{composing.current=false;}}
    onKeyDown={event=>{if(event.nativeEvent.isComposing||event.nativeEvent.keyCode===229||composing.current){if(event.key==='Escape'){event.preventDefault();event.stopPropagation();}return;}trapDialogTab(event,dialogRef.current);}}
    onCancel={event => { event.preventDefault(); event.stopPropagation(); if(!composing.current)onClose(); }}
    onClick={event => {
      const bounds = event.currentTarget.getBoundingClientRect();
      if (event.target === event.currentTarget && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) onClose();
    }}>
    <header className={styles.header}>
      <div><p className={styles.eyebrow}>이야기의 길을 살펴보세요</p><h2 id={titleId}>이야기 흐름 지도</h2></div>
      <button ref={closeRef} onClick={onClose} aria-label="전체 흐름 닫기">닫기</button>
    </header>
    <div className={styles.body} ref={bodyRef} onScroll={event => { scrolled.current = event.currentTarget.scrollTop; }}>
      <div className={styles.mapBar}><div className={styles.viewTabs} role="group" aria-label="보는 방식"><button type="button" aria-pressed={view === "structure"} onClick={() => setView("structure")}>갈래 구조</button><button type="button" aria-pressed={view === "chapters"} onClick={() => setView("chapters")}>장 지도</button></div>
        <button type="button" className={styles.toCurrent} disabled={!currentBlock} onClick={() => { if (view !== "structure") setView("structure"); requestAnimationFrame(() => { if (currentBlock) revealStructureBlock(currentBlock, currentLineId); }); }}>현재 컷으로</button></div>
      <p className={styles.context}>현재 위치: <strong>{current ? location(current) : "선택한 컷 없음"}</strong> · 전체 {graph.nodes.length}컷 · 여러 갈래에서 함께 쓰는 컷 {graph.nodes.filter(node => node.shared).length}개 · 확인할 항목 {graph.issues.length}개</p>
      {graph.nodes.some(node=>node.shared)&&<details><summary>여러 길이 다시 만나는 지점 · {graph.nodes.filter(node=>node.shared).length}곳</summary><p>둘 이상의 선택이나 이동이 같은 컷으로 이어지는 곳이에요. 같은 갈림길의 서로 다른 선택도 포함해요.</p><ul>{graph.nodes.filter(node=>node.shared).map(node=><li key={node.lineId}><button type="button" onClick={()=>openCut(node.lineId)}>{location(node)} · {node.text.slice(0,40)||'아직 글이 없는 컷'}</button><ul>{node.incoming.map(edge=><li key={edge.id}>{describeStoryEdge(project,edge)}</li>)}</ul></li>)}</ul></details>}
      <p id={legendId} className={styles.legend}>위에서 아래로 읽어요. ◆ 갈림길에서 선택지·점수 조건별로 길이 나뉘고, 순서대로 이어지는 컷은 한 줄로 묶었어요(누르면 펼쳐져요). 길은 ● 다시 만날 수도, 끝까지 따로 갈 수도 있어요. 따로 가는 줄거리는 ‘갈래 A’, ‘갈래 B › A’처럼 묶어 보여요. 다시 만나는 컷을 고치면 그곳을 지나는 모든 길에 반영돼요. 원고에 정한 연결이며, 독자가 실제로 어떤 길을 갈지는 선택과 점수에 따라 달라요.</p>
      <div className={styles.filters}>
        <label>흐름 검색<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="장 제목, 컷 내용, 선택지" /></label>
        <label>표시 범위<select value={scope} onChange={event => setScope(event.target.value as Scope)}><option value="all">전체 컷</option><option value="issues">확인할 연결</option><option value="unreachable">시작부터 이어지는 길이 없는 컷</option></select></label>
      </div>
      <p role="status" className={styles.result}>{visible.length}컷 표시 · 컷을 선택하면 편집 화면으로 이동해요.</p>
      {search && <section aria-label="검색 결과" className={styles.found}><h3>검색 결과 · {visible.length}컷</h3>
        <ol>{visible.slice(0, 30).map(node => <li key={node.lineId}><strong>{location(node)}</strong><span className={styles.foundContext}>{whereInStructure(node.lineId)}</span><span className={styles.authoredText}>{node.text.trim() || "아직 글이 없는 컷"}</span>
          <span className={styles.foundActions}><button type="button" data-found-edit={node.lineId} onClick={() => openCut(node.lineId)}>이 컷 편집</button><button type="button" onClick={() => { const block = blockOf(node.lineId); if (view !== "structure") setView("structure"); requestAnimationFrame(() => { if (block) revealStructureBlock(block, node.lineId); }); }}>갈래 구조에서 보기</button></span></li>)}</ol>
        {visible.length > 30 && <p className={styles.legend}>앞의 30컷만 보여요. 검색어를 더 구체적으로 써 보세요.</p>}</section>}
      {view === "structure" ? <FocusSurface inline device="tablet" rootId="structure-place" surface={structureSurface({ currentLineId, grouped: structure.blocks.length > STRUCTURE_GROUPED_AFTER })}
          custom={{ StoryStructure: () => <StoryStructureMap project={project} graph={graph} structure={structure} currentLineId={currentLineId} onSelectCut={onSelectCut} /> }} />
        : <ChapterStoryMap project={project} graph={graph} currentChapterId={current?.chapterId} onOpenChapter={openCut} onArrange={onArrange} />}
      <section className={styles.issues} aria-label="흐름 확인 항목">
        <h3>확인할 연결과 컷</h3>
        {visibleIssues.length === 0 ? <p>{graph.issues.length === 0 ? "도착 컷이 비어 있거나 시작부터 이어지는 길이 없는 컷이 없어요." : "현재 검색·표시 범위에 확인할 항목이 없어요."}</p> : <>
          <ul>{visibleIssues.slice(0, issueLimit).map((issue, index) => <li key={`${issue.lineId}:${issue.choiceId ?? issue.kind}:${index}`}>
            <button data-flow-issue-line-id={issue.lineId} onClick={() => onSelectCut(issue.lineId, { choiceId: issue.choiceId, kind: issue.kind })}>
              <strong>{location(nodeById.get(issue.lineId)!)}</strong><span>{issueDescription(issue)}</span><span className={styles.editHint}>이 컷에서 수정 →</span>
            </button>
          </li>)}</ul>
          {visibleIssues.length > issueLimit && <button onClick={() => setIssueLimit(previous => previous + 50)}>확인 항목 50개 더 보기 ({visibleIssues.length - issueLimit}개 남음)</button>}
        </>}
      </section>
      <section aria-label="장별 이야기 흐름" className={styles.chapters}>
        {chapters.length === 0 && <p>조건에 맞는 컷이 없어요. 검색어나 표시 범위를 바꿔 보세요.</p>}
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
                <span className={styles.arrow} aria-hidden="true">↳ →</span><span className={styles.connectionLabel}>{describeStoryEdge(project, edge)}</span>
                {edge.status === "connected" && edge.targetLineId ? <button onClick={() => openCut(edge.targetLineId!)} aria-label={`도착 컷 ${edgeDestination(edge, nodeById)} 편집`}>{edgeDestination(edge, nodeById)}</button> : <span className={edge.status === "ending" ? styles.terminal : styles.issueBadge}>{edgeDestination(edge, nodeById)}</span>}
              </li>)}</ul>
            </li>)}</ol>{chapter.nodes.length > limit && <button className={styles.moreCuts} onClick={() => setChapterLimits(previous => ({ ...previous, [chapter.id]: limit + 100 }))}>이 장의 컷 100개 더 보기 ({chapter.nodes.length - limit}컷 남음)</button>}</>}
          </details>;
        })}
      </section>
    </div>
  </dialog>;
}
