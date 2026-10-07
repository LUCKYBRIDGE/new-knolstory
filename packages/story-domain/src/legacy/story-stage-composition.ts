import type { Chapter, StoryLine, StoryProject } from './story-data';

export type StoryActorMotion = {type:"fade-in"|"fade-out"|"move";durationMs?:number;delayMs?:number;fromXAnchor?:number};
export type StageActorEntry = {
  motion?:StoryActorMotion;
  position?: "center";
  positionOrder?: number;
  key: string;
  assetId: string;
  characterKey?: string;
  placementPreset?: 'single-left' | 'single-right' | 'double-left' | 'double-right';
  xAnchor?: number;
  scaleMultiplier?: number;
  facing?: 'left' | 'right' | 'original';
  baseDepth?: number;
  depthOverride?: number;
};
/** Array order is the canonical order (L1/L2/R1/R2); empty arrays mean an explicit exit. */
export type StageComposition = {
  leftActors: StageActorEntry[];
  rightActors: StageActorEntry[];
  speakerActorKeys?: string[];
  speakerActorKey?: string;
};
export const stageActors = (stage: StageComposition) => [...stage.leftActors, ...stage.rightActors];
export function isStageComposition(value: unknown): value is StageComposition {
  if (!value || typeof value !== 'object') return false;
  const s = value as StageComposition;
  if (!Array.isArray(s.leftActors) || !Array.isArray(s.rightActors) || s.leftActors.length > 2 || s.rightActors.length > 2) return false;
  const actors = stageActors(s);
  const bounded = (v: unknown, min: number, max: number) => v === undefined || (typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max);
  if (!actors.every(a => a && typeof a.key === 'string' && a.key.trim() && typeof a.assetId === 'string' && a.assetId.trim()
    && (a.position === undefined || a.position === 'center')
    && (a.motion === undefined || a.motion && ["fade-in","fade-out","move"].includes(a.motion.type) && bounded(a.motion.durationMs,0,10000) && bounded(a.motion.delayMs,0,10000) && bounded(a.motion.fromXAnchor,5,95))
    && bounded(a.positionOrder, 1, 2)
    && (a.characterKey === undefined || typeof a.characterKey === 'string')
    && (a.placementPreset === undefined || ['single-left','single-right','double-left','double-right'].includes(a.placementPreset))
    && (a.facing === undefined || ['left','right','original'].includes(a.facing))
    && bounded(a.xAnchor, 5, 95) && bounded(a.scaleMultiplier, .5, 1.4)
    && bounded(a.baseDepth, 1, 2) && bounded(a.depthOverride, 0, 4))) return false;
  return (s.speakerActorKeys === undefined || (Array.isArray(s.speakerActorKeys) && s.speakerActorKeys.every(key => actors.some(a => a.key === key)))) && new Set(actors.map(a => a.key)).size === actors.length && (s.speakerActorKey === undefined || actors.some(a => a.key === s.speakerActorKey));
}
export function resolveStageComposition(chapter?: Chapter | null, line?: StoryLine | null, project?: StoryProject | null): StageComposition {
  if (!line?.inheritActors && line?.stageComposition) return structuredClone(line.stageComposition);
  const left = (line?.inheritActors ? '' : line?.leftAssetId) || chapter?.leftAssetId || project?.stageDefaults?.leftAssetId;
  const right = (line?.inheritActors ? '' : line?.rightAssetId) || chapter?.rightAssetId || project?.stageDefaults?.rightAssetId;
  return {leftActors: left ? [{key:'L1',assetId:left}] : [], rightActors: right ? [{key:'R1',assetId:right}] : [],
    ...(line?.speaker === 'left' && left ? {speakerActorKey:'L1'} : line?.speaker === 'right' && right ? {speakerActorKey:'R1'} : {})};
}
export function stageProjection(stage: StageComposition) {
  return { leftAssetId: stage.leftActors[0]?.assetId ?? '', rightAssetId: stage.rightActors[0]?.assetId ?? '' };
}
export function activeStageSpeaker(stage: StageComposition, line?: Pick<StoryLine,'speaker'|'type'|'flow'> | null) {
  if (!line || line.type === 'narration' || line.speaker === 'narration' || line.flow?.type === 'choice') return undefined;
  return stage.speakerActorKey ?? (line.speaker === 'left' ? stage.leftActors[0]?.key : stage.rightActors[0]?.key);
}
export function stageActorDepth(actor: StageActorEntry, index: number, groupSize: number, speakerKey?: string) {
  return actor.depthOverride ?? (groupSize > 1 && actor.key === speakerKey ? 3 : actor.baseDepth ?? index + 1);
}
/** All editors, including legacy side controls, write through this adapter. */
export function patchStageLine(line: StoryLine, patch: Partial<StoryLine>, chapter?: Chapter, project?: StoryProject): StoryLine {
  const next = {...line, ...patch};
  if ('backgroundId' in patch && !('backgroundMode' in patch)) delete next.backgroundMode;
  if (patch.inheritActors === true) return {...next, stageComposition:undefined, leftAssetId:'', rightAssetId:''};
  if (patch.stageComposition) return {...next, inheritActors:false, ...stageProjection(patch.stageComposition)};
  if (line.inheritActors && !('leftAssetId' in patch) && !('rightAssetId' in patch)) return next;
  if (!line.stageComposition && !line.inheritActors && !patch.flow) return next;
  const stage = resolveStageComposition(chapter, line, project);
  for (const side of ['left','right'] as const) {
    const field = side === 'left' ? 'leftAssetId' : 'rightAssetId';
    const actors = stage[side === 'left' ? 'leftActors' : 'rightActors'];
    if (field in patch) {
      const id = patch[field] || chapter?.[field] || project?.stageDefaults?.[field] || '';
      if (id && actors[0]) actors[0].assetId = id;
      else if (id) actors.push({key: `${side}-${Date.now()}`,assetId:id});
      else actors.shift();
    }
  }
  if ('speaker' in patch) stage.speakerActorKey = patch.speaker === 'left' ? stage.leftActors[0]?.key : patch.speaker === 'right' ? stage.rightActors[0]?.key : undefined;
  if (!stageActors(stage).some(a => a.key === stage.speakerActorKey)) delete stage.speakerActorKey;
  return {...next, inheritActors:false, stageComposition:stage, ...stageProjection(stage)};
}
export function canonicalizeProjectStage(project: StoryProject): StoryProject {
  return {...project, lines: project.lines.map(line => {
    if (line.backgroundMode !== undefined && (line.backgroundMode !== 'none' || line.backgroundId !== '')) throw new Error("그림 없음 설정과 배경 ID를 확인해 주세요.");
    if (line.stageComposition && !isStageComposition(line.stageComposition)) throw new Error("무대 구성 데이터를 확인해 주세요.");
    if (line.inheritActors) return {...line, stageComposition:undefined, leftAssetId:'', rightAssetId:''};
    const stage = resolveStageComposition(project.chapters.find(c => c.id === line.chapterId),line,project);
    const speaker = line.type === 'dialogue' && stage.speakerActorKey
      ? stage.leftActors.some(a => a.key === stage.speakerActorKey) ? 'left' : 'right' : line.speaker;
    return {...line,speaker,stageComposition:stage,...stageProjection(stage)};
  })};
}
