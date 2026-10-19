import {readFileSync} from 'node:fs';
import pg from 'pg';
import {runStorageMigrations} from './runner';

/** Explicit operator command, never API startup. Operates only on the new production DB. */
async function main(){
 if(process.env.PGDATABASE!=='knolstory_next_production'||process.env.PGHOST!=='db')throw Error();
 const owner=readFileSync('/run/knolstory-production-owner/db-owner-password','utf8').trim();
 const application=readFileSync('/run/knolstory-production/db-password','utf8').trim();
 if(!/^[a-f0-9]{64}$/.test(owner)||!/^[a-f0-9]{64}$/.test(application))throw Error();
 const pool=new pg.Pool({host:'db',database:'knolstory_next_production',user:'knolstory_next_owner',password:owner,max:1,connectionTimeoutMillis:5000,query_timeout:15000});
 try{
  await runStorageMigrations(pool);
  const client=await pool.connect();
  try{
   await client.query('BEGIN');
   await client.query("SELECT pg_advisory_xact_lock(hashtextextended('knolstory:production-app-role',0))");
   await client.query("DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='knolstory_next_app') THEN CREATE ROLE knolstory_next_app LOGIN; END IF; END $$");
   // Both the fixed identifier and generated hexadecimal secret are validated above.
   await client.query(`ALTER ROLE knolstory_next_app WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD '${application}'`);
   await client.query('REVOKE ALL ON DATABASE knolstory_next_production FROM PUBLIC');
   await client.query('GRANT CONNECT ON DATABASE knolstory_next_production TO knolstory_next_app');
   await client.query('REVOKE CREATE ON SCHEMA public FROM PUBLIC');
   for(const schema of ['knolstory_storage','knolstory_auth']){
    await client.query(`GRANT USAGE ON SCHEMA ${schema} TO knolstory_next_app`);
    await client.query(`GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA ${schema} TO knolstory_next_app`);
    await client.query(`GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA ${schema} TO knolstory_next_app`);
   }
   await client.query('REVOKE INSERT,UPDATE,DELETE ON knolstory_storage.migrations FROM knolstory_next_app');
   await client.query('COMMIT');
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
  console.info('Production migrations and application role ready.');
 }finally{await pool.end();}
}
void main().catch(()=>{console.error('Production migration failed. No credential details are logged.');process.exitCode=1;});
