"use client";
import {WorkLeaveGuard} from './work-leave-guard';
import {createWorkLeaveTracker} from '../lib/work-leave-tracker';
import type {ReaderTapMode} from '../lib/reader-preferences';
import {MobileFullscreenOffer} from './mobile-fullscreen-offer';
import {StoryLoading} from './story-loading';
import {incomingStoryConnections} from '../lib/story-connection-labels';
import {EditorFlowContext} from './editor-flow-context';
import {StoryBranchEditingContext} from './story-branch-editing-context';
import {StoryWorkspaceInspector} from './story-workspace-inspector';
import {StoryEditingWorkbench} from './story-editing-workbench';
import {useAdjacentSceneThumbnails} from './use-adjacent-scene-thumbnails';
import {StoryChapterSettings} from './story-chapter-settings';
import {useEditorPreferences} from '../lib/editor-preferences';
import {LocalWorkFileActions} from './local-work-file-actions';
import {createLocalWorkFileSession} from '../lib/local-work-file';
import {useReaderDisplayViewport} from './use-reader-display-viewport';
import {OnlineWorksPanel} from './online-works-panel';
import {createOnlineWorkStore,saveOnlineWork} from '../lib/online-work-bindings';
import type {OnlineDocument} from '../lib/document-api';
import {AccountMenu} from './account-menu';
import {consumeAccountReturnDestination} from '../lib/account-return';
import {createChoiceWritingDraft} from '../lib/choice-writing';
import {StoryChoiceWritingDialog} from './story-choice-writing-dialog';
import {StoryCutPosition} from "./story-cut-context";
import {usePreviewEditorContext} from './use-preview-editor-context';
import {rewindReader} from '../lib/reader-rewind';
import {useEditorKeyboard} from "./use-editor-keyboard";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  getRepresentativeStory,
  representativeStories,classicStories,resolveProvidedCatalogStory,
} from "@knolstory/compatibility";
import {
  resolveStageComposition,
  chapterLabel, cutLabel,
  type StoryProject,
  type StoryLine,
  type StageActorEntry,
} from "@knolstory/story-domain";
import {
  compileStoryScene,
  visibleStoryPathIndices,
  excludedStoryAudio,
  playbackScores,
  orderedLines,
  createPlayback,
  advancePlayback,
  advanceEffectPlayback,
  restorePlayback,
  patchStoryLine,
  screenToStage,
  createBlankStoryProject,
  addStoryChapter,
  insertStoryCut,
  moveStoryCut,
  duplicateStoryCut,splitStoryCut,mergeStoryCuts,
  renameStoryProject,
  analyzeStoryFlow,
  deleteStoryCut,
  getStoryCutDeletionImpact,
} from "@knolstory/runtime-core";
import { useStoryRuntime } from "./story-workspace-runtime";
import styles from "./story-workspace.module.css";
import {WorkspaceManagement} from "./workspace-management";
import {LocalBookshelf,type BookshelfIntent} from "./local-bookshelf";
import {StoryPreparation} from "./story-preparation";
import {WORKSPACE_KEY,preflight,readWorkspace,captureContext,writeWorkspace as writeWorkspaceSnapshot,type WorkContexts,type WorkspaceView} from "../lib/workspace-storage";
import {readPlayerSaves,loadPlayerSlot} from "../lib/player-saves";
import { StoryFlowMap } from "./story-flow-map";
import { StoryFlowContext } from "./story-flow-context";
import {StagePreviewFrame} from './stage-preview-frame';
import {remapMemoNavigation,type MemoNavigationRequest,type WorkSection} from '../lib/memo-navigation';
import {normalizeEditingPath,visitEditingCut,returnToEditingVisit} from '../lib/editor-navigation';
import { CutDeleteDialog } from "./cut-delete-dialog";
import {portableStory,downloadArtifact} from "../lib/story-archive";
import {independentImportedWork} from '../lib/imported-authoring-work';
import {previewAuthoringFile} from '../lib/story-file-preview';
import {EditorTermGuide} from './editor-term-guide';
import {AuthoringImportDialog} from './authoring-import-dialog';
import {StorageReloadDialog} from './storage-reload-dialog';
import {createAuthoringArchive,encodeAuthoringArchive,prepareJsonbSnapshot,restoreJsonbSnapshot,type AuthoringArchive} from '@knolstory/compatibility';
import {importAudioResources,copyAudioWorkMetadata} from '../lib/audio-resources';
import {PersonalLibraryTools} from './personal-library-tools';
import {prepareImportedWork,copyPersonalWork,isPersonalWork,readDeletedWork,DELETED_WORK_KEY,type DeletedWork} from '../lib/personal-library';
import {useEditorMenus} from './use-editor-menus';
import {StoryStageNavigation} from './story-stage-navigation';
import {StoryTextAccessibility} from './story-text-accessibility';
import {StoryPlayerMenu} from "./story-player-menu";
import { storySceneLayout, type PreviewProfile } from "../lib/story-viewport";
import {BookIntroduction} from './book-introduction';
import {BookStart} from './book-start';
import {BookCoverEditor} from './book-cover-editor';
import {loadLandingVisit,markLandingVisited,resolveEntryView} from '../lib/landing-visit';
import {useStorageWriter} from './use-storage-writer';
import {StoryRecoveryPanel} from './story-recovery-panel';
import {createStoryCheckpoint,recordBeforeCutDeletion,type StoryCheckpoint} from '../lib/story-checkpoints';
import {scheduleWorkspaceAutosave} from '../lib/workspace-autosave';
const FIRST = representativeStories[0]!;
const builtInStories=[...representativeStories,...classicStories];

