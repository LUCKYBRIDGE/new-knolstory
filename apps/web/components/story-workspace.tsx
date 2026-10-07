"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  getRepresentativeStory,
  representativeStories,classicStories,enhanceExistingStory,
} from "@knolstory/compatibility";
import {
  createStoryChoiceChapter,
  resolveStageComposition,
  chapterLabel, cutLabel,
  type StoryProject,
  type StoryLine,
  type StageActorEntry,
} from "@knolstory/story-domain";
import {
  compileStoryScene,
  orderedLines,
  createPlayback,
  advancePlayback,
  backPlayback,
  restorePlayback,
  patchStoryLine,
  screenToStage,
  createBlankStoryProject,
  addStoryChapter,
  insertStoryCut,
  moveStoryCut,
  renameStoryProject,
  renameStoryChapter,
  analyzeStoryFlow,
  deleteStoryCut,
  getStoryCutDeletionImpact,
} from "@knolstory/runtime-core";
import { useStoryRuntime } from "./story-workspace-runtime";
import styles from "./story-workspace.module.css";
import { StoryWorkspaceInspector } from "./story-workspace-inspector";
import {WorkspaceManagement} from "./workspace-management";
import {LocalBookshelf,type BookshelfIntent} from "./local-bookshelf";
import {StoryPreparation} from "./story-preparation";
import {WORKSPACE_KEY,preflight,readWorkspace,captureContext,writeWorkspace as writeWorkspaceSnapshot,type WorkContexts,type WorkspaceView} from "../lib/workspace-storage";
import {readPlayerSaves,loadPlayerSlot} from "../lib/player-saves";
import { StoryFlowMap } from "./story-flow-map";
import { StoryFlowContext } from "./story-flow-context";
import { StoryCutList } from "./story-cut-list";
import { ChapterWriter } from "./chapter-writer";
import { CutDeleteDialog } from "./cut-delete-dialog";
import {readStoryFile,portableStory,downloadArtifact} from "../lib/story-archive";

import {StoryPlayerMenu} from "./story-player-menu";

import { previewViewport, type PreviewProfile } from "../lib/story-viewport";

import {BookIntroduction} from './book-introduction';
import {BookStart} from './book-start';
import {BookCoverEditor} from './book-cover-editor';
import {loadLandingVisit,markLandingVisited,resolveEntryView} from '../lib/landing-visit';

const FIRST = representativeStories[0]!;
const builtInStories=[...representativeStories,...classicStories];

