import { isRuntimeScene, type Point, type Rect, type RuntimeActor, type RuntimeScene } from '@knolstory/runtime-contract';
export * from './story-runtime';
export * from './stage-layout';
export * from './stage-view';
export * from './authoring';
export * from './editor-authoring';
export * from './flow-analysis';

export type Size = Readonly<{ width: number; height: number }>;
export type StageViewport = Readonly<{
  scale: number; offsetX: number; offsetY: number; width: number; height: number;
  logicalWidth: number; logicalHeight: number;
}>;
export const LOGICAL_STAGE: Size = Object.freeze({ width: 1280, height: 720 });

function validSize(size: Size): boolean {
  return Number.isFinite(size.width) && Number.isFinite(size.height) && size.width > 0 && size.height > 0;
}

export function fitStage(container: Size, logical: Size = LOGICAL_STAGE): StageViewport {
  if (!validSize(container) || !validSize(logical)) throw new RangeError('Stage dimensions must be finite and positive.');
  const scale = Math.min(container.width / logical.width, container.height / logical.height);
  const width = logical.width * scale;
  const height = logical.height * scale;
  return { scale, width, height, offsetX: (container.width - width) / 2, offsetY: (container.height - height) / 2,
    logicalWidth: logical.width, logicalHeight: logical.height };
}

export function screenToStage(point: Point, viewport: StageViewport): Point | null {
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) return null;
  const x = (point.x - viewport.offsetX) / viewport.scale;
  const y = (point.y - viewport.offsetY) / viewport.scale;
  if (x < 0 || y < 0 || x > viewport.logicalWidth || y > viewport.logicalHeight) return null;
  return { x, y };
}

export function stageToScreen(rect: Rect, viewport: StageViewport): Rect {
  return { x: viewport.offsetX + rect.x * viewport.scale, y: viewport.offsetY + rect.y * viewport.scale,
    width: rect.width * viewport.scale, height: rect.height * viewport.scale };
}

/** Temporary editor input fixture. Full StoryDocument migration belongs to M2. */
export type SpikeDraft = Readonly<{ speaker: string; text: string; actors: readonly RuntimeActor[] }>;

export function createInitialDraft(): SpikeDraft {
  return {
    speaker: '흥부', text: '우리 이야기를 시작해 볼까요? 인물을 선택하고 위치를 바꾸어 보세요.',
    actors: [
      { id: 'heungbu', name: '흥부', rect: { x: 160, y: 180, width: 190, height: 320 } },
      { id: 'nolbu', name: '놀부', rect: { x: 900, y: 180, width: 190, height: 320 } },
    ],
  };
}

export function compileScene(draft: SpikeDraft, revision: number): RuntimeScene {
  const scene: RuntimeScene = {
    contractVersion: 1, sceneId: 'responsive-editing-probe', revision,
    width: LOGICAL_STAGE.width, height: LOGICAL_STAGE.height,
    actors: draft.actors.map(actor => ({ ...actor, rect: { ...actor.rect } })),
    dialogue: { speaker: draft.speaker, text: draft.text },
  };
  if (!isRuntimeScene(scene)) throw new RangeError('Invalid editing probe scene.');
  return scene;
}

export function moveActor(draft: SpikeDraft, actorId: string, point: Point): SpikeDraft {
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) throw new RangeError('Actor position must be finite.');
  if (!draft.actors.some(actor => actor.id === actorId)) throw new RangeError('Unknown actor.');
  return { ...draft, actors: draft.actors.map(actor => actor.id === actorId ? {
    ...actor, rect: { ...actor.rect,
      x: Math.min(Math.max(point.x, 0), LOGICAL_STAGE.width - actor.rect.width),
      y: Math.min(Math.max(point.y, 0), LOGICAL_STAGE.height - actor.rect.height),
    },
  } : actor) };
}

export * from "./audio";

export * from './responsive-layout';

export * from './reset-actor-placement';

export * from "./presentation-scopes";

export * from "./playback-history";
