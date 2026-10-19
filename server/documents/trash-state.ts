import type {SqlClient} from '../storage/postgres-save-port';
import {DocumentServiceError,idempotency,requestHash,requestObject} from './validation';
export type DocumentStateInput=Readonly<{payloadVersion:1;expectedRevision:number;expectedStateVersion:number;idempotencyKey:string}>;
export type DocumentStateReceipt=Readonly<{recordId:string;revision:number;contentSha256:string;stateVersion:number;deletedAt:number|null}>;
export function stateInput(value:DocumentStateInput):DocumentStateInput{
 const input=requestObject(value,['payloadVersion','expectedRevision','expectedStateVersion','idempotencyKey']);
 if(input.payloadVersion!==1||[input.expectedRevision,input.expectedStateVersion].some(value=>typeof value!=='number'||!Number.isSafeInteger(value)||value<1))throw new DocumentServiceError('INVALID_REQUEST',400);
 return {payloadVersion:1,expectedRevision:input.expectedRevision as number,expectedStateVersion:input.expectedStateVersion as number,idempotencyKey:idempotency(input.idempotencyKey)};
}
/** The caller holds the authenticated session, target advisory and ownership locks. */
export async function changeDocumentState(client:SqlClient,target:Readonly<{scopeId:string;recordId:string}>,input:DocumentStateInput,info:DocumentStateReceipt,action:'trash'|'restore',now:number){
 const fingerprint=requestHash({action,...input});
 const previous=await client.query('SELECT request_sha256,receipt FROM knolstory_storage.document_state_commands WHERE scope_id=$1 AND record_id=$2 AND idempotency_key=$3',[target.scopeId,target.recordId,input.idempotencyKey]);
 if(previous.rows[0]){
  if(previous.rows[0].request_sha256!==fingerprint)throw new DocumentServiceError('IDEMPOTENCY_CONFLICT',409);
  return {...previous.rows[0].receipt as DocumentStateReceipt,replayed:true};
 }
 if(info.revision!==input.expectedRevision||info.stateVersion!==input.expectedStateVersion||(action==='trash')===(info.deletedAt!==null))throw new DocumentServiceError('DOCUMENT_STATE_CONFLICT',409);
 const stateVersion=info.stateVersion+1;
 if(!Number.isSafeInteger(stateVersion))throw new DocumentServiceError('STORAGE_CONTRACT_VIOLATION',503);
 const receipt={recordId:info.recordId,revision:info.revision,contentSha256:info.contentSha256,stateVersion,deletedAt:action==='trash'?now:null};
 await client.query('UPDATE knolstory_storage.private_documents SET deleted_at=$3,state_version=$4,updated_at=GREATEST(updated_at,$5) WHERE scope_id=$1 AND record_id=$2',[target.scopeId,target.recordId,receipt.deletedAt,stateVersion,now]);
 await client.query('INSERT INTO knolstory_storage.document_state_commands(scope_id,record_id,idempotency_key,request_sha256,receipt) VALUES($1,$2,$3,$4,$5)',[target.scopeId,target.recordId,input.idempotencyKey,fingerprint,receipt]);
 return {...receipt,replayed:false};
}
