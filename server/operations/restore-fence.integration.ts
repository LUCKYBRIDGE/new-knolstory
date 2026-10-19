import {createServer,type Server} from 'node:http';
import {randomBytes} from 'node:crypto';
import {Pool} from 'pg';
import {afterAll,describe,it,expect} from 'vitest';
import {createAuthService} from '../http/auth-service';
import {createAuthStateService,authCookieNames} from '../auth/auth-state';
import {createPostgresAuthStatePort} from '../auth/postgres-auth-state';
import {fenceRestoredSessions} from './restore-session-fence.mjs';
import {tableInventorySql} from './backup-restore.mjs';
const target=process.env.PGDATABASE;
if(!target||!/^knolstory_next_restore_[a-f0-9]{32}$/.test(target))throw Error('Only an offline isolated restore is allowed.');
const pool=new Pool({max:1});let server:Server;
afterAll(async()=>{if(server)await new Promise<void>(resolve=>{server.closeAllConnections();server.close(()=>resolve());});await pool.end();});
const preserved=['knolstory_auth.accounts','knolstory_auth.identities','knolstory_storage.records','knolstory_storage.blobs','knolstory_storage.receipts','knolstory_storage.private_documents','knolstory_storage.document_creations','knolstory_storage.migrations'];
const inventory=async()=>{const raw=(await pool.query(tableInventorySql(preserved))).rows[0]?.jsonb_agg;if(typeof raw!=='string')throw Error('Missing preservation inventory.');const value=JSON.parse(raw);if(!Array.isArray(value)||value.length!==preserved.length)throw Error('Invalid preservation inventory.');return value;};
describe('offline restored authentication invalidation',()=>{
 it('rejects historical cookies/flows while preserving every account, identity and authored record',async()=>{
  let handler:ReturnType<typeof createAuthService>;
  server=createServer((req,res)=>{void handler(req,res);});await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin=`http://127.0.0.1:${(server.address() as {port:number}).port}`;
  const config={origin,flowTtlMs:600000,sessionTtlMs:600000,csrfSecret:'isolated-restore-check-only'.repeat(3),providers:{}};
  const auth=createAuthStateService(config,createPostgresAuthStatePort(pool));handler=createAuthService(config,pool);
  const account=(await pool.query("SELECT id FROM knolstory_auth.accounts WHERE status='active' ORDER BY id LIMIT 1")).rows[0].id;
  const session=await auth.issueSession(account),headers={cookie:`${authCookieNames(origin).session}=${session.token}`};
  const nonce=randomBytes(32).toString('base64url'),flow=await auth.createPendingFlow({provider:'kakao',purpose:'login',verifier:randomBytes(32).toString('base64url'),nonce,initialSessionToken:session.token});
  expect((await fetch(origin+'/api/v1/me',{headers})).status).toBe(200);
  const before=await inventory(),result=await fenceRestoredSessions(pool,target!);
  expect(result.revokedSessions).toBeGreaterThan(0);expect(result.removedFlows).toBeGreaterThan(0);
  expect((await fetch(origin+'/api/v1/me',{headers})).status).toBe(401);
  await expect(auth.consumeFlow({provider:'kakao',state:flow.state,browserBinding:flow.browserBinding,currentSessionToken:session.token})).rejects.toMatchObject({code:'INVALID_FLOW'});
  expect((await pool.query('SELECT count(*)::integer AS count FROM knolstory_auth.sessions WHERE NOT revoked')).rows[0].count).toBe(0);
  expect((await pool.query('SELECT count(*)::integer AS count FROM knolstory_auth.flows')).rows[0].count).toBe(0);
  expect(await inventory()).toEqual(before);
  const again=await fenceRestoredSessions(pool,target!);expect(again).toEqual({database:target,revokedSessions:0,removedFlows:0});
  console.info(JSON.stringify({restoreAuthFence:{historicalCookieBefore:200,historicalCookieAfter:401,historicalFlowRejected:true,unrevokedSessions:0,pendingFlows:0,accountsIdentitiesDocumentsBlobsReceiptsAndJournalPreserved:true,idempotent:true},scope:'Actual isolated restored DB and HTTP only; source service not targeted.'}));
 });
 it('refuses a candidate with another database client before invalidating credentials',async()=>{
  const auth=createAuthStateService({origin:'http://127.0.0.1:3000',flowTtlMs:600000,sessionTtlMs:600000,csrfSecret:'offline-activity-check'.repeat(3)},createPostgresAuthStatePort(pool));
  const account=(await pool.query("SELECT id FROM knolstory_auth.accounts WHERE status='active' ORDER BY id LIMIT 1")).rows[0].id,session=await auth.issueSession(account);
  const flow=await auth.createPendingFlow({provider:'kakao',purpose:'login',verifier:randomBytes(32).toString('base64url'),nonce:randomBytes(32).toString('base64url'),initialSessionToken:session.token});
  const other=new Pool({max:1}),connection=await other.connect();
  try{
   await expect(fenceRestoredSessions(pool,target!)).rejects.toThrow('offline isolated restore');
   expect(Boolean(await auth.authenticate(session.token))).toBe(true);
   expect(Boolean(await auth.consumeFlow({provider:'kakao',state:flow.state,browserBinding:flow.browserBinding,currentSessionToken:session.token}))).toBe(true);
  }finally{connection.release();await other.end();}
  await fenceRestoredSessions(pool,target!);expect(Boolean(await auth.authenticate(session.token))).toBe(false);
 });

 it('rolls back session invalidation when real flow deletion fails',async()=>{
  const auth=createAuthStateService({origin:'http://127.0.0.1:3000',flowTtlMs:600000,sessionTtlMs:600000,csrfSecret:'offline-rollback-check'.repeat(3)},createPostgresAuthStatePort(pool));
  const account=(await pool.query("SELECT id FROM knolstory_auth.accounts WHERE status='active' ORDER BY id LIMIT 1")).rows[0].id,session=await auth.issueSession(account);
  const flow=await auth.createPendingFlow({provider:'kakao',purpose:'login',verifier:randomBytes(32).toString('base64url'),nonce:randomBytes(32).toString('base64url'),initialSessionToken:session.token});
  // Failure injection is restricted to this disposable offline restore DB.
  await pool.query("CREATE FUNCTION knolstory_auth.restore_probe_reject() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'restore probe injected flow failure'; END; $$");
  await pool.query('CREATE TRIGGER restore_probe_reject BEFORE DELETE ON knolstory_auth.flows FOR EACH ROW EXECUTE FUNCTION knolstory_auth.restore_probe_reject()');
  try{
   await expect(fenceRestoredSessions(pool,target!)).rejects.toMatchObject({code:'P0001',message:'restore probe injected flow failure'});
   expect(Boolean(await auth.authenticate(session.token))).toBe(true);
  }finally{
   await pool.query('DROP TRIGGER restore_probe_reject ON knolstory_auth.flows');await pool.query('DROP FUNCTION knolstory_auth.restore_probe_reject()');
  }
  expect(Boolean(await auth.consumeFlow({provider:'kakao',state:flow.state,browserBinding:flow.browserBinding,currentSessionToken:session.token}))).toBe(true);
  await fenceRestoredSessions(pool,target!);expect(Boolean(await auth.authenticate(session.token))).toBe(false);
 });

});
