import type {Pool} from 'pg';

/** 2026-11-16 owner decision (Q-03): online trash keeps a work for 10 days, then deletes it for good. */
export const TRASH_RETENTION_MS=10*24*60*60*1000;
const BATCH=100;

/**
 * Permanently deletes online works that have stayed in the trash past the retention period.
 * Each work is removed under the same advisory lock that trash/restore take, and only if it is
 * still in the trash with an old enough deletion time, so a restore racing the purge always wins
 * or loses as a whole. Returns how many works were deleted.
 */
export async function purgeExpiredTrash(pool:Pool,now:number,retentionMs=TRASH_RETENTION_MS):Promise<number>{
 const cutoff=now-retentionMs;
 let purged=0;
 for(;;){
  const due=await pool.query('SELECT scope_id,record_id FROM knolstory_storage.private_documents WHERE deleted_at IS NOT NULL AND deleted_at<=$1 ORDER BY deleted_at,record_id LIMIT $2',[cutoff,BATCH]);
  if(!due.rows.length)return purged;
  let progressed=false;
  for(const row of due.rows as {scope_id:string;record_id:string}[]){
   const client=await pool.connect();
   let destroy=false;
   try{
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[JSON.stringify([row.scope_id,row.record_id])]);
    const still=await client.query('SELECT 1 FROM knolstory_storage.private_documents WHERE scope_id=$1 AND record_id=$2 AND deleted_at IS NOT NULL AND deleted_at<=$3 FOR UPDATE',[row.scope_id,row.record_id,cutoff]);
    if(still.rows.length){
     const key=[row.scope_id,row.record_id];
     await client.query('DELETE FROM knolstory_storage.document_state_commands WHERE scope_id=$1 AND record_id=$2',key);
     await client.query('DELETE FROM knolstory_storage.document_creations WHERE scope_id=$1 AND record_id=$2',key);
     await client.query('DELETE FROM knolstory_storage.private_documents WHERE scope_id=$1 AND record_id=$2',key);
     await client.query('DELETE FROM knolstory_storage.receipts WHERE scope_id=$1 AND record_id=$2',key);
     await client.query('DELETE FROM knolstory_storage.records WHERE scope_id=$1 AND record_id=$2',key);
     purged++;
    }
    await client.query('COMMIT');
    progressed=true;
   }catch(error){
    try{await client.query('ROLLBACK');}catch{destroy=true;}
    throw error;
   }finally{if(destroy)client.release(true);else client.release();}
  }
  if(!progressed)return purged;
 }
}

/** Runs the purge now and then hourly; failures are logged without the work's identity and retried next hour. */
export function scheduleTrashPurge(pool:Pool,options:{clock?:()=>number;log?:(message:string)=>void;intervalMs?:number}={}):()=>void{
 const clock=options.clock??Date.now,log=options.log??(message=>console.info(message));
 let running=false;
 const run=async()=>{
  if(running)return;running=true;
  try{const count=await purgeExpiredTrash(pool,clock());if(count)log(JSON.stringify({event:'trash_purged',count}));}
  catch{log(JSON.stringify({event:'trash_purge_failed'}));}
  finally{running=false;}
 };
 void run();
 const timer=setInterval(()=>void run(),options.intervalMs??60*60*1000);
 timer.unref();
 return ()=>clearInterval(timer);
}
