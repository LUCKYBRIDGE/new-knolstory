import type {SqlClient,SqlPool} from '../storage/postgres-save-port';
import {AuthStateError,type AuthStatePort,type PendingFlow,type StoredSession} from './auth-state';
const hashPattern=/^[a-f0-9]{64}$/;
function hash(value:string):string{if(typeof value!=='string'||!hashPattern.test(value))throw new AuthStateError('INVALID_INPUT');return value;}
function time(value:unknown):number{
 const parsed=typeof value==='string'&&/^[0-9]+$/.test(value)?Number(value):value;
 if(typeof parsed!=='number'||!Number.isSafeInteger(parsed)||parsed<0)throw new AuthStateError('STORAGE_CONTRACT_VIOLATION');return parsed;
}
function text(value:unknown):string{if(typeof value!=='string')throw new AuthStateError('STORAGE_CONTRACT_VIOLATION');return value;}
function session(row:Record<string,unknown>):StoredSession{return {tokenHash:hash(text(row.token_hash)),accountId:text(row.account_id),expiresAt:time(row.expires_at)};}
function flow(row:Record<string,unknown>):PendingFlow{
 if(!['kakao','google'].includes(row.provider as string)||!['login','link'].includes(row.purpose as string))throw new AuthStateError('STORAGE_CONTRACT_VIOLATION');
 return {stateHash:hash(text(row.state_hash)),provider:row.provider as PendingFlow['provider'],purpose:row.purpose as PendingFlow['purpose'],browserBindingHash:hash(text(row.browser_binding_hash)),startSessionHash:row.start_session_hash===null?null:hash(text(row.start_session_hash)),verifier:text(row.verifier),nonce:text(row.nonce),expiresAt:time(row.expires_at)};
}
async function connection<T>(pool:SqlPool,action:(client:SqlClient)=>Promise<T>):Promise<T>{const client=await pool.connect();try{return await action(client);}finally{client.release();}}
export function createPostgresAuthStatePort(pool:SqlPool):AuthStatePort {
 return {
  async createFlow(value){
   const record={...value};
   await connection(pool,client=>client.query('INSERT INTO knolstory_auth.flows(state_hash,provider,purpose,browser_binding_hash,start_session_hash,verifier,nonce,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[hash(record.stateHash),record.provider,record.purpose,hash(record.browserBindingHash),record.startSessionHash===null?null:hash(record.startSessionHash),record.verifier,record.nonce,time(record.expiresAt)]));
  },
  async consumeFlow(value){
   const input={...value};
   return connection(pool,async client=>{
    // DELETE takes the flow row lock: concurrent callbacks can return it once only.
    // Matching includes browser, provider and exact starting session, with current
    // account/session eligibility in the same statement. Mismatches retain state.
    const result=await client.query(`DELETE FROM knolstory_auth.flows f WHERE f.state_hash=$1 AND f.provider=$2 AND f.browser_binding_hash=$3
      AND f.start_session_hash IS NOT DISTINCT FROM $4::text AND f.expires_at>$5
      AND (f.start_session_hash IS NULL OR EXISTS (
       SELECT 1 FROM knolstory_auth.sessions s JOIN knolstory_auth.accounts a ON a.id=s.account_id
       WHERE s.token_hash=f.start_session_hash AND NOT s.revoked AND s.expires_at>$5 AND a.status='active'
      )) RETURNING f.*`,[hash(input.stateHash),input.provider,hash(input.browserBindingHash),input.startSessionHash===null?null:hash(input.startSessionHash),time(input.now)]);
    return result.rows[0]?flow(result.rows[0]):null;
   });
  },
  async issueSession(value){
   const record={...value};
   return connection(pool,async client=>{
    if(typeof record.accountId!=='string'||!/^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$/.test(record.accountId))return false;
    const result=await client.query("INSERT INTO knolstory_auth.sessions(token_hash,account_id,expires_at) SELECT $1,id,$3 FROM knolstory_auth.accounts WHERE id=$2 AND status='active' RETURNING token_hash",[hash(record.tokenHash),record.accountId,time(record.expiresAt)]);return result.rowCount===1;
   });
  },
  async findSession(tokenHash,now){return connection(pool,async client=>{
   const result=await client.query("SELECT s.token_hash,s.account_id,s.expires_at FROM knolstory_auth.sessions s JOIN knolstory_auth.accounts a ON a.id=s.account_id WHERE s.token_hash=$1 AND NOT s.revoked AND s.expires_at>$2 AND a.status='active'",[hash(tokenHash),time(now)]);return result.rows[0]?session(result.rows[0]):null;
  });},
  async revokeSession(tokenHash){
   const requested=hash(tokenHash),client=await pool.connect();
   let destroy=false;
   try {
    await client.query('BEGIN ISOLATION LEVEL READ COMMITTED');
    // All rotations and logouts lock the oldest ancestor first. A logout using
    // an old cookie must wait for any in-flight replacement to commit. Taking
    // the fresh descendant snapshot in the next statement then sees that token.
    await client.query(`WITH RECURSIVE ancestry AS (
     SELECT token_hash,rotated_from FROM knolstory_auth.sessions WHERE token_hash=$1
     UNION
     SELECT parent.token_hash,parent.rotated_from FROM knolstory_auth.sessions parent
      JOIN ancestry child ON parent.token_hash=child.rotated_from
    ) SELECT root.token_hash FROM knolstory_auth.sessions root
     JOIN ancestry ON ancestry.token_hash=root.token_hash
     WHERE root.rotated_from IS NULL FOR UPDATE OF root`,[requested]);
    // Revoke this token and every replacement descended from it, preserving
    // sessions issued independently on another device (even for the same user).
    await client.query(`WITH RECURSIVE descendants AS (
     SELECT token_hash FROM knolstory_auth.sessions WHERE token_hash=$1
     UNION
     SELECT child.token_hash FROM knolstory_auth.sessions child
      JOIN descendants parent ON child.rotated_from=parent.token_hash
    ) UPDATE knolstory_auth.sessions SET revoked=true
     WHERE token_hash IN (SELECT token_hash FROM descendants)`,[requested]);
    await client.query('COMMIT');
   }catch(error){
    try{await client.query('ROLLBACK');}catch(rollbackError){
     destroy=true;
     throw new AggregateError([error,rollbackError],'Session revocation and rollback failed.');
    }
    throw error;
   }finally{if(destroy)client.release(true);else client.release();}
  },
 };
}
