'use client';
import {WorkLeaveGuard} from '../../components/work-leave-guard';
import {withStudentNumber} from '../../lib/student-file-prefix';
import {createWorkLeaveTracker} from '../../lib/work-leave-tracker';
import dialogSurface from '../../components/story-dialog-surface.module.css';
/* eslint-disable @next/next/no-img-element -- static ShortStory pages and print illustration */
import {LocalWorkFileActions} from '../../components/local-work-file-actions';
import {createLocalWorkFileSession} from '../../lib/local-work-file';
import {rememberShortStoryAccountView,consumeShortStoryAccountView} from '../../lib/shortstory-account-view';
import {OnlineWorksPanelView} from '../../components/online-works-panel';
import {useOnlineWorks} from '../../components/use-online-works';
import {readOnlineShelfBindings} from '../../lib/online-work-bindings';
import {projectOnlineShelf} from '../../lib/unified-library';
import {LibraryStorageBadge} from '../../components/library-storage';
import {ServiceNavigation} from '../../components/service-navigation';
import {AccountMenu} from '../../components/account-menu';
import {onlineEnabled} from '../../lib/online-mode';
import {assignmentList,submissionOpen} from '../../lib/classroom-api';
import {useClassroomMe} from '../../components/use-classroom-me';
import {createOnlineWorkStore,saveOnlineWork} from '../../lib/online-work-bindings';
import type {OnlineDocument} from '../../lib/document-api';
import {assertCatalogOnlyMedia} from '../../lib/catalog-only-authoring';
import Link from 'next/link';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { newShortStory, newShortStoryPage, prepareJsonbSnapshot, restoreJsonbSnapshot, decodeShortStory, createAuthoringArchive, encodeAuthoringArchive, exportAuthoringExcel, blankAuthoringArchive, importShortStoryTable, exportShortStoryTable, serializeTableTsv, parseTableTsv, googleSheetTsvUrl, shortStoryOriginals, getShortStoryOriginal, isShortStoryWorkKey, type ShortStoryProject } from '@knolstory/compatibility';
import { resolveAsset } from '@knolstory/asset-registry';
import { useStorageWriter } from '../../components/use-storage-writer';
import {assertTakeoverCollectionExists} from '../../lib/workspace-takeover';
import { AssetPickerField } from '../../components/asset-picker-field';
import { BookCover } from '../../components/book-cover';
import { BookCoverEditor } from '../../components/book-cover-editor';
import { shortStoryCoverProject, applyShortStoryCover } from '../../lib/shortstory-cover';
import { trapDialogTab } from '../../lib/dialog-keyboard';
import { SHORTSTORY_LIBRARY_KEY, SHORTSTORY_LEGACY_KEY, loadShortStoryLibrary, parseShortStoryLibrary, emptyShortStoryLibrary, addShortStoryBook, copyShortStoryBook, deleteShortStoryBook, restoreShortStoryBook, saveShortStoryLibrary, mergeShortStoryLibraries, type ShortStoryLibrary } from '../../lib/shortstory-library';
import { previewAuthoringFile } from '../../lib/story-file-preview';
import {EditorTermGuide} from '../../components/editor-term-guide';
import { AuthoringImportDialog } from '../../components/authoring-import-dialog';
import { ShortStoryIllustrationPicker } from './shortstory-illustration-picker';
import styles from './shortstory.module.css';
type Project=ShortStoryProject;
type Page=Project['pages'][number];
const loadingProject=getShortStoryOriginal('rabbit');
const originalById=(id:string)=>{const book=shortStoryOriginals.find(book=>book.id===id);return book?getShortStoryOriginal(book.key):undefined;};
function Art({page,label}:{page:Pick<Page,'backgroundId'|'leftAssetId'|'rightAssetId'>;label:string}) {
 const background=resolveAsset(page.backgroundId),left=resolveAsset(page.leftAssetId),right=resolveAsset(page.rightAssetId);
 return <div className={styles.art} role="img" aria-label={label}>
  {background&&<img className={styles.background} src={background.src} alt=""/>}
  {left&&<img className={styles.left} src={left.src} alt=""/>}{right&&<img className={styles.right} src={right.src} alt=""/>}
  {!background&&!left&&!right&&<span>그림 없는 쪽</span>}
 </div>;
}
function download(content:BlobPart,name:string,type:string) {
 const url=URL.createObjectURL(new Blob([content],{type}));const link=document.createElement('a');link.href=url;link.download=withStudentNumber(name.replace(/[\\/:*?"<>|\u0000-\u001f]/g,'_'));link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function DeleteConfirmation({description,onDelete,onCancel,title='삭제 확인',action='삭제 확인'}:{description:string;onDelete:()=>void;onCancel:()=>void;title?:string;action?:string}) {
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const opener=document.activeElement as HTMLElement|null;const dialog=ref.current;dialog?.showModal();return()=>{dialog?.close();if(opener?.isConnected&&opener!==document.body)opener.focus();else document.querySelector<HTMLElement>('main a')?.focus();};},[]);
 return <dialog ref={ref} className={`${styles.confirm} ${dialogSurface.surface}`} aria-label={title} onKeyDown={event=>trapDialogTab(event,ref.current)} onCancel={event=>{event.preventDefault();onCancel();}}><h2>{title}</h2><p>{description}</p><button autoFocus onClick={onCancel}>취소</button><button onClick={onDelete}>{action}</button></dialog>;
}
export function ShortStoryWorkspace() {
 const [loadedLibrary,setLibrary]=useState<ShortStoryLibrary|null>(null),[loadedProject,setProject]=useState<Project|null>(null);
 const library=loadedLibrary??emptyShortStoryLibrary(),project=loadedProject??loadingProject;
 const [libraryView,setLibraryView]=useState(false);
 /** Opened from a class mission's reading link: offer the way back to the mission. */
 const [fromMission,setFromMission]=useState(false);
 useEffect(()=>{const timer=window.setTimeout(()=>setFromMission(new URLSearchParams(window.location.search).get('from')==='mission'),0);return()=>window.clearTimeout(timer);},[]);
 const [index,setIndex]=useState(0),[editing,setEditing]=useState(true),[coverOpen,setCoverOpen]=useState(false);
 const classroom=useClassroomMe();
 const canCreate=classroom.permissions.newWorks&&!classroom.permissions.forcedStoryKey;
 const canChooseImages=classroom.permissions.images;
 const canPlaceCharacters=canChooseImages&&classroom.permissions.characters;
 const [illustrationPage,setIllustrationPage]=useState<string|null>(null),[printPreview,setPrintPreview]=useState(false);
 const writingHeading=useRef<HTMLHeadingElement>(null),focusWriting=useRef(false);
 const printHeading=useRef<HTMLHeadingElement>(null),printLauncher=useRef<HTMLButtonElement>(null);
 const [notice,setNotice]=useState(''),[error,setError]=useState(''),[blocked,setBlocked]=useState(false),[sheet,setSheet]=useState(''),[operationBusy,setBusy]=useState(false);
 const [classroomBusy,setClassroomBusy]=useState(false);
 const busy=operationBusy||classroomBusy;
 const classroomRequest=useRef(0);
 const [recoveryConfirmation,setRecoveryConfirmation]=useState<'reload'|'restart'|null>(null);
 const [lastMove,setLastMove]=useState<{bookId:string;pageId:string;from:number;to:number}|null>(null);
 const [deleteTarget,setDeleteTarget]=useState<'book'|'page'|null>(null),[deletedPage,setDeletedPage]=useState<{bookId:string;page:Page;index:number}|null>(null);
 // Several open tabs: the tab in use becomes the writer and first takes what another tab saved.
 const adoptStored=useRef<(raw:string|null,beforeRaw:string|null)=>void>(()=>{});
 const writer=useStorageWriter(SHORTSTORY_LIBRARY_KEY,{onTakeover:(raw,beforeRaw)=>adoptStored.current(raw,beforeRaw)});
 const retryAfterTakeover=writer.retryAfterTakeover;
 const [storageConflict,setStorageConflict]=useState(false);
 const [importPreview,setImportPreview]=useState<Project|null>(null);
 const [submissionAccount,setSubmissionAccount]=useState<string|null>(null);
 const importSequence=useRef(0);
 const activeAccount=useRef(classroom.session?.accountId);
 useLayoutEffect(()=>{activeAccount.current=classroom.session?.accountId;},[classroom.session?.accountId]);
 const initialized=useRef(false),composing=useRef(false),onlineGeneration=useRef(0);
 const [compositionActive,setCompositionActive]=useState(false);
 useEffect(()=>{onlineGeneration.current++;},[library,project,index,editing,libraryView,coverOpen,blocked,storageConflict,compositionActive]);
 const conflict=storageConflict||writer.status==='unavailable';
 const [localFileSession]=useState(createLocalWorkFileSession);
 const [leaveTracker]=useState(createWorkLeaveTracker);
 const file=useRef<HTMLInputElement>(null),dirty=useRef(false),latest=useRef<ShortStoryLibrary|null>(null),saved=useRef<ShortStoryLibrary|null>(null);
 useEffect(()=>{if(writer.status==='loading'||initialized.current)return;const timer=setTimeout(()=>{
  initialized.current=true;
  try {
   const storage={getItem:(key:string)=>localStorage.getItem(key),setItem:(key:string,value:string)=>{writer.guard.current!.assertWritable();if(key===SHORTSTORY_LIBRARY_KEY)writer.guard.current!.setItem(key,value);else if(key===`${SHORTSTORY_LEGACY_KEY}-backup`)localStorage.setItem(key,value);else throw Error('허용되지 않은 저장 키입니다.');}};
   const raw=localStorage.getItem(SHORTSTORY_LIBRARY_KEY),previous=localStorage.getItem(SHORTSTORY_LEGACY_KEY);
   let loaded=writer.status==='owned'?loadShortStoryLibrary(storage):raw!==null?parseShortStoryLibrary(raw):previous!==null?addShortStoryBook(emptyShortStoryLibrary(),decodeShortStory(previous)):emptyShortStoryLibrary();const params=new URLSearchParams(window.location.search),key=params.get('work');
   if(key!==null&&!isShortStoryWorkKey(key))throw Error('지원하는 네 작품의 그림책 주소를 확인해 주세요.');
   let selected:Project|undefined=isShortStoryWorkKey(key)?getShortStoryOriginal(key):loaded.books.find(book=>book.id===loaded.activeId)??originalById(loaded.activeId);
   const read=isShortStoryWorkKey(key)&&params.get('mode')!=='edit';
   const browse=key===null&&params.get('mode')==='library';
   if(browse){setLibraryView(true);selected??=getShortStoryOriginal('rabbit');}
   if(!selected){loaded=addShortStoryBook(loaded,newShortStory());selected=loaded.books.at(-1)!;if(writer.status==='owned')saveShortStoryLibrary(storage,loaded);}
   if(isShortStoryWorkKey(key)&&params.get('mode')==='edit'){const previousPosition=Math.min(loaded.positions[selected.id]??0,selected.pages.length-1);loaded=copyShortStoryBook(loaded,selected);selected=loaded.books.at(-1)!;loaded={...loaded,positions:{...loaded.positions,[selected.id]:previousPosition}};if(writer.status==='owned')saveShortStoryLibrary(storage,loaded);window.history.replaceState(null,'',window.location.pathname);}
   loaded={...loaded,activeId:selected.id};latest.current=loaded;saved.current=loaded;setLibrary(loaded);setProject(selected);setIndex(Math.min(loaded.positions[selected.id]??0,selected.pages.length-1));let returnEditing:boolean|'library'|null=null;try{returnEditing=consumeShortStoryAccountView(sessionStorage,location.search,selected.id);}catch{/* Optional view state never alters the library. */}if(returnEditing==='library')setLibraryView(true);setEditing(!originalById(selected.id)&&(typeof returnEditing==='boolean'?returnEditing:!read));
  }catch(e){if(new URLSearchParams(window.location.search).get('mode')==='library')setLibraryView(true);setError(`보관함을 열지 못했어요. 원본을 보존하고 복구해 주세요. ${e instanceof Error?e.message:''}`);setBlocked(true);const empty=emptyShortStoryLibrary();latest.current=empty;setLibrary(empty);const key=new URLSearchParams(window.location.search).get('work');setProject(isShortStoryWorkKey(key)?getShortStoryOriginal(key):newShortStory());setEditing(false);}
 },0);return()=>clearTimeout(timer);},[writer.status,writer.guard]);
 useEffect(()=>{const flush=()=>{if(!dirty.current||!latest.current||blocked||conflict||!writer.guard.current?.isOwned())return;try{saveShortStoryLibrary(writer.guard.current,latest.current);saved.current=latest.current;dirty.current=false;}catch{dirty.current=true;}};const leave=(event:BeforeUnloadEvent)=>{flush();if(dirty.current){event.preventDefault();}};window.addEventListener('pagehide',flush);window.addEventListener('beforeunload',leave);return()=>{window.removeEventListener('pagehide',flush);window.removeEventListener('beforeunload',leave);};},[blocked,conflict,writer.guard]);

 // Another tab saved while this tab was not the writer. With nothing unsaved here, take its library and
 // stay on this tab's book; otherwise merge so that neither tab's writing is lost.
 useLayoutEffect(()=>{adoptStored.current=(raw,beforeRaw)=>{
  if(!initialized.current||!latest.current||blocked||!project)return;
  try{assertTakeoverCollectionExists(raw,beforeRaw);}catch(issue){setStorageConflict(true);setError(issue instanceof Error?issue.message:'기기 보관함을 열지 못했어요. 브라우저의 저장 공간을 확인해 주세요.');throw issue;}
  if(raw===null)return;
  const stored=parseShortStoryLibrary(raw);
  if(!dirty.current){
   const next={...stored,activeId:latest.current.activeId};latest.current=next;saved.current=stored;setLibrary(next);
   const book=stored.books.find(item=>item.id===project.id);if(book){setProject(book);setIndex(value=>Math.min(value,book.pages.length-1));}
   return;
  }
  const {library:merged,conflict}=mergeShortStoryLibraries(latest.current,stored,saved.current,project.id);
  latest.current=merged;saved.current=stored;setLibrary(merged);
  const book=merged.books.find(item=>item.id===project.id);if(book){setProject(book);setIndex(value=>Math.min(value,book.pages.length-1));}
  if(conflict)setNotice('다른 탭에서도 이 그림책을 고쳤어요. 이 탭의 글을 그대로 두고, 다른 탭의 글은 ‘· 다른 탭’ 그림책으로 남겼어요.');
 };});
 // After taking over, save what this tab kept meanwhile.
 useEffect(()=>{
  if(writer.status!=='owned'||!dirty.current||!latest.current||blocked)return;
  const timer=window.setTimeout(()=>{
   if(!dirty.current||!latest.current||!writer.guard.current?.isOwned())return;
   try{saveShortStoryLibrary(writer.guard.current,latest.current);saved.current=latest.current;dirty.current=false;setStorageConflict(false);setError('');}
   catch{
    if(retryAfterTakeover())return;
    setStorageConflict(true);setNotice('');setError('임시 보관하지 못했어요. 지금 그림책은 화면에 그대로 있어요. 작품 파일로 저장해 주세요.');
   }
  },0);
  return()=>window.clearTimeout(timer);
 },[writer.status,blocked,writer.guard,retryAfterTakeover,library]);
 useEffect(()=>{if(printPreview)printHeading.current?.focus();},[printPreview]);
 useEffect(()=>{if(editing&&focusWriting.current&&writingHeading.current){focusWriting.current=false;writingHeading.current.focus();}},[editing,project?.id]);
 const original=!!originalById(project.id),current=project.pages[Math.min(index,project.pages.length-1)];
 const commit=(next:ShortStoryLibrary,preserveDraft=false)=>{if(blocked)return false;
  // Another tab is the writer for a moment: keep the change here; it is saved once this tab takes over.
  if(!writer.guard.current?.isOwned()&&writer.status!=='unavailable'){latest.current=next;setLibrary(next);dirty.current=true;void writer.claim();return true;}
  try{saveShortStoryLibrary(writer.guard.current!,next);latest.current=next;saved.current=next;setLibrary(next);dirty.current=false;setError('');setNotice('임시 보관했어요.');return true;}catch{
   // Another tab took the writer over and saved a moment ago: keep the change; it is merged and saved after the takeover.
   if(writer.retryAfterTakeover()){latest.current=next;setLibrary(next);dirty.current=true;return true;}
   if(writer.status!=='owned')setStorageConflict(true);else {try{writer.guard.current!.assertWritable();}catch{setStorageConflict(true);}}if(preserveDraft){latest.current=next;setLibrary(next);}dirty.current=true;setError('임시 보관하지 못했어요. 작품 파일로 저장하거나 임시 보관을 다시 시도해 주세요. 임시 보관이 될 때까지 다른 그림책으로 바꾸지 않아요.');return false;}};
 const update=(next:Project,targetIndex=index)=>{if(original||blocked)return;const changed={...next,updatedAt:new Date().toISOString()};setProject(changed);commit({...library,books:library.books.map(book=>book.id===changed.id?changed:book),positions:{...library.positions,[changed.id]:targetIndex}},true);};
 const patch=(values:Partial<Page>)=>update({...project,pages:project.pages.map(page=>page.id===current.id?{...page,...values}:page)});
 // Turning pages only moves the reading position. It is best effort: it never warns, asks before leaving or
 // stops reading. Without the writer it waits in memory for the next save.
 const position=(target:number)=>{setIndex(target);if(blocked)return;const base=latest.current??library,next={...base,positions:{...base.positions,[project.id]:target}};latest.current=next;setLibrary(next);
  if(conflict||!writer.guard.current?.isOwned())return;
  try{saveShortStoryLibrary(writer.guard.current,next);saved.current=next;dirty.current=false;}catch{/* The next save keeps the position. */}};
 const switchBook=(id:string,read=false)=>{if(blocked||!commit(latest.current??library))return;const selected=library.books.find(book=>book.id===id)??originalById(id);if(!selected)return;const next={...library,activeId:id};if(!commit(next))return;setLibraryView(false);setPrintPreview(false);setProject(selected);setIndex(Math.min(next.positions[id]??0,selected.pages.length-1));setEditing(!read&&!originalById(id));setDeletedPage(null);setDeleteTarget(null);setCoverOpen(false);window.history.replaceState(null,'',isShortStoryWorkKey(shortStoryOriginals.find(book=>book.id===id)?.key??null)?`?work=${shortStoryOriginals.find(book=>book.id===id)!.key}&mode=read`:window.location.pathname);};
 const accept=(next:Project,copy=false)=>{if(!canCreate){setError('선생님이 새 그림책 만들기를 제한했어요.');return false;}if(blocked||!commit(latest.current??library))return false;const currentLibrary=latest.current??library;const added=copy?copyShortStoryBook(currentLibrary,next):addShortStoryBook(currentLibrary,next);const target=copy?index:0;const nextLibrary={...added,positions:{...added.positions,[added.activeId]:target}};if(!commit(nextLibrary))return false;leaveTracker.created(added.activeId);setLibraryView(false);setPrintPreview(false);focusWriting.current=true;setProject(added.books.at(-1)!);setIndex(target);setEditing(true);setDeletedPage(null);setDeleteTarget(null);window.history.replaceState(null,'',window.location.pathname);setNotice(copy?'원본을 보존한 내 사본을 만들었어요.':'기존 그림책을 보존하고 새 책으로 보관했어요.');return true;};
 const run=async(action:()=>Promise<void>)=>{setBusy(true);setError('');try{await action();}catch(e){setError(e instanceof Error?e.message:'자료를 열지 못했어요.');}finally{setBusy(false);}};
 useEffect(()=>{
  if(!initialized.current||writer.status!=='owned'||classroom.loading||classroom.role!=='student'||!classroom.session)return;
  const url=new URL(location.href),taskId=url.searchParams.get('classTask');
  if(!taskId)return;
  const controller=new AbortController(),request=++classroomRequest.current;
  const generation=onlineGeneration.current;
  const finishLoading=()=>{if(request===classroomRequest.current)setClassroomBusy(false);};
  const timer=window.setTimeout(async()=>{
   setClassroomBusy(true);
   try{
    const tasks=await assignmentList((input,init)=>fetch(input,{...init,signal:controller.signal}));
    if(controller.signal.aborted||generation!==onlineGeneration.current)return;
    const task=tasks.find(item=>item.id===taskId);
    if(!task?.open||task.format!=='shortstory')throw Error('열린 숏스토리 과제에서 시작해 주세요.');
    const forced=classroom.permissions.forcedStoryKey;
    if(forced&&task.storyKey&&forced!==task.storyKey)throw Error('과제와 편집 허용 작품이 달라요. 선생님께 확인해 주세요.');
    const bindingKey=`knolstory-class-task:${classroom.session!.accountId}:${taskId}`;
    const savedKey=localStorage.getItem(bindingKey);
    const base=latest.current??library;
    const existing=base.books.find(book=>`shortstory:${book.id}`===savedKey);
    if(existing){switchBook(existing.id);return;}
    const storyKey=forced??task.storyKey;
    if(!storyKey&&!classroom.permissions.newWorks)throw Error('선생님께 과제의 바탕 작품을 확인해 주세요.');
    const source=isShortStoryWorkKey(storyKey)?getShortStoryOriginal(storyKey):undefined;
    if(storyKey&&!source)throw Error('바탕 그림책을 찾지 못했어요.');
    const next=source?copyShortStoryBook(base,source):addShortStoryBook(base,{...newShortStory(),title:task.title});
    if(!commit(next))return;
    const selected=next.books.at(-1)!;
    localStorage.setItem(bindingKey,`shortstory:${selected.id}`);
    leaveTracker.created(selected.id);setProject(selected);setIndex(0);setEditing(true);setLibraryView(false);setPrintPreview(false);
   }catch(issue){if(!controller.signal.aborted)setError(issue instanceof Error?issue.message:'과제를 시작하지 못했어요.');}
   finally{
    if(!controller.signal.aborted){
     finishLoading();
     if(location.href===url.href){url.searchParams.delete('classTask');history.replaceState(history.state,'',url);}
    }
   }
  },0);
  return()=>{window.clearTimeout(timer);controller.abort();finishLoading();};
 // Task navigation starts after storage and the student account have settled.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[writer.status,classroom.loading,classroom.role,classroom.session?.accountId,library.activeId]);

 useEffect(()=>{
  if(!initialized.current||writer.status!=='owned'||classroom.loading||!classroom.session||!['teacher','admin'].includes(classroom.role))return;
  const url=new URL(location.href),assignment=url.searchParams.get('classAssignment'),number=Number(url.searchParams.get('classStudent'));
  if(!assignment||!Number.isInteger(number)||number<1||number>30)return;
  const controller=new AbortController(),request=++classroomRequest.current,sequence=++importSequence.current,generation=onlineGeneration.current,accountId=classroom.session.accountId;
  const current=()=>!controller.signal.aborted&&sequence===importSequence.current&&generation===onlineGeneration.current&&activeAccount.current===accountId;
  const finishLoading=()=>{if(request===classroomRequest.current)setClassroomBusy(false);};
  const timer=window.setTimeout(async()=>{
   setClassroomBusy(true);
   try{
    const result=await submissionOpen(assignment,number,(input,init)=>fetch(input,{...init,signal:controller.signal}));
    const archive=await restoreJsonbSnapshot(result.document);
    if(!current())return;
    if(archive.format!=='shortstory')throw Error('놀스토리 제출본은 놀스토리 서재에서 열어 주세요.');
    setSubmissionAccount(accountId);
    setImportPreview({...archive.project,id:crypto.randomUUID()});
   }catch(issue){if(current())setError(issue instanceof Error?issue.message:'제출 작품을 열지 못했어요.');}
   finally{if(!controller.signal.aborted){finishLoading();if(location.href===url.href){url.searchParams.delete('classAssignment');url.searchParams.delete('classStudent');history.replaceState(history.state,'',url);}}}
  },0);
  return()=>{window.clearTimeout(timer);controller.abort();finishLoading();};
 // Opening a submission uses the existing import confirmation and preserves every local book.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[writer.status,classroom.loading,classroom.role,classroom.session?.accountId,library.activeId]);

 const exportFile=async()=>download(await encodeAuthoringArchive(await createAuthoringArchive({format:'shortstory',project})),`${project.title||'그림책'}.shortstory`,'application/octet-stream');
 const preview=async(selected:File)=>{importSequence.current++;setSubmissionAccount(null);if(!canCreate)throw Error('선생님이 그림책 가져오기를 제한했어요.');if(selected.name.toLowerCase().endsWith('.tsv')){const next=importShortStoryTable(parseTableTsv(await selected.text()));assertCatalogOnlyMedia(next);setImportPreview(next);return;}const archive=await previewAuthoringFile(selected);if(archive.format!=='shortstory')throw Error('숏스토리 그림책 파일을 선택해 주세요. 놀스토리는 서재에서 가져올 수 있어요.');setImportPreview(archive.project);};
 const add=()=>{setLastMove(null);const page=newShortStoryPage();update({...project,pages:[...project.pages.slice(0,index+1),page,...project.pages.slice(index+1)].map((page,i)=>({...page,order:i+1}))},index+1);setIndex(index+1);};
 const movePage=(from:number,to:number)=>{
  if(from===to||to<0||to>=project.pages.length)return;
  const moved=project.pages[from],remaining=project.pages.filter(page=>page.id!==moved.id);
  const pages=[...remaining.slice(0,to),moved,...remaining.slice(to)].map((page,i)=>({...page,order:i+1}));
  update({...project,pages},to);
  setIndex(to);
 };
 const move=(target:number)=>{
  if(target===index||target<0||target>=project.pages.length)return;
  setLastMove({bookId:project.id,pageId:current.id,from:index,to:target});
  movePage(index,target);
 };
 const undoMove=lastMove?.bookId===project.id&&project.pages[lastMove.to]?.id===lastMove.pageId&&lastMove.from<project.pages.length;
 const removeBook=()=>{onlineGeneration.current++;const next=deleteShortStoryBook(library,project.id);const selected=next.books[0]??getShortStoryOriginal('rabbit');if(!commit({...next,activeId:selected.id}))return;setProject(selected);setIndex(Math.min(next.positions[selected.id]??0,selected.pages.length-1));setEditing(!originalById(selected.id));setDeleteTarget(null);};
 const flushForOnline=()=>{
  if(composing.current)throw Error('한글 입력을 마친 뒤 온라인 작업을 해 주세요.');
  if(blocked||conflict||coverOpen||!latest.current)throw Error('기기 원고를 먼저 안전하게 보관해 주세요.');
  writer.guard.current!.assertWritable();saveShortStoryLibrary(writer.guard.current!,latest.current);dirty.current=false;
 };
 const beforeServiceNavigation=()=>{
  if(composing.current){setError('한글 입력을 마친 뒤 다른 화면으로 이동해 주세요.');return false;}
  if(!dirty.current)return true;
  try{flushForOnline();return true;}catch(issue){setError(issue instanceof Error?issue.message:'지금 그림책을 임시 보관하지 못했어요.');return false;}
 };
 const beforeAccount=()=>{try{flushForOnline();rememberShortStoryAccountView(sessionStorage,project.id,libraryView?'library':editing);return true;}catch(issue){dirty.current=true;setError(issue instanceof Error?issue.message:'기기 저장을 확인해 주세요.');return false;}};
 const onlineStore=()=>createOnlineWorkStore(localStorage,{assertWritable:()=>{writer.guard.current!.assertWritable();if(blocked||conflict)throw Error('기기 저장을 먼저 확인해 주세요.');}});
 async function saveOnline(key:string,accountId:string,csrf:string,isCurrent:()=>boolean){
  const generation=onlineGeneration.current,current=()=>isCurrent()&&generation===onlineGeneration.current&&!composing.current;
  if(!current())return;flushForOnline();
  const work=latest.current!.books.find(book=>`shortstory:${book.id}`===key);if(!work)throw Error('기기에 보관한 내 그림책을 골라 주세요.');
  const snapshot=await prepareJsonbSnapshot(await createAuthoringArchive({format:'shortstory',project:work}));
  if(!current())return;flushForOnline();const result=await saveOnlineWork(onlineStore(),accountId,key,snapshot,csrf,undefined,{isCurrent:current});return {...result,includesLatest:result.includesLatest&&generation===onlineGeneration.current};
 };
 async function openOnline(remote:OnlineDocument,accountId:string,isCurrent:()=>boolean){
  const generation=onlineGeneration.current,current=()=>isCurrent()&&generation===onlineGeneration.current&&!composing.current;
  if(!current())return;flushForOnline();const archive=await restoreJsonbSnapshot(remote.snapshot);
  if(!current())return;if(archive.format!=='shortstory')throw Error('놀스토리 작품은 놀스토리 서재에서 열어 주세요.');flushForOnline();
  const copy={...archive.project,id:crypto.randomUUID()},next=addShortStoryBook(latest.current!,copy);
  if(!commit(next))throw Error('기기에 사본을 보관하지 못했어요. 기존 그림책은 유지됩니다.');
  let bindingFailed=false;try{onlineStore().bind(accountId,`shortstory:${copy.id}`,remote);}catch{bindingFailed=true;}
  setLibraryView(false);setPrintPreview(false);setProject(copy);setIndex(0);setEditing(true);setDeletedPage(null);setDeleteTarget(null);window.history.replaceState(null,'',window.location.pathname);
  if(bindingFailed)setError('그림책 사본은 기기에 보관했지만 온라인 연결 정보를 저장하지 못했어요. 새 온라인 작품으로 다시 올리기 전에 기기 저장을 확인해 주세요.');
 };
 const onlineWorks=library.books.map(book=>({key:`shortstory:${book.id}`,title:book.title}));

 const onlineAllowed=onlineEnabled&&(classroom.role==='teacher'||classroom.role==='admin');
 const online=useOnlineWorks({
  acceptedFormat:'shortstory',works:onlineWorks,disabled:!onlineAllowed||!loadedProject||!loadedLibrary||compositionActive||blocked||conflict||coverOpen,
  onSaveNew:saveOnline,onOpen:openOnline,
  captureOpenContext:()=>{const generation=onlineGeneration.current;return ()=>generation===onlineGeneration.current&&!composing.current;},
 });
 if(!loadedProject||!loadedLibrary)return <main className={styles.shell}><p>그림책을 여는 중이에요.</p></main>;
 let shelfBindings:ReturnType<typeof readOnlineShelfBindings>={};
 if(online.account.session){
  try{shelfBindings=readOnlineShelfBindings(localStorage,online.account.session.accountId,onlineWorks.map(work=>work.key));}
  catch{shelfBindings=Object.fromEntries(onlineWorks.map(work=>[work.key,{binding:null,error:true}]));}
 }
 const onlineShelf=projectOnlineShelf(onlineWorks,online.activeDocuments,shelfBindings,'shortstory');
 const coverProject=shortStoryCoverProject(project),credit=shortStoryOriginals.find(book=>book.id===project.id)?.credit;
 const workspace=(<div className={styles.workspace}>
   <details className={styles.contents} open={editing}>
    <summary>전체 구성 · {project.pages.length}쪽</summary>
    <nav aria-label="그림책 쪽 목록">{project.pages.map((page,i)=>{
     const illustration=resolveAsset(page.backgroundId);
     return <button key={page.id} aria-current={i===index?'page':undefined} onClick={()=>position(i)}>
      {editing&&illustration&&<img src={illustration.src} alt="" loading="lazy"/>}
      <span>{i+1}쪽 · {page.title||'제목 없는 쪽'}</span>
     </button>;
    })}</nav>
    {editing&&!original&&<button className={styles.appendPage} disabled={blocked||project.pages.length>=500} onClick={()=>{setLastMove(null);const at=project.pages.length;update({...project,pages:[...project.pages,{...newShortStoryPage(),order:at+1}]},at);setIndex(at);}}>+ 맨 뒤에 새 쪽 추가</button>}
   </details>
   <section className={styles.focus} aria-label={editing?'숏스토리 쓰기':'숏스토리 읽기'}>
    <div className={styles.pageHeader}><h2 ref={writingHeading} tabIndex={-1}>{index+1}쪽{current.title&&` · ${current.title}`}</h2>
    <nav className={styles.pageNav} aria-label="숏스토리 쪽 이동"><button disabled={index===0} onClick={()=>position(index-1)}>이전 쪽</button><span>{index+1} / {project.pages.length}</span><button disabled={index===project.pages.length-1} onClick={()=>position(index+1)}>다음 쪽</button></nav></div>
    <div className={editing?styles.editingPage:undefined}>{editing&&!original&&!blocked?<div className={styles.artStage}><Art page={current} label={`${index+1}쪽 삽화`}/>
     {/* Pointer shortcut only; keyboard and screen readers use the ‘삽화 고르기’ button beside the picture. */}
     <button type="button" tabIndex={-1} aria-hidden="true" disabled={!canChooseImages} className={current.backgroundId||current.leftAssetId||current.rightAssetId?styles.artChange:styles.artEmpty} onClick={()=>setIllustrationPage(current.id)}><span>{current.backgroundId||current.leftAssetId||current.rightAssetId?'눌러서 삽화 바꾸기':'눌러서 이 쪽의 삽화 고르기'}</span></button></div>:<Art page={current} label={`${index+1}쪽 삽화`}/>}
    {editing&&!original?<fieldset disabled={blocked}><button className={styles.chooseIllustration} disabled={!canChooseImages} onClick={()=>setIllustrationPage(current.id)} >삽화 고르기</button><label>이 쪽 제목<input value={current.title} onChange={event=>patch({title:event.target.value})}/></label><label>이 쪽의 이야기<textarea aria-label="이 쪽의 이야기" rows={7} value={current.text} onChange={event=>patch({text:event.target.value})}/></label><details><summary>배경·인물로 직접 꾸미기</summary><div className={styles.metadata}><fieldset disabled={!canChooseImages}><AssetPickerField allowSceneIllustrations label="쪽 배경" type="background" value={current.backgroundId} onChange={id=>patch({backgroundId:id})}/></fieldset><fieldset disabled={!canPlaceCharacters}><AssetPickerField label="왼쪽 인물" type="character" value={current.leftAssetId} onChange={id=>patch({leftAssetId:id})}/><AssetPickerField label="오른쪽 인물" type="character" value={current.rightAssetId} onChange={id=>patch({rightAssetId:id})}/></fieldset></div></details><div className={styles.pageTools}><div role="group" aria-label="쪽 추가"><span aria-hidden="true">쪽 추가</span><button disabled={project.pages.length>=500} onClick={add}>현재 쪽 뒤에 빈 쪽 추가</button><button disabled={project.pages.length>=500} onClick={()=>{setLastMove(null);const copy={...current,id:crypto.randomUUID()};update({...project,pages:[...project.pages.slice(0,index+1),copy,...project.pages.slice(index+1)].map((page,i)=>({...page,order:i+1}))},index+1);setIndex(index+1);}}>현재 쪽 복제</button></div><div role="group" aria-label="쪽 순서"><span aria-hidden="true">쪽 순서</span><button disabled={index===0} onClick={()=>move(index-1)}>쪽 앞으로 이동</button><button disabled={index===project.pages.length-1} onClick={()=>move(index+1)}>쪽 뒤로 이동</button>{project.pages.length>2&&<label>이 쪽 옮기기<select value={index} onChange={event=>move(Number(event.target.value))}>{project.pages.map((page,i)=><option key={page.id} value={i}>{i+1}쪽</option>)}</select></label>}{undoMove&&lastMove&&<button onClick={()=>{movePage(lastMove.to,lastMove.from);setLastMove(null);}}>쪽 이동 되돌리기</button>}</div><div role="group" aria-label="쪽 삭제" className={styles.dangerGroup}><button className={styles.danger} disabled={project.pages.length===1} onClick={()=>setDeleteTarget('page')}>현재 쪽 삭제</button>{deletedPage?.bookId===project.id&&<button onClick={()=>{setLastMove(null);const at=Math.min(deletedPage.index,project.pages.length);update({...project,pages:[...project.pages.slice(0,at),deletedPage.page,...project.pages.slice(at)].map((page,i)=>({...page,order:i+1}))},at);setIndex(at);setDeletedPage(null);}}>쪽 삭제 되돌리기</button>}</div></div></fieldset>:<p className={styles.storyText}>{current.text||'아직 글이 없는 쪽이에요.'}</p>}</div>
   </section>
  </div>);
 return <main className={styles.shell} onCompositionStartCapture={()=>{composing.current=true;onlineGeneration.current++;setCompositionActive(true);}} onCompositionEndCapture={()=>{composing.current=false;onlineGeneration.current++;setCompositionActive(false);}}>
 <WorkLeaveGuard tracker={leaveTracker} work={project} ready={!!library}/>
  {libraryView&&<ServiceNavigation role={classroom.role} active="library" beforeNavigate={beforeServiceNavigation}/>}
  <header className={styles.header}><div><Link href="/?view=library">놀스토리 서재로 돌아가기</Link>{fromMission&&onlineEnabled&&<> <Link href="/student" data-mission-return="true">미션으로 돌아가기</Link></>}<p className={styles.eyebrow}>숏스토리 그림책</p><h1 className={styles.bookTitle}>{libraryView?'그림책 보관함':project.title||'제목 없는 그림책'}</h1><p>{libraryView?'그림책을 고르거나 새 이야기를 시작해요.':original?'원본 그림책을 읽고 내 사본으로 글을 써요.':'그림과 글을 구성하고 내 그림책으로 보관해요.'}</p></div><div className={styles.actions}>{editing&&!libraryView&&<EditorTermGuide/>}{!coverOpen&&<><AccountMenu account={online.account} returnTo="shortstory" disabled={compositionActive||blocked||conflict} beforeNavigate={beforeAccount}/>{onlineAllowed&&<OnlineWorksPanelView online={online} acceptedFormat="shortstory" works={library.books.map(book=>({key:`shortstory:${book.id}`,title:book.title}))} disabled={compositionActive||blocked||conflict} onSaveNew={saveOnline} onOpen={openOnline}/>}</>}{libraryView?<><button disabled={blocked||!canCreate} onClick={()=>accept(newShortStory())}>새 그림책</button><button disabled={busy||blocked||!canCreate} onClick={()=>file.current?.click()}>파일 가져오기</button></>:<>
   <button disabled={blocked} onClick={()=>{if(original)accept(project,true);else if(!editing){focusWriting.current=true;setEditing(true);}}} aria-pressed={editing}>{original?'내 사본으로 쓰기':'쓰기'}</button><button onClick={()=>setEditing(false)} aria-pressed={!editing}>읽기</button><button disabled={compositionActive} onClick={()=>{if(dirty.current&&!commit(latest.current??library))return;onlineGeneration.current++;setPrintPreview(false);setLibraryView(true);window.history.replaceState(null,'','?mode=library');}}>그림책 보관함 열기</button>
  </>}</div></header>
  {error&&<p role="alert" className={styles.error}>{error}</p>}{/* Reserved line: saving messages never push the page down while writing. */}<p role="status" className={styles.statusLine}>{notice}</p>
  {/* Only while writing: reading is never interrupted by the browser storage. */}
  {conflict&&editing&&<div role="alert" className={styles.error}><p>그림책을 자동으로 임시 보관하지 못했어요. 지금 화면의 그림책은 그대로 있어요. 작품 파일로 저장해 두세요.</p><button onClick={()=>void run(exportFile)}>현재 초안 파일로 보관</button><button onClick={()=>{if(dirty.current){setRecoveryConfirmation('reload');return;}window.location.reload();}}>저장된 보관함 다시 열기</button></div>}
  {!libraryView&&workspace}
  {editing&&!original&&illustrationPage===current.id&&<ShortStoryIllustrationPicker
   value={current.backgroundId}
   onClose={()=>setIllustrationPage(null)}
   onSelect={id=>{if(!canChooseImages)return;if(id!==current.backgroundId)patch({backgroundId:id,leftAssetId:'',rightAssetId:''});setIllustrationPage(null);}}/>}
  {blocked&&<div className={styles.actions}><button onClick={()=>{const raw=localStorage.getItem(SHORTSTORY_LIBRARY_KEY)??localStorage.getItem(SHORTSTORY_LEGACY_KEY);if(raw)download(raw,'그림책-복구원본.json','application/json');}}>복구용 원본 보관</button><button onClick={()=>setRecoveryConfirmation('restart')}>보관함 새로 시작</button></div>}
  <details className={styles.library} open={libraryView}><summary>그림책 보관함 · 내 그림책 {library.books.length}권</summary><div className={styles.bookList}>
   <section aria-label="기본 그림책"><h2>네 작품 원본</h2>{shortStoryOriginals.map(book=><button key={book.id} disabled={blocked} aria-pressed={project.id===book.id} onClick={()=>switchBook(book.id,true)}><span className={styles.libraryCover} aria-hidden="true"><BookCover project={shortStoryCoverProject(getShortStoryOriginal(book.key))} edition="original"/></span><span>{book.title} · 원본 읽기</span></button>)}</section>
   <section aria-label="내 그림책 목록"><h2>내 그림책</h2>{library.books.length?library.books.map(book=><div key={book.id} className={styles.libraryEntry}><button disabled={blocked} aria-pressed={project.id===book.id} onClick={()=>switchBook(book.id)}><span className={styles.libraryCover} aria-hidden="true"><BookCover project={shortStoryCoverProject(book)} edition="own"/></span><span>{book.title}</span></button><LibraryStorageBadge status={onlineShelf.byLocalKey[`shortstory:${book.id}`]??{kind:'local',label:'이 기기에 있음'}}/>{onlineAllowed&&online.account.session&&<button disabled={online.busy||compositionActive||blocked||conflict} onClick={()=>void online.save(`shortstory:${book.id}`)}>온라인에 업로드 · {book.title}</button>}</div>):<p>원본에서 사본을 만들거나 새 그림책을 시작해요.</p>}{onlineShelf.remoteOnly.map(record=><div key={record.recordId} className={styles.libraryEntry}><LibraryStorageBadge status={{kind:'remote',label:'온라인에 있음',record}}/><button disabled={online.busy||compositionActive||blocked||conflict} onClick={()=>void online.open(record)}>{record.title} · 기기에 사본으로 열기</button></div>)}{online.activeCursor&&<button disabled={online.busy} onClick={()=>void online.list(true,'active')}>온라인 그림책 더 보기</button>}{online.error&&<p role="alert">{online.error}</p>}{online.notice&&<p role="status">{online.notice}</p>}</section>
   {!!library.deleted.length&&<section aria-label="삭제한 그림책 복구"><h2>삭제한 그림책</h2>{library.deleted.map(book=><button disabled={blocked} key={book.id} onClick={()=>{const next=restoreShortStoryBook(library,book.id);if(commit(next)){setLibraryView(false);setProject(book);setIndex(Math.min(next.positions[book.id]??0,book.pages.length-1));setEditing(true);window.history.replaceState(null,'',window.location.pathname);}}}>{book.title} 복구</button>)}</section>}
  </div></details>
  <section className={styles.tools} aria-label="그림책 파일과 이름" hidden={libraryView}>
   <div className={styles.toolCard} role="group" aria-label="작품 정보">
    <h2 className={styles.toolTitle}>작품 정보</h2>
    <div className={styles.infoRow}><div className={styles.coverPreview} aria-hidden="true"><BookCover project={coverProject} edition={original?'original':'own'}/></div><div className={styles.infoFields}>
     <label>이야기 제목<input value={project.title} readOnly={original||!editing} disabled={blocked} onChange={event=>update({...project,title:event.target.value})}/></label>
     <label>지은이<input value={project.authorDisplayName} readOnly={original||!editing} disabled={blocked} onChange={event=>update({...project,authorDisplayName:event.target.value})}/></label>
     {!original&&<button disabled={blocked} onClick={()=>setCoverOpen(true)}>표지 꾸미기</button>}
    </div></div>
    {original&&<p className={styles.originalNotice}>기본 제공 원본은 그대로 보존해요. <span>{credit}</span></p>}
    <details><summary>소개·마지막 인사·표지 그림</summary><div className={styles.infoDetails}>
     <label>이야기 소개<textarea disabled={blocked||original||!editing} value={project.description} onChange={event=>update({...project,description:event.target.value})}/></label><label>마지막 인사<textarea disabled={blocked||original||!editing} value={project.cover.authorNote} onChange={event=>update({...project,cover:{...project.cover,authorNote:event.target.value}})}/></label>
    {!original&&editing&&<><AssetPickerField allowSceneIllustrations label="표지 배경" type="background" value={project.cover.backgroundId} onChange={id=>{if(!blocked)update({...project,cover:{...project.cover,backgroundId:id}});}}/><AssetPickerField label="표지 인물" type="character" value={project.cover.characterId} onChange={id=>{if(!blocked)update({...project,cover:{...project.cover,characterId:id}});}}/></>}
    </div></details>
   </div>
   <div className={styles.toolCard} role="group" aria-label="저장과 파일">
    <h2 className={styles.toolTitle}>저장과 파일</h2>
    <LocalWorkFileActions registerSave={leaveTracker.registerSave} onVerifiedSave={leaveTracker.saved} onSavingChange={leaveTracker.saving} fileSession={localFileSession} workKey={project.id} name={project.title} extension=".shortstory" disabled={busy||compositionActive} serialize={()=>{const captured=structuredClone(project);return createAuthoringArchive({format:'shortstory',project:captured}).then(encodeAuthoringArchive);}}/>
    <details><summary>파일 교환·보관</summary><div className={styles.actions}><button disabled={blocked} onClick={()=>commit(latest.current??library)}>임시 보관</button><button onClick={()=>void run(exportFile)}>작품 파일 내보내기</button><button disabled={busy} onClick={()=>void run(async()=>{download(new Uint8Array(await exportAuthoringExcel({format:'shortstory',project})),`${project.title||'그림책'}.xlsx`,'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');})}>Excel로 보관</button><button onClick={()=>void run(async()=>download(serializeTableTsv(exportShortStoryTable(project)),`${project.title||'그림책'}.tsv`,'text/tab-separated-values'))}>간단 시트용 TSV 보관</button><button disabled={busy} onClick={()=>void run(async()=>{const template=await blankAuthoringArchive('shortstory');download(new Uint8Array(await exportAuthoringExcel(template)),'숏스토리-빈-편집양식.xlsx','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');})}>빈 Excel·Google 시트 양식</button><button disabled={busy||blocked||!canCreate} onClick={()=>file.current?.click()}>파일 가져오기</button></div><p className={styles.toolHint}>여러 쪽을 한꺼번에 고치려면 Excel로 보관한 파일을 Google 시트에서 편집한 뒤 Excel(.xlsx)로 내려받아 ‘파일 가져오기’로 확인해요. 공개 시트 주소는 간단 표 한 탭만 읽어요.</p><label>공개 Google 시트 주소<input value={sheet} onChange={event=>setSheet(event.target.value)}/></label><button disabled={busy||blocked||!sheet.trim()} onClick={()=>void run(async()=>{importSequence.current++;setSubmissionAccount(null);const response=await fetch(googleSheetTsvUrl(sheet));if(!response.ok)throw Error('공개 시트를 읽지 못했어요. 게시 설정을 확인해 주세요.');setImportPreview(importShortStoryTable(parseTableTsv(await response.text())));})}>간단 시트 가져오기</button></details>
    <input className={styles.hidden} ref={file} type="file" accept=".shortstory,.xlsx,.tsv,.json" aria-label="숏스토리 파일 가져오기" onChange={event=>{const selected=event.target.files?.[0];event.target.value='';if(selected)void run(async()=>{if(selected.size>25_000_000)throw Error('25MB 이하의 그림책 파일을 선택해 주세요.');await preview(selected);});}}/>
   </div>
   <div className={styles.toolCard} role="group" aria-label="인쇄와 그림책 관리">
    <h2 className={styles.toolTitle}>인쇄와 관리</h2>
    <div className={styles.actions}><button ref={printLauncher} onClick={()=>setPrintPreview(true)} aria-expanded={printPreview} aria-controls="shortstory-print">A4 미리보기</button></div>
    <details><summary>그림책 관리</summary><div className={styles.actions}><button disabled={blocked||!canCreate} onClick={()=>accept(newShortStory())}>새 그림책</button><button disabled={blocked} onClick={()=>accept(project,true)}>내 사본 만들기</button>{!original&&<button className={styles.danger} disabled={blocked} onClick={()=>setDeleteTarget('book')}>이 그림책 삭제</button>}</div></details>
   </div>
  </section>
  {importPreview&&(!submissionAccount||submissionAccount===classroom.session?.accountId)&&<AuthoringImportDialog title={importPreview.title} kind="shortstory" pageCount={importPreview.pages.length} busy={busy} onCancel={()=>{setImportPreview(null);setSubmissionAccount(null);}} onApply={()=>{if(submissionAccount&&submissionAccount!==activeAccount.current)return;if(accept(importPreview)){setImportPreview(null);setSubmissionAccount(null);}}}/>}
  {recoveryConfirmation&&<DeleteConfirmation title={recoveryConfirmation==='reload'?'저장된 보관함 다시 열기':'보관함 새로 시작'} action={recoveryConfirmation==='reload'?'보관함 다시 열기':'새 보관함 시작'} description={recoveryConfirmation==='reload'?'현재 초안을 파일로 보관했나요? 저장된 보관함을 다시 열면 이 탭의 초안은 사라져요.':'열리지 않는 보관함은 따로 남겨 두고 새 보관함을 시작할까요?'} onCancel={()=>setRecoveryConfirmation(null)} onDelete={()=>{if(compositionActive)return;if(recoveryConfirmation==='reload'){dirty.current=false;window.location.reload();return;}try{writer.guard.current!.assertWritable();const raw=localStorage.getItem(SHORTSTORY_LIBRARY_KEY)??localStorage.getItem(SHORTSTORY_LEGACY_KEY);if(raw)localStorage.setItem(`knolstory-shortstory-recovery-${Date.now()}`,raw);const next=addShortStoryBook(emptyShortStoryLibrary(),newShortStory());saveShortStoryLibrary(writer.guard.current!,next);latest.current=next;setLibrary(next);setProject(next.books[0]);setBlocked(false);setEditing(true);setError('');setIndex(0);}catch{setError('복구 원본 보관과 저장에 실패했어요. 파일로 먼저 보관해 주세요.');}setRecoveryConfirmation(null);}}/>}
  {deleteTarget&&<DeleteConfirmation description={deleteTarget==='book'?`‘${project.title}’ 그림책을 보관함에서 삭제할까요? 삭제한 뒤에도 복구할 수 있어요.`:`${index+1}쪽을 삭제할까요? 이 책에서 쪽 삭제 되돌리기로 복구할 수 있어요.`} onCancel={()=>setDeleteTarget(null)} onDelete={()=>{if(deleteTarget==='book'){removeBook();return;}setLastMove(null);setDeletedPage({bookId:project.id,page:current,index});update({...project,pages:project.pages.filter(page=>page.id!==current.id).map((page,i)=>({...page,order:i+1}))},Math.max(0,index-1));setIndex(Math.max(0,index-1));setDeleteTarget(null);}}/>}
  {!libraryView&&<section id="shortstory-print" className={printPreview?`${styles.printBook} ${styles.printPreview}`:styles.printBook} data-shortstory-print aria-label="A4 그림책 인쇄">{printPreview&&<div className={styles.printControls}><h2 ref={printHeading} tabIndex={-1}>A4 미리보기</h2><button onClick={()=>window.print()}>A4 인쇄</button><button onClick={()=>{setPrintPreview(false);printLauncher.current?.focus();}}>미리보기 닫기</button></div>}<article className={styles.printCover}><div className={styles.printCoverArt}><BookCover project={coverProject} edition={original?'original':'own'}/></div><p>{project.description}</p><p>{project.authorDisplayName&&`${project.authorDisplayName} 지음`}</p></article>{project.pages.map((page,i)=><article key={page.id}><Art page={page} label={`${i+1}쪽 삽화`}/><h2>{page.title}</h2><p>{page.text}</p><small>{i+1}쪽</small></article>)}{project.cover.authorNote&&<article><h2>{project.title}</h2><p>{project.cover.authorNote}</p></article>}</section>}
  {coverOpen&&!original&&<BookCoverEditor project={coverProject} onCancel={()=>setCoverOpen(false)} onApply={(cover,title)=>{update(applyShortStoryCover(project,cover,title));setCoverOpen(false);}}/>}
 </main>;
}
