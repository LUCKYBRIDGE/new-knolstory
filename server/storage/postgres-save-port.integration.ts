import {Pool} from 'pg';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';
import {createAuthoringArchive, prepareJsonbSnapshot} from '../../packages/compatibility/src/authoring-archive';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {parseStoryDocument} from '@knolstory/story-domain';
import {newShortStory} from '../../packages/compatibility/src/shortstory';
import {saveExisting, type SaveRequest} from './save-existing';
import {createPostgresSavePort, loadStoredSnapshot} from './postgres-save-port';
import {runStorageMigrations} from '../migrations/runner';
import {projectSnapshot} from './snapshot-projection';

const pool = new Pool({max:8});
const allow = async () => true;
const policies = {authorize:allow,assertCatalogAllowed:allow};
const port = () => createPostgresSavePort(pool,{authorize:allow});
async function request(format:'knolstory'|'shortstory'='knolstory',audio=false):Promise<SaveRequest> {
 const raw=JSON.parse(await readFile(new URL('../../tests/fixtures/stories/rabbit-classic.json',import.meta.url),'utf8'));
 const parsed=parseStoryDocument(raw,{savedAt:'2026-10-15T00:00:00.000Z',appVersion:'integration'});
 if(!parsed.ok)throw Error(JSON.stringify(parsed.issues));
 const bytes=audio?await readFile(new URL('../../apps/web/public/assets/audio/chime.wav',import.meta.url)):null;
 const hash=bytes?createHash('sha256').update(bytes).digest('hex'):'';
 const audioResources=bytes?[{id:`audio:custom:${hash}:wav`,name:'개인 소장 종소리',kind:'sound' as const,mime:'audio/wav',data:bytes.toString('base64'),provenance:{provider:'personal',source:'recorded',author:'이전 작성자',license:'private',commercialUse:'unknown' as const,redistribution:'restricted' as const,attribution:'보존 자료',sourceSha256:hash}}]:[];
 const content = format==='knolstory'
  ? await createAuthoringArchive({format,document:parsed.document,audioResources})
  : await createAuthoringArchive({format,project:newShortStory()});
 return {scopeId:crypto.randomUUID(),recordId:crypto.randomUUID(),idempotencyKey:'save-a',expectedRevision:3,snapshot:await prepareJsonbSnapshot(content)};
}
async function seed(input:SaveRequest) {
 const {projection,blobs} = await projectSnapshot(input.snapshot);
 for(const blob of blobs)await pool.query('INSERT INTO knolstory_storage.blobs(id,sha256,mime,byte_length,bytes) VALUES($1,$2,$3,$4,$5) ON CONFLICT(id) DO NOTHING',[blob.id,blob.sha256,blob.mime,blob.byteLength,Buffer.from(blob.bytes)]);
 const content = input.snapshot.content;
 const projectId = content.format==='knolstory'?content.document.project.id:content.project.id;
 await pool.query('INSERT INTO knolstory_storage.records(scope_id,record_id,client_project_id,format,revision,projection) VALUES($1,$2,$3,$4,$5,$6)',[input.scopeId,input.recordId,projectId,content.format,3,projection]);
}
async function counts(input:SaveRequest) {
 const result = await pool.query('SELECT revision,(SELECT count(*)::integer FROM knolstory_storage.receipts WHERE scope_id=$1 AND record_id=$2) AS receipts FROM knolstory_storage.records WHERE scope_id=$1 AND record_id=$2',[input.scopeId,input.recordId]);
 return result.rows;
}
describe('real PostgreSQL existing-record transactions',()=>{
 beforeAll(async()=>{await runStorageMigrations(pool);});
 afterAll(async()=>{await pool.end();});
 it('migrates idempotently and verifies immutable checksums',async()=>{
  await runStorageMigrations(pool);
  const before=await pool.query('SELECT sha256 FROM knolstory_storage.migrations WHERE version=1');
  await pool.query("UPDATE knolstory_storage.migrations SET sha256=repeat('0',64) WHERE version=1");
  await expect(runStorageMigrations(pool)).rejects.toThrow('checksum');
  await pool.query('UPDATE knolstory_storage.migrations SET sha256=$1 WHERE version=1',[before.rows[0].sha256]);
  await runStorageMigrations(pool);
 });
 it('serializes independent clients: identical retries save once and replay stale revision',async()=>{
  const input=await request();await seed(input);
  const result=await Promise.all([saveExisting(input,policies,port()),saveExisting(input,policies,port())]);
  expect(result.map(value=>value.status).sort()).toEqual(['replayed','saved']);
  expect(await saveExisting(input,policies,port())).toMatchObject({status:'replayed'});
  expect(await counts(input)).toEqual([{revision:'4',receipts:1}]);
 });
 it('accepts one different key and rejects the stale competing revision',async()=>{
  const input=await request();await seed(input);
  const result=await Promise.all([saveExisting(input,policies,port()),saveExisting({...input,idempotencyKey:'second'},policies,port())]);
  expect(result.map(value=>value.status).sort()).toEqual(['revision-conflict','saved']);
 });
 it('conflicts on changed content or transport metadata with the same key',async()=>{
  const input=await request();await seed(input);await saveExisting(input,policies,port());
  const changed=structuredClone(input);
  if(changed.snapshot.content.format==='knolstory') changed.snapshot.content.document.savedAt='2026-10-15T01:00:00.000Z';
  expect(await saveExisting(changed,policies,port())).toEqual({status:'idempotency-conflict'});
  expect(await saveExisting({...input,expectedRevision:4},policies,port())).toEqual({status:'idempotency-conflict'});
 });
 it('isolates scope, record and receipt keys',async()=>{
  const input=await request();const others=[input,{...input,scopeId:crypto.randomUUID()},{...input,recordId:crypto.randomUUID()}];
  for(const value of others)await seed(value);
  expect((await Promise.all(others.map(value=>saveExisting(value,policies,port())))).map(value=>value.status)).toEqual(['saved','saved','saved']);
 });
 it.each(['knolstory','shortstory'] as const)('preserves exact %s content through JSONB',async format=>{
  const input=await request(format);await seed(input);
  await saveExisting(input,policies,port());
  expect(await loadStoredSnapshot(pool,input,allow)).toEqual(input.snapshot);
 });
 it('rolls back record and receipt when the real receipt insert fails',async()=>{
  const input=await request('knolstory',true);
  const old=await request();await seed({...old,scopeId:input.scopeId,recordId:input.recordId});
  const blobsBefore=await pool.query('SELECT count(*) AS count FROM knolstory_storage.blobs');
  await pool.query("ALTER TABLE knolstory_storage.receipts ADD CONSTRAINT integration_reject_receipt CHECK (idempotency_key <> 'force-fail')");
  try {await expect(saveExisting({...input,idempotencyKey:'force-fail'},policies,port())).rejects.toThrow();}
  finally {await pool.query('ALTER TABLE knolstory_storage.receipts DROP CONSTRAINT integration_reject_receipt');}
  expect(await counts(input)).toEqual([{revision:'3',receipts:0}]);
  expect(await pool.query('SELECT count(*) AS count FROM knolstory_storage.blobs')).toMatchObject({rows:blobsBefore.rows});
  expect(await loadStoredSnapshot(pool,input,allow)).toEqual(old.snapshot);
 });
 it('preserves prior private bytes and metadata internally without publishing them',async()=>{
  const input=await request('knolstory',true);await seed(input);
  await saveExisting(input,policies,port());
  expect(await loadStoredSnapshot(pool,input,allow)).toEqual(input.snapshot);
  const rows=await pool.query('SELECT projection FROM knolstory_storage.records WHERE scope_id=$1 AND record_id=$2',[input.scopeId,input.recordId]);
  expect(JSON.stringify(rows.rows[0])).not.toContain('data\":');
  await expect(pool.query('UPDATE knolstory_storage.blobs SET mime=mime')).rejects.toThrow('immutable');
 });
 it('rejects corrupted client project identity on load',async()=>{
  const input=await request();await seed(input);
  await pool.query('UPDATE knolstory_storage.records SET client_project_id=$3 WHERE scope_id=$1 AND record_id=$2',[input.scopeId,input.recordId,'corrupt-id']);
  await expect(loadStoredSnapshot(pool,input,allow)).rejects.toThrow('identity');
 });
 it('never creates missing records',async()=>{
  const input=await request();expect(await saveExisting(input,policies,port())).toEqual({status:'record-not-found'});
  expect(await counts(input)).toEqual([]);
 });
 it('checks literal transaction authorization before snapshot or receipt reads',async()=>{
  const input=await request();await seed(input);
  for(const authorize of [async()=>false,async()=>{throw Error('revoked');}]) {
   await expect(saveExisting(input,policies,createPostgresSavePort(pool,{authorize}))).rejects.toThrow();
  }
  expect(await counts(input)).toEqual([{revision:'3',receipts:0}]);
 });
 it('rejects malformed snapshots before connecting',async()=>{
  let connections=0;
  const forbidden={connect:async()=>{connections++;throw Error('unexpected connection');}};
  const input=await request();input.snapshot.contentSha256='invalid';
  await expect(saveExisting(input,policies,createPostgresSavePort(forbidden,{authorize:allow}))).rejects.toThrow();
  expect(connections).toBe(0);
 });
 it('rejects mixed targets within one callback and rolls back',async()=>{
  const input=await request();await seed(input);
  await expect(port().transaction(async tx=>{await tx.findRecord(input);await tx.findReceipt({...input,recordId:'other'});})).rejects.toThrow('one target');
 });
});
