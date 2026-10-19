import {createHash,randomBytes} from 'node:crypto';
import type {SqlClient,SqlPool} from '../storage/postgres-save-port';
import {AuthStateError} from './auth-state';
import {IdentityLinkError,linkGoogle,resolveLogin,type VerifiedIdentity} from './identity-links';
import {runIdentityTransaction} from './postgres-identity-port';

export type AuthCompletionInput=Readonly<{
 identity:VerifiedIdentity;
 purpose:'login'|'link';
 currentSessionToken?:string;
 expectedAccountId?:string;
}>;
export type AuthCompletionResult=Readonly<{
 accountId:string;
 linked?:boolean;
 session?:Readonly<{token:string;expiresAt:number}>;
}>;
export interface AuthCompletionPort {complete(input:AuthCompletionInput):Promise<AuthCompletionResult>}
const tokenPattern=/^[A-Za-z0-9_-]{43}$/;
const accountPattern=/^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$/;
const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
function checkedInput(input:AuthCompletionInput):AuthCompletionInput {
 if(!input||!['login','link'].includes(input.purpose))throw new AuthStateError('INVALID_INPUT');
 const identity=input.identity;
 if(!identity||!['kakao','google'].includes(identity.provider)||typeof identity.subject!=='string'||!identity.subject.trim())throw new IdentityLinkError('INVALID_IDENTITY');
 if(input.currentSessionToken!==undefined&&(typeof input.currentSessionToken!=='string'||!tokenPattern.test(input.currentSessionToken)))throw new AuthStateError('SESSION_REQUIRED');
 if(input.currentSessionToken!==undefined&&(typeof input.expectedAccountId!=='string'||!accountPattern.test(input.expectedAccountId)))throw new AuthStateError('SESSION_REQUIRED');
 if(input.currentSessionToken===undefined&&input.expectedAccountId!==undefined)throw new AuthStateError('SESSION_REQUIRED');
 if(input.purpose==='link'&&(identity.provider!=='google'||input.currentSessionToken===undefined))throw new AuthStateError('SESSION_REQUIRED');
 return {identity:{provider:identity.provider,subject:identity.subject},purpose:input.purpose,currentSessionToken:input.currentSessionToken,expectedAccountId:input.expectedAccountId};
}
async function startingAccount(client:SqlClient,tokenHash:string,expectedAccountId:string,clock:()=>number):Promise<{accountId:string;expiresAt:number}> {
 // Every rotation and logout locks the immutable oldest ancestor first. A logout
 // through an older cookie therefore cannot miss a newly committed descendant.
 await client.query(`WITH RECURSIVE ancestry AS (
  SELECT token_hash,rotated_from FROM knolstory_auth.sessions WHERE token_hash=$1
  UNION SELECT s.token_hash,s.rotated_from FROM knolstory_auth.sessions s JOIN ancestry a ON s.token_hash=a.rotated_from
 ) SELECT s.token_hash FROM knolstory_auth.sessions s JOIN ancestry a ON a.token_hash=s.token_hash
 WHERE a.rotated_from IS NULL FOR UPDATE OF s`,[tokenHash]);
 const result=await client.query(`SELECT s.account_id,s.expires_at,s.revoked,a.status FROM knolstory_auth.sessions s
  JOIN knolstory_auth.accounts a ON a.id=s.account_id
  WHERE s.token_hash=$1
  FOR UPDATE OF s,a`,[tokenHash]);
 const row=result.rows[0];
 const expiry=typeof row?.expires_at==='string'&&/^[0-9]+$/.test(row.expires_at)?Number(row.expires_at):row?.expires_at;
 if(!row||row.account_id!==expectedAccountId||row.revoked!==false||row.status!=='active'||typeof expiry!=='number'||!Number.isSafeInteger(expiry)||expiry<=clock())throw new AuthStateError('SESSION_REQUIRED');
 return {accountId:expectedAccountId,expiresAt:expiry};
}
/** Complete only an already consumed OAuth flow and provider-verified identity.
 * Identity changes, session eligibility, rotation and issuance share one retried
 * transaction. Raw tokens leave this boundary only after successful COMMIT.
 */
export function createPostgresAuthCompletion(pool:SqlPool,options:Readonly<{sessionTtlMs:number;clock?:()=>number}>):AuthCompletionPort {
 const ttl=options.sessionTtlMs,clock=options.clock??Date.now;
 if(!Number.isSafeInteger(ttl)||ttl<=0)throw new AuthStateError('INVALID_INPUT');
 return {async complete(value){
  const input=checkedInput(value);
  const time=()=>{const value=clock();if(!Number.isSafeInteger(value)||value<0||!Number.isSafeInteger(value+ttl))throw new AuthStateError('INVALID_INPUT');return value;};
  time();
  return runIdentityTransaction(pool,async(tx,client)=>{
   const oldHash=input.currentSessionToken===undefined?undefined:hash(input.currentSessionToken);
   const starting=oldHash===undefined?undefined:await startingAccount(client,oldHash,input.expectedAccountId!,time);
   const accountId=starting?.accountId;
   const eligible=()=>{if(starting&&starting.expiresAt<=time())throw new AuthStateError('SESSION_REQUIRED');};
   const port={transaction:async<T>(action:(transaction:typeof tx)=>Promise<T>)=>action(tx)};
   if(input.purpose==='link'){const result=await linkGoogle({accountId:accountId!},input.identity,port);eligible();return result;}
   if(accountId!==undefined&&await tx.findIdentity(input.identity)!==accountId)throw new IdentityLinkError('IDENTITY_ALREADY_LINKED');
   const login=await resolveLogin(input.identity,port);
   eligible();
   const raw=randomBytes(32).toString('base64url'),expiresAt=time()+ttl;
   await client.query('INSERT INTO knolstory_auth.sessions(token_hash,account_id,expires_at,rotated_from) VALUES($1,$2,$3,$4)',[hash(raw),login.accountId,expiresAt,oldHash??null]);
   if(oldHash!==undefined){
    const revoked=await client.query('UPDATE knolstory_auth.sessions SET revoked=true WHERE token_hash=$1 AND NOT revoked RETURNING token_hash',[oldHash]);
    if(revoked.rowCount!==1)throw new AuthStateError('SESSION_REQUIRED');
   }
   eligible();
   return {accountId:login.accountId,session:{token:raw,expiresAt}};
  });
 }};
}
