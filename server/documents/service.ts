import {randomUUID} from 'node:crypto';
import {changeDocumentState,stateInput,type DocumentStateInput} from './trash-state';
import {AuthStateError} from '../auth/auth-state';
import {lockPostgresRequestSession} from '../auth/postgres-request-session';
import {createPostgresSaveTransaction,loadStoredRecordOnClient,type SqlClient,type SqlPool} from '../storage/postgres-save-port';
import {saveExisting} from '../storage/save-existing';
import {projectSnapshot} from '../storage/snapshot-projection';
import {checkedSnapshot,clockTime,DocumentServiceError,identifier,idempotency,listInput,positive,requestHash,requestObject,timestamp} from './validation';
export {DocumentServiceError} from './validation';
export type DocumentContext=Readonly<{token:string;accountId:string}>;
export type DocumentMetadata=Readonly<{recordId:string;revision:number;format:'knolstory'|'shortstory';clientProjectId:string;title:string;contentSha256:string;createdAt:number;updatedAt:number;stateVersion:number;deletedAt:number|null}>;
type CreateInput=Readonly<{payloadVersion:1;snapshot:unknown;idempotencyKey:string}>;
type SaveInput=CreateInput&Readonly<{expectedRevision:number}>;
const scope=(context:DocumentContext)=>`account:${context.accountId}`;
const columns=`d.record_id,d.created_at,d.updated_at,d.state_version,d.deleted_at,r.revision,r.format,r.client_project_id,
 r.projection#>>'{snapshot,contentSha256}' AS content_sha256,
 COALESCE(r.projection#>>'{snapshot,content,document,project,title}',r.projection#>>'{snapshot,content,project,title}') AS title`;