export function StoryWorkspace() {
  const [pendingBranch,setPendingBranch]=useState<(ReturnType<typeof createChoiceWritingDraft>&{before:StoryProject;workId:string;label:string;sourceLabel:string})|null>(null);
  const [branchError,setBranchError]=useState('');
  const [pendingArchive,setPendingArchive]=useState<AuthoringArchive|null>(null);
  const [importBusy,setImportBusy]=useState(false);
  const [confirmStorageReload,setConfirmStorageReload]=useState(false);
  const importReadSequence=useRef(0);
  const [deletedWork,setDeletedWork]=useState<DeletedWork|undefined>();
  const [pendingWorkDelete,setPendingWorkDelete]=useState<string|null>(null);
  const writer=useStorageWriter(WORKSPACE_KEY);
  const [checkpointRefresh,setCheckpointRefresh]=useState(0);
  const contexts = useRef<WorkContexts>({});
  const [editingPaths,setEditingPaths]=useState<Readonly<Record<string,readonly string[]>>>({});
  const [view,setView]=useState<WorkspaceView>('home');
  const [runtimeMounted,setRuntimeMounted]=useState(false);
  const directEditor = useRef(false);
  const shell = useRef<HTMLElement>(null);
  const [localFileSession]=useState(createLocalWorkFileSession);
  const [leaveTracker]=useState(createWorkLeaveTracker);
  const [settingsHost,setSettingsHost]=useState<HTMLDivElement|null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [fullscreenAvailable,setFullscreenAvailable]=useState(false);
  const fullscreenSwitchPending=useRef(false);
  const [project, setProject] = useState<StoryProject>(
    () => getRepresentativeStory(FIRST.id).project,
  );
  const [storyId, setStoryId] = useState<string>(FIRST.id);
  const savedProjects = useRef<Record<string, StoryProject>>({});
  const [importedWorks, setImportedWorks] = useState<Record<string, string>>(
    {},
  );
  const [lineId, setLineId] = useState(
    () => orderedLines(FIRST.project)[0]!.id,
  );
  const [mode, setMode] = useState<"edit" | "play">("edit");
  const readerDisplay=useReaderDisplayViewport(mode==='play'||view==='editor');
  const [playback, setPlayback] = useState(() => createPlayback(FIRST.project));
  const [revision, setRevision] = useState(0);
  const [displaySize, setDisplaySize] = useState({width:1280,height:720});
  const [previewProfile, setPreviewProfile] = useState<PreviewProfile>("auto");
  const [presentationEntry, setPresentationEntry] = useState(0);
  const [playbackRun, setPlaybackRun] = useState(0);
  const [readerBusy,setReaderBusy]=useState(false);
  const [readerTextScale,setReaderTextScale]=useState(1);
  const [readerTapMode,setReaderTapMode]=useState<ReaderTapMode>('next');
  const [readerFormat,setReaderFormat]=useState<'auto'|'landscape'|'portrait'>('auto');
  const [readerResume,setReaderResume]=useState<Readonly<{lineId:string;offset:number}>|null>(null);
  const [readingFromEditor,setReadingFromEditor]=useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [loadComplete, setLoadComplete] = useState(false);
  const [saveStatus, setSaveStatus] = useState("임시 보관 준비 중");
  const [error, setError] = useState("");
  const [storageError, setStorageError] = useState("");
  const keyboard=useEditorKeyboard();
  const [editorPreferences,setEditorPreferences]=useEditorPreferences(project.id);
  const editingScreen=editorPreferences.screen;
  const logic=editorPreferences.logic;
  const [soundTool,setSoundTool]=useState(false);
  const [flowMapOpen, setFlowMapOpen] = useState(false);
  const [compact, setCompact] = useState(false);
  const [activeTool, setActiveTool] = useState<"text" | "assets" | "flow" | "presentation" | "cuts" | "writer" | null>("text");
  const [editorView, setEditorView] = useState<"cut" | "writer">("cut");
  const [writerChapterId, setWriterChapterId] = useState<string|null>(null);
  const [deleteId, setDeleteId] = useState<string|null>(null);
  const [undoDelete, setUndoDelete] = useState<{before:StoryProject;after:StoryProject;lineId:string}|null>(null);
  const [memoRequest,setMemoRequest]=useState<MemoNavigationRequest|null>(null);
  const settingsReturnFocus=useRef<{projectId:string;lineId:string;field:HTMLElement}|null>(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [composing, setComposing] = useState(false);
  const viewToolsMenu=useEditorMenus(manageOpen,setManageOpen,composing);
  const onlineWorkspaceGeneration=useRef(0);
  useEffect(()=>{onlineWorkspaceGeneration.current++;},[project,storyId,deletedWork,view,composing]);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [motionOverride, setMotionOverride] = useState(false);
  const visiblePathIndices=useMemo(()=>visibleStoryPathIndices(project,playback),[project,playback]);
  const readerCanGoBack=visiblePathIndices.length>=2||playback.status==='ended'&&visiblePathIndices.length>0;
  const selectedLine =
    mode === "play"
      ? (playback.lineId ?? playback.path[visiblePathIndices.at(-1)??-1] ?? lineId)
      : lineId;
  const line =
    project.lines.find((item) => item.id === selectedLine) ??
    orderedLines(project)[0]!;
  const previewEditor=usePreviewEditorContext(mode,`${project.id}/${line.id}/${editorView}/${activeTool}/${soundTool}`,view==='editor');
  const chapter = project.chapters.find((item) => item.id === line.chapterId)!;
  const chapterCuts = orderedLines(project).filter(cut => cut.chapterId === chapter.id);
  const chapterCutIndex = chapterCuts.findIndex(cut => cut.id === line.id);
  const ordered = useMemo(() => orderedLines(project), [project]);
  const editingPath=useMemo(()=>normalizeEditingPath(editingPaths[storyId]??contexts.current[storyId]?.editingPath,project.lines.map(cut=>cut.id),lineId),[editingPaths,storyId,project,lineId]);
  const flowGraph = useMemo(() => analyzeStoryFlow(project), [project]);
  const excludedAudio = useMemo(() => excludedStoryAudio(project), [project]);
  const flowNodes = useMemo(() => new Map(flowGraph.nodes.map(node => [node.lineId, node])), [flowGraph]);
  const scene = useMemo(() => {
    const compiled=compileStoryScene(project,line.id,revision,{mode,reducedMotion:reducedMotion||motionOverride,...storySceneLayout(mode,readerFormat,displaySize),dialogueDock:{bottomInsetPx:0,safeBottomPx:0},playbackPath:mode==='play'?playback.path:undefined,playbackState:mode==='play'?playback:undefined});
    return {...compiled,...(mode==='play'?{readerTapMode,readerCanGoBack:readerCanGoBack}:{}),...(mode==='play'&&readerResume?.lineId===line.id?{dialogueOffset:readerResume.offset}:{}),...(compiled.dialogueStyle?{dialogueStyle:{...compiled.dialogueStyle,fontSize:Math.min(96,Math.max(16,Math.round(compiled.dialogueStyle.fontSize*readerTextScale)))}}:{}),audio:{...compiled.audio!,sessionId:`${project.id}/${playbackRun}`},presentationEntry:String(presentationEntry),...(mode==='play'&&playback.status==='ended'?{ended:true,choices:[]}: {})};
  }, [project,line.id,revision,mode,reducedMotion,motionOverride,playback,displaySize,presentationEntry,playbackRun,readerTextScale,readerResume,readerFormat,readerTapMode,readerCanGoBack]);
  const stage = resolveStageComposition(chapter, line, project);
  const dragCleanup = useRef<(() => void) | null>(null);
  const completedCueEntry = useRef<string | null>(null);
  const runtime = useStoryRuntime(scene, composing, (event) => {
    if (mode !== "play") return;
    if (event.type === "advanceRequested") advance();
    if (event.type === "backRequested") rewind();
    if (event.type === "choiceSelected") advance(event.choiceId);
  }, (size) => {
    if(mode==='edit'&&keyboard.frozen.current)return;
    if(mode==='play'&&document.activeElement instanceof HTMLInputElement)return;
    setDisplaySize(current => {
      if (current.width === size.width && current.height === size.height) return current;
      return size;
    });
    setRevision(value=>value+1);
  }, runtimeMounted, mode==='play'&&readerBusy);
  useEffect(() => {
    if (!scene.transitionOnly || !runtime.presentationReady || readerBusy || !!scene.effectSteps) return;
    const entry = JSON.stringify([project.id, playbackRun, presentationEntry, line.id]);
    if (completedCueEntry.current === entry) return;
    completedCueEntry.current = entry;
    advance(undefined, true);
  });
  const adjacentThumbnails=useAdjacentSceneThumbnails(project,line.id,runtime.frame,view==='editor'&&mode==='edit'&&editingScreen==='basic',runtime.ready&&runtime.rendered===scene.revision,composing,readerTextScale);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 720px), (max-width: 1000px) and (max-height: 500px)");
    const sync = () => {setCompact(media.matches);setRevision(value=>value+1);};
    const timer = window.setTimeout(sync, 0);
    media.addEventListener("change", sync);
    return () => { window.clearTimeout(timer); media.removeEventListener("change", sync); };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const requestedView=new URLSearchParams(location.search).get('view');
        directEditor.current=requestedView==='editor';
        let accountReturn=false;try{const destination=consumeAccountReturnDestination(sessionStorage,location.search);if(destination==='shortstory'){const query=new URLSearchParams(location.search),forward=new URLSearchParams();forward.set('auth',query.get('auth')!);const reason=query.get('reason');if(reason)forward.set('reason',reason);location.replace(`/shortstory?${forward}`);return;}accountReturn=destination==='library';}catch{/* Optional account return cannot alter authored storage. */}
        const directLibrary=requestedView==='library'||accountReturn;
        const raw = localStorage.getItem(WORKSPACE_KEY);
        const visited=loadLandingVisit(localStorage);
        const reload=(performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming|undefined)?.type==='reload';
        if(raw){
          const loaded=readWorkspace(raw);contexts.current=loaded.contexts;savedProjects.current=loaded.works;setEditingPaths(Object.fromEntries(Object.entries(loaded.contexts).map(([key,context])=>[key,context.editingPath??[context.lineId]])));
          setImportedWorks(Object.fromEntries(Object.entries(loaded.works).filter(([id])=>id.startsWith('new:')||id.startsWith('import:')).map(([id,work])=>[id,work.title])));
          setProject(loaded.project);setStoryId(loaded.storyId);
          const context=loaded.contexts[loaded.storyId]!;setLineId(context.lineId);setEditorView(context.editorView);setActiveTool(context.activeTool);setWriterChapterId(context.writerChapterId);setPreviewProfile(context.previewProfile);
          const entry=resolveEntryView({visited,hasWorkspace:true,reload,storedView:loaded.view,directEditor:directEditor.current,directLibrary});
          try{const slot=readPlayerSaves(localStorage).works[loaded.project.id]?.auto;if(slot){const saved=loadPlayerSlot(loaded.project,slot);if(JSON.stringify(saved.state)===JSON.stringify(loaded.playback))setReaderResume(saved.dialoguePosition??null);}}catch{/* Invalid reading slots remain untouched. */}
          setReadingFromEditor(entry==='editor'&&loaded.mode==='play'&&directEditor.current);setPlayback(loaded.playback);setMode(entry==='editor'?loaded.mode:'edit');setView(entry);setRuntimeMounted(entry==='editor');
          if(loaded.warning)setError(loaded.warning);setRevision(v=>v+1);
        }else{setView(resolveEntryView({visited,hasWorkspace:false,reload,directEditor:directEditor.current,directLibrary}));setRuntimeMounted(directEditor.current);}

        if(directLibrary){const url=new URL(location.href);url.searchParams.delete('view');history.replaceState(history.state,'',`${url.pathname}${url.search}${url.hash}`);}
        try{const raw=localStorage.getItem(WORKSPACE_KEY);setDeletedWork(raw?readWorkspace(raw).deletedWork??readDeletedWork(localStorage):readDeletedWork(localStorage));}catch(issue){setError(String(issue));}
        setHydrated(true);
      } catch {
        if(directEditor.current){setView('editor');setRuntimeMounted(true);}
        // The recovery panel explains the failure without exposing parser text
        // (which can contain manuscript excerpts) or duplicating the notice.
        setError('');
        setStorageError("임시 보관을 읽지 못해 원본을 유지하고 자동 보관을 중지했어요. 현재 편집한 작품은 작품 파일로 저장해 주세요.");
        setSaveStatus("임시 보관 중지");
      } finally {
        setLoadComplete(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (!hydrated||writer.status!=='owned') return;
    if(view!=='home')markLandingVisited(localStorage);
    return scheduleWorkspaceAutosave(window, () => {
      try {
        const next=writeWorkspaceSnapshot(writer.guard.current!,project,savedProjects.current,contexts.current,{deletedWork,storyId,lineId,editingPath,mode,playback,editorView,activeTool,writerChapterId,previewProfile,view});savedProjects.current=next.works;contexts.current=next.contexts;
        setSaveStatus("임시 보관됨");
      } catch (issue) {
        setSaveStatus("임시 보관 실패 — 작품 파일로 저장해 주세요");
        setError(`브라우저에 복구본을 보관하지 못했어요. 현재 원고는 화면에 유지됩니다. 작품 파일로 저장해 주세요. ${String(issue)}`);
      }
    });
  }, [project, storyId, lineId, hydrated, mode, playback, view,editorView,activeTool,writerChapterId,previewProfile,writer.status,writer.guard,deletedWork,editingPath]);
  useEffect(() => () => dragCleanup.current?.(), []);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => { setReducedMotion(query.matches); setRevision(value => value + 1); };
    const timer = window.setTimeout(change, 0);
    query.addEventListener("change", change);
    return () => {
      window.clearTimeout(timer);
      query.removeEventListener("change", change);
    };
  }, []);
  useEffect(() => {
    dragCleanup.current?.();
  }, [runtime.fit.width, runtime.fit.height]);

  useEffect(() => {
    const sync = () => setFullscreen(document.fullscreenElement !== null && (document.fullscreenElement === document.documentElement || document.fullscreenElement === shell.current));
    sync();
    const availabilityFrame=requestAnimationFrame(()=>setFullscreenAvailable(!!document.fullscreenEnabled&&typeof document.documentElement.requestFullscreen==='function'));
    document.addEventListener('fullscreenchange', sync);
    return () => {cancelAnimationFrame(availabilityFrame);document.removeEventListener('fullscreenchange', sync);};
  }, []);
  async function toggleFullscreen() {
    if(fullscreenSwitchPending.current)return;
    fullscreenSwitchPending.current=true;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen({navigationUI:'hide'});
    } catch {
      setError('전체 화면을 전환하지 못했어요. 현재 화면에서 계속하거나 다시 눌러 주세요.');
    } finally { fullscreenSwitchPending.current=false; }
  }
  function snapshot(){return {deletedWork,storyId,lineId,editingPath,mode,playback,editorView,activeTool,writerChapterId,previewProfile,view};}
  function rememberCurrent(){
    savedProjects.current={...savedProjects.current,[storyId]:project};
    contexts.current={...contexts.current,[storyId]:captureContext(project,contexts.current[storyId],snapshot())};
  }
  function ensureWritable(){if(!writer.guard.current)throw Error('임시 보관 준비 중이에요.');writer.guard.current.assertWritable();}
  function createCheckpoint(){if(composing)throw Error('한글 입력을 마친 뒤 원고를 기록해 주세요.');ensureWritable();createStoryCheckpoint(localStorage,project,'manual');setCheckpointRefresh(v=>v+1);}
  async function restoreCheckpoint(checkpoint:StoryCheckpoint){
    if(composing){setError('한글 입력을 마친 뒤 이전 원고를 열어 주세요.');return;}
    try{if(hydrated)ensureWritable();}catch(issue){setError(String(issue));return;}
    const copy=copyPersonalWork(checkpoint.project,crypto.randomUUID(),new Date().toISOString());
    if(!await preserveCopyAudio(checkpoint.project,copy))return;
    rememberCurrent();const key=`new:${copy.id}`;savedProjects.current={...savedProjects.current,[key]:copy};
    setImportedWorks(current=>({...current,[key]:copy.title}));setProject(copy);setStoryId(key);setLineId(orderedLines(copy)[0]!.id);setPlayback(createPlayback(copy));setMode('edit');setView('prepare');setRevision(v=>v+1);setError('이전 원고를 별도 사본으로 열었어요. 현재 원고와 다른 작품은 보존됩니다.');
  }
  function restartProtectedStorage(){
    try{ensureWritable();const raw=localStorage.getItem(WORKSPACE_KEY);if(raw!==null)localStorage.setItem(`knolstory-workspace-recovery-${crypto.randomUUID()}`,raw);
      const saved=writeWorkspaceSnapshot(writer.guard.current!,project,{[storyId]:project},{},snapshot());savedProjects.current=saved.works;contexts.current=saved.contexts;
      setImportedWorks(isPersonalWork(storyId)?{[storyId]:project.title}:{});setHydrated(true);setStorageError('');setError('손상 원본을 별도로 보존하고 현재 작품으로 새 보관함을 시작했어요.');setSaveStatus('임시 보관됨');
    }catch(issue){setError(`복구하지 못했어요. 원본과 현재 작품은 유지됩니다. ${String(issue)}`);}
  }
  function persistWorkspace(overrides:Partial<ReturnType<typeof snapshot>>={}){
    if(!hydrated)throw Error('기존 복구본을 보호하기 위해 브라우저 보관을 중지했어요. 현재 작품을 작품 파일로 저장하거나 브라우저 보관함을 복구한 뒤 다시 시도해 주세요.');
    const next=writeWorkspaceSnapshot(writer.guard.current!,project,savedProjects.current,contexts.current,{...snapshot(),...overrides});
    savedProjects.current=next.works;contexts.current=next.contexts;
  }
  function beforeAccountNavigation(){
    if(composing){setError('한글 입력을 마친 뒤 로그인해 주세요.');return false;}
    try{persistWorkspace();return true;}catch{setError('현재 원고의 복구본을 보관하지 못해 로그인 화면으로 이동하지 않았어요. 작품 파일로 저장하거나 브라우저 보관함을 복구한 뒤 다시 시도해 주세요.');return false;}
  }
  function returnToLibrary(){
    if(composing){setError('한글 입력을 마친 뒤 서재로 이동해 주세요.');return;}
    if(view==='editor'||view==='prepare')try{persistWorkspace();}catch{setError('서재로 이동하기 전 원고를 임시 보관하지 못했어요. 현재 편집을 유지합니다. 작품 파일로 저장하거나 기기 보관함을 복구한 뒤 다시 시도해 주세요.');return;}
    rememberCurrent();setMemoRequest(null);setMode('edit');setFlowMapOpen(false);setView('library');setManageOpen(false);
    if(document.fullscreenElement)void document.exitFullscreen();
    if(location.search)history.replaceState(null,'',location.pathname);
    directEditor.current=false;
  }
  function prepareWork(memoId?:string,section?:WorkSection){if(composing){setError('한글 입력을 마친 뒤 작품 설정을 열어 주세요.');return;}const id=typeof memoId==='string'?memoId:undefined;const origin=document.activeElement;settingsReturnFocus.current=section==='scores'&&view==='editor'&&origin instanceof HTMLElement&&shell.current?.contains(origin)?{projectId:project.id,lineId:line.id,field:origin}:null;if(id!==undefined){try{persistWorkspace();}catch(issue){setError(`현재 원고의 복구본을 보관하지 못해 작품 설정을 열지 않았어요. ${String(issue)}`);return;}}setMemoRequest(id!==undefined?{projectId:project.id,memoId:id,lineId:line.id,section,returnToEditor:true,editorContext:view==='editor'&&mode==='edit'?{editorView,activeTool,writerChapterId,soundTool}:undefined}:null);if(protectAuthoring('prepare'))return;rememberCurrent();setMode('edit');setView('prepare');setManageOpen(false);}
  async function preserveCopyAudio(source:StoryProject,target:StoryProject){
    try{await copyAudioWorkMetadata(source.id,target.id);return true;}
    catch(issue){setError(`사본의 음원 정보를 보존하지 못했어요. 기존 작품은 유지됩니다. ${String(issue)}`);return false;}
  }
  function protectAuthoring(target:'editor'|'prepare',requestedLine?:string){
    if(directEditor.current||!builtInStories.some(item=>item.id===storyId))return false;
    rememberCurrent();const source=contexts.current[storyId];
    const next=copyPersonalWork(project,crypto.randomUUID(),new Date().toISOString());const key=`new:${next.id}`;
    const editId=requestedLine??(mode==='play'?line.id:lineId);
    void preserveCopyAudio(project,next).then(ok=>{if(!ok)return;
    savedProjects.current={...savedProjects.current,[key]:next};
    contexts.current={...contexts.current,[key]:{...source!,lineId:editId,editingPath:requestedLine===undefined?source?.editingPath:visitEditingCut(source?.editingPath,editId,next.lines.map(cut=>cut.id),lineId),playback:undefined,hasRead:false}};
    setMemoRequest(current=>remapMemoNavigation(current,project.id,next.id));setProject(next);setStoryId(key);setImportedWorks(current=>({...current,[key]:next.title}));setLineId(editId);setPlayback(createPlayback(next,editId));setMode('edit');setView(target);setManageOpen(false);setSaveStatus(hydrated?'임시 보관 중':'임시 보관 중지 — 작품 파일로 저장해 주세요');setRevision(v=>v+1);setError('');    });return true;
  }
  function returnFromSettings(){
    if(composing){setError('한글 입력을 마친 뒤 컷 편집으로 돌아가 주세요.');return;}
    if(!memoRequest||memoRequest.projectId!==project.id)return;
    try{
      persistWorkspace();
      if(!project.lines.some(cut=>cut.id===memoRequest.lineId))throw Error('돌아갈 컷을 찾지 못했어요.');
      const context=memoRequest.editorContext;
      const nextPlayback=createPlayback(project,memoRequest.lineId);setError('');
      if(!context){editFromFlow(memoRequest.lineId);setMemoRequest(null);return;}
      dragCleanup.current?.();setLineId(memoRequest.lineId);setPlayback(nextPlayback);
      setView('editor');setRuntimeMounted(true);setMode('edit');setEditorView(context.editorView);
      setActiveTool(context.activeTool);setWriterChapterId(context.writerChapterId);setSoundTool(context.soundTool);
      setFlowMapOpen(false);setManageOpen(false);setPresentationEntry(value=>value+1);setRevision(value=>value+1);setMemoRequest(null);
      const focus=settingsReturnFocus.current;settingsReturnFocus.current=null;
      requestAnimationFrame(()=>{const root=shell.current;if(!root)return;const origin=focus?.projectId===project.id&&focus.lineId===memoRequest.lineId?focus.field:null;if(origin?.isConnected&&root.contains(origin)&&!origin.closest('[hidden],[inert]')&&origin.getClientRects().length){origin.focus({preventScroll:true});return;}if(root.contains(document.activeElement)&&document.activeElement instanceof HTMLElement&&document.activeElement.getClientRects().length)return;root.querySelector<HTMLTextAreaElement>('[data-current-cut] textarea[data-cut-id], [data-writer-current="true"] textarea, #story-line-text')?.focus({preventScroll:true});});
    }catch(issue){setError(`현재 원고의 복구본을 보관하지 못해 컷 편집으로 돌아가지 않았어요. ${String(issue)}`);}
  }
  function continueWriting(){try{persistWorkspace();}catch(issue){setError(`현재 글의 복구본을 보관하지 못해 복귀를 멈췄어요. ${String(issue)}`);return;}setView('editor');setRuntimeMounted(true);setMode('edit');setEditorView('cut');setWriterChapterId(null);setActiveTool('text');setRevision(v=>v+1);}
  function beginBook(resume:boolean){
    setReadingFromEditor(false);setReaderResume(null);
    const state=resume?resumeFor(storyId,project):createPlayback(project);
    if(!state){setError('읽은 위치를 확인할 수 없어요. 처음부터 읽기를 선택해 주세요.');return;}
    if(resume)try{const slot=readPlayerSaves(localStorage).works[project.id]?.auto;if(slot){const saved=loadPlayerSlot(project,slot);if(JSON.stringify(saved.state)===JSON.stringify(state))setReaderResume(saved.dialoguePosition??null);}}catch{/* Unreadable records are preserved; continue at the validated cut. */}
    setPlayback(state);setMode('play');setView('editor');setRuntimeMounted(true);setPlaybackRun(v=>v+1);setPresentationEntry(v=>v+1);setRevision(v=>v+1);setError('');
  }
  function preparationChange(next:StoryProject){setProject({...next,updatedAt:new Date().toISOString()});setSaveStatus(hydrated?'임시 보관 중':'임시 보관 중지 — 작품 파일로 저장해 주세요');setError('');}
  function resumeFor(key:string,next:StoryProject){
    const context=contexts.current[key];
    if(context?.hasRead&&context.playback)try{return restorePlayback(next,context.playback);}catch{/* Changed flow is handled by slots or restart. */}
    try{const slot=readPlayerSaves(localStorage).works[next.id]?.auto;if(slot)return loadPlayerSlot(next,slot).state;}catch{/* Unreadable slots stay protected and their menu reports the error. */}
    return undefined;
  }
  function catalogProject(fixture:(typeof builtInStories)[number]){
    const stored=storyId===fixture.id?project:savedProjects.current[fixture.id];
    // Only exact known catalog editions refresh; authored variants stay protected.
    if(directEditor.current)return stored??fixture.project;
    return resolveProvidedCatalogStory(fixture.project,stored);
  }
  async function openLibraryWork(key:string,intent:BookshelfIntent){
    rememberCurrent();setMemoRequest(null);
    const fixture=builtInStories.find(item=>item.id===key);
    let next=fixture?structuredClone(catalogProject(fixture)):savedProjects.current[key];if(!next)return;
    if(fixture&&(intent==='edit'||intent==='prepare'||intent==='cover')){
      const sourceContext=contexts.current[key],original=next;next=copyPersonalWork(next,crypto.randomUUID(),new Date().toISOString());
      if(!await preserveCopyAudio(original,next))return;key=`new:${next.id}`;
      if(sourceContext)contexts.current={...contexts.current,[key]:{...sourceContext,playback:undefined,hasRead:false}};
      setImportedWorks(current=>({...current,[key]:next!.title}));
      setSaveStatus(hydrated?'임시 보관 중':'임시 보관 중지 — 작품 파일로 저장해 주세요');
    }
    const context=contexts.current[key];const editId=context?.lineId&&next.lines.some(cut=>cut.id===context.lineId)?context.lineId:orderedLines(next)[0]!.id;
    const resume=intent==='resume'?resumeFor(key,next):undefined;
    if(intent==='resume'&&!resume){setError('이 작품의 읽기 위치를 확인할 수 없어요. 처음부터 읽기 또는 읽기 저장 메뉴를 이용해 주세요.');return;}
    setProject(next);setStoryId(key);setLineId(editId);setEditorView(context?.editorView??'cut');setActiveTool(context?.activeTool??'text');setWriterChapterId(context?.writerChapterId??null);setPreviewProfile(context?.previewProfile??'auto');
    setPlayback(resume??createPlayback(next,intent==='edit'||intent==='prepare'?editId:undefined));setMode('edit');setView(intent==='cover'?'cover':intent==='prepare'?'prepare':intent==='start'||intent==='resume'?'book':'editor');setRuntimeMounted(current=>current||intent==='edit');setPresentationEntry(v=>v+1);setPlaybackRun(v=>v+1);setRevision(v=>v+1);setError('');
  }
  const libraryWorks=[...builtInStories.map(fixture=>({key:fixture.id,project:catalogProject(fixture),kind:fixture.id.endsWith('-classic')?'original' as const:'example' as const,canResume:!!resumeFor(fixture.id,catalogProject(fixture))})),...Object.entries({...savedProjects.current,[storyId]:project}).filter(([key])=>key.startsWith('new:')||key.startsWith('import:')).map(([key,work])=>({key,project:work,kind:key.startsWith('new:')?'own' as const:'imported' as const,canResume:!!resumeFor(key,work)}))];
  // Drafting the current text does not require permission to write the shared
  // browser collection. Other editors keep their existing ownership gates.
  function draftBasicText(text:string) {
    if(!loadComplete||mode!=='edit')return;
    try {
      const next=patchStoryLine(project,line.id,{text});
      compileStoryScene(next,line.id,revision+1,{mode:'edit'});
      setProject(next);setRevision(value=>value+1);
      setSaveStatus(hydrated&&writer.status==='owned'?'임시 보관 중':'임시 보관 중지');
    }catch(issue){setError(String(issue));}
  }
  function patch(values: Partial<StoryLine>) {
    try {
      const next=patchStoryLine(project,line.id,values);compileStoryScene(next,line.id,revision+1,{mode:'edit'});setProject(next);
      setSaveStatus(hydrated ? "임시 보관 중" : "임시 보관 중지 — 작품 파일로 저장해 주세요");
      setRevision((value) => value + 1);
      setError("");
    } catch (issue) {
      setError(String(issue));
    }
  }
  function applyProject(next: StoryProject, selectedId = line.id) {
    if (selectedId!==line.id || next.lines.find(cut=>cut.id===selectedId)?.chapterId!==project.lines.find(cut=>cut.id===selectedId)?.chapterId) setWriterChapterId(next.lines.find(cut=>cut.id===selectedId)?.chapterId??null);
    setProject(next);
    setLineId(selectedId);
    setPlayback(createPlayback(next, selectedId));
    setSaveStatus(hydrated ? "임시 보관 중" : "임시 보관 중지 — 작품 파일로 저장해 주세요");
    setRevision(value => value + 1);
    setError("");
  }
  function editStructure(change: () => StoryProject, selectedId?: string) {
    try { applyProject(change(), selectedId); return true; }
    catch (issue) { setError(String(issue)); return false; }
  }
  function newStory(title: string) {
    try {
      const next = createBlankStoryProject({ id: crypto.randomUUID(), chapterId: crypto.randomUUID(), lineId: crypto.randomUUID(), title });
      if(hydrated)persistWorkspace();else ensureWritable();rememberCurrent();
      leaveTracker.created(next.id);
      const id = `new:${next.id}`;
      setImportedWorks(current => ({ ...current, [id]: next.title }));
      setStoryId(id);
      setMode("edit");

      setActiveTool("text");
      setManageOpen(false);
      applyProject(next, next.lines[0]!.id);setEditorView('cut');setWriterChapterId(null);setMemoRequest(null);setSoundTool(false);setFlowMapOpen(false);setPreviewProfile('auto');setView('editor');setRuntimeMounted(true);
      return true;
    } catch (issue) { setError(`새 작품을 시작하지 못했어요. ${String(issue)}`); return false; }
  }
  function saveNow() {
    if (!hydrated) return;
    try {
      persistWorkspace();
      setSaveStatus("임시 보관됨");
      setError("");
    } catch (issue) {
      setSaveStatus("임시 보관 실패 — 작품 파일로 저장해 주세요");
      setError(`브라우저에 복구본을 보관하지 못했어요. 작품 파일로 저장해 주세요. ${String(issue)}`);
    }
  }
  function addCut() {
    const id = crypto.randomUUID();
    return editStructure(() => insertStoryCut(project, line.id, id), id) ? id : undefined;
  }
  function returnToInsertedCut(createdId:string|undefined) {
    if(!createdId)return;
    const menu=shell.current?.querySelector<HTMLDetailsElement>('[data-work-menu]');
    if(menu)menu.open=false;
    if(viewToolsMenu.current)viewToolsMenu.current.open=false;
    setManageOpen(false);
    requestAnimationFrame(()=>{
      const workspace=shell.current;
      if(!workspace||!workspace.checkVisibility()||workspace.closest('[inert]'))return;
      const field=workspace.querySelector<HTMLTextAreaElement>('[data-current-cut] textarea');
      if(field?.dataset.cutId===createdId&&field.checkVisibility()&&!field.disabled&&!field.readOnly)field.focus({preventScroll:true});
      else shell.current?.querySelector<HTMLElement>('[data-work-menu]>summary')?.focus({preventScroll:true});
    });
  }
  function addChapter(optionId?: string) {
    if (optionId) {
      if(composing){setError('한글 입력을 마친 뒤 새 갈래를 만들어 주세요.');return;}
      try {
        const draft=createChoiceWritingDraft(project,line.id,optionId,editingPath,()=>crypto.randomUUID());
        preflight(draft.project);
        const label=line.flow?.type==='choice'?line.flow.options.find(option=>option.id===optionId)?.label??'새 갈래':'새 갈래';
        setPendingBranch({...draft,before:project,workId:storyId,label,sourceLabel:cutLabel(chapter,line)});setBranchError('');
      } catch(issue){setError(issue instanceof Error?issue.message:'갈래를 연결하지 못했어요. 선택지를 다시 확인해 주세요.');}
      return;
    }
    const chapterId = crypto.randomUUID();
    const id = crypto.randomUUID();
    return editStructure(() => addStoryChapter(project, { chapterId, lineId: id }), id) ? id : undefined;
  }
  function startChoiceWriting(){
    if(!pendingBranch)return;
    if(composing){setBranchError('한글 입력을 마친 뒤 새 갈래를 만들어 주세요.');return;}
    if(pendingBranch.before!==project||pendingBranch.workId!==storyId){setBranchError('원고가 바뀌어 새 갈래를 아직 만들지 않았어요. 취소 후 선택지를 다시 확인해 주세요.');return;}
    try{
      if(!hydrated)throw Error('기존 복구본을 보호하기 위해 브라우저 보관을 중지했어요.');
      ensureWritable();preflight(pendingBranch.project);
      const next=writeWorkspaceSnapshot(writer.guard.current!,pendingBranch.project,savedProjects.current,contexts.current,{...snapshot(),lineId:pendingBranch.line.id,editingPath:pendingBranch.editingPath,playback:createPlayback(pendingBranch.project,pendingBranch.line.id),editorView:'cut',activeTool:'text',writerChapterId:pendingBranch.line.chapterId});
      savedProjects.current=next.works;contexts.current=next.contexts;
      setEditingPaths(current=>({...current,[storyId]:pendingBranch.editingPath}));
      applyProject(pendingBranch.project,pendingBranch.line.id);setActiveTool('text');setEditorView('cut');setSoundTool(false);setPendingBranch(null);setBranchError('');setSaveStatus('임시 보관됨');
      requestAnimationFrame(()=>document.querySelector<HTMLTextAreaElement>('#story-line-text')?.focus());
    }catch(issue){setBranchError(`새 갈래의 복구본을 보관하지 못해 기존 원고와 선택지를 유지했어요. ${String(issue)}`);}
  }
  function selectCut(id: string,visitIndex?:number) {
    if(composing){setError("한글 입력을 마친 뒤 컷을 이동해 주세요.");return false;}
    if(!project.lines.some(cut=>cut.id===id)){setError('이동할 컷을 찾지 못했어요. 현재 원고는 유지됩니다.');return false;}
    const nextPath=visitIndex===undefined?visitEditingCut(editingPath,id,project.lines.map(cut=>cut.id),lineId):returnToEditingVisit(editingPath,visitIndex,project.lines.map(cut=>cut.id),lineId);
    if(visitIndex!==undefined&&(!Number.isInteger(visitIndex)||visitIndex<0||visitIndex>=editingPath.length||nextPath.at(-1)!==id))return false;
    const nextPlayback=createPlayback(project,id);
    try{persistWorkspace({lineId:id,editingPath:nextPath,playback:nextPlayback});}catch(issue){setError(`현재 글의 복구본을 보관하지 못해 이동을 멈췄어요. ${String(issue)}`);setSaveStatus("임시 보관 실패 — 작품 파일로 저장해 주세요");return false;}
    setEditingPaths(current=>({...current,[storyId]:nextPath}));
    setError(current=>current==='한글 입력을 마친 뒤 컷을 이동해 주세요.'||current.startsWith('현재 글의 복구본을 보관하지 못해 이동을 멈췄어요.')?'':current);
    setPresentationEntry(value=>value+1);
    dragCleanup.current?.();
    setLineId(id);
    if(editorView==='writer')setWriterChapterId(project.lines.find(cut=>cut.id===id)?.chapterId??null);
    setPlayback(nextPlayback);
    setRevision((value) => value + 1);
    return true;
  }
  function returnEditingVisit(index:number){const id=editingPath[index];return id===undefined?false:selectCut(id,index);}
  function selectEditingTool(tool:typeof activeTool,sound=false){
    const notice='한글 입력을 마친 뒤 편집 도구를 바꿔 주세요.';
    if(composing){setError(notice);return false;}
    setError(current=>current===notice?'':current);setSoundTool(sound);setActiveTool(tool);setEditorView('cut');setManageOpen(false);return true;
  }
  function editFromFlow(id: string, repair?: { choiceId?: string; kind?: string }) {
    if(composing){setError('한글 입력을 마친 뒤 연결된 컷을 열어 주세요.');return false;}
    try{persistWorkspace();}catch(issue){setError(`현재 글의 복구본을 보관하지 못해 이동을 멈췄어요. ${String(issue)}`);return false;}
    const copied=protectAuthoring('editor',id);
    if(!copied&&!selectCut(id))return false;
    setView("editor");setRuntimeMounted(true);
    setEditorView("cut");
    setWriterChapterId(null);
    setMode("edit");

    setActiveTool(repair && repair.kind !== "unreachable" ? "flow" : "text");
    setFlowMapOpen(false);
    const cut = project.lines.find(item => item.id === id);
    const index = cut?.flow?.type === "choice" ? cut.flow.options.findIndex(option => option.id === repair?.choiceId) : -1;
    const label = repair && index >= 0 ? `선택지 ${index + 1} ${repair.kind === "blank-choice" ? "문구" : "도착 컷"}`
      : repair && cut?.flow?.type === "goto" ? "도착 컷" : "대사 / 해설";
    window.setTimeout(() => {
      const field = [...document.querySelectorAll<HTMLElement>("[aria-label]")].find(element => element.getAttribute("aria-label") === label);
      if(field){let parent=field.parentElement;while(parent&&parent!==shell.current){if(parent instanceof HTMLDetailsElement)parent.open=true;parent=parent.parentElement;}field.focus();}
      else if(repair&&cut?.flow?.type==='choice'&&!logic.choices)setError('이 컷의 선택지를 고치려면 편집 설정에서 선택지 편집을 켜 주세요.');
    }, 0);
    return true;
  }
  function advance(choiceId?: string, completedCue = false) {
    if (runtime.presentationPending || readerBusy) return;
    const page=runtime.renderEvidence?.revision===scene.revision?runtime.renderEvidence.dialoguePage:undefined;
    if(!(completedCue&&scene.transitionOnly)&&page&&page.index<page.count-1){
      runtime.frame.current?.contentWindow?.postMessage({protocol:1,type:'nextDialoguePage',sceneId:scene.sceneId,revision:scene.revision},location.origin);
      return;
    }
    if(scene.effectSteps&&scene.effectSteps.current<scene.effectSteps.total){
      if(completedCue||runtime.rendered!==scene.revision)return;
      const activated=advanceEffectPlayback(project,playback);
      if(activated!==playback){setPlayback(activated);setRevision(value=>value+1);}
      return;
    }
    try{const next=advancePlayback(project,playback,choiceId);compileStoryScene(project,next.lineId??next.path.at(-1)!,revision+1,{mode:'play',playbackPath:next.path,playbackState:next});if(next.lineId!==null&&next.path.length>playback.path.length)setPresentationEntry(value=>value+1);
    setReaderResume(null);setPlayback(next);
    setRevision((value) => value + 1);
    }catch(issue){setError(String(issue));}
  }
  function rewind(){
    const result=rewindReader(project,playback,revision);
    if(!result.ok){console.error('Reader rewind rejected',result.cause);setError(result.message);return;}
    if(result.playback===playback){setRevision(value=>value+1);return;}
    setReaderResume(null);setPlayback(result.playback);setPresentationEntry(value=>value+1);setRevision(value=>value+1);setError('');
  }
  function switchMode(next: "edit" | "play",fromStart=false,sourceLineId?:string) {
    if(composing){setError('한글 입력을 마친 뒤 읽기를 시작해 주세요.');return;}
    let nextPlayback:typeof playback;
    try{nextPlayback=createPlayback(project,sourceLineId??(fromStart?undefined:line.id));}catch(issue){setError(`재생할 컷을 확인해 주세요. ${String(issue)}`);return;}
    if(next==='play')try{persistWorkspace();previewEditor.beforePreview();}catch(issue){setError(`현재 글의 복구본을 보관하지 못해 읽기를 시작하지 않았어요. ${String(issue)}`);return;}
    if(next==='edit'&&protectAuthoring('editor'))return;
    rememberCurrent();
    setPresentationEntry(value=>value+1);
    setManageOpen(false);
    if(next==='play'){setReadingFromEditor(true);setReaderResume(null);}
    setMode(next);
    if(next==='edit'&&editorView==='writer')setWriterChapterId(line.chapterId);
    if(next==='play')setPlaybackRun(value=>value+1);
    setPlayback(nextPlayback);
    if(!fromStart&&next==='edit')setLineId(line.id);
    if(viewToolsMenu.current)viewToolsMenu.current.open=false;
    setRevision((value) => value + 1);
  }
  function acceptImported(next:StoryProject,independent=false){
    const builtinIdentity=!directEditor.current&&builtInStories.some(item=>item.project.id===next.id);
    if(!directEditor.current&&!independent)next=prepareImportedWork(next,{...savedProjects.current,[storyId]:project},builtInStories.map(item=>item.project.id),crypto.randomUUID());
    rememberCurrent();const key=`import:${next.id}`;setEditingPaths(current=>({...current,[key]:[orderedLines(next)[0]!.id]}));setStoryId(key);setImportedWorks(current=>({...current,[key]:next.title}));setProject(next);setLineId(orderedLines(next)[0]!.id);setPlayback(createPlayback(next));setMode('edit');setManageOpen(false);setEditorView('cut');setWriterChapterId(null);setActiveTool('text');setPreviewProfile('auto');setView(directEditor.current?'editor':'prepare');if(directEditor.current)setRuntimeMounted(true);setSaveStatus(hydrated?'임시 보관 중':'임시 보관 중지 — 작품 파일로 저장해 주세요');setRevision(v=>v+1);setError(builtinIdentity?'기본 제공 작품과 읽던 진행이 섞이지 않도록 가져온 작품을 독립 사본으로 보관했어요.':'');
  }

  function onlineStore(){return createOnlineWorkStore(localStorage,{assertWritable:ensureWritable});}
  async function saveOnlinePersonalWork(key:string,accountId:string,csrf:string,isCurrent:()=>boolean){
    const generation=onlineWorkspaceGeneration.current;
    const current=()=>isCurrent()&&generation===onlineWorkspaceGeneration.current;
    if(!current())return;saveBeforeImport();
    const work=key===storyId?project:savedProjects.current[key];
    if(!isPersonalWork(key)||!work)throw Error('기기에 보관한 개인 작품을 골라 주세요.');
    const portable=await portableStory(work);
    if(!current())return;
    const archive=await createAuthoringArchive({format:'knolstory',document:documentForExport(portable),audioResources:portable.audioResources??[]});
    if(!current())return;
    const snapshot=await prepareJsonbSnapshot(archive);
    if(!current())return;ensureWritable();
    const result=await saveOnlineWork(onlineStore(),accountId,key,snapshot,csrf,undefined,{isCurrent:current});
    return {...result,includesLatest:result.includesLatest&&generation===onlineWorkspaceGeneration.current};
  }
  async function openOnlinePersonalWork(remote:OnlineDocument,accountId:string,isCurrent:()=>boolean){
    const generation=onlineWorkspaceGeneration.current;
    const current=()=>isCurrent()&&generation===onlineWorkspaceGeneration.current;
    if(!current())return;saveBeforeImport();
    const archive=await restoreJsonbSnapshot(remote.snapshot);
    if(!current())return;
    if(archive.format!=='knolstory')throw Error('숏스토리는 그림책 연결이 준비된 뒤 열 수 있어요.');
    const next={...archive.document.project,id:crypto.randomUUID()};
    await importAudioResources(archive.audioResources,next.id);
    if(!current())return;saveBeforeImport();
    const key=`import:${next.id}`,first=orderedLines(next)[0]!;
    const saved=writeWorkspaceSnapshot(writer.guard.current!,next,{...savedProjects.current,[storyId]:project,[key]:next},contexts.current,{...snapshot(),storyId:key,lineId:first.id,editingPath:[first.id],playback:createPlayback(next),mode:'edit',view:'prepare',editorView:'cut',activeTool:'text',writerChapterId:null,previewProfile:'auto'});
    savedProjects.current=saved.works;contexts.current=saved.contexts;
    let bindingFailed=false;
    try{onlineStore().bind(accountId,key,remote);}catch{bindingFailed=true;}
    acceptImported(next,true);
    if(bindingFailed)setError('기기에 독립 사본은 보관했지만 온라인 연결 정보를 저장하지 못했어요. 이 사본을 새 온라인 작품으로 다시 올리기 전에 저장 상태를 확인해 주세요.');
  }

  async function importFile(file?: File) {
    if (!file) return;
    const sequence=++importReadSequence.current;setImportBusy(true);setPendingArchive(null);setError('');
    try {
      const next=await previewAuthoringFile(file);
      if(sequence!==importReadSequence.current)return;
      if(next.format!=='knolstory')throw Error('숏스토리는 그림책 편집 화면에서 가져와 주세요.');
      setPendingArchive(next);
    } catch (issue) {
      if(sequence!==importReadSequence.current)return;
      setError(
        `작품을 가져오지 못했어요. 현재 작품은 유지됩니다.\n${String(issue)}`,
      );
    }finally{if(sequence===importReadSequence.current)setImportBusy(false);}
  }
  function documentForExport(value:Awaited<ReturnType<typeof portableStory>>){const {audioResources:_resources,...document}=value;return document;}
  function saveBeforeImport(){
    if(composing)throw new Error('한글 입력을 마친 뒤 가져온 작품을 열어 주세요.');
    try{persistWorkspace();}catch(issue){throw new Error(`현재 원고의 복구본을 보관하지 못해 가져온 작품을 열지 않았어요. ${String(issue)}`);}
  }
  async function applyPendingArchive(){
    if(!pendingArchive||pendingArchive.format!=='knolstory')return;
    setError('');
    try{saveBeforeImport();}catch(issue){setError(String(issue));return;}
    setImportBusy(true);
    try{const next=independentImportedWork(pendingArchive.document.project,{...savedProjects.current,[storyId]:project},builtInStories.map(item=>item.project.id),crypto.randomUUID());await importAudioResources(pendingArchive.audioResources,next.id);acceptImported(next,true);setPendingArchive(null);}
    catch(issue){setError(`가져오기를 적용하지 못했어요. 현재 작품은 유지됩니다. ${String(issue)}`);}
    finally{setImportBusy(false);}
  }
  async function serializeLocalWork(work:StoryProject=project){
    const captured=structuredClone(work),portable=await portableStory(captured);
    return encodeAuthoringArchive(await createAuthoringArchive({format:'knolstory',document:documentForExport(portable),audioResources:portable.audioResources??[]}));
  }
  async function exportFile(work:StoryProject=project) {
    try {
      const portable=await portableStory(work);const content=await encodeAuthoringArchive(await createAuthoringArchive({format:'knolstory',document:documentForExport(portable),audioResources:portable.audioResources??[]}));
      if(new Blob([content]).size>25_000_000)throw new Error('작품 파일은25MB 이하여야 합니다.');
      downloadArtifact(content,`${work.title.replace(/[\\/:*?"<>|]/g,'_')}.knolstory`,'application/octet-stream');setManageOpen(false);
    } catch (issue) {
      setError(`파일로 보관하지 못했어요. ${String(issue)}`);
    }
  }
  async function duplicatePersonalWork(key:string){
    if(!isPersonalWork(key))return;
    rememberCurrent();const original=savedProjects.current[key];if(!original)return;
    const copy=copyPersonalWork(original,crypto.randomUUID(),new Date().toISOString());
    if(!await preserveCopyAudio(original,copy))return;const copyKey=`new:${copy.id}`;
    savedProjects.current={...savedProjects.current,[copyKey]:copy};const source=contexts.current[key];
    if(source)contexts.current={...contexts.current,[copyKey]:{...source,playback:undefined,hasRead:false}};
    setImportedWorks(current=>({...current,[copyKey]:copy.title}));openLibraryWork(copyKey,'prepare');
  }
  function deletePersonalWork(){
    if(!pendingWorkDelete||!hydrated)return;
    const key=pendingWorkDelete;if(!isPersonalWork(key))return;
    try{
      const works={...savedProjects.current,[storyId]:project};const removed=works[key];if(!removed)return;
      const context=key===storyId?captureContext(project,contexts.current[key],snapshot()):contexts.current[key];
      ensureWritable();
      const checkpoint={key,project:removed,context};
      const remaining=Object.fromEntries(Object.entries(works).filter(([id])=>id!==key));
      const remainingContexts=Object.fromEntries(Object.entries(contexts.current).filter(([id])=>id!==key));
      const fallback=storyId===key?getRepresentativeStory(FIRST.id).project:project;const active=storyId===key?FIRST.id:storyId;
      const state={...snapshot(),deletedWork:checkpoint,storyId:active,editingPath:storyId===key?normalizeEditingPath(editingPaths[active]??remainingContexts[active]?.editingPath,fallback.lines.map(cut=>cut.id),orderedLines(fallback)[0]!.id):editingPath,lineId:storyId===key?orderedLines(fallback)[0]!.id:lineId,mode:'edit' as const,playback:storyId===key?createPlayback(fallback):playback,view:'library' as const};
      const saved=writeWorkspaceSnapshot(writer.guard.current!,fallback,remaining,remainingContexts,state);savedProjects.current=saved.works;contexts.current=saved.contexts;
      setEditingPaths(current=>({...Object.fromEntries(Object.entries(current).filter(([id])=>id!==key)),[active]:state.editingPath}));
      setDeletedWork(checkpoint);setProject(fallback);setStoryId(active);setLineId(state.lineId);setPlayback(state.playback);setMode('edit');setView('library');setImportedWorks(current=>Object.fromEntries(Object.entries(current).filter(([id])=>id!==key)));setPendingWorkDelete(null);setSaveStatus('임시 보관됨');setError('');
    }catch(issue){setError(`작품을 삭제하지 못했어요. 현재 작품과 복구 자료는 보존됩니다. ${String(issue)}`);}
  }
  function restorePersonalWork(){
    if(!deletedWork||!hydrated)return;
    try{
      ensureWritable();
      const existing={...savedProjects.current,[storyId]:project};
      if(existing[deletedWork.key])throw Error('같은 작품이 서재에 있어 덮어쓰지 않았어요.');
      const works={...existing,[deletedWork.key]:deletedWork.project};const nextContexts={...contexts.current,...(deletedWork.context?{[deletedWork.key]:deletedWork.context}:{})};
      const saved=writeWorkspaceSnapshot(writer.guard.current!,project,works,nextContexts,{...snapshot(),deletedWork:undefined});savedProjects.current=saved.works;contexts.current=saved.contexts;
      setImportedWorks(current=>({...current,[deletedWork.key]:deletedWork.project.title}));localStorage.removeItem(DELETED_WORK_KEY);setDeletedWork(undefined);setSaveStatus('임시 보관됨');setError('');
    }catch(issue){setError(`복구하지 못했어요. 복구 자료는 보존됩니다. ${String(issue)}`);}
  }
  function confirmDelete() {
    if (!deleteId) return;
    try {
      const next = deleteStoryCut(project, deleteId);
      let checkpointNotice:string|undefined;
      if(hydrated){ensureWritable();checkpointNotice=recordBeforeCutDeletion(localStorage,project);setCheckpointRefresh(v=>v+1);}
      const cuts = orderedLines(next);
      const nextId = cuts[Math.min(ordered.findIndex(cut=>cut.id===deleteId),cuts.length-1)]!.id;
      setUndoDelete({before:project,after:next,lineId:deleteId});
      applyProject(next,nextId);
      if(checkpointNotice)setError(checkpointNotice);
      setDeleteId(null);
    } catch (issue) {setError(String(issue));setDeleteId(null);}
  }
  function updateActor(key: string, values: Partial<StageActorEntry>) {
    patch({
      stageComposition: {
        ...stage,
        leftActors: stage.leftActors.map((actor) =>
          actor.key === key ? { ...actor, ...values } : actor,
        ),
        rightActors: stage.rightActors.map((actor) =>
          actor.key === key ? { ...actor, ...values } : actor,
        ),
      },
    });
  }
  function drag(
    event: React.PointerEvent<HTMLButtonElement>,
    actor: (typeof scene.actors)[number],
  ) {
    const node = runtime.container.current;
    if (!node) return;
    const bounds = node.getBoundingClientRect();
    const start = screenToStage(
      { x: event.clientX - bounds.left, y: event.clientY - bounds.top },
      runtime.fit,
    );
    const entry = [...stage.leftActors, ...stage.rightActors].find(
      (item) => item.key === actor.id,
    );
    if (!start || !entry) return;
    const anchor =
      entry.xAnchor ??
      ((actor.rect.x + actor.rect.width / 2) / scene.width) * 100;
    const target = event.currentTarget;
    target.setPointerCapture(event.pointerId);

    function move(pointer: PointerEvent) {
      const currentBounds = node!.getBoundingClientRect();
      if (
        currentBounds.width !== bounds.width ||
        currentBounds.height !== bounds.height
      ) {
        end();
        return;
      }
      const point = screenToStage(
        { x: pointer.clientX - bounds.left, y: pointer.clientY - bounds.top },
        runtime.fit,
      );
      if (point)
        updateActor(entry!.key, {
          xAnchor: Math.max(
            5,
            Math.min(95, anchor + ((point.x - start!.x) / scene.width) * 100),
          ),
        });
    }
    function end() {
      target.removeEventListener("pointermove", move);
      target.removeEventListener("pointerup", end);
      target.removeEventListener("pointercancel", end);
      target.removeEventListener("lostpointercapture", end);
      dragCleanup.current = null;
    }
    dragCleanup.current?.();
    dragCleanup.current = end;

    target.addEventListener("pointermove", move);
    target.addEventListener("pointerup", end);
    target.addEventListener("pointercancel", end);
    target.addEventListener("lostpointercapture", end);
  }
  function changeWorkSection(section:WorkSection){setMemoRequest(current=>({projectId:project.id,memoId:current?.projectId===project.id?current.memoId:'',lineId:current?.projectId===project.id?current.lineId:line.id,section,returnToEditor:current?.projectId===project.id?current.returnToEditor:false,editorContext:current?.projectId===project.id?current.editorContext:undefined}));setManageOpen(false);}
  const workHeader=(children:ReactNode)=><WorkspaceManagement fullscreen={fullscreen} onFullscreen={fullscreenAvailable?()=>{const menu=shell.current?.querySelector<HTMLDetailsElement>('[data-work-menu]');if(menu)menu.open=false;setManageOpen(false);void toggleFullscreen();}:undefined} unifiedSettings={view==='editor'&&mode==='edit'} settingsExtras={<><button disabled={composing||!loadComplete} onClick={async()=>{const result=await leaveTracker.saveCurrent();if(result==='saved'&&!leaveTracker.hasRisk()&&!document.querySelector('[data-unsaved-draft="true"], [aria-invalid="true"]'))returnToLibrary();else setError(result==='download-requested'?'파일 다운로드를 요청했어요. 완료와 내용을 확인한 뒤 서재로 이동해 주세요.':'저장되지 않은 변경이 있어 편집을 유지합니다. 작품 파일 저장 상태를 확인해 주세요.');}}>작품 파일 저장하고 서재로</button><button disabled={composing} onClick={()=>{setManageOpen(false);void toggleFullscreen();}}>{fullscreen?'전체 화면 해제':'전체 화면'}</button>{<details ref={viewToolsMenu} className={styles.viewTools} onToggle={event=>{if(event.currentTarget.open){event.currentTarget.style.setProperty('--view-menu-top',`${event.currentTarget.getBoundingClientRect().bottom+4}px`);}}}><summary aria-label="보기 설정" title="장 추가·보기 설정">보기 설정</summary><div className={styles.controls}><strong>{project.title}</strong>{mode==='edit'&&<button disabled={composing} onClick={()=>returnToInsertedCut(addChapter())}>장 추가</button>}<EditorTermGuide/>
            <p>컷 미리보기 · 가로 16:9 고정. 읽기 화면에서는 16:9 또는 9:16을 선택할 수 있어요.</p>
          <button aria-pressed={reducedMotion || motionOverride} onClick={() => { setMotionOverride(value => !value); setRevision(value => value + 1); }} disabled={reducedMotion}>동작 줄이기</button>
          <button disabled={composing} onClick={()=>switchMode('play',true)}>처음부터 읽기</button></div></details>}<button disabled={composing} onClick={()=>returnToInsertedCut(addCut())} aria-label="현재 컷 뒤에 추가">컷 추가</button><div ref={setSettingsHost}/></>} scoresEnabled={logic.scores} localFileActions={<LocalWorkFileActions registerSave={leaveTracker.registerSave} onVerifiedSave={leaveTracker.saved} onSavingChange={leaveTracker.saving} shortcutsEnabled={view==='prepare'||view==='editor'&&mode==='edit'} fileSession={localFileSession} workKey={project.id} name={project.title} extension=".knolstory" disabled={composing||!loadComplete} serialize={()=>serializeLocalWork()}/>} disabled={composing} recovery={<StoryRecoveryPanel restoreDisabled={composing} project={project} disabled={!hydrated||writer.status!=='owned'||composing} refreshToken={checkpointRefresh} onCreate={createCheckpoint} onRestore={restoreCheckpoint} onExport={checkpoint=>exportFile(checkpoint.project)}/>} project={project} compact={true} manageOpen={manageOpen} hydrated={hydrated} loadComplete={loadComplete} onManage={open=>{setManageOpen(open);if(open)shell.current?.querySelectorAll<HTMLDetailsElement>('[data-additional-dock]>details[open]').forEach(detail=>{detail.open=false;});if(open&&viewToolsMenu.current)viewToolsMenu.current.open=false;}} onExport={()=>void exportFile()} onSave={saveNow} onImportFile={file=>void importFile(file)} onImportArchive={archive=>{setError('');setPendingArchive(archive);}} onError={setError} onLibrary={returnToLibrary} onPrepare={section=>view==='prepare'?changeWorkSection(section):prepareWork('',section)}>{children}</WorkspaceManagement>;
  const nativeStage=runtimeMounted?<section className={styles.stage} aria-label="이야기 무대">
          <div className={styles.toolbar}>
            <strong>{mode === "edit" ? "장면 미리보기" : "이야기 읽기"}</strong><small>휴대폰은 가로 읽기를 권장합니다. 세로에서는 말하는 인물만 표시합니다.</small>
            {mode === "edit" && <button disabled={composing} onClick={() => switchMode("play")}>이 컷부터 재생</button>}

          </div>
          <StagePreviewFrame editing={mode==='edit'} ordered={ordered} lineId={line.id} composing={composing} onSelect={selectCut}>
          <div
            className={`${styles.viewport} ${mode === "play" ? styles.playingViewport : ""}`}
            ref={runtime.attachContainer}
            data-testid="story-stage-viewport"
          >
            <iframe
              ref={runtime.frame}
              src="/runtime/index.html"
              title="Ren’Py 이야기 무대"
              data-testid="story-runtime-frame"
              allow="autoplay; fullscreen"
              style={{
                position: "absolute",
                border: 0,
                display: "block",
                left: runtime.fit.offsetX,
                top: runtime.fit.offsetY,
                width: scene.width,
                height: scene.height,
                transform: `scale(${runtime.fit.scale})`,
                transformOrigin: "0 0",
                pointerEvents:mode==='play'&&readerBusy?'none':undefined,
              }}
            />
            {mode==='play'&&<div className={styles.readerContext} data-reader-context="true" style={{left:runtime.fit.offsetX+12,top:runtime.fit.offsetY+12,maxWidth:Math.max(1,scene.width*runtime.fit.scale-80)}}>{chapterLabel(chapter)}</div>}
            {!runtime.ready && <StoryLoading stage/>}
            {mode === "edit" && editingScreen === "characters" && activeTool === "assets" &&
              runtime.ready &&
              scene.actors.map((actor) => (
                <button
                  key={actor.id}
                  className={styles.handle}
                  aria-label={`${actor.name} 위치 편집`}
                  data-actor-height={actor.rect.height}
                  data-actor-flip={actor.flipX ? "mirrored" : "original"}
                  style={{
                    left:
                      runtime.fit.offsetX +
                      (actor.handle?.x??actor.rect.x + actor.rect.width / 2) * runtime.fit.scale,
                    top: runtime.fit.offsetY + (actor.handle?.y??actor.rect.y) * runtime.fit.scale,
                  }}
                  onPointerDown={(event) => drag(event, actor)}
                >
                  ✥
                </button>
              ))}
          </div>
          </StagePreviewFrame>
          <div
            className={styles.status}
            role="status"
            data-testid="story-runtime-status"
            data-rendered-revision={runtime.rendered}
            data-scene-revision={revision}
            data-actor-rects={JSON.stringify(scene.actors.map(actor=>({id:actor.id,rect:actor.rect})))} data-background-rect={JSON.stringify(scene.background?.rect??null)} data-artwork-rect={JSON.stringify(scene.artworkRect??null)} data-scene-width={scene.width} data-scene-height={scene.height}
            data-music-path={runtime.renderEvidence?.audioState?.musicPath??''}
            data-ambience-path={runtime.renderEvidence?.audioState?.ambiencePath??''} data-ambience-start-count={runtime.renderEvidence?.audioState?.ambienceStartCount??0}
            data-music-position={runtime.renderEvidence?.audioState?.musicPosition??''} data-audio-unlocked={runtime.renderEvidence?.audioState?.unlocked?"true":"false"}
            data-music-start-count={runtime.renderEvidence?.audioState?.musicStartCount??0}
            data-sound-play-count={runtime.renderEvidence?.audioState?.soundPlayCount??0}
            data-sound-paths={JSON.stringify(runtime.renderEvidence?.audioState?.soundPaths??[])}
            data-engine-width={runtime.renderEvidence?.engineLogicalSize?.width??0} data-engine-height={runtime.renderEvidence?.engineLogicalSize?.height??0}
            data-textbox-y={scene.textboxRect?.y??510}
            data-dialogue-rects={JSON.stringify(runtime.renderEvidence?.dialogueRects??null)}
            data-dialogue-page={JSON.stringify(runtime.renderEvidence?.dialoguePage??null)}
            data-textbox-rect={JSON.stringify(runtime.renderEvidence?.textboxRect??null)}
            data-choices-rect={JSON.stringify(runtime.renderEvidence?.choicesRect??null)}
            data-renderer-width={runtime.renderEvidence?.rendererRect.width??0}
            data-renderer-height={runtime.renderEvidence?.rendererRect.height??0}
          >
            {runtime.status}
            {runtime.audioPending ? ' · 소리를 시작하려면 무대를 한 번 눌러 주세요.' : ''}
            {runtime.presentationPending && !runtime.audioPending
              ? " · 전환 화면에서 계속을 눌러 주세요"
              : ""}
          </div>
          {mode==='edit'&&activeTool==='cuts'&&(line.ending?.endsStory||line.flow?.type==='goto')&&<p className={styles.hint}>이 컷 뒤에 추가하면 현재 엔딩/이동은 새 컷의 끝으로 옮겨져 이어집니다. 다른 갈래는 선택지에서 새 장으로 연결하세요.</p>}
          <StoryStageNavigation mode={mode} activeTool={activeTool} line={line} chapterCuts={chapterCuts} chapterCutIndex={chapterCutIndex} playback={playback} onAdd={addCut} onMove={direction=>editStructure(()=>moveStoryCut(project,line.id,direction))} onSelect={selectCut} onRepair={()=>editFromFlow(line.id,{kind:'missing-target'})} onRestart={()=>{setPlaybackRun(v=>v+1);setPresentationEntry(v=>v+1);setPlayback(createPlayback(project));setRevision(v=>v+1);}}/>
          {!!project.scores?.length&&(mode==='play'||activeTool==='flow')&&<details className={`${styles.semantic} ${styles.scoreSummary}`}><summary>이야기 점수 확인</summary><p>{mode==='play'?'이번 읽기에서 선택한 결과로 계산합니다.':'편집 중에는 시작 점수를 기준으로 보여줍니다.'}</p>{project.scores.map(score=><p key={score.id}>{score.name}: <output aria-label={`${score.name} 현재 점수`}>{mode==='play'?playbackScores(project,playback)[score.id]:score.initial}</output></p>)}</details>}
          <StoryTextAccessibility sceneReady={runtime.rendered===scene.revision} nativeFrame={runtime.frame} onNativeBackTab={()=>runtime.container.current?.querySelector<HTMLButtonElement>('[data-reader-menu-trigger]')?.focus()} scene={scene} hasMoreText={!!runtime.renderEvidence?.dialoguePage&&runtime.renderEvidence.revision===scene.revision&&runtime.renderEvidence.dialoguePage.index<runtime.renderEvidence.dialoguePage.count-1} mode={mode} status={playback.status} presentationPending={runtime.presentationPending} readerBusy={readerBusy} onAdvance={advance} onBack={rewind} canGoBack={readerCanGoBack}/>
        </section>:null;
  if(!loadComplete)return <main aria-label="화면 불러오는 중"><StoryLoading/></main>;
  const storageWarning = (writer.status==='blocked'||writer.status==='unavailable')&&<section role="alert" className={`${styles.error} ${styles.storageWarning}`}><p>{writer.status==='blocked'?'다른 탭에서 보관함을 사용 중이에요. 이 탭에서는 임시 보관을 중지합니다.':'브라우저에 현재 원고를 임시 보관할 수 없어요. 현재 작품을 작품 파일로 저장해 주세요.'}</p><button onClick={()=>void exportFile()}>현재 초안 파일 내보내기</button><button disabled={composing} onClick={()=>{if(!composing)setConfirmStorageReload(true);}}>저장된 보관함 다시 열기</button></section>;
  const storageRecovery = storageError&&<section aria-label="기기 보관함 복구" className={`${styles.error} ${styles.storageWarning}`}><p>{storageError}</p><button onClick={()=>{try{const raw=localStorage.getItem(WORKSPACE_KEY);if(raw!==null)downloadArtifact(raw,'놀스토리-복구원본.json','application/json');}catch(issue){setError(String(issue));}}}>복구용 원본 보관</button><button onClick={restartProtectedStorage} disabled={writer.status!=='owned'}>손상 원본 보존하고 새 보관함 시작</button></section>;
  return (<StoryBranchEditingContext.Provider value={logic.branches}>
    <WorkLeaveGuard tracker={leaveTracker} work={project} ready={loadComplete}/>
    <MobileFullscreenOffer enabled={['editor','prepare'].includes(view)&&!composing} onEnter={()=>void toggleFullscreen()}/>
    {['editor','prepare','book','cover'].includes(view)&&excludedAudio.length>0&&<p role="alert" className={styles.error}>이 작품에 서비스에서 제외한 기본 소리가 있습니다: {excludedAudio.map(asset=>asset.name).join(', ')}. 해당 소리는 재생하지 않으며 원고의 소리 지정은 보존합니다. 음향 편집에서 사용할 소리로 교체해 주세요.</p>}
    {importBusy&&!pendingArchive&&<p role='status' className={styles.status}>작품 파일의 연결·연출·첨부를 확인하고 있어요. 긴 작품은 잠시 걸릴 수 있습니다.</p>}
    {pendingArchive&&pendingArchive.format==='knolstory'&&<AuthoringImportDialog title={pendingArchive.document.project.title} kind='knolstory' chapterCount={pendingArchive.document.project.chapters.length} cutCount={pendingArchive.document.project.lines.length} resourceCount={pendingArchive.audioResources.length} busy={importBusy} error={error} onCancel={()=>setPendingArchive(null)} onApply={applyPendingArchive}/>}
    {view!=='editor'&&storageWarning}
    {confirmStorageReload&&<StorageReloadDialog composing={composing} onCancel={()=>setConfirmStorageReload(false)} onConfirm={()=>{if(!composing)location.reload();}}/>}
    {view!=='editor'&&storageRecovery}
    {(!!storageError&&view!=='prepare'&&view!=='editor')&&<StoryRecoveryPanel restoreDisabled={composing} project={project} disabled={!hydrated||writer.status!=='owned'||composing} refreshToken={checkpointRefresh} onCreate={createCheckpoint} onRestore={restoreCheckpoint} onExport={checkpoint=>exportFile(checkpoint.project)}/>}
    {view==='home'&&<BookIntroduction works={libraryWorks} onMyWorks={()=>{try{sessionStorage.setItem('knolstory-library-view-v1',JSON.stringify({version:1,filter:'own',query:'',pages:{}}));}catch{/* Library remains usable without tab preferences. */}returnToLibrary();}} onLibrary={returnToLibrary} onBook={key=>openLibraryWork(key,'start')} disabled={!loadComplete} notice={error}/>}
    {view==='book'&&<BookStart edition={storyId.startsWith("new:")?"own":storyId.startsWith("import:")?"imported":storyId.endsWith("-classic")?"original":"knolstory"} project={project} canResume={!!resumeFor(storyId,project)} onStart={()=>beginBook(false)} onResume={()=>beginBook(true)} onLibrary={returnToLibrary} onPrepare={()=>openLibraryWork(storyId,'prepare')} onEdit={()=>openLibraryWork(storyId,'edit')}/>}
    {view==='cover'&&<BookCoverEditor project={project} onApply={(cover,title)=>{preparationChange(renameStoryProject({...project,cover},title));setView('prepare');}} onCancel={()=>setView('prepare')}/>}
    {pendingBranch&&<StoryChoiceWritingDialog label={pendingBranch.label} sourceLabel={pendingBranch.sourceLabel} closesLinearTail={!!pendingBranch.closedLinearTailId} error={branchError} onCancel={()=>{setPendingBranch(null);setBranchError('');}} onCreate={startChoiceWriting}/>}
    {view==='library'&&<><LocalBookshelf accountMenu={<><AccountMenu disabled={!loadComplete||composing} beforeNavigate={beforeAccountNavigation}/><OnlineWorksPanel works={libraryWorks.filter(work=>isPersonalWork(work.key)).map(work=>({key:work.key,title:work.project.title}))} disabled={!loadComplete||composing} onSaveNew={saveOnlinePersonalWork} onOpen={openOnlinePersonalWork}/></>} onDuplicate={duplicatePersonalWork} onDelete={key=>{if(isPersonalWork(key))setPendingWorkDelete(key);}} onIntroduction={()=>{rememberCurrent();setMode('edit');setView('home');if(new URLSearchParams(location.search).get('view')==='library')history.replaceState(null,'',location.pathname);}} works={libraryWorks} onExport={key=>{const work=libraryWorks.find(item=>item.key===key);if(work)void exportFile(work.project);}} onOpen={openLibraryWork} onCreate={newStory} onImport={file=>void importFile(file)} disabled={!loadComplete} notice={error}/><PersonalLibraryTools deleted={deletedWork} pendingTitle={pendingWorkDelete?libraryWorks.find(work=>work.key===pendingWorkDelete)?.project.title:undefined} onRestore={restorePersonalWork} onCancel={()=>setPendingWorkDelete(null)} onConfirm={deletePersonalWork}/><p data-testid="library-save-status" role="status">{saveStatus}</p></>}
    {view==='prepare'&&<main className={`${styles.shell} ${styles.compact} ${styles.preparationShell}`}>{workHeader(<><strong>{project.title}</strong><EditorTermGuide/><p data-testid="preparation-save-status" role="status">{saveStatus}</p></>)}{error&&<p role="alert">{error}</p>}<StoryPreparation scoresEnabled={logic.scores} onComposing={setComposing} onSectionChange={changeWorkSection} initialSection={memoRequest?.projectId===project.id?memoRequest.section??'memos':'info'} focusMemoId={memoRequest?.projectId===project.id?memoRequest.memoId:undefined} onReturnToCut={memoRequest?.projectId===project.id&&memoRequest.returnToEditor?returnFromSettings:undefined} onEditCover={()=>setView('cover')} project={project} currentLineId={lineId} onProjectChange={preparationChange} onOpenCut={id=>editFromFlow(id)} onContinueWriting={continueWriting}/></main>}
    <main style={readerDisplay?{position:'fixed',left:readerDisplay.left,top:readerDisplay.top,width:readerDisplay.width,height:readerDisplay.height,minHeight:0}:undefined} data-parked={view!=='editor'} aria-hidden={view!=='editor'} inert={view!=='editor'} ref={shell} data-keyboard-occluded={mode==='edit'&&keyboard.occluded} className={`${styles.shell} ${styles.editorShell} ${compact ? styles.compact : ""} ${mode === "play" ? styles.playMode : ""} ${editorView==='writer'?styles.writing:''}`}>
      {view==='editor'&&storageWarning}
      {view==='editor'&&storageRecovery}
      {view==='editor'&&workHeader(
      <section className={styles.context}>
        <div data-editor-document-info>
          <h1>{project.title}</h1>
          {mode==='play'&&<p>{chapterLabel(chapter)}</p>}
          {mode==='play' && compact && <p className={styles.readingHint}>세로는 말하는 인물에 집중하고, 가로는 장면을 함께 봅니다.</p>}
          <p data-testid="save-status" data-save-attention={saveStatus!=='임시 보관됨'} role="status">{saveStatus}</p>
        </div>
        <div className={styles.controls}>
          {mode==='edit'&&<><StoryCutPosition project={project} line={line} ordered={ordered} onSelect={selectCut} disabled={composing}/></>}

        </div>
      </section>)}
      {mode==='play'&&<StoryPlayerMenu tapMode={readerTapMode} onTapModeChange={value=>{setReaderTapMode(value);setRevision(v=>v+1);}} format={readerFormat} onFormatChange={format=>{setReaderFormat(format);setRevision(v=>v+1);}} toolFontSizePx={11} stageBounds={{x:runtime.fit.offsetX,y:runtime.fit.offsetY,width:scene.width*runtime.fit.scale,height:scene.height*runtime.fit.scale}} thumbnailReady={runtime.rendered===scene.revision} captureThumbnail={runtime.captureThumbnail} project={project} playback={playback} visibleDialogue={runtime.renderEvidence?.revision===scene.revision&&runtime.renderEvidence.sceneId===scene.sceneId&&runtime.renderEvidence.dialoguePage?.endOffset!==undefined?{lineId:line.id,endOffset:runtime.renderEvidence.dialoguePage.endOffset}:undefined} dialoguePosition={runtime.renderEvidence?.revision===scene.revision?{lineId:line.id,offset:runtime.renderEvidence.dialoguePage?.offset??0}:undefined} onRestore={(state,position)=>{try{compileStoryScene(project,state.lineId??state.path.at(-1)!,revision+1,{mode:'play',playbackPath:state.path,playbackState:state});setReaderResume(position??null);setPlayback(state);setPlaybackRun(v=>v+1);setPresentationEntry(v=>v+1);setRevision(v=>v+1);}catch(e){setError(String(e));throw e;}}} stageContainer={runtime.container.current} textboxBounds={(()=>{const box=runtime.renderEvidence?.revision===scene.revision?runtime.renderEvidence.textboxRect:scene.textboxRect;if(!box)return undefined;return {x:runtime.fit.offsetX+box.x*runtime.fit.scale,y:runtime.fit.offsetY+box.y*runtime.fit.scale,width:box.width*runtime.fit.scale,height:box.height*runtime.fit.scale};})()} onInteractionChange={setReaderBusy} presentationReady={runtime.presentationReady} manualEffectPending={!!scene.effectSteps&&scene.effectSteps.current<scene.effectSteps.total} presentationKey={`${project.id}/${playbackRun}/${presentationEntry}/${line.id}/${scene.effectSteps?.current??0}/${runtime.renderEvidence?.revision===scene.revision?runtime.renderEvidence.dialoguePage?.index??0:0}`} textScale={readerTextScale} onTextScaleChange={scale=>{setReaderTextScale(scale);setRevision(v=>v+1);}} onRestart={()=>{setReaderResume(null);setPlayback(createPlayback(project));setPlaybackRun(v=>v+1);setPresentationEntry(v=>v+1);setRevision(v=>v+1);}} onExit={readingFromEditor?()=>switchMode('edit'):undefined} onLibrary={()=>{ensureWritable();persistWorkspace();returnToLibrary();}} onFullscreen={()=>void toggleFullscreen()} fullscreen={fullscreen} onAdvance={()=>advance()} onReducedMotion={()=>{setMotionOverride(v=>!v);setRevision(v=>v+1);}} reducedMotion={reducedMotion||motionOverride} motionDisabled={reducedMotion} hasMoreText={!!runtime.renderEvidence?.dialoguePage&&runtime.renderEvidence.revision===scene.revision&&runtime.renderEvidence.dialoguePage.index<runtime.renderEvidence.dialoguePage.count-1} advanceDisabled={(playback.status!=='reading'&&!(scene.effectSteps&&scene.effectSteps.current<scene.effectSteps.total)&&!(runtime.renderEvidence?.revision===scene.revision&&runtime.renderEvidence.dialoguePage&&runtime.renderEvidence.dialoguePage.index<runtime.renderEvidence.dialoguePage.count-1))||runtime.presentationPending} disabled={!runtime.ready}/>}
      {mode === "edit" && logic.branches && activeTool === "flow" && flowNodes.get(line.id) && <StoryFlowContext node={flowNodes.get(line.id)!} graph={flowGraph} onSelectCut={editFromFlow} />}
      {logic.branches && flowMapOpen && <StoryFlowMap project={project} currentLineId={line.id} onSelectCut={editFromFlow} onClose={() => setFlowMapOpen(false)} />}
      {deleteId && <CutDeleteDialog connections={incomingStoryConnections(project,deleteId)} text={project.lines.find(cut=>cut.id===deleteId)?.text??''} incomingLinks={getStoryCutDeletionImpact(project,deleteId).incomingLinks} rangeEnds={getStoryCutDeletionImpact(project,deleteId).rangeEnds} branchConditions={getStoryCutDeletionImpact(project,deleteId).branchConditions} onCancel={()=>setDeleteId(null)} onDelete={confirmDelete}/>}
      {undoDelete?.after===project && <button onClick={()=>{applyProject(undoDelete.before,undoDelete.lineId);setUndoDelete(null);}}>삭제 되돌리기</button>}
      {error && (
        <div
          role="alert"
          className={styles.error}
          data-testid="workspace-error"
        >
          {error}
        </div>
      )}
      <div className={`${styles.grid} ${mode==='edit'?styles.workbenchGrid:''}`} data-editing-screen={mode==='edit'?editingScreen:undefined}>

        <div ref={previewEditor.panel} onBlurCapture={previewEditor.onBlurCapture} className={styles.workbenchPanel} data-editor-inputs data-writer-scroll>
          <StoryEditingWorkbench editingActive={view==='editor'&&mode==='edit'} chapterSettings={<details data-chapter-settings><summary>현재 컷의 장 설정</summary><StoryChapterSettings key={`${project.id}/${chapter.id}`} project={project} chapterId={chapter.id} onProjectChange={applyProject} charactersEnabled={editorPreferences.enabled.characters} audioEnabled={editorPreferences.enabled.audio} disabled={!loadComplete||writer.status!=='owned'||mode!=='edit'} composing={composing} onComposing={setComposing} onPreviewFromBranch={id=>switchMode('play',false,id)}/></details>} adjacentThumbnails={adjacentThumbnails} preferences={editorPreferences} onPreferencesChange={setEditorPreferences} settingsTarget={settingsHost} preview={nativeStage} playing={mode==='play'} project={project} lineId={line.id} screen={editingScreen}
            onScreenChange={screen=>{if(composing)return;try{persistWorkspace();}catch(issue){setError(`편집 화면을 바꾸기 전 원고 보관에 실패했어요. ${String(issue)}`);return;}setEditorPreferences(current=>({...current,screen}));setActiveTool('text');setSoundTool(false);setEditorView('cut');}}
            onProjectChange={applyProject} onSelectCut={selectCut} onComposing={setComposing}
            basicTextDisabled={!loadComplete||mode!=='edit'} onBasicTextChange={draftBasicText}
            disabled={!loadComplete||writer.status!=='owned'||mode!=='edit'} composing={composing}
            onPreview={id=>switchMode('play',false,id)}
            additionalSettings={<fieldset disabled={composing||!loadComplete}><legend>이야기 규칙 편집</legend>{([['choices','선택지'],['scores','점수'],['branches','분기조건']] as const).map(([key,label])=><label key={key}><input type="checkbox" checked={logic[key]} onChange={event=>setEditorPreferences(current=>({...current,logic:{...current.logic,[key]:event.target.checked}}))}/>{label} 편집 사용</label>)}{logic.scores&&<button onClick={()=>prepareWork('','scores')}>이야기 점수 설정 열기</button>}{logic.branches&&<button onClick={()=>{setManageOpen(false);setFlowMapOpen(true);}}>전체 흐름 보기</button>}</fieldset>}
            additionalEditor={<><details><summary>현재 컷 상세·메모·정리</summary><StoryWorkspaceInspector project={project} line={line} stage={stage} ordered={ordered} patch={patch} updateActor={updateActor} setComposing={setComposing} composing={composing} onProjectChange={applyProject} disabled={!loadComplete||mode!=='edit'} activeSection="text" speakerDetailsEnabled={editorPreferences.enabled.characters}/><fieldset disabled={composing||!loadComplete}><legend>현재 컷 정리</legend><button onClick={()=>editStructure(()=>duplicateStoryCut(project,line.id,crypto.randomUUID()))}>현재 컷 복제</button><button onClick={()=>setDeleteId(line.id)}>현재 컷 삭제</button><button onClick={()=>editStructure(()=>moveStoryCut(project,line.id,'up'))}>현재 컷 위로</button><button onClick={()=>editStructure(()=>moveStoryCut(project,line.id,'down'))}>현재 컷 아래로</button><button onClick={()=>editStructure(()=>splitStoryCut(project,line.id,crypto.randomUUID(),shell.current?.querySelector<HTMLTextAreaElement>('#story-line-text')?.selectionStart??line.text.length))}>상세 글의 커서에서 컷 나누기</button><button disabled={!ordered[ordered.findIndex(c=>c.id===line.id)+1]} onClick={()=>{const next=ordered[ordered.findIndex(c=>c.id===line.id)+1];if(next)editStructure(()=>mergeStoryCuts(project,line.id,next.id));}}>다음 컷과 합치기</button></fieldset></details>{(logic.choices||logic.branches)&&<details><summary>현재 컷의 선택지·분기조건 편집</summary><StoryWorkspaceInspector project={project} line={line} stage={stage} ordered={ordered} patch={patch} updateActor={updateActor} setComposing={setComposing} composing={composing} onProjectChange={applyProject} disabled={!loadComplete||mode!=='edit'} activeSection="flow" choicesEnabled={logic.choices} scoresEnabled={logic.scores} branchesEnabled={logic.branches} onOpenScores={logic.scores?()=>prepareWork('','scores'):undefined} onCreateChoiceChapter={logic.branches?addChapter:undefined}/>{logic.branches&&flowNodes.get(line.id)&&<EditorFlowContext project={project} node={flowNodes.get(line.id)!} graph={flowGraph} disabled={composing} editingPath={editingPath} onReturnVisit={returnEditingVisit} onSelect={selectCut} onRepair={editFromFlow}/>}</details>}</>}/>

        </div>
      </div>
      <p className={styles.footer}>
        {storageError ? "기존 복구본을 보호하기 위해 브라우저 자동 보관을 중지했어요. 현재 편집한 작품은 작품 파일로 저장해 주세요." : "작품은 작품 파일로 저장해 주세요. 임시 보관은 작품 파일 저장을 대신하지 않아요."}
      </p>
    </main>
    </StoryBranchEditingContext.Provider>);
}
