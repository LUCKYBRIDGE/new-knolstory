import { getBackgroundSize, customAudioRuntimePath, resolveAudioAsset, resolveAsset } from '@knolstory/asset-registry';
import { activeStageSpeaker, createStoryDocument, orderedStoryFlowLines, parseStoryDocument, patchStageLine,
  resolveStageComposition, stageActorDepth, type StoryLine, type StoryProject } from '@knolstory/story-domain';
import { isRuntimeScene, type RuntimeActor, type RuntimeScene } from '@knolstory/runtime-contract';
import { resolveStageLayout } from './stage-layout';
import { stageCharacterScale, stageReadableCharacterScale, stageSharedActor, stageShouldMirror } from './stage-view';
import { resolveBackgroundRect, resolveStoryViewport, type StoryViewportSize } from './responsive-layout';
import {compileStoryPresentation} from './presentation-scopes';
import { audioPreviewPath, compileStoryAudio, type AudioAssetResolver } from './audio';

export const orderedLines = orderedStoryFlowLines;
export type PlaybackState = Readonly<{ lineId: string | null; path: readonly string[];
  status: 'reading' | 'choice' | 'ended' | 'pending' | 'approval-required';
  choiceHistory?: readonly Readonly<{pathIndex:number;choiceId:string}>[] }>;

function requireLine(project: StoryProject, lineId: string): StoryLine {
  const line = project.lines.find(item => item.id === lineId);
  if (!line) throw new Error('이야기 컷을 찾을 수 없어요.');
  return line;
}
function lineStatus(line: StoryLine): PlaybackState['status'] {
  return !line.ending?.endsStory && line.flow?.type === 'choice' ? 'choice' : 'reading';
}
export function createPlayback(project: StoryProject, lineId?: string): PlaybackState {
  const initial = lineId ?? orderedLines(project)[0]?.id;
  if (!initial) return { lineId: null, path: [], status: 'ended' };
  return { lineId: initial, path: [initial], status: lineStatus(requireLine(project, initial)) };
}
export function advancePlayback(project: StoryProject, state: PlaybackState, choiceId?: string): PlaybackState {
  if (state.lineId === null) return state;
  const line = requireLine(project, state.lineId);
  let target: string | null;
  let choiceHistory = state.choiceHistory;
  if (line.ending?.endsStory) target = null;
  else if (line.flow?.type === 'choice') {
    if (choiceId === undefined) return { ...state, status: 'choice' };
    const option = line.flow.options.find(item => item.id === choiceId);
    if (!option) throw new Error('선택지를 찾을 수 없어요.');
    target = option.targetLineId;
    if (target !== '' && (target === null || project.lines.some(item => item.id === target)))
      choiceHistory = [...(state.choiceHistory ?? []).filter(item => item.pathIndex !== state.path.length - 1), {pathIndex:state.path.length - 1, choiceId:option.id}];
  } else if (line.flow?.type === 'goto') target = line.flow.targetLineId;
  else {
    const lines = orderedLines(project);
    target = lines[lines.findIndex(item => item.id === line.id) + 1]?.id ?? null;
  }
  if (target === null) return { ...state, ...(choiceHistory ? {choiceHistory} : {}), lineId: null, status: 'ended' };
  if (target === '' || !project.lines.some(item => item.id === target)) return { ...state, status: 'pending' };
  return { lineId: target, path: [...state.path, target], status: lineStatus(requireLine(project, target)), ...(choiceHistory ? {choiceHistory} : {}) };
}
export function backPlayback(project: StoryProject, state: PlaybackState): PlaybackState {
  const path = state.lineId === null ? [...state.path] : state.path.slice(0, -1);
  const previous = path.at(-1);
  if (!previous) return state;
  const choices = state.choiceHistory?.filter(item => item.pathIndex < path.length - 1);
  return { lineId: previous, path, status: lineStatus(requireLine(project, previous)), ...(choices?.length ? {choiceHistory:choices} : {}) };
}

