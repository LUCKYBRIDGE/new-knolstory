"use client";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { StoryProject } from "@knolstory/story-domain";
import type { StoryFlowGraph } from "@knolstory/runtime-core";
import { chapterFlow } from "../lib/chapter-flow";
import { chapterArrangement } from "../lib/chapter-arrange";
import styles from "./chapter-story-map.module.css";

const W = 184, H = 84, GX = 104, GY = 22, M = 20;
const clip = (text: string, size: number) => text.length > size ? `${text.slice(0, size - 1)}…` : text;

/** The whole story by chapter: forks (◆), rejoins (●) and endings (■) in reading order. Choosing a chapter opens it. */
export function ChapterStoryMap({ project, graph, currentChapterId, onOpenChapter, onArrange }: { project: StoryProject; graph: StoryFlowGraph; currentChapterId: string | undefined; onOpenChapter: (lineId: string) => void; onArrange?: (renumber: boolean) => void }) {
  const flow = useMemo(() => chapterFlow(project, graph), [project, graph]);
  const arrangement = useMemo(() => onArrange ? chapterArrangement(project, graph) : null, [onArrange, project, graph]);
  const [renumber, setRenumber] = useState(true);
  const arrow = useId().replace(/:/g, "");
  const scroller = useRef<HTMLDivElement>(null);
  const position = (depth: number, row: number) => ({ x: M + depth * (W + GX), y: M + 28 + row * (H + GY) });
  const byId = useMemo(() => new Map(flow.nodes.map(node => [node.id, node])), [flow]);
  const width = M * 2 + flow.columns * (W + GX) - GX, height = M * 2 + 28 + flow.rows * (H + GY) - GY + 24;
  // Open on the chapter being edited.
  useEffect(() => {
    const current = currentChapterId ? byId.get(currentChapterId) : undefined;
    if (!current || !scroller.current) return;
    const { x, y } = position(current.depth, current.row);
    scroller.current.scrollTo({ left: Math.max(0, x - scroller.current.clientWidth / 2 + W / 2), top: Math.max(0, y - scroller.current.clientHeight / 2 + H / 2) });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [byId, currentChapterId]);
  const forks = flow.nodes.filter(node => node.fork).length, merges = flow.nodes.filter(node => node.merge).length, endings = flow.nodes.filter(node => node.ending).length, loose = flow.nodes.filter(node => !node.reachable).length;
  return <section className={styles.section} aria-label="장 이야기 지도">
    <p className={styles.summary}>{flow.nodes.length}장 · <span className={styles.key} data-kind="fork">◆ 갈림 {forks}</span> · <span className={styles.key} data-kind="merge">● 다시 만남 {merges}</span> · <span className={styles.key} data-kind="ending">■ 끝 {endings}</span>{loose > 0 && <> · <span className={styles.key} data-kind="loose">이어지지 않은 장 {loose}</span></>}</p>
    <p className={styles.hint}>왼쪽에서 오른쪽으로 읽는 순서예요. 같은 세로줄은 같은 단계의 다른 갈래예요. 장을 누르면 그 장을 편집해요.</p>
    {arrangement && (arrangement.moved || arrangement.renamed ? <div className={styles.arrange} data-chapter-arrange>
      <p>{arrangement.moved > 0 && <>저장 순서가 읽는 순서와 다른 장 {arrangement.moved}개</>}{arrangement.moved > 0 && arrangement.renamed > 0 && " · "}{arrangement.renamed > 0 && <>읽는 단계와 번호가 다른 장 {arrangement.renamed}개</>}</p>
      {arrangement.renamed > 0 && <label><input type="checkbox" checked={renumber} onChange={event => setRenumber(event.target.checked)} /> 장 번호와 갈래 글자도 다시 매기기</label>}
      <button type="button" onClick={() => onArrange!(renumber && arrangement.renamed > 0)}>읽는 순서로 장 정리</button>
      <small>연결과 글은 그대로예요. 장 목록과 번호만 지도 순서에 맞춰요.</small>
    </div> : <p className={styles.hint} data-chapter-arrange="done">장이 읽는 순서대로 정리돼 있어요.</p>)}
    <div ref={scroller} className={styles.scroll} tabIndex={0} aria-label="장 이야기 지도 스크롤 영역" data-testid="chapter-map-scroll">
      <div className={styles.canvas} style={{ width, height }}>
        {Array.from({ length: flow.columns }, (_, column) => <span key={column} className={styles.step} style={{ left: position(column, 0).x, top: M - 4, width: W }}>{column + 1}단계</span>)}
        <svg width={width} height={height} className={styles.wires} aria-hidden="true">
          <defs><marker id={arrow} markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="currentColor" /></marker></defs>
          {flow.edges.map(edge => {
            const source = byId.get(edge.source)!, target = byId.get(edge.target)!;
            const a = position(source.depth, source.row), b = position(target.depth, target.row);
            const sx = a.x + W, sy = a.y + H / 2, ex = b.x, ey = b.y + H / 2;
            const d = edge.back
              ? `M ${a.x + W / 2} ${a.y + H} C ${a.x + W / 2} ${height - 8}, ${b.x + W / 2} ${height - 8}, ${b.x + W / 2} ${b.y + H}`
              : `M ${sx} ${sy} C ${sx + GX / 2} ${sy}, ${ex - GX / 2} ${ey}, ${ex} ${ey}`;
            return <path key={edge.id} d={d} data-choice={edge.choice || undefined} data-back={edge.back || undefined} markerEnd={`url(#${arrow})`}><title>{edge.labels.length ? `선택: ${edge.labels.join(" / ")}` : "이어짐"}</title></path>;
          })}
        </svg>
        {flow.edges.filter(edge => edge.labels.length && !edge.back).map(edge => {
          const target = byId.get(edge.target)!, b = position(target.depth, target.row);
          return <span key={`label:${edge.id}`} className={styles.edgeLabel} style={{ left: b.x - GX + 4, top: b.y + H / 2 - 22, width: GX - 8 }} title={edge.labels.join(" / ")}>{clip(edge.labels.join(" / "), 18)}</span>;
        })}
        {flow.nodes.map(node => {
          const { x, y } = position(node.depth, node.row);
          const current = node.id === currentChapterId;
          return <button key={node.id} type="button" className={styles.node} data-current={current || undefined} data-reachable={node.reachable} style={{ left: x, top: y, width: W, height: H }}
            aria-current={current ? "true" : undefined} aria-label={`${node.label} 편집${node.fork ? " · 갈림" : ""}${node.merge ? " · 다시 만남" : ""}${node.ending ? " · 이야기 끝" : ""}`} onClick={() => onOpenChapter(node.firstLineId)} data-chapter-map-node={node.id}>
            <span className={styles.marks}>{node.start && <b data-kind="start">시작</b>}{node.fork && <b data-kind="fork">◆</b>}{node.merge && <b data-kind="merge">●</b>}{node.ending && <b data-kind="ending">■</b>}{current && <b data-kind="current">편집 중</b>}</span>
            <strong>{clip(node.label, 26)}</strong>
            <small>{node.cutCount}컷{!node.reachable ? " · 이어지지 않음" : ""}</small>
          </button>;
        })}
      </div>
    </div>
  </section>;
}
