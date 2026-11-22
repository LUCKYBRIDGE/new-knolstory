'use client';
/* eslint-disable @next/next/no-img-element -- candidate thumbnails are registered still images */
import Link from 'next/link';
import {useEffect,useMemo,useRef,useState} from 'react';
import {resolveAsset} from '@knolstory/asset-registry';
import {chapterInsertPlaces,compileStoryScene,convertPicturebookToChapters,PicturebookConversionError,type PicturebookPageStage} from '@knolstory/runtime-core';
import {chapterLabel,type StoryProject} from '@knolstory/story-domain';
import type {ShortStoryProject} from '@knolstory/compatibility';
import {PicturebookArt} from '../../components/picturebook-art';
import {StoryLoading} from '../../components/story-loading';
import {useStoryRuntime} from '../../components/story-workspace-runtime';
import {useClassroomMe} from '../../components/use-classroom-me';
import {SHORTSTORY_LIBRARY_KEY,parseShortStoryLibrary} from '../../lib/shortstory-library';
import {readWorkspace,WORKSPACE_KEY} from '../../lib/workspace-storage';
import {storySceneLayout} from '../../lib/story-viewport';
import {
 chooseAlternative,clearPreparationDraft,confirmedStages,effectiveMode,pageStage,planPicturebook,
 readPreparationDraft,recipeSlots,revertPage,reviewRecipeSource,sendSummary,writePreparationDraft,type PageSelection,type Selections,
} from '../../lib/picturebook-preparation';
import {picturebookOwnerScope,picturebookSends,savePicturebookRequest,sentPagePlaces,type PicturebookSend,type PicturebookTarget,type SentPlace} from '../../lib/picturebook-links';
import styles from './picturebook.module.css';
import {AssetPreviewImage} from '../../components/asset-preview-image';

type Loaded=Readonly<{book:ShortStoryProject;startPageId:string}>|Readonly<{error:string}>;
const PENDING_PREFIX='knolstory-picturebook-pending-v1:';
/** Same request and planned work for this book while this tab retries, so one click never sends twice. */
function pendingRequest(bookId:string):{requestId:string;workId:string}{
 try{const value=JSON.parse(sessionStorage.getItem(PENDING_PREFIX+bookId)??'null') as {requestId?:unknown;workId?:unknown}|null;
  if(value&&typeof value.requestId==='string'&&typeof value.workId==='string')return {requestId:value.requestId,workId:value.workId};}catch{/* A fresh pair below. */}
 const pair={requestId:crypto.randomUUID(),workId:crypto.randomUUID()};
 try{sessionStorage.setItem(PENDING_PREFIX+bookId,JSON.stringify(pair));}catch{/* The send record still stops a second send. */}
 return pair;
}
type DeviceWorks=Readonly<{works:Record<string,StoryProject>;sends:readonly PicturebookSend[]}>;
const modeLabel={recipe:'숏스토리 추천',student:'내가 고른 배경·인물',reference:'삽화만 참고'} as const;