function metadata(row:Record<string,unknown>):DocumentMetadata{
 if(!['knolstory','shortstory'].includes(row.format as string)||typeof row.client_project_id!=='string'||typeof row.title!=='string'||typeof row.content_sha256!=='string'||!/^[a-f0-9]{64}$/.test(row.content_sha256))throw new DocumentServiceError('STORAGE_CONTRACT_VIOLATION',503);
 return {recordId:identifier(row.record_id),revision:positive(row.revision),format:row.format as DocumentMetadata['format'],clientProjectId:row.client_project_id,title:row.title,contentSha256:row.content_sha256,createdAt:timestamp(row.created_at),updatedAt:timestamp(row.updated_at),stateVersion:positive(row.state_version),deletedAt:row.deleted_at===null?null:timestamp(row.deleted_at)};
}
function capturedContext(value:DocumentContext):DocumentContext{
 if(!value||typeof value.token!=='string'||! /^[A-Za-z0-9_-]{43}$/.test(value.token))throw new DocumentServiceError('SESSION_REQUIRED',401);
 try{return {accountId:identifier(value.accountId),token:value.token};}catch{throw new DocumentServiceError('SESSION_REQUIRED',401);}
}
function inputRequest(value:CreateInput|SaveInput,save:boolean){
 const input=requestObject(value,save?['payloadVersion','snapshot','idempotencyKey','expectedRevision']:['payloadVersion','snapshot','idempotencyKey']);
 if(input.payloadVersion!==1||(save&&(typeof input.expectedRevision!=='number'||!Number.isSafeInteger(input.expectedRevision)||input.expectedRevision<1)))throw new DocumentServiceError('INVALID_REQUEST',400);
 return {snapshot:input.snapshot,expectedRevision:input.expectedRevision as number|undefined,idempotencyKey:idempotency(input.idempotencyKey)};
}
function encodeStateCursor(cursor:Readonly<{updatedAt:number;recordId:string}>,state:'active'|'trash'){
 return Buffer.from(JSON.stringify({...cursor,state})).toString('base64url');
}
function stateListInput(value:Readonly<{limit?:number;cursor?:string;state?:'active'|'trash'}>){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(key=>!['limit','cursor','state'].includes(key)))throw new DocumentServiceError('INVALID_REQUEST',400);
 const {state='active',...base}=structuredClone(value);
 if(state!=='active'&&state!=='trash')throw new DocumentServiceError('INVALID_REQUEST',400);
 if(base.cursor!==undefined){
  try{
   if(typeof base.cursor!=='string'||! /^[A-Za-z0-9_-]{1,256}$/.test(base.cursor))throw Error();
   const parsed=JSON.parse(Buffer.from(base.cursor,'base64url').toString('utf8')) as Record<string,unknown>;
   if(parsed&&typeof parsed==='object'&&Object.hasOwn(parsed,'state')){
    const scoped=requestObject(parsed,['updatedAt','recordId','state']);
    if(scoped.state!==state||encodeStateCursor(scoped as {updatedAt:number;recordId:string},state)!==base.cursor)throw Error();
    return {state,input:listInput({...base,cursor:Buffer.from(JSON.stringify({updatedAt:scoped.updatedAt,recordId:scoped.recordId})).toString('base64url')})};
   }
   if(state!=='active')throw Error();
  }catch{throw new DocumentServiceError('INVALID_REQUEST',400);}
 }
 return {state,input:listInput(base)};
}
/** Every operation owns one transaction; root/session/account locks precede target locks. */
export function createDocumentService(pool:SqlPool,options:Readonly<{clock?:()=>number}>={}){
 const clock=options.clock??Date.now;
 async function transaction<T>(context:DocumentContext,operation:(client:SqlClient)=>Promise<T>):Promise<T>{
  const client=await pool.connect();let destroy=false;
  try{
   await client.query('BEGIN ISOLATION LEVEL READ COMMITTED');
   const session=await lockPostgresRequestSession(client,{sessionToken:context.token,expectedAccountId:context.accountId},clock);
   const result=await operation(client);session.assertEligible();await client.query('COMMIT');return result;
  }catch(error){
   try{await client.query('ROLLBACK');}catch(rollbackError){destroy=true;throw new AggregateError([error,rollbackError],'Document transaction and rollback failed.');}
   if(error instanceof AuthStateError)throw new DocumentServiceError('SESSION_REQUIRED',401);
   throw error;
  }finally{if(destroy)client.release(true);else client.release();}
 }
 async function own(client:SqlClient,context:DocumentContext,recordId:string,includeTrash=false):Promise<DocumentMetadata>{
  const result=await client.query(`SELECT ${columns} FROM knolstory_storage.private_documents d JOIN knolstory_storage.records r USING(scope_id,record_id)
   WHERE d.scope_id=$1 AND d.record_id=$2 AND d.owner_account_id=$3 FOR SHARE OF d`,[scope(context),recordId,context.accountId]);
  if(!result.rows[0])throw new DocumentServiceError('NOT_FOUND',404);
  const info=metadata(result.rows[0]);if(!includeTrash&&info.deletedAt!==null)throw new DocumentServiceError('DOCUMENT_TRASHED',409);return info;
 }
 async function changeState(context:DocumentContext,value:string,request:DocumentStateInput,action:'trash'|'restore'){
  const user=capturedContext(context),recordId=identifier(value),input=stateInput(request);
  return transaction(user,async client=>{
   await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[JSON.stringify([scope(user),recordId])]);
   const info=await own(client,user,recordId,true);
   // Ownership and the target lock precede reading even an idempotent receipt.
   await client.query('SELECT revision FROM knolstory_storage.records WHERE scope_id=$1 AND record_id=$2 FOR UPDATE',[scope(user),recordId]);
   return changeDocumentState(client,{scopeId:scope(user),recordId},input,info,action,clockTime(clock));
  });
 }
 return {
  trash:(context:DocumentContext,value:string,request:DocumentStateInput)=>changeState(context,value,request,'trash'),
  restore:(context:DocumentContext,value:string,request:DocumentStateInput)=>changeState(context,value,request,'restore'),
  async create(context:DocumentContext,value:CreateInput){
   const user=capturedContext(context),input=inputRequest(value,false),snapshot=await checkedSnapshot(input.snapshot);
   const fingerprint=requestHash({payloadVersion:1,idempotencyKey:input.idempotencyKey,snapshot});
   return transaction(user,async client=>{
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[JSON.stringify(['document-create',user.accountId,input.idempotencyKey])]);
    const previous=await client.query('SELECT record_id,request_sha256,content_sha256,created_at FROM knolstory_storage.document_creations WHERE owner_account_id=$1 AND idempotency_key=$2',[user.accountId,input.idempotencyKey]);
    const receipt=previous.rows[0];
    if(receipt){
     if(receipt.request_sha256!==fingerprint)throw new DocumentServiceError('IDEMPOTENCY_CONFLICT',409);
     const createdAt=timestamp(receipt.created_at);
     return {recordId:identifier(receipt.record_id),revision:1,contentSha256:receipt.content_sha256 as string,createdAt,updatedAt:createdAt,replayed:true};
    }
    const {projection,blobs}=await projectSnapshot(snapshot);
    // Catalog-only creation cannot acquire private bytes, even if a future gate drifts.
    if(blobs.length)throw new DocumentServiceError('CATALOG_MEDIA_REQUIRED',422);
    const recordId=randomUUID(),createdAt=clockTime(clock),content=snapshot.content;
    const project=content.format==='knolstory'?content.document.project:content.project;
    await client.query('INSERT INTO knolstory_storage.records(scope_id,record_id,client_project_id,format,revision,projection) VALUES($1,$2,$3,$4,1,$5)',[scope(user),recordId,project.id,content.format,projection]);
    await client.query('INSERT INTO knolstory_storage.private_documents(scope_id,record_id,owner_account_id,created_at,updated_at) VALUES($1,$2,$3,$4,$4)',[scope(user),recordId,user.accountId,createdAt]);
    await client.query('INSERT INTO knolstory_storage.document_creations(owner_account_id,idempotency_key,request_sha256,scope_id,record_id,content_sha256,created_at) VALUES($1,$2,$3,$4,$5,$6,$7)',[user.accountId,input.idempotencyKey,fingerprint,scope(user),recordId,snapshot.contentSha256,createdAt]);
    return {recordId,revision:1,contentSha256:snapshot.contentSha256,createdAt,updatedAt:createdAt,replayed:false};
   });
  },
  async list(context:DocumentContext,value:Readonly<{limit?:number;cursor?:string;state?:'active'|'trash'}>={}){
   const user=capturedContext(context),{input,state}=stateListInput(value);
   return transaction(user,async client=>{
    const result=await client.query(`SELECT ${columns} FROM knolstory_storage.private_documents d JOIN knolstory_storage.records r USING(scope_id,record_id)
     WHERE d.owner_account_id=$1 AND (d.deleted_at IS NOT NULL)=$5 AND ($2::bigint IS NULL OR (d.updated_at,d.record_id)<($2::bigint,$3::text))
     ORDER BY d.updated_at DESC,d.record_id DESC LIMIT $4`,[user.accountId,input.cursor?.updatedAt??null,input.cursor?.recordId??null,input.limit+1,state==='trash']);
    const documents=result.rows.slice(0,input.limit).map(metadata),last=documents.at(-1);
    const nextCursor=result.rows.length>input.limit&&last?encodeStateCursor({updatedAt:last.updatedAt,recordId:last.recordId},state):null;
    return {documents,nextCursor};
   });
  },
  async read(context:DocumentContext,value:string){
   const user=capturedContext(context),recordId=identifier(value);
   return transaction(user,async client=>{
    let info:DocumentMetadata|undefined;
    const record=await loadStoredRecordOnClient(client,{scopeId:scope(user),recordId,idempotencyKey:'read'},async()=>{info=await own(client,user,recordId);return true;});
    if(!record||!info)throw new DocumentServiceError('NOT_FOUND',404);
    return {...info,revision:record.revision,snapshot:record.snapshot};
   });
  },
  async save(context:DocumentContext,value:string,request:SaveInput){
   const user=capturedContext(context),recordId=identifier(value),input=inputRequest(request,true),snapshot=await checkedSnapshot(input.snapshot);
   return transaction(user,async client=>{
    const content=snapshot.content,project=content.format==='knolstory'?content.document.project:content.project;
    const result=await saveExisting({scopeId:scope(user),recordId,idempotencyKey:input.idempotencyKey,expectedRevision:input.expectedRevision,snapshot},
     {authorize:async()=>true,assertCatalogAllowed:async()=>true},
     {transaction:async operation=>operation(createPostgresSaveTransaction(client,async()=>{
      const existing=await own(client,user,recordId);
      if(existing.format!==content.format||existing.clientProjectId!==project.id)throw new DocumentServiceError('DOCUMENT_IDENTITY_CONFLICT',409);
      return true;
     }))});
    if(result.status==='record-not-found')throw new DocumentServiceError('NOT_FOUND',404);
    if(result.status==='revision-conflict')throw new DocumentServiceError('REVISION_CONFLICT',409,result.actualRevision);
    if(result.status==='idempotency-conflict')throw new DocumentServiceError('IDEMPOTENCY_CONFLICT',409);
    if(result.status==='saved')await client.query('UPDATE knolstory_storage.private_documents SET updated_at=GREATEST(updated_at,$3) WHERE scope_id=$1 AND record_id=$2',[scope(user),recordId,clockTime(clock)]);
    return {recordId,revision:result.receipt.revision,contentSha256:result.receipt.contentSha256,replayed:result.status==='replayed'};
   });
  },
 };
}
export type DocumentService=ReturnType<typeof createDocumentService>;
