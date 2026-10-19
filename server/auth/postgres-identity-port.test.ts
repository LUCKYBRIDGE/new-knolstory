import {describe, expect, it} from 'vitest';
import type {SqlClient, SqlPool} from '../storage/postgres-save-port';
import type {VerifiedIdentity} from './identity-links';
import {createPostgresIdentityPort} from './postgres-identity-port';

type Result = {rows:Record<string,unknown>[];rowCount:number|null};
type Step = {query:string;result?:Result;error?:unknown};
const empty:Result={rows:[],rowCount:0};
const accountId='126a1eae-7285-4336-a3c7-d2e6ba3d0d70';
const identity={provider:'google',subject:'Opaque Subject'} as const;
const begin:Step={query:'BEGIN ISOLATION LEVEL SERIALIZABLE'};
const commit:Step={query:'COMMIT'};
const rollback:Step={query:'ROLLBACK'};
const accountRow:Result={rows:[{id:accountId,status:'active'}],rowCount:1};
const failure=(code:string,constraint?:string)=>Object.assign(new Error(code),{code,constraint});

/** A driver protocol script, not a database isolation model. Real contention and
 * persistence are independently covered by postgres-identity-port.integration.ts. */
function scriptedPool(transactions:readonly (readonly Step[])[]) {
 const connections:{queries:string[];releases:(Error|boolean|undefined)[];remaining:Step[]}[]=[];
 const pool:SqlPool={async connect():Promise<SqlClient> {
  const script=transactions[connections.length];
  if(!script)throw Error('Unexpected extra connection');
  const state={queries:[] as string[],releases:[] as (Error|boolean|undefined)[],remaining:[...script]};
  connections.push(state);
  return {
   async query(query) {
    state.queries.push(query);
    const step=state.remaining.shift();
    expect(step?.query).toBe(query);
    if(!step)throw Error('Unexpected query');
    if('error' in step)throw step.error;
    return step.result??empty;
   },
   release(value) {state.releases.push(value);},
  };
 }};
 return {pool,connections,assertConsumed() {
  expect(connections).toHaveLength(transactions.length);
  for(const connection of connections) {
   expect(connection.remaining).toEqual([]);
   expect(connection.releases).toHaveLength(1);
  }
 }};
}
const readAccount=(result:Result=accountRow):Step=>({query:'SELECT id,status FROM knolstory_auth.accounts WHERE id=$1 FOR UPDATE',result});
const readIdentity=(result:Result=empty):Step=>({query:'SELECT account_id FROM knolstory_auth.identities WHERE provider=$1 AND subject=$2 FOR SHARE',result});
const createQuery="INSERT INTO knolstory_auth.accounts(id,status) VALUES($1,'active') RETURNING id,status";
const insertQuery='INSERT INTO knolstory_auth.identities(provider,subject,account_id) VALUES($1,$2,$3) ON CONFLICT ON CONSTRAINT identities_provider_subject_key DO NOTHING RETURNING account_id';

