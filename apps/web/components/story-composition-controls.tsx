"use client";
import { ASSET_CATALOG } from "@knolstory/asset-registry";
import { resolveStageComposition, type StageComposition, type StoryLine, type StoryProject } from "@knolstory/story-domain";
import styles from "./story-workspace.module.css";

type Props = { project: StoryProject; line: StoryLine; stage: StageComposition; ordered: StoryLine[]; patch: (values: Partial<StoryLine>) => void };
export function cleanedComposition(stage: StageComposition): StageComposition {
  const keys = new Set([...stage.leftActors, ...stage.rightActors].map(actor => actor.key));
  return { ...stage, speakerActorKey: stage.speakerActorKey && keys.has(stage.speakerActorKey) ? stage.speakerActorKey : undefined,
    speakerActorKeys: stage.speakerActorKeys?.filter(key => keys.has(key)) };
}

export function StoryCompositionControls({ project, line, stage, ordered, patch }: Props) {
  const characters = ASSET_CATALOG.filter(asset => asset.type === "character");
  const count = stage.leftActors.length + stage.rightActors.length;
  const previous = ordered[ordered.findIndex(item => item.id === line.id) - 1];
  return <>
    <label>인물 표시<select aria-label="인물 표시" value={line.inheritActors ? "inherit" : count ? "custom" : "none"} onChange={event => {
      if (event.target.value === "inherit") patch({ inheritActors: true });
      else if (event.target.value === "none") patch({ inheritActors: false, stageComposition: { leftActors: [], rightActors: [] } });
      else patch({ inheritActors: false, stageComposition: stage });
    }}>
      <option value="inherit">장 기본 인물 이어받기</option>
      <option value="custom">이 컷에서 직접 배치</option>
      <option value="none">이 컷에는 인물 없음</option>
    </select></label>
    <p className={styles.hint}>인물 {count}명. 화자 이름과 무대 인물은 별개입니다. ‘나’의 대사도 인물 없이 쓸 수 있어요.</p>
    <button disabled={!previous} onClick={() => {
      if (previous) patch({ inheritActors: false, stageComposition: resolveStageComposition(project.chapters.find(chapter => chapter.id === previous.chapterId), previous, project) });
    }}>앞 컷 인물 복사</button>
    <div className={styles.controls}>
      {(["left", "right"] as const).map(side => {
        const field = side === "left" ? "leftActors" : "rightActors";
        return <button key={side} disabled={stage[field].length >= 2} onClick={() => {
          const assetId = stage[field][0]?.assetId ?? characters[0]?.id;
          if (assetId) patch({ stageComposition: { ...stage, [field]: [...stage[field], { key: `${side}-${crypto.randomUUID()}`, assetId }] } });
        }}>{side === "left" ? "왼쪽 인물 추가" : "오른쪽 인물 추가"}</button>;
      })}
    </div>
    <p className={styles.hint}>그림이 잘 보이는 크기를 우선하고, 자산별 기본 배율과 편집 배율을 유지합니다. 인물의 키를 추정해 과하게 키우거나 줄이지 않습니다. 중앙 배치보다 직접 지정한 가로 위치가 우선합니다. 방향은 그림의 좌우 반전을 조절하며, 정면 그림을 다른 자세로 바꾸지 않습니다.</p>
  </>;
}
