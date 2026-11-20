'use client';
/* eslint-disable @next/next/no-img-element -- candidate thumbnails are registered still images */
import Link from 'next/link';
import {useEffect,useMemo,useRef,useState} from 'react';
import {resolveAsset} from '@knolstory/asset-registry';
import {compileStoryScene,convertPicturebookToChapters,PicturebookConversionError,type PicturebookPageStage} from '@knolstory/runtime-core';
import type {ShortStoryProject} from '@knolstory/compatibility';
import {PicturebookArt} from '../../components/picturebook-art';
import {StoryLoading} from '../../components/story-loading';
import {useStoryRuntime} from '../../components/story-workspace-runtime';
import {useClassroomMe} from '../../components/use-classroom-me';
import {SHORTSTORY_LIBRARY_KEY,parseShortStoryLibrary} from '../../lib/shortstory-library';
import {WORKSPACE_KEY} from '../../lib/workspace-storage';
import {storySceneLayout} from '../../lib/story-viewport';
import {
 chooseAlternative,clearPreparationDraft,confirmedStages,effectiveMode,pageStage,planPicturebook,preparationSummary,
 readPreparationDraft,recipeSlots,revertPage,reviewRecipeSource,writePreparationDraft,type PageSelection,type Selections,
} from '../../lib/picturebook-preparation';
import {peekPicturebookLinks,picturebookLinkState,picturebookOwnerScope,savePicturebookRequest,type PicturebookLinkState} from '../../lib/picturebook-links';
import styles from './picturebook.module.css';

type Loaded=Readonly<{book:ShortStoryProject;startPageId:string}>|Readonly<{error:string}>;
const PENDING_PREFIX='knolstory-picturebook-pending-v1:';
/** Same request and planned work for this book while this tab retries, so one click never becomes two works. */
function pendingRequest(bookId:string,fresh:boolean):{requestId:string;workId:string}{
 // ‘새 놀스토리로 만들기’ after a deleted or missing work always gets a new work ID.
 if(fresh)try{sessionStorage.removeItem(PENDING_PREFIX+bookId);}catch{/* A fresh pair below. */}
 try{const value=JSON.parse(sessionStorage.getItem(PENDING_PREFIX+bookId)??'null') as {requestId?:unknown;workId?:unknown}|null;
  if(value&&typeof value.requestId==='string'&&typeof value.workId==='string')return {requestId:value.requestId,workId:value.workId};}catch{/* A fresh pair below. */}
 const pair={requestId:crypto.randomUUID(),workId:crypto.randomUUID()};
 try{sessionStorage.setItem(PENDING_PREFIX+bookId,JSON.stringify(pair));}catch{/* The workspace link still prevents a second work. */}
 return pair;
}
const modeLabel={recipe:'추천 무대',student:'직접 꾸민 무대',reference:'원화 참고만'} as const;