/** Restore only paths whose edges still exist in the current authored document. */
export function restorePlayback(project: StoryProject, value: unknown): PlaybackState {
  if (!value || typeof value !== 'object') throw new Error('이어읽기 상태를 확인해 주세요.');
  const stored = value as Record<string, unknown>;
  if (!Array.isArray(stored.path) || stored.path.length > 10000 || !stored.path.every(id => typeof id === 'string'))
    throw new Error('이어읽기 경로를 확인해 주세요.');
  const path = stored.path as string[];
  if (!path.length) return createPlayback(project);
  const ordered = orderedLines(project);
  const targets = (id: string): (string | null)[] => {
    const line = requireLine(project, id);
    return line.ending?.endsStory ? [null] : line.flow?.type === 'choice' ? line.flow.options.map(c => c.targetLineId)
      : line.flow?.type === 'goto' ? [line.flow.targetLineId] : [ordered[ordered.findIndex(c => c.id === id) + 1]?.id ?? null];
  };
  for (const [index, id] of path.entries()) {
    requireLine(project, id);
    if (index && !targets(path[index - 1]).includes(id)) throw new Error('이야기 연결이 바뀌어 이전 경로를 이어 읽을 수 없어요.');
  }
  let choiceHistory: PlaybackState['choiceHistory'];
  if (stored.choiceHistory !== undefined) {
    if (!Array.isArray(stored.choiceHistory) || stored.choiceHistory.length > path.length) throw new Error('저장된 선택 기록을 확인해 주세요.');
    const seen = new Set<number>();
    choiceHistory = stored.choiceHistory.map((entry: unknown) => {
      if (!entry || typeof entry !== 'object') throw new Error('저장된 선택 기록을 확인해 주세요.');
      const decision = entry as Record<string, unknown>;
      if (!Number.isInteger(decision.pathIndex) || (decision.pathIndex as number) < 0 || (decision.pathIndex as number) >= path.length || typeof decision.choiceId !== 'string') throw new Error('저장된 선택 기록을 확인해 주세요.');
      const index = decision.pathIndex as number, source = requireLine(project, path[index]);
      const option = source.flow?.type === 'choice' ? source.flow.options.find(item => item.id === decision.choiceId) : undefined;
      const destination = path[index + 1] ?? (stored.status === 'ended' && stored.lineId === null ? null : undefined);
      if (!option || option.targetLineId !== destination || seen.has(index)) throw new Error('선택지가 바뀌어 이전 기록을 불러올 수 없어요.');
      seen.add(index);
      return {pathIndex:index, choiceId:decision.choiceId};
    });
  }
  const decisions = choiceHistory ? {choiceHistory} : {};
  const last = path.at(-1)!;
  if (stored.status === 'ended' && stored.lineId === null && targets(last).includes(null)) return { lineId: null, path: [...path], status: 'ended', ...decisions };
  if (stored.lineId !== last) throw new Error('이어읽기 위치를 확인해 주세요.');
  if (stored.status === 'pending' && targets(last).includes('')) return { lineId: last, path: [...path], status: 'pending', ...decisions };
  const status = lineStatus(requireLine(project, last));
  if (stored.status !== status) throw new Error('이어읽기 진행 상태를 확인해 주세요.');
  return { lineId: last, path: [...path], status, ...decisions };
}

export function patchStoryLine(project: StoryProject, lineId: string, patch: Partial<StoryLine>): StoryProject {
  const source = requireLine(project, lineId);
  if (patch.id !== undefined && patch.id !== source.id || patch.chapterId !== undefined && patch.chapterId !== source.chapterId)
    throw new Error('컷의 ID와 소속 장은 이 편집으로 바꿀 수 없어요.');
  const chapter = project.chapters.find(item => item.id === source.chapterId);
  const next = patchStageLine(source, structuredClone(patch), chapter, project);
  const candidate = { ...project, lines: project.lines.map(line => line.id === lineId ? next : line), updatedAt: new Date().toISOString() };
  const loaded = parseStoryDocument(createStoryDocument({ project: candidate, savedAt: new Date().toISOString(), appVersion: 'knolstory-next' }));
  if (!loaded.ok) throw new Error(loaded.issues.map(issue => issue.message).join('\n'));
  return loaded.document.project;
}