export function PicturebookPreparation(){
 const [loaded,setLoaded]=useState<Loaded|null>(null);
 const [selections,setSelections]=useState<Selections>({});
 const [pageId,setPageId]=useState('');
 const [orientation,setOrientation]=useState<'landscape'|'portrait'>('landscape');
 const [showAlternatives,setShowAlternatives]=useState(false);
 const [device,setDevice]=useState<DeviceWorks>({works:{},sends:[]});
 const [deviceError,setDeviceError]=useState('');
 /** Pages to send; null until the book is read (then every page). */
 const [chosen,setChosen]=useState<string[]|null>(null);
 const [target,setTarget]=useState<'new'|'existing'>('new');
 const [targetWork,setTargetWork]=useState('');
 const [afterChapter,setAfterChapter]=useState<string|null|undefined>(undefined);
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const [displaySize,setDisplaySize]=useState({width:1280,height:720});
 const [revision,setRevision]=useState(0);
 const classroom=useClassroomMe();
 const accountSettled=!classroom.loading&&!classroom.error;
 const ownerScope=picturebookOwnerScope(classroom.session?.accountId??null);
 const permissions=useMemo(()=>({images:classroom.permissions.images,characters:classroom.permissions.images&&classroom.permissions.characters}),[classroom.permissions.images,classroom.permissions.characters]);
 const canCreate=classroom.permissions.newWorks&&!classroom.permissions.forcedStoryKey;
 const forcedWork=classroom.permissions.forcedStoryKey;
 // Reviewer preview of recipes under assembly review: never creates a work.
 const [reviewMode,setReviewMode]=useState(false);
 useEffect(()=>{const timer=window.setTimeout(()=>setReviewMode(new URLSearchParams(location.search).get('review')==='recipes'),0);return()=>window.clearTimeout(timer);},[]);
 const heading=useRef<HTMLHeadingElement>(null);

 // The picture book is read, never written, here: the picture-book screen saved it before coming.
 useEffect(()=>{const timer=window.setTimeout(()=>{
  try{
   const params=new URLSearchParams(location.search),bookId=params.get('book');
   const raw=localStorage.getItem(SHORTSTORY_LIBRARY_KEY);
   const book=raw===null?undefined:parseShortStoryLibrary(raw).books.find(item=>item.id===bookId);
   if(!book){setLoaded({error:'내 그림책에서 찾지 못했어요. 그림책 보관함에서 다시 골라 주세요. 원본 그림책은 ‘내 사본으로 쓰기’ 뒤에 보낼 수 있어요.'});return;}
   const draft=readPreparationDraft(sessionStorage,book.id);
   const requested=params.get('page');
   const start=book.pages.find(page=>page.id===requested)??book.pages.find(page=>page.id===draft.pageId)??book.pages[0]!;
   setSelections(Object.fromEntries(Object.entries(draft.selections).filter(([id])=>book.pages.some(page=>page.id===id))));
   const kept=draft.chosen?.filter(id=>book.pages.some(page=>page.id===id));
   setChosen(kept&&kept.length?book.pages.map(page=>page.id).filter(id=>kept.includes(id)):book.pages.map(page=>page.id));
   setPageId(start.id);setLoaded({book,startPageId:start.id});
  }catch{setLoaded({error:'그림책 보관함을 읽지 못했어요. 그림책 화면에서 보관함을 확인해 주세요.'});}
 },0);return()=>window.clearTimeout(timer);},[]);
 const book='book' in (loaded??{})?(loaded as {book:ShortStoryProject}).book:null;
 // Works on this device (to put pages into) and where this owner already sent pages of this book.
 useEffect(()=>{
  if(!book||!accountSettled)return;
  const timer=window.setTimeout(()=>{
   try{const raw=localStorage.getItem(WORKSPACE_KEY);
    const loaded=raw===null?{works:{},picturebookLinks:{}}:readWorkspace(raw);
    const sends=picturebookSends(loaded.picturebookLinks,ownerScope,book.id);
    setDevice({works:loaded.works,sends});setDeviceError('');
    // A finished send ends this tab's pending request; the next send starts fresh.
    try{const pending=JSON.parse(sessionStorage.getItem(PENDING_PREFIX+book.id)??'null') as {requestId?:string}|null;
     if(pending?.requestId&&sends.some(send=>send.requestId===pending.requestId))sessionStorage.removeItem(PENDING_PREFIX+book.id);}catch{/* Nothing to forget. */}}
   catch{setDeviceError('놀스토리 보관함을 읽지 못해 쓰던 작품을 확인하지 못했어요. 새 놀스토리로만 보낼 수 있어요.');}
  },0);return()=>window.clearTimeout(timer);
 },[book,accountSettled,ownerScope]);
 useEffect(()=>{if(book&&pageId)writePreparationDraft(sessionStorage,book.id,selections,pageId,chosen);},[book,selections,pageId,chosen]);
 useEffect(()=>{if(book)heading.current?.focus();},[book]);

 const plans=useMemo(()=>book?planPicturebook(book,permissions,reviewMode?reviewRecipeSource():undefined):[],[book,permissions,reviewMode]);
 const stages=useMemo(()=>Object.fromEntries(plans.map(plan=>[plan.pageId,pageStage(plan,selections[plan.pageId])])) as Record<string,PicturebookPageStage>,[plans,selections]);
 // The preview is the same conversion that creation runs, with throwaway IDs.
 const preview=useMemo(()=>{
  if(!book)return null;
  let count=0;
  try{return {conversion:convertPicturebookToChapters({book,stages,workId:'picturebook-preview',createId:()=>`preview-${++count}`,updatedAt:book.updatedAt})};}
  catch(issue){return {issue:issue instanceof PicturebookConversionError?issue.issues.map(item=>item.pageNumber?`${item.pageNumber}쪽: ${item.message}`:item.message):[issue instanceof Error?issue.message:'그림책을 장으로 나누지 못했어요.']};}
 },[book,stages]);
 const conversion=preview&&'conversion' in preview?preview.conversion:null;
 const current=plans.find(plan=>plan.pageId===pageId)??plans[0];
 const currentLine=conversion?.chapters.find(item=>item.pageId===current?.pageId)?.lineId;
 const fallbackProject=useMemo(()=>convertPicturebookToChapters({book:{id:'empty',title:'그림책',description:'',authorDisplayName:'',pages:[{id:'empty',order:1,title:'',text:'',backgroundId:'',leftAssetId:'',rightAssetId:''}]},stages:{},workId:'picturebook-empty',createId:(()=>{let n=0;return ()=>`empty-${++n}`;})(),updatedAt:'2026-11-20T00:00:00.000Z'}),[]);
 const sceneProject=conversion&&currentLine?conversion.project:fallbackProject.project;
 const sceneLine=conversion&&currentLine?currentLine:fallbackProject.chapters[0]!.lineId;
 const mode=orientation==='portrait'?'play':'edit';
 // Every new page or choice is a new scene revision; the runtime skips a revision it already drew.
 useEffect(()=>{const timer=window.setTimeout(()=>setRevision(value=>value+1),0);return()=>window.clearTimeout(timer);},[sceneProject,sceneLine]);
 const scene=useMemo(()=>{
  const compiled=compileStoryScene(sceneProject,sceneLine,revision,{mode,...storySceneLayout(mode,orientation,displaySize),dialogueDock:{bottomInsetPx:0,safeBottomPx:0},...(mode==='play'?{playbackPath:[sceneLine]}:{})});
  return {...compiled,audio:{...compiled.audio!,sessionId:'picturebook-preview'},presentationEntry:'0'};
 },[sceneProject,sceneLine,revision,mode,orientation,displaySize]);
 const {attachContainer,frame,frameKey,frameSource,fit,ready:runtimeReady,recoverable,loadProgress,status:runtimeStatus,retry,rendered}=useStoryRuntime(scene,false,()=>{},size=>{setDisplaySize(value=>value.width===size.width&&value.height===size.height?value:size);setRevision(value=>value+1);},true);

 // Trying every place runs the story checks, so only when the chosen work changes (not on every stage redraw).
 const insertPlaces=useMemo(()=>{const work=target==='existing'?device.works[targetWork]:undefined;return work?chapterInsertPlaces(work):[];},[target,targetWork,device]);
 if(!loaded)return <main className={styles.shell}><StoryLoading/></main>;
 if('error' in loaded||!book||!current)return <main className={styles.shell}><p role="alert" className={styles.alert}>{'error' in loaded?loaded.error:'그림책을 열지 못했어요.'}</p><Link className={styles.textLink} href="/shortstory?mode=library">그림책 보관함으로 돌아가기</Link></main>;

 const selection=selections[current.pageId];
 const currentMode=effectiveMode(current,selection);
 const slots=currentMode==='recipe'?recipeSlots(current,selection):[];
 const startNumber=plans.findIndex(plan=>plan.pageId===current.pageId)+1;
 const page=book.pages[startNumber-1]!;
 const changed=!!selection&&selection.mode!=='default';
 const setPage=(id:string)=>{setPageId(id);setShowAlternatives(false);setError('');};
 const select=(next:PageSelection)=>{setSelections(value=>({...value,[current.pageId]:next}));setError('');};

 // Which pages go, and where.
 const picked=book.pages.map(item=>item.id).filter(id=>(chosen??[]).includes(id));
 const pickedNumbers=book.pages.flatMap((item,index)=>picked.includes(item.id)?[index+1]:[]);
 const toggle=(id:string)=>setChosen(value=>{const now=value??[];return now.includes(id)?now.filter(item=>item!==id):book.pages.map(item=>item.id).filter(item=>item===id||now.includes(item));});
 // The work this book was last sent to comes first, then the most recently changed works.
 const lastSent=[...device.sends].reverse().find(item=>device.works[item.workKey])?.workKey;
 const workEntries=Object.entries(device.works).filter(([key])=>!forcedWork||key===forcedWork).sort(([ka,a],[kb,b])=>(kb===lastSent?1:0)-(ka===lastSent?1:0)||b.updatedAt.localeCompare(a.updatedAt));
 const into=target==='existing'?device.works[targetWork]:undefined;
 const places=into?insertPlaces:[];
 const chapterCount=into?.chapters.length??0;
 const place=places.find(item=>item.afterChapterId===(afterChapter===undefined?[...places].reverse().find(option=>option.ok)?.afterChapterId:afterChapter));
 const placeIndex=place?places.indexOf(place):0;
 const positional=!!into&&into.chapters.every(chapter=>!chapter.branchLabel?.trim()&&(chapter.chapterNumber===undefined||chapter.chapterNumber===chapter.order));
 const summaryText=sendSummary(pickedNumbers,book.pages.length,target==='new'?{kind:'new'}:{kind:'existing',title:into?.title||'제목 없는 작품',afterLabel:place?.afterChapterId?chapterLabel(into!.chapters.find(chapter=>chapter.id===place.afterChapterId)!).split(' · ')[0]!:null,index:placeIndex,chapterCount,renumbers:positional});
 const sentPlaces=sentPagePlaces(device.sends,device.works);
 const sentLabel=(list:readonly SentPlace[]|undefined)=>{
  if(!list?.length)return '';
  if(list.length>1)return `보냄 · ${new Set(list.map(item=>item.workKey)).size>1?`${new Set(list.map(item=>item.workKey)).size}개 작품`:`${list.length}번`}`;
  const work=device.works[list[0]!.workKey],chapter=work?.chapters.find(item=>item.id===list[0]!.chapterId);
  return work&&chapter?`보냄 · ‘${work.title||'제목 없는 작품'}’ ${chapterLabel(chapter).split(' · ')[0]}`:'보냄';
 };
 const sentWorks=[...new Set(device.sends.map(send=>send.workKey))].filter(key=>device.works[key]).map(key=>({key,title:device.works[key]!.title||'제목 없는 작품',pages:new Set(device.sends.filter(send=>send.workKey===key).flatMap(send=>Object.keys(send.pages)).filter(id=>sentPlaces[id]?.some(item=>item.workKey===key))).size}));
 const startPage=picked.includes(current.pageId)?current.pageId:picked[0];

 const blockedReason=reviewMode?'검토용 미리보기예요. 승인 전 조합이 들어 있어 놀스토리로 보낼 수 없어요.':!accountSettled?(classroom.loading?'계정과 학급 정보를 확인하고 있어요.':'계정과 학급 정보를 확인하지 못해 놀스토리로 보낼 수 없어요. 연결을 확인한 뒤 다시 열어 주세요.')
  :!picked.length?'보낼 쪽을 하나 이상 골라 주세요.'
  :target==='new'&&!canCreate?(forcedWork?'선생님이 정한 작품에만 넣을 수 있어요. ‘쓰던 놀스토리에 넣기’를 골라 주세요.':'선생님이 새 작품 만들기를 막아 두었어요. 쓰던 놀스토리에 넣을 수는 있어요.')
  :target==='existing'&&!into?'넣을 놀스토리를 골라 주세요.'
  :target==='existing'&&!place?.ok?(place?.reason??'넣을 자리를 골라 주세요.')
  :(!conversion?'아래 쪽을 고친 뒤 다시 보내 주세요.':'');
 const send=()=>{
  if(busy||blockedReason||!startPage)return;
  setBusy(true);setError('');
  try{
   const confirmed=confirmedStages(book,Object.fromEntries(Object.entries(selections).filter(([id])=>picked.includes(id))),permissions);
   const pending=pendingRequest(book.id);
   const goal:PicturebookTarget=target==='new'?{kind:'new'}:{kind:'existing',workKey:targetWork,afterChapterId:place!.afterChapterId};
   savePicturebookRequest(localStorage,{...pending,ownerScope,createdAt:new Date().toISOString(),book,pageIds:picked,startPageId:startPage,stages:confirmed,target:goal});
   clearPreparationDraft(sessionStorage,book.id);
   location.assign(`/?picturebook=${encodeURIComponent(pending.requestId)}`);
  }catch(issue){
   setBusy(false);
   setError(issue instanceof DOMException&&issue.name==='QuotaExceededError'?'브라우저 저장 공간이 부족해 보내기를 시작하지 못했어요. 그림책과 기존 작품은 그대로예요.':issue instanceof Error?issue.message:'보내기를 시작하지 못했어요.');
  }
 };
 const openWork=(workKey:string)=>location.assign(`/?picturebookWork=${encodeURIComponent(workKey.slice('new:'.length))}`);

 return <main className={styles.shell}>
  <header className={styles.header}>
   <Link className={styles.textLink} href="/shortstory">그림책으로 돌아가기</Link>
   <p className={styles.eyebrow}>놀스토리로 보내기</p>
   <h1 ref={heading} tabIndex={-1}>{book.title||'제목 없는 그림책'}</h1>
   {reviewMode&&<p className={styles.reviewBadge} data-testid="picturebook-review-mode">검토용 미리보기 · 승인 전 조합 포함 · 학생 화면과 달라요</p>}
   <p>그림책의 쪽 하나가 놀스토리의 장 하나가 돼요. 보낼 쪽과 보낼 곳을 고르고, 쪽마다 첫 무대를 정해요.</p>
  </header>
  {sentWorks.length>0&&<section className={styles.notice} aria-label="이 그림책에서 보낸 놀스토리">
   <p>이 그림책에서 보낸 놀스토리예요. 그림책을 고친 내용은 보낸 장에 자동으로 들어가지 않아요.</p>
   <ul className={styles.sentList}>{sentWorks.map(work=><li key={work.key}><span>‘{work.title}’ · {work.pages}쪽 보냄</span><button onClick={()=>openWork(work.key)}>열기</button></li>)}</ul>
  </section>}
  {deviceError&&<p role="alert" className={styles.alert}>{deviceError}</p>}
  {preview&&'issue' in preview&&<section role="alert" className={styles.alert}><p>그림책을 장으로 나누지 못했어요. 그림책은 그대로예요.</p><ul>{preview.issue!.map(item=><li key={item}>{item}</li>)}</ul></section>}
  <div className={styles.layout}>
   <section className={styles.pagePanel} aria-label="보낼 쪽 고르기">
    <div className={styles.pickTools}><strong>보낼 쪽 · {picked.length}/{book.pages.length}</strong>
     <button onClick={()=>setChosen(book.pages.map(item=>item.id))} disabled={picked.length===book.pages.length}>모두 고르기</button>
     <button onClick={()=>setChosen([])} disabled={!picked.length}>모두 빼기</button></div>
    <ul className={styles.pages}>
     {plans.map(plan=>{const item=book.pages.find(value=>value.id===plan.pageId)!,itemMode=effectiveMode(plan,selections[plan.pageId]),on=picked.includes(plan.pageId),sent=sentLabel(sentPlaces[plan.pageId]);
      return <li key={plan.pageId} data-picked={on}>
       <label className={styles.pick}><input type="checkbox" checked={on} onChange={()=>toggle(plan.pageId)} aria-label={`${plan.pageNumber}쪽 보내기`}/></label>
       <button aria-current={plan.pageId===current.pageId?'page':undefined} onClick={()=>setPage(plan.pageId)}>
        {(()=>{const thumb=resolveAsset(item.backgroundId)??resolveAsset(item.leftAssetId)??resolveAsset(item.rightAssetId);return thumb?<AssetPreviewImage asset={thumb}/>:<span className={styles.noThumb} aria-hidden="true"/>;})()}
        <span><span>{plan.pageNumber}쪽 · {plan.title||'제목 없는 쪽'}</span><small data-mode={itemMode}>{on?modeLabel[itemMode]:'보내지 않아요'}</small>{sent&&<small data-sent>{sent}</small>}</span>
       </button>
      </li>;})}
    </ul>
   </section>
   <section className={styles.focus} aria-label={`${startNumber}쪽 첫 무대`}>
    {!picked.includes(current.pageId)&&<p className={styles.hint} data-testid="picturebook-not-picked">{startNumber}쪽은 보내지 않아요. 보내려면 쪽 목록에서 체크해 주세요.</p>}
    <div className={styles.compare}>
     <figure><figcaption>그림책 {startNumber}쪽</figcaption><PicturebookArt backgroundId={page.backgroundId} leftAssetId={page.leftAssetId} rightAssetId={page.rightAssetId} label={`그림책 ${startNumber}쪽 삽화`}/><p className={styles.pageText}>{page.text||'이 쪽에는 글이 없어요.'}</p></figure>
     <figure><figcaption>첫 컷 미리보기 · {modeLabel[currentMode]}</figcaption>
      <div className={styles.orientation} role="group" aria-label="미리보기 화면">
       <button aria-pressed={orientation==='landscape'} onClick={()=>{setOrientation('landscape');setRevision(v=>v+1);}}>가로 편집 화면</button>
       <button aria-pressed={orientation==='portrait'} onClick={()=>{setOrientation('portrait');setRevision(v=>v+1);}}>세로 읽기 화면</button>
      </div>
      <div className={orientation==='portrait'?`${styles.stage} ${styles.portrait}`:styles.stage} ref={attachContainer} data-testid="picturebook-stage">
       <iframe key={frameKey} ref={frame} src={frameSource} title="첫 컷 Ren’Py 무대 미리보기" data-testid="picturebook-runtime-frame" tabIndex={-1}
        style={{position:'absolute',border:0,display:'block',left:fit.offsetX,top:fit.offsetY,width:scene.width,height:scene.height,transform:`scale(${fit.scale})`,transformOrigin:'0 0',pointerEvents:'none'}}/>
       {(!runtimeReady||recoverable)&&<StoryLoading stage progress={loadProgress} recovery={recoverable?{message:runtimeStatus,onRetry:retry,onEdit:()=>retry()}:undefined}/>}
      </div>
      <p className={styles.status} role="status" data-testid="picturebook-stage-status" data-rendered-revision={rendered} data-scene-revision={scene.revision} data-background={scene.background?.imagePath??''} data-actors={JSON.stringify(scene.actors.map(actor=>actor.id))}>{currentMode==='reference'?'빈 무대로 시작해요. 무대는 편집 화면에서 꾸며요.':runtimeReady?'실제 무대로 보여 줘요.':'무대를 준비하고 있어요.'}</p>
     </figure>
    </div>
    <p className={styles.reason}>{current.reason}</p>
    <fieldset className={styles.choices}><legend>{startNumber}쪽의 첫 무대</legend>
     {current.approved&&current.recipe?.stage&&permissions.images&&<label><input type="radio" name="start" checked={currentMode==='recipe'} onChange={()=>select({mode:'recipe',overrides:selection?.mode==='recipe'?selection.overrides:{}})}/>숏스토리 추천 무대로 시작하기</label>}
     {current.student&&<label><input type="radio" name="start" checked={currentMode==='student'} onChange={()=>select({mode:'student'})}/>그림책에 고른 배경·인물로 시작하기</label>}
     <label><input type="radio" name="start" checked={currentMode==='reference'} onChange={()=>select({mode:'reference'})}/>삽화만 참고하고 빈 무대로 시작하기</label>
    </fieldset>
    {currentMode==='recipe'&&slots.some(slot=>slot.alternatives.length>0)&&<div className={styles.alternatives}>
     <button aria-expanded={showAlternatives} onClick={()=>setShowAlternatives(value=>!value)}>{showAlternatives?'다른 그림 닫기':'다른 그림 보기'}</button>
     {showAlternatives&&slots.filter(slot=>slot.alternatives.length>0||slot.grouped).map(slot=><fieldset key={slot.slot}><legend>{slot.side==='background'?'배경':slot.grouped?'함께 그린 인물':'인물'} · 지금: {slot.label}</legend>
      {[{assetId:slot.suggested,label:`추천 · ${resolveAsset(slot.suggested)?.label??slot.suggested}`},...slot.alternatives].map(option=>{
       const asset=resolveAsset(option.assetId);
       let blocked='';try{chooseAlternative(current,selection,slot.slot,option.assetId);}catch(issue){blocked=issue instanceof Error?issue.message:'고를 수 없어요.';}
       return <label key={option.assetId} className={styles.candidate} title={blocked||undefined}><input type="radio" name={`slot-${slot.slot}`} disabled={!!blocked} checked={slot.current===option.assetId} onChange={()=>{try{select(chooseAlternative(current,selection,slot.slot,option.assetId));}catch(issue){setError(issue instanceof Error?issue.message:'고를 수 없어요.');}}}/>{asset&&<AssetPreviewImage asset={asset}/>}<span>{option.label}</span></label>;
      })}
     </fieldset>)}
     <p className={styles.hint}>더 많은 그림은 놀스토리 편집 화면의 자료 고르기에서 바꿀 수 있어요.</p>
    </div>}
    {changed&&<button onClick={()=>setSelections(value=>revertPage(value,current.pageId))}>이 쪽만 추천대로 되돌리기</button>}
   </section>
  </div>
  <section className={styles.destination} aria-label="보낼 곳">
   <fieldset className={styles.choices}><legend>보낼 곳</legend>
    <label><input type="radio" name="target" checked={target==='new'} onChange={()=>setTarget('new')}/>새 놀스토리 만들기</label>
    <label><input type="radio" name="target" checked={target==='existing'} disabled={!workEntries.length} onChange={()=>{setTarget('existing');if(!targetWork&&workEntries[0])setTargetWork(workEntries[0][0]);setAfterChapter(undefined);}}/>쓰던 놀스토리에 넣기{!workEntries.length&&<small> · 이 기기에 놀스토리 작품이 없어요</small>}</label>
   </fieldset>
   {target==='existing'&&<div className={styles.targetFields}>
    <label>넣을 작품<select aria-label="넣을 작품" value={targetWork} onChange={event=>{setTargetWork(event.target.value);setAfterChapter(undefined);}}>
     {workEntries.map(([key,work])=><option key={key} value={key}>{work.title||'제목 없는 작품'} · {work.chapters.length}장</option>)}
    </select></label>
    {into&&<label>넣을 자리<select aria-label="넣을 자리" value={place?.afterChapterId??''} onChange={event=>setAfterChapter(event.target.value||null)}>
     {places.map(option=><option key={option.afterChapterId??''} value={option.afterChapterId??''} disabled={!option.ok}>{option.label}{option.ok?'':' · 넣을 수 없어요'}</option>)}
    </select></label>}
   </div>}
  </section>
  {error&&<p role="alert" className={styles.alert}>{error}</p>}
  <footer className={styles.footer}>
   {/* Always in sight: what pressing the button will do, or why it cannot yet. */}
   <div className={styles.footerText}>
    <p className={styles.sendSummary} data-testid="picturebook-summary">{summaryText}</p>
    {blockedReason&&blockedReason!==summaryText&&<p className={styles.hint} data-testid="picturebook-blocked">{blockedReason}</p>}
   </div>
   <Link className={styles.textLink} href="/shortstory">취소</Link>
   <button className={styles.primary} disabled={busy||!!blockedReason} onClick={send}>{busy?'보내는 중이에요':'놀스토리로 보내기'}</button>
  </footer>
 </main>;
}
