import {createHash} from 'node:crypto';
import type {SqlClient} from '../storage/postgres-save-port';
import {AuthStateError} from './auth-state';
export type RequestSessionInput=Readonly<{sessionToken:string;expectedAccountId:string}>;
export type LockedRequestSession=Readonly<{accountId:string;expiresAt:number;assertEligible():void}>;
const tokenPattern=/^[A-Za-z0-9_-]{43}$/;
const accountPattern=/^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$/;
function reject():never{throw new AuthStateError('SESSION_REQUIRED');}
function currentTime(clock:()=>number):number{
 const value=clock();if(!Number.isSafeInteger(value)||value<0)reject();return value;
}
/**
 * Authorize inside an already open caller-owned transaction. Family, session and
 * account SHARE locks remain held until its COMMIT/ROLLBACK. Rotation/logout
 * acquire the same family root first with UPDATE locks, so a request cannot
 * commit writes after an independently completed logout or account revocation.
 * Call assertEligible immediately before COMMIT to reject expiry during work.
 * This helper never starts/commits/rolls back transactions or releases clients.
 */
export async function lockPostgresRequestSession(client:SqlClient,input:RequestSessionInput,clock:()=>number=Date.now):Promise<LockedRequestSession>{
 if(!input||typeof input.sessionToken!=='string'||!tokenPattern.test(input.sessionToken)||typeof input.expectedAccountId!=='string'||!accountPattern.test(input.expectedAccountId))reject();
 const accountId=input.expectedAccountId,tokenHash=createHash('sha256').update(input.sessionToken).digest('hex');
 await client.query(`WITH RECURSIVE ancestry AS (
  SELECT token_hash,rotated_from FROM knolstory_auth.sessions WHERE token_hash=$1
  UNION SELECT s.token_hash,s.rotated_from FROM knolstory_auth.sessions s JOIN ancestry a ON s.token_hash=a.rotated_from
 ) SELECT s.token_hash FROM knolstory_auth.sessions s JOIN ancestry a ON a.token_hash=s.token_hash
 WHERE a.rotated_from IS NULL FOR SHARE OF s`,[tokenHash]);
 const result=await client.query(`SELECT s.account_id,s.expires_at,s.revoked,a.status FROM knolstory_auth.sessions s
  JOIN knolstory_auth.accounts a ON a.id=s.account_id
  WHERE s.token_hash=$1 FOR SHARE OF s,a`,[tokenHash]);
 const row=result.rows[0];
 const expiresAt=typeof row?.expires_at==='string'&&/^[0-9]+$/.test(row.expires_at)?Number(row.expires_at):row?.expires_at;
 if(!row||row.account_id!==accountId||row.revoked!==false||row.status!=='active'||typeof expiresAt!=='number'||!Number.isSafeInteger(expiresAt)||expiresAt<0)reject();
 const assertEligible=()=>{if(expiresAt<=currentTime(clock))reject();};
 assertEligible();
 return {accountId,expiresAt,assertEligible};
}