export function compileStoryScene(project: StoryProject, lineId: string, revision: number,
  options: Readonly<{ mode: 'edit' | 'play'; reducedMotion?: boolean; viewport?: StoryViewportSize; displaySize?:StoryViewportSize; playbackPath?: readonly string[]; audioResolver?: AudioAssetResolver; presentationEntry?: string }> = { mode: 'edit' }): RuntimeScene {
  const line = requireLine(project, lineId);
  const viewport = options.viewport ? resolveStoryViewport(options.viewport,options.displaySize) : undefined;
  const width = viewport?.width ?? 1280, height = viewport?.height ?? 720;
  const chapter = project.chapters.find(item => item.id === line.chapterId);
  const stage = resolveStageComposition(chapter, line, project);
  const speaker = activeStageSpeaker(stage, line);
  const sourceActors = (['left', 'right'] as const).flatMap(side => stage[side === 'left' ? 'leftActors' : 'rightActors'].filter(actor=>!viewport?.portrait || actor.key===speaker).map((actor, index, group) => {
    const asset = resolveAsset(actor.assetId);
    if (!asset?.geometry) throw new Error(`인물 자산을 찾을 수 없어요: ${actor.assetId}`);
    const override = { ...(index === 0 ? line.presentation?.actors?.[side] : undefined), ...actor };
    const originalMirror = stageShouldMirror(actor.assetId, side);
    const mirrored = override.facing === 'original' ? false : override.facing ? originalMirror !== (override.facing !== (side === 'left' ? 'right' : 'left')) : originalMirror;
    return { actor, asset, side, index, groupSize: group.length, override, mirrored };
  }));
  const layout = resolveStageLayout(width, viewport?.actorBaseHeight ?? (720 - 8) * .68, sourceActors.map(item => ({ key: item.actor.key,
    side: item.side, geometry: item.asset.geometry!, scale: (viewport ? stageReadableCharacterScale(item.actor.assetId) : stageCharacterScale(item.actor.assetId)) * (item.override.scaleMultiplier ?? 1),
    mirrored: item.mirrored, xAnchor: viewport?.portrait ? undefined : item.override.xAnchor, centered: viewport?.portrait || item.actor.position === 'center' || stageSharedActor(item.actor.assetId) })), undefined, height - 16, viewport?.portrait ?? false);
  const actors: RuntimeActor[] = layout.actors.map(rect => {
    const item = sourceActors.find(a => a.actor.key === rect.key)!;
    const listener = !!speaker && speaker !== item.actor.key && !stage.speakerActorKeys?.includes(item.actor.key) && !stageSharedActor(item.actor.assetId);
    return {handle:{x:Math.max(0,Math.min(width,rect.x+rect.width*(rect.alphaLeft+rect.alphaRight)/2)),y:Math.max((viewport?.actorHeadMargin??8),(viewport?.actorBaseline??558)-rect.height*item.asset.geometry!.bottom+rect.height*item.asset.geometry!.top)}, id: rect.key, name: item.asset.displayName || item.asset.label, imagePath: item.asset.runtimePath,
      // Default dialogue overlaps a little lower body; preserve readable head and authored scale.
      rect: { x: rect.x, y: Math.max((viewport?.actorHeadMargin ?? 8) - rect.height * item.asset.geometry!.top, (viewport?.actorBaseline ?? 558) - rect.height * item.asset.geometry!.bottom), width: rect.width, height: rect.height },
      ...(item.actor.motion ? {motion:{version:1 as const,type:item.actor.motion.type,durationMs:item.actor.motion.durationMs??600,delayMs:item.actor.motion.delayMs??0,
        offsetX:item.actor.motion.type==='move'?(width*(item.actor.motion.fromXAnchor??50)/100-(rect.x+rect.width/2)):0}} : {}),
      flipX: item.mirrored, opacity: item.override.opacity ?? 1, spectral: item.override.spectral ?? false,
      emphasis: item.override.emphasis ?? (listener ? 'dim' : 'normal'),
      depth: stageActorDepth(item.actor, item.index, item.groupSize, stage.speakerActorKeys?.includes(item.actor.key) ? item.actor.key : speaker) };
  });
  const backgroundId = line.backgroundMode === 'none' ? '' : line.backgroundId || chapter?.backgroundId || project.stageDefaults?.backgroundId || '';
  const background = backgroundId ? resolveAsset(backgroundId) : undefined;
  if (backgroundId && !background) throw new Error(`배경 자산을 찾을 수 없어요: ${backgroundId}`);
  const sourceSize = background ? getBackgroundSize(background.id) : undefined;
  const backgroundFit = line.presentation?.backgroundFit ?? (viewport || background?.backgroundRole === 'scenery' ? 'cover' as const : 'contain' as const);
  const focal = line.presentation?.backgroundFocal;
  const path=options.playbackPath??audioPreviewPath(project,lineId);const presentation=compileStoryPresentation(project,lineId,path);
  const scene: RuntimeScene = { contractVersion: 1, sceneId: `${project.id}/${line.id}`, revision, width, height,
    ...(viewport ? { viewportVersion: 1 as const, textboxRect: viewport.textboxRect, dialogueStyle: viewport.dialogueStyle } : {}),
    ...(options.presentationEntry ? { presentationEntry: options.presentationEntry } : {}),
    audio: compileStoryAudio(project, lineId, options.audioResolver ?? (id => resolveAudioAsset(id) ?? (customAudioRuntimePath(id) ? {runtimePath:customAudioRuntimePath(id)!} : undefined)), path),
    actors, dialogue: { speaker: line.speakerName || (line.type === 'narration' ? '해설' : '화자'), text: line.text },
    ...(background ? { background: { imagePath: background.runtimePath, fit: backgroundFit, ...(focal ? { focal } : {}), ...(viewport && sourceSize ? { rect: resolveBackgroundRect(sourceSize, { width, height }, backgroundFit, focal) } : {}) } } : {}),
    choices: !line.ending?.endsStory && line.flow?.type === 'choice' ? line.flow.options.map(option => ({ id: option.id, text: option.label })) : [],
    mode: options.mode, reducedMotion: options.reducedMotion ?? false,
    ...(presentation?{presentation}:{}) };
  if (!isRuntimeScene(scene)) throw new Error(`장면 계약을 확인해 주세요: ${line.id}`);
  return scene;
}
