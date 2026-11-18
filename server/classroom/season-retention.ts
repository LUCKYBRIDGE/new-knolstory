import type {Pool} from 'pg';
import {retentionCutoff} from './season-calendar';

export async function purgePastClasswork(pool:Pick<Pool,'query'>,now:number){
 const database=await pool.query('SELECT (extract(epoch FROM clock_timestamp())*1000)::bigint AS now');
 const cutoff=Math.min(retentionCutoff(now),retentionCutoff(Number(database.rows[0].now)));
 const result=await pool.query(`WITH removed_tasks AS (
   DELETE FROM knolstory_class.assignments WHERE created_at<$1 RETURNING 1
  ), removed_missions AS (
   DELETE FROM knolstory_class.missions WHERE created_at<$1 RETURNING 1
  ) SELECT (SELECT count(*) FROM removed_tasks)+(SELECT count(*) FROM removed_missions) AS total`,[cutoff]);
 return Number(result.rows[0].total);
}

export function scheduleClassworkCleanup(pool:Pool){
 let running=false;
 async function run(){
  if(running)return;
  running=true;
  try{
   const total=await purgePastClasswork(pool,Date.now());
   if(total)console.info(JSON.stringify({event:'classroom_season_purged',total}));
  }catch{console.error(JSON.stringify({event:'classroom_season_purge_failed'}));}
  finally{running=false;}
 }
 function schedule(){
  const hour=60*60*1000;
  const timer=setTimeout(()=>{void run().finally(schedule);},hour-(Date.now()%hour));
  timer.unref();
 }
 void run().finally(schedule);
}
