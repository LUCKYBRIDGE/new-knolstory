'use client';
import {useEffect,useRef,useState} from 'react';
import {documentList,documentRead,documentTrash,documentRestore,type OnlineDocumentMetadata,type OnlineDocument} from '../lib/document-api';
import {useAccountSession} from './use-account-session';
import {useBoundedAccountPanel} from './use-bounded-account-panel';
import styles from './online-works-panel.module.css';
type LocalWork=Readonly<{key:string;title:string}>;
type Props={acceptedFormat?:'knolstory'|'shortstory';works:readonly LocalWork[];disabled?:boolean;onSaveNew:(key:string,accountId:string,csrf:string,isCurrent:()=>boolean)=>Promise<{includesLatest:boolean}|undefined>;onOpen:(value:OnlineDocument,accountId:string,isCurrent:()=>boolean)=>Promise<void>};
export function OnlineWorksPanel({acceptedFormat='knolstory',works,disabled=false,onSaveNew,onOpen}:Props){
 const account=useAccountSession(),[documents,setDocuments]=useState<readonly OnlineDocumentMetadata[]>([]),[cursor,setCursor]=useState<string|null>(null);
 const [range,setRange]=useState<'active'|'trash'>('active'),[confirmTrash,setConfirmTrash]=useState<OnlineDocumentMetadata|null>(null);
 const pending=useRef(new Map<string,Readonly<{key:string;revision:number;stateVersion:number}>>());
 const [loadedOwner,setLoadedOwner]=useState<string|null>(null);
 const [selected,setSelected]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const menu=useRef<HTMLDetailsElement>(null);
 useBoundedAccountPanel(menu);
 const mounted=useRef({active:true}),sequence=useRef(0),busyRef=useRef(false),latest=useRef({onSaveNew,onOpen,accountId:account.session?.accountId});
 useEffect(()=>{latest.current={onSaveNew,onOpen,accountId:account.session?.accountId};},[onSaveNew,onOpen,account.session?.accountId]);
 useEffect(()=>{const lifetime=mounted.current;lifetime.active=true;return()=>{lifetime.active=false;};},[]);
 useEffect(()=>{const invalidate=()=>{sequence.current++;latest.current={...latest.current,accountId:undefined};busyRef.current=false;setBusy(false);setDocuments([]);setLoadedOwner(null);setCursor(null);setNotice('');setError('');setConfirmTrash(null);pending.current.clear();};window.addEventListener('knolstory-account-session-changed',invalidate);return()=>window.removeEventListener('knolstory-account-session-changed',invalidate);},[]);
 useEffect(()=>{sequence.current++;busyRef.current=false;const timer=window.setTimeout(()=>{setDocuments([]);setLoadedOwner(null);setCursor(null);setBusy(false);setNotice('');setError('');setConfirmTrash(null);pending.current.clear();},0);return()=>window.clearTimeout(timer);},[account.session?.accountId]);
 async function operation(run:(current:()=>boolean,accountId:string,csrf:string)=>Promise<void>){
  if(disabled||busyRef.current||account.loading||!account.session)return;
  const request=++sequence.current,session=account.session;
  const current=()=>mounted.current.active&&request===sequence.current&&latest.current.accountId===session.accountId;
  busyRef.current=true;setBusy(true);setError('');setNotice('');
  try{await run(current,session.accountId,session.csrf);}
  catch(issue){if(current())setError(issue instanceof Error?issue.message:'온라인 작업을 마치지 못했어요. 기기의 원고는 유지됩니다.');}
  finally{if(current()){busyRef.current=false;setBusy(false);}}
 }
 const list=(more=false,nextRange=range)=>operation(async(current,accountId)=>{const result=await documentList(undefined,more?cursor??undefined:undefined,accountId,nextRange);if(!current())return;setRange(nextRange);setConfirmTrash(null);
  for(const record of result.documents)for(const action of ['trash','restore']){const requestId=`${accountId}:${record.recordId}:${action}`,captured=pending.current.get(requestId);if(captured&&(captured.revision!==record.revision||captured.stateVersion!==record.stateVersion))pending.current.delete(requestId);}
  setDocuments(previous=>more&&loadedOwner===accountId?[...previous,...result.documents]:result.documents);setLoadedOwner(accountId);setCursor(result.nextCursor);});
 const save=()=>operation(async(current,accountId,csrf)=>{if(!works.some(work=>work.key===selected))throw Error('업로드할 기기 작품을 골라 주세요.');const result=await latest.current.onSaveNew(selected,accountId,csrf,current);if(current()&&result)setNotice(result.includesLatest?'온라인에 업로드했어요. 로컬 작품 파일 저장은 별도로 해 주세요. 기기의 원고도 그대로 유지됩니다.':'이전에 보낸 요청의 업로드를 확인했어요. 이후 바꾼 내용도 올리려면 다시 업로드해 주세요.');});
 const open=(record:OnlineDocumentMetadata)=>operation(async(current,accountId)=>{const value=await documentRead(record.recordId,undefined,accountId);if(!current())return;await latest.current.onOpen(value,accountId,current);});
 const changeState=(record:OnlineDocumentMetadata,action:'trash'|'restore')=>operation(async(current,accountId,csrf)=>{
  if(record.stateVersion===undefined)throw Error('목록을 새로고침한 뒤 다시 확인해 주세요.');
  const requestId=`${accountId}:${record.recordId}:${action}`;
  const existing=pending.current.get(requestId);
  const captured=existing??{key:crypto.randomUUID(),revision:record.revision,stateVersion:record.stateVersion};
  pending.current.set(requestId,captured);
  const receipt=await (action==='trash'?documentTrash:documentRestore)(record.recordId,captured.revision,captured.stateVersion,captured.key,csrf,undefined,accountId);
  if(!current())return;
  pending.current.delete(requestId);setConfirmTrash(null);
  setDocuments(previous=>previous.filter(item=>item.recordId!==receipt.recordId));
  setNotice(receipt.replayed?'이전에 보낸 요청의 처리를 확인했어요. 현재 상태는 새로고침한 목록을 확인해 주세요. 기기의 원고는 그대로 유지됩니다.':action==='trash'?'온라인 휴지통으로 옮겼어요. 기기의 원고는 그대로 유지됩니다.':'같은 온라인 작품과 이력으로 복구했어요. 기기의 원고는 그대로 유지됩니다.');
  const result=await documentList(undefined,undefined,accountId,range);
  if(!current())return;
  setDocuments(result.documents);setLoadedOwner(accountId);setCursor(result.nextCursor);
 });
 const refresh=()=>{
  void list();
 };
 const listVisible=!account.loading&&loadedOwner===account.session?.accountId;
 return <details ref={menu} className={styles.menu} data-online-works><summary>온라인 작품</summary><section aria-label="온라인 작품" className={styles.panel}>
  <strong>내 온라인 작품</strong><p>작품은 먼저 기기의 작품 파일로 저장해 주세요. 온라인에는 작품을 업로드하며, 업로드는 작품 파일 저장을 대신하지 않아요.</p>
  {account.loading?<p role="status">로그인 확인 중이에요.</p>:!account.session?<p>{account.error||'계정 메뉴에서 로그인한 뒤 이용할 수 있어요.'}</p>:<>
   <div role="group" aria-label="온라인 작품 범위"><button disabled={disabled||busy} aria-pressed={range==='active'} onClick={()=>void list(false,'active')}>업로드한 작품</button><button disabled={disabled||busy} aria-pressed={range==='trash'} onClick={()=>void list(false,'trash')}>온라인 휴지통</button></div>
   <button disabled={disabled||busy} onClick={refresh}>목록 새로고침</button>
   <label>온라인에 업로드할 기기 작품<select aria-label="온라인에 업로드할 기기 작품" value={selected} disabled={disabled||busy} onChange={event=>setSelected(event.target.value)}><option value="">작품 선택</option>{works.map(work=><option key={work.key} value={work.key}>{work.title}</option>)}</select></label>
   <button disabled={disabled||busy||!works.some(work=>work.key===selected)} onClick={()=>void save()}>선택한 작품 업로드</button>
   <p>처음 업로드하면 새 온라인 작품이 생겨요. 이전에 업로드한 서재 작품을 다시 업로드하면 연결된 온라인 작품을 갱신해요. 온라인 작품을 열면 서재에 별도 사본을 만들고 기존 원고는 유지해요. 다른 곳에서 수정한 내용과 충돌하면 온라인 사본을 열어 비교하거나, 서재에서 사본을 만들어 새 온라인 작품으로 업로드해 주세요.</p>
   {range==='trash'&&<p>온라인 휴지통에서 복구하면 같은 작품과 업로드 이력을 이어갑니다. 기기의 원고는 바뀌지 않아요.</p>}
   <ul>{(listVisible?documents:[]).map(record=><li key={record.recordId}><span>{record.title}</span>{range==='trash'?<button disabled={disabled||busy||record.stateVersion===undefined} aria-label={`${record.title} · 온라인 작품 복구`} onClick={()=>void changeState(record,'restore')}>온라인 작품 복구</button>:<>{record.format===acceptedFormat?<button disabled={disabled||busy} aria-label={`${record.title} · 기기에 사본으로 열기`} onClick={()=>void open(record)}>기기에 사본으로 열기</button>:<small>{record.format==='shortstory'?'숏스토리 그림책 화면에서 열 수 있어요.':'놀스토리 서재에서 열 수 있어요.'}</small>}<button disabled={disabled||busy||record.stateVersion===undefined} aria-label={`${record.title} · 온라인 휴지통으로 이동`} onClick={()=>setConfirmTrash(record)}>온라인 휴지통으로 이동</button></>}</li>)}</ul>
   {listVisible&&confirmTrash&&<div role="group" aria-label="온라인 휴지통 이동 확인"><p>‘{confirmTrash.title}’을 온라인 휴지통으로 옮길까요? 기기에 있는 원고는 유지되고, 온라인 휴지통에서 같은 작품으로 복구할 수 있어요.</p><button disabled={disabled||busy} onClick={()=>setConfirmTrash(null)}>취소</button><button disabled={disabled||busy} onClick={()=>void changeState(confirmTrash,'trash')}>확인하고 온라인 휴지통으로 이동</button></div>}
   {listVisible&&cursor&&<button disabled={disabled||busy} onClick={()=>void list(true)}>목록 더 보기</button>}
   {busy&&<p role="status">온라인 작업 중이에요.</p>}
  </>}
  {!account.loading&&<button disabled={disabled||busy} onClick={()=>void account.refresh()}>로그인 상태 다시 확인</button>}
  {notice&&<p role="status">{notice}</p>}{error&&<p role="alert">{error}</p>}
 </section></details>;
}