export function PicturebookPreparation(){
 const [loaded,setLoaded]=useState<Loaded|null>(null);
 const [selections,setSelections]=useState<Selections>({});
 const [pageId,setPageId]=useState('');
 const [orientation,setOrientation]=useState<'landscape'|'portrait'>('landscape');
 const [showAlternatives,setShowAlternatives]=useState(false);
 const [linkState,setLinkState]=useState<PicturebookLinkState>({kind:'none'});
 const [linkError,setLinkError]=useState('');
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const [displaySize,setDisplaySize]=useState({width:1280,height:720});
 const [revision,setRevision]=useState(0);
 const classroom=useClassroomMe();
 const accountSettled=!classroom.loading&&!classroom.error;
 const ownerScope=picturebookOwnerScope(classroom.session?.accountId??null);
 const permissions=useMemo(()=>({images:classroom.permissions.images,characters:classroom.permissions.images&&classroom.permissions.characters}),[classroom.permissions.images,classroom.permissions.characters]);
 const canCreate=classroom.permissions.newWorks&&!classroom.permissions.forcedStoryKey;
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
   if(!book){setLoaded({error:'내 그림책에서 찾지 못했어요. 그림책 보관함에서 다시 골라 주세요. 원본 그림책은 ‘내 사본으로 쓰기’ 뒤에 펼칠 수 있어요.'});return;}
   const draft=readPreparationDraft(sessionStorage,book.id);
   const requested=params.get('page');
   const start=book.pages.find(page=>page.id===requested)??book.pages.find(page=>page.id===draft.pageId)??book.pages[0]!;
   setSelections(Object.fromEntries(Object.entries(draft.selections).filter(([id])=>book.pages.some(page=>page.id===id))));
   setPageId(start.id);setLoaded({book,startPageId:start.id});
  }catch{setLoaded({error:'그림책 보관함을 읽지 못했어요. 그림책 화면에서 보관함을 확인해 주세요.'});}
 },0);return()=>window.clearTimeout(timer);},[]);
 const book='book' in (loaded??{})?(loaded as {book:ShortStoryProject}).book:null;
 // Whether this owner already made a KnolStory from this book on this device.
 useEffect(()=>{
  if(!book||!accountSettled)return;
  const timer=window.setTimeout(()=>{
   try{const peek=peekPicturebookLinks(localStorage.getItem(WORKSPACE_KEY));const state=picturebookLinkState(peek.links,peek.workKeys,peek.deletedKey,ownerScope,book.id);setLinkState(state);setLinkError('');
    // A made work ends this tab's pending request; the next one starts fresh.
    if(state.kind!=='none')try{sessionStorage.removeItem(PENDING_PREFIX+book.id);}catch{/* Nothing to forget. */}}
   catch{setLinkError('놀스토리 보관함을 읽지 못해 이어 쓰던 작품이 있는지 확인하지 못했어요. 새로 만들지 않았어요.');}
  },0);return()=>window.clearTimeout(timer);
 },[book,accountSettled,ownerScope]);
 useEffect(()=>{if(book&&pageId)writePreparationDraft(sessionStorage,book.id,selections,pageId);},[book,selections,pageId]);
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

 if(!loaded)return <main className={styles.shell}><StoryLoading/></main>;
 if('error' in loaded||!book||!current)return <main className={styles.shell}><p role="alert" className={styles.alert}>{'error' in loaded?loaded.error:'그림책을 열지 못했어요.'}</p><Link className={styles.textLink} href="/shortstory?mode=library">그림책 보관함으로 돌아가기</Link></main>;

 const summary=preparationSummary(plans,selections);
 const selection=selections[current.pageId];
 const currentMode=effectiveMode(current,selection);
 const slots=currentMode==='recipe'?recipeSlots(current,selection):[];
 const startNumber=plans.findIndex(plan=>plan.pageId===current.pageId)+1;
 const page=book.pages[startNumber-1]!;
 const changed=!!selection&&selection.mode!=='default';
 const setPage=(id:string)=>{setPageId(id);setShowAlternatives(false);setError('');};
 const select=(next:PageSelection)=>{setSelections(value=>({...value,[current.pageId]:next}));setError('');};
 const blockedReason=reviewMode?'검토용 미리보기예요. 승인 전 조합이 들어 있어 놀스토리를 만들 수 없어요.':!accountSettled?(classroom.loading?'계정과 학급 정보를 확인하고 있어요.':'계정과 학급 정보를 확인하지 못해 새 놀스토리를 만들 수 없어요. 연결을 확인한 뒤 다시 열어 주세요.')
  :!canCreate?'선생님이 새 작품 만들기를 막아 두었어요. 그림책은 그대로 쓸 수 있어요.'
  :linkError||(!conversion?'아래 쪽을 고친 뒤 다시 만들어 주세요.':'');
 const create=(replaceLink:boolean)=>{
  if(busy||blockedReason)return;
  setBusy(true);setError('');
  try{
   const confirmed=confirmedStages(book,selections,permissions);
   const pending=pendingRequest(book.id,replaceLink);
   savePicturebookRequest(localStorage,{...pending,ownerScope,createdAt:new Date().toISOString(),book,startPageId:current.pageId,stages:confirmed,replaceLink});
   clearPreparationDraft(sessionStorage,book.id);
   location.assign(`/?picturebook=${encodeURIComponent(pending.requestId)}`);
  }catch(issue){
   setBusy(false);
   setError(issue instanceof DOMException&&issue.name==='QuotaExceededError'?'브라우저 저장 공간이 부족해 만들기를 시작하지 못했어요. 그림책과 기존 작품은 그대로예요.':issue instanceof Error?issue.message:'만들기를 시작하지 못했어요.');
  }
 };
 const openExisting=(workKey:string)=>location.assign(`/?picturebookWork=${encodeURIComponent(workKey.slice('new:'.length))}`);
 const showCreate=linkState.kind==='none';

 return <main className={styles.shell}>
  <header className={styles.header}>
   <Link className={styles.textLink} href="/shortstory">그림책으로 돌아가기</Link>
   <p className={styles.eyebrow}>놀스토리로 펼쳐 쓰기</p>
   <h1 ref={heading} tabIndex={-1}>{book.title||'제목 없는 그림책'}</h1>
   {reviewMode&&<p className={styles.reviewBadge} data-testid="picturebook-review-mode">검토용 미리보기 · 승인 전 조합 포함 · 학생 화면과 달라요</p>}
   <p data-testid="picturebook-summary">{summary.pages}쪽 → {summary.pages}장 · 첫 무대 {summary.staged}장 · 원화 참고 {summary.reference}장 · 지금 열 장: {startNumber}장</p>
  </header>
  {linkState.kind==='open'&&<section className={styles.notice} aria-label="쓰던 놀스토리">
   <p>이 그림책으로 쓰던 놀스토리가 있어요. 그림책을 고친 내용은 쓰던 놀스토리에 자동으로 들어가지 않아요.</p>
   <button className={styles.primary} onClick={()=>openExisting(linkState.link.workKey)}>쓰던 놀스토리 열기</button>
  </section>}
  {linkState.kind==='deleted'&&<section className={styles.notice} aria-label="삭제한 놀스토리">
   <p>이 그림책으로 만든 놀스토리가 ‘삭제한 작품’에 있어요. 서재에서 복구하면 이어 쓸 수 있어요.</p>
   <Link className={styles.textLink} href="/?view=library">서재에서 복구하기</Link>
   <button disabled={busy||!!blockedReason} onClick={()=>create(true)}>복구하지 않고 새 놀스토리로 만들기</button>
  </section>}
  {linkState.kind==='missing'&&<section className={styles.notice} aria-label="찾지 못한 놀스토리">
   <p>이 그림책으로 만든 놀스토리를 이 기기에서 찾지 못했어요. 작품 파일이 있으면 서재에서 가져와 이어 쓸 수 있어요.</p>
   <button disabled={busy||!!blockedReason} onClick={()=>create(true)}>새 놀스토리로 만들기</button>
  </section>}
  {preview&&'issue' in preview&&<section role="alert" className={styles.alert}><p>그림책을 장으로 나누지 못했어요. 그림책은 그대로예요.</p><ul>{preview.issue!.map(item=><li key={item}>{item}</li>)}</ul></section>}
  <div className={styles.layout}>
   <nav className={styles.pages} aria-label="쪽 목록">
    {plans.map(plan=>{const item=book.pages.find(value=>value.id===plan.pageId)!,itemMode=effectiveMode(plan,selections[plan.pageId]);
     return <button key={plan.pageId} aria-current={plan.pageId===current.pageId?'page':undefined} onClick={()=>setPage(plan.pageId)}>
      {(()=>{const thumb=resolveAsset(item.backgroundId)??resolveAsset(item.leftAssetId)??resolveAsset(item.rightAssetId);return thumb?<img src={thumb.src} alt="" loading="lazy"/>:<span className={styles.noThumb} aria-hidden="true"/>;})()}
      <span><span>{plan.pageNumber}쪽 · {plan.title||'제목 없는 쪽'}</span><small data-mode={itemMode}>{modeLabel[itemMode]}</small></span>
     </button>;})}
   </nav>
   <section className={styles.focus} aria-label={`${startNumber}쪽 준비`}>
    <div className={styles.compare}>
     <figure><figcaption>그림책 {startNumber}쪽</figcaption><PicturebookArt backgroundId={page.backgroundId} leftAssetId={page.leftAssetId} rightAssetId={page.rightAssetId} label={`그림책 ${startNumber}쪽 삽화`}/><p className={styles.pageText}>{page.text||'이 쪽에는 글이 없어요.'}</p></figure>
     <figure><figcaption>{startNumber}장 첫 컷 미리보기 · {modeLabel[currentMode]}</figcaption>
      <div className={styles.orientation} role="group" aria-label="미리보기 화면">
       <button aria-pressed={orientation==='landscape'} onClick={()=>{setOrientation('landscape');setRevision(v=>v+1);}}>가로 편집 화면</button>
       <button aria-pressed={orientation==='portrait'} onClick={()=>{setOrientation('portrait');setRevision(v=>v+1);}}>세로 읽기 화면</button>
      </div>
      <div className={orientation==='portrait'?`${styles.stage} ${styles.portrait}`:styles.stage} ref={attachContainer} data-testid="picturebook-stage">
       <iframe key={frameKey} ref={frame} src={frameSource} title="첫 컷 Ren’Py 무대 미리보기" data-testid="picturebook-runtime-frame" tabIndex={-1}
        style={{position:'absolute',border:0,display:'block',left:fit.offsetX,top:fit.offsetY,width:scene.width,height:scene.height,transform:`scale(${fit.scale})`,transformOrigin:'0 0',pointerEvents:'none'}}/>
       {(!runtimeReady||recoverable)&&<StoryLoading stage progress={loadProgress} recovery={recoverable?{message:runtimeStatus,onRetry:retry,onEdit:()=>retry()}:undefined}/>}
      </div>
      <p className={styles.status} role="status" data-testid="picturebook-stage-status" data-rendered-revision={rendered} data-scene-revision={scene.revision} data-background={scene.background?.imagePath??''} data-actors={JSON.stringify(scene.actors.map(actor=>actor.id))}>{currentMode==='reference'?'빈 무대로 시작해요. 무대는 편집기에서 직접 꾸며요.':runtimeReady?'실제 무대로 보여 줘요.':'무대를 준비하고 있어요.'}</p>
     </figure>
    </div>
    <p className={styles.reason}>{current.reason}</p>
    <fieldset className={styles.choices}><legend>{startNumber}장 첫 무대</legend>
     {current.approved&&current.recipe?.stage&&permissions.images&&<label><input type="radio" name="start" checked={currentMode==='recipe'} onChange={()=>select({mode:'recipe',overrides:selection?.mode==='recipe'?selection.overrides:{}})}/>추천 무대로 시작하기</label>}
     {current.student&&<label><input type="radio" name="start" checked={currentMode==='student'} onChange={()=>select({mode:'student'})}/>내가 고른 배경·인물로 시작하기</label>}
     <label><input type="radio" name="start" checked={currentMode==='reference'} onChange={()=>select({mode:'reference'})}/>그림책 삽화만 참고하기</label>
    </fieldset>
    {currentMode==='recipe'&&slots.some(slot=>slot.alternatives.length>0)&&<div className={styles.alternatives}>
     <button aria-expanded={showAlternatives} onClick={()=>setShowAlternatives(value=>!value)}>{showAlternatives?'다른 그림 닫기':'다른 그림 보기'}</button>
     {showAlternatives&&slots.filter(slot=>slot.alternatives.length>0||slot.grouped).map(slot=><fieldset key={slot.slot}><legend>{slot.side==='background'?'배경':slot.grouped?'함께 그린 인물':'인물'} · 지금: {slot.label}</legend>
      {[{assetId:slot.suggested,label:`추천 · ${resolveAsset(slot.suggested)?.label??slot.suggested}`},...slot.alternatives].map(option=>{
       const asset=resolveAsset(option.assetId);
       let blocked='';try{chooseAlternative(current,selection,slot.slot,option.assetId);}catch(issue){blocked=issue instanceof Error?issue.message:'고를 수 없어요.';}
       return <label key={option.assetId} className={styles.candidate} title={blocked||undefined}><input type="radio" name={`slot-${slot.slot}`} disabled={!!blocked} checked={slot.current===option.assetId} onChange={()=>{try{select(chooseAlternative(current,selection,slot.slot,option.assetId));}catch(issue){setError(issue instanceof Error?issue.message:'고를 수 없어요.');}}}/>{asset&&<img src={asset.src} alt="" loading="lazy"/>}<span>{option.label}</span></label>;
      })}
     </fieldset>)}
     <p className={styles.hint}>더 많은 그림은 놀스토리 편집기의 자료 고르기에서 바꿀 수 있어요.</p>
    </div>}
    {changed&&<button onClick={()=>setSelections(value=>revertPage(value,current.pageId))}>이 쪽만 추천대로 되돌리기</button>}
   </section>
  </div>
  {error&&<p role="alert" className={styles.alert}>{error}</p>}
  <footer className={styles.footer}>
   {blockedReason&&<p className={styles.hint} data-testid="picturebook-blocked">{blockedReason}</p>}
   <Link className={styles.textLink} href="/shortstory">취소</Link>
   {showCreate&&<button className={styles.primary} disabled={busy||!!blockedReason} onClick={()=>create(false)}>{busy?'만드는 중이에요':'이대로 놀스토리 만들기'}</button>}
  </footer>
 </main>;
}
