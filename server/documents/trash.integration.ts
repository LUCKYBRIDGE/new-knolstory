import {createHash,randomUUID} from 'node:crypto';
import {Pool} from 'pg';
import {afterAll,beforeAll,describe,expect,it} from 'vitest';
import {createAuthoringArchive,prepareJsonbSnapshot} from '../../packages/compatibility/src/authoring-archive';
import {newShortStory} from '../../packages/compatibility/src/shortstory';
import {createAuthStateService} from '../auth/auth-state';
import {createPostgresAuthStatePort} from '../auth/postgres-auth-state';
import {runStorageMigrations} from '../migrations/runner';
import {createDocumentService,type DocumentContext} from './service';
const pool=new Pool({max:12});const now=Date.now();
const service=()=>createDocumentService(pool,{clock:()=>now});
async function owner():Promise<DocumentContext>{
 const accountId=randomUUID();await pool.query("INSERT INTO knolstory_auth.accounts(id,status) VALUES($1,'active')",[accountId]);
 const auth=createAuthStateService({origin:'https://knolstory.example',flowTtlMs:60000,sessionTtlMs:60000,csrfSecret:'s'.repeat(32)},createPostgresAuthStatePort(pool),()=>now);
 return {accountId,token:(await auth.issueSession(accountId)).token};
}
async function setup(){const user=await owner(),snapshot=await prepareJsonbSnapshot(await createAuthoringArchive({format:'shortstory',project:newShortStory()}));const record=await service().create(user,{payloadVersion:1,snapshot,idempotencyKey:randomUUID()});return {user,snapshot,record};}
const command=(expectedRevision=1,expectedStateVersion=1)=>({payloadVersion:1 as const,expectedRevision,expectedStateVersion,idempotencyKey:randomUUID()});
describe('online trash preserves the same PostgreSQL document',()=>{
 beforeAll(async()=>{await runStorageMigrations(pool);});afterAll(async()=>{await pool.end();});
 it('moves between active/trash lists and restores the exact snapshot, identity and content revision',async()=>{
  const {user,snapshot,record}=await setup();const input=command();
  const deleted=await service().trash(user,record.recordId,input);
  expect(deleted).toMatchObject({recordId:record.recordId,revision:1,stateVersion:2,deletedAt:now,replayed:false});
  expect((await service().list(user)).documents).toEqual([]);
  expect((await service().list(user,{state:'trash'})).documents).toMatchObject([{recordId:record.recordId,stateVersion:2,deletedAt:now}]);
  await expect(service().read(user,record.recordId)).rejects.toMatchObject({code:'DOCUMENT_TRASHED',status:409});
  const restored=await service().restore(user,record.recordId,command(1,2));
  expect(restored).toMatchObject({recordId:record.recordId,revision:1,stateVersion:3,deletedAt:null,replayed:false});
  expect((await service().read(user,record.recordId)).snapshot).toEqual(snapshot);
  expect((await service().list(user,{state:'trash'})).documents).toEqual([]);
  expect(await service().trash(user,record.recordId,input)).toEqual({...deleted,replayed:true});
  expect((await service().read(user,record.recordId)).stateVersion).toBe(3);
 });
 it('serializes competing commands and rejects stale state/revision and reused command bodies',async()=>{
  const {user,record}=await setup(),a=command(),b=command();
  const results=await Promise.allSettled([service().trash(user,record.recordId,a),service().trash(user,record.recordId,b)]);
  expect(results.filter(value=>value.status==='fulfilled')).toHaveLength(1);
  expect(results.filter(value=>value.status==='rejected')).toMatchObject([{reason:{code:'DOCUMENT_STATE_CONFLICT'}}]);
  const winner=results[0].status==='fulfilled'?a:b;
  await expect(service().restore(user,record.recordId,{...winner,expectedStateVersion:2})).rejects.toMatchObject({code:'IDEMPOTENCY_CONFLICT'});
  await expect(service().restore(user,record.recordId,command(2,2))).rejects.toMatchObject({code:'DOCUMENT_STATE_CONFLICT'});
  await expect(service().restore(user,record.recordId,command(1,1))).rejects.toMatchObject({code:'DOCUMENT_STATE_CONFLICT'});
 });
 it('blocks both new saves and committed save replays while trashed without touching content history',async()=>{
  const {user,record,snapshot}=await setup(),save={payloadVersion:1 as const,expectedRevision:1,snapshot,idempotencyKey:randomUUID()};
  await service().save(user,record.recordId,save);await service().trash(user,record.recordId,command(2,1));
  await expect(service().save(user,record.recordId,save)).rejects.toMatchObject({code:'DOCUMENT_TRASHED'});
  await expect(service().save(user,record.recordId,{...save,expectedRevision:2,idempotencyKey:randomUUID()})).rejects.toMatchObject({code:'DOCUMENT_TRASHED'});
  await service().restore(user,record.recordId,command(2,2));expect((await service().read(user,record.recordId)).snapshot).toEqual(snapshot);
  expect((await pool.query('SELECT * FROM knolstory_storage.receipts WHERE record_id=$1',[record.recordId])).rowCount).toBe(1);
 });
 it('checks ownership and revoked sessions before command receipt replay',async()=>{
  const {user,record}=await setup(),other=await owner(),input=command();
  await expect(service().trash(other,record.recordId,input)).rejects.toMatchObject({code:'NOT_FOUND'});
  await service().trash(user,record.recordId,input);
  await expect(service().restore(other,record.recordId,command(1,2))).rejects.toMatchObject({code:'NOT_FOUND'});
  await createPostgresAuthStatePort(pool).revokeSession(createHash('sha256').update(user.token).digest('hex'));
  await expect(service().trash(user,record.recordId,input)).rejects.toMatchObject({code:'SESSION_REQUIRED'});
  await expect(service().restore(user,record.recordId,command(1,2))).rejects.toMatchObject({code:'SESSION_REQUIRED'});
 });
 it('rejects malformed input and list filters before any state mutation',async()=>{
  const {user,record}=await setup();
  for(const expectedStateVersion of [0,-1,1.2,'1',Number.MAX_SAFE_INTEGER+1])await expect(service().trash(user,record.recordId,{...command(),expectedStateVersion} as never)).rejects.toMatchObject({code:'INVALID_REQUEST',status:400});
  await expect(service().list(user,{state:'all'} as never)).rejects.toMatchObject({code:'INVALID_REQUEST'});
  expect((await service().read(user,record.recordId)).stateVersion).toBe(1);
 });
 it('replays concurrent identical commands exactly once and rejects wrong current state',async()=>{
  const {user,record}=await setup(),input=command();
  await expect(service().restore(user,record.recordId,command())).rejects.toMatchObject({code:'DOCUMENT_STATE_CONFLICT'});
  const results=await Promise.all([service().trash(user,record.recordId,input),service().trash(user,record.recordId,input)]);
  expect(results.map(value=>value.replayed).sort()).toEqual([false,true]);
  expect(results[0].stateVersion).toBe(2);expect(results[1].stateVersion).toBe(2);
  expect((await pool.query('SELECT * FROM knolstory_storage.document_state_commands WHERE record_id=$1',[record.recordId])).rowCount).toBe(1);
 });
 it('serializes a content save against trash so a stale command never hides a newer revision',async()=>{
  const {user,record,snapshot}=await setup();
  const results=await Promise.allSettled([service().save(user,record.recordId,{payloadVersion:1,expectedRevision:1,snapshot,idempotencyKey:randomUUID()}),service().trash(user,record.recordId,command())]);
  expect(results.filter(value=>value.status==='fulfilled')).toHaveLength(1);
  const rows=await pool.query('SELECT r.revision,d.deleted_at,d.state_version FROM knolstory_storage.records r JOIN knolstory_storage.private_documents d USING(scope_id,record_id) WHERE record_id=$1',[record.recordId]);
  if(results[0].status==='fulfilled')expect(rows.rows[0]).toMatchObject({revision:'2',deleted_at:null,state_version:'1'});
  else expect(rows.rows[0]).toMatchObject({revision:'1',deleted_at:String(now),state_version:'2'});
 });
 it('paginates trash without active records and rejects a cursor from the other state',async()=>{
  const {user,record,snapshot}=await setup();await service().trash(user,record.recordId,command());
  for(let i=0;i<2;i++){
   const next=await service().create(user,{payloadVersion:1,snapshot,idempotencyKey:randomUUID()});
   await service().trash(user,next.recordId,command());
  }
  const active=await service().create(user,{payloadVersion:1,snapshot,idempotencyKey:randomUUID()});
  const first=await service().list(user,{state:'trash',limit:2});expect(first.documents).toHaveLength(2);
  const next=await service().list(user,{state:'trash',limit:2,cursor:first.nextCursor!});expect(next.documents).toHaveLength(1);
  expect(new Set([...first.documents,...next.documents].map(value=>value.recordId)).size).toBe(3);
  expect([...first.documents,...next.documents].map(value=>value.recordId)).not.toContain(active.recordId);
  await expect(service().list(user,{cursor:first.nextCursor!})).rejects.toMatchObject({code:'INVALID_REQUEST'});
 });
 it('rolls back state and command receipt when the session expires before commit',async()=>{
  const {user,record}=await setup();let checks=0;const expiring=createDocumentService(pool,{clock:()=>++checks>=3?now+60000:now});const input=command();
  await expect(expiring.trash(user,record.recordId,input)).rejects.toMatchObject({code:'SESSION_REQUIRED'});
  expect((await service().read(user,record.recordId)).stateVersion).toBe(1);
  expect((await pool.query('SELECT * FROM knolstory_storage.document_state_commands WHERE record_id=$1',[record.recordId])).rowCount).toBe(0);
 });
});
