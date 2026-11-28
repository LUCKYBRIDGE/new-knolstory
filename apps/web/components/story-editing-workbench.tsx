'use client';
/* eslint-disable @next/next/no-img-element -- Material thumbnails only; official story preview is supplied by Ren'Py. */
import {FocusSurface,type FocusSurfaceAction} from './a2ui/focus-surface';
import type {A2uiComponent} from '@knolstory/ui';
import {listToolsSurface,LIST_TOOLS_EVENTS} from './a2ui/list-tools-surface';
import {cutItemSurface,CUT_EVENTS,basicHeadSurface,BASIC_HEAD_EVENTS,type CutSteps,textBoxSurface,TEXT_EVENT,MANUSCRIPT_EVENTS,cutSpeakerSurface,mergeAskSurface,branchStripSurface,BRANCH_EVENTS,backgroundDisplaySurface,BACKGROUND_DISPLAY_EVENTS,actorCardSurface,ACTOR_EVENTS,cutPanelSurface,PANEL_TOGGLE_EVENT,stagingImportSurface,textVariantsSurface,companionSurface,companionsSurface,type CompanionView,cutCardSurface,forkSurface,lineNoticeSurface,NEIGHBOUR_EVENTS,type ForkChoice} from './a2ui/editor-surfaces';
import {branchOrigin,branchStrip,type BranchOrigin,type BranchStrip} from '../lib/manuscript-branches';
import {knownSpeakerNames,speakerOptions,speakerPatch,speakerPrefix,speakerValue} from '../lib/manuscript-speaker';
import {createPortal} from 'react-dom';
import {usePhoneEditor} from './use-phone-editor';
import {Fragment,useEffect,useLayoutEffect,useMemo,useRef,useState, type CSSProperties, type FocusEvent as ReactFocusEvent, type KeyboardEvent as ReactKeyboardEvent, type ReactNode} from 'react';
import {assetDisplayName,resolveAsset} from '@knolstory/asset-registry';
import {activeStageSpeaker,chapterLabel,chaptersInStoryOrder,resolveStageComposition,presentationLabel,type StoryProject,type StoryLine,type StageComposition,type StageActorEntry} from '@knolstory/story-domain';
import {ACTOR_MOTION_OPTIONS,actorMotionChoice} from '../lib/actor-motion-choice';
import {buildEditorRangeSummaries} from '../lib/editor-range-summaries';
import {patchStoryLine,resetActorPlacement,compileStoryScene,type StoryFlowGraph} from '@knolstory/runtime-core';
import {StoryConnections} from './story-connections';
import {hasBranches,storyPaths} from '../lib/story-path';
import {splitChapterAudioRange} from '../lib/chapter-audio-split';
import {editCombinedRange,undoCombinedRange,type CombinedRangeUndo} from '../lib/combined-range-edit';
import {StoryTextVariants} from './story-text-variants';
import {StorySceneVisibilityEditor} from './story-scene-visibility';
import {StoryCombinedRangeTools} from './story-combined-range-tools';
import {StoryCombinedTimeline} from './story-combined-timeline';
import type {CombinedTarget,CombinedEditingEntry} from '../lib/combined-editing-tracks';
import {StoryStagingImport} from './story-staging-import';
import {AssetPickerField} from './asset-picker-field';
import {StoryAudioControls} from './story-audio-controls';
import {SecondsInput} from './seconds-input';
import {StoryDirectionPanel} from './story-direction-panel';
import {ALL_EDITING_ALLOWED,allowedEditingScreen,type EditingPermissions} from '../lib/editing-permissions';
import styles from './story-editing-workbench.module.css';
import type {EditingScreen,Companion,EditorPreferences} from '../lib/editor-preferences';
import {resolveCutArrangement,type CutArrangement} from '../lib/cut-arrangement';
import type {AdjacentSceneThumbnail} from './use-adjacent-scene-thumbnails';
import {AssetPreviewImage} from './asset-preview-image';
export type {EditingScreen} from '../lib/editor-preferences';
export type EditorTextSnapshots=Record<string,{cutId?:string;start:number;end:number;direction:"forward"|"backward"|"none";top:number;left:number;scroll:number;windowScroll:number}>;
type Props={permissions?:EditingPermissions;/** 이야기 연결 (branching works): the flow graph, the editing path and how to repair a missing link. */connections?:{graph:StoryFlowGraph;editingPath:readonly string[];canRepair:boolean;onReturnVisit:(index:number)=>boolean;onRepair:(lineId:string,repair:{choiceId?:string;kind:string})=>boolean|void};/** What to do when done, when it differs from saving a work file (a class task). */finishHint?:string;relatedMemos?:ReactNode;
 /** The picture-book page this chapter grew out of: shown beside the cuts while writing, never in reading. */
 chapterReference?:ReactNode;editingActive?:boolean;onAddCutAfter?:()=>void;adjacentThumbnails?:Readonly<Record<string,AdjacentSceneThumbnail>>;preferences:EditorPreferences;onPreferencesChange:(update:(current:EditorPreferences)=>EditorPreferences)=>void;settingsTarget?:HTMLElement|null;/** The top bar's ‹ › follow this screen: it reports their state; the top bar draws them (A2UI CutNavigator). */
 onCutSteps?:(steps:(CutSteps&{step:(direction:'previous'|'next')=>void})|null)=>void;preview?:ReactNode;playing?:boolean;additionalSettings?:ReactNode;chapterSettings?:ReactNode;additionalEditor?:ReactNode;project:StoryProject;lineId:string;screen:EditingScreen;onScreenChange:(screen:EditingScreen)=>void|boolean;onProjectChange:(project:StoryProject)=>void;onSelectCut:(id:string)=>void;onComposing:(value:boolean)=>void;basicTextDisabled:boolean;onBasicTextChange:(text:string)=>void;disabled:boolean;composing:boolean;onPreview:(id:string)=>void;onOpenMap?:()=>void;onSplitHere?:()=>void;onSeparatePath?:(fromLineId:string)=>void;
 /** 원고: Enter twice starts the next cut at `position` of `value`; Backspace at the start joins the cut before. */
 onSplitCut?:(lineId:string,pieces:readonly string[],caret:number)=>void;onJoinPrevious?:(lineId:string,adoptEarlier?:boolean)=>'joined'|'ask'|'refused';
 /** 원고 · 갈래 줄: write the first cut of a choice's way that has none yet. */
 onWriteBranch?:(sourceLineId:string,optionId:string)=>void};
