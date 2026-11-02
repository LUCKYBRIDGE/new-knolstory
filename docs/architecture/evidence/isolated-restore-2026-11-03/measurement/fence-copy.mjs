/** Runs only in a portless runner sharing the fresh network-none restore namespace. */
import {createRequire} from 'node:module';
import {fenceRestoredSessions,validRestoreTarget} from '/audit/restore-session-fence.mjs';
const require=createRequire('/app/main.mjs');
const {Pool}=require('pg');
const target=process.env.PGDATABASE;
if(!validRestoreTarget(target))throw Error('A fresh isolated restore name is required.');
const pool=new Pool({host:'127.0.0.1',port:5432,database:target,user:'postgres',max:1,connectionTimeoutMillis:5000,query_timeout:12000});
try{
 const counts=async()=>{
  const result=await pool.query('SELECT (SELECT count(*)::integer FROM knolstory_auth.sessions WHERE NOT revoked) AS sessions,(SELECT count(*)::integer FROM knolstory_auth.flows) AS flows');
  return result.rows[0];
 };
 const before=await counts();
 const first=await fenceRestoredSessions(pool,target);
 const after=await counts();
 if(first.revokedSessions!==before.sessions||first.removedFlows!==before.flows||after.sessions!==0||after.flows!==0)throw Error('Restored authentication invalidation did not match the actual copy.');
 const again=await fenceRestoredSessions(pool,target);
 if(again.revokedSessions!==0||again.removedFlows!==0)throw Error('Repeated restored authentication invalidation changed state.');
 console.log(JSON.stringify({restoreSessionFence:{before,after,revokedSessions:first.revokedSessions,removedFlows:first.removedFlows,idempotent:true,helper:'unchanged canonical fenceRestoredSessions'},noTokensOrAccountIdentifiersPublished:true,noApiOrProviderStarted:true}));
}catch{
 // Driver errors may contain private identifiers. Keep public output bounded.
 throw Error('Isolated restored authentication probe failed; no production connection was configured.');
}finally{await pool.end();}
