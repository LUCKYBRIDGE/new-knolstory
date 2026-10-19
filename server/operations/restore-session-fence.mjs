export const validRestoreTarget=value=>typeof value==='string'&&/^knolstory_next_restore_[a-f0-9]{32}$/.test(value);
const fail=()=>{throw Error('An offline isolated restore database is required.');};
/** Offline restore operation only. Never called by API startup or ordinary migrations. */
export async function fenceRestoredSessions(pool,target){
 if(!validRestoreTarget(target))fail();
 const client=await pool.connect();let begun=false,destroy=false;
 try{
  const database=await client.query('SELECT current_database() AS name');if(database.rows[0]?.name!==target)fail();
  const activity=await client.query("SELECT count(*)::integer AS clients FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid() AND backend_type='client backend'");
  if(activity.rows[0]?.clients!==0)fail();
  await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');begun=true;
  await client.query("SET LOCAL lock_timeout='3s'");await client.query("SET LOCAL statement_timeout='10s'");
  await client.query('LOCK TABLE knolstory_auth.sessions,knolstory_auth.flows IN ACCESS EXCLUSIVE MODE');
  const sessions=await client.query('UPDATE knolstory_auth.sessions SET revoked=true WHERE NOT revoked');
  const flows=await client.query('DELETE FROM knolstory_auth.flows');
  if(!Number.isSafeInteger(sessions.rowCount)||sessions.rowCount<0||!Number.isSafeInteger(flows.rowCount)||flows.rowCount<0)throw Error('Invalid restore maintenance result.');
  await client.query('COMMIT');begun=false;
  return {database:target,revokedSessions:sessions.rowCount,removedFlows:flows.rowCount};
 }catch(error){
  if(begun){try{await client.query('ROLLBACK');}catch(rollbackError){destroy=true;throw new AggregateError([error,rollbackError],'Restore auth invalidation and rollback failed.');}}
  throw error;
 }finally{if(destroy)client.release(true);else client.release();}
}
