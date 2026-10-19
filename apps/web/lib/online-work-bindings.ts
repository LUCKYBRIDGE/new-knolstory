import {prepareJsonbSnapshot,restoreJsonbSnapshot,type AuthoringJsonbSnapshot} from '@knolstory/compatibility';
import {documentCreate,documentSave,OnlineDocumentError,type OnlineDocument,type OnlineDocumentReceipt} from './document-api';
export type OnlineWorkBinding=Readonly<{recordId:string;remoteProjectId:string;format:'knolstory'|'shortstory';revision:number;contentSha256:string}>;
export type PendingOnlineSave=Readonly<{key:string;snapshot:AuthoringJsonbSnapshot;recordId?:string;expectedRevision?:number}>;
type State={version:1;binding:OnlineWorkBinding|null;pending:PendingOnlineSave|null};
type Disk=Pick<Storage,'getItem'|'setItem'>;
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const hash=/^[a-f0-9]{64}$/;
const positive=(value:unknown):value is number=>typeof value==='number'&&Number.isSafeInteger(value)&&value>0;
const object=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
function invalid():never{throw Error('온라인 연결 기록을 확인하지 못했어요. 원고와 기록은 그대로 유지됩니다.');}
function binding(value:unknown):value is OnlineWorkBinding{
 return object(value)&&typeof value.recordId==='string'&&uuid.test(value.recordId)&&typeof value.remoteProjectId==='string'&&!!value.remoteProjectId&&['knolstory','shortstory'].includes(value.format as string)&&positive(value.revision)&&typeof value.contentSha256==='string'&&hash.test(value.contentSha256);
}
function parse(raw:string|null):State{
 if(raw===null)return {version:1,binding:null,pending:null};
 let value:unknown;try{value=JSON.parse(raw);}catch{invalid();}
 if(!object(value)||value.version!==1||Object.keys(value).length!==3||!(value.binding===null||binding(value.binding))||!(value.pending===null||object(value.pending)))invalid();
 const pending=value.pending;
 if(pending!==null){
  if(typeof pending.key!=='string'||! /^[A-Za-z0-9_-]{1,128}$/.test(pending.key)||!object(pending.snapshot))invalid();
  if(value.binding===null){if(pending.recordId!==undefined||pending.expectedRevision!==undefined)invalid();}
  else if(pending.recordId!==value.binding.recordId||pending.expectedRevision!==value.binding.revision)invalid();
 }
 return value as unknown as State;
}
function key(accountId:string,localKey:string){
 if(typeof accountId!=='string'||!uuid.test(accountId)||typeof localKey!=='string'||!localKey||localKey.length>256)invalid();
 return `knolstory-online-work-v1:${accountId}:${encodeURIComponent(localKey)}`;
}
/** Separate device journal. Failed acknowledgments retain the exact command for retry. */
export function createOnlineWorkStore(storage:Disk,options:Readonly<{assertWritable?:()=>void}>={}){
 function read(accountId:string,localKey:string){const name=key(accountId,localKey),raw=storage.getItem(name);return {name,raw,state:parse(raw)};}
 function write(entry:ReturnType<typeof read>,state:State){
  options.assertWritable?.();
  if(storage.getItem(entry.name)!==entry.raw)throw Error('다른 창에서 온라인 연결 기록을 바꿨어요. 다시 확인해 주세요.');
  storage.setItem(entry.name,JSON.stringify(state));
 }
 return {
  get(accountId:string,localKey:string):OnlineWorkBinding|null{return structuredClone(read(accountId,localKey).state.binding);},
  async prepare(accountId:string,localKey:string,value:AuthoringJsonbSnapshot):Promise<PendingOnlineSave>{
   options.assertWritable?.();const entry=read(accountId,localKey);
   if(entry.state.pending){await restoreJsonbSnapshot(entry.state.pending.snapshot);return structuredClone(entry.state.pending);}
   const archive=await restoreJsonbSnapshot(structuredClone(value)),linked=entry.state.binding;
   if(linked){
    if(archive.format!==linked.format)invalid();
    if(archive.format==='knolstory')archive.document.project={...archive.document.project,id:linked.remoteProjectId};
    else archive.project={...archive.project,id:linked.remoteProjectId};
   }
   const snapshot=await prepareJsonbSnapshot(archive),pending:PendingOnlineSave={key:crypto.randomUUID(),snapshot,...(linked?{recordId:linked.recordId,expectedRevision:linked.revision}:{})};
   write(entry,{...entry.state,pending});return structuredClone(pending);
  },
  complete(accountId:string,localKey:string,pending:PendingOnlineSave,receipt:OnlineDocumentReceipt):OnlineWorkBinding{
   const entry=read(accountId,localKey);
   if(!entry.state.pending||JSON.stringify(entry.state.pending)!==JSON.stringify(pending)||!uuid.test(receipt.recordId)||!positive(receipt.revision)||receipt.contentSha256!==pending.snapshot.contentSha256||receipt.revision!==(pending.expectedRevision??0)+1||pending.recordId!==undefined&&receipt.recordId!==pending.recordId)invalid();
   const archive=pending.snapshot.content,project=archive.format==='knolstory'?archive.document.project:archive.project;
   const linked:OnlineWorkBinding={recordId:receipt.recordId,revision:receipt.revision,contentSha256:receipt.contentSha256,format:archive.format,remoteProjectId:project.id};
   write(entry,{version:1,binding:linked,pending:null});return structuredClone(linked);
  },
  reject(accountId:string,localKey:string,pending:PendingOnlineSave):void{
   const entry=read(accountId,localKey);if(JSON.stringify(entry.state.pending)!==JSON.stringify(pending))invalid();
   write(entry,{...entry.state,pending:null});
  },
  bind(accountId:string,localKey:string,remote:OnlineDocument):OnlineWorkBinding{
   const entry=read(accountId,localKey);if(entry.state.binding||entry.state.pending)invalid();
   const linked:OnlineWorkBinding={recordId:remote.recordId,revision:remote.revision,contentSha256:remote.contentSha256,format:remote.format,remoteProjectId:remote.clientProjectId};
   if(!binding(linked))invalid();write(entry,{version:1,binding:linked,pending:null});return structuredClone(linked);
  },
 };
}
export type OnlineWorkStore=ReturnType<typeof createOnlineWorkStore>;
export async function saveOnlineWork(store:OnlineWorkStore,accountId:string,localKey:string,snapshot:AuthoringJsonbSnapshot,csrf:string,fetcher:typeof fetch=fetch,options:Readonly<{isCurrent?:()=>boolean}>={}){
 const captured=structuredClone(snapshot),pending=await store.prepare(accountId,localKey,captured);
 const archive=await restoreJsonbSnapshot(captured),remote=pending.snapshot.content;
 const remoteId=remote.format==='knolstory'?remote.document.project.id:remote.project.id;
 if(archive.format==='knolstory')archive.document.project={...archive.document.project,id:remoteId};else archive.project={...archive.project,id:remoteId};
 const includesLatest=(await prepareJsonbSnapshot(archive)).contentSha256===pending.snapshot.contentSha256;
 if(options.isCurrent&&!options.isCurrent())throw Error('작업 상태가 바뀌어 온라인 전송을 멈췄어요. 기기의 원고와 재시도 기록은 유지됩니다.');
 let receipt:OnlineDocumentReceipt;
 try{receipt=pending.recordId===undefined?await documentCreate(pending.snapshot,pending.key,csrf,fetcher,accountId):await documentSave(pending.recordId,pending.snapshot,pending.expectedRevision!,pending.key,csrf,fetcher,accountId);}
 catch(error){
  if(error instanceof OnlineDocumentError&&(error.status===422&&error.code==='CATALOG_MEDIA_REQUIRED'||error.status===400&&error.code==='INVALID_SNAPSHOT'))store.reject(accountId,localKey,pending);
  throw error;
 }
 store.complete(accountId,localKey,pending,receipt);return {...receipt,includesLatest};
}
