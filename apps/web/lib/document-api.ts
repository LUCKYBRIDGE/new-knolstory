import {prepareJsonbSnapshot,restoreJsonbSnapshot,type AuthoringJsonbSnapshot} from '@knolstory/compatibility';
export type OnlineDocumentMetadata=Readonly<{recordId:string;revision:number;format:'knolstory'|'shortstory';clientProjectId:string;title:string;contentSha256:string;createdAt:number;updatedAt:number;stateVersion?:number;deletedAt?:number|null}>;
export type OnlineDocument=OnlineDocumentMetadata&Readonly<{snapshot:AuthoringJsonbSnapshot}>;
export type OnlineDocumentReceipt=Readonly<{recordId:string;revision:number;contentSha256:string;replayed:boolean}>;
export type OnlineDocumentStateReceipt=OnlineDocumentReceipt&Readonly<{stateVersion:number;deletedAt:number|null}>;
const documentErrorMessages:ReadonlyMap<string,string>=new Map([
 ['ACCOUNT_SESSION_CHANGED','로그인 계정이 바뀌었어요. 계정을 다시 확인한 뒤 시도해 주세요.'],
 ['REVISION_CONFLICT','다른 곳에서 수정한 작품이 있어요. 온라인 작품을 사본으로 불러와 비교해 주세요.'],
 ['DOCUMENT_TRASHED','온라인 휴지통에서 이 작품을 복구한 뒤 다시 업로드해 주세요. 기기의 원고는 유지됩니다.'],
 ['DOCUMENT_STATE_CONFLICT','온라인 작품 상태가 바뀌었어요. 목록을 새로고침한 뒤 다시 확인해 주세요.'],
 ['SESSION_REQUIRED','로그인을 다시 확인해 주세요.'],
 ['CATALOG_MEDIA_REQUIRED','온라인 업로드에는 서비스에 등록된 그림과 소리만 사용할 수 있어요. 기기의 원고는 유지됩니다.'],
 ['RATE_LIMITED','요청이 많아 잠시 처리할 수 없어요. 잠시 뒤 다시 시도해 주세요. 기기의 원고는 유지됩니다.'],
 ['INVALID_SNAPSHOT','작품 내용을 확인하지 못해 업로드하지 않았어요. 기기의 원고는 유지됩니다.'],
]);
export class OnlineDocumentError extends Error{
 constructor(readonly code:string,readonly status:number,readonly actualRevision?:number){
  super(documentErrorMessages.get(code)??'온라인 작품을 확인하지 못했어요. 기기의 원고는 유지됩니다.');
 }
}
const object=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const hash=/^[a-f0-9]{64}$/;
const integer=(value:unknown,min:number):value is number=>typeof value==='number'&&Number.isSafeInteger(value)&&value>=min;
const invalid=()=>new OnlineDocumentError('INVALID_RESPONSE',502);
function recordId(value:string){if(typeof value!=='string'||!uuid.test(value))throw new OnlineDocumentError('INVALID_REQUEST',400);return value;}
function metadata(value:unknown):OnlineDocumentMetadata{
 if(!object(value)||typeof value.recordId!=='string'||!uuid.test(value.recordId)||!integer(value.revision,1)||!['knolstory','shortstory'].includes(value.format as string)||typeof value.clientProjectId!=='string'||!value.clientProjectId||typeof value.title!=='string'||typeof value.contentSha256!=='string'||!hash.test(value.contentSha256)||!integer(value.createdAt,0)||!integer(value.updatedAt,value.createdAt))throw invalid();
 if(value.stateVersion!==undefined&&!integer(value.stateVersion,1)||value.deletedAt!==undefined&&value.deletedAt!==null&&!integer(value.deletedAt,0))throw invalid();
 return {recordId:value.recordId,revision:value.revision,format:value.format as OnlineDocumentMetadata['format'],clientProjectId:value.clientProjectId,title:value.title,contentSha256:value.contentSha256,createdAt:value.createdAt,updatedAt:value.updatedAt,...(value.stateVersion!==undefined?{stateVersion:value.stateVersion}:{}),...(value.deletedAt!==undefined?{deletedAt:value.deletedAt as number|null}:{})};
}
async function request(path:string,fetcher:typeof fetch,options:RequestInit={},expectedAccountId?:string){
 if(expectedAccountId!==undefined&&!uuid.test(expectedAccountId))throw new OnlineDocumentError('INVALID_REQUEST',400);
 if(expectedAccountId!==undefined)options={...options,headers:{...options.headers,'x-knolstory-account-id':expectedAccountId}};
 let response:Response,value:unknown;
 try{response=await fetcher(path,{credentials:'same-origin',cache:'no-store',redirect:'error',...options});value=await response.json();}catch{throw new OnlineDocumentError('SERVICE_UNAVAILABLE',503);}
 if(!response.ok){
  const allowed=['ACCOUNT_SESSION_CHANGED','SESSION_REQUIRED','NOT_FOUND','REVISION_CONFLICT','IDEMPOTENCY_CONFLICT','DOCUMENT_IDENTITY_CONFLICT','CATALOG_MEDIA_REQUIRED','INVALID_SNAPSHOT','INVALID_REQUEST','RATE_LIMITED','DOCUMENT_TRASHED','DOCUMENT_STATE_CONFLICT'];
  const error=object(value)&&object(value.error)?value.error:{};
  const code=typeof error.code==='string'&&allowed.includes(error.code)?error.code:'SERVICE_UNAVAILABLE';
  throw new OnlineDocumentError(code,response.status,code==='REVISION_CONFLICT'&&integer(error.actualRevision,1)?error.actualRevision:undefined);
 }
 if(!object(value)||value.success!==true||!object(value.data))throw invalid();return value.data;
}
export async function documentList(fetcher:typeof fetch=fetch,cursor?:string,expectedAccountId?:string,state:'active'|'trash'='active'):Promise<{documents:OnlineDocumentMetadata[];nextCursor:string|null}>{
 if(cursor!==undefined&&!/^[A-Za-z0-9_-]{1,256}$/.test(cursor))throw new OnlineDocumentError('INVALID_REQUEST',400);
 if(state!=='active'&&state!=='trash')throw new OnlineDocumentError('INVALID_REQUEST',400);
 const query=[...(state==='trash'?['state=trash']:[]),...(cursor?[`cursor=${encodeURIComponent(cursor)}`]:[])].join('&');
 const data=await request('/api/v1/documents'+(query?`?${query}`:''),fetcher,{},expectedAccountId);
 if(!Array.isArray(data.documents)||data.documents.length>50||!(data.nextCursor===null||typeof data.nextCursor==='string'&&/^[A-Za-z0-9_-]{1,256}$/.test(data.nextCursor)))throw invalid();
 return {documents:data.documents.map(metadata),nextCursor:data.nextCursor};
}
export async function documentRead(id:string,fetcher:typeof fetch=fetch,expectedAccountId?:string):Promise<OnlineDocument>{
 const data=await request(`/api/v1/documents/${recordId(id)}`,fetcher,{},expectedAccountId),info=metadata(data);
 let snapshot:AuthoringJsonbSnapshot;
 try{snapshot=await prepareJsonbSnapshot(await restoreJsonbSnapshot(data.snapshot));}catch{throw invalid();}
 const content=snapshot.content,project=content.format==='knolstory'?content.document.project:content.project;
 if(info.recordId!==id||info.format!==content.format||info.clientProjectId!==project.id||info.contentSha256!==snapshot.contentSha256)throw invalid();
 return {...info,snapshot};
}
async function write(id:string|undefined,snapshot:AuthoringJsonbSnapshot,revision:number|undefined,key:string,csrf:string,fetcher:typeof fetch,expectedAccountId?:string):Promise<OnlineDocumentReceipt>{
 if(typeof key!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(key)||typeof csrf!=='string'||!csrf||revision!==undefined&&!integer(revision,1))throw new OnlineDocumentError('INVALID_REQUEST',400);
 const captured=structuredClone(snapshot);
 const data=await request('/api/v1/documents'+(id?`/${recordId(id)}`:''),fetcher,{method:id?'PUT':'POST',headers:{'content-type':'application/json','x-csrf-token':csrf,'idempotency-key':key},body:JSON.stringify({payloadVersion:1,snapshot:captured,...(revision!==undefined?{expectedRevision:revision}:{})})},expectedAccountId);
 if(typeof data.recordId!=='string'||!uuid.test(data.recordId)||!integer(data.revision,1)||typeof data.contentSha256!=='string'||!hash.test(data.contentSha256)||typeof data.replayed!=='boolean'||id!==undefined&&data.recordId!==id||data.contentSha256!==captured.contentSha256||revision!==undefined&&data.revision!==revision+1)throw invalid();
 return {recordId:data.recordId,revision:data.revision,contentSha256:data.contentSha256,replayed:data.replayed};
}
export const documentCreate=(snapshot:AuthoringJsonbSnapshot,key:string,csrf:string,fetcher:typeof fetch=fetch,expectedAccountId?:string)=>write(undefined,snapshot,undefined,key,csrf,fetcher,expectedAccountId);
export const documentSave=(id:string,snapshot:AuthoringJsonbSnapshot,revision:number,key:string,csrf:string,fetcher:typeof fetch=fetch,expectedAccountId?:string)=>write(id,snapshot,revision,key,csrf,fetcher,expectedAccountId);

