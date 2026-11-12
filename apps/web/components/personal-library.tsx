'use client';
import {useMemo,useRef,useState,useEffect} from 'react';
import {ServiceNavigation} from './service-navigation';
import {useClassroomMe} from './use-classroom-me';
import {onlineEnabled} from '../lib/online-mode';
import type {OnlineDocumentMetadata} from '../lib/document-api';
import {readOnlineShelfBindings} from '../lib/online-work-bindings';
import {projectOnlineShelf,type OnlineShelfStatus} from '../lib/unified-library';
import {isPersonalLibraryKind} from '../lib/library-catalog';
import {trapDialogTab} from '../lib/dialog-keyboard';
import {AccountMenu} from './account-menu';
import {LocalBookshelf,type LocalBookshelfProps} from './local-bookshelf';
import {LibraryStorageBadge,StorageIcon} from './library-storage';
import {useOnlineWorks,type OnlineWorksProps} from './use-online-works';
import styles from './personal-library.module.css';

type Props=Omit<LocalBookshelfProps,'accountMenu'|'online'>&{beforeAccountNavigation:()=>boolean;beforeServiceNavigation:()=>boolean;onlineDisabled?:boolean;onSaveOnline:OnlineWorksProps['onSaveNew'];onOpenOnline:OnlineWorksProps['onOpen']};
export function PersonalLibrary({onSaveOnline,onOpenOnline,beforeAccountNavigation,beforeServiceNavigation,onlineDisabled=false,...shelf}:Props){
 const personal=useMemo(()=>shelf.works.filter(work=>isPersonalLibraryKind(work.kind)),[shelf.works]);
 // Online works belong to teachers and admins (classroom-design §1); members and students keep works on the device.
 const classroom=useClassroomMe();
 const onlineAllowed=classroom.role==='teacher'||classroom.role==='admin';
 const online=useOnlineWorks({works:personal.map(work=>({key:work.key,title:work.project.title})),disabled:onlineDisabled||shelf.disabled||!onlineAllowed,onSaveNew:onSaveOnline,onOpen:onOpenOnline});
 const [trashOpen,setTrashOpen]=useState(false),[target,setTarget]=useState<{key:string;title:string}|null>(null);
 const trashTrigger=useRef<HTMLButtonElement>(null);
 const owner=onlineAllowed?online.account.session?.accountId:undefined;
 const projection=(()=>{
  let bindings:ReturnType<typeof readOnlineShelfBindings>={};
  if(owner&&typeof window!=='undefined'){
   try{bindings=readOnlineShelfBindings(localStorage,owner,personal.map(work=>work.key));}
   catch{bindings=Object.fromEntries(personal.map(work=>[work.key,{binding:null,error:true}]));}
  }
  return projectOnlineShelf(personal,online.activeDocuments,bindings,'knolstory');
 })();
 const unavailable=onlineDisabled||!!shelf.disabled||online.busy||online.account.loading;
 const feedback=(key:string)=>target?.key===key?{notice:online.notice,error:online.error}:{};
 const stateAction=(record:OnlineDocumentMetadata,action:'trash'|'restore',key=`remote:${record.recordId}`)=>{setTarget({key,title:record.title});void online.changeState(record,action);};
 const header=<div className={styles.statusBar} aria-label="작품 보관 안내">
  {owner&&<div className={styles.legend}><StorageIcon online/><span>구름 표시가 있는 책은 온라인에도 있어요.</span></div>}
  {online.account.loading?<span role="status">로그인 확인 중이에요.</span>:owner?<div className={styles.controls}><button disabled={unavailable} onClick={()=>void online.list(false,'active')}>온라인 목록 다시 확인</button><button ref={trashTrigger} aria-disabled={unavailable} onClick={()=>{if(unavailable)return;setTrashOpen(true);void online.list(false,'trash');}}>온라인 휴지통</button></div>:online.account.session?<span>{classroom.role==='student'?'작품은 이 기기에 저장돼요. 과제 제출은 위의 ‘내 과제’에서 해요.':'내 작품은 이 기기에 3개까지 둘 수 있어요.'}</span>:<span>{online.account.error||'로그인하면 온라인 작품도 함께 보여요.'}</span>}
  {online.busy&&<p role="status">온라인 작품을 확인하고 있어요.</p>}
  {online.notice&&<p role="status">{target?`‘${target.title}’ · `:''}{online.notice}</p>}{online.error&&<p role="alert">{online.error}</p>}
 </div>;
 return <>
  <LocalBookshelf {...shelf} navigation={<ServiceNavigation role={classroom.role} active="library" beforeNavigate={beforeServiceNavigation}/>} accountMenu={onlineEnabled&&<AccountMenu account={online.account} beforeNavigate={beforeAccountNavigation} disabled={onlineDisabled||shelf.disabled}/>} online={onlineEnabled?{records:projection.remoteOnly,byLocalKey:projection.byLocalKey,header,busy:online.busy,more:!!online.activeCursor,onMore:()=>void online.list(true,'active'),onOpen:record=>{setTarget({key:`remote:${record.recordId}`,title:record.title});void online.open(record);},renderLocalActions:work=>{
   if(!isPersonalLibraryKind(work.kind))return null;
   const key=`local:${work.key}`,status=projection.byLocalKey[work.key]??{kind:'local' as const,label:'이 기기에 있음'};
   return <OnlineLibraryActions key={key} status={status} disabled={unavailable} signedIn={!!owner} {...feedback(key)} onUpload={()=>{setTarget({key,title:work.project.title});void online.save(work.key);}} onOpenOnline={status.record?()=>{setTarget({key,title:work.project.title});void online.open(status.record!);}:undefined} onTrash={status.record?()=>stateAction(status.record!,'trash',key):undefined}/>;
  },renderRemoteActions:record=><OnlineLibraryActions key={record.recordId} status={{kind:'remote',label:'온라인에 있음',record}} disabled={unavailable} signedIn={!!owner} {...feedback(`remote:${record.recordId}`)} onTrash={()=>stateAction(record,'trash')}/>}:undefined}/>
  {trashOpen&&owner&&<OnlineTrashDialog documents={online.range==='trash'?online.documents:[]} busy={online.busy} error={online.error} notice={online.notice} cursor={online.range==='trash'?online.cursor:null} onMore={()=>void online.list(true,'trash')} onClose={()=>{setTrashOpen(false);requestAnimationFrame(()=>trashTrigger.current?.focus());}} onRestore={record=>stateAction(record,'restore')}/>}
 </>;
}
function OnlineLibraryActions({status,disabled,signedIn,onUpload,onOpenOnline,onTrash,notice,error}:{status:OnlineShelfStatus;disabled:boolean;signedIn:boolean;onUpload?:()=>void;onOpenOnline?:()=>void;onTrash?:()=>void;notice?:string;error?:string}){
 const [confirming,setConfirming]=useState(false);
 return <><LibraryStorageBadge status={status}/>{onUpload&&<><p>{signedIn?'바꾼 내용은 직접 업로드할 때 온라인에 반영돼요.':'로그인하면 이 책을 온라인에도 보관할 수 있어요.'}</p>{signedIn&&<button disabled={disabled||status.kind==='unknown'} onClick={onUpload}>{status.kind==='linked'?'다시 업로드':'온라인에 업로드'}</button>}</>}
  {signedIn&&onOpenOnline&&<button disabled={disabled} onClick={onOpenOnline}>온라인 사본 열기</button>}
  {signedIn&&onTrash&&(confirming?<div role="group" aria-label="온라인 휴지통 이동 확인"><p>이 기기의 원고는 유지하고 온라인 작품만 휴지통으로 옮길까요?</p><button disabled={disabled} onClick={()=>setConfirming(false)}>취소</button><button disabled={disabled} onClick={onTrash}>온라인 휴지통으로 옮기기</button></div>:<button disabled={disabled||status.record?.stateVersion===undefined} onClick={()=>setConfirming(true)}>온라인 휴지통으로 이동</button>)}
  {notice&&<p role="status">{notice}</p>}{error&&<p role="alert">{error}</p>}
 </>;
}
function OnlineTrashDialog({documents,busy,error,notice,cursor,onClose,onRestore,onMore}:{documents:readonly OnlineDocumentMetadata[];busy:boolean;error:string;notice:string;cursor:string|null;onClose:()=>void;onRestore:(record:OnlineDocumentMetadata)=>void;onMore:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const opener=document.activeElement as HTMLElement|null,node=dialog.current;node?.showModal();return()=>{node?.close();opener?.focus();};},[]);
 return <dialog ref={dialog} className={styles.trash} aria-label="온라인 휴지통" onCancel={event=>{event.preventDefault();onClose();}} onKeyDown={event=>trapDialogTab(event,dialog.current)}><header><h2>온라인 휴지통</h2><button onClick={onClose}>닫기</button></header><p>복구하면 같은 온라인 작품과 업로드 이력을 이어가요. 기기에 있는 원고는 그대로예요.</p>{!busy&&!documents.length&&!error&&<p>온라인 휴지통에 작품이 없어요.</p>}<ul>{documents.map(record=><li key={record.recordId}><span>{record.title}<small>{record.format==='shortstory'?'숏스토리':'놀스토리'}</small></span><button disabled={busy||record.stateVersion===undefined} aria-label={`${record.title} · 온라인 작품 복구`} onClick={()=>onRestore(record)}>복구</button></li>)}</ul>{busy&&<p role="status">온라인 휴지통을 확인하고 있어요.</p>}{notice&&<p role="status">{notice}</p>}{error&&<p role="alert">{error}</p>}{cursor&&<button disabled={busy} onClick={onMore}>목록 더 보기</button>}</dialog>;
}