export function StoryWorkspace() {
  const contexts = useRef<WorkContexts>({});
  const [view,setView]=useState<WorkspaceView>('home');
  const [runtimeMounted,setRuntimeMounted]=useState(false);
  const directEditor = useRef(false);
  const shell = useRef<HTMLElement>(null);
  const [fullscreen, setFullscreen] = useState(false);
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
  const [playback, setPlayback] = useState(() => createPlayback(FIRST.project));
  const [revision, setRevision] = useState(0);
  const [displaySize, setDisplaySize] = useState({width:1280,height:720});
  const [previewProfile, setPreviewProfile] = useState<PreviewProfile>("auto");
  const [presentationEntry, setPresentationEntry] = useState(0);
  const [playbackRun, setPlaybackRun] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const [loadComplete, setLoadComplete] = useState(false);
  const [saveStatus, setSaveStatus] = useState("기기 저장 준비 중");
  const [error, setError] = useState("");
  const [storageError, setStorageError] = useState("");
  const [inspector, setInspector] = useState(true);
  const [flowMapOpen, setFlowMapOpen] = useState(false);
  const [compact, setCompact] = useState(false);
  const [activeTool, setActiveTool] = useState<"text" | "assets" | "flow" | "presentation" | "cuts" | "writer" | null>("text");
  const [editorView, setEditorView] = useState<"cut" | "writer">("cut");
  const [writerChapterId, setWriterChapterId] = useState<string|null>(null);
  const [deleteId, setDeleteId] = useState<string|null>(null);
  const [undoDelete, setUndoDelete] = useState<{before:StoryProject;after:StoryProject;lineId:string}|null>(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [composing, setComposing] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [motionOverride, setMotionOverride] = useState(false);
  const selectedLine =
    mode === "play"
      ? (playback.lineId ?? playback.path.at(-1) ?? lineId)
      : lineId;
  const line =
    project.lines.find((item) => item.id === selectedLine) ??
    orderedLines(project)[0]!;
  const chapter = project.chapters.find((item) => item.id === line.chapterId)!;
  const chapterCuts = orderedLines(project).filter(cut => cut.chapterId === chapter.id);
  const chapterCutIndex = chapterCuts.findIndex(cut => cut.id === line.id);
  const ordered = useMemo(() => orderedLines(project), [project]);
  const flowGraph = useMemo(() => analyzeStoryFlow(project), [project]);
  const flowNodes = useMemo(() => new Map(flowGraph.nodes.map(node => [node.lineId, node])), [flowGraph]);
  const scene = useMemo(() => {
    const compiled=compileStoryScene(project,line.id,revision,{mode,reducedMotion:reducedMotion||motionOverride,viewport:previewViewport(previewProfile,displaySize),displaySize,playbackPath:mode==='play'?playback.path:undefined});
    return {...compiled,audio:{...compiled.audio!,sessionId:`${project.id}/${playbackRun}`},presentationEntry:String(presentationEntry),...(mode==='play'&&playback.status==='ended'?{ended:true,choices:[]}: {})};
  }, [project,line.id,revision,mode,reducedMotion,motionOverride,playback.status,playback.path,previewProfile,displaySize,presentationEntry,playbackRun]);
  const stage = resolveStageComposition(chapter, line, project);
  const dragCleanup = useRef<(() => void) | null>(null);
  const runtime = useStoryRuntime(scene, composing, (event) => {
    if (mode !== "play") return;
    if (event.type === "advanceRequested") advance();
    if (event.type === "choiceSelected") advance(event.choiceId);
  }, (size) => {
    setDisplaySize(current => {
      if (current.width === size.width && current.height === size.height) return current;
      return size;
    });
    setRevision(value=>value+1);
  }, runtimeMounted);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 720px), (max-width: 1000px) and (max-height: 500px)");
    const sync = () => setCompact(media.matches);
    const timer = window.setTimeout(sync, 0);
    media.addEventListener("change", sync);
    return () => { window.clearTimeout(timer); media.removeEventListener("change", sync); };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        directEditor.current=new URLSearchParams(location.search).get('view')==='editor';
        const raw = localStorage.getItem(WORKSPACE_KEY);
        const visited=loadLandingVisit(localStorage);
        const reload=(performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming|undefined)?.type==='reload';
        markLandingVisited(localStorage);
        if(raw){
          const loaded=readWorkspace(raw);contexts.current=loaded.contexts;savedProjects.current=loaded.works;
          setImportedWorks(Object.fromEntries(Object.entries(loaded.works).filter(([id])=>id.startsWith('new:')||id.startsWith('import:')).map(([id,work])=>[id,work.title])));
          setProject(loaded.project);setStoryId(loaded.storyId);
          const context=loaded.contexts[loaded.storyId]!;setLineId(context.lineId);setEditorView(context.editorView);setActiveTool(context.activeTool);setWriterChapterId(context.writerChapterId);setPreviewProfile(context.previewProfile);
          const entry=resolveEntryView({visited,hasWorkspace:true,reload,storedView:loaded.view,directEditor:directEditor.current});
          setPlayback(loaded.playback);setMode(entry==='editor'?loaded.mode:'edit');setView(entry);setRuntimeMounted(entry==='editor');
          if(loaded.warning)setError(loaded.warning);setRevision(v=>v+1);
        }else{setView(resolveEntryView({visited,hasWorkspace:false,reload,directEditor:directEditor.current}));setRuntimeMounted(directEditor.current);}

        setHydrated(true);
      } catch (issue) {
        if(directEditor.current){setView('editor');setRuntimeMounted(true);}
        setError(String(issue));
        setStorageError("기기 저장 내용을 읽지 못해 원본을 유지하고 자동 저장을 중지했어요. 편집하거나 가져온 작품은 파일로 보관해 주세요.");
        setSaveStatus("저장 내용을 불러오지 못함");
      } finally {
        setLoadComplete(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    const timer = window.setTimeout(() => {
      try {
        const next=writeWorkspaceSnapshot(localStorage,project,savedProjects.current,contexts.current,{storyId,lineId,mode,playback,editorView,activeTool,writerChapterId,previewProfile,view});savedProjects.current=next.works;contexts.current=next.contexts;
        setSaveStatus("기기에 저장됨");
      } catch (issue) {
        setSaveStatus("기기 저장 실패 — 파일로 보관해 주세요");
        setError(String(issue));
      }
    }, 100);
    return () => window.clearTimeout(timer);
  }, [project, storyId, lineId, hydrated, mode, playback, view,editorView,activeTool,writerChapterId,previewProfile]);
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
    const sync = () => setFullscreen(document.fullscreenElement === shell.current);
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);
  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await shell.current?.requestFullscreen();
    } catch {
      setError('전체 화면을 열지 못했어요. 브라우저 창에서 계속 읽거나 다시 눌러 주세요.');
    }
  }
  function snapshot(){return {storyId,lineId,mode,playback,editorView,activeTool,writerChapterId,previewProfile,view};}
  function rememberCurrent(){
    savedProjects.current={...savedProjects.current,[storyId]:project};
    contexts.current={...contexts.current,[storyId]:captureContext(project,contexts.current[storyId],snapshot())};
  }
  function persistWorkspace(){
    const next=writeWorkspaceSnapshot(localStorage,project,savedProjects.current,contexts.current,snapshot());
    savedProjects.current=next.works;contexts.current=next.contexts;
  }
  function returnToLibrary(){
    rememberCurrent();setMode('edit');setFlowMapOpen(false);setView('library');setManageOpen(false);
    if(document.fullscreenElement)void document.exitFullscreen();
    if(location.search)history.replaceState(null,'',location.pathname);
    directEditor.current=false;
  }
  function prepareWork(){rememberCurrent();setMode('edit');setView('prepare');setManageOpen(false);}
  function continueWriting(){setView('editor');setRuntimeMounted(true);setMode('edit');setEditorView('writer');setWriterChapterId(chapter.id);setActiveTool('writer');setInspector(true);setRevision(v=>v+1);}
  function beginBook(resume:boolean){
    const state=resume?resumeFor(storyId,project):createPlayback(project);
    if(!state){setError('읽은 위치를 확인할 수 없어요. 처음부터 읽기를 선택해 주세요.');return;}
    setPlayback(state);setMode('play');setView('editor');setRuntimeMounted(true);setPlaybackRun(v=>v+1);setPresentationEntry(v=>v+1);setRevision(v=>v+1);setError('');
  }
  function preparationChange(next:StoryProject){setProject({...next,updatedAt:new Date().toISOString()});setSaveStatus(hydrated?'저장 중':'기기 저장 중지 — 작품 파일로 보관해 주세요');setError('');}
  function resumeFor(key:string,next:StoryProject){
    const context=contexts.current[key];
    if(context?.hasRead&&context.playback)try{return restorePlayback(next,context.playback);}catch{/* Changed flow is handled by slots or restart. */}
    try{const slot=readPlayerSaves(localStorage).works[next.id]?.auto;if(slot)return loadPlayerSlot(next,slot).state;}catch{/* Unreadable slots stay protected and their menu reports the error. */}
    return undefined;
  }
  function catalogProject(fixture:(typeof builtInStories)[number]){
    const stored=storyId===fixture.id?project:savedProjects.current[fixture.id];
    // Enrich official/pristine editions only. A saved user's edited work is never rescored.
    if(directEditor.current)return stored??fixture.project;
    return stored&&JSON.stringify(stored)!==JSON.stringify(fixture.project)?stored:enhanceExistingStory(fixture.project);
  }
  function openLibraryWork(key:string,intent:BookshelfIntent){
    rememberCurrent();
    const fixture=builtInStories.find(item=>item.id===key);
    let next=fixture?structuredClone(catalogProject(fixture)):savedProjects.current[key];if(!next)return;
    if(fixture&&(intent==='edit'||intent==='prepare')){
      next={...next,id:crypto.randomUUID(),title:`${next.title} · 내 사본`,updatedAt:new Date().toISOString()};key=`new:${next.id}`;
      setImportedWorks(current=>({...current,[key]:next!.title}));
    }
    const context=contexts.current[key];const editId=context?.lineId&&next.lines.some(cut=>cut.id===context.lineId)?context.lineId:orderedLines(next)[0]!.id;
    const resume=intent==='resume'?resumeFor(key,next):undefined;
    if(intent==='resume'&&!resume){setError('이 작품의 읽기 위치를 확인할 수 없어요. 처음부터 읽기 또는 읽기 저장 메뉴를 이용해 주세요.');return;}
    setProject(next);setStoryId(key);setLineId(editId);setEditorView(context?.editorView??'cut');setActiveTool(context?.activeTool??'text');setWriterChapterId(context?.writerChapterId??null);setPreviewProfile(context?.previewProfile??'auto');
    setPlayback(resume??createPlayback(next,intent==='edit'||intent==='prepare'?editId:undefined));setMode('edit');setView(intent==='prepare'?'prepare':intent==='start'||intent==='resume'?'book':'editor');setRuntimeMounted(current=>current||intent==='edit');setPresentationEntry(v=>v+1);setPlaybackRun(v=>v+1);setRevision(v=>v+1);setError('');
  }
  const libraryWorks=[...builtInStories.map(fixture=>({key:fixture.id,project:catalogProject(fixture),kind:fixture.id.endsWith('-classic')?'original' as const:'example' as const,canResume:!!resumeFor(fixture.id,catalogProject(fixture))})),...Object.entries({...savedProjects.current,[storyId]:project}).filter(([key])=>key.startsWith('new:')||key.startsWith('import:')).map(([key,work])=>({key,project:work,kind:key.startsWith('new:')?'own' as const:'imported' as const,canResume:!!resumeFor(key,work)}))];
  function patch(values: Partial<StoryLine>) {
    try {
      const next=patchStoryLine(project,line.id,values);compileStoryScene(next,line.id,revision+1,{mode:'edit'});setProject(next);
      setSaveStatus(hydrated ? "저장 중" : "기기 저장 중지 — 작품 파일로 보관해 주세요");
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
    setSaveStatus(hydrated ? "저장 중" : "기기 저장 중지 — 작품 파일로 보관해 주세요");
    setRevision(value => value + 1);
    setError("");
  }
  function editStructure(change: () => StoryProject, selectedId?: string) {
    try { applyProject(change(), selectedId); }
    catch (issue) { setError(String(issue)); }
  }
  function newStory(title: string) {
    try {
      const next = createBlankStoryProject({ id: crypto.randomUUID(), chapterId: crypto.randomUUID(), lineId: crypto.randomUUID(), title });
      rememberCurrent();
      const id = `new:${next.id}`;
      setImportedWorks(current => ({ ...current, [id]: next.title }));
      setStoryId(id);
      setMode("edit");
      setInspector(true);
      setActiveTool("text");
      setManageOpen(false);
      applyProject(next, next.lines[0]!.id);setEditorView('cut');setWriterChapterId(null);setView(directEditor.current?'editor':'prepare');if(directEditor.current)setRuntimeMounted(true);
      return true;
    } catch (issue) { setError(`새 작품을 시작하지 못했어요. ${String(issue)}`); return false; }
  }
  function saveNow() {
    if (!hydrated) return;
    try {
      persistWorkspace();
      setSaveStatus("기기에 저장됨");
      setError("");
    } catch (issue) {
      setSaveStatus("기기 저장 실패 — 파일로 보관해 주세요");
      setError(`기기에 저장하지 못했어요. 작품 파일로 보관하거나 다시 저장해 주세요. ${String(issue)}`);
    }
  }
  function addCut() {
    const id = crypto.randomUUID();
    editStructure(() => insertStoryCut(project, line.id, id), id);
  }
  function addChapter(optionId?: string) {
    if (optionId) {
      try {
        const result = createStoryChoiceChapter(project, line.id, optionId, () => crypto.randomUUID());
        applyProject(result.project, result.line.id);
      } catch (issue) { setError(issue instanceof Error ? issue.message : '갈래를 연결하지 못했어요. 선택지를 다시 확인해 주세요.'); }
      return;
    }
    const chapterId = crypto.randomUUID();
    const id = crypto.randomUUID();
    editStructure(() => addStoryChapter(project, { chapterId, lineId: id }), id);
  }
  function selectCut(id: string) {
    setPresentationEntry(value=>value+1);
    dragCleanup.current?.();
    setLineId(id);
    setPlayback(createPlayback(project, id));
    setRevision((value) => value + 1);
  }
  function editFromFlow(id: string, repair?: { choiceId?: string; kind?: string }) {
    setView("editor");setRuntimeMounted(true);
    setEditorView("cut");
    setWriterChapterId(null);
    setMode("edit");
    setInspector(true);
    setActiveTool(repair && repair.kind !== "unreachable" ? "flow" : "text");
    setFlowMapOpen(false);
    selectCut(id);
    const cut = project.lines.find(item => item.id === id);
    const index = cut?.flow?.type === "choice" ? cut.flow.options.findIndex(option => option.id === repair?.choiceId) : -1;
    const label = repair && index >= 0 ? `선택지 ${index + 1} ${repair.kind === "blank-choice" ? "문구" : "도착 컷"}`
      : repair && cut?.flow?.type === "goto" ? "도착 컷" : "대사 / 해설";
    window.setTimeout(() => {
      const field = [...document.querySelectorAll<HTMLElement>("[aria-label]")].find(element => element.getAttribute("aria-label") === label);
      field?.focus();
    }, 0);
  }
  function advance(choiceId?: string) {
    if (runtime.presentationPending) return;
    const next=advancePlayback(project,playback,choiceId); try{compileStoryScene(project,next.lineId??next.path.at(-1)!,revision+1,{mode:'play',playbackPath:next.path});}catch(e){setError(String(e));return;} if(next.lineId!==null&&next.path.length>playback.path.length)setPresentationEntry(value=>value+1);
    setPlayback(next);
    setRevision((value) => value + 1);
  }
  function switchMode(next: "edit" | "play") {
    rememberCurrent();
    setPresentationEntry(value=>value+1);
    setManageOpen(false);
    setMode(next);
    setPlayback(createPlayback(project, line.id));
    setLineId(line.id);
    setRevision((value) => value + 1);
  }
  function chooseStory(id:string){
    // Existing direct editor entry preserves fixture identity and stored edits.
    rememberCurrent();const fixture=builtInStories.find(item=>item.id===id);const next=savedProjects.current[id]??(fixture?structuredClone(fixture.project):undefined);if(!next)return;
    const context=contexts.current[id];setProject(next);setStoryId(id);setLineId(context?.lineId??orderedLines(next)[0]!.id);setPlayback(createPlayback(next,context?.lineId));setMode('edit');setView('editor');setRuntimeMounted(true);setEditorView(context?.editorView??'cut');setActiveTool(context?.activeTool??'text');setWriterChapterId(context?.writerChapterId??null);setPreviewProfile(context?.previewProfile??'auto');setRevision(v=>v+1);setError('');
  }
  function acceptImported(next:StoryProject){
    if(!directEditor.current&&Object.entries({...savedProjects.current,[storyId]:project}).some(([key,work])=>(key.startsWith('new:')||key.startsWith('import:'))&&work.id===next.id))throw Error('같은 작품이 이미 서재에 있습니다. 기존 작품을 보존했어요. 서재에서 해당 작품을 열어 주세요.');
    rememberCurrent();const key=`import:${next.id}`;setStoryId(key);setImportedWorks(current=>({...current,[key]:next.title}));setProject(next);setLineId(orderedLines(next)[0]!.id);setPlayback(createPlayback(next));setMode('edit');setManageOpen(false);setEditorView('cut');setWriterChapterId(null);setActiveTool('text');setPreviewProfile('auto');setView(directEditor.current?'editor':'prepare');if(directEditor.current)setRuntimeMounted(true);setSaveStatus(hydrated?'저장 중':'기기 저장 중지 — 작품 파일로 보관해 주세요');setRevision(v=>v+1);setError('');
  }

  async function importFile(file?: File) {
    if (!file) return;
    try {
      const next=await readStoryFile(file);
      acceptImported(next);
    } catch (issue) {
      setError(
        `작품을 가져오지 못했어요. 현재 작품은 유지됩니다.\n${String(issue)}`,
      );
    }
  }
  async function exportFile() {
    try {
      const content=JSON.stringify(await portableStory(project),null,2);
      if(new Blob([content]).size>20_000_000)throw new Error('작품 파일은20MB 이하여야 합니다.');
      downloadArtifact(content,`${project.title.replace(/[\\/:*?"<>|]/g,'_')}.knolstory`,'application/json');setManageOpen(false);
    } catch (issue) {
      setError(`파일로 보관하지 못했어요. ${String(issue)}`);
    }
  }
  function confirmDelete() {
    if (!deleteId) return;
    try {
      const next = deleteStoryCut(project, deleteId);
      const cuts = orderedLines(next);
      const nextId = cuts[Math.min(ordered.findIndex(cut=>cut.id===deleteId),cuts.length-1)]!.id;
      setUndoDelete({before:project,after:next,lineId:deleteId});
      applyProject(next,nextId);
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
  return (<>
    {view==='home'&&<BookIntroduction works={libraryWorks} onLibrary={returnToLibrary} onBook={key=>openLibraryWork(key,'start')} disabled={!loadComplete} notice={storageError||error}/>}
    {view==='book'&&<BookStart project={project} canResume={!!resumeFor(storyId,project)} onStart={()=>beginBook(false)} onResume={()=>beginBook(true)} onLibrary={returnToLibrary} onPrepare={()=>openLibraryWork(storyId,'prepare')} onEdit={()=>openLibraryWork(storyId,'edit')}/>}
    {view==='cover'&&<BookCoverEditor project={project} onApply={(cover,title)=>{preparationChange(renameStoryProject({...project,cover},title));setView('prepare');}} onCancel={()=>setView('prepare')}/>}
    {view==='library'&&<><LocalBookshelf onIntroduction={()=>{rememberCurrent();setMode('edit');setView('home');}} works={libraryWorks} onOpen={openLibraryWork} onCreate={newStory} onImport={file=>void importFile(file)} disabled={!loadComplete} notice={storageError||error}/><p data-testid="library-save-status" role="status">{saveStatus}</p></>}
    {view==='prepare'&&<main className={styles.preparationShell}><header className={styles.header}><strong>놀스토리 · {project.title}</strong><div className={styles.controls}><button onClick={returnToLibrary}>서재로</button><button onClick={()=>void exportFile()}>작품 파일 내보내기</button><button disabled={!hydrated} onClick={saveNow}>지금 저장</button></div><p data-testid="preparation-save-status" role="status">{saveStatus}</p></header>{(storageError||error)&&<p role="alert">{storageError||error}</p>}<StoryPreparation onEditCover={()=>setView('cover')} project={project} currentLineId={lineId} onProjectChange={preparationChange} onOpenCut={id=>editFromFlow(id)} onContinueWriting={continueWriting}/></main>}
    <main data-parked={view!=='editor'} aria-hidden={view!=='editor'} inert={view!=='editor'} ref={shell} className={`${styles.shell} ${compact ? styles.compact : ""} ${mode === "play" ? styles.playMode : ""} ${editorView==='writer'?styles.writing:''}`}>
      <WorkspaceManagement project={project} storyId={storyId} importedWorks={importedWorks} savedWorks={savedProjects.current} compact={compact} manageOpen={manageOpen} hydrated={hydrated} loadComplete={loadComplete} onManage={setManageOpen} onCreate={newStory} onChoose={chooseStory} onExport={()=>void exportFile()} onSave={saveNow} onImportFile={file=>void importFile(file)} onImportProject={next=>{try{acceptImported(next);}catch(issue){setError(String(issue));}}} onError={setError} onLibrary={returnToLibrary} onPrepare={prepareWork}/>

      <section className={styles.context}>
        <div>
          <h1>{project.title}</h1>
          <p>
            {cutLabel(chapter,line)}
          </p>
          {mode==='play' && compact && <p className={styles.readingHint}>가로 읽기를 권장해요. 세로에서는 주화자만 표시해요.</p>}
          <p data-testid="save-status">{saveStatus}</p>
        </div>
        <div className={styles.controls}>
          <button onClick={() => setFlowMapOpen(true)} aria-haspopup="dialog">전체 흐름 보기</button>
          <button aria-pressed={editorView==='writer'} onClick={()=>{setEditorView('writer');setWriterChapterId(chapter.id);setActiveTool('writer');setInspector(true);setMode('edit');setRevision(value=>value+1);}}>이 장 대본</button>
          <button aria-pressed={editorView==='cut'} onClick={()=>{setEditorView('cut');setActiveTool('text');setInspector(true);setMode('edit');setRevision(value=>value+1);}}>현재 컷 꾸미기</button>
          <button aria-pressed={reducedMotion || motionOverride} onClick={() => { setMotionOverride(value => !value); setRevision(value => value + 1); }} disabled={reducedMotion}>동작 줄이기</button>
          <button
            aria-pressed={mode === "edit"}
            onClick={() => switchMode("edit")}
          >
            편집하기
          </button>
          <button
            aria-pressed={mode === "play"}
            onClick={() => switchMode("play")}
          >
            현재 컷부터 읽기
          </button>
          <button
            onClick={() => {
              setMode("play");
              setPlaybackRun(value=>value+1);setPresentationEntry(value=>value+1);setPlayback(createPlayback(project));
              setRevision((value) => value + 1);
            }}
          >
            처음부터 읽기
          </button>
          <button
            onClick={() => setInspector((value) => !value)}
            aria-expanded={inspector}
          >
            편집 패널 {inspector ? "접기" : "열기"}
          </button>
        </div>
      </section>
      {mode==='play'&&<StoryPlayerMenu project={project} playback={playback} onRestore={state=>{try{compileStoryScene(project,state.lineId??state.path.at(-1)!,revision+1,{mode:'play',playbackPath:state.path});setPlayback(state);setPlaybackRun(v=>v+1);setPresentationEntry(v=>v+1);setRevision(v=>v+1);}catch(e){setError(String(e));}}} onRestart={()=>{setPlayback(createPlayback(project));setPlaybackRun(v=>v+1);setPresentationEntry(v=>v+1);setRevision(v=>v+1);}} onExit={()=>switchMode('edit')} onLibrary={returnToLibrary} onFullscreen={()=>void toggleFullscreen()} fullscreen={fullscreen} onAdvance={()=>advance()} onReducedMotion={()=>{setMotionOverride(v=>!v);setRevision(v=>v+1);}} reducedMotion={reducedMotion||motionOverride} motionDisabled={reducedMotion} advanceDisabled={playback.status!=='reading'||runtime.presentationPending} disabled={!runtime.ready}/>}
      {mode === "edit" && flowNodes.get(line.id) && <StoryFlowContext node={flowNodes.get(line.id)!} graph={flowGraph} onSelectCut={editFromFlow} />}
      {flowMapOpen && <StoryFlowMap project={project} currentLineId={line.id} onSelectCut={editFromFlow} onClose={() => setFlowMapOpen(false)} />}
      {deleteId && <CutDeleteDialog text={project.lines.find(cut=>cut.id===deleteId)?.text??''} incomingLinks={getStoryCutDeletionImpact(project,deleteId).incomingLinks} onCancel={()=>setDeleteId(null)} onDelete={confirmDelete}/>}
      {undoDelete?.after===project && <button onClick={()=>{applyProject(undoDelete.before,undoDelete.lineId);setUndoDelete(null);}}>삭제 되돌리기</button>}
      {storageError && <div role="alert" className={styles.error}>{storageError}</div>}
      {error && (
        <div
          role="alert"
          className={styles.error}
          data-testid="workspace-error"
        >
          {error}
        </div>
      )}
      <div className={`${styles.grid} ${!inspector ? styles.closed : ""}`}>
        {compact && mode === "edit" && <nav className={styles.mobileTools} aria-label="편집 도구">
          {([['text','글 편집'],['assets','자산 편집'],['flow','선택지 편집'],['presentation','연출 편집'],['cuts','컷 목록']] as const).map(([tool,label]) => <button key={tool} aria-pressed={activeTool === tool} onClick={() => {
            setActiveTool(tool); setEditorView('cut'); setInspector(true); setManageOpen(false);
          }}>{label}</button>)}
          <button onClick={() => setActiveTool(null)}>도구 닫기</button>
        </nav>}
        <StoryCutList project={project} chapter={chapter} line={line} ordered={ordered} graph={flowGraph} mode={mode} hidden={compact && (mode !== "edit" || activeTool !== "cuts")} onRenameProject={title=>editStructure(()=>renameStoryProject(project,title))} onRenameChapter={title=>editStructure(()=>renameStoryChapter(project,chapter.id,title))} onAddChapter={()=>addChapter()} onSelectCut={selectCut}/>
        {runtimeMounted&&<section className={styles.stage} aria-label="이야기 무대">
          <div className={styles.toolbar}>
            <strong>{mode === "edit" ? "편집 무대" : "이야기 읽기"}</strong><small>휴대폰은 가로 읽기를 권장합니다. 세로에서는 주화자만 표시합니다.</small>
            {mode === "edit" && <button onClick={() => switchMode("play")}>연출 미리보기</button>}
            <label>화면 구도<select aria-label="화면 구도" value={previewProfile} onChange={event=>{setPreviewProfile(event.target.value as PreviewProfile);setRevision(value=>value+1);}}>
              <option value="auto">현재 표시 영역</option><option value="desktop">데스크톱 16:9</option><option value="portrait">휴대폰 세로 9:20</option><option value="landscape">휴대폰 가로 20:9</option>
            </select></label>
          </div>
          <div
            className={`${styles.viewport} ${previewProfile === "portrait" ? styles.portraitPreview : ""} ${mode === "play" ? styles.playingViewport : ""}`}
            ref={runtime.container}
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
                left: runtime.fit.offsetX,
                top: runtime.fit.offsetY,
                width: scene.width,
                height: scene.height,
                transform: `scale(${runtime.fit.scale})`,
                transformOrigin: "0 0",
              }}
            />
            {!runtime.ready && <div className={styles.runtimePreparing} role="status">이야기 무대를 준비하고 있어요. 잠시 기다리거나 편집으로 돌아가 작품을 저장할 수 있어요.</div>}
            {mode === "edit" &&
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
          <div
            className={styles.status}
            role="status"
            data-testid="story-runtime-status"
            data-rendered-revision={runtime.rendered}
            data-scene-revision={revision}
            data-scene-width={scene.width} data-scene-height={scene.height}
            data-music-path={runtime.renderEvidence?.audioState?.musicPath??''}
            data-ambience-path={runtime.renderEvidence?.audioState?.ambiencePath??''} data-ambience-start-count={runtime.renderEvidence?.audioState?.ambienceStartCount??0}
            data-music-position={runtime.renderEvidence?.audioState?.musicPosition??''} data-audio-unlocked={runtime.renderEvidence?.audioState?.unlocked?"true":"false"}
            data-music-start-count={runtime.renderEvidence?.audioState?.musicStartCount??0}
            data-sound-play-count={runtime.renderEvidence?.audioState?.soundPlayCount??0}
            data-sound-paths={JSON.stringify(runtime.renderEvidence?.audioState?.soundPaths??[])}
            data-engine-width={runtime.renderEvidence?.engineLogicalSize?.width??0} data-engine-height={runtime.renderEvidence?.engineLogicalSize?.height??0}
            data-textbox-y={scene.textboxRect?.y??510}
            data-renderer-width={runtime.renderEvidence?.rendererRect.width??0}
            data-renderer-height={runtime.renderEvidence?.rendererRect.height??0}
          >
            {runtime.status}
            {runtime.audioPending ? ' · 소리를 시작하려면 무대를 한 번 눌러 주세요.' : ''}
            {runtime.presentationPending && !runtime.audioPending
              ? " · 전환 화면에서 계속을 눌러 주세요"
              : ""}
          </div>
          {mode==='edit'&&(line.ending?.endsStory||line.flow?.type==='goto')&&<p className={styles.hint}>이 컷 뒤에 추가하면 현재 엔딩/이동은 새 컷의 끝으로 옮겨져 이어집니다. 다른 갈래는 선택지에서 새 장으로 연결하세요.</p>}
          <div className={styles.navigation}>
            {mode === "edit" ? (
              <>
                <button onClick={addCut}>현재 컷 뒤에 추가</button>
                <button disabled={line.order <= 1} onClick={() => editStructure(() => moveStoryCut(project, line.id, "up"))}>컷 위로 이동</button>
                <button disabled={line.order >= ordered.filter(item => item.chapterId === chapter.id).length} onClick={() => editStructure(() => moveStoryCut(project, line.id, "down"))}>컷 아래로 이동</button>
                <button
                  disabled={
                    chapterCutIndex === 0
                  }
                  onClick={() =>
                    selectCut(
                      chapterCuts[chapterCutIndex - 1]!.id,
                    )
                  }
                >
                  이전 컷
                </button>
                <span>
                  {line.order}컷 / 이 장 {chapterCuts.length}컷
                </span>
                <button
                  disabled={
                    chapterCutIndex === chapterCuts.length - 1
                  }
                  onClick={() =>
                    selectCut(
                      chapterCuts[chapterCutIndex + 1]!.id,
                    )
                  }
                >
                  다음 컷
                </button>
              </>
            ) : (
              <>
                <button
                  disabled={
                    playback.path.length < 2 && playback.status !== "ended"
                  }
                  onClick={() => {
                    setPresentationEntry(value=>value+1);
                    setPlayback((current) => backPlayback(project, current));
                    setRevision((value) => value + 1);
                  }}
                >
                  이전으로
                </button>
                <span data-testid="playback-status">
                  {
                    {
                      reading: "읽는 중",
                      choice: "선택해 주세요",
                      ended: "이야기 끝",
                      pending: "연결 대기",
                      "approval-required": "교사 승인 필요",
                    }[playback.status]
                  }
                </span>

              </>
            )}
          </div>
          {mode === 'play' && (playback.status === 'pending' || playback.status === 'approval-required') && <section className={styles.semantic} aria-label="읽기 연결 안내"><p>이 컷의 다음 길이 아직 연결되지 않았어요. 편집으로 돌아가 선택지와 도착 컷을 확인해 주세요.</p><button onClick={()=>editFromFlow(line.id,{kind:'missing-target'})}>이 컷 연결 고치기</button></section>}
          {mode === 'play' && playback.status === 'ended' && <section className={styles.semantic} aria-label="이야기 엔딩"><h2>{line.ending?.name || '이야기 끝'}</h2>{line.ending?.description && <p>{line.ending.description}</p>}<button onClick={() => {setPlaybackRun(value=>value+1);setPresentationEntry(value=>value+1);setPlayback(createPlayback(project));setRevision(value=>value+1);}}>다시 읽기</button></section>}
          <details className={styles.semantic} open={mode === "play"}>
            <summary>현재 컷을 글자로 읽기</summary>
            <div aria-live="polite">
              <p>
                <strong>{scene.dialogue.speaker || "해설"}</strong>
              </p>
              <p>{scene.dialogue.text}</p>
            </div>
            {mode === "play" &&
              playback.status === "choice" &&
              line.flow?.type === "choice" &&
              line.flow.options.map((option) => (
                <button
                  key={option.id}
                  disabled={runtime.presentationPending}
                  onClick={() => advance(option.id)}
                >
                  {option.label}
                </button>
              ))}
          </details>
        </section>}
        {inspector && mode === "edit" && <div className={styles.editorPanel} data-writer-scroll hidden={compact && (activeTool === "cuts" || activeTool === null)}>
          {editorView==='writer' ? <><label>대본 장 선택<select aria-label="대본 장 선택" value={writerChapterId&&project.chapters.some(ch=>ch.id===writerChapterId)?writerChapterId:chapter.id} onChange={event=>{setWriterChapterId(event.target.value);const first=ordered.find(cut=>cut.chapterId===event.target.value);if(first)selectCut(first.id);}}>{project.chapters.map(ch=><option key={ch.id} value={ch.id}>{chapterLabel(ch)}</option>)}</select></label><ChapterWriter project={project} chapterId={writerChapterId&&project.chapters.some(ch=>ch.id===writerChapterId)?writerChapterId:chapter.id} lineId={line.id} onSelectCut={selectCut} onProjectChange={applyProject} onOpenCut={editFromFlow} onDeleteCut={id=>setDeleteId(id)} onComposing={setComposing}/></> : <StoryWorkspaceInspector
            project={project}
            line={line}
            stage={stage}
            ordered={ordered}
            patch={patch}
            updateActor={updateActor}
            setComposing={setComposing}
            onCreateChoiceChapter={addChapter}
            onProjectChange={next=>applyProject(next)}
            disabled={!loadComplete}
            activeSection={compact && activeTool !== "cuts" && activeTool !== "writer" && activeTool !== null ? activeTool : "all"}
          />}
        </div>}
      </div>
      <p className={styles.footer}>
        {storageError ? "기기 원본을 보호하기 위해 자동 저장이 중지되었습니다. 현재 편집한 작품은 파일로 내보내 보관하세요." : "작품은 이 기기에 자동 저장됩니다. 다른 기기로 옮기거나 별도로 보관하려면 작품 파일을 내보내세요."}
      </p>
    </main>
    </>);
}
