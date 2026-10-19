import {randomUUID} from 'node:crypto';
import type {SqlClient, SqlPool} from '../storage/postgres-save-port';
import {IdentityLinkError, type Account, type IdentityLinkPort, type IdentityTransaction, type VerifiedIdentity} from './identity-links';

const attempts = 5;
function retryable(error:unknown):boolean {
 if(typeof error!=='object'||error===null)return false;
 const failure=error as {code?:unknown;constraint?:unknown};
 return failure.code==='40001'||failure.code==='40P01'
  ||(failure.code==='23505'&&failure.constraint==='identities_provider_subject_key');
}
function checkedAccount(row:Record<string,unknown>):Account {
 if(typeof row.id!=='string'||!['active','inactive','deleted'].includes(row.status as string)) {
  throw new IdentityLinkError('STORAGE_CONTRACT_VIOLATION');
 }
 return {id:row.id,status:row.status as Account['status']};
}
function checkedIdentity(identity:VerifiedIdentity):VerifiedIdentity {
 if(!identity||!['kakao','google'].includes(identity.provider)
  ||typeof identity.subject!=='string'||!identity.subject.trim())throw new IdentityLinkError('INVALID_IDENTITY');
 return {provider:identity.provider,subject:identity.subject};
}
function methods(client:SqlClient):IdentityTransaction {
 const findAccount:IdentityTransaction['findAccount']=async accountId=>{
  if(typeof accountId!=='string'||!/^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$/.test(accountId))return null;
  const result=await client.query('SELECT id,status FROM knolstory_auth.accounts WHERE id=$1 FOR UPDATE',[accountId]);
  return result.rows[0]?checkedAccount(result.rows[0]):null;
 };
 const findIdentity:IdentityTransaction['findIdentity']=async input=>{
  const identity=checkedIdentity(input);
  const result=await client.query('SELECT account_id FROM knolstory_auth.identities WHERE provider=$1 AND subject=$2 FOR SHARE',[identity.provider,identity.subject]);
  if(!result.rows[0])return null;
  if(typeof result.rows[0].account_id!=='string')throw new IdentityLinkError('STORAGE_CONTRACT_VIOLATION');
  return result.rows[0].account_id;
 };
 return {
  findAccount,findIdentity,
  async createAccount() {
   const id=randomUUID();
   const result=await client.query("INSERT INTO knolstory_auth.accounts(id,status) VALUES($1,'active') RETURNING id,status",[id]);
   if(!result.rows[0])throw new IdentityLinkError('STORAGE_CONTRACT_VIOLATION');
   return checkedAccount(result.rows[0]);
  },
  async insertIdentity(input,accountId) {
   const identity=checkedIdentity(input);
   const account=await findAccount(accountId);
   if(!account||account.status!=='active')throw new IdentityLinkError('ACCOUNT_UNAVAILABLE');
   // A concurrent absent-row insert under SERIALIZABLE raises 40001 and retries
   // the whole callback. Never overwrite or transfer an existing provider link.
   const result=await client.query('INSERT INTO knolstory_auth.identities(provider,subject,account_id) VALUES($1,$2,$3) ON CONFLICT ON CONSTRAINT identities_provider_subject_key DO NOTHING RETURNING account_id',[identity.provider,identity.subject,accountId]);
   if(result.rowCount===1)return 'inserted';
   const existing=await findIdentity(identity);
   if(existing===null)throw new IdentityLinkError('STORAGE_CONTRACT_VIOLATION');
   return existing===accountId?'already-linked':'conflict';
  },
 };
}
async function attempt<T>(pool:SqlPool,action:(tx:IdentityTransaction,client:SqlClient)=>Promise<T>):Promise<T> {
 const client=await pool.connect();
 let destroy=false;
 try {
  await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
  const result=await action(methods(client),client);
  await client.query('COMMIT');
  return result;
 }catch(error) {
  try {await client.query('ROLLBACK');}catch(rollbackError) {
   destroy=true;
   throw new AggregateError([error,rollbackError],'Identity transaction and rollback failed.');
  }
  throw error;
 }finally {if(destroy)client.release(true);else client.release();}
}
/**
 * Trusted DB boundary only: callers still need real provider verification and a
 * trusted session for linking. Callbacks may run up to five times with fresh DB
 * transactions; they MUST contain only replayable DB operations through tx, with
 * no emails, HTTP writes, session issuance or other externally visible effects.
 * Success is returned only after COMMIT. Serialization/deadlock failures retry;
 * unexpected constraints and exhausted retries propagate. SHARE identity locks
 * and UPDATE account locks retain status/identity reads through commit; either
 * lock order may deadlock, which is safely rolled back before a fresh attempt.
 */
export async function runIdentityTransaction<T>(pool:SqlPool,action:(tx:IdentityTransaction,client:SqlClient)=>Promise<T>):Promise<T> {
 for(let index=0;index<attempts;index++) {
  try {return await attempt(pool,action);}catch(error) {
   if(index===attempts-1||!retryable(error))throw error;
  }
 }
 throw new IdentityLinkError('STORAGE_CONTRACT_VIOLATION');
}
export function createPostgresIdentityPort(pool:SqlPool):IdentityLinkPort {
 return {transaction:action=>runIdentityTransaction(pool,action)};
}
