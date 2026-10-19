import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import type {SqlPool} from '../storage/postgres-save-port';

export const STORAGE_MIGRATIONS=['001-storage.sql','002-immutable-blobs.sql','003-identity-links.sql','004-auth-state.sql','005-session-rotation.sql','006-private-documents.sql','007-document-trash.sql'] as const;

/** Only dedicated Next databases and the fixed isolated schema are supported. */
export async function runStorageMigrations(pool:SqlPool):Promise<void> {
 const migrations=await Promise.all(STORAGE_MIGRATIONS.map(async(name,index)=>{
  const sql=await readFile(new URL(name,import.meta.url),'utf8');
  return {version:index+1,sql,checksum:createHash('sha256').update(sql).digest('hex')};
 }));
 const client=await pool.connect();
 let destroy=false;
 try {
  const database=await client.query('SELECT current_database() AS name');
  if(typeof database.rows[0]?.name!=='string'||!/^knolstory_next(?:_[a-z0-9_]+)?$/.test(database.rows[0].name))throw Error('A dedicated knolstory_next database is required.');
  await client.query('BEGIN');
  await client.query("SELECT pg_advisory_xact_lock(hashtextextended('knolstory_storage:migrations',0))");
  await client.query('CREATE SCHEMA IF NOT EXISTS knolstory_storage');
  await client.query('CREATE TABLE IF NOT EXISTS knolstory_storage.migrations(version integer PRIMARY KEY,sha256 text NOT NULL,applied_at timestamptz NOT NULL DEFAULT now())');
  const journal=await client.query('SELECT version,sha256 FROM knolstory_storage.migrations ORDER BY version');
  if(journal.rows.some((row,index)=>row.version!==index+1||row.version>migrations.length))throw Error('Unsupported storage migration version.');
  for(const migration of migrations) {
   const existing=journal.rows.find(row=>row.version===migration.version);
   if(existing&&existing.sha256!==migration.checksum)throw Error('Storage migration checksum mismatch.');
   if(!existing) {
    await client.query(migration.sql);
    await client.query('INSERT INTO knolstory_storage.migrations(version,sha256) VALUES($1,$2)',[migration.version,migration.checksum]);
   }
  }
  await client.query('COMMIT');
 }catch(error){
  try{await client.query('ROLLBACK');}catch(rollbackError){
   destroy=true;
   throw new AggregateError([error,rollbackError],'Migration and rollback failed.');
  }
  throw error;
 }finally{if(destroy)client.release(true);else client.release();}
}
