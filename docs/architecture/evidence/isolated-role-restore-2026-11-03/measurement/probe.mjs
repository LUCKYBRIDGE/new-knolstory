/** Actual pg login/privilege probes, only in the validated isolated restore namespace. */
import pg from 'pg';
import {readFile} from 'node:fs/promises';
import {lookup} from 'node:dns/promises';
const key=async name=>(await readFile('/run/knolstory-production/'+name,'utf8')).trim();
const connection=password=>({host:'db',database:'knolstory_next_production',user:'knolstory_next_app',password,max:1,connectionTimeoutMillis:3000,query_timeout:5000});
const expectedDenied={journalInsert:"INSERT INTO knolstory_storage.migrations(version,sha256) SELECT 9999,repeat('0',64) WHERE false",journalColumnUpdate:'UPDATE knolstory_storage.migrations SET sha256=sha256 WHERE false',journalDelete:'DELETE FROM knolstory_storage.migrations WHERE false',schemaCreate:'CREATE SCHEMA knol_role_probe',tableCreate:'CREATE TABLE knolstory_storage.knol_role_probe(id integer)'};
async function main(){
 if(!/^[a-f0-9]{32}$/.test(process.env.KNOLSTORY_ROLE_RESTORE_RUN_ID??''))throw Error('Isolated run marker required.');
 if((await lookup('db')).address!=='127.0.0.1')throw Error('Isolated loopback alias required.');
 const password=await key('db-password'),pool=new pg.Pool(connection(password));let poolFault=false;
 pool.on('error',()=>{poolFault=true;});
 const denied={};let identity,journalRows,dataUpdate;
 try{
  identity=(await pool.query('SELECT current_user AS role,current_database() AS database')).rows[0];
  journalRows=Number((await pool.query('SELECT count(*) AS n FROM knolstory_storage.migrations')).rows[0].n);
  for(const [name,sql]of Object.entries(expectedDenied)){
   const client=await pool.connect();
   try{await client.query('BEGIN');try{await client.query(sql);denied[name]='ALLOWED';}catch(error){denied[name]=error.code??'UNKNOWN';}finally{await client.query('ROLLBACK');}}
   finally{client.release();}
  }
  const client=await pool.connect();
  try{await client.query('BEGIN');dataUpdate=await client.query('UPDATE knolstory_storage.records SET revision=revision WHERE false');await client.query('ROLLBACK');}finally{client.release();}
 }finally{await pool.end();}
 const wrong=new pg.Pool(connection(password[0]==='0'?'f'.repeat(64):'0'.repeat(64)));let wrongCode='ALLOWED';
 try{await wrong.query('SELECT 1');}catch(error){wrongCode=error.code??'UNKNOWN';}finally{await wrong.end();}
 const report={isolatedRunMarkerChecked:true,loopbackAliasChecked:true,authenticatedApp:identity.role==='knolstory_next_app',expectedDatabase:identity.database==='knolstory_next_production',journalRows,denied,wrongPasswordCode:wrongCode,dataNoopUpdateAllowed:dataUpdate.rowCount===0,poolFault};
 if(!report.authenticatedApp||!report.expectedDatabase||journalRows!==7||Object.values(denied).some(code=>code!=='42501')||wrongCode!=='28P01'||poolFault)throw Error('Isolated role proof mismatch.');
 console.log(JSON.stringify(report));
}
void main().catch(()=>{console.error('Isolated role probe failed; no private diagnostics published.');process.exitCode=1;});