const STAGE_STRIP_KEY='knolstory-editor-stage-strip-v1';
const screens:readonly [EditingScreen,string][]=[['basic','쓰기'],['text','원고'],['background','배경 편집'],['characters','인물 편집'],['audio','음향 편집'],['direction','연출 편집'],['audio-direction','음향·연출 함께 편집']];
const names:Record<Companion,string>={text:'글',background:'배경',characters:'인물',audio:'음향',direction:'연출'};
const optional=(screen:EditingScreen):screen is 'characters'|'audio'|'direction'=>screen==='characters'||screen==='audio'||screen==='direction';
function backgroundId(project:StoryProject,line:StoryLine){return line.backgroundMode==='none'?'':line.backgroundId||project.chapters.find(c=>c.id===line.chapterId)?.backgroundId||project.stageDefaults?.backgroundId||'';}
function Material({id}:{id:string}){const asset=resolveAsset(id);return <span className={styles.material}>{asset?<><AssetPreviewImage asset={asset}/><span>{assetDisplayName(asset)}</span></>:<span>{id?'자료 확인 필요':'이미지 없음'}</span>}</span>;}
function cutReference(project:StoryProject,id:string){const line=project.lines.find(item=>item.id===id);if(!line)return '종료 컷 확인 필요';const chapter=project.chapters.find(item=>item.id===line.chapterId);const index=project.lines.filter(item=>item.chapterId===line.chapterId).sort((a,b)=>a.order-b.order).findIndex(item=>item.id===id);return `${chapter?.title??'장'} ${index+1}컷`;}
function destinationLabel(project:StoryProject,id:string|null){return id===null?'이야기 종료':id?cutReference(project,id):'도착 컷 미지정';}
function revealCurrentCut(root:HTMLElement|null){
 root?.querySelectorAll<HTMLElement>('nav[data-chapter-cuts]').forEach(list=>{
  if(list.clientHeight===0)return;
  const current=list.querySelector<HTMLElement>('[aria-current=step]');if(!current)return;
  const item=current.getBoundingClientRect(),bounds=list.getBoundingClientRect();
  if(item.top<bounds.top)list.scrollTop+=item.top-bounds.top;
  else if(item.bottom>bounds.bottom)list.scrollTop+=item.bottom-bounds.bottom;
 });
}
export function StoryEditingWorkbench(p:Props){
 const permissions=p.permissions??ALL_EDITING_ALLOWED;
 const [chapterFilter,setChapterFilter]=useState<{projectId:string;chapterId:string;lineId:string}|null>(null);
 // A manual browse belongs to one editing visit; never resurrect it after playback or cut changes.
 if(chapterFilter&&(chapterFilter.projectId!==p.project.id||chapterFilter.lineId!==p.lineId||p.playing))setChapterFilter(null);
 const [error,setError]=useState<{context:string;message:string}|null>(null);
 const editContext=JSON.stringify([p.project.id,p.lineId]);
 const reportError=(cause:unknown)=>setError({context:editContext,message:cause instanceof Error?cause.message:'바꾼 글을 적용하지 못했어요. 다시 시도해 주세요.'});
 const [timelineSpace,setTimelineSpace]=useState(50);
 const [rangeUndo,setRangeUndo]=useState<CombinedRangeUndo|null>(null);
 const [expanded,setExpanded]=useState<Record<string,boolean>>({});
 // 원고: the cut whose Backspace join needs the author’s word (its settings differ from the cut before).
 const [mergeAsk,setMergeAsk]=useState<string|null>(null);
 const enabled=p.preferences.enabled;
 const phone=usePhoneEditor();
 // E2 (2026-11-24): on a portrait phone the 쓰기 stage starts as a thin strip (background and characters) so the text has room.
 // The choice is remembered on this device; the preview keeps its full size inside the strip (positive-size parking contract).
 const [stageOpen,setStageOpen]=useState(false);
 useEffect(()=>{const restore=()=>{try{setStageOpen(localStorage.getItem(STAGE_STRIP_KEY)==='open');}catch{/* storage blocked: start as a strip */}};restore();},[]);
 const toggleStage=()=>setStageOpen(open=>{const next=!open;try{localStorage.setItem(STAGE_STRIP_KEY,next?'open':'strip');}catch{/* keep the in-memory choice */}return next;});
 const [shortLandscape,setShortLandscape]=useState(false);
 useEffect(()=>{
  const media=matchMedia('(orientation: landscape) and (max-height: 440px)');
  const update=()=>setShortLandscape(media.matches);
  update();media.addEventListener('change',update);return()=>media.removeEventListener('change',update);
 },[]);
 const requestedScreen=p.screen==='audio-direction'?enabled.audio&&enabled.direction?p.screen:'basic':optional(p.screen)&&!enabled[p.screen]?'basic':p.screen;
 const landscapeReview=phone&&shortLandscape&&!p.composing;
 const screen=landscapeReview?'basic':phone&&requestedScreen==='audio-direction'?'audio':requestedScreen;
 const phoneSingle=phone&&screen!=='basic'&&screen!=='text';
 const root=useRef<HTMLElement>(null);
 const [bodySize,setBodySize]=useState<{width:number;height:number}>();
 const [keyboardCutRequest,setKeyboardCutRequest]=useState<{projectId:string;sourceId:string;targetId:string}|null>(null);
 useEffect(()=>{
  if(!keyboardCutRequest||p.composing)return;
  const frame=requestAnimationFrame(()=>{
   setKeyboardCutRequest(null);
   if(keyboardCutRequest.projectId!==p.project.id||keyboardCutRequest.sourceId!==p.lineId||p.playing)return;
   p.onSelectCut(keyboardCutRequest.targetId);
   requestAnimationFrame(()=>root.current?.querySelector<HTMLTextAreaElement>('[data-current-cut] textarea')?.focus({preventScroll:true}));
  });
  return()=>cancelAnimationFrame(frame);
 },[keyboardCutRequest,p]);
 const navigateWhileWriting=(targetId:string)=>{
  const field=root.current?.querySelector<HTMLTextAreaElement>('[data-current-cut] textarea');
  if(document.activeElement!==field){if(!p.composing)p.onSelectCut(targetId);return;}
  setKeyboardCutRequest({projectId:p.project.id,sourceId:p.lineId,targetId});
  // Native IMEs commit on blur; wait for compositionend before changing the cut.
  root.current?.querySelector<HTMLTextAreaElement>('[data-current-cut] textarea')?.blur();
 };

 useEffect(()=>{
  const node=root.current;if(!node)return;
  const toggle=(event:Event)=>{
   const opened=event.target;
   // One supplementary panel at a time; '컷 더보기' stays open around the panel opened inside it.
   if(!(opened instanceof HTMLDetailsElement)||!opened.open||!opened.matches('[data-additional-dock]>details,[data-stacked-context]>details,[data-cut-more]>details'))return;
   node.querySelectorAll<HTMLDetailsElement>('[data-additional-dock]>details[open],[data-stacked-context]>details[open],[data-cut-more]>details[open]').forEach(detail=>{if(detail!==opened&&!detail.contains(opened))detail.open=false;});
  };
  node.addEventListener('toggle',toggle,true);return()=>node.removeEventListener('toggle',toggle,true);
 },[]);
 // Observe the stable workspace, not the grid whose supplemental tools change height.
 useEffect(()=>{const node=root.current;if(!node||p.composing)return;const observer=new ResizeObserver(entries=>{if(node.closest('[data-keyboard-occluded=true]'))return;const rect=entries[0]?.contentRect;if(rect&&rect.width>0&&rect.height>0)setBodySize(previous=>previous?.width===rect.width&&previous?.height===rect.height?previous:{width:rect.width,height:rect.height});});observer.observe(node);return()=>observer.disconnect();},[p.composing]);
 const arrangement=resolveCutArrangement(p.preferences.arrangement??'auto',bodySize);
 useEffect(()=>{if(screen==='basic'&&!p.playing)revealCurrentCut(root.current);},[screen,p.project.id,p.lineId,p.playing,arrangement]);
 useEffect(()=>{
  const panels=()=>root.current?.querySelectorAll<HTMLDetailsElement>('[data-additional-dock]>details[open],[data-stacked-context]>details[open],[data-cut-more]>details[open]');
  const escape=(event:KeyboardEvent)=>{
   if(event.key!=='Escape'||event.defaultPrevented||event.isComposing||document.querySelector('dialog[open]'))return;
   const opened=[...panels()??[]].at(-1);if(!opened)return;
   opened.open=false;opened.querySelector<HTMLElement>(':scope>summary')?.focus();event.preventDefault();event.stopPropagation();
  };
  document.addEventListener('keydown',escape);
  return()=>{document.removeEventListener('keydown',escape);};
 },[]);
 const snapshots=useRef<EditorTextSnapshots>({});
 const snapshotKey=`${p.project.id}/${screen}`;
 const remember=(field:EventTarget|null=document.activeElement)=>{
  const area=root.current?.querySelector<HTMLElement>('[data-writer-scroll]');
  const previous=snapshots.current[snapshotKey];
  const textarea=field instanceof HTMLTextAreaElement&&field.dataset.cutId&&root.current?.contains(field)?field:undefined;
  snapshots.current[snapshotKey]={cutId:textarea?.dataset.cutId??previous?.cutId,start:textarea?.selectionStart??previous?.start??0,end:textarea?.selectionEnd??previous?.end??0,direction:textarea?.selectionDirection??previous?.direction??"none",top:textarea?.scrollTop??previous?.top??0,left:textarea?.scrollLeft??previous?.left??0,scroll:area?.scrollTop??0,windowScroll:window.scrollY};
 };
 const previousEditingActive=useRef(p.editingActive),restoredContext=useRef<string|null>(null);
 const previousSelection=useRef({projectId:p.project.id,lineId:p.lineId});
 useLayoutEffect(()=>{
  const context=JSON.stringify([p.project.id,screen,p.editingActive,p.lineId]);
  if(restoredContext.current===context)return;restoredContext.current=context;
  const returning=previousEditingActive.current===false&&p.editingActive!==false;previousEditingActive.current=p.editingActive;
  const selectionChanged=previousSelection.current.projectId!==p.project.id||previousSelection.current.lineId!==p.lineId;
  previousSelection.current={projectId:p.project.id,lineId:p.lineId};
  if(p.editingActive===false)return;
  const snapshot=snapshots.current[`${p.project.id}/${screen}`];
  if(!snapshot||(returning||selectionChanged)&&snapshot.cutId!==p.lineId)return;
  const textarea=Array.from(root.current?.querySelectorAll<HTMLTextAreaElement>('textarea[data-cut-id]')??[]).find(field=>field.dataset.cutId===snapshot.cutId);
  if(textarea&&!textarea.disabled){textarea.focus({preventScroll:true});textarea.setSelectionRange(snapshot.start,snapshot.end,snapshot.direction);textarea.scrollTop=snapshot.top;textarea.scrollLeft=snapshot.left;}
  const area=root.current?.querySelector<HTMLElement>('[data-writer-scroll]');
  if(area)area.scrollTop=snapshot.scroll;
  window.scrollTo({top:snapshot.windowScroll,behavior:'instant'});
 },[p.project.id,screen,p.editingActive,p.lineId]);
 const current=p.project.lines.find(l=>l.id===p.lineId);
 const chapterId=!phoneSingle&&chapterFilter?.projectId===p.project.id&&chapterFilter.lineId===p.lineId?chapterFilter.chapterId:current?.chapterId??p.project.chapters[0]?.id;
 const rows=p.project.lines.filter(l=>l.chapterId===(screen==='basic'?current?.chapterId:chapterId)).sort((a,b)=>a.order-b.order);
 const selected=p.preferences.companions[screen]??[];
 const findCurrentRow=()=>{const list=root.current?.querySelector<HTMLElement>('[data-writer-scroll]'),row=list?.querySelector<HTMLElement>('[aria-current=step]');if(!list||!row)return;const item=row.getBoundingClientRect(),bounds=list.getBoundingClientRect();list.scrollTop+=item.top-bounds.top-2;};
 // Opening a multi-cut screen (원고·배경·인물…) starts at the cut being edited, matching the stage, instead of the chapter's first cut.
 useEffect(()=>{if(screen==='basic'||screen==='audio-direction')return;const frame=requestAnimationFrame(()=>findCurrentRow());return()=>cancelAnimationFrame(frame);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the screen (or work) changes, never while choosing cuts in the list
 },[screen,p.project.id]);
 const showRanges=screen==='audio-direction'||screen==='audio'||screen==='direction'||selected.includes('audio')||selected.includes('direction');
 const rangeSummaries=useMemo(()=>showRanges?buildEditorRangeSummaries(p.project):new Map<string,{audio:string;direction:string}>(),[p.project,showRanges]);
 const audioSummary=(line:StoryLine)=>rangeSummaries.get(line.id)?.audio??'음향 설정 없음';
 const directionSummary=(line:StoryLine)=>rangeSummaries.get(line.id)?.direction??'연출 없음';
 const busy=p.disabled;
 const speakerNames=useMemo(()=>knownSpeakerNames(p.project),[p.project]);
 const changeProject=(project:StoryProject)=>{try{p.onProjectChange(project);setError(null);}catch(cause){reportError(cause);}};
 const patch=(line:StoryLine,value:Partial<StoryLine>)=>{if(busy)return;try{changeProject(patchStoryLine(p.project,line.id,value));}catch(cause){reportError(cause);}};
 // 원고: typing ‘철수:’ at the start of a cut names its speaker when the work knows 철수 (‘해설:’ means narration).
 const writeText=(line:StoryLine,value:string)=>{
  const named=screen==='text'&&!p.composing&&!speakerPrefix(line.text,speakerNames,true)?speakerPrefix(value,speakerNames,true):null;
  const speaker=named?speakerPatch(line,named.value):null;
  patch(line,speaker&&named?{...speaker,text:named.rest}:{text:value});
 };
 // 원고: one speaker choice, for the cut being written (each block shows its own speaker beside it).
 const cutSpeaker=(line:StoryLine,index:number)=><FocusSurface inline rootId="speaker-group" device={phone?'phone':'tablet'} surface={cutSpeakerSurface({lineId:line.id,cut:index+1,value:speakerValue(line),options:speakerOptions(speakerNames,line),disabled:busy||p.composing})}
  attrs={component=>component.id==='speaker-group'?{className:styles.cutSpeaker}:undefined}
  onAction={({action})=>{const event='event' in action?action.event:undefined,value=event?.context?.value;if(event?.name!==MANUSCRIPT_EVENTS.speaker||typeof value!=='string')return;const change=speakerPatch(line,value);if(change)patch(line,change);}}/>;
 const textEditor=(line:StoryLine,index:number,basic=false)=><><label className={styles.text}><span className={styles.srOnly}>글상자 글</span>{/* A2UI: the text box is the catalog's TextArea (IME composition reaches the screen through onComposing). */}<FocusSurface inline rootId="text" device={phone?'phone':'tablet'} onComposing={p.onComposing}
   surface={textBoxSurface({lineId:line.id,label:`${index+1}컷 글`,value:line.text,readOnly:basic&&phone&&shortLandscape,disabled:basic?p.basicTextDisabled:busy,writeOn:!basic&&screen==='text'&&!!p.onSplitCut})}
   attrs={()=>({className:'','data-cut-id':line.id})}
   onAction={({action})=>{const event='event' in action?action.event:undefined,value=event?.context?.value;const pieces=event?.context?.pieces;if(event?.name===MANUSCRIPT_EVENTS.split&&Array.isArray(pieces)&&pieces.every(piece=>typeof piece==='string')){if(!busy)p.onSplitCut?.(line.id,pieces as string[],typeof event.context?.caret==='number'?event.context.caret:0);return;}if(event?.name===MANUSCRIPT_EVENTS.join){if(!busy&&p.onJoinPrevious?.(line.id)==='ask')setMergeAsk(line.id);return;}if(event?.name!==TEXT_EVENT||typeof value!=='string')return;if(basic){if(!p.basicTextDisabled)p.onBasicTextChange(value);}else writeText(line,value);}}/>{basic&&phone&&shortLandscape&&<small>{requestedScreen==='basic'?'글을 수정하려면 휴대폰을 세로로 돌려 주세요.':'세부 편집은 휴대폰을 세로로 돌려 주세요.'}</small>}</label>{(p.preferences.logic.branches)&&<FocusSurface inline surface={textVariantsSurface(line.id)} rootId="variants" device="tablet" custom={{TextVariants:()=><>{p.preferences.logic.scores&&p.preferences.logic.branches&&<StoryTextVariants key={`${p.project.id}/${line.id}`} project={p.project} line={line} index={index} disabled={busy} composing={p.composing} onComposing={p.onComposing} onChange={textVariants=>patch(line,{textVariants})}/>}{p.preferences.logic.branches&&<StorySceneVisibilityEditor key={`visibility/${p.project.id}/${line.id}`} project={p.project} line={line} index={index} disabled={busy} composing={p.composing} scoresEnabled={p.preferences.logic.scores} onComposing={p.onComposing} onChange={visibility=>patch(line,{visibility})}/>}</>}}/>}</>;
 const basicSpeaker=(line:StoryLine)=>{
  const stage=resolveStageComposition(p.project.chapters.find(chapter=>chapter.id===line.chapterId),line,p.project);
  const primary=activeStageSpeaker(stage,line);
  const speakingKeys=primary?new Set([primary,...stage.speakerActorKeys??[]]):new Set<string>();
  const linked=[...stage.leftActors,...stage.rightActors].filter(actor=>speakingKeys.has(actor.key));
  // A2UI: the head is drawn from the focus editor catalog (editor-surfaces.ts); linked art is catalog chips.
  const surface=basicHeadSurface({speaker:line.speakerName,kind:line.type,busy,kindDisabled:p.composing,playDisabled:p.composing,images:linked.map(actor=>{const asset=resolveAsset(actor.assetId);return {key:actor.key,assetId:asset?actor.assetId:undefined,name:asset?assetDisplayName(asset):'이미지 확인 필요'};})});
  return <FocusSurface inline surface={surface} rootId="head" device={phone?'phone':'tablet'} onComposing={p.onComposing}
   attrs={component=>component.id==='head'?{className:styles.basicSpeaker}:component.id==='speaker'?{className:styles.speakerName}:component.id==='kind'?{className:styles.speakerKind}:component.id==='linked'?{className:styles.speakerImage,...(linked.length?{}:{'aria-hidden':'true'})}:component.component==='Column'||component.component==='Chip'?{className:''}:undefined}
   custom={{AssetThumbnail:component=>{const asset=resolveAsset(String(component.assetId));return asset?<AssetPreviewImage asset={asset} width={18} height={24}/>:null;}}}
   onAction={({action})=>{const event='event' in action?action.event:undefined;const value=event?.context?.value;
    if(event?.name===BASIC_HEAD_EVENTS.speaker&&typeof value==='string')patch(line,{speakerName:value});
    if(event?.name===BASIC_HEAD_EVENTS.kind&&typeof value==='string')patch(line,{type:value as StoryLine['type'],...(value==='narration'?{speaker:'narration' as const}:{})});
    if(event?.name===BASIC_HEAD_EVENTS.play)p.onPreview(line.id);}}/>;
 };
 const backgroundEditor=(line:StoryLine,index:number)=><fieldset disabled={busy||p.composing} className={styles.primary}><AssetPickerField label={`${index+1}컷 배경`} labelHidden={screen==='background'} type="background" value={line.backgroundMode==='none'?'__none':line.backgroundId} allowDefault allowNone inheritedPreviewId={backgroundId(p.project,line)} defaultLabel={p.project.chapters.find(c=>c.id===line.chapterId)?.backgroundId?'장의 기본 이미지':p.project.stageDefaults?.backgroundId?'작품의 기본 이미지':'장의 기본 이미지'} chapterAssetIds={p.project.chapters.find(c=>c.id===line.chapterId)?.backgroundAssetIds} onChange={id=>patch(line,id==='__none'?{backgroundId:'',backgroundMode:'none'}:{backgroundId:id,backgroundMode:undefined})}/>{screen==='background'&&<BackgroundDisplayControls line={line} index={index} onChange={presentation=>patch(line,{presentation})}/>}</fieldset>;
 const stageFor=(line:StoryLine)=>resolveStageComposition(p.project.chapters.find(c=>c.id===line.chapterId),line,p.project);
 // A2UI: reference views of a cut are catalog parts (Chip, Column, AssetThumbnail drawn by Material).
 const companionView=(kind:Companion,line:StoryLine):CompanionView=>kind==='text'?{kind,text:line.text||'아직 글이 없어요.'}:kind==='background'?{kind,assetId:backgroundId(p.project,line)}
  :kind==='characters'?{kind,actors:[...stageFor(line).leftActors,...stageFor(line).rightActors].map(a=>({key:a.key,side:a.position==='center'?'중앙':stageFor(line).leftActors.some(x=>x.key===a.key)?'왼쪽':'오른쪽',assetId:a.assetId}))}
  :{kind,text:kind==='audio'?audioSummary(line):directionSummary(line)};
 const companionAttrs=(kindOf:(id:string)=>string)=>(component:A2uiComponent)=>{
  if(component.id==='companions')return {className:styles.companions};
  if(component.component==='Column')return {className:kindOf(component.id)==='characters'&&!String(component.id).startsWith('section')?styles.materials:''};
  if(component.component==='Chip'){if(component.iconSide==='end')return {className:''};const kind=kindOf(component.id);return {className:kind==='text'?styles.excerpt:styles.rangeSummary};}
  return undefined;
 };
 const companionCustom={AssetThumbnail:(component:A2uiComponent)=><Material id={String(component.assetId??'')}/>};
 const companion=(kind:Companion,line:StoryLine):ReactNode=><FocusSurface inline surface={companionSurface(`${kind}-${line.id}`,companionView(kind,line))} rootId="companion" device="tablet" attrs={companionAttrs(()=>kind)} custom={companionCustom}/>;
 // A2UI: 음향·연출 화면의 컷 도구 — 상태 한 줄(Chip)과 열 때만 그리는 판(More + SoundEditor/DirectionEditor).
 const cutPanel=(kind:'audio'|'direction',line:StoryLine,index:number,summary:string,editor:ReactNode)=>{
  const key=`${p.project.id}/${kind}/${line.id}`,surface=cutPanelSurface({kind,lineId:line.id,cut:index+1,summary,open:!!expanded[key]});
  const draw=(rootId:string)=><FocusSurface key={`${key}/${rootId}`} inline surface={surface} rootId={rootId} device={phone?'phone':'tablet'}
   attrs={component=>component.id==='summary'?{className:styles.rangeSummary}:component.id==='edit'?{className:''}:undefined} skin={{srOnly:styles.srOnly}}
   custom={{SoundEditor:()=>editor,DirectionEditor:()=>editor}}
   onAction={({action})=>{const event='event' in action?action.event:undefined;if(event?.name===PANEL_TOGGLE_EVENT){const open=event.context?.open===true;setExpanded(prev=>({...prev,[key]:open}));}}}/>;
  return <>{draw('summary')}{draw('edit')}</>;
 };
 const focusBlock=(lineId:string,caret:number|'end')=>{const field=root.current?.querySelector<HTMLTextAreaElement>(`textarea[data-cut-id="${CSS.escape(lineId)}"]`);if(!field||field.disabled)return;field.focus({preventScroll:true});const at=caret==='end'?field.value.length:caret;field.setSelectionRange(at,at);field.scrollIntoView({block:'nearest'});};
 // 원고: the blocks read as one document — the arrows cross into the cut before or after at a block's edge, and the cut being written is the current cut.
 const manuscriptKeys=(event:ReactKeyboardEvent<HTMLDivElement>)=>{
  const field=event.target as HTMLElement;if(screen!=='text'||!(field instanceof HTMLTextAreaElement)||!field.dataset.cutId||event.nativeEvent.isComposing||event.altKey||event.ctrlKey||event.metaKey||event.shiftKey||field.selectionStart!==field.selectionEnd)return;
  const back=(event.key==='ArrowUp'||event.key==='ArrowLeft')&&field.selectionStart===0,forward=(event.key==='ArrowDown'||event.key==='ArrowRight')&&field.selectionEnd===field.value.length;
  const index=rows.findIndex(line=>line.id===field.dataset.cutId),target=back?rows[index-1]:forward?rows[index+1]:undefined;
  if(!target)return;event.preventDefault();focusBlock(target.id,back?'end':0);
 };
 const manuscriptFocus=(event:ReactFocusEvent<HTMLDivElement>)=>{const id=(event.target as HTMLElement).dataset?.cutId;if(screen==='text'&&id&&id!==p.lineId)p.onSelectCut(id);};
 const primary=(line:StoryLine,index:number)=>{
  if(screen==='text')return <>{textEditor(line,index)}{mergeAsk===line.id&&<FocusSurface inline rootId="merge-ask" device={phone?'phone':'tablet'} surface={mergeAskSurface(line.id)} attrs={component=>component.id==='merge-ask'?{className:styles.mergeAsk}:undefined}
   onAction={({action})=>{const event='event' in action?action.event:undefined;setMergeAsk(null);if(event?.name===MANUSCRIPT_EVENTS.adopt&&!busy)p.onJoinPrevious?.(line.id,true);else focusBlock(line.id,0);}}/>}</>;
  if(screen==='background')return backgroundEditor(line,index);
  if(screen==='characters')return <><CharacterEditors project={p.project} line={line} stage={stageFor(line)} index={index} onReset={key=>changeProject(resetActorPlacement(p.project,line.id,key))} chapterAssetIds={p.project.chapters.find(c=>c.id===line.chapterId)?.characterAssetIds} onChange={stageComposition=>patch(line,{stageComposition})}/><FocusSurface inline surface={stagingImportSurface(line.id)} rootId="staging" device="tablet" custom={{StagingImport:()=><StoryStagingImport project={p.project} line={line} ordered={[...p.project.lines].sort((a,b)=>(p.project.chapters.find(c=>c.id===a.chapterId)?.order??0)-(p.project.chapters.find(c=>c.id===b.chapterId)?.order??0)||a.order-b.order)} onChange={changeProject}/>}}/></>;
  if(screen==='audio')return cutPanel('audio',line,index,audioSummary(line),<StoryAudioControls value={line.audio} scope="cut" project={p.project} lineId={line.id} chapterId={line.chapterId} workId={p.project.id} editingActive={!busy} onChange={audio=>patch(line,{audio})} onProjectChange={changeProject} onPreviewFromBranch={p.onPreview}/>);
  return cutPanel('direction',line,index,directionSummary(line),<><StoryDirectionPanel project={p.project} line={line} stage={stageFor(line)} onChange={presentation=>patch(line,{presentation})} onProjectChange={changeProject} onPreviewFromBranch={p.onPreview} onMotion={()=>{const stage=stageFor(line);if(stage.leftActors.length+stage.rightActors.length){const details=document.querySelector<HTMLDetailsElement>(`[data-testid="editing-cut-${CSS.escape(line.id)}"] details[data-actor-motion]`);if(details){details.open=true;requestAnimationFrame(()=>details.querySelector<HTMLElement>('select,input')?.focus());}return;}if(!enabled.characters)p.onPreferencesChange(prefs=>({...prefs,enabled:{...prefs.enabled,characters:true}}));p.onScreenChange('characters');}}/><details data-actor-motion><summary>인물 동작 수정</summary><ActorMotionEditors stage={stageFor(line)} index={index} onChange={stageComposition=>patch(line,{stageComposition})}/></details></>);
 };
 // A2UI: the neighbour places, forks and joins are catalog parts (CutCard, Fork, PathChoice, Notice); the scene
 // preview image is the custom ScenePreview and the screen keeps its own classes through attrs.
 const neighbourAction=({action}:FocusSurfaceAction)=>{const event='event' in action?action.event:undefined,id=event?.context?.lineId;
  if(event?.name===NEIGHBOUR_EVENTS.add)p.onAddCutAfter?.();
  if(typeof id!=='string'||!id)return;
  if(event?.name===NEIGHBOUR_EVENTS.select)p.onSelectCut(id);
  if(event?.name===NEIGHBOUR_EVENTS.separate)p.onSeparatePath?.(id);};
 const neighbourDevice=phone?'phone':'tablet';
 const emptyPlace=(text:string,side:'previous'|'next',storyStart=false,key=`${side}-empty`)=><FocusSurface key={key} inline rootId="card" device={neighbourDevice} surface={cutCardSurface({side,kind:'none',text})} attrs={()=>({className:styles.adjacent,...(storyStart?{'data-story-start':'true'}:{})})}/>;
 const adjacent=(line:StoryLine|undefined,label:string,next=false,order='원고 순서')=>{
  // The empty next slot is where writing continues: offer the next cut there instead of a dead end.
  if(!line)return next&&p.onAddCutAfter?<FocusSurface key="next-add" inline rootId="card" device={neighbourDevice} surface={cutCardSurface({side:'next',kind:'add',label:'+ 다음 컷 만들기',text:'이 장의 마지막 컷이에요. 이어질 장면을 새 컷으로 써 보세요.',disabled:busy||p.composing||!!p.disabled})}
   attrs={()=>({className:`${styles.adjacent} ${styles.addNextCut}`})} skin={{excerpt:styles.excerpt}} onAction={neighbourAction}/>
   :emptyPlace(`${label}이 없어요.`,next?'next':'previous',label==='이전 컷');
  const thumbnail=p.adjacentThumbnails?.[line.id];
  return <FocusSurface key={`${next?'next':'previous'}-${line.id}`} inline rootId="card" device={neighbourDevice} onAction={neighbourAction}
   surface={cutCardSurface({side:next?'next':'previous',kind:'cut',label,order,text:line.text||'아직 글이 없어요.',lineId:line.id,disabled:busy||p.composing})}
   attrs={component=>component.id==='card'?{className:styles.adjacent}:undefined} skin={{excerpt:styles.excerpt}}
   custom={{ScenePreview:()=><span className={styles.sceneThumbnail} data-adjacent-scene={line.id} data-thumbnail-status={thumbnail?.status??'pending'}>{thumbnail?.status==='ready'?<img src={thumbnail.dataUrl} width={320} height={180} alt={`${label} 장면 미리보기 · 인물 배치와 첫 글상자`}/>:<span>{thumbnail?.status==='unavailable'?'장면을 열어 확인해 주세요.':'장면 미리보기 준비 중'}</span>}</span>}}/>;
 };
 const fork=(kind:string,title:string,choices:ForkChoice[],note?:string)=><FocusSurface key={`fork-${kind}`} inline rootId="fork" device={neighbourDevice} onAction={neighbourAction}
  surface={forkSurface({kind,title,note,choices,disabled:busy||p.composing,separateDisabled:busy||p.composing||!!p.disabled})}
  attrs={component=>component.component==='Fork'?{className:styles.pathFork,'data-path-fork':kind}:component.component==='Notice'?{className:styles.pathPending}:undefined}
  skin={{pathChoice:styles.pathChoice,pathFrom:styles.pathFrom,pathSeparate:styles.pathSeparate}}/>;
 const currentIndex=rows.findIndex(l=>l.id===p.lineId);
 // Branching works: prev/next follow the reading path (choices, jumps), not stored order.
 const branching=hasBranches(p.project);
 const paths=useMemo(()=>branching?storyPaths(p.project):null,[p.project,branching]);
 const lineById=useMemo(()=>new Map(p.project.lines.map(item=>[item.id,item])),[p.project]);
 const where=(target:StoryLine)=>{const chapter=p.project.chapters.find(item=>item.id===target.chapterId);return `${chapter?chapterLabel(chapter):''} · ${target.workingTitle||target.text.slice(0,28)||'아직 글이 없는 컷'}`;};
 const pathPrevious=(line:StoryLine)=>{
  const previous=(paths?.previous(line.id)??[]).map(id=>lineById.get(id)).filter((item):item is StoryLine=>!!item);
  if(previous.length===1)return adjacent(previous[0],previous[0]!.chapterId===line.chapterId?'이전 컷':'앞 장에서',false,'이야기 순서');
  if(!previous.length)return emptyPlace(orderedFirst(line)?'이야기의 시작이에요.':`여기로 이어지는 컷이 없어요.${p.onOpenMap?' 이야기 지도에서 확인해 보세요.':''}`,'previous',orderedFirst(line));
  return fork('previous','여러 길에서 이어지는 컷이에요',previous.slice(0,6).map(item=>({id:item.id,label:'← 이 길에서 왔어요',where:where(item),lineId:item.id,...(p.onSeparatePath?{separateName:`${where(item)} 길만 따로 쓰기`}:{})})),'고치면 이 컷을 지나는 모든 길에 반영돼요.');
 };
 const orderedFirst=(line:StoryLine)=>{const first=[...p.project.chapters].sort((a,b)=>a.order-b.order).map(chapter=>p.project.lines.filter(item=>item.chapterId===chapter.id).sort((a,b)=>a.order-b.order)[0]).find(Boolean);return first?.id===line.id;};
 const pathNext=(line:StoryLine)=>{
  const step=paths!.next(line.id);
  if(step.kind==='next'){const target=lineById.get(step.lineId);return target?adjacent(target,target.chapterId===line.chapterId?'다음 컷':'다음 장으로',true,'이야기 순서'):adjacent(undefined,'다음 컷',true);}
  if(step.kind==='choice')return fork('choice','갈림길 · 어느 길을 이어서 쓸까요?',step.options.map((option,index)=>{const target=option.lineId?lineById.get(option.lineId):undefined,mark=`${String.fromCharCode(65+index)}. ${option.label||'문구 없는 선택지'}`;return target?{id:option.id,label:`${mark} →`,where:where(target),lineId:target.id}:{id:option.id,label:mark,pending:`${mark} · 도착 컷을 정해 주세요`};}));
  if(step.kind==='routes'){const targets=[{id:'default',label:'조건이 맞지 않을 때',lineId:step.lineId},...step.routes.map((route,index)=>({id:route.id,label:`조건 ${index+1}이 맞을 때`,lineId:route.lineId}))];
   return fork('routes','조건에 따라 길이 나뉘어요',targets.map(target=>{const found=target.lineId?lineById.get(target.lineId):undefined;return found?{id:target.id,label:`${target.label} →`,where:where(found),lineId:found.id}:{id:target.id,label:target.label,pending:`${target.label} · 이야기 끝 또는 미연결`};}));}
  if(step.kind==='pending')return emptyPlace('다음 컷이 아직 정해지지 않았어요. ‘쓰기’ 화면에서 선택지를 만들거나 다음 컷을 정해 주세요.','next');
  return <>{adjacent(undefined,'다음 컷',true)}<FocusSurface key="end" inline rootId="notice" device={neighbourDevice} surface={lineNoticeSurface('이 컷에서 이야기가 끝나요.')} attrs={()=>({className:styles.pathEnd})}/></>;
 };
 const singleNext=(line:StoryLine)=>{if(!paths)return rows[currentIndex+1]?.id;const step=paths.next(line.id);return step.kind==='next'?step.lineId:undefined;};
 const singlePrevious=(line:StoryLine)=>{if(!paths)return rows[currentIndex-1]?.id;const previous=paths.previous(line.id);return previous.length===1?previous[0]:undefined;};
 // 원고 · 갈래 줄: under a choice cut, every way out of it; at the top of a way's chapter, where it came from and the other ways.
 const origin:BranchOrigin|null=screen==='text'&&paths&&rows[0]?branchOrigin(p.project,rows[0].id,paths):null;
 const branchAction=({action}:FocusSurfaceAction)=>{const event='event' in action?action.event:undefined,lineId=event?.context?.lineId,optionId=event?.context?.optionId;
  if(busy||p.composing||typeof lineId!=='string')return;
  if(event?.name===BRANCH_EVENTS.open)p.onSelectCut(lineId);
  if(event?.name===BRANCH_EVENTS.write&&typeof optionId==='string')p.onWriteBranch?.(lineId,optionId);};
 const branchSurface=(strip:BranchStrip,from?:BranchOrigin)=><FocusSurface key={`strip-${strip.choiceLineId}${from?'-origin':''}`} inline rootId="fork" device={phone?'phone':'tablet'} onAction={branchAction}
  surface={branchStripSurface({...strip,...(from?{origin:{from:from.from,optionId:from.optionId}}:{}),disabled:busy||p.composing,canWrite:!!p.onWriteBranch})}
  attrs={component=>component.component==='Fork'?{className:styles.branchStrip,'data-branch-strip':from?'origin':'choice','data-choice-line':strip.choiceLineId}:component.component==='Notice'?{className:styles.pathPending}:undefined}
  skin={{pathChoice:styles.pathChoice,pathWay:styles.branchWay,pathPeek:styles.branchPeek}}/>;
 // ‹ › in the top bar (every screen): story paths when the story branches, otherwise the manuscript order across chapters.
 const manuscript=useMemo(()=>chaptersInStoryOrder(p.project).flatMap(chapter=>p.project.lines.filter(line=>line.chapterId===chapter.id).sort((a,b)=>a.order-b.order)),[p.project]);
 const manuscriptIndex=manuscript.findIndex(line=>line.id===p.lineId);
 const stepTo={previous:current?(paths?singlePrevious(current):manuscript[manuscriptIndex-1]?.id):undefined,next:current?(paths?singleNext(current):manuscript[manuscriptIndex+1]?.id):undefined};
 const step=(id?:string)=>{if(!id)return;if(screen==='basic')navigateWhileWriting(id);else p.onSelectCut(id);};
 // The top bar draws ‹ › (A2UI CutNavigator); this screen reports whether each way is open and how to step.
 const stepRef=useRef<(direction:'previous'|'next')=>void>(()=>undefined);
 useLayoutEffect(()=>{stepRef.current=direction=>step(stepTo[direction]);});
 const previousStepClosed=busy||!stepTo.previous,nextStepClosed=busy||!stepTo.next,reportSteps=p.onCutSteps;
 useEffect(()=>{if(!reportSteps)return;reportSteps(p.playing?null:{previousDisabled:previousStepClosed,nextDisabled:nextStepClosed,step:direction=>stepRef.current(direction)});},[reportSteps,p.playing,previousStepClosed,nextStepClosed]);
 useEffect(()=>()=>reportSteps?.(null),[reportSteps]);
 const chapterList=()=> <nav aria-label="현재 장 컷 목록" data-chapter-cuts className={styles.cutList}>{rows.map((line,index)=><button type="button" key={line.id} aria-current={line.id===p.lineId?'step':undefined} disabled={busy||p.composing} onClick={()=>p.onSelectCut(line.id)}><span>{index+1}컷</span><span>{line.workingTitle||line.text||'아직 글이 없어요.'}</span></button>)}</nav>;
 const openNotes=()=>{root.current?.querySelectorAll<HTMLDetailsElement>('[data-stacked-context]>details[open]').forEach(detail=>{detail.open=false;});const notes=root.current?.querySelector<HTMLDetailsElement>('[data-additional-dock] [data-cut-notes]');if(!notes)return;let parent:HTMLElement|null=notes;while(parent&&parent!==root.current){if(parent instanceof HTMLDetailsElement)parent.open=true;parent=parent.parentElement;}notes.querySelector<HTMLInputElement>('input')?.focus({preventScroll:true});};
 const currentNotes=()=>current?<section className={styles.contextNotes} aria-label="메모·연결 요약"><strong>{current.workingTitle||'현재 컷 메모'}</strong>{([['purposeNote','목적'],['emotionNote','감정'],['directionNote','연출 메모']] as const).map(([key,label])=>current[key]?<p key={key}><small>{label}</small>{current[key]}</p>:null)}{!current.purposeNote&&!current.emotionNote&&!current.directionNote&&<p className={styles.hint}>아직 작성한 메모가 없어요.</p>}<button type="button" disabled={busy||p.composing} onClick={openNotes}>{current.purposeNote||current.emotionNote||current.directionNote?'메모 수정':'메모 추가'}</button>{current.ending?.endsStory?<p>이 컷에서 이야기 종료</p>:current.flow?.type==='choice'?<><strong>선택 후 이동</strong><ul>{current.flow.options.map(option=><li key={option.id}>{option.label||'문구 없는 선택지'} → {destinationLabel(p.project,option.targetLineId)}</li>)}</ul></>:current.flow?.type==='goto'?<p><small>재생 시 이동</small>{destinationLabel(p.project,current.flow.targetLineId)}{current.flow.routes?.length?<small>점수 조건에 따라 도착 컷이 달라질 수 있어요.</small>:null}</p>:<p className={styles.hint}>이전·다음 컷은 원고 순서예요.</p>}</section>:null;
 /* Tablet stacked layout (focus rule 1): occasional cut tools live in one '컷 더보기' instead of tall buttons and a status row. */
 const stackedTools=arrangement==='stacked';
 // 이야기 연결 replaces the map button and, while open, the neighbour places (it shows both ways itself).
 const connectionPanel=paths&&p.connections&&current&&!p.playing?<StoryConnections key="story-connections" project={p.project} graph={p.connections.graph} lineId={current.id} open={p.preferences.connections===true} disabled={busy||p.composing} device={phone?'phone':'tablet'}
  editingPath={p.connections.editingPath} canRepair={p.connections.canRepair} onToggle={open=>{if(open!==(p.preferences.connections===true))p.onPreferencesChange(prefs=>({...prefs,connections:open}));}}
  onSelect={p.onSelectCut} onReturnVisit={p.connections.onReturnVisit} onRepair={p.connections.onRepair} onOpenMap={p.onOpenMap}/>:null;
 const connectionsOpen=!!connectionPanel&&p.preferences.connections===true;
 const mapButton=!connectionPanel&&p.onOpenMap?<button type="button" className={styles.mapButton} disabled={busy||p.composing} onClick={p.onOpenMap} aria-label="이야기 지도 열기">이야기 지도</button>:null;
 const branchButton=current?(p.onAddCutAfter&&permissions.choices&&p.onSplitHere&&current.flow?.type!=='choice'?<button type="button" className={styles.insertCut} disabled={busy||p.composing||p.disabled} onClick={p.onSplitHere} aria-label="이야기 나누기"><span className={styles.longLabel}>이야기 나누기</span><span className={styles.shortLabel} aria-hidden="true">나누기</span></button>:p.onAddCutAfter&&permissions.choices&&<button type="button" className={styles.insertCut} disabled={busy||p.composing||p.disabled} onClick={()=>{/* Branching is the heart of a 놀스토리: reach the current cut's choices from where the story continues. */if(!p.preferences.logic.choices)p.onPreferencesChange(prefs=>({...prefs,logic:{...prefs.logic,choices:true}}));const open=()=>{const dock=document.querySelector<HTMLDetailsElement>('[data-choice-dock]');if(!dock)return false;dock.open=true;dock.scrollIntoView({block:'nearest'});dock.querySelector<HTMLElement>('summary')?.focus();return true;};requestAnimationFrame(()=>{if(!open())requestAnimationFrame(()=>{open();});});}} aria-label={current.flow?.type==='choice'?'선택지 고치기':'선택지 정하기'}><span className={styles.longLabel}>{current.flow?.type==='choice'?'선택지 고치기':'선택지 정하기'}</span><span className={styles.shortLabel} aria-hidden="true">선택지</span></button>):null;
 const editChapterSource=(id:string)=>{const chapter=p.project.chapters.find(item=>item.id===id);if(!chapter)return;const first=p.project.lines.filter(item=>item.chapterId===id).sort((a,b)=>a.order-b.order)[0];if(first&&current?.chapterId!==id)p.onSelectCut(first.id);const detail=(p.settingsTarget??root.current)?.querySelector<HTMLDetailsElement>('[data-chapter-settings]');if(!detail)return;let parent:HTMLElement|null=detail;while(parent){if(parent instanceof HTMLDetailsElement)parent.open=true;parent=parent.parentElement;}detail.querySelector<HTMLElement>(':scope>summary')?.focus();};
 const combinedDetails=(target:CombinedTarget,line:StoryLine,setTarget:(target:CombinedTarget)=>void,entry?:CombinedEditingEntry,selectionRevision?:number)=>{
  const index=p.project.lines.filter(item=>item.chapterId===line.chapterId).sort((a,b)=>a.order-b.order).findIndex(item=>item.id===line.id),stage=stageFor(line);
  return <fieldset disabled={busy||p.composing} className={styles.primary}>
   <p className={styles.cutText} data-cut-text><b>{index+1}컷 · {line.speakerName||'해설'}</b> {line.text.trim()||'아직 글이 없어요.'}</p>
   {rangeUndo?.projectId===p.project.id&&<button type="button" onClick={()=>{try{p.onProjectChange(undoCombinedRange(p.project,rangeUndo));setRangeUndo(null);}catch(error){reportError(error);}}}>구간 변경 취소</button>}
   {entry?.sourceLineId&&<StoryCombinedRangeTools key={`${p.project.id}/${entry.key}/${entry.endCutIndex}`} project={p.project} entry={entry} disabled={busy||p.composing} onChange={changeProject} onSelectCut={p.onSelectCut} onUndoReady={setRangeUndo}/>}
   {target==='music'||target==='ambience'||target==='sounds'?<StoryAudioControls key={`${p.project.id}/combined-audio/${line.id}`} initialSelectedClipId={target==='music'||target==='ambience'?entry?.cueId:undefined} clipSelectionRevision={selectionRevision} soundSelectionRevision={selectionRevision} initialSelectedSoundId={target==='sounds'?entry?.cueId:undefined} selectedPart={target} onPartChange={setTarget} value={line.audio} scope="cut" project={p.project} lineId={line.id} chapterId={line.chapterId} workId={p.project.id} editingActive={!busy} onChange={audio=>patch(line,{audio})} onProjectChange={changeProject} onPreviewFromBranch={p.onPreview}/>:target==='motion'?<ActorMotionEditors stage={stage} index={index} onChange={stageComposition=>patch(line,{stageComposition})}/>:<StoryDirectionPanel key={`${p.project.id}/combined-direction/${line.id}/${entry?.cueIndex??0}`} initialSelectedEffect={entry?.cueIndex} selectedKind={target} onKindChange={setTarget} project={p.project} line={line} stage={stage} onChange={presentation=>patch(line,{presentation})} onProjectChange={changeProject} onPreviewFromBranch={p.onPreview} onMotion={()=>setTarget('motion')}/>}
  </fieldset>;
 };
 // The stage stays in view where it is the work itself: writing (쓰기), placing characters (인물 — drag them on the stage) and the combined timeline.
 const stageVisible=screen==='basic'||screen==='characters'||screen==='audio-direction';
 const stripAvailable=phone&&!shortLandscape&&screen==='basic'&&!p.playing;
 const layoutControl=<label className={styles.screenSelection} data-arrangement-control>컷 배치<select aria-label="컷 배치" value={p.preferences.arrangement??'auto'} disabled={p.composing||busy} onChange={event=>p.onPreferencesChange(current=>({...current,arrangement:event.target.value as CutArrangement}))}><option value="auto">자동 · 화면에 맞춤</option><option value="columns">가로 · 나란히</option><option value="stacked">세로 · 위아래</option></select></label>;
 return <section ref={root} onBlurCapture={event=>remember(event.target)} className={`${styles.workbench} ${p.playing?styles.playing:''}`} data-screen={screen} data-phone-editor={phone} data-phone-single={phoneSingle} aria-label="여러 컷 편집">
  {p.settingsTarget?createPortal(<>{p.chapterSettings}<label className={styles.screenSelection}>편집화면<select aria-label="편집화면 선택" value={screen} disabled={busy||p.composing} onPointerDown={()=>remember()} onChange={event=>{remember();if(p.onScreenChange(event.target.value as EditingScreen)===false){event.currentTarget.value=screen;return;}const menu=event.currentTarget.closest<HTMLDetailsElement>('[data-work-menu]');if(menu){menu.open=false;menu.querySelector<HTMLElement>(':scope>summary')?.focus();}}}>{screens.filter(([id])=>allowedEditingScreen(id,permissions)&&(id==='audio-direction'?enabled.audio&&enabled.direction:!optional(id)||enabled[id])).map(([id,label])=><option key={id} value={id} disabled={phone&&id==='audio-direction'||landscapeReview&&id!=='basic'}>{label}{phone&&id==='audio-direction'?' · 큰 화면에서 사용':landscapeReview&&id!=='basic'?' · 세로에서 편집':''}</option>)}</select></label><details><summary>편집 설정</summary><p>쓰기·원고·배경 편집은 늘 쓸 수 있어요. 필요한 기능만 켜서 쓰세요. 꺼도 작품 내용은 그대로예요.</p><p>움직임과 소리는 ‘재생’으로 확인해요. 다 쓰면 설정의 파일·저장에서 작품 파일로 저장하세요.</p>{(['characters','audio','direction'] as const).map(id=><label key={id} className={styles.check}><input type="checkbox" checked={enabled[id]} disabled={busy||p.composing||!allowedEditingScreen(id,permissions)} onChange={event=>{if(!event.target.checked&&(screen===id||screen==='audio-direction'&&(id==='audio'||id==='direction'))&&p.onScreenChange('basic')===false){event.currentTarget.checked=enabled[id];return;}p.onPreferencesChange(prev=>({...prev,enabled:{...prev.enabled,[id]:event.target.checked}}));}}/>{names[id]} 편집 사용</label>)}{p.additionalSettings}<small>편집화면과 설정은 이 탭에서 작품마다 기억돼요. 새로고침하거나 서재에 다녀와도 그대로이고, 작품 파일에는 들어가지 않아요.</small></details></>,p.settingsTarget):<div hidden={p.playing} inert={p.playing}><>{p.chapterSettings}<label className={styles.screenSelection}>편집화면<select aria-label="편집화면 선택" value={screen} disabled={busy||p.composing} onPointerDown={()=>remember()} onChange={event=>{remember();if(p.onScreenChange(event.target.value as EditingScreen)===false){event.currentTarget.value=screen;return;}const menu=event.currentTarget.closest<HTMLDetailsElement>('[data-work-menu]');if(menu){menu.open=false;menu.querySelector<HTMLElement>(':scope>summary')?.focus();}}}>{screens.filter(([id])=>allowedEditingScreen(id,permissions)&&(id==='audio-direction'?enabled.audio&&enabled.direction:!optional(id)||enabled[id])).map(([id,label])=><option key={id} value={id} disabled={phone&&id==='audio-direction'||landscapeReview&&id!=='basic'}>{label}{phone&&id==='audio-direction'?' · 큰 화면에서 사용':landscapeReview&&id!=='basic'?' · 세로에서 편집':''}</option>)}</select></label><details><summary>편집 설정</summary><p>쓰기·원고·배경 편집은 늘 쓸 수 있어요. 필요한 기능만 켜서 쓰세요. 꺼도 작품 내용은 그대로예요.</p><p>움직임과 소리는 ‘재생’으로 확인해요. 다 쓰면 설정의 파일·저장에서 작품 파일로 저장하세요.</p>{(['characters','audio','direction'] as const).map(id=><label key={id} className={styles.check}><input type="checkbox" checked={enabled[id]} disabled={busy||p.composing||!allowedEditingScreen(id,permissions)} onChange={event=>{if(!event.target.checked&&(screen===id||screen==='audio-direction'&&(id==='audio'||id==='direction'))&&p.onScreenChange('basic')===false){event.currentTarget.checked=enabled[id];return;}p.onPreferencesChange(prev=>({...prev,enabled:{...prev.enabled,[id]:event.target.checked}}));}}/>{names[id]} 편집 사용</label>)}{p.additionalSettings}<small>편집화면과 설정은 이 탭에서 작품마다 기억돼요. 새로고침하거나 서재에 다녀와도 그대로이고, 작품 파일에는 들어가지 않아요.</small></details></></div>}
  {!p.playing&&error?.context===editContext&&<p role="alert">{error.message}</p>}
  {/* Focus plan step 3: only notes that matter now stay above the work (a task's hand-in, the branch order); the general tip lives in 편집 설정. */}
  {p.finishHint&&<p hidden={p.playing} className={styles.hint}>{p.finishHint}</p>}
  {p.settingsTarget?createPortal(layoutControl,p.settingsTarget):!p.playing&&layoutControl}
  {!p.playing&&phone&&p.screen==='audio-direction'&&<p className={styles.hint}>통합 시간축은 태블릿·PC에서 사용할 수 있어요. 휴대폰에서는 음향과 연출을 각각 편집해 주세요.</p>}
  <div className={styles.body} data-editing-body style={{'--timeline-space':`${timelineSpace/50}fr`,'--preview-space':`${(100-timelineSpace)/50}fr`} as CSSProperties} data-basic={screen==='basic'} data-combined={screen==='audio-direction'} data-playing={!!p.playing} data-cut-arrangement={arrangement}>
  <div className={styles.previewSlot} data-runtime-parked={!p.playing&&!stageVisible?true:undefined} data-stage-strip={stripAvailable?(stageOpen?'open':'strip'):undefined} aria-hidden={!p.playing&&!stageVisible?true:undefined} inert={!p.playing&&!stageVisible}>{p.preview}{stripAvailable&&<button type="button" className={styles.stageStripToggle} aria-expanded={stageOpen} aria-label={stageOpen?'무대 접기':'무대 펼치기'} title={stageOpen?'무대 접기':'무대 펼치기'} onClick={toggleStage}><span aria-hidden="true">{stageOpen?'▴':'▾'}</span></button>}</div>
  <div className={styles.editingContent} hidden={p.playing} inert={p.playing}>
  {screen==='audio-direction'?<>
   <label className={styles.combinedChapter}>편집할 장<select aria-label="편집할 장" value={chapterId??''} disabled={busy||p.composing} onChange={event=>{setChapterFilter({projectId:p.project.id,chapterId:event.target.value,lineId:p.lineId});const first=p.project.lines.filter(item=>item.chapterId===event.target.value).sort((a,b)=>a.order-b.order)[0];if(first)p.onSelectCut(first.id);}}>{chaptersInStoryOrder(p.project).map(chapter=><option key={chapter.id} value={chapter.id}>{chapterLabel(chapter)}</option>)}</select></label>
   <StoryCombinedTimeline editingActive={p.editingActive!==false&&!p.playing} space={timelineSpace} onSpaceChange={setTimelineSpace} key={p.project.id} project={p.project} chapterId={chapterId??''} lineId={p.lineId} disabled={busy} composing={p.composing} onSelectCut={p.onSelectCut} onPreview={p.onPreview} onEditChapter={editChapterSource} onProjectChange={changeProject} onSplitChapterRange={(entry,split)=>{if(!entry.sourceChapterId||(entry.target!=='music'&&entry.target!=='ambience'))return false;try{const result=splitChapterAudioRange(p.project,entry.sourceChapterId,entry.target,split);p.onProjectChange(result.project);setRangeUndo(result.undo);p.onSelectCut(split);return true;}catch(error){reportError(error);return false;}}} onEditRange={(entry,start,end)=>{if(!entry.sourceLineId)return;try{const result=editCombinedRange(p.project,{sourceLineId:entry.sourceLineId,target:entry.target,cueIndex:entry.cueIndex},start,end);p.onProjectChange(result.project);setRangeUndo(result.undo);p.onSelectCut(start);}catch(error){reportError(error);}}} renderDetails={combinedDetails}/>
  </>:screen==='basic'&&current?<div className={styles.basic}>
   <aside className={styles.previousSide} aria-label="이전 컷과 장 탐색">{connectionsOpen?null:paths?pathPrevious(current):adjacent(rows[currentIndex-1],'이전 컷')}{arrangement==='columns'&&connectionPanel}{!stackedTools&&mapButton}<section className={styles.sideSupplement}>{p.chapterReference}<strong>이 장의 컷</strong>{chapterList()}</section></aside><fieldset disabled={p.basicTextDisabled} className={styles.current} data-current-cut><legend>현재 컷 · {currentIndex+1}컷</legend>{basicSpeaker(current)}{textEditor(current,currentIndex,true)}{permissions.images&&backgroundEditor(current,currentIndex)}<div className={styles.currentPreview}><strong>현재 인물 · 자료 미리보기</strong>{companion('characters',current)}{allowedEditingScreen('characters',permissions)&&!stageFor(current).leftActors.length&&!stageFor(current).rightActors.length&&<p className={styles.emptyHint}>이 컷에는 아직 인물이 없어요.<button type="button" disabled={busy||p.composing||p.disabled} onClick={()=>{/* Explicit opt-in from the place the author is looking; the setting stays reversible in 편집 설정. */if(!enabled.characters)p.onPreferencesChange(prefs=>({...prefs,enabled:{...prefs.enabled,characters:true}}));p.onScreenChange('characters');}}>{enabled.characters?'인물 배치하기':'인물 편집 켜고 배치하기'}</button></p>}</div></fieldset><aside className={styles.nextSide} aria-label="다음 컷과 참고 정보" data-connections-open={connectionsOpen||undefined}>{<>{connectionsOpen?null:paths?pathNext(current):adjacent(rows[currentIndex+1],'다음 컷',true)}{arrangement!=='columns'&&connectionPanel}{p.onAddCutAfter&&rows[currentIndex+1]&&<button type="button" className={styles.insertCut} disabled={busy||p.composing||p.disabled} onClick={p.onAddCutAfter} aria-label="+ 이 컷 뒤에 새 컷 넣기"><span className={styles.longLabel}>+ 이 컷 뒤에 새 컷 넣기</span><span className={styles.shortLabel} aria-hidden="true">새 컷</span></button>}{!stackedTools&&branchButton}</>}<div className={styles.sideSupplement}>{currentNotes()}{arrangement!=='stacked'&&p.relatedMemos}</div></aside>
  </div>:<>
   {/* A2UI: the toolbar is drawn from the focus editor catalog (components/a2ui/list-tools-surface.ts). */}
   <div className={styles.options} hidden={phoneSingle}>{(()=>{
    const surface=listToolsSurface({task:screen,busy:busy||p.composing,findDisabled:!rows.some(line=>line.id===p.lineId),companions:(Object.keys(names) as Companion[]).filter(id=>id!==screen&&id!=='text').map(id=>({id,label:names[id],checked:selected.includes(id)}))});
    const onAction=({action}:FocusSurfaceAction)=>{
     const event='event' in action?action.event:undefined;
     if(event?.name===LIST_TOOLS_EVENTS.reveal)findCurrentRow();
     if(event?.name===LIST_TOOLS_EVENTS.companion){const id=event.context?.task as Companion,on=event.context?.value===true;p.onPreferencesChange(prev=>({...prev,companions:{...prev.companions,[screen]:on?[...selected,id]:selected.filter(x=>x!==id)}}));}
    };
    const writing=screen==='text'?rows.find(line=>line.id===p.lineId)??rows[0]:undefined;
    return <><FocusSurface inline surface={surface} rootId="list-tools" device={phone?'phone':'tablet'} onAction={onAction}/>{writing&&cutSpeaker(writing,rows.indexOf(writing))}<FocusSurface inline surface={surface} rootId="companions" device={phone?'phone':'tablet'} onAction={onAction}/></>;
   })()}</div>
   {/* A2UI: each cut card (frame, head, text) is drawn from the focus editor catalog; this screen's tools are the custom CutTools. */}
   {/* 원고 (2026-11-28 사용자 결정): the chapter's picture-book page sits folded right above the document. */}
   {screen==='text'&&p.chapterReference&&<details data-picturebook-reference className={styles.manuscriptReference}><summary>그림책 구상</summary>{p.chapterReference}</details>}
   <div className={styles.rows} data-writer-scroll data-manuscript={screen==='text'||undefined} onKeyDown={manuscriptKeys} onFocus={manuscriptFocus}>{origin&&branchSurface(origin.strip,origin)}{rows.map((line,index)=>phoneSingle&&line.id!==(rows[currentIndex]?.id??rows[0]?.id)?null:<Fragment key={`${p.project.id}/${line.id}`}><FocusSurface inline rootId="cut" device={phone?'phone':'tablet'}
    surface={cutItemSurface({lineId:line.id,cut:index+1,speaker:screen==='text'?(line.type==='narration'?'해설':line.speakerName.trim()||'대사'):line.speakerName??'',text:line.text.trim()||'아직 글이 없어요.',current:line.id===p.lineId,disabled:busy||p.composing,showText:screen!=='text',phoneShowsAll:!phoneSingle,task:screen})}
    skin={{cutItem:styles.row,cutSelect:styles.rowSelect,cutPlay:styles.rowPlay,cutText:styles.cutText}} attrs={component=>component.component==='CutItem'?{'data-testid':`editing-cut-${line.id}`}:undefined}
    custom={{CutTools:()=><><fieldset disabled={busy||(p.composing&&screen!=='text')} className={styles.primary}>{primary(line,index)}</fieldset>{!phone&&selected.some(id=>id!=='text')&&<FocusSurface inline rootId="companions" device="tablet" surface={companionsSurface(line.id,selected.filter(id=>id!=='text').map(id=>({...companionView(id,line),title:names[id]})))} attrs={companionAttrs(id=>String(id).replace(/^(section|part)-/,'').split('-')[0]!)} custom={companionCustom}/>}</>}}
    onAction={({action})=>{const event='event' in action?action.event:undefined,lineId=event?.context?.lineId;if(typeof lineId!=='string')return;if(event?.name===CUT_EVENTS.select)p.onSelectCut(lineId);if(event?.name===CUT_EVENTS.play)p.onPreview(lineId);}}/>{screen==='text'&&paths&&(()=>{const strip=branchStrip(p.project,line.id,paths);return strip&&branchSurface(strip);})()}</Fragment>)}</div>
  </>}
  </div>
  </div>
  {!p.playing&&screen==='basic'&&<div className={styles.stackedContext} data-arrangement={arrangement} data-stacked-context>{(()=>{const panels=<><details onToggle={event=>{if(event.currentTarget.open)revealCurrentCut(root.current);}}><summary>이 장의 컷 목록</summary>{chapterList()}</details><details><summary>메모·연결 요약</summary>{currentNotes()}{arrangement==='stacked'&&p.relatedMemos}</details>{p.chapterReference&&<details data-picturebook-reference><summary>그림책 구상</summary>{p.chapterReference}</details>}</>;// One disclosure never sits inside another (A2UI rule): 컷 더보기 holds the story tools; the cut list and notes are its siblings.
    return stackedTools?<>{(branchButton||mapButton)&&<details data-cut-more className={styles.cutMore}><summary>컷 더보기</summary><div className={styles.cutMoreTools}>{branchButton}{mapButton}</div></details>}{panels}</>:panels;})()}</div>}
  <div data-additional-dock className={styles.additional} hidden={p.playing} inert={p.playing} onKeyDown={event=>{if(event.key!=='Escape'||event.defaultPrevented||event.nativeEvent.isComposing||document.querySelector('dialog[open]'))return;const opened=event.currentTarget.querySelector<HTMLDetailsElement>(':scope>details[open]');if(opened){opened.open=false;opened.querySelector<HTMLElement>(':scope>summary')?.focus();event.preventDefault();event.stopPropagation();}}}>{/* Phones hide the stacked context row (and its ‘컷 더보기’), so branching, the story map and the chapter's picture-book page sit with the cut details. */}{phone&&!p.playing&&screen==='basic'&&(branchButton||mapButton)&&<details data-phone-cut-tools className={styles.phoneReference}><summary>{branchButton?'이야기 갈래':'이야기 지도'}</summary><div className={styles.cutMoreTools}>{branchButton}{mapButton}</div></details>}{p.chapterReference&&!p.playing&&screen!=='text'&&<details data-picturebook-reference className={styles.phoneReference}><summary>그림책 구상</summary>{p.chapterReference}</details>}{p.additionalEditor}</div>
 </section>;
}
function BackgroundDisplayControls({line,index,onChange}:{line:StoryLine;index:number;onChange:(presentation:StoryLine['presentation'])=>void}){
 // A2UI: a catalog More with Choice, two Sliders and a Button (editor-surfaces.ts → backgroundDisplaySurface).
 const presentation=line.presentation;
 const focal=presentation?.backgroundFocal??{x:0.5,y:0.5};
 const surface=backgroundDisplaySurface({cut:index+1,fit:presentation?.backgroundFit??'',x:focal.x*100,y:focal.y*100,focalSet:!!presentation?.backgroundFocal});
 return <FocusSurface inline surface={surface} rootId="display" device="tablet" attrs={component=>component.id==='display'?{className:styles.backgroundDisplay}:component.component==='Button'||component.component==='Choice'||component.component==='Slider'?{className:''}:undefined} skin={{srOnly:styles.srOnly}}
  onAction={({action})=>{const event='event' in action?action.event:undefined,value=event?.context?.value;
   if(event?.name===BACKGROUND_DISPLAY_EVENTS.fit)onChange({...presentation,backgroundFit:value?value as 'cover'|'contain':undefined});
   if(event?.name===BACKGROUND_DISPLAY_EVENTS.x&&typeof value==='number')onChange({...presentation,backgroundFocal:{...focal,x:value/100}});
   if(event?.name===BACKGROUND_DISPLAY_EVENTS.y&&typeof value==='number')onChange({...presentation,backgroundFocal:{...focal,y:value/100}});
   if(event?.name===BACKGROUND_DISPLAY_EVENTS.reset)onChange({...presentation,backgroundFocal:undefined});}}/>;
}
function heavilyOverlappedActors(preview:ReturnType<typeof compileStoryScene>,stage:StageComposition){
 const assetsByActor = new Map([...stage.leftActors,...stage.rightActors].map(actor=>[actor.key,actor.assetId]));
 // Ren'Py draws from low to high depth and preserves actor order at equal depth.
 const bounds = [...preview.actors].sort((a,b)=>(a.depth??0)-(b.depth??0)).flatMap(actor=>{
  const assetId=assetsByActor.get(actor.id);
  const geometry=assetId?resolveAsset(assetId)?.geometry:undefined;
  if(!geometry)return [];
  const {x,y,width,height}=actor.rect;
  return [{
   id:actor.id,
   left:x+width*(actor.flipX?1-geometry.right:geometry.left),
   right:x+width*(actor.flipX?1-geometry.left:geometry.right),
   top:y+height*geometry.top,
   bottom:y+height*geometry.bottom,
   opacity:actor.opacity??1,
  }];
 });
 return new Set(bounds.filter((back,index)=>{
  if(back.opacity===0)return false;
  const area=(back.right-back.left)*(back.bottom-back.top);
  return area>0&&bounds.slice(index+1).some(front=>{
   const width=Math.min(back.right,front.right)-Math.max(back.left,front.left);
   const height=Math.min(back.bottom,front.bottom)-Math.max(back.top,front.top);
   return width>0&&height>0&&width*height*front.opacity>=area*.65;
  });
 }).map(actor=>actor.id));
}

