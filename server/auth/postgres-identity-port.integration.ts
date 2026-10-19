import {randomUUID, createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {Pool} from 'pg';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';
import {linkGoogle, resolveLogin} from './identity-links';
import {createPostgresIdentityPort} from './postgres-identity-port';
import {STORAGE_MIGRATIONS,runStorageMigrations} from '../migrations/runner';

const pool = new Pool({max:12});
const port = () => createPostgresIdentityPort(pool);
const kakao = () => ({provider:'kakao' as const,subject:randomUUID()});
const google = () => ({provider:'google' as const,subject:randomUUID()});
async function countAccounts() {
 return Number((await pool.query('SELECT count(*) AS count FROM knolstory_auth.accounts')).rows[0].count);
}
describe('real PostgreSQL trusted identity transactions',()=>{
 beforeAll(async()=>{await runStorageMigrations(pool);});
 afterAll(async()=>{await pool.end();});
 it('applies migration three once and preserves all source checksums',async()=>{
  await runStorageMigrations(pool);
  const rows=(await pool.query('SELECT version,sha256 FROM knolstory_storage.migrations ORDER BY version')).rows;
  expect(rows).toHaveLength(STORAGE_MIGRATIONS.length);
  for(const [index,name] of STORAGE_MIGRATIONS.entries()) {
   const bytes=await readFile(new URL(`../migrations/${name}`,import.meta.url));
   expect(rows[index]).toEqual({version:index+1,sha256:createHash('sha256').update(bytes).digest('hex')});
  }
 });
 it('concurrent independent connections create exactly one Kakao account without orphan accounts',async()=>{
  const identity=kakao(), before=await countAccounts();
  const results=await Promise.all(Array.from({length:8},()=>resolveLogin(identity,port())));
  expect(new Set(results.map(result=>result.accountId)).size).toBe(1);
  expect(results.filter(result=>result.created)).toHaveLength(1);
  expect(await countAccounts()).toBe(before+1);
 });
 it('explicit Google link persists across a new pool and logs in to exactly the same account',async()=>{
  const account=await resolveLogin(kakao(),port()), identity=google();
  await expect(resolveLogin(identity,port())).rejects.toMatchObject({code:'GOOGLE_NOT_LINKED'});
  expect(await linkGoogle(account,identity,port())).toEqual({accountId:account.accountId,linked:true});
  expect(await linkGoogle(account,identity,port())).toEqual({accountId:account.accountId,linked:false});
  const reopened=new Pool({max:2});
  try {expect(await resolveLogin(identity,createPostgresIdentityPort(reopened))).toEqual({accountId:account.accountId,created:false});}
  finally {await reopened.end();}
 });
 it('concurrent Google links to different accounts allow one winner and never transfer identity',async()=>{
  const accounts=await Promise.all([resolveLogin(kakao(),port()),resolveLogin(kakao(),port())]), identity=google();
  const results=await Promise.allSettled(accounts.map(account=>linkGoogle(account,identity,port())));
  expect(results.filter(result=>result.status==='fulfilled')).toHaveLength(1);
  expect(results.find(result=>result.status==='rejected')).toMatchObject({reason:{code:'IDENTITY_ALREADY_LINKED'}});
  const winner=results.find(result=>result.status==='fulfilled');
  if(winner?.status!=='fulfilled')throw Error('Missing winner');
  expect((await resolveLogin(identity,port())).accountId).toBe(winner.value.accountId);
 });
 it('preserves case-sensitive opaque subjects for each provider',async()=>{
  const suffix=randomUUID();
  const identities=[{provider:'kakao' as const,subject:`Case-${suffix}`},{provider:'kakao' as const,subject:`case-${suffix}`}];
  const accounts=await Promise.all(identities.map(value=>resolveLogin(value,port())));
  expect(accounts[0].accountId).not.toBe(accounts[1].accountId);
  const googleIdentities=identities.map(value=>({...value,provider:'google' as const}));
  await Promise.all(accounts.map((account,index)=>linkGoogle(account,googleIdentities[index],port())));
  for(const [index,account] of accounts.entries()) {
   expect((await resolveLogin(identities[index],port())).accountId).toBe(account.accountId);
   expect((await resolveLogin(googleIdentities[index],port())).accountId).toBe(account.accountId);
  }
 });
 it('concurrent repeated Google link is idempotent',async()=>{
  const account=await resolveLogin(kakao(),port()), identity=google();
  const results=await Promise.all(Array.from({length:6},()=>linkGoogle(account,identity,port())));
  expect(results.filter(result=>result.linked)).toHaveLength(1);
  expect(results.every(result=>result.accountId===account.accountId)).toBe(true);
 });
 it.each(['inactive','deleted'])('rejects %s account login and linking',async status=>{
  const identity=kakao(), account=await resolveLogin(identity,port());
  await pool.query('UPDATE knolstory_auth.accounts SET status=$2 WHERE id=$1',[account.accountId,status]);
  await expect(resolveLogin(identity,port())).rejects.toMatchObject({code:'ACCOUNT_UNAVAILABLE'});
  await expect(linkGoogle(account,google(),port())).rejects.toMatchObject({code:'ACCOUNT_UNAVAILABLE'});
 });
 it('duplicate identity rejection rolls back an account inserted by the failed callback',async()=>{
  const identity=kakao(), existing=await resolveLogin(identity,port()), before=await countAccounts();
  await expect(port().transaction(async tx=>{
   const account=await tx.createAccount();
   expect(await tx.insertIdentity(identity,account.id)).toBe('conflict');
   throw Error('conflicting callback');
  })).rejects.toThrow('conflicting callback');
  expect(await countAccounts()).toBe(before);
  expect((await resolveLogin(identity,port())).accountId).toBe(existing.accountId);
 });
 it('SQL failure atomically rolls back account creation and propagates unexpected constraints',async()=>{
  const before=await countAccounts(), identity=kakao();
  await pool.query("ALTER TABLE knolstory_auth.identities ADD CONSTRAINT integration_reject_identity CHECK (subject <> 'force-sql-failure')");
  try {await expect(resolveLogin({...identity,subject:'force-sql-failure'},port())).rejects.toMatchObject({code:'23514'});}
  finally {await pool.query('ALTER TABLE knolstory_auth.identities DROP CONSTRAINT integration_reject_identity');}
  expect(await countAccounts()).toBe(before);
 });
 it('a committed status revocation racing a link is observed after account row lock',async()=>{
  const account=await resolveLogin(kakao(),port()), identity=google(), client=await pool.connect();
  await client.query('BEGIN');
  try {
   await client.query("UPDATE knolstory_auth.accounts SET status='inactive' WHERE id=$1",[account.accountId]);
   const linking=linkGoogle(account,identity,port());
   // Register rejection handling before releasing the actual row lock.
   const rejected=expect(linking).rejects.toMatchObject({code:'ACCOUNT_UNAVAILABLE'});
   await client.query('COMMIT');
   await rejected;
   expect((await pool.query('SELECT account_id FROM knolstory_auth.identities WHERE provider=$1 AND subject=$2',[identity.provider,identity.subject])).rows).toEqual([]);
  } finally {await client.query('ROLLBACK');client.release();}
 });
});
