import {createHash,randomUUID} from 'node:crypto';
import {spawn,execFileSync} from 'node:child_process';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {openSync,closeSync,statSync} from 'node:fs';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
const container='knolstory-next-storage-test-db-1',source='knolstory_next_storage_test',user=source;
const fail=()=>{throw Error('Isolated Next backup verification failed. Original database and private backup are preserved.');};
export function checkedRestoreName(value){if(typeof value!=='string'||!/^knolstory_next_restore_[a-f0-9]{32}$/.test(value))fail();return value;}
export function checkedSnapshotId(value){if(typeof value!=='string'||! /^[A-F0-9]{8}-[A-F0-9]{8}-[0-9]+$/.test(value))fail();return value;}
function checkedTable(value){if(typeof value!=='string'||! /^knolstory_(auth|storage)\.[a-z_][a-z0-9_]*$/.test(value))fail();return value;}
export function tableInventorySql(tables){
 if(!Array.isArray(tables)||!tables.length)fail();
 const parts=tables.map(value=>{const table=checkedTable(value);return `SELECT jsonb_build_object('table','${table}','rows',count(*),'sha256',encode(sha256(convert_to(COALESCE(string_agg(row_hash,'' ORDER BY row_hash),''),'UTF8')),'hex')) AS value FROM (SELECT encode(sha256(convert_to(to_jsonb(t)::text,'UTF8')),'hex') AS row_hash FROM ${table} t) hashed`;});
 return `SELECT jsonb_agg(value ORDER BY value->>'table')::text FROM (${parts.join(' UNION ALL ')}) inventory;`;
}
export function compareInventories(a,b){if(JSON.stringify(a)!==JSON.stringify(b))fail();return {equal:true};}
const schemas="n.nspname IN ('knolstory_auth','knolstory_storage')";
const schemaSql=`SELECT jsonb_build_object(
 'columns',(SELECT COALESCE(jsonb_agg(jsonb_build_array(n.nspname,c.relname,a.attname,format_type(a.atttypid,a.atttypmod),a.attnotnull,pg_get_expr(d.adbin,d.adrelid)) ORDER BY n.nspname,c.relname,a.attnum),'[]') FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace LEFT JOIN pg_attrdef d ON d.adrelid=c.oid AND d.adnum=a.attnum WHERE ${schemas} AND c.relkind IN ('r','p') AND a.attnum>0 AND NOT a.attisdropped),
 'constraints',(SELECT COALESCE(jsonb_agg(jsonb_build_array(n.nspname,c.relname,k.conname,pg_get_constraintdef(k.oid,true),k.convalidated) ORDER BY n.nspname,c.relname,k.conname),'[]') FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE ${schemas}),
 'indexes',(SELECT COALESCE(jsonb_agg(jsonb_build_array(n.nspname,c.relname,pg_get_indexdef(i.indexrelid)) ORDER BY n.nspname,c.relname,i.indexrelid::regclass::text),'[]') FROM pg_index i JOIN pg_class c ON c.oid=i.indrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE ${schemas}),
 'functions',(SELECT COALESCE(jsonb_agg(pg_get_functiondef(p.oid) ORDER BY n.nspname,p.proname,pg_get_function_identity_arguments(p.oid)),'[]') FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE ${schemas}),
 'triggers',(SELECT COALESCE(jsonb_agg(pg_get_triggerdef(t.oid) ORDER BY n.nspname,c.relname,t.tgname),'[]') FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE ${schemas} AND NOT t.tgisinternal),
 'views',(SELECT COALESCE(jsonb_agg(jsonb_build_array(n.nspname,c.relname,pg_get_viewdef(c.oid)) ORDER BY n.nspname,c.relname),'[]') FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE ${schemas} AND c.relkind IN ('v','m')),
 'sequences',(SELECT COALESCE(jsonb_agg(to_jsonb(s) ORDER BY s.schemaname,s.sequencename),'[]') FROM pg_sequences s WHERE s.schemaname IN ('knolstory_auth','knolstory_storage'))
)::text;`;
function psql(database,sql){
 if(database!==source)checkedRestoreName(database);
 return execFileSync('docker',['exec','-i',container,'psql','-XqAt','-U',user,'-d',database,'-v','ON_ERROR_STOP=1'],{input:sql,encoding:'utf8',timeout:45000,maxBuffer:8*1024*1024}).trim();
}
function query(database,sql,snapshot){return psql(database,`BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;${snapshot?`SET TRANSACTION SNAPSHOT '${checkedSnapshotId(snapshot)}';`:''}SET TIME ZONE 'UTC';${sql}COMMIT;`);}
function inventory(database,snapshot){
 const tables=JSON.parse(query(database,"SELECT json_agg(schemaname||'.'||tablename ORDER BY schemaname,tablename)::text FROM pg_tables WHERE schemaname IN ('knolstory_auth','knolstory_storage');",snapshot));
 return {tables:JSON.parse(query(database,tableInventorySql(tables),snapshot)),schema:JSON.parse(query(database,schemaSql,snapshot))};
}
const closedSnapshotChildren=new WeakSet();
/** Bound graceful shutdown, escalation and reap; never leave a caller waiting forever. */
export async function closeSnapshotChild(child,{graceMs=5000,terminateMs=1000,reapMs=1000}={}){
 for(const value of [graceMs,terminateMs,reapMs])if(!Number.isSafeInteger(value)||value<=0)throw Error('Invalid snapshot close deadline.');
 if(child.closed||closedSnapshotChildren.has(child)){if(child.signalCode||(child.exitCode!==null&&child.exitCode!==0))throw Error('Snapshot exporter failed.');return;}
 return new Promise((resolve,reject)=>{
  let timer,settled=false,forced=false;
  const cleanup=()=>{clearTimeout(timer);child.off('close',closed);child.off('error',broken);child.stdin.off('error',broken);};
  const finish=(error,reaped)=>{
   if(settled){if(reaped)cleanup();return;}
   settled=true;clearTimeout(timer);
   // Preserve error guards until an unreaped child eventually closes. Otherwise
   // a delayed EPIPE/error event could become an unhandled process exception.
   if(reaped)cleanup();
   if(error)reject(error);else resolve();
  };
  const closed=(code,signal)=>{closedSnapshotChildren.add(child);finish(forced||code!==0||signal?Error('Snapshot exporter did not close cleanly.'):undefined,true);};
  const signal=name=>{try{child.kill(name);}catch{ /* Reap deadline still bounds an unkillable child. */ }};
  const kill=()=>{signal('SIGKILL');if(!settled)timer=setTimeout(()=>finish(Error('Snapshot exporter reap timed out.'),false),reapMs);};
  const terminate=()=>{if(forced)return;forced=true;clearTimeout(timer);signal('SIGTERM');if(!settled)timer=setTimeout(kill,terminateMs);};
  const broken=()=>{if(!settled)terminate();};
  child.on('close',closed);child.on('error',broken);child.stdin.on('error',broken);
  timer=setTimeout(terminate,graceMs);
  if(child.exitCode===null&&child.signalCode===null){try{child.stdin.end('ROLLBACK;\n');}catch{broken();}}
 });
}
async function exportSnapshot(){
 const child=spawn('docker',['exec','-i',container,'psql','-XqAt','-U',user,'-d',source,'-v','ON_ERROR_STOP=1'],{stdio:['pipe','pipe','pipe']});
 child.stderr.resume();let text='';
 // Keep guards installed between snapshot export and bounded final close.
 const ignore=()=>{};child.on('error',ignore);child.stdin.on('error',ignore);
 child.once('close',()=>{closedSnapshotChildren.add(child);child.off('error',ignore);child.stdin.off('error',ignore);});
 try{
  const snapshot=await new Promise((resolve,reject)=>{
   const cleanup=()=>{clearTimeout(timer);child.off('error',stop);child.off('exit',stop);child.stdin.off('error',stop);child.stdout.off('data',data);};
   const stop=()=>{cleanup();reject(Error('Snapshot exporter stopped.'));};
   const data=bytes=>{text+=bytes.toString();const found=text.split(/\r?\n/).find(line=>/^[A-F0-9]{8}-[A-F0-9]{8}-[0-9]+$/.test(line));if(found){cleanup();resolve(checkedSnapshotId(found));}};
   const timer=setTimeout(()=>{cleanup();reject(Error('Snapshot export timed out.'));},10000);
   child.once('error',stop);child.once('exit',stop);child.stdin.once('error',stop);child.stdout.on('data',data);
   // If the Docker client is interrupted, PostgreSQL also bounds the remote
   // transaction lifetime instead of retaining an exported snapshot indefinitely.
   try{child.stdin.write("SET idle_in_transaction_session_timeout='5min'; BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY; SELECT pg_export_snapshot();\n");}catch{stop();}
  });
  child.stdout.resume();
  return {snapshot,close:()=>closeSnapshotChild(child)};
 }catch(error){
  try{await closeSnapshotChild(child);}catch{ /* Preserve the original export failure. */ }
  throw error;
 }
}
/** Produces private artifacts outside the checkout; never restores over a named database. */
export async function verifyBackupRestore(){
 const run=new Date().toISOString().replace(/[:.]/g,'-')+'-'+randomUUID().slice(0,8),target=checkedRestoreName('knolstory_next_restore_'+randomUUID().replaceAll('-',''));
 const directory=join(homedir(),'.local','share','knolstory-next-storage-test','backups',run);
 await mkdir(directory,{recursive:true,mode:0o700});if(statSync(directory).mode&0o077)fail();
 const archive=join(directory,'database.dump'),snapshot=await exportSnapshot();let baseline;
 try{
  baseline=inventory(source,snapshot.snapshot);
  const fd=openSync(archive,'wx',0o600);try{execFileSync('docker',['exec',container,'pg_dump','-U',user,'--format=custom','--lock-wait-timeout=5s','--snapshot='+snapshot.snapshot,source],{stdio:['ignore',fd,'pipe'],timeout:45000});}finally{closeSync(fd);}
 }finally{await snapshot.close();}
 const bytes=statSync(archive).size;if(bytes<1||(statSync(archive).mode&0o077))fail();
 const archiveSha256=createHash('sha256').update(await readFile(archive)).digest('hex');
 // createdb fails if target exists. No --clean, --create, DROP or source restore.
 execFileSync('docker',['exec',container,'createdb','-U',user,'--template=template0','--encoding=UTF8',target],{timeout:10000,stdio:['ignore','pipe','pipe']});
 const fd=openSync(archive,'r');try{execFileSync('docker',['exec','-i',container,'pg_restore','-U',user,'--dbname='+target,'--single-transaction','--exit-on-error','--no-owner','--no-privileges'],{stdio:[fd,'pipe','pipe'],timeout:45000});}finally{closeSync(fd);}
 const restored=inventory(target);compareInventories(baseline,restored);
 await writeFile(join(directory,'inventory.json'),JSON.stringify({source,target,baseline,restored},null,2)+'\n',{mode:0o600,flag:'wx'});
 const report={checkedAt:new Date().toISOString(),source,target,archiveBytes:bytes,archiveSha256,archivePermissions:'0600',directoryPermissions:'0700',sameExportedSnapshot:true,equal:true,tables:baseline.tables,schemaObjectCounts:Object.fromEntries(Object.entries(baseline.schema).map(([key,value])=>[key,value.length])),retained:true,scope:'Logical application database in isolated Next test PostgreSQL16 only. Roles/grants, secrets, catalog files, runtime, off-host durability and production release are separate.'};
 const evidence=join('docs','architecture','evidence','backup-restore-2026-10-16');await mkdir(evidence,{recursive:true});await writeFile(join(evidence,`restore-${run}.json`),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({equal:true,target,tables:baseline.tables.length,archiveBytes:bytes,run}));return report;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){verifyBackupRestore().catch(()=>{console.error('Isolated backup/restore verification failed; source and private artifacts are preserved.');process.exitCode=1;});}