function CharacterEditors({project,line,stage,index,onChange,onReset,chapterAssetIds}:{project:StoryProject;line:StoryLine;stage:StageComposition;index:number;onReset:(key:string)=>void;onChange:(stage:StageComposition)=>void;chapterAssetIds?:readonly string[]}){
 const actors=[...stage.leftActors,...stage.rightActors];
 const preview=useMemo(()=>compileStoryScene(project,line.id,0,{mode:'edit',viewport:{width:1280,height:720}}),[project,line.id]);
 const overlapped=heavilyOverlappedActors(preview,stage);
 const speakerKey=activeStageSpeaker(stage,line);
 const update=(key:string,value:Partial<StageActorEntry>)=>onChange({...stage,leftActors:stage.leftActors.map(a=>a.key===key?{...a,...value}:a),rightActors:stage.rightActors.map(a=>a.key===key?{...a,...value}:a)});
 const move=(actor:StageActorEntry,position:'left'|'center'|'right')=>{
  const origin=stage.leftActors.some(a=>a.key===actor.key)?'leftActors':'rightActors';
  const target=position==='center'?origin:position==='left'?'leftActors':'rightActors';
  if(target!==origin&&stage[target].length>=2)return;
  const nextActor={...actor,position:position==='center'?'center' as const:undefined,positionOrder:position==='center'?actor.positionOrder??1:undefined,xAnchor:undefined};
  if(target===origin){update(actor.key,nextActor);return;}
  onChange({...stage,speakerActorKey:speakerKey??stage.speakerActorKey,leftActors:stage.leftActors.filter(a=>a.key!==actor.key).concat(target==='leftActors'?[nextActor]:[]),rightActors:stage.rightActors.filter(a=>a.key!==actor.key).concat(target==='rightActors'?[nextActor]:[])});
 };
 const remove=(key:string)=>onChange({...stage,leftActors:stage.leftActors.filter(a=>a.key!==key),rightActors:stage.rightActors.filter(a=>a.key!==key),speakerActorKey:stage.speakerActorKey===key?undefined:stage.speakerActorKey,speakerActorKeys:stage.speakerActorKeys?.filter(id=>id!==key)});
 const add=(assetId:string)=>{const side=stage.leftActors.length<=stage.rightActors.length?'leftActors':'rightActors';if(stage[side].length>=2)return;onChange({...stage,[side]:[...stage[side],{key:`actor-${crypto.randomUUID()}`,assetId}]});};
 // A2UI: each actor is a catalog card (editor-surfaces.ts → actorCardSurface); its image field is the shared AssetPickerField.
 return <div className={styles.characters}>{actors.map((actor,i)=>{
  const rendered=preview.actors.find(item=>item.id===actor.key);
  const x=actor.xAnchor??(rendered?(rendered.rect.x+rendered.rect.width/2)/preview.width*100:50);
  const scale=Math.round((actor.scaleMultiplier??1)*100);
  const inLeft=stage.leftActors.some(a=>a.key===actor.key),inRight=stage.rightActors.some(a=>a.key===actor.key);
  const side=actor.position==='center'?'center':inLeft?'left':'right';
  const surface=actorCardSurface({cut:index+1,actor:{key:actor.key,number:i+1,side,heading:`${side==='center'?'중앙':side==='left'?'왼쪽':'오른쪽'} 인물 ${i+1}`,x,xText:actor.xAnchor===undefined?'자동':`${Math.round(x)}%`,scale,facing:actor.facing??'auto',leftFull:stage.leftActors.length>=2,rightFull:stage.rightActors.length>=2,overlapped:overlapped.has(actor.key),inLeft,inRight}});
  return <FocusSurface key={actor.key} inline surface={surface} rootId="card" device="tablet"
   attrs={component=>component.component==='Notice'?{className:styles.actorOverlap}:component.component==='ToolGroup'?{className:styles.actorActions}:component.component==='Slider'||component.component==='Choice'||component.component==='Button'||component.component==='Column'?{className:''}:undefined}
   skin={{srOnly:styles.srOnly}}
   custom={{AssetPicker:()=><AssetPickerField label={`${index+1}컷 인물 ${i+1}`} labelHidden type="character" value={actor.assetId} chapterAssetIds={chapterAssetIds} onChange={assetId=>update(actor.key,{assetId})}/>}}
   onAction={({action})=>{const event='event' in action?action.event:undefined,value=event?.context?.value;
    if(event?.name===ACTOR_EVENTS.x&&typeof value==='number')update(actor.key,{xAnchor:value});
    if(event?.name===ACTOR_EVENTS.side&&typeof value==='string')move(actor,value as 'left'|'center'|'right');
    if(event?.name===ACTOR_EVENTS.facing&&typeof value==='string')update(actor.key,{facing:value==='auto'?undefined:value as StageActorEntry['facing']});
    if(event?.name===ACTOR_EVENTS.scale&&typeof value==='number')update(actor.key,{scaleMultiplier:value/100});
    if(event?.name===ACTOR_EVENTS.reset)onReset(actor.key);
    if(event?.name===ACTOR_EVENTS.remove)remove(actor.key);}}/>;
 })}{actors.length<4&&<div className={styles.characterAdd}><AssetPickerField label={`${index+1}컷 인물 추가`} type="character" value="" chapterAssetIds={chapterAssetIds} onChange={add}/></div>}</div>;
}

