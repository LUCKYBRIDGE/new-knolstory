import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {fenceRestoredSessions,validRestoreTarget} from './restore-session-fence.mjs';
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 let pool;
 try{
  const env=process.env,target=env.PGDATABASE;
  if(!validRestoreTarget(target)||env.KNOLSTORY_RESTORE_FENCE_CONFIRM!=='invalidate-restored-sessions'||!['db','knolstory-next-storage-test-db-1'].includes(env.PGHOST)||env.PGUSER!=='knolstory_next_storage_test'||!env.PGPASSWORD_FILE)throw Error('Invalid offline restore command.');
  const {default:pg}=await import('pg');pool=new pg.Pool({host:env.PGHOST,port:5432,database:target,user:env.PGUSER,password:readFileSync(env.PGPASSWORD_FILE,'utf8').trim(),max:1,connectionTimeoutMillis:5000,query_timeout:12000});
  console.log(JSON.stringify(await fenceRestoredSessions(pool,target)));
 }catch{console.error('Offline restore authentication invalidation failed; original service was not targeted.');process.exitCode=1;}
 finally{if(pool)await pool.end();}
}
