import type {AuthoringJsonbSnapshot} from '../../packages/compatibility/src/authoring-archive';
import type {SaveTarget,SaveReceipt,SaveTransaction,SaveTransactionPort} from './save-existing';
import {projectSnapshot,restoreProjectedSnapshot} from './snapshot-projection';

/** Structural interfaces keep the production boundary independent of a driver. */
export interface SqlClient {
 query(text:string,values?:unknown[]):Promise<{rows:Record<string,unknown>[];rowCount:number|null}>;
 release(error?:Error|boolean):void;
}
export interface SqlPool {connect():Promise<SqlClient>}
export type TransactionAuthorization = (target:Readonly<SaveTarget>,client:SqlClient)=>Promise<boolean>;
export type PostgresSaveOptions = {authorize:TransactionAuthorization};

function assertTarget(target:SaveTarget) {
 for(const value of [target.scopeId,target.recordId,target.idempotencyKey]) {
  if(typeof value!=='string'||!value.trim())throw Error('Invalid storage target.');
 }
}
function revision(value:unknown):number {
 const parsed=typeof value==='string'&&/^[1-9][0-9]*$/.test(value)?Number(value):value;
 if(typeof parsed!=='number'||!Number.isSafeInteger(parsed)||parsed<1)throw Error('Invalid stored revision.');
 return parsed;
}
function receipt(row:Record<string,unknown>):SaveReceipt {
 if(typeof row.request_sha256!=='string'||typeof row.content_sha256!=='string')throw Error('Invalid stored receipt.');
 return {requestSha256:row.request_sha256,contentSha256:row.content_sha256,revision:revision(row.revision)};
}
async function inTransaction<T>(pool:SqlPool,operation:(client:SqlClient)=>Promise<T>):Promise<T> {
 const client=await pool.connect();
 let destroy=false;
 try {
  await client.query('BEGIN ISOLATION LEVEL READ COMMITTED');
  const result=await operation(client);
  await client.query('COMMIT');return result;
 } catch(error) {
  try {await client.query('ROLLBACK');} catch(rollbackError) {
   destroy=true;
   throw new AggregateError([error,rollbackError],'Storage transaction and rollback failed.');
  }
  throw error;
 } finally {if(destroy)client.release(true);else client.release();}
}
function lockedTarget(client:SqlClient,authorize:TransactionAuthorization) {
 let captured:SaveTarget|undefined;
 let lock:Promise<void>|undefined;
 return async (input:SaveTarget):Promise<SaveTarget> => {
  assertTarget(input);
  const target=structuredClone(input);
  if(captured&&(captured.scopeId!==target.scopeId||captured.recordId!==target.recordId))throw Error('A transaction accepts only one target.');
  if(!captured) {
   captured=target;
   lock=(async()=>{
    // Serializes the absent receipt namespace as well as existing rows. JSON tuple
    // encoding avoids delimiter ambiguity; hash collisions only reduce concurrency.
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[JSON.stringify([target.scopeId,target.recordId])]);
    if(await authorize(structuredClone(target),client)!==true)throw Error('Storage authorization required.');
   })();
  }
  await lock;return target;
 };
}
/** Caller owns BEGIN/COMMIT and must retain authorization locks until commit. */
export function createPostgresSaveTransaction(client:SqlClient,authorize:TransactionAuthorization):SaveTransaction {
 const targetLock=lockedTarget(client,authorize);
 let readRevision:number|undefined;
 return {
  async findReceipt(input) {
   const target=await targetLock(input);
   const result=await client.query('SELECT request_sha256,revision,content_sha256 FROM knolstory_storage.receipts WHERE scope_id=$1 AND record_id=$2 AND idempotency_key=$3',[target.scopeId,target.recordId,target.idempotencyKey]);
   return result.rows[0]?receipt(result.rows[0]):null;
  },
  async findRecord(input) {
   const target=await targetLock(input);
   const result=await client.query('SELECT revision FROM knolstory_storage.records WHERE scope_id=$1 AND record_id=$2 FOR UPDATE',[target.scopeId,target.recordId]);
   if(!result.rows[0])return null;
   readRevision=revision(result.rows[0].revision);return {revision:readRevision};
  },
  async writeSnapshot(input,snapshot,nextRevision) {
   const target=await targetLock(input);
   if(readRevision===undefined||nextRevision!==readRevision+1||!Number.isSafeInteger(nextRevision))throw Error('A locked record revision is required.');
   const {projection,blobs}=await projectSnapshot(snapshot);
   for(const blob of blobs) {
    await client.query('INSERT INTO knolstory_storage.blobs(id,sha256,mime,byte_length,bytes) VALUES($1,$2,$3,$4,$5) ON CONFLICT(id) DO NOTHING',[blob.id,blob.sha256,blob.mime,blob.byteLength,Buffer.from(blob.bytes)]);
    const stored=await client.query('SELECT sha256,mime,byte_length,bytes FROM knolstory_storage.blobs WHERE id=$1',[blob.id]);
    const value=stored.rows[0];
    if(!value||value.sha256!==blob.sha256||value.mime!==blob.mime||value.byte_length!==blob.byteLength||!Buffer.from(value.bytes as Uint8Array).equals(Buffer.from(blob.bytes)))throw Error('Immutable audio blob collision.');
   }
   const content=snapshot.content;
   const clientProjectId=content.format==='knolstory'?content.document.project.id:content.project.id;
   const result=await client.query('UPDATE knolstory_storage.records SET revision=$3,projection=$4,client_project_id=$5,format=$6 WHERE scope_id=$1 AND record_id=$2 AND revision=$7',[target.scopeId,target.recordId,nextRevision,projection,clientProjectId,content.format,readRevision]);
   if(result.rowCount!==1)throw Error('Locked record revision changed.');
  },
  async writeReceipt(input,value) {
   const target=await targetLock(input);
   await client.query('INSERT INTO knolstory_storage.receipts(scope_id,record_id,idempotency_key,request_sha256,revision,content_sha256) VALUES($1,$2,$3,$4,$5,$6)',[target.scopeId,target.recordId,target.idempotencyKey,value.requestSha256,value.revision,value.contentSha256]);
  },
 };
}
/**
 * The host MUST supply real authenticated authorization. A scope is not identity.
 * The hook runs after target serialization, before receipt/record reads (including
 * replay). For mutable ACLs, it must lock every permission row used, in a stable
 * order shared with revocation transactions, and retain those locks until commit.
 * Catalog decisions that can change also require equivalent transaction checks.
 * The hook must not COMMIT/ROLLBACK/release this client or mutate target data.
 */
