'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {documentList,documentRead,documentTrash,documentRestore,type OnlineDocumentMetadata,type OnlineDocument} from '../lib/document-api';
import {useAccountSession} from './use-account-session';

export type OnlineLocalWork=Readonly<{key:string;title:string}>;
export type OnlineWorksProps={acceptedFormat?:'knolstory'|'shortstory';works:readonly OnlineLocalWork[];disabled?:boolean;captureOpenContext?:()=>()=>boolean;onSaveNew:(key:string,accountId:string,csrf:string,isCurrent:()=>boolean)=>Promise<{includesLatest:boolean}|undefined>;onOpen:(value:OnlineDocument,accountId:string,isCurrent:()=>boolean)=>Promise<void>};
type Range='active'|'trash';
type Current=()=>boolean;

/** Account-scoped metadata and explicitly requested online actions. No automatic uploads or snapshot reads. */
export function useOnlineWorks({works,disabled=false,onSaveNew,onOpen,captureOpenContext}:OnlineWorksProps){
 const account=useAccountSession();
 const [documents,setDocuments]=useState<readonly OnlineDocumentMetadata[]>([]),[cursor,setCursor]=useState<string|null>(null);
 const [activeDocuments,setActiveDocuments]=useState<readonly OnlineDocumentMetadata[]>([]),[activeCursor,setActiveCursor]=useState<string|null>(null),[activeOwner,setActiveOwner]=useState<string|null>(null);
 const [range,setRange]=useState<Range>('active'),[confirmTrash,setConfirmTrash]=useState<OnlineDocumentMetadata|null>(null),[loadedOwner,setLoadedOwner]=useState<string|null>(null);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const pending=useRef(new Map<string,Readonly<{key:string;revision:number;stateVersion:number}>>());
 const mounted=useRef({active:true}),sequence=useRef(0),busyRef=useRef(false),autoOwner=useRef<string|null>(null);
 const latest=useRef({onSaveNew,onOpen,captureOpenContext,account,works,disabled,range,cursor,loadedOwner,activeCursor,activeOwner});
 useEffect(()=>{latest.current={onSaveNew,onOpen,captureOpenContext,account,works,disabled,range,cursor,loadedOwner,activeCursor,activeOwner};});
 useEffect(()=>{const lifetime=mounted.current;lifetime.active=true;return()=>{lifetime.active=false;};},[]);
 const reset=useCallback(()=>{setDocuments([]);setLoadedOwner(null);setCursor(null);setActiveDocuments([]);setActiveCursor(null);setActiveOwner(null);setRange('active');setBusy(false);setNotice('');setError('');setConfirmTrash(null);pending.current.clear();},[]);
 useEffect(()=>{
  const invalidate=()=>{sequence.current++;autoOwner.current=null;latest.current={...latest.current,account:{...latest.current.account,session:null}};busyRef.current=false;reset();};
  window.addEventListener('knolstory-account-session-changed',invalidate);return()=>window.removeEventListener('knolstory-account-session-changed',invalidate);
 },[reset]);
 useEffect(()=>{sequence.current++;busyRef.current=false;autoOwner.current=null;const timer=window.setTimeout(reset,0);return()=>window.clearTimeout(timer);},[account.session?.accountId,reset]);
 const operation=useCallback(async(run:(current:Current,accountId:string,csrf:string)=>Promise<void>)=>{
  const state=latest.current;
  if(state.disabled||busyRef.current||state.account.loading||!state.account.session)return;
  const request=++sequence.current,session=state.account.session;
  const current=()=>mounted.current.active&&request===sequence.current&&latest.current.account.session?.accountId===session.accountId;
  busyRef.current=true;setBusy(true);setError('');setNotice('');
  try{await run(current,session.accountId,session.csrf);}
  catch(issue){if(current())setError(issue instanceof Error?issue.message:'온라인 작업을 마치지 못했어요. 기기의 원고는 유지됩니다.');}
  finally{if(current()){busyRef.current=false;setBusy(false);}}
 },[]);
 const load=useCallback(async(current:Current,accountId:string,more:boolean,nextRange:Range,display=true)=>{
  const state=latest.current,previousOwner=nextRange==='active'?state.activeOwner:state.loadedOwner;
  const nextCursor=nextRange==='active'?state.activeCursor:state.cursor;
  const result=await documentList(undefined,more?nextCursor??undefined:undefined,accountId,nextRange);
  if(!current())return;
  for(const record of result.documents)for(const action of ['trash','restore']){
   const requestId=`${accountId}:${record.recordId}:${action}`,captured=pending.current.get(requestId);
   if(captured&&(captured.revision!==record.revision||captured.stateVersion!==record.stateVersion))pending.current.delete(requestId);
  }
  const merge=(previous:readonly OnlineDocumentMetadata[])=>more&&previousOwner===accountId?Array.from(new Map([...previous,...result.documents].map(record=>[record.recordId,record])).values()):result.documents;
  if(nextRange==='active'){setActiveDocuments(merge);setActiveCursor(result.nextCursor);setActiveOwner(accountId);}
  if(display){setRange(nextRange);setConfirmTrash(null);setDocuments(previous=>more&&state.range===nextRange?merge(previous):result.documents);setLoadedOwner(accountId);setCursor(result.nextCursor);}
 },[]);
 const list=useCallback((more=false,nextRange:Range=latest.current.range)=>operation((current,owner)=>load(current,owner,more,nextRange)),[operation,load]);
 useEffect(()=>{
  const owner=account.session?.accountId;
  if(!owner||account.loading||disabled||autoOwner.current===owner)return;
  const timer=window.setTimeout(()=>{if(latest.current.account.session?.accountId!==owner||latest.current.account.loading||latest.current.disabled)return;autoOwner.current=owner;void list(false,'active');},0);
  return()=>window.clearTimeout(timer);
 },[account.session?.accountId,account.loading,disabled,list]);
 const save=useCallback((key:string)=>operation(async(current,accountId,csrf)=>{
  if(!latest.current.works.some(work=>work.key===key))throw Error('업로드할 기기 작품을 골라 주세요.');
  const result=await latest.current.onSaveNew(key,accountId,csrf,current);
  if(!current()||!result)return;
  setNotice(result.includesLatest?'온라인에 업로드했어요. 로컬 작품 파일 저장은 별도로 해 주세요. 기기의 원고도 그대로 유지됩니다.':'이전에 보낸 요청의 업로드를 확인했어요. 이후 바꾼 내용도 올리려면 다시 업로드해 주세요.');
  try{await load(current,accountId,false,'active',latest.current.range==='active');}
  catch{if(current())setError('업로드는 마쳤지만 온라인 목록을 다시 확인하지 못했어요. 목록을 새로고침해 주세요.');}
 }),[operation,load]);
 const open=useCallback((record:OnlineDocumentMetadata)=>operation(async(current,accountId)=>{
  const contextIsCurrent=latest.current.captureOpenContext?.();
  const canOpen=()=>current()&&(contextIsCurrent?.()??true);
  const value=await documentRead(record.recordId,undefined,accountId);
  if(canOpen())await latest.current.onOpen(value,accountId,canOpen);
 }),[operation]);
 const changeState=useCallback((record:OnlineDocumentMetadata,action:'trash'|'restore')=>operation(async(current,accountId,csrf)=>{
  if(record.stateVersion===undefined)throw Error('목록을 새로고침한 뒤 다시 확인해 주세요.');
  const requestId=`${accountId}:${record.recordId}:${action}`,captured=pending.current.get(requestId)??{key:crypto.randomUUID(),revision:record.revision,stateVersion:record.stateVersion};
  pending.current.set(requestId,captured);
  const receipt=await(action==='trash'?documentTrash:documentRestore)(record.recordId,captured.revision,captured.stateVersion,captured.key,csrf,undefined,accountId);
  if(!current())return;
  pending.current.delete(requestId);setConfirmTrash(null);setDocuments(previous=>previous.filter(item=>item.recordId!==receipt.recordId));
  if(action==='trash')setActiveDocuments(previous=>previous.filter(item=>item.recordId!==receipt.recordId));
  setNotice(receipt.replayed?'이전에 보낸 요청의 처리를 확인했어요. 현재 상태는 새로고침한 목록을 확인해 주세요. 기기의 원고는 그대로 유지됩니다.':action==='trash'?'온라인 휴지통으로 옮겼어요. 기기의 원고는 그대로 유지됩니다.':'같은 온라인 작품과 이력으로 복구했어요. 기기의 원고는 그대로 유지됩니다.');
  const nextRange=latest.current.range;
  await load(current,accountId,false,nextRange);
  if(nextRange==='trash')await load(current,accountId,false,'active',false);
 }),[operation,load]);
 const listVisible=!account.loading&&!!account.session&&loadedOwner===account.session.accountId;
 const activeVisible=!account.loading&&!!account.session&&activeOwner===account.session.accountId;
 return {account,documents:listVisible?documents:[],cursor:listVisible?cursor:null,activeDocuments:activeVisible?activeDocuments:[],activeCursor:activeVisible?activeCursor:null,range,busy,error,notice,listVisible,list,refresh:()=>list(),save,open,changeState,confirmTrash:listVisible?confirmTrash:null,setConfirmTrash};
}
