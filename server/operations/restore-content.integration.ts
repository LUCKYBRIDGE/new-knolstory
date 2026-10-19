import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {Pool} from 'pg';
import {afterAll,describe,it,expect} from 'vitest';
import {loadStoredSnapshot} from '../storage/postgres-save-port';
import {STORAGE_MIGRATIONS} from '../migrations/runner';
const database=process.env.PGDATABASE;
if(!database||!/^knolstory_next_restore_[a-f0-9]{32}$/.test(database))throw Error('Only a new isolated restore database is supported.');
const pool=new Pool({max:2}),source=new Pool({database:'knolstory_next_storage_test',max:2});
const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
afterAll(async()=>{await Promise.all([pool.end(),source.end()]);});
async function readOutcomes(connection:Pool){
 const records=await connection.query('SELECT scope_id,record_id,projection,client_project_id,format,revision FROM knolstory_storage.records ORDER BY scope_id,record_id');
 const outcomes:Record<string,Readonly<{rawHash:string;status:'valid'|'invalid';fingerprint:string}>>={};
 let valid=0,invalid=0,knolstory=0,shortstory=0,privateResources=0;
 for(const record of records.rows){
  const key=hash(JSON.stringify([record.scope_id,record.record_id])),rawHash=hash(JSON.stringify(record));
  try{
   const value=await loadStoredSnapshot(connection,{scopeId:record.scope_id,recordId:record.record_id,idempotencyKey:'restore-read'},async()=>true);
   if(!value)throw new TypeError('A restored record unexpectedly disappeared.');
   outcomes[key]={rawHash,status:'valid',fingerprint:value.contentSha256};
   valid++;if(value.content.format==='knolstory'){knolstory++;privateResources+=value.content.audioResources.length;}else shortstory++;
  }catch(error){
   // Only an ordinary validator error can represent a pre-existing invalid fixture.
   // Driver errors, missing records and programming exception classes fail outright.
   if(!(error instanceof Error)||error.name!=='Error'||'code' in error)throw Error('Unexpected database/read failure during restore probe.');
   outcomes[key]={rawHash,status:'invalid',fingerprint:hash(error.name+'\0'+error.message)};invalid++;
  }
 }
 return {outcomes,summary:{records:records.rows.length,valid,invalid,knolstory,shortstory,privateResources}};
}
describe('restored application content',()=>{
 it('preserves the migration journal against the current immutable sources',async()=>{
  const journal=await pool.query('SELECT version,sha256 FROM knolstory_storage.migrations ORDER BY version');expect(journal.rows).toHaveLength(STORAGE_MIGRATIONS.length);
  for(const [index,name] of STORAGE_MIGRATIONS.entries()){
   const bytes=await readFile(new URL(`../migrations/${name}`,import.meta.url));expect(journal.rows[index]).toEqual({version:index+1,sha256:createHash('sha256').update(bytes).digest('hex')});
  }
 });
 it('matches every source record and read outcome, including pre-existing invalid fixtures',async()=>{
  const original=await readOutcomes(source),restored=await readOutcomes(pool);
  expect(restored.outcomes).toEqual(original.outcomes);expect(restored.summary).toEqual(original.summary);
  expect(restored.summary.valid).toBeGreaterThan(0);expect(restored.summary.knolstory).toBeGreaterThan(0);expect(restored.summary.shortstory).toBeGreaterThan(0);expect(restored.summary.privateResources).toBeGreaterThan(0);
  console.info(JSON.stringify({restoreValidation:restored.summary,perRecordSourceAndRestoreEqual:true,unexpectedReadErrorsRejected:true,scope:'Actual shared validation compared record by record to unchanged source. Only counts are printed, not document or error payloads.'}));
 });
 it('retains the exact immutable blob trigger after restoration',async()=>{
  const client=await pool.connect();try{
   await client.query('BEGIN');
   await expect(client.query("UPDATE knolstory_storage.blobs SET bytes=bytes WHERE id=(SELECT id FROM knolstory_storage.blobs LIMIT 1)")).rejects.toMatchObject({code:'P0001',message:'Stored audio blobs are immutable'});
  }finally{await client.query('ROLLBACK');client.release();}
 });
});