describe('PostgreSQL identity transaction failure lifecycle',()=>{
 it.each([
  failure('40001'),failure('40P01'),failure('23505','identities_provider_subject_key'),
 ])('retries expected database failure %# with a fresh released transaction',async error=>{
  const driver=scriptedPool([[begin,{...readAccount(),error},rollback],[begin,readAccount(),commit]]);
  expect(await createPostgresIdentityPort(driver.pool).transaction(tx=>tx.findAccount(accountId))).toEqual({id:accountId,status:'active'});
  driver.assertConsumed();
  expect(driver.connections.map(connection=>connection.releases)).toEqual([[undefined],[undefined]]);
 });
 it('caps repeated serialization failures at five transactions and propagates the final error',async()=>{
  const error=failure('40001');
  const driver=scriptedPool(Array.from({length:5},()=>[begin,{...readAccount(),error},rollback]));
  await expect(createPostgresIdentityPort(driver.pool).transaction(tx=>tx.findAccount(accountId))).rejects.toBe(error);
  driver.assertConsumed();
 });
 it.each([failure('23505','accounts_pkey'),failure('23514'),new Error('network unavailable'),null,'failed'])('never retries unexpected error %#',async error=>{
  const driver=scriptedPool([[begin,{...readAccount(),error},rollback]]);
  await expect(createPostgresIdentityPort(driver.pool).transaction(tx=>tx.findAccount(accountId))).rejects.toBe(error);
  driver.assertConsumed();
 });
 it('replays DB-only callback after failed commit and returns only the committed account',async()=>{
  const secondId='b32b0cb5-ae69-4b72-9b44-02077c09c09a';
  const driver=scriptedPool([
   [begin,{query:createQuery,result:accountRow},{query:'COMMIT',error:failure('40001')},rollback],
   [begin,{query:createQuery,result:{rows:[{id:secondId,status:'active'}],rowCount:1}},commit],
  ]);
  const result=await createPostgresIdentityPort(driver.pool).transaction(tx=>tx.createAccount());
  expect(result).toEqual({id:secondId,status:'active'});
  driver.assertConsumed();
 });
 it('evicts the connection and preserves both errors when rollback fails; never retries it',async()=>{
  const original=failure('40001'), rollbackError=new Error('connection lost during rollback');
  const driver=scriptedPool([[begin,{...readAccount(),error:original},{query:'ROLLBACK',error:rollbackError}]]);
  const result=createPostgresIdentityPort(driver.pool).transaction(tx=>tx.findAccount(accountId));
  await expect(result).rejects.toBeInstanceOf(AggregateError);
  await expect(result).rejects.toMatchObject({errors:[original,rollbackError]});
  driver.assertConsumed();
  expect(driver.connections[0].releases).toEqual([true]);
 });
 it('releases a client when BEGIN fails and rolls back before propagating',async()=>{
  const error=new Error('cannot start transaction');
  const driver=scriptedPool([[{query:begin.query,error},rollback]]);
  await expect(createPostgresIdentityPort(driver.pool).transaction(tx=>tx.createAccount())).rejects.toBe(error);
  driver.assertConsumed();
 });
 it.each([{id:42,status:'active'},{id:accountId,status:'unknown'}])('rejects corrupt stored account %#',async row=>{
  const driver=scriptedPool([[begin,readAccount({rows:[row],rowCount:1}),rollback]]);
  await expect(createPostgresIdentityPort(driver.pool).transaction(tx=>tx.findAccount(accountId))).rejects.toMatchObject({code:'STORAGE_CONTRACT_VIOLATION'});
  driver.assertConsumed();
 });
 it('returns missing accounts without inventing an account or querying malformed UUIDs',async()=>{
  const driver=scriptedPool([[begin,readAccount(empty),commit]]);
  expect(await createPostgresIdentityPort(driver.pool).transaction(async tx=>[
   await tx.findAccount('invalid'),await tx.findAccount(accountId),
  ])).toEqual([null,null]);
  driver.assertConsumed();
 });
 it.each([null,{provider:'invalid',subject:'subject'},{provider:'google',subject:' '},{provider:'google',subject:3}])('rejects invalid direct-port identity %# before SQL lookup',async input=>{
  const driver=scriptedPool([[begin,rollback]]);
  await expect(createPostgresIdentityPort(driver.pool).transaction(tx=>tx.findIdentity(input as VerifiedIdentity))).rejects.toMatchObject({code:'INVALID_IDENTITY'});
  driver.assertConsumed();
 });
 it('rejects corrupt identity rows',async()=>{
  const driver=scriptedPool([[begin,readIdentity({rows:[{account_id:42}],rowCount:1}),rollback]]);
  await expect(createPostgresIdentityPort(driver.pool).transaction(tx=>tx.findIdentity(identity))).rejects.toMatchObject({code:'STORAGE_CONTRACT_VIOLATION'});
  driver.assertConsumed();
 });
 it('rejects missing account insertion receipt',async()=>{
  const driver=scriptedPool([[begin,{query:createQuery,result:empty},rollback]]);
  await expect(createPostgresIdentityPort(driver.pool).transaction(tx=>tx.createAccount())).rejects.toMatchObject({code:'STORAGE_CONTRACT_VIOLATION'});
  driver.assertConsumed();
 });
 it.each([empty,{rows:[{id:accountId,status:'inactive'}],rowCount:1}])('rejects unavailable direct-port link accounts %#',async result=>{
  const driver=scriptedPool([[begin,readAccount(result),rollback]]);
  await expect(createPostgresIdentityPort(driver.pool).transaction(tx=>tx.insertIdentity(identity,accountId))).rejects.toMatchObject({code:'ACCOUNT_UNAVAILABLE'});
  driver.assertConsumed();
 });
 it('rejects an impossible conflict response with no persisted identity',async()=>{
  const driver=scriptedPool([[begin,readAccount(),{query:insertQuery,result:empty},readIdentity(),rollback]]);
  await expect(createPostgresIdentityPort(driver.pool).transaction(tx=>tx.insertIdentity(identity,accountId))).rejects.toMatchObject({code:'STORAGE_CONTRACT_VIOLATION'});
  driver.assertConsumed();
 });
});
