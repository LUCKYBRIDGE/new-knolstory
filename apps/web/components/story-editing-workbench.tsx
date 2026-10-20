'use client';
/* eslint-disable @next/next/no-img-element -- Material thumbnails only; official story preview is supplied by Ren'Py. */
import {createPortal} from 'react-dom';
import {useEffect,useLayoutEffect,useRef,useState, type ReactNode} from 'react';
import {assetDisplayName,resolveAsset,resolveAudioAsset} from '@knolstory/asset-registry';
import {activeStageSpeaker,chapterLabel,resolveStageComposition,presentationLabel,type StoryProject,type StoryLine,type StageComposition,type StageActorEntry,type StoryMusicCue} from '@knolstory/story-domain';
import {patchStoryLine} from '@knolstory/runtime-core';
import {StoryStagingImport} from './story-staging-import';
import {AssetPickerField} from './asset-picker-field';
import {StoryAudioControls} from './story-audio-controls';
import {SecondsInput} from './seconds-input';
import {StoryDirectionPanel} from './story-direction-panel';
import styles from './story-editing-workbench.module.css';
import type {EditingScreen,Companion,EditorPreferences} from '../lib/editor-preferences';
import {resolveCutArrangement,type CutArrangement} from '../lib/cut-arrangement';
import type {AdjacentSceneThumbnail} from './use-adjacent-scene-thumbnails';
export type {EditingScreen} from '../lib/editor-preferences';
type Props={adjacentThumbnails?:Readonly<Record<string,AdjacentSceneThumbnail>>;preferences:EditorPreferences;onPreferencesChange:(update:(current:EditorPreferences)=>EditorPreferences)=>void;settingsTarget?:HTMLElement|null;preview?:ReactNode;playing?:boolean;additionalSettings?:ReactNode;chapterSettings?:ReactNode;additionalEditor?:ReactNode;project:StoryProject;lineId:string;screen:EditingScreen;onScreenChange:(screen:EditingScreen)=>void;onProjectChange:(project:StoryProject)=>void;onSelectCut:(id:string)=>void;onComposing:(value:boolean)=>void;basicTextDisabled:boolean;onBasicTextChange:(text:string)=>void;disabled:boolean;composing:boolean;onPreview:(id:string)=>void};
const screens:readonly [EditingScreen,string][]=[['basic','기본편집'],['text','글 편집'],['background','배경 편집'],['characters','인물 편집'],['audio','음향 편집'],['direction','연출 편집']];
const names:Record<Companion,string>={text:'글',background:'배경',characters:'인물',audio:'음향',direction:'연출'};
const optional=(screen:EditingScreen):screen is 'characters'|'audio'|'direction'=>screen==='characters'||screen==='audio'||screen==='direction';
function backgroundId(project:StoryProject,line:StoryLine){return line.backgroundMode==='none'?'':line.backgroundId||project.chapters.find(c=>c.id===line.chapterId)?.backgroundId||project.stageDefaults?.backgroundId||'';}
function Material({id}:{id:string}){const asset=resolveAsset(id);return <span className={styles.material}>{asset?<><img src={asset.src} alt="" loading="lazy"/><span>{assetDisplayName(asset)}</span></>:<span>{id?'자료 확인 필요':'이미지 없음'}</span>}</span>;}
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
function audioSummary(project:StoryProject,line:StoryLine){
 const a=line.audio;
 const cue=(name:string,value:StoryMusicCue|undefined)=>!value?`${name} 이전 설정 사용`:value.action==='play'?`${name} ${resolveAudioAsset(value.assetId)?.name??'소리 이름 확인 필요'} · 재생 시작 설정${value.branchCondition?' · 선택 이력 조건 있음':''}${value.endLineId?` · 종료 컷 ${cutReference(project,value.endLineId)}`:''}`:`${name} ${value.action==='stop'?'정지':'현재 소리 계속 재생'}`;
 return ['이 컷의 음향 설정',cue('배경음',a?.music),cue('주변 소리',a?.ambience),a?.sounds?.length?`효과음 ${a.sounds.map(sound=>resolveAudioAsset(sound.assetId)?.name??'효과음 이름 확인 필요').join(', ')}`:'이 컷에 지정한 효과음 없음'].join(' / ');
}
function directionSummary(project:StoryProject,line:StoryLine){const ranges=line.presentation?.effects?.filter(effect=>effect.scope==='following').map(effect=>effect.endLineId?`이 컷부터 ${cutReference(project,effect.endLineId)}까지`:'이 컷부터 다음 컷으로 이어짐');return [presentationLabel(line.presentation),...ranges??[]].join(' / ');}
export function StoryEditingWorkbench(p:Props){
 const [chapterFilter,setChapterFilter]=useState<{projectId:string;chapterId:string}|null>(null);
 const [error,setError]=useState('');
 const [expanded,setExpanded]=useState<Record<string,boolean>>({});
 const enabled=p.preferences.enabled;
 const screen=optional(p.screen)&&!enabled[p.screen]?'basic':p.screen;
 const root=useRef<HTMLElement>(null);
 const [bodySize,setBodySize]=useState<{width:number;height:number}>();
 // Observe the stable workspace, not the grid whose supplemental tools change height.
 useEffect(()=>{const node=root.current;if(!node||p.composing)return;const observer=new ResizeObserver(entries=>{if(node.closest('[data-keyboard-occluded=true]'))return;const rect=entries[0]?.contentRect;if(rect&&rect.width>0&&rect.height>0)setBodySize(previous=>previous?.width===rect.width&&previous?.height===rect.height?previous:{width:rect.width,height:rect.height});});observer.observe(node);return()=>observer.disconnect();},[p.composing]);
 const arrangement=resolveCutArrangement(p.preferences.arrangement??'auto',bodySize);
 useEffect(()=>{if(screen==='basic'&&!p.playing)revealCurrentCut(root.current);},[screen,p.project.id,p.lineId,p.playing,arrangement]);
 useEffect(()=>{
  const panels=()=>root.current?.querySelectorAll<HTMLDetailsElement>('[data-additional-dock]>details[open],[data-stacked-context]>details[open]');
  const dismiss=(event:PointerEvent)=>{if(document.querySelector('dialog[open]')||!(event.target instanceof Node))return;panels()?.forEach(detail=>{if(!detail.contains(event.target as Node))detail.open=false;});};
  const escape=(event:KeyboardEvent)=>{
   if(event.key!=='Escape'||event.defaultPrevented||event.isComposing||document.querySelector('dialog[open]'))return;
   const opened=[...panels()??[]].at(-1);if(!opened)return;
   opened.open=false;opened.querySelector<HTMLElement>(':scope>summary')?.focus();event.preventDefault();event.stopPropagation();
  };
  document.addEventListener('pointerdown',dismiss);document.addEventListener('keydown',escape);
  return()=>{document.removeEventListener('pointerdown',dismiss);document.removeEventListener('keydown',escape);};
 },[]);
 const snapshots=useRef<Record<string,{cutId?:string;start:number;end:number;scroll:number;windowScroll:number}>>({});
 const snapshotKey=`${p.project.id}/${screen}`;
 const remember=(field:EventTarget|null=document.activeElement)=>{
  const area=root.current?.querySelector<HTMLElement>('[data-writer-scroll]');
  const previous=snapshots.current[snapshotKey];
  const textarea=field instanceof HTMLTextAreaElement&&root.current?.contains(field)?field:undefined;
  snapshots.current[snapshotKey]={cutId:textarea?.dataset.cutId??previous?.cutId,start:textarea?.selectionStart??previous?.start??0,end:textarea?.selectionEnd??previous?.end??0,scroll:area?.scrollTop??0,windowScroll:window.scrollY};
 };
 useLayoutEffect(()=>{
  const snapshot=snapshots.current[`${p.project.id}/${screen}`];
  if(!snapshot)return;
  const textarea=Array.from(root.current?.querySelectorAll<HTMLTextAreaElement>('textarea[data-cut-id]')??[]).find(field=>field.dataset.cutId===snapshot.cutId);
  if(textarea&&!textarea.disabled){textarea.focus({preventScroll:true});textarea.setSelectionRange(snapshot.start,snapshot.end);}
  const area=root.current?.querySelector<HTMLElement>('[data-writer-scroll]');
  if(area)area.scrollTop=snapshot.scroll;
  window.scrollTo({top:snapshot.windowScroll,behavior:'instant'});
 },[p.project.id,screen]);
 const current=p.project.lines.find(l=>l.id===p.lineId);
 const chapterId=chapterFilter?.projectId===p.project.id?chapterFilter.chapterId:current?.chapterId??p.project.chapters[0]?.id;
 const rows=p.project.lines.filter(l=>l.chapterId===(screen==='basic'?current?.chapterId:chapterId)).sort((a,b)=>a.order-b.order);
 const selected=p.preferences.companions[screen]??[];
 const busy=p.disabled;
 const changeProject=(project:StoryProject)=>{try{p.onProjectChange(project);setError('');}catch(cause){setError(cause instanceof Error?cause.message:'원고 변경을 적용하지 못했어요.');}};
 const patch=(line:StoryLine,value:Partial<StoryLine>)=>{if(busy)return;try{changeProject(patchStoryLine(p.project,line.id,value));}catch(cause){setError(cause instanceof Error?cause.message:'원고 변경을 적용하지 못했어요.');}};
 const textEditor=(line:StoryLine,index:number,basic=false)=><label className={styles.text}>글상자 글<textarea data-cut-id={line.id} aria-label={`${index+1}컷 글`} value={line.text} maxLength={20000} disabled={basic?p.basicTextDisabled:busy} onCompositionStart={()=>p.onComposing(true)} onCompositionEnd={()=>p.onComposing(false)} onChange={event=>{if(basic){if(!p.basicTextDisabled)p.onBasicTextChange(event.target.value);}else patch(line,{text:event.target.value});}}/></label>;
 const basicSpeaker=(line:StoryLine)=>{
  const stage=resolveStageComposition(p.project.chapters.find(chapter=>chapter.id===line.chapterId),line,p.project);
  const primary=activeStageSpeaker(stage,line);
  const speakingKeys=primary?new Set([primary,...stage.speakerActorKeys??[]]):new Set<string>();
  const linked=[...stage.leftActors,...stage.rightActors].filter(actor=>speakingKeys.has(actor.key));
  return <fieldset className={styles.basicSpeaker} disabled={busy}>
   <legend>현재 컷의 화자</legend>
   <label className={styles.speakerName}>화자<input aria-label="현재 컷 화자" value={line.speakerName} maxLength={200} onCompositionStart={()=>p.onComposing(true)} onCompositionEnd={()=>p.onComposing(false)} onChange={event=>patch(line,{speakerName:event.target.value})}/></label>
   <div className={styles.speakerImage} aria-label="현재 컷 화자에 연결된 이미지"><span>연결된 이미지</span><div>{linked.length?linked.map(actor=>{const asset=resolveAsset(actor.assetId);return <span key={actor.key}>{asset&&<img src={asset.src} alt="" width={18} height={24}/>}<span>{asset?assetDisplayName(asset):'이미지 확인 필요'}</span></span>;}):<span>{line.type==='narration'?'없음 · 해설':'없음 · 화면 밖 목소리'}</span>}</div></div>
   <label className={styles.speakerKind}><span>글 종류 설정</span><select title="글 종류 설정" aria-label="현재 컷 글 종류" value={line.type} disabled={p.composing} onChange={event=>patch(line,{type:event.target.value as StoryLine['type'],...(event.target.value==='narration'?{speaker:'narration' as const}:{})})}><option value="dialogue">대사</option><option value="narration">해설</option></select></label>
   <button type="button" aria-label="이 컷부터 재생" title="현재 컷부터 실제 이야기 재생" disabled={busy||p.composing} onClick={()=>p.onPreview(line.id)}><svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M4 2 L13 8 L4 14 Z" fill="currentColor"/></svg>재생</button>
  </fieldset>;
 };
 const backgroundEditor=(line:StoryLine,index:number)=><fieldset disabled={busy||p.composing} className={styles.primary}><AssetPickerField label={`${index+1}컷 배경`} type="background" value={line.backgroundMode==='none'?'__none':line.backgroundId} allowDefault allowNone chapterAssetIds={p.project.chapters.find(c=>c.id===line.chapterId)?.backgroundAssetIds} onChange={id=>patch(line,id==='__none'?{backgroundId:'',backgroundMode:'none'}:{backgroundId:id,backgroundMode:undefined})}/>{screen==='background'&&<BackgroundDisplayControls line={line} index={index} onChange={presentation=>patch(line,{presentation})}/>}</fieldset>;
 const stageFor=(line:StoryLine)=>resolveStageComposition(p.project.chapters.find(c=>c.id===line.chapterId),line,p.project);
 const companion=(kind:Companion,line:StoryLine):ReactNode=>kind==='text'?<p className={styles.excerpt}>{line.text||'아직 글이 없어요.'}</p>:kind==='background'?<Material id={backgroundId(p.project,line)}/>:kind==='characters'?<div className={styles.materials}>{[...stageFor(line).leftActors,...stageFor(line).rightActors].map(a=><span key={a.key}><small>{a.position==='center'?'중앙':stageFor(line).leftActors.some(x=>x.key===a.key)?'왼쪽':'오른쪽'}</small><Material id={a.assetId}/></span>)}</div>:kind==='audio'?<p>{audioSummary(p.project,line)}</p>:<p>{directionSummary(p.project,line)}</p>;
 const primary=(line:StoryLine,index:number)=>{
  if(screen==='text')return textEditor(line,index);
  if(screen==='background')return backgroundEditor(line,index);
  if(screen==='characters')return <><CharacterEditors stage={stageFor(line)} index={index} chapterAssetIds={p.project.chapters.find(c=>c.id===line.chapterId)?.characterAssetIds} onChange={stageComposition=>patch(line,{stageComposition})}/><StoryStagingImport project={p.project} line={line} ordered={[...p.project.lines].sort((a,b)=>(p.project.chapters.find(c=>c.id===a.chapterId)?.order??0)-(p.project.chapters.find(c=>c.id===b.chapterId)?.order??0)||a.order-b.order)} onChange={changeProject}/></>;
  if(screen==='audio')return <><p>{audioSummary(p.project,line)}</p><details onToggle={event=>{const open=event.currentTarget.open;setExpanded(prev=>({...prev,[`audio/${line.id}`]:open}));}}><summary>{index+1}컷 음향 수정</summary>{expanded[`audio/${line.id}`]&&<StoryAudioControls value={line.audio} scope="cut" project={p.project} lineId={line.id} chapterId={line.chapterId} workId={p.project.id} editingActive={!busy} onChange={audio=>patch(line,{audio})} onProjectChange={changeProject} onPreviewFromBranch={p.onPreview}/>}</details></>;
  return <><p>{directionSummary(p.project,line)}</p><details onToggle={event=>{const open=event.currentTarget.open;setExpanded(prev=>({...prev,[`direction/${line.id}`]:open}));}}><summary>{index+1}컷 연출 수정</summary>{expanded[`direction/${line.id}`]&&<><StoryDirectionPanel project={p.project} line={line} stage={stageFor(line)} onChange={presentation=>patch(line,{presentation})} onProjectChange={changeProject} onPreviewFromBranch={p.onPreview}/><details><summary>인물 동작 수정</summary><ActorMotionEditors stage={stageFor(line)} index={index} onChange={stageComposition=>patch(line,{stageComposition})}/></details></>}</details></>;
 };
 const adjacent=(line:StoryLine|undefined,label:string)=>{
  if(!line)return <p className={styles.adjacent}>{label}이 없어요.</p>;
  const thumbnail=p.adjacentThumbnails?.[line.id];
  return <button type="button" className={styles.adjacent} disabled={busy||p.composing} onClick={()=>p.onSelectCut(line.id)}><strong>{label}<small>원고 순서</small></strong><span className={styles.sceneThumbnail} data-adjacent-scene={line.id} data-thumbnail-status={thumbnail?.status??'pending'}>{thumbnail?.status==='ready'?<img src={thumbnail.dataUrl} width={320} height={180} alt={`${label} 장면 미리보기 · 인물 배치와 첫 글상자`}/>:<span>{thumbnail?.status==='unavailable'?'장면을 열어 확인해 주세요.':'장면 미리보기 준비 중'}</span>}</span><span className={styles.excerpt}>{line.text||'아직 글이 없어요.'}</span></button>;
 };
 const currentIndex=rows.findIndex(l=>l.id===p.lineId);
 const chapterList=()=> <nav aria-label="현재 장 컷 목록" data-chapter-cuts className={styles.cutList}>{rows.map((line,index)=><button type="button" key={line.id} aria-current={line.id===p.lineId?'step':undefined} disabled={busy||p.composing} onClick={()=>p.onSelectCut(line.id)}><span>{index+1}컷</span><span>{line.workingTitle||line.text||'아직 글이 없어요.'}</span></button>)}</nav>;
 const openNotes=()=>{root.current?.querySelectorAll<HTMLDetailsElement>('[data-stacked-context]>details[open]').forEach(detail=>{detail.open=false;});const notes=root.current?.querySelector<HTMLDetailsElement>('[data-additional-dock] [data-cut-notes]');if(!notes)return;let parent:HTMLElement|null=notes;while(parent&&parent!==root.current){if(parent instanceof HTMLDetailsElement)parent.open=true;parent=parent.parentElement;}notes.querySelector<HTMLInputElement>('input')?.focus({preventScroll:true});};
 const currentNotes=()=>current?<section className={styles.contextNotes} aria-label="현재 컷 메모·연결 정보"><strong>{current.workingTitle||'현재 컷 메모'}</strong>{([['purposeNote','목적'],['emotionNote','감정'],['directionNote','연출 메모']] as const).map(([key,label])=>current[key]?<p key={key}><small>{label}</small>{current[key]}</p>:null)}{!current.purposeNote&&!current.emotionNote&&!current.directionNote&&<p className={styles.hint}>아직 작성한 메모가 없어요.</p>}<button type="button" disabled={busy||p.composing} onClick={openNotes}>{current.purposeNote||current.emotionNote||current.directionNote?'메모 수정':'메모 추가'}</button>{current.ending?.endsStory?<p>이 컷에서 이야기 종료</p>:current.flow?.type==='choice'?<><strong>선택 후 이동</strong><ul>{current.flow.options.map(option=><li key={option.id}>{option.label||'문구 없는 선택지'} → {destinationLabel(p.project,option.targetLineId)}</li>)}</ul></>:current.flow?.type==='goto'?<p><small>재생 시 이동</small>{destinationLabel(p.project,current.flow.targetLineId)}{current.flow.routes?.length?<small>점수 조건에 따라 도착 컷이 달라질 수 있어요.</small>:null}</p>:<p className={styles.hint}>이전·다음 컷은 원고 순서입니다.</p>}</section>:null;
 const layoutControl=<label className={styles.screenSelection}>컷 배치<select aria-label="컷 배치" value={p.preferences.arrangement??'auto'} disabled={p.composing||busy} onChange={event=>p.onPreferencesChange(current=>({...current,arrangement:event.target.value as CutArrangement}))}><option value="auto">자동 · 화면에 맞춤</option><option value="columns">가로 · 나란히</option><option value="stacked">세로 · 위아래</option></select></label>;
 return <section ref={root} onBlurCapture={event=>remember(event.target)} className={`${styles.workbench} ${p.playing?styles.playing:''}`} data-screen={screen} aria-label="여러 컷 편집">
  {p.settingsTarget?createPortal(<>{p.chapterSettings}<label className={styles.screenSelection}>편집화면<select aria-label="편집화면 선택" value={screen} disabled={busy||p.composing} onPointerDown={()=>remember()} onChange={event=>{remember();p.onScreenChange(event.target.value as EditingScreen);const menu=event.currentTarget.closest<HTMLDetailsElement>('[data-work-menu]');if(menu){menu.open=false;menu.querySelector<HTMLElement>(':scope>summary')?.focus();}}}>{screens.filter(([id])=>!optional(id)||enabled[id]).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label><details><summary>편집 설정</summary><p>기본편집, 글 편집, 배경 편집은 항상 사용할 수 있어요. 필요한 기능만 켜서 편집하세요. 기능을 꺼도 작품의 내용은 유지돼요.</p>{(['characters','audio','direction'] as const).map(id=><label key={id} className={styles.check}><input type="checkbox" checked={enabled[id]} disabled={busy||p.composing} onChange={event=>{p.onPreferencesChange(prev=>({...prev,enabled:{...prev.enabled,[id]:event.target.checked}}));if(!event.target.checked&&screen===id)p.onScreenChange('basic');}}/>{names[id]} 편집 사용</label>)}{p.additionalSettings}<small>편집화면과 설정은 현재 탭에서 작품별로 유지돼요. 새로고침하거나 서재를 오가도 유지되며, 작품 파일에는 포함되지 않아요.</small></details></>,p.settingsTarget):<div hidden={p.playing} inert={p.playing}><>{p.chapterSettings}<label className={styles.screenSelection}>편집화면<select aria-label="편집화면 선택" value={screen} disabled={busy||p.composing} onPointerDown={()=>remember()} onChange={event=>{remember();p.onScreenChange(event.target.value as EditingScreen);const menu=event.currentTarget.closest<HTMLDetailsElement>('[data-work-menu]');if(menu){menu.open=false;menu.querySelector<HTMLElement>(':scope>summary')?.focus();}}}>{screens.filter(([id])=>!optional(id)||enabled[id]).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label><details><summary>편집 설정</summary><p>기본편집, 글 편집, 배경 편집은 항상 사용할 수 있어요. 필요한 기능만 켜서 편집하세요. 기능을 꺼도 작품의 내용은 유지돼요.</p>{(['characters','audio','direction'] as const).map(id=><label key={id} className={styles.check}><input type="checkbox" checked={enabled[id]} disabled={busy||p.composing} onChange={event=>{p.onPreferencesChange(prev=>({...prev,enabled:{...prev.enabled,[id]:event.target.checked}}));if(!event.target.checked&&screen===id)p.onScreenChange('basic');}}/>{names[id]} 편집 사용</label>)}{p.additionalSettings}<small>편집화면과 설정은 현재 탭에서 작품별로 유지돼요. 새로고침하거나 서재를 오가도 유지되며, 작품 파일에는 포함되지 않아요.</small></details></></div>}
  {!p.playing&&error&&<p role="alert">{error}</p>}
  <p hidden={p.playing} className={styles.hint}>작품 파일 저장이 기본입니다. 이전·다음 컷은 장면 미리보기이며, 움직임과 소리는 ‘이 컷부터 재생’으로 확인하세요.</p>
  {p.settingsTarget?createPortal(layoutControl,p.settingsTarget):!p.playing&&layoutControl}
  <div className={styles.body} data-editing-body data-basic={screen==='basic'} data-playing={!!p.playing} data-cut-arrangement={arrangement}>
  <div className={styles.previewSlot} data-runtime-parked={!p.playing&&screen!=='basic'?true:undefined} aria-hidden={!p.playing&&screen!=='basic'?true:undefined} inert={!p.playing&&screen!=='basic'}>{p.preview}</div>
  <div className={styles.editingContent} hidden={p.playing} inert={p.playing}>
  {screen==='basic'&&current?<div className={styles.basic}>
   <aside className={styles.previousSide} aria-label="이전 컷과 장 탐색">{adjacent(rows[currentIndex-1],'이전 컷')}<section className={styles.sideSupplement}><strong>이 장의 컷</strong>{chapterList()}</section></aside><fieldset disabled={p.basicTextDisabled} className={styles.current} data-current-cut><legend>현재 컷 · {currentIndex+1}컷</legend>{basicSpeaker(current)}{textEditor(current,currentIndex,true)}{backgroundEditor(current,currentIndex)}<div><strong>현재 인물 · 자료 미리보기</strong>{companion('characters',current)}</div></fieldset><aside className={styles.nextSide} aria-label="다음 컷과 참고 정보">{adjacent(rows[currentIndex+1],'다음 컷')}<div className={styles.sideSupplement}>{currentNotes()}</div></aside>
  </div>:<>
   <div className={styles.options}><label>편집할 장<select aria-label="편집할 장" value={chapterId??''} disabled={busy||p.composing} onChange={event=>setChapterFilter({projectId:p.project.id,chapterId:event.target.value})}>{[...p.project.chapters].sort((a,b)=>a.order-b.order).map(c=><option key={c.id} value={c.id}>{chapterLabel(c)}</option>)}</select></label>
   <fieldset><legend>함께 보기</legend>{(Object.keys(names) as Companion[]).filter(id=>id!==screen).map(id=><label className={styles.check} key={id}><input type="checkbox" checked={selected.includes(id)} onChange={event=>p.onPreferencesChange(prev=>({...prev,companions:{...prev.companions,[screen]:event.target.checked?[...selected,id]:selected.filter(x=>x!==id)}}))}/>{names[id]} 함께 보기</label>)}<small>다른 항목은 참고용으로 보여 줘요. 수정하려면 해당 편집화면으로 이동하세요. 인물·음향·연출 편집은 편집 설정에서 먼저 켜 주세요.</small></fieldset></div>
   <div className={styles.rows} data-writer-scroll>{rows.map((line,index)=><article key={line.id} data-testid={`editing-cut-${line.id}`} className={styles.row} aria-label={`${index+1}컷 편집`}><header><strong>{index+1}컷{line.speakerName?` · ${line.speakerName}`:''}</strong><button type="button" disabled={busy||p.composing} onClick={()=>p.onSelectCut(line.id)}>이 컷 선택</button><button type="button" disabled={busy||p.composing} onClick={()=>p.onPreview(line.id)}>이 컷부터 재생</button></header><fieldset disabled={busy||(p.composing&&screen!=='text')} className={styles.primary}>{primary(line,index)}</fieldset>{selected.length>0&&<aside className={styles.companions} aria-label="확인용 함께 보기">{selected.map(id=><section key={id}><strong>{names[id]}</strong>{companion(id,line)}</section>)}</aside>}</article>)}</div>
  </>}
  </div>
  </div>
  {!p.playing&&screen==='basic'&&<div className={styles.stackedContext} data-arrangement={arrangement} data-stacked-context><details onToggle={event=>{if(event.currentTarget.open)revealCurrentCut(root.current);}}><summary>이 장의 컷 목록</summary>{chapterList()}</details><details><summary>현재 컷 메모·연결 정보</summary>{currentNotes()}</details></div>}
  <div data-additional-dock className={styles.additional} hidden={p.playing} inert={p.playing} onKeyDown={event=>{if(event.key!=='Escape'||event.defaultPrevented||event.nativeEvent.isComposing||document.querySelector('dialog[open]'))return;const opened=event.currentTarget.querySelector<HTMLDetailsElement>(':scope>details[open]');if(opened){opened.open=false;opened.querySelector<HTMLElement>(':scope>summary')?.focus();event.preventDefault();event.stopPropagation();}}}>{p.additionalEditor}</div>
 </section>;
}
function BackgroundDisplayControls({line,index,onChange}:{line:StoryLine;index:number;onChange:(presentation:StoryLine['presentation'])=>void}){
 const presentation=line.presentation;
 const focal=presentation?.backgroundFocal??{x:0.5,y:0.5};
 const setFocal=(axis:'x'|'y',value:string)=>onChange({...presentation,backgroundFocal:{...focal,[axis]:Number(value)/100}});
 return <details className={styles.backgroundDisplay}>
  <summary>{index+1}컷 배경 표시 조정</summary>
  <label>배경 표시<select aria-label={`${index+1}컷 배경 표시`} value={presentation?.backgroundFit??''} onChange={event=>onChange({...presentation,backgroundFit:event.target.value?event.target.value as 'cover'|'contain':undefined})}>
   <option value="">자료 기본 표시</option><option value="cover">화면 채우기</option><option value="contain">전체 이미지 보기</option>
  </select></label>
  <label>배경 중심 가로 · {Math.round(focal.x*100)}%<input type="range" min="0" max="100" aria-label={`${index+1}컷 배경 중심 가로`} value={focal.x*100} onChange={event=>setFocal('x',event.target.value)}/></label>
  <label>배경 중심 세로 · {Math.round(focal.y*100)}%<input type="range" min="0" max="100" aria-label={`${index+1}컷 배경 중심 세로`} value={focal.y*100} onChange={event=>setFocal('y',event.target.value)}/></label>
  <button type="button" disabled={!presentation?.backgroundFocal} onClick={()=>onChange({...presentation,backgroundFocal:undefined})}>{index+1}컷 배경 중심 초기화</button>
  <small>작은 자료 이미지는 바뀌지 않아요. 표시 결과는 ‘이 컷부터 재생’으로 확인하세요.</small>
 </details>;
}
function CharacterEditors({stage,index,onChange,chapterAssetIds}:{stage:StageComposition;index:number;onChange:(stage:StageComposition)=>void;chapterAssetIds?:readonly string[]}){
 const actors=[...stage.leftActors,...stage.rightActors];
 const update=(key:string,value:Partial<StageActorEntry>)=>onChange({...stage,leftActors:stage.leftActors.map(a=>a.key===key?{...a,...value}:a),rightActors:stage.rightActors.map(a=>a.key===key?{...a,...value}:a)});
 const move=(actor:StageActorEntry,position:'left'|'center'|'right')=>{
  const origin=stage.leftActors.some(a=>a.key===actor.key)?'leftActors':'rightActors';
  const target=position==='center'?origin:position==='left'?'leftActors':'rightActors';
  if(target!==origin&&stage[target].length>=2)return;
  const nextActor={...actor,position:position==='center'?'center' as const:undefined,positionOrder:position==='center'?actor.positionOrder??1:undefined,xAnchor:undefined};
  if(target===origin){update(actor.key,nextActor);return;}
  onChange({...stage,leftActors:stage.leftActors.filter(a=>a.key!==actor.key).concat(target==='leftActors'?[nextActor]:[]),rightActors:stage.rightActors.filter(a=>a.key!==actor.key).concat(target==='rightActors'?[nextActor]:[])});
 };
 const remove=(key:string)=>onChange({...stage,leftActors:stage.leftActors.filter(a=>a.key!==key),rightActors:stage.rightActors.filter(a=>a.key!==key),speakerActorKey:stage.speakerActorKey===key?undefined:stage.speakerActorKey,speakerActorKeys:stage.speakerActorKeys?.filter(id=>id!==key)});
 const add=(assetId:string)=>{const side=stage.leftActors.length<2?'leftActors':'rightActors';if(stage[side].length>=2)return;onChange({...stage,[side]:[...stage[side],{key:`actor-${crypto.randomUUID()}`,assetId}]});};
 return <div className={styles.characters}>{actors.map((actor,i)=><section key={actor.key}>
  <strong>{actor.position==='center'?'중앙':stage.leftActors.some(a=>a.key===actor.key)?'왼쪽':'오른쪽'} 인물 {i+1}</strong><AssetPickerField label={`${index+1}컷 인물 ${i+1}`} type="character" value={actor.assetId} chapterAssetIds={chapterAssetIds} onChange={assetId=>update(actor.key,{assetId})}/>
  <label>가로 위치<input aria-label={`${index+1}컷 인물 ${i+1} 가로 위치`} type="range" min="5" max="95" value={actor.xAnchor??(actor.position==='center'?50:stage.leftActors.some(a=>a.key===actor.key)?25:75)} onChange={e=>update(actor.key,{xAnchor:Number(e.target.value)})}/></label>
  <label>배치 위치<select aria-label={`${index+1}컷 인물 ${i+1} 배치 위치`} value={actor.position==='center'?'center':stage.leftActors.some(a=>a.key===actor.key)?'left':'right'} onChange={e=>move(actor,e.target.value as 'left'|'center'|'right')}><option value="left" disabled={!stage.leftActors.some(a=>a.key===actor.key)&&stage.leftActors.length>=2}>왼쪽</option><option value="center">중앙</option><option value="right" disabled={!stage.rightActors.some(a=>a.key===actor.key)&&stage.rightActors.length>=2}>오른쪽</option></select></label>
  <label>방향<select aria-label={`${index+1}컷 인물 ${i+1} 방향`} value={actor.facing??'auto'} onChange={e=>update(actor.key,{facing:e.target.value==='auto'?undefined:e.target.value as StageActorEntry['facing']})}><option value="auto">자료 기본 방향</option><option value="original">원본 방향</option><option value="left">왼쪽 보기</option><option value="right">오른쪽 보기</option></select></label>
  <label>크기<input aria-label={`${index+1}컷 인물 ${i+1} 크기`} type="range" min="50" max="140" value={Math.round((actor.scaleMultiplier??1)*100)} onChange={e=>update(actor.key,{scaleMultiplier:Number(e.target.value)/100})}/></label><button type="button" onClick={()=>remove(actor.key)}>인물 {i+1} 빼기</button>
 </section>)}{actors.length<4&&<AssetPickerField label={`${index+1}컷 인물 추가`} type="character" value="" chapterAssetIds={chapterAssetIds} onChange={add}/>}</div>;
}

function ActorMotionEditors({stage,index,onChange}:{stage:StageComposition;index:number;onChange:(stage:StageComposition)=>void}){
 const update=(key:string,motion:StageActorEntry['motion'])=>onChange({...stage,leftActors:stage.leftActors.map(a=>a.key===key?{...a,motion}:a),rightActors:stage.rightActors.map(a=>a.key===key?{...a,motion}:a)});
 return <>{[...stage.leftActors,...stage.rightActors].map((actor,i)=><fieldset key={actor.key}><legend>인물 {i+1} 동작</legend><label>동작<select aria-label={`${index+1}컷 인물 ${i+1} 동작`} value={actor.motion?.type??''} onChange={event=>update(actor.key,event.target.value?{type:event.target.value as NonNullable<StageActorEntry['motion']>['type'],durationMs:600,delayMs:0}:undefined)}><option value="">바로 표시</option><option value="fade-in">서서히 등장</option><option value="fade-out">서서히 퇴장</option><option value="move">지정 위치에서 이동</option></select></label>{actor.motion&&<><SecondsInput label={`${index+1}컷 인물 ${i+1} 동작 시간`} valueMs={actor.motion.durationMs??600} onChange={durationMs=>update(actor.key,{...actor.motion!,durationMs})}/><SecondsInput label={`${index+1}컷 인물 ${i+1} 동작 대기`} valueMs={actor.motion.delayMs??0} onChange={delayMs=>update(actor.key,{...actor.motion!,delayMs})}/>{actor.motion.type==='move'&&<label>출발 가로 위치<input type="range" min="5" max="95" aria-label={`${index+1}컷 인물 ${i+1} 출발 위치`} value={actor.motion.fromXAnchor??50} onChange={event=>update(actor.key,{...actor.motion!,fromXAnchor:Number(event.target.value)})}/></label>}</>}</fieldset>)}</>;
}
