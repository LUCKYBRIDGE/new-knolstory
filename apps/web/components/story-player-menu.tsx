'use client';
import {useEffect,useId,useLayoutEffect,useMemo,useRef,useState,type CSSProperties} from 'react';
import {createPortal} from 'react-dom';
import {chapterLabel,cutLabel,type StoryProject} from '@knolstory/story-domain';
import {playbackLog,type PlaybackState,type ImagePreloadMode} from '@knolstory/runtime-core';
import {readerChapterHistory,restartReaderChapter} from '../lib/reader-chapter-history';
import {loadPlayerSlot,isPlayerSlotChanged,projectPlaybackFingerprint,readPlayerSaves,savePlayerSlot,writePlayerSaves,type PlayerSaves,type PlayerSlot,type PlayerSlotId,type PlayerThumbnail} from '../lib/player-saves';
import {canAutoForward,autoForwardDelay} from '../lib/reader-auto-forward';
import {trapDialogTab} from '../lib/dialog-keyboard';
import {DEFAULT_READER_PREFERENCES,readReaderPreferences,writeReaderPreferences,type ReaderPreferences,type ReaderFormat,type ReaderTapMode} from '../lib/reader-preferences';
import styles from './story-player-menu.module.css';
type Props=Readonly<{project:StoryProject;playback:PlaybackState;dialoguePosition?:Readonly<{lineId:string;offset:number}>;visibleDialogue?:Readonly<{lineId:string;endOffset:number}>;onRestore:(state:PlaybackState,position?:Readonly<{lineId:string;offset:number}>)=>void;onRestart:()=>void;onExit?:()=>void;onLibrary?:()=>void;disabled?:boolean;onFullscreen?:()=>void;fullscreen?:boolean;onAdvance?:()=>void;advanceDisabled?:boolean;hasMoreText?:boolean;manualEffectPending?:boolean;onReducedMotion?:()=>void;reducedMotion?:boolean;motionDisabled?:boolean;presentationReady?:boolean;presentationKey?:string;onInteractionChange?:(busy:boolean)=>void;stageContainer?:HTMLElement|null;stageBounds?:Readonly<{x:number;y:number;width:number;height:number}>;textboxBounds?:Readonly<{x:number;y:number;width:number;height:number}>;onToolsExpandedChange?:(expanded:boolean)=>void;onFormatChange?:(format:ReaderFormat)=>void;onTapModeChange?:(mode:ReaderTapMode)=>void;onImagePreloadChange?:(value:Readonly<{mode:ImagePreloadMode;cutCount:number}>)=>void;imagePreloadMode?:ImagePreloadMode;imagePreloadCount?:number;tapMode?:ReaderTapMode;format?:ReaderFormat;onTextScaleChange?:(scale:number)=>void;textScale?:number;toolFontSizePx?:number;thumbnailReady?:boolean;captureThumbnail?:()=>Promise<PlayerThumbnail|undefined>;toolsHidden?:boolean}>;
type Panel='save'|'load'|'log'|'settings'|null;
type Confirmation=Readonly<{kind:'load'|'overwrite'|'history'|'restart'|'library';id?:PlayerSlotId;pathIndex?:number;changed?:boolean}>|null;
const reason=(error:unknown)=>error instanceof Error?error.message:'저장하지 못했어요. 다시 시도해 주세요.';
const date=(value:string)=>new Date(value).toLocaleString('ko-KR');
export function StoryPlayerMenu({project,playback,dialoguePosition,visibleDialogue,onRestore,onRestart,onExit,onLibrary,onFullscreen,fullscreen=false,onAdvance,advanceDisabled=false,hasMoreText=false,manualEffectPending=false,onReducedMotion,reducedMotion=false,motionDisabled=false,disabled=false,presentationReady=false,presentationKey='',onInteractionChange,stageContainer,stageBounds,textboxBounds,onToolsExpandedChange,onFormatChange,format='auto',onTapModeChange,tapMode='next',onImagePreloadChange,imagePreloadMode='upcoming',imagePreloadCount=3,onTextScaleChange,textScale=1,toolFontSizePx=10,thumbnailReady=presentationReady,captureThumbnail,toolsHidden=false}:Props){
 const id=useId(),topMenuId=`${id}-top-menu`,titleId=`${id}-title`;
 const confirmationReturn=useRef<string|null>(null),confirmationEpoch=useRef(0);
 const [librarySaveFailed,setLibrarySaveFailed]=useState(false);
 useEffect(()=>()=>{confirmationEpoch.current++;},[]);
 const [saving,setSaving]=useState(false),saveInFlight=useRef(false),saveContext=useRef('');
 const [panel,setPanel]=useState<Panel>(null),[saves,setSaves]=useState<PlayerSaves>({version:2,works:{}}),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [confirm,setConfirm]=useState<Confirmation>(null),[topOpen,setTopOpen]=useState(false),[viewportPhone,setViewportPhone]=useState(false),[page,setPage]=useState(1),[tab,setTab]=useState<'manual'|'auto'|'quick'>('manual');
 const [auto,setAuto]=useState(false),[delay,setDelay]=useState(3),[visible,setVisible]=useState(true);
 const [imagePreloadInput,setImagePreloadInput]=useState({count:imagePreloadCount,value:String(imagePreloadCount)});
 const imagePreloadDraft=imagePreloadInput.count===imagePreloadCount?imagePreloadInput.value:String(imagePreloadCount);
 const imagePreloadDraftValid=/^[1-9]\d*$/.test(imagePreloadDraft)&&Number(imagePreloadDraft)<=10;
 const preferences=useRef<ReaderPreferences>(DEFAULT_READER_PREFERENCES),preferencesLoaded=useRef(false),textScaleRef=useRef(onTextScaleChange),formatRef=useRef(onFormatChange),tapModeRef=useRef(onTapModeChange),imagePreloadRef=useRef(onImagePreloadChange);
 useEffect(()=>{textScaleRef.current=onTextScaleChange;formatRef.current=onFormatChange;tapModeRef.current=onTapModeChange;imagePreloadRef.current=onImagePreloadChange;},[onTextScaleChange,onFormatChange,onTapModeChange,onImagePreloadChange]);
 useEffect(()=>{const timer=window.setTimeout(()=>{if(preferencesLoaded.current)return;preferencesLoaded.current=true;try{const stored=readReaderPreferences(localStorage);preferences.current=stored;setDelay(stored.autoDelaySeconds);textScaleRef.current?.(stored.textScale);formatRef.current?.(stored.format);tapModeRef.current?.(stored.tapMode);imagePreloadRef.current?.({mode:stored.imagePreloadMode,cutCount:stored.imagePreloadCount});}catch{setError('읽기 설정을 불러오지 못했어요. 이 화면에서는 기본 설정으로 읽어요.');}},0);return()=>clearTimeout(timer);},[]);
 function updatePreferences(change:Partial<Omit<ReaderPreferences,'version'>>){preferencesLoaded.current=true;const next={...preferences.current,...change};preferences.current=next;if(change.textScale!==undefined)onTextScaleChange?.(change.textScale);if(change.format!==undefined)onFormatChange?.(change.format);if(change.tapMode!==undefined)onTapModeChange?.(change.tapMode);if(change.autoDelaySeconds!==undefined)setDelay(change.autoDelaySeconds);if(change.imagePreloadMode!==undefined||change.imagePreloadCount!==undefined)onImagePreloadChange?.({mode:next.imagePreloadMode,cutCount:next.imagePreloadCount});try{writeReaderPreferences(localStorage,next);setError('');}catch{setError('읽기 설정을 이 기기에 보관하지 못했어요. 지금 화면에는 적용돼 있어요.');}}
 const historyScroll=useRef<HTMLDivElement>(null),historyScrollPosition=useRef<number|null>(null);
 const dialog=useRef<HTMLDialogElement>(null),trigger=useRef<HTMLButtonElement>(null),topMenu=useRef<HTMLDivElement>(null),returnFocus=useRef<HTMLElement|null>(null),advancedKey=useRef(''),advanceRef=useRef(onAdvance),interactionRef=useRef(onInteractionChange),toolsRef=useRef(onToolsExpandedChange);
 useEffect(()=>{advanceRef.current=onAdvance;interactionRef.current=onInteractionChange;toolsRef.current=onToolsExpandedChange;},[onAdvance,onInteractionChange,onToolsExpandedChange]);
 const fingerprint=useMemo(()=>projectPlaybackFingerprint(project),[project]),progressKey=JSON.stringify([playback,dialoguePosition]),busy=!!panel||!!confirm||topOpen||saving;
 useLayoutEffect(()=>{saveContext.current=JSON.stringify([project.id,fingerprint,progressKey,presentationKey]);},[project.id,fingerprint,progressKey,presentationKey]);
 const phone=textboxBounds?textboxBounds.width<660:viewportPhone;
 useEffect(()=>{const query=matchMedia('(max-width:720px)');const update=()=>setViewportPhone(query.matches);update();query.addEventListener('change',update);return()=>query.removeEventListener('change',update);},[]);
 useEffect(()=>{toolsRef.current?.(phone);},[phone]);
 useEffect(()=>()=>toolsRef.current?.(false),[]);
 useEffect(()=>{interactionRef.current?.(busy);},[busy]);
 useEffect(()=>()=>interactionRef.current?.(false),[]);
 useEffect(()=>{const update=()=>setVisible(document.visibilityState==='visible');update();document.addEventListener('visibilitychange',update);return()=>document.removeEventListener('visibilitychange',update);},[]);
 useEffect(()=>{
  if(!canAutoForward({manualEffectPending:manualEffectPending&&!hasMoreText,enabled:auto,visible,blocked:busy||disabled||advanceDisabled,ready:presentationReady,status:playback.status==='choice'&&hasMoreText?'reading':playback.status,presentationKey})||!onAdvance||advancedKey.current===presentationKey)return;
  const timer=window.setTimeout(()=>{advancedKey.current=presentationKey;advanceRef.current?.();},autoForwardDelay(delay));return()=>clearTimeout(timer);
 },[auto,visible,busy,disabled,advanceDisabled,presentationReady,manualEffectPending,playback.status,presentationKey,delay,onAdvance,hasMoreText]);
 useEffect(()=>{if(!presentationReady||!thumbnailReady)return;let cancelled=false;const timer=window.setTimeout(()=>{void (async()=>{try{
   const thumbnail=await captureThumbnail?.();
   if(cancelled)return;const next=savePlayerSlot(readPlayerSaves(localStorage),project,playback,'auto',undefined,thumbnail,dialoguePosition);writePlayerSaves(localStorage,next);setSaves(next);
  }catch(error){if(!cancelled)setError(reason(error));}})();},150);return()=>{cancelled=true;clearTimeout(timer);};},[project.id,fingerprint,progressKey,presentationReady,presentationKey,thumbnailReady,captureThumbnail]); // eslint-disable-line react-hooks/exhaustive-deps
 useEffect(()=>{if((panel||confirm)&&!dialog.current?.open)dialog.current?.showModal();if(!panel&&!confirm&&dialog.current?.open){dialog.current?.close();returnFocus.current?.focus();}},[panel,confirm]);
 useEffect(()=>{if(panel!=='log'||confirm)return;const area=historyScroll.current,script=area?.firstElementChild;if(!area||!script)return;let anchored=area.scrollHeight-area.scrollTop-area.clientHeight<3;const onScroll=()=>{anchored=area.scrollHeight-area.scrollTop-area.clientHeight<3;};area.addEventListener('scroll',onScroll);const observer=new ResizeObserver(()=>{if(anchored)area.scrollTop=area.scrollHeight;});observer.observe(script);return()=>{observer.disconnect();area.removeEventListener('scroll',onScroll);};},[panel,confirm]);
 useEffect(()=>{if(panel!=='log')return;const frame=requestAnimationFrame(()=>{const area=historyScroll.current;if(area)area.scrollTop=area.scrollHeight;});return()=>cancelAnimationFrame(frame);},[panel]);
 useLayoutEffect(()=>{if(!confirm&&panel==='log'&&historyScroll.current&&historyScrollPosition.current!==null){historyScroll.current.scrollTop=historyScrollPosition.current;historyScrollPosition.current=null;}if(!confirm&&panel&&confirmationReturn.current){dialog.current?.querySelector<HTMLElement>(confirmationReturn.current)?.focus();confirmationReturn.current=null;}},[panel,confirm]);
 useEffect(()=>{if(!topOpen)return;topMenu.current?.querySelector<HTMLButtonElement>('[data-menu-resume]')?.focus();const close=(event:MouseEvent)=>{if(!topMenu.current?.contains(event.target as Node)&&!trigger.current?.contains(event.target as Node)){setTopOpen(false);trigger.current?.focus();}};const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){setTopOpen(false);trigger.current?.focus();}};document.addEventListener('pointerdown',close);document.addEventListener('keydown',escape);return()=>{document.removeEventListener('pointerdown',close);document.removeEventListener('keydown',escape);};},[topOpen]);
 useEffect(()=>{if(!notice)return;const timer=setTimeout(()=>setNotice(''),3500);return()=>clearTimeout(timer);},[notice]);
 function captureFocus(){if(!panel&&!confirm)returnFocus.current=topOpen?trigger.current:document.activeElement as HTMLElement;}
 function close(){confirmationEpoch.current++;historyScrollPosition.current=null;confirmationReturn.current=null;setPanel(null);setConfirm(null);setLibrarySaveFailed(false);setError('');}
 function cancelConfirmation(){
  confirmationEpoch.current++;setLibrarySaveFailed(false);
  if(!panel){close();return;}
  confirmationReturn.current=confirm?.kind==='history'?`[data-player-history-index="${confirm.pathIndex}"]`:confirm?.id!==undefined?`[data-player-slot="${confirm.id}"]`:null;
  setConfirm(null);
 }
 function open(next:Panel){confirmationEpoch.current++;setLibrarySaveFailed(false);captureFocus();setTopOpen(false);setConfirm(null);setPage(1);setTab('manual');setNotice('');try{setSaves(readPlayerSaves(localStorage));setError('');}catch(error){setError(reason(error));}setPanel(next);}
 function request(value:NonNullable<Confirmation>){confirmationEpoch.current++;setLibrarySaveFailed(false);if(value.kind==='history')historyScrollPosition.current=historyScroll.current?.scrollTop??null;captureFocus();setTopOpen(false);if(value.kind==='load'){try{const current=readPlayerSaves(localStorage);setSaves(current);if(!current.works[project.id]?.[String(value.id)]){setError(value.id==='quick'?'빠른 저장한 기록이 아직 없어요.':'고른 저장을 찾지 못했어요. 다른 저장을 골라 주세요.');return;}}catch(error){setError(reason(error));return;}}setConfirm(value);setError('');}
 async function save(id:PlayerSlotId,approved=false,keepConfirmation=false):Promise<boolean>{
  if(saveInFlight.current)return false;
  const context=saveContext.current,clickedProject=project,clickedPlayback=playback;
  try{const current=readPlayerSaves(localStorage);if(typeof id==='number'&&current.works[project.id]?.[id]&&!approved){setConfirm({kind:'overwrite',id});return false;}
   saveInFlight.current=true;setSaving(true);
   const thumbnail=await captureThumbnail?.();
   if(saveContext.current!==context)throw Error('저장하는 사이 장면이 바뀌었어요. 지금 컷에서 다시 저장해 주세요.');
   const next=savePlayerSlot(readPlayerSaves(localStorage),clickedProject,clickedPlayback,id,undefined,thumbnail,dialoguePosition);writePlayerSaves(localStorage,next);setSaves(next);if(!keepConfirmation)setConfirm(null);setError('');setNotice(id==='quick'?'빠른 저장 완료':id==='auto'?'읽기 위치를 보관했습니다.':`${id}번에 저장했습니다.`);return true;
  }catch(error){setError(reason(error));return false;}finally{saveInFlight.current=false;setSaving(false);}
 }
 function load(id:PlayerSlotId,allowChanged=false){try{const slot=readPlayerSaves(localStorage).works[project.id]?.[String(id)];if(!slot)throw Error(id==='quick'?'빠른 저장한 기록이 아직 없어요.':'고른 저장을 찾지 못했어요. 다른 저장을 골라 주세요.');if(isPlayerSlotChanged(project,slot)&&!allowChanged){setConfirm({kind:'load',id,changed:true});return;}const restored=loadPlayerSlot(project,slot,allowChanged);onRestore(restored.state,restored.dialoguePosition);setAuto(false);close();setNotice('읽던 위치와 선택을 불러왔어요.');}catch(error){setError(reason(error));}}
 async function confirmAction(){if(!confirm)return;switch(confirm.kind){case 'overwrite':save(confirm.id!,true);break;case 'load':load(confirm.id!,!!confirm.changed);break;case 'history':try{onRestore(restartReaderChapter(project,playback,confirm.pathIndex!));setAuto(false);close();}catch(error){setError(reason(error));}break;case 'restart':try{onRestart();setAuto(false);advancedKey.current='';close();}catch(error){setError(reason(error));}break;case 'library':{
   if(saveInFlight.current)break;
   const pending=confirm,epoch=confirmationEpoch.current;setLibrarySaveFailed(false);
   if(await save('auto',false,true)){
    // Closing or cancelling while a thumbnail/save is pending must never leave later by itself.
    if(epoch!==confirmationEpoch.current)break;
    try{onLibrary?.();close();}catch(error){setConfirm(pending);setError(reason(error));}
   }else if(epoch===confirmationEpoch.current){
    setLibrarySaveFailed(true);setNotice('');setError('읽던 진행을 임시 보관하지 못했어요. 이전에 저장한 진행은 그대로예요. 다시 시도하거나 진행 저장 없이 서재로 이동할 수 있어요.');
   }
   break;
  }}}
 function leaveWithoutProgress(){if(confirm?.kind!=='library'||!librarySaveFailed||saving)return;try{onLibrary?.();close();}catch(error){setError(reason(error));}}
 const history=useMemo(()=>{try{return readerChapterHistory(project,playback,visibleDialogue??null);}catch{return {chapterId:null,entries:[],previousChapters:[]};}},[project,playback,visibleDialogue]);
 const historyChapter=project.chapters.find(chapter=>chapter.id===history.chapterId);
 const slotText=(slot:PlayerSlot)=>slot.summary?`${slot.summary.location} · ${slot.summary.speaker} — ${slot.summary.text}`:(()=>{if(isPlayerSlotChanged(project,slot))return '작품 변경됨 · 연결 확인 필요';const entry=playbackLog(project,slot.playback,slot.playback.lineId?{lineId:slot.playback.lineId,endOffset:20000}:null).at(-1),line=project.lines.find(item=>item.id===entry?.lineId),chapter=project.chapters.find(item=>item.id===entry?.chapterId);return `${chapter&&line?cutLabel(chapter,line):'이야기 끝'} · ${entry?.speaker||'해설'} — ${entry?.text??'이야기 끝'}`;})();
 const pageSize=phone?4:6,maxPage=Math.ceil(9/pageSize),slotIds:PlayerSlotId[]=tab==='manual'?Array.from({length:Math.min(pageSize,9-(Math.min(page,maxPage)-1)*pageSize)},(_,index)=>(Math.min(page,maxPage)-1)*pageSize+index+1):[tab];
 const barStyle:CSSProperties=textboxBounds?{left:textboxBounds.x,width:textboxBounds.width,top:textboxBounds.y+textboxBounds.height-44}:{};

 const triggerStyle:CSSProperties=stageBounds?{left:stageBounds.x+stageBounds.width-52,top:stageBounds.y+8,right:'auto'}:{};
 // Editor playback only: the way back stays beside the menu trigger instead of inside the menu.
 const returnStyle:CSSProperties=stageBounds?{left:stageBounds.x+stageBounds.width-60,top:stageBounds.y+8,right:'auto',transform:'translateX(-100%)'}:{};
 const popupStyle:CSSProperties=stageBounds?{left:stageBounds.x+Math.max(12,stageBounds.width-332),top:stageBounds.y+56,right:'auto',maxWidth:Math.max(0,stageBounds.width-24),maxHeight:Math.max(44,stageBounds.height-68)}:{};
 const titles={save:'저장',load:'불러오기',log:'지난기록',settings:'읽기 설정'};
 const confirmTitle=confirm?.kind==='overwrite'?'이 저장을 덮어쓸까요?':confirm?.kind==='load'?'이 기록을 불러올까요?':confirm?.kind==='history'?'이전 장의 첫 컷부터 다시 읽을까요?':confirm?.kind==='restart'?'처음부터 읽을까요?':'서재로 돌아갈까요?';
 const content=<div className={`${styles.menu} ${stageContainer?styles.overlay:''}`} role="group" aria-label="읽기 도구" data-phone={phone}>
  {onExit&&<button type="button" className={styles.editorReturn} style={returnStyle} data-editor-return="true" title="읽던 컷의 편집 화면으로 돌아가요" onClick={()=>{setTopOpen(false);onExit();}}><svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg><span>편집으로 돌아가기</span></button>}
  <button className={styles.topTrigger} style={triggerStyle} ref={trigger} data-reader-menu-trigger="true" aria-label="읽기 메뉴" aria-expanded={topOpen} aria-controls={topMenuId} onClick={()=>setTopOpen(value=>!value)}><svg width="22" height="18" viewBox="0 0 22 18" aria-hidden="true" focusable="false"><path d="M2 3h18M2 9h18M2 15h18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg></button>
  {topOpen&&<div ref={topMenu} id={topMenuId} data-reader-top-menu="true" data-system-menu="player" className={styles.topMenu} style={popupStyle} role="group" aria-label="읽기 메뉴" onBlurCapture={event=>{const next=event.relatedTarget as Node|null;if(!event.currentTarget.contains(next)&&!trigger.current?.contains(next))setTopOpen(false);}}>
   <div className={styles.menuHeader}><div><h2>읽기 메뉴</h2><p>{project.title}</p></div><button className={styles.menuClose} onClick={()=>{setTopOpen(false);trigger.current?.focus();}} aria-label="읽기 메뉴 닫기">닫기</button></div>
   <button data-menu-resume="true" className={styles.resume} onClick={()=>{setTopOpen(false);trigger.current?.focus();}}>계속 읽기<span aria-hidden="true">▶</span></button>
   <div className={styles.menuPair}><button disabled={disabled} onClick={()=>open('save')}>저장</button><button disabled={disabled} onClick={()=>open('load')}>불러오기</button></div>
   <div className={styles.menuNavigation}><button onClick={()=>open('settings')}>읽기 설정<span aria-hidden="true">›</span></button>{onFullscreen&&<button onClick={()=>{setTopOpen(false);trigger.current?.focus({preventScroll:true});onFullscreen();}}>{fullscreen?'전체 화면 해제':'전체 화면'}<span aria-hidden="true">⛶</span></button>}</div>
   <div className={styles.menuDestinations}><button disabled={disabled} onClick={()=>request({kind:'restart'})}>처음부터 읽기<span aria-hidden="true">↶</span></button>{onLibrary&&<button onClick={()=>request({kind:'library'})}>서재로 돌아가기<span aria-hidden="true">›</span></button>}{onExit&&<button onClick={()=>{setTopOpen(false);onExit();}}>이 컷 편집하기<span aria-hidden="true">›</span></button>}</div>
  </div>}
  {/* A transition card covers the whole stage; the tool row would sit over its button. */}
  {!toolsHidden&&<div style={{...barStyle,'--reader-tool-font-size':`${Math.max(10,Math.min(12,toolFontSizePx))}px`} as CSSProperties} className={styles.quick}>
   <button disabled={disabled} onClick={()=>open('log')}>지난기록</button>
   {!phone&&<><button disabled={disabled} onClick={()=>open('save')}>저장</button><button disabled={disabled} onClick={()=>open('load')}>불러오기</button><button disabled={disabled||!onAdvance} aria-pressed={auto} onClick={()=>setAuto(value=>!value)}>자동 넘기기 {auto?'켜짐':'꺼짐'}</button></>}
   <button disabled={disabled||saving} onClick={()=>save('quick')}>빠른 저장</button>
   {phone?<button disabled={disabled} onClick={()=>open('settings')}>설정</button>:<button disabled={disabled} onClick={()=>request({kind:'load',id:'quick'})}>빠른 불러오기</button>}
  </div>}
  {(notice||error&&!busy)&&<p className={styles.status} role={error?'alert':'status'}>{error||notice}</p>}
  <dialog ref={dialog} data-system-menu="player-dialog" data-chapter-history={panel==='log'&&!confirm?'true':undefined} className={styles.dialog} onKeyDown={event=>trapDialogTab(event,dialog.current)} onCancel={close} onClose={()=>{confirmationEpoch.current++;setPanel(null);setConfirm(null);setLibrarySaveFailed(false);returnFocus.current?.focus();}} aria-labelledby={titleId}>
   <div className={styles.header}><h2 id={titleId}>{confirm?confirmTitle:panel?titles[panel]:''}</h2><button onClick={close} aria-label="읽기 메뉴 닫기">닫기</button></div>
   {error&&<p role="alert" className={styles.error}>{error}</p>}{notice&&<p role="status">{notice}</p>}{saving&&<p role="status">읽던 진행을 저장하고 있어요.</p>}
   {confirm?<div className={styles.confirm}><p>{confirm.kind==='library'?(librarySaveFailed?'저장하지 않고 나가면 다음에 이어 읽을 때 예전에 저장한 위치에서 시작할 수 있어요. 작품 원고는 바뀌지 않아요.':'읽던 진행을 이 브라우저에 저장한 뒤 서재로 돌아가요.'):confirm.kind==='restart'?'지금까지의 선택을 지우고 처음부터 읽어요. 따로 저장한 진행은 그대로예요.':confirm.kind==='history'?'고른 장의 첫 컷으로 돌아가요. 그 컷부터 한 선택과 점수는 취소되고, 따로 저장한 진행은 그대로예요.':confirm.changed?'저장한 뒤 작품이 바뀌었어요. 바뀐 작품에 맞춰 이어서 읽어요.':confirm.kind==='overwrite'?'이 칸에 있던 저장을 지금 진행으로 바꿔요.':'저장한 컷으로 이동하고 그때의 선택도 함께 불러와요.'}</p><div><button disabled={saving} autoFocus onClick={cancelConfirmation}>취소</button>{confirm.kind==='library'&&librarySaveFailed&&<button disabled={saving} onClick={leaveWithoutProgress}>진행 저장 없이 서재로</button>}<button disabled={saving} onClick={confirmAction}>{confirm.kind==='overwrite'?'덮어쓰기':confirm.kind==='library'?'보관하고 서재로':confirm.kind==='restart'?'처음부터 읽기':confirm.changed?'변경된 작품에서 이어읽기':'확인'}</button></div></div>:<>
    {(panel==='save'||panel==='load')&&<><p>읽던 위치와 선택·점수를 저장해 나중에 이어 읽어요. 작품 파일 저장과는 달라요. 소리가 나오던 위치는 저장되지 않아요.</p><nav className={styles.pages} aria-label="저장 종류">{(['manual','auto','quick'] as const).map(value=><button key={value} aria-pressed={tab===value} onClick={()=>{setTab(value);setPage(1);}}>{value==='manual'?'직접 저장':value==='auto'?'자동 저장':'빠른 저장'}</button>)}</nav><div className={styles.slots}>{slotIds.map(id=>{const slot=saves.works[project.id]?.[String(id)],slotId=`${topMenuId}-slot-${id}`,changed=!!slot&&isPlayerSlotChanged(project,slot),descriptionIds=slot?[`${slotId}-preview`,`${slotId}-time`,`${slotId}-summary`,...(changed?[`${slotId}-changed`]:[])]:[`${slotId}-empty`];return <button key={id} className={styles.slot} data-player-slot={id} aria-describedby={descriptionIds.join(' ')} aria-label={typeof id==='number'?`${id}번 ${panel==='save'?'저장':'불러오기'}`:`${id==='auto'?'자동':'빠른'} 저장${panel==='load'?' 불러오기':''}`} disabled={saving||panel==='load'&&!slot||panel==='save'&&id==='auto'} onClick={()=>panel==='save'?save(id):request({kind:'load',id})}><strong>{id==='auto'?'자동 저장':id==='quick'?'빠른 저장':`${id}번`}</strong>{slot?<>{slot.thumbnail?<img id={`${slotId}-preview`} className={styles.thumbnail} src={slot.thumbnail.dataUrl} width={slot.thumbnail.width} height={slot.thumbnail.height} alt={`${slot.summary?.location||'저장한 컷'}의 실제 재생 화면`}/>:<span id={`${slotId}-preview`} className={styles.thumbnailFallback}>화면 이미지 없음 · 저장한 글로 확인</span>}<time id={`${slotId}-time`} dateTime={slot.savedAt}>{date(slot.savedAt)}</time><span id={`${slotId}-summary`}>{slotText(slot)}</span>{changed&&<span id={`${slotId}-changed`} className={styles.changed}>작품 변경됨 · 연결 확인 필요</span>}</>:<span id={`${slotId}-empty`}>빈 저장 위치</span>}</button>;})}</div>{tab==='manual'&&<nav className={styles.pages} aria-label="저장 페이지">{Array.from({length:maxPage},(_,index)=><button key={index} aria-pressed={page===index+1} onClick={()=>setPage(index+1)}>{index+1}쪽</button>)}</nav>}</>}
    {panel==='log'&&<section className={styles.historyBody} aria-label="이번 장의 지난기록">
     {history.previousChapters.length>0&&<nav className={styles.previousChapters} data-reader-previous-chapters="true" aria-label="이전 장부터 다시 읽기">{history.previousChapters.map(entry=>{const chapter=project.chapters.find(item=>item.id===entry.chapterId);return <button key={entry.chapterId} data-player-history-index={entry.pathIndex} onClick={()=>request({kind:'history',pathIndex:entry.pathIndex})}>{chapter?chapterLabel(chapter):'이전 장'} · 첫 컷부터 다시 읽기</button>;})}</nav>}
     <div className={styles.historyIntro}>{historyChapter&&<h3>{chapterLabel(historyChapter)}</h3>}<p>이번 장에서 읽은 글이에요. 이전 글은 위로 올려서 볼 수 있어요.</p></div>
     <div className={styles.historyScroll} ref={historyScroll} data-reader-history-scroll="true" tabIndex={0} role="region" aria-label="이번 장에서 읽은 글"><ol className={styles.log} data-reader-current-script="true">{history.entries.map(entry=><li key={entry.pathIndex}><strong>{entry.speaker}</strong><p className={styles.text}>{entry.textPending?'글을 불러오고 있어요.':entry.text||'빈 글'}</p>{entry.choiceLabel&&<p className={styles.choice}>선택: {entry.choiceLabel}</p>}</li>)}</ol>{!history.entries.length&&<p>읽은 기록을 찾지 못했어요.</p>}</div>
    </section>}
    {panel==='settings'&&<div className={styles.settings}>
     <section className={styles.settingsSection} aria-labelledby={`${id}-reading-display`}><h3 id={`${id}-reading-display`}>화면과 조작</h3>
      {onTapModeChange&&<label><span>화면 터치 방식</span><select value={tapMode} onChange={event=>updatePreferences({tapMode:event.target.value as ReaderTapMode})}><option value="next">화면 어디든 눌러 다음으로</option><option value="halves">왼쪽은 이전 · 오른쪽은 다음</option></select></label>}
      {onFormatChange&&<label><span>화면 비율</span><select value={format} onChange={event=>updatePreferences({format:event.target.value as ReaderFormat})}><option value="auto">자동</option><option value="landscape">가로 · 16:9</option><option value="portrait">세로 · 9:16</option></select></label>}
      {onTextScaleChange&&<label><span>본문 글씨 크기</span><select value={textScale} onChange={event=>updatePreferences({textScale:Number(event.target.value)})}><option value={.9}>작게 · 90%</option><option value={1}>보통 · 100%</option><option value={1.15}>크게 · 115%</option><option value={1.3}>더 크게 · 130%</option></select></label>}
      {onReducedMotion&&<button aria-pressed={reducedMotion} disabled={motionDisabled} onClick={onReducedMotion}>동작 줄이기 · {reducedMotion?'켜짐':'꺼짐'}</button>}
     </section>
     {onImagePreloadChange&&<details className={styles.settingsSection} aria-labelledby={`${id}-reading-images`}><summary><h3 id={`${id}-reading-images`}>그림 미리 받기 · {imagePreloadMode==='upcoming'?`다음 ${imagePreloadCount}컷`:imagePreloadMode==='chapter'?'현재 장':imagePreloadMode==='work'?'작품 전체':'끔'}</h3></summary>
      <label><span>이미지 미리 받기</span><select aria-label="이미지 미리 받기" value={imagePreloadMode} onChange={event=>{setImagePreloadInput({count:imagePreloadCount,value:String(preferences.current.imagePreloadCount)});updatePreferences({imagePreloadMode:event.target.value as ImagePreloadMode});}}><option value="upcoming">다음 컷 미리 받기</option><option value="chapter">현재 장 미리 받기</option><option value="work">작품 전체 미리 받기</option><option value="none">미리 받지 않기</option></select></label>
      {imagePreloadMode==='upcoming'&&<><label><span>미리 받을 컷 수</span><span className={styles.unitField}><input aria-label="미리 받을 컷 수" aria-describedby={!imagePreloadDraftValid?`${id}-image-count-error`:undefined} aria-invalid={!imagePreloadDraftValid} type="number" min="1" max="10" step="1" value={imagePreloadDraft} onChange={event=>{const value=event.target.value;setImagePreloadInput({count:imagePreloadCount,value});if(/^[1-9]\d*$/.test(value)&&Number(value)<=10)updatePreferences({imagePreloadCount:Number(value)});}}/><span>컷</span></span></label>{!imagePreloadDraftValid&&<p id={`${id}-image-count-error`} role="alert">1에서 10 사이의 숫자를 넣어 주세요. 아직 설정에 반영되지 않았어요.</p>}</>}
      <p>읽는 동안 다음 그림을 미리 받아 두면 장면이 바로 바뀌어요. 미리 받지 않으면 잠깐 흐린 그림이 먼저 보일 수 있어요. 이 설정은 이 브라우저에만 저장돼요.</p>
     </details>}
     <section className={styles.settingsSection} aria-labelledby={`${id}-reading-auto`}><h3 id={`${id}-reading-auto`}>자동 넘기기</h3>
      <button className={styles.autoToggle} disabled={disabled||!onAdvance} aria-pressed={auto} onClick={()=>setAuto(value=>!value)}>자동 넘기기 · {auto?'켜짐':'꺼짐'}</button>
      <label><span>자동 넘기기 대기 시간</span><span className={styles.unitField}><input type="number" min="1" max="30" step=".5" value={delay} onChange={event=>updatePreferences({autoDelaySeconds:autoForwardDelay(Number(event.target.value))/1000})}/><span>초</span></span></label>
     </section>
     <section className={styles.settingsSection} aria-labelledby={`${id}-reading-progress`}><h3 id={`${id}-reading-progress`}>읽던 진행</h3><div className={styles.settingsActions} aria-label="읽기 작업"><button disabled={disabled} onClick={()=>open('save')}>저장</button><button disabled={disabled} onClick={()=>open('load')}>불러오기</button><button disabled={disabled} onClick={()=>request({kind:'load',id:'quick'})}>빠른 불러오기</button></div></section>
     <details className={styles.settingsHelp}><summary>설정 도움말</summary><p>한 컷의 글이 여러 페이지면 글 페이지를 먼저 넘겨요. 선택지와 메뉴는 해당 버튼으로 조작해요.</p><p>자동 넘기기는 연출이 끝난 뒤에 시작돼요. 눌러야 시작되는 효과와 선택지는 직접 눌러 진행해요.</p><p>글씨 크기는 이야기 본문에 적용돼요. 읽기 설정은 이 브라우저에 보관해요.</p></details>
     <button className={styles.resetSettings} onClick={()=>updatePreferences({textScale:1,autoDelaySeconds:3})}>글씨 크기·대기 시간 기본값으로</button>
    </div>}

   </>}
  </dialog>
 </div>;
 return stageContainer?createPortal(content,stageContainer):content;
}
