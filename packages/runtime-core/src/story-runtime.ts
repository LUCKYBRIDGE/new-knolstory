import { getBackgroundSize, customAudioRuntimePath, resolveAudioAsset, resolveAsset } from '@knolstory/asset-registry';
import { activeStageSpeaker, createStoryDocument, orderedStoryFlowLines, parseStoryDocument, patchStageLine,
  resolveStageComposition, stageActorDepth, type StoryLine, type StoryProject } from '@knolstory/story-domain';
import { isRuntimeScene, type RuntimeActor, type RuntimeScene } from '@knolstory/runtime-contract';
import {mergeActorOverride} from './actor-overrides';
import { resolveStageLayout } from './stage-layout';
import { stageCharacterScale, stageReadableCharacterScale, stageSharedActor, stageShouldMirror } from './stage-view';
import { resolveBackgroundRect, resolveStoryViewport, type StoryViewportSize, type DialogueDock } from './responsive-layout';
import {compileStoryPresentation} from './presentation-scopes';
import { initialStoryScores, type StoryScoreValues, availableStoryChoices, playbackScores, storyScoreCondition, applyStoryScoreEffects } from './story-scores';
import { audioPreviewPath, compileStoryAudio, type AudioAssetResolver } from './audio';

import {storyBranchConditionReferences} from './branch-condition-references';

export const orderedLines = orderedStoryFlowLines;
export type PlaybackState = Readonly<{ lineId: string | null; path: readonly string[];
  status: 'reading' | 'choice' | 'ended' | 'pending' | 'approval-required';
  choiceHistory?: readonly Readonly<{pathIndex:number;choiceId:string}>[] }>;

function requireLine(project: StoryProject, lineId: string): StoryLine {
  const line = project.lines.find(item => item.id === lineId);
  if (!line) throw new Error('이야기 컷을 찾을 수 없어요.');
  return line;
}
function lineStatus(project:StoryProject,line:StoryLine,state:PlaybackState,values?:StoryScoreValues):PlaybackState['status'] {
  if(line.ending?.endsStory || line.flow?.type!=='choice')return 'reading';
  return (values?line.flow.options.filter(option=>storyScoreCondition(values,option.condition)):availableStoryChoices(project,line.id,state)).length?'choice':'pending';
}
export function createPlayback(project: StoryProject, lineId?: string): PlaybackState {
  const initial = lineId ?? orderedLines(project)[0]?.id;
  if (!initial) return { lineId: null, path: [], status: 'ended' };
  const state:PlaybackState={lineId:initial,path:[initial],status:'reading'};
  return {...state,status:lineStatus(project,requireLine(project,initial),state)};
}
function targetForLine(project:StoryProject,state:PlaybackState,choiceId?:string,knownScores?:StoryScoreValues):string|null|undefined{
  const line=requireLine(project,state.lineId!);
  if(line.ending?.endsStory)return null;
  const values=knownScores??playbackScores(project,state);
  if(line.flow?.type==='choice'){
    if(choiceId===undefined)return undefined;
    const option=line.flow.options.find(item=>item.id===choiceId);
    if(!option)throw new Error('선택지를 찾을 수 없어요.');
    if(!storyScoreCondition(values,option.condition))throw new Error('이 선택지는 현재 점수 조건을 만족하지 않아요.');
    applyStoryScoreEffects(values,option.effects); // Reject overflow before recording a decision or moving.
    return option.targetLineId;
  }
  if(line.flow?.type==='goto'){const route=line.flow.routes?.find(route=>storyScoreCondition(values,route.condition));return route?route.targetLineId:line.flow.targetLineId;}
  const lines=orderedLines(project);
  return lines[lines.findIndex(item=>item.id===line.id)+1]?.id??null;
}
export function advancePlayback(project: StoryProject, state: PlaybackState, choiceId?: string): PlaybackState {
  return advanceKnownScores(project,state,choiceId);
}
function advanceKnownScores(project:StoryProject,state:PlaybackState,choiceId?:string,values?:StoryScoreValues):PlaybackState{
  if (state.lineId === null) return state;
  const line=requireLine(project,state.lineId),target=targetForLine(project,state,choiceId,values);
  if(target===undefined)return {...state,status:lineStatus(project,line,state,values)};
  if(target==='' || target!==null&&!project.lines.some(item=>item.id===target))return {...state,status:'pending'};
  const history=line.flow?.type==='choice'&&!line.ending?.endsStory
    ? [...(state.choiceHistory??[]).filter(item=>item.pathIndex<state.path.length-1),{pathIndex:state.path.length-1,choiceId:choiceId!}]
    :state.choiceHistory;
  const decisions=history?{choiceHistory:history}:{};
  if(target===null)return {...state,...decisions,lineId:null,status:'ended'};
  const next:PlaybackState={lineId:target,path:[...state.path,target],status:'reading',...decisions};
  const option=line.flow?.type==='choice'?line.flow.options.find(item=>item.id===choiceId):undefined;
  const nextValues=values?applyStoryScoreEffects(values,option?.effects):undefined;
  return {...next,status:lineStatus(project,requireLine(project,target),next,nextValues)};
}
export function backPlayback(project: StoryProject, state: PlaybackState): PlaybackState {
  const path=state.lineId===null?[...state.path]:state.path.slice(0,-1),previous=path.at(-1);
  if(!previous)return state;
  const choices=state.choiceHistory?.filter(item=>item.pathIndex<path.length-1);
  const next:PlaybackState={lineId:previous,path,status:'reading',...(choices?.length?{choiceHistory:choices}:{})};
  return {...next,status:lineStatus(project,requireLine(project,previous),next)};
}

