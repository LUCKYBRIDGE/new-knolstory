"use client";

import { useState } from "react";
import {actorLabel} from '../lib/actor-label';
import { assetDisplayName,resolveAsset } from "@knolstory/asset-registry";
import type { StageComposition, StoryLine, StoryProject } from "@knolstory/story-domain";
import { assignStorySpeaker, registerStorySpeaker, setStageSpeaker } from "@knolstory/runtime-core";
import { AssetPickerField } from "./asset-picker-field";
import styles from "./story-workspace.module.css";

type Props = {
  project: StoryProject;
  line: StoryLine;
  stage: StageComposition;
  onProjectChange: (next: StoryProject) => void;
  patch: (values: Partial<StoryLine>) => void;
};

/** Preserve the legacy chapter speaker dropdown, with explicit image and stage actions. */
export function StorySpeakerControls({ project, line, stage, onProjectChange, patch }: Props) {
  const [name, setName] = useState("");
  const [scope, setScope] = useState("chapter");
  const [side, setSide] = useState<"left" | "right">("left");
  const [error, setError] = useState("");
  const chapter = project.chapters.find(item => item.id === line.chapterId);
  const names = [...new Set([
    line.speakerName,
    ...(chapter?.chapterSpeakerNames ?? []),
    ...project.speakerNames,
    ...(project.characters ?? []).map(character => character.name),
  ])].filter(Boolean);
  const character = project.characters?.find(item => item.name === line.speakerName);
  const actors = [...stage.leftActors, ...stage.rightActors];
  const speakingKey = line.speaker === "narration" ? "" :
    stage.speakerActorKeys?.[0] ?? stage.speakerActorKey ?? "";

  function change(action: () => void) {
    try {
      action();
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "화자 설정을 바꾸지 못했어요. 다시 시도해 주세요.");
    }
  }

  function register() {
    const trimmed = name.trim();
    if (!trimmed) throw new Error("등록할 화자 이름을 입력해 주세요.");
    const existing = project.characters?.find(item => item.name === trimmed);
    onProjectChange(registerStorySpeaker(project, {
      id: existing?.id ?? crypto.randomUUID(), name: trimmed,
      defaultImageId: existing?.defaultImageId ?? "",
    }, scope === "chapter" ? line.chapterId : undefined));
    setName("");
  }

  function setDefaultImage(id: string) {
    if (!line.speakerName.trim()) throw new Error("먼저 화자 이름을 선택하거나 입력해 주세요.");
    onProjectChange(registerStorySpeaker(project, {
      id: character?.id ?? crypto.randomUUID(), name: line.speakerName,
      defaultImageId: id,
    }, line.chapterId));
  }

  function placeDefaultImage() {
    if (!character?.defaultImageId) return;
    const field = side === "left" ? "leftActors" : "rightActors";
    const group = stage[field];
    const actor = {
      ...(group[0] ?? { key: `${side}-${crypto.randomUUID()}` }),
      assetId: character.defaultImageId,
      characterKey: character.id,
    };
    patch({ inheritActors: false, stageComposition: {
      ...stage, [field]: [actor, ...group.slice(1)],
    } });
  }

  return <>
    <label>등록 화자<select aria-label="등록 화자" value={line.speakerName}
      onChange={event => change(() => onProjectChange(assignStorySpeaker(project, line.id, event.target.value)))}>
      <option value="">직접 이름 입력</option>
      {names.map(item => <option key={item} value={item}>{item}</option>)}
    </select></label>
    <label>말하는 무대 인물<select aria-label="말하는 무대 인물" value={speakingKey}
      onChange={event => change(() => onProjectChange(setStageSpeaker(project, line.id, event.target.value || null)))}>
      <option value="">화면 밖 목소리 / 나</option>
      {actors.map(actor => <option key={actor.key} value={actor.key}>
        {actorLabel(stage,actor.key)} · {(()=>{const asset=resolveAsset(actor.assetId);return asset?assetDisplayName(asset):'그림 선택';})()}
      </option>)}
    </select></label>
    <p className={styles.hint}>무대 인물을 지정하면 해당 인물의 화자 강조만 바뀝니다. 화자 이름과 대사/해설 종류는 그대로 유지해요.</p>
    <details className={styles.speakerSetup}>
      <summary>화자 설정 · 기본 이미지</summary>
    <div className={styles.controls}>
      <label>새 화자 이름<input aria-label="새 화자 이름" maxLength={100}
        value={name} onChange={event => setName(event.target.value)} /></label>
      <label>화자 등록 범위<select aria-label="화자 등록 범위" value={scope} onChange={event => setScope(event.target.value)}>
        <option value="chapter">이 장에서 사용</option><option value="work">작품 전체에서 사용</option>
      </select></label>
      <button type="button" onClick={() => change(register)}>화자 등록</button>
    </div>
    <AssetPickerField label="화자 기본 이미지" type="character"
      value={character?.defaultImageId ?? ""} allowNone
      chapterAssetIds={chapter?.characterAssetIds}
      onChange={id => change(() => setDefaultImage(id))} />
    <p className={styles.hint}>화자 선택과 기본 이미지 등록은 무대 배치를 바꾸지 않아요. ‘나’와 화면 밖 목소리는 이미지 없이 사용할 수 있어요.</p>
    <label>화자 이미지 배치 위치<select aria-label="화자 이미지 배치 위치" value={side}
      onChange={event => setSide(event.target.value as "left" | "right")}>
      <option value="left">왼쪽 첫 인물</option><option value="right">오른쪽 첫 인물</option>
    </select></label>
    <button type="button" disabled={!character?.defaultImageId} onClick={() => change(placeDefaultImage)}>기본 이미지를 무대에 배치</button>
    <p className={styles.hint}>선택한 쪽의 첫 인물 이미지를 교체합니다. 기존 위치·크기·방향과 다른 인물은 유지해요.</p>
    </details>
    {error && <p role="alert">{error}</p>}
  </>;
}
