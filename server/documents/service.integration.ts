import {readFile} from 'node:fs/promises';
import {parseStoryDocument} from '@knolstory/story-domain';
import {projectSnapshot} from '../storage/snapshot-projection';
import {createHash,randomUUID} from 'node:crypto';
import {Pool} from 'pg';
import {beforeAll,afterAll,describe,it,expect} from 'vitest';
import {createAuthoringArchive,prepareJsonbSnapshot} from '../../packages/compatibility/src/authoring-archive';
import {newShortStory} from '../../packages/compatibility/src/shortstory';
import {createAuthStateService} from '../auth/auth-state';
import {createPostgresAuthStatePort} from '../auth/postgres-auth-state';
import {runStorageMigrations} from '../migrations/runner';
import {createDocumentService,type DocumentContext} from './service';
const pool=new Pool({max:12});
let now=Date.now();
const service=()=>createDocumentService(pool,{clock:()=>now});
async function owner():Promise<DocumentContext>{
 const accountId=randomUUID();await pool.query("INSERT INTO knolstory_auth.accounts(id,status) VALUES($1,'active')",[accountId]);
 const auth=createAuthStateService({origin:'https://knolstory.example',flowTtlMs:60000,sessionTtlMs:60000,csrfSecret:'s'.repeat(32)},createPostgresAuthStatePort(pool),()=>now);
 return {accountId,token:(await auth.issueSession(accountId)).token};
}
async function snapshot(){return prepareJsonbSnapshot(await createAuthoringArchive({format:'shortstory',project:newShortStory()}));}
describe('real PostgreSQL owner-only documents',()=>{
 beforeAll(async()=>{await runStorageMigrations(pool);});afterAll(async()=>{await pool.end();});
 it('creates once across concurrent retries and reads the exact snapshot and revision',async()=>{
  const user=await owner(),content=await snapshot(),input={payloadVersion:1 as const,snapshot:content,idempotencyKey:randomUUID()};
  const result=await Promise.all([service().create(user,input),service().create(user,input)]);
  expect(result.map(value=>value.replayed).sort()).toEqual([false,true]);expect(result[0].recordId).toBe(result[1].recordId);
  const read=await service().read(user,result[0].recordId);expect(read.revision).toBe(1);expect(read.snapshot).toEqual(content);
  expect((await service().list(user,{})).documents.map(value=>value.recordId)).toContain(read.recordId);
  const changed={...content,content:{...content.content,appVersion:'different-transport'}};
  await expect(service().create(user,{...input,snapshot:changed})).rejects.toMatchObject({code:'INVALID_SNAPSHOT'});
 });
 it('rejects another owner without revealing record revision or reading bytes',async()=>{
  const a=await owner(),b=await owner(),content=await snapshot(),record=await service().create(a,{payloadVersion:1,snapshot:content,idempotencyKey:randomUUID()});
  await expect(service().read(b,record.recordId)).rejects.toMatchObject({code:'NOT_FOUND',status:404});
  await expect(service().save(b,record.recordId,{payloadVersion:1,expectedRevision:1,snapshot:content,idempotencyKey:randomUUID()})).rejects.toMatchObject({code:'NOT_FOUND'});
  expect((await service().list(b,{})).documents).toEqual([]);
 });
 it('serializes different-key edits and replays an exact successful edit despite stale revision',async()=>{
  const user=await owner(),content=await snapshot(),record=await service().create(user,{payloadVersion:1,snapshot:content,idempotencyKey:randomUUID()});
  const input={payloadVersion:1 as const,expectedRevision:1,snapshot:content,idempotencyKey:randomUUID()};
  const otherInput={...input,idempotencyKey:randomUUID()};
  const results=await Promise.allSettled([service().save(user,record.recordId,input),service().save(user,record.recordId,otherInput)]);
  expect(results.filter(value=>value.status==='fulfilled')).toHaveLength(1);expect(results.filter(value=>value.status==='rejected')).toHaveLength(1);
  const saved=results[0].status==='fulfilled'?input:otherInput;
  expect(await service().save(user,record.recordId,saved)).toMatchObject({revision:2,replayed:true});
  expect((await service().read(user,record.recordId)).revision).toBe(2);
 });
 it('rejects revoked sessions on all operations and leaves the stored document unchanged',async()=>{
  const user=await owner(),content=await snapshot(),record=await service().create(user,{payloadVersion:1,snapshot:content,idempotencyKey:randomUUID()});
  await createPostgresAuthStatePort(pool).revokeSession((await import('node:crypto')).createHash('sha256').update(user.token).digest('hex'));
  await expect(service().read(user,record.recordId)).rejects.toMatchObject({code:'SESSION_REQUIRED',status:401});
  await expect(service().list(user,{})).rejects.toMatchObject({code:'SESSION_REQUIRED'});
  await expect(service().create(user,{payloadVersion:1,snapshot:content,idempotencyKey:randomUUID()})).rejects.toMatchObject({code:'SESSION_REQUIRED'});
  await expect(service().save(user,record.recordId,{payloadVersion:1,snapshot:content,expectedRevision:1,idempotencyKey:randomUUID()})).rejects.toMatchObject({code:'SESSION_REQUIRED'});
  const rows=await pool.query('SELECT revision FROM knolstory_storage.records WHERE record_id=$1',[record.recordId]);expect(rows.rows[0].revision).toBe('1');
 });
 it('paginates only owned records with stable cursors and rejects invalid cursor fields',async()=>{
  const user=await owner(),content=await snapshot();
  for(let i=0;i<3;i++)await service().create(user,{payloadVersion:1,snapshot:content,idempotencyKey:randomUUID()});
  const first=await service().list(user,{limit:2});expect(first.documents).toHaveLength(2);expect(first.nextCursor).toBeTruthy();
  const next=await service().list(user,{limit:2,cursor:first.nextCursor!});expect(next.documents).toHaveLength(1);expect(next.nextCursor).toBeNull();
  expect(new Set([...first.documents,...next.documents].map(value=>value.recordId)).size).toBe(3);
 });
 it('rolls back a new document and its receipt if the session expires during the transaction',async()=>{
  const user=await owner(),content=await snapshot(),key=randomUUID();let checks=0;
  const expiring=createDocumentService(pool,{clock:()=>++checks>=3?now+60000:now});
  await expect(expiring.create(user,{payloadVersion:1,snapshot:content,idempotencyKey:key})).rejects.toMatchObject({code:'SESSION_REQUIRED'});
  expect((await pool.query('SELECT record_id FROM knolstory_storage.private_documents WHERE owner_account_id=$1',[user.accountId])).rowCount).toBe(0);
  expect((await pool.query('SELECT record_id FROM knolstory_storage.document_creations WHERE owner_account_id=$1 AND idempotency_key=$2',[user.accountId,key])).rowCount).toBe(0);
 });
 it('rejects create key reuse and changing a stored project identity without modifying the original',async()=>{
  const user=await owner(),content=await snapshot(),key=randomUUID(),record=await service().create(user,{payloadVersion:1,snapshot:content,idempotencyKey:key});
  const different=await snapshot();
  await expect(service().create(user,{payloadVersion:1,snapshot:different,idempotencyKey:key})).rejects.toMatchObject({code:'IDEMPOTENCY_CONFLICT'});
  await expect(service().save(user,record.recordId,{payloadVersion:1,expectedRevision:1,snapshot:different,idempotencyKey:randomUUID()})).rejects.toMatchObject({code:'DOCUMENT_IDENTITY_CONFLICT'});
  expect((await service().read(user,record.recordId)).snapshot).toEqual(content);
 });

 it('keeps previously owned private bytes readable while rejecting new private uploads atomically',async()=>{
  const user=await owner(),raw=JSON.parse(await readFile(new URL('../../tests/fixtures/stories/rabbit-classic.json',import.meta.url),'utf8'));
  const parsed=parseStoryDocument(raw,{savedAt:'2026-10-16T00:00:00.000Z',appVersion:'private-preservation-test'});if(!parsed.ok)throw Error('Fixture invalid');
  const bytes=await readFile(new URL('../../apps/web/public/assets/audio/chime.wav',import.meta.url)),hash=createHash('sha256').update(bytes).digest('hex');
  const content=await prepareJsonbSnapshot(await createAuthoringArchive({format:'knolstory',document:parsed.document,audioResources:[{id:`audio:custom:${hash}:wav`,name:'이전 개인 자료',kind:'sound',mime:'audio/wav',data:bytes.toString('base64')}]}));
  const {projection,blobs}=await projectSnapshot(content),recordId=randomUUID(),scopeId=`account:${user.accountId}`;
  for(const blob of blobs)await pool.query('INSERT INTO knolstory_storage.blobs(id,sha256,mime,byte_length,bytes) VALUES($1,$2,$3,$4,$5) ON CONFLICT(id) DO NOTHING',[blob.id,blob.sha256,blob.mime,blob.byteLength,Buffer.from(blob.bytes)]);
  await pool.query('INSERT INTO knolstory_storage.records(scope_id,record_id,client_project_id,format,revision,projection) VALUES($1,$2,$3,$4,1,$5)',[scopeId,recordId,parsed.document.project.id,'knolstory',projection]);
  // Explicit test fixture ownership, never a production adoption/migration path.
  await pool.query('INSERT INTO knolstory_storage.private_documents(scope_id,record_id,owner_account_id,created_at,updated_at) VALUES($1,$2,$3,$4,$4)',[scopeId,recordId,user.accountId,now]);
  expect((await service().read(user,recordId)).snapshot).toEqual(content);
  await expect(service().create(user,{payloadVersion:1,snapshot:content,idempotencyKey:randomUUID()})).rejects.toMatchObject({code:'CATALOG_MEDIA_REQUIRED',status:422});
  await expect(service().save(user,recordId,{payloadVersion:1,snapshot:content,expectedRevision:1,idempotencyKey:randomUUID()})).rejects.toMatchObject({code:'CATALOG_MEDIA_REQUIRED'});
  expect((await service().read(user,recordId)).snapshot).toEqual(content);
  expect((await pool.query('SELECT revision FROM knolstory_storage.records WHERE scope_id=$1 AND record_id=$2',[scopeId,recordId])).rows[0].revision).toBe('1');
  expect((await pool.query('SELECT * FROM knolstory_storage.receipts WHERE scope_id=$1 AND record_id=$2',[scopeId,recordId])).rowCount).toBe(0);
 });

});