/** Replay every edge and recorded decision using the same interpreter as live reading. */
export function restorePlayback(project: StoryProject, value: unknown): PlaybackState {
  if(!value||typeof value!=='object')throw new Error('이어읽기 상태를 확인해 주세요.');
  const stored=value as Record<string,unknown>;
  if(!Array.isArray(stored.path)||stored.path.length>10000||!Array.from(stored.path).every(id=>typeof id==='string'))throw new Error('이어읽기 경로를 확인해 주세요.');
  const path=stored.path as string[];
  if(!path.length)return createPlayback(project);
  const choices=readStoredChoices(stored.choiceHistory,path);
  const referencedSources=new Set(storyBranchConditionReferences(project).map(ref=>ref.condition.sourceLineId));
  let current=createPlayback(project,path[0]);
  let scores=initialStoryScores(project);
  for(let index=0;index<path.length;index++){
    if(current.lineId!==path[index])throw new Error('이야기 연결이 바뀌어 이전 경로를 이어 읽을 수 없어요.');
    const destination=path[index+1]??(stored.status==='ended'&&stored.lineId===null?null:undefined);
    const recorded=choices?.find(entry=>entry.pathIndex===index);
    if(destination===undefined){if(recorded)throw new Error('저장된 선택 기록을 확인해 주세요.');break;}
    const line=requireLine(project,current.lineId!);
    let choiceId=recorded?.choiceId;
    if(line.flow?.type==='choice'&&!line.ending?.endsStory){
      if(!choiceId){
        if(referencedSources.has(line.id))throw new Error('분기 연출을 복원할 정확한 선택 기록이 없어요. 다시 읽기를 시작해 주세요.');
        if(line.flow.options.some(option=>option.condition||option.effects?.length))throw new Error('점수 이야기를 복원할 정확한 선택 기록이 없어요. 다시 읽기를 시작해 주세요.');
        const matches=line.flow.options.filter(option=>option.targetLineId===destination);
        if(!matches.length)throw new Error('이야기 연결이 바뀌어 이전 경로를 이어 읽을 수 없어요.');
        choiceId=matches[0].id;
      }
    }else if(recorded)throw new Error('저장된 선택 기록을 확인해 주세요.');
    current=advanceKnownScores(project,current,choiceId,scores);
    const option=line.flow?.type==='choice'&&!line.ending?.endsStory?line.flow.options.find(item=>item.id===choiceId):undefined;
    scores=applyStoryScoreEffects(scores,option?.effects);
    if(current.lineId!==destination)throw new Error('이야기 연결이나 점수 조건이 바뀌어 이전 경로를 이어 읽을 수 없어요.');
  }
  if(current.lineId!==stored.lineId)throw new Error('이어읽기 위치를 확인해 주세요.');
  const last=requireLine(project,path.at(-1)!);
  if(stored.status==='pending'&&current.lineId!==null){
    const target=last.flow?.type==='choice'?undefined:targetForLine(project,current);
    if(last.flow?.type==='choice'&&(current.status==='pending'||last.flow.options.some(option=>option.targetLineId==='')) || target==='' || target!==undefined&&target!==null&&!project.lines.some(line=>line.id===target))current={...current,status:'pending'};
    else if(last.flow?.type==='choice'&&last.flow.options.some(option=>option.condition))current={...current,status:lineStatus(project,last,current,scores)};
    else throw new Error('이어읽기 진행 상태를 확인해 주세요.');
  }else if(current.status!==stored.status)throw new Error('이어읽기 진행 상태를 확인해 주세요.');
  // Preserve absent historic decisions for unscored documents; never invent their labels.
  const {choiceHistory:_derived,...base}=current;
  return {...base,...(choices?{choiceHistory:choices}:{})};
}
function readStoredChoices(value:unknown,path:readonly string[]):PlaybackState['choiceHistory']{
  if(value===undefined)return undefined;
  if(!Array.isArray(value)||value.length>path.length)throw new Error('저장된 선택 기록을 확인해 주세요.');
  const seen=new Set<number>();
  return Array.from(value).map(entry=>{
    if(!entry||typeof entry!=='object'||!Number.isInteger(entry.pathIndex)||entry.pathIndex<0||entry.pathIndex>=path.length||typeof entry.choiceId!=='string'||seen.has(entry.pathIndex))throw new Error('저장된 선택 기록을 확인해 주세요.');
    seen.add(entry.pathIndex);return {pathIndex:entry.pathIndex,choiceId:entry.choiceId};
  });
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
  options: Readonly<{ mode: 'edit' | 'play'; reducedMotion?: boolean; viewport?: StoryViewportSize; displaySize?:StoryViewportSize; dialogueDock?:DialogueDock; playbackPath?: readonly string[]; playbackState?:PlaybackState; audioResolver?: AudioAssetResolver; presentationEntry?: string }> = { mode: 'edit' }): RuntimeScene {
  const line = requireLine(project, lineId);
  const viewport = options.viewport ? resolveStoryViewport(options.viewport,options.displaySize,options.dialogueDock) : undefined;
  const width = viewport?.width ?? 1280, height = viewport?.height ?? 720;
  const chapter = project.chapters.find(item => item.id === line.chapterId);
  const stage = resolveStageComposition(chapter, line, project);
  const speaker = activeStageSpeaker(stage, line);
  const sourceActors = (['left', 'right'] as const).flatMap(side => stage[side === 'left' ? 'leftActors' : 'rightActors'].filter(actor=>!viewport?.portrait || actor.key===speaker).map((actor, index, group) => {
    const asset = resolveAsset(actor.assetId);
    if (!asset?.geometry) throw new Error(`인물 자산을 찾을 수 없어요: ${actor.assetId}`);
    const override = mergeActorOverride(actor,index,line.presentation?.actors?.[side]);
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
  const path=options.playbackState?.path??options.playbackPath??audioPreviewPath(project,lineId);const presentation=compileStoryPresentation(project,lineId,path,options.playbackState?.choiceHistory);
  const scene: RuntimeScene = { contractVersion: 1, sceneId: `${project.id}/${line.id}`, revision, width, height,
    ...(viewport ? { viewportVersion: 1 as const, textboxRect: viewport.textboxRect, dialogueStyle: viewport.dialogueStyle } : {}),
    ...(options.presentationEntry ? { presentationEntry: options.presentationEntry } : {}),
    audio: compileStoryAudio(project, lineId, options.audioResolver ?? (id => resolveAudioAsset(id) ?? (customAudioRuntimePath(id) ? {runtimePath:customAudioRuntimePath(id)!} : undefined)), path,options.playbackState?.choiceHistory),
    actors, dialogue: { speaker: line.speakerName || (line.type === 'narration' ? '해설' : '화자'), text: line.text },
    ...(background ? { background: { imagePath: background.runtimePath, fit: backgroundFit, ...(focal ? { focal } : {}), ...(viewport && sourceSize ? { rect: resolveBackgroundRect(sourceSize, { width, height }, backgroundFit, focal) } : {}) } } : {}),
    choices: !line.ending?.endsStory && line.flow?.type === 'choice' ? (options.mode==='play'?availableStoryChoices(project,lineId,options.playbackState):line.flow.options).map(option => ({ id: option.id, text: option.label })) : [],
    mode: options.mode, reducedMotion: options.reducedMotion ?? false,
    ...(presentation?{presentation}:{}) };
  if (!isRuntimeScene(scene)) throw new Error(`장면 계약을 확인해 주세요: ${line.id}`);
  return scene;
}
