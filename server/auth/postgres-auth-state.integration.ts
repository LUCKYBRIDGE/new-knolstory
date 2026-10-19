import {randomUUID,createHash} from 'node:crypto';
import {Pool} from 'pg';
import {beforeAll,afterAll,describe,it,expect} from 'vitest';
import {runStorageMigrations} from '../migrations/runner';
import {createAuthStateService} from './auth-state';
import {createPostgresAuthStatePort} from './postgres-auth-state';
const pool=new Pool({max:4});
let now=Date.now();
const service=()=>createAuthStateService({origin:'https://knolstory.example',flowTtlMs:1000,sessionTtlMs:5000,csrfSecret:'x'.repeat(32)},createPostgresAuthStatePort(pool),()=>now);
async function account(){const id=randomUUID();await pool.query("INSERT INTO knolstory_auth.accounts(id,status) VALUES($1,'active')",[id]);return id;}
const input={provider:'google' as const,purpose:'link' as const,verifier:'v'.repeat(43),nonce:'n'.repeat(43)};
describe('real PostgreSQL opaque auth state',()=>{
 beforeAll(async()=>{await runStorageMigrations(pool);});
 afterAll(async()=>{await pool.end();});
 it('stores hashes, persists sessions and consumes one flow exactly once across connections',async()=>{
  const id=await account(),session=await service().issueSession(id),flow=await service().createPendingFlow({...input,initialSessionToken:session.token});
  const stored=(await pool.query('SELECT token_hash FROM knolstory_auth.sessions WHERE account_id=$1',[id])).rows[0];expect(stored.token_hash).not.toBe(session.token);
  const results=await Promise.allSettled(Array.from({length:8},()=>service().consumeFlow({...flow,provider:'google',currentSessionToken:session.token})));
  expect(results.filter(result=>result.status==='fulfilled')).toHaveLength(1);
  expect(results.filter(result=>result.status==='rejected')).toHaveLength(7);
  expect(await service().authenticate(session.token)).toMatchObject({accountId:id,csrf:session.csrf});
 });
 it('preserves a genuine flow after browser mismatch and rejects revoked starting sessions',async()=>{
  const session=await service().issueSession(await account()),flow=await service().createPendingFlow({...input,initialSessionToken:session.token});
  await expect(service().consumeFlow({...flow,provider:'google',currentSessionToken:session.token,browserBinding:'b'.repeat(43)})).rejects.toMatchObject({code:'INVALID_FLOW'});
  expect(await service().consumeFlow({...flow,provider:'google',currentSessionToken:session.token})).toMatchObject({purpose:'link'});
  const next=await service().createPendingFlow({...input,initialSessionToken:session.token});await service().revokeSession(session.token);
  expect(await service().authenticate(session.token)).toBeNull();
  await expect(service().consumeFlow({...next,provider:'google',currentSessionToken:session.token})).rejects.toMatchObject({code:'INVALID_FLOW'});
 });
 it('rejects expired flows and sessions at exact expiry',async()=>{
  const session=await service().issueSession(await account()),flow=await service().createPendingFlow({...input,initialSessionToken:session.token});now+=1000;
  await expect(service().consumeFlow({...flow,provider:'google',currentSessionToken:session.token})).rejects.toMatchObject({code:'INVALID_FLOW'});now+=4000;
  expect(await service().authenticate(session.token)).toBeNull();
 });
 it.each(['inactive','deleted'])('rejects %s accounts during session issue/authentication and flow consumption',async status=>{
  const id=await account(),session=await service().issueSession(id),flow=await service().createPendingFlow({...input,initialSessionToken:session.token});await pool.query('UPDATE knolstory_auth.accounts SET status=$2 WHERE id=$1',[id,status]);
  expect(await service().authenticate(session.token)).toBeNull();await expect(service().issueSession(id)).rejects.toMatchObject({code:'ACCOUNT_UNAVAILABLE'});
  await expect(service().consumeFlow({...flow,provider:'google',currentSessionToken:session.token})).rejects.toMatchObject({code:'INVALID_FLOW'});
 });
 it('revokes an entire rotated session family while preserving unrelated device sessions',async()=>{
  const id=await account(),original=await service().issueSession(id),device=await service().issueSession(id);
  const digest=(token:string)=>createHash('sha256').update(token).digest('hex');
  const child=createHash('sha256').update(crypto.randomUUID()).digest('base64url'),grandchild=createHash('sha256').update(crypto.randomUUID()).digest('base64url');
  await pool.query('INSERT INTO knolstory_auth.sessions(token_hash,account_id,expires_at,rotated_from) VALUES($1,$2,$3,$4)',[digest(child),id,now+5000,digest(original.token)]);
  await pool.query('INSERT INTO knolstory_auth.sessions(token_hash,account_id,expires_at,rotated_from) VALUES($1,$2,$3,$4)',[digest(grandchild),id,now+5000,digest(child)]);
  await service().revokeSession(original.token);
  expect(await service().authenticate(original.token)).toBeNull();
  expect(await service().authenticate(child)).toBeNull();
  expect(await service().authenticate(grandchild)).toBeNull();
  expect(await service().authenticate(device.token)).toMatchObject({accountId:id});
  await expect(service().revokeSession(original.token)).resolves.toBeUndefined();
 });
});

it.each([false,true])('rolls back a failed revocation; rollback failure=%s',async rollbackFails=>{
 const failure=new Error('revocation failed'),rollback=new Error('rollback failed');
 const statements:string[]=[],releases:unknown[]=[];
 const client={async query(sql:string){statements.push(sql);if(sql==='ROLLBACK'&&rollbackFails)throw rollback;if(sql.startsWith('WITH RECURSIVE descendants'))throw failure;return {rows:[],rowCount:0};},release(value?:unknown){releases.push(value);}};
 const result=createPostgresAuthStatePort({async connect(){return client;}}).revokeSession('a'.repeat(64));
 if(rollbackFails)await expect(result).rejects.toMatchObject({errors:[failure,rollback]});
 else await expect(result).rejects.toBe(failure);
 expect(statements[0]).toBe('BEGIN ISOLATION LEVEL READ COMMITTED');
 expect(statements[1]).toContain('FOR UPDATE OF root');
 expect(statements[2]).toContain('WITH RECURSIVE descendants');
 expect(statements[3]).toBe('ROLLBACK');
 expect(statements).not.toContain('COMMIT');expect(releases).toEqual([rollbackFails?true:undefined]);
});