export function createPostgresSavePort(pool:SqlPool,options:PostgresSaveOptions):SaveTransactionPort {
 if(typeof options?.authorize!=='function')throw Error('Transaction authorization hook required.');
 return {transaction:operation=>inTransaction(pool,client=>operation(createPostgresSaveTransaction(client,options.authorize)))};
}
/** Atomic content/revision read on a caller-owned, authenticated transaction. */
export async function loadStoredRecordOnClient(client:SqlClient,target:SaveTarget,authorize:TransactionAuthorization):Promise<{snapshot:AuthoringJsonbSnapshot;revision:number}|null> {
 if(typeof authorize!=='function')throw Error('Transaction authorization hook required.');
  const captured=await lockedTarget(client,authorize)(target);
  const result=await client.query('SELECT projection,client_project_id,format,revision FROM knolstory_storage.records WHERE scope_id=$1 AND record_id=$2 FOR SHARE',[captured.scopeId,captured.recordId]);
  if(!result.rows[0])return null;
  const snapshot=await restoreProjectedSnapshot(result.rows[0].projection,async id=>{
   const blob=await client.query('SELECT bytes FROM knolstory_storage.blobs WHERE id=$1',[id]);
   return blob.rows[0]?new Uint8Array(blob.rows[0].bytes as Uint8Array):null;
  });
  const content=snapshot.content;
  const projectId=content.format==='knolstory'?content.document.project.id:content.project.id;
  if(content.format!==result.rows[0].format||projectId!==result.rows[0].client_project_id)throw Error('Stored projection identity mismatch.');
  return {snapshot,revision:revision(result.rows[0].revision)};
}
/** Internal read boundary; callers still require authenticated host authorization. */
export async function loadStoredRecord(pool:SqlPool,target:SaveTarget,authorize:TransactionAuthorization):Promise<{snapshot:AuthoringJsonbSnapshot;revision:number}|null> {
 return inTransaction(pool,client=>loadStoredRecordOnClient(client,target,authorize));
}
export async function loadStoredSnapshot(pool:SqlPool,target:SaveTarget,authorize:TransactionAuthorization):Promise<AuthoringJsonbSnapshot|null> {
 return (await loadStoredRecord(pool,target,authorize))?.snapshot??null;
}
