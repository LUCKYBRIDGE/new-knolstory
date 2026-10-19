import {createHash,randomUUID} from 'node:crypto';
import {Pool} from 'pg';
import {beforeAll,afterAll,describe,it,expect} from 'vitest';
import {runStorageMigrations} from '../migrations/runner';
import type {SqlClient} from '../storage/postgres-save-port';
import {createPostgresAuthCompletion} from './postgres-auth-completion';
import {createPostgresAuthStatePort} from './postgres-auth-state';
import {lockPostgresRequestSession} from './postgres-request-session';
const pool=new Pool({max:8});
const hash=(raw:string)=>createHash('sha256').update(raw).digest('hex');
const account=()=>createPostgresAuthCompletion(pool,{sessionTtlMs:5000,clock:()=>1000}).complete({identity:{provider:'kakao',subject:randomUUID()},purpose:'login'});
function deferred(){let resolve!:()=>void;const promise=new Promise<void>(done=>{resolve=done;});return {promise,resolve};}
describe('real PostgreSQL current request session locks',()=>{
 beforeAll(async()=>{await runStorageMigrations(pool);});afterAll(async()=>{await pool.end();});
 it('waits for a root lock then rejects a committed logout using a fresh snapshot',async()=>{
  const user=await account(),blocker=await pool.connect(),request=await pool.connect(),arrived=deferred();
  await blocker.query('BEGIN');await blocker.query('SELECT token_hash FROM knolstory_auth.sessions WHERE token_hash=$1 FOR UPDATE',[hash(user.session!.token)]);
  await request.query('BEGIN ISOLATION LEVEL READ COMMITTED');
  const observed:SqlClient={release:()=>{},query(sql,values){const result=request.query(sql,values);if(sql.includes('WITH RECURSIVE'))arrived.resolve();return result;}};
  const pending=lockPostgresRequestSession(observed,{sessionToken:user.session!.token,expectedAccountId:user.accountId},()=>1000);
  const rejected=expect(pending).rejects.toMatchObject({code:'SESSION_REQUIRED'});
  try{await arrived.promise;await blocker.query('UPDATE knolstory_auth.sessions SET revoked=true WHERE token_hash=$1',[hash(user.session!.token)]);await blocker.query('COMMIT');await rejected;}
  finally{await blocker.query('ROLLBACK');await request.query('ROLLBACK');blocker.release();request.release();}
 });
 it('holds account and session eligibility until caller commit and rechecks expiry before it',async()=>{
  const user=await account(),client=await pool.connect();let now=1000;
  await client.query('BEGIN');
  try{
   const locked=await lockPostgresRequestSession(client,{sessionToken:user.session!.token,expectedAccountId:user.accountId},()=>now);
   const updater=await pool.connect();await updater.query('BEGIN');
   try{await updater.query("SET LOCAL lock_timeout='100ms'");await expect(updater.query("UPDATE knolstory_auth.accounts SET status='inactive' WHERE id=$1",[user.accountId])).rejects.toMatchObject({code:'55P03'});}
   finally{await updater.query('ROLLBACK');updater.release();}
   now=6000;expect(()=>locked.assertEligible()).toThrowError(expect.objectContaining({code:'SESSION_REQUIRED'}));
  }finally{await client.query('ROLLBACK');client.release();}
 });
 it('a completed request releases locks so logout subsequently revokes the session',async()=>{
  const user=await account(),client=await pool.connect();await client.query('BEGIN');
  try{const locked=await lockPostgresRequestSession(client,{sessionToken:user.session!.token,expectedAccountId:user.accountId},()=>1000);locked.assertEligible();await client.query('COMMIT');}
  finally{await client.query('ROLLBACK');client.release();}
  const port=createPostgresAuthStatePort(pool);await port.revokeSession(hash(user.session!.token));expect(await port.findSession(hash(user.session!.token),1000)).toBeNull();
 });
});
