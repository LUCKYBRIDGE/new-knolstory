import {createHash,randomUUID} from 'node:crypto';
import {Pool} from 'pg';
import {afterAll,beforeAll,describe,expect,it} from 'vitest';
import {runStorageMigrations} from '../migrations/runner';
import type {SqlPool} from '../storage/postgres-save-port';
import {createPostgresAuthCompletion} from './postgres-auth-completion';
import {createPostgresAuthStatePort} from './postgres-auth-state';
const pool=new Pool({max:12});
const clock=()=>1000;
const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
const kakao=()=>({provider:'kakao' as const,subject:randomUUID()});
const google=()=>({provider:'google' as const,subject:randomUUID()});
const completion=(db:SqlPool=pool)=>createPostgresAuthCompletion(db,{sessionTtlMs:5000,clock});
async function sessions(accountId:string){return (await pool.query('SELECT * FROM knolstory_auth.sessions WHERE account_id=$1',[accountId])).rows;}
function deferred(){let resolve!:()=>void;const promise=new Promise<void>(done=>{resolve=done;});return {promise,resolve};}
function observe(db:SqlPool,match:(sql:string)=>boolean,action:()=>Promise<void>):SqlPool {
 return {async connect(){const client=await db.connect();return {release:client.release.bind(client),async query(sql,values){const result=await client.query(sql,values);if(match(sql))await action();return result;}};}};
}
describe('real PostgreSQL atomic identity and session completion',()=>{
 beforeAll(async()=>{await runStorageMigrations(pool);});
 afterAll(async()=>{await pool.end();});
 it('Kakao signup commits identity and only hashed session together; linked Google logs in to the same account',async()=>{
  const first=await completion().complete({identity:kakao(),purpose:'login'});
  expect(first.session?.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
  expect(first.session?.expiresAt).toBe(6000);
  expect((await sessions(first.accountId))[0].token_hash).toBe(hash(first.session!.token));
  const identity=google();
  const linked=await completion().complete({identity,purpose:'link',currentSessionToken:first.session!.token,expectedAccountId:first.accountId});
  expect(linked).toEqual({accountId:first.accountId,linked:true});
  expect(await sessions(first.accountId)).toHaveLength(1);
  const login=await completion().complete({identity,purpose:'login'});
  expect(login.accountId).toBe(first.accountId);
  expect(login.session).toBeDefined();
 });
 it('unknown Google creates neither account nor session',async()=>{
  const before=(await pool.query('SELECT count(*) FROM knolstory_auth.accounts')).rows[0].count;
  await expect(completion().complete({identity:google(),purpose:'login'})).rejects.toMatchObject({code:'GOOGLE_NOT_LINKED'});
  expect((await pool.query('SELECT count(*) FROM knolstory_auth.accounts')).rows[0].count).toBe(before);
 });
 it('link conflicts and account mismatch preserve identity and all existing sessions',async()=>{
  const first=await completion().complete({identity:kakao(),purpose:'login'}),second=await completion().complete({identity:kakao(),purpose:'login'}),identity=google();
  await completion().complete({identity,purpose:'link',currentSessionToken:first.session!.token,expectedAccountId:first.accountId});
  await expect(completion().complete({identity,purpose:'link',currentSessionToken:second.session!.token,expectedAccountId:second.accountId})).rejects.toMatchObject({code:'IDENTITY_ALREADY_LINKED'});
  await expect(completion().complete({identity:google(),purpose:'link',currentSessionToken:second.session!.token,expectedAccountId:first.accountId})).rejects.toMatchObject({code:'SESSION_REQUIRED'});
  expect(await sessions(second.accountId)).toHaveLength(1);
 });
 it('authenticated login cannot switch accounts or create an orphan Kakao account',async()=>{
  const identity=kakao(),first=await completion().complete({identity,purpose:'login'}),other=await completion().complete({identity:kakao(),purpose:'login'});
  for(const target of [identity,kakao()])await expect(completion().complete({identity:target,purpose:'login',currentSessionToken:other.session!.token,expectedAccountId:other.accountId})).rejects.toMatchObject({code:'IDENTITY_ALREADY_LINKED'});
  expect(await sessions(other.accountId)).toHaveLength(1);
 });
 it('logout committed while callback waits for original session lock prevents link and login',async()=>{
  for(const purpose of ['link','login'] as const){
   const identity=kakao(),first=await completion().complete({identity,purpose:'login'}),client=await pool.connect(),arrived=deferred();
   await client.query('BEGIN');await client.query('SELECT token_hash FROM knolstory_auth.sessions WHERE token_hash=$1 FOR UPDATE',[hash(first.session!.token)]);
   const db:SqlPool={async connect(){const connection=await pool.connect();return {release:connection.release.bind(connection),query(sql,values){const result=connection.query(sql,values);if(sql.includes('WITH RECURSIVE'))arrived.resolve();return result;}};}};
   const target=purpose==='link'?google():identity;
   const result=completion(db).complete({identity:target,purpose,currentSessionToken:first.session!.token,expectedAccountId:first.accountId});
   const rejected=expect(result).rejects.toMatchObject({code:'SESSION_REQUIRED'});
   try{await arrived.promise;await client.query('UPDATE knolstory_auth.sessions SET revoked=true WHERE token_hash=$1',[hash(first.session!.token)]);await client.query('COMMIT');await rejected;}
   finally{await client.query('ROLLBACK');client.release();}
   expect(await sessions(first.accountId)).toHaveLength(1);
   if(purpose==='link')expect((await pool.query('SELECT * FROM knolstory_auth.identities WHERE provider=$1 AND subject=$2',[target.provider,target.subject])).rows).toEqual([]);
  }
 });
 it('queued logout revokes newly rotated descendants while unrelated device sessions survive',async()=>{
  const identity=kakao(),first=await completion().complete({identity,purpose:'login'}),other=await completion().complete({identity,purpose:'login'}),inserted=deferred(),resume=deferred();
  const db=observe(pool,sql=>sql.startsWith('INSERT INTO knolstory_auth.sessions'),async()=>{inserted.resolve();await resume.promise;});
  const rotating=completion(db).complete({identity,purpose:'login',currentSessionToken:first.session!.token,expectedAccountId:first.accountId});
  await inserted.promise;
  const logout=createPostgresAuthStatePort(pool).revokeSession(hash(first.session!.token));
  resume.resolve();const rotated=await rotating;await logout;
  const rows=await sessions(first.accountId);
  expect(rows.find(row=>row.token_hash===hash(first.session!.token)).revoked).toBe(true);
  expect(rows.find(row=>row.token_hash===hash(rotated.session!.token)).revoked).toBe(true);
  expect(rows.find(row=>row.token_hash===hash(other.session!.token)).revoked).toBe(false);
 });
 it('failure revoking original rolls back issued session and preserves original validity',async()=>{
  const identity=kakao(),first=await completion().complete({identity,purpose:'login'});
  const db=observe(pool,sql=>sql.startsWith('UPDATE knolstory_auth.sessions SET revoked'),async()=>{throw Error('revoke failure');});
  await expect(completion(db).complete({identity,purpose:'login',currentSessionToken:first.session!.token,expectedAccountId:first.accountId})).rejects.toThrow('revoke failure');
  const rows=await sessions(first.accountId);expect(rows).toHaveLength(1);expect(rows[0].revoked).toBe(false);
 });
 it('ancestor logout serializes a child rotation and revokes the new grandchild',async()=>{
  const identity=kakao(),first=await completion().complete({identity,purpose:'login'});
  const child=await completion().complete({identity,purpose:'login',currentSessionToken:first.session!.token,expectedAccountId:first.accountId});
  const device=await completion().complete({identity,purpose:'login'}),inserted=deferred(),resume=deferred();
  const db=observe(pool,sql=>sql.startsWith('INSERT INTO knolstory_auth.sessions'),async()=>{inserted.resolve();await resume.promise;});
  const pending=completion(db).complete({identity,purpose:'login',currentSessionToken:child.session!.token,expectedAccountId:first.accountId});
  await inserted.promise;
  const logout=createPostgresAuthStatePort(pool).revokeSession(hash(first.session!.token));
  resume.resolve();const grandchild=await pending;await logout;
  const rows=await sessions(first.accountId);
  for(const token of [first.session!.token,child.session!.token,grandchild.session!.token])expect(rows.find(row=>row.token_hash===hash(token)).revoked).toBe(true);
  expect(rows.find(row=>row.token_hash===hash(device.session!.token)).revoked).toBe(false);
 });

 it('checks expiry after a lock wait instead of the pre-wait timestamp',async()=>{
  for(const purpose of ['link','login'] as const){
   let now=1000;const identity=kakao();
   const first=await createPostgresAuthCompletion(pool,{sessionTtlMs:5000,clock:()=>now}).complete({identity,purpose:'login'});
   const client=await pool.connect(),arrived=deferred();
   await client.query('BEGIN');await client.query('SELECT token_hash FROM knolstory_auth.sessions WHERE token_hash=$1 FOR UPDATE',[hash(first.session!.token)]);
   const db:SqlPool={async connect(){const connection=await pool.connect();return {release:connection.release.bind(connection),query(sql,values){const result=connection.query(sql,values);if(sql.includes('WITH RECURSIVE'))arrived.resolve();return result;}};}};
   const result=createPostgresAuthCompletion(db,{sessionTtlMs:5000,clock:()=>now}).complete({identity:purpose==='link'?google():identity,purpose,currentSessionToken:first.session!.token,expectedAccountId:first.accountId});
   const rejected=expect(result).rejects.toMatchObject({code:'SESSION_REQUIRED'});
   try{await arrived.promise;now=7000;await client.query('COMMIT');await rejected;}
   finally{await client.query('ROLLBACK');client.release();}
   expect(await sessions(first.accountId)).toHaveLength(1);
  }
 });

});
