"use client";
import type { FlowNode, StoryFlowGraph } from "@knolstory/runtime-core";
import styles from "./story-workspace.module.css";

type Props = {
  node: FlowNode;
  graph: StoryFlowGraph;
  onSelectCut: (id: string, repair?: {choiceId?:string;kind?:string}) => void;
};

export function StoryFlowContext({ node, graph, onSelectCut }: Props) {
  const sources = new Map(graph.nodes.map(item => [item.lineId, item]));
  return (
    <section className={styles.flowContext} aria-label="현재 컷 연결" data-testid="flow-context">
      <p><strong>현재 편집 위치 · {node.chapterLabel} · {node.order}번째 컷</strong></p>
      {node.shared && <p className={styles.sharedNotice}>합류 · 공유 컷입니다. 이 컷을 수정하면 연결된 모든 갈래에 반영됩니다.</p>}
      {!node.reachable && <p>시작 컷에서 도달할 수 없는 컷입니다. 전체 흐름에서 이 컷으로 오는 연결을 확인해 주세요.</p>}
      <details>
        <summary>이 컷으로 오는 연결 {node.incoming.length}개</summary>
        {node.incoming.length === 0 && <p>{graph.startLineId === node.lineId ? "이 작품의 시작 컷입니다." : "이 컷을 가리키는 연결이 없습니다."}</p>}
        <div className={styles.controls}>
          {node.incoming.map(edge => {
            const source = sources.get(edge.sourceLineId)!;
            return <button key={edge.id} onClick={() => onSelectCut(source.lineId)}>
              {source.chapterLabel} · {source.order}번째 컷 → {edge.label}
            </button>;
          })}
        </div>
      </details>
      <details>
        <summary>이 컷에서 나가는 연결 {node.outgoing.length}개</summary>
        <div className={styles.controls}>
          {node.outgoing.map(edge => {
            const target = edge.targetLineId ? sources.get(edge.targetLineId) : undefined;
            if (target) return <button key={edge.id} onClick={() => onSelectCut(target.lineId)}>{edge.label} → {target.chapterLabel} · {target.order}번째 컷</button>;
            if (edge.status === 'ending') return <p key={edge.id}>{edge.label} → 이야기 끝</p>;
            return <button key={edge.id} onClick={() => onSelectCut(node.lineId, {choiceId:edge.choiceId,kind:edge.status==='pending'?'pending':'missing'})}>{edge.label} → {edge.status==='pending'?'연결 대기':'도착 컷 없음'} · 연결 고치기</button>;
          })}
        </div>
      </details>
    </section>
  );
}