async function changeState(action:'trash'|'restore',id:string,revision:number,stateVersion:number,key:string,csrf:string,fetcher:typeof fetch,expectedAccountId?:string):Promise<OnlineDocumentStateReceipt>{
 if(!integer(revision,1)||!integer(stateVersion,1)||typeof key!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(key)||typeof csrf!=='string'||!csrf)throw new OnlineDocumentError('INVALID_REQUEST',400);
 const data=await request(`/api/v1/documents/${recordId(id)}/${action}`,fetcher,{method:'POST',headers:{'content-type':'application/json','x-csrf-token':csrf,'idempotency-key':key},body:JSON.stringify({payloadVersion:1,expectedRevision:revision,expectedStateVersion:stateVersion})},expectedAccountId);
 if(data.recordId!==id||data.revision!==revision||!integer(data.stateVersion,1)||data.stateVersion!==stateVersion+1||typeof data.contentSha256!=='string'||!hash.test(data.contentSha256)||typeof data.replayed!=='boolean'||(action==='restore'?data.deletedAt!==null:!integer(data.deletedAt,0)))throw invalid();
 return {recordId:id,revision,contentSha256:data.contentSha256,stateVersion:data.stateVersion,deletedAt:data.deletedAt as number|null,replayed:data.replayed};
}
export const documentTrash=(id:string,revision:number,stateVersion:number,key:string,csrf:string,fetcher:typeof fetch=fetch,expectedAccountId?:string)=>changeState('trash',id,revision,stateVersion,key,csrf,fetcher,expectedAccountId);
export const documentRestore=(id:string,revision:number,stateVersion:number,key:string,csrf:string,fetcher:typeof fetch=fetch,expectedAccountId?:string)=>changeState('restore',id,revision,stateVersion,key,csrf,fetcher,expectedAccountId);