function ActorMotionEditors({stage,index,onChange}:{stage:StageComposition;index:number;onChange:(stage:StageComposition)=>void}){
 const update=(key:string,motion:StageActorEntry['motion'])=>onChange({...stage,leftActors:stage.leftActors.map(a=>a.key===key?{...a,motion}:a),rightActors:stage.rightActors.map(a=>a.key===key?{...a,motion}:a)});
 return <>{[...stage.leftActors,...stage.rightActors].map((actor,i)=><fieldset key={actor.key}><legend>인물 {i+1} 동작</legend><label>동작<select aria-label={`${index+1}컷 인물 ${i+1} 동작`} value={actor.motion?.type??''} onChange={event=>update(actor.key,actorMotionChoice(actor.motion,event.target.value as NonNullable<StageActorEntry['motion']>['type']|''))}>{ACTOR_MOTION_OPTIONS.map(({value,label})=><option key={value} value={value}>{label}</option>)}</select></label>{actor.motion&&<><SecondsInput label={`${index+1}컷 인물 ${i+1} 동작 시간`} valueMs={actor.motion.durationMs??600} onChange={durationMs=>update(actor.key,{...actor.motion!,durationMs})}/><SecondsInput label={`${index+1}컷 인물 ${i+1} 동작 대기`} valueMs={actor.motion.delayMs??0} onChange={delayMs=>update(actor.key,{...actor.motion!,delayMs})}/>{actor.motion.type==='move'&&<label>출발 가로 위치<input type="range" min="5" max="95" aria-label={`${index+1}컷 인물 ${i+1} 출발 위치`} value={actor.motion.fromXAnchor??50} onChange={event=>update(actor.key,{...actor.motion!,fromXAnchor:Number(event.target.value)})}/></label>}</>}</fieldset>)}</>;
}
