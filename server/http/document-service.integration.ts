import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {createServer,type Server} from 'node:http';
import {Pool} from 'pg';
import {beforeAll,afterAll,describe,it,expect} from 'vitest';
import {parseStoryDocument} from '@knolstory/story-domain';
import {createAuthoringArchive,prepareJsonbSnapshot,type AuthoringJsonbSnapshot} from '../../packages/compatibility/src/authoring-archive';
import {newShortStory} from '../../packages/compatibility/src/shortstory';
import {createAuthStateService,authCookieNames} from '../auth/auth-state';
import {createPostgresAuthStatePort} from '../auth/postgres-auth-state';
import {runStorageMigrations} from '../migrations/runner';
import {createDocumentHttpService} from './document-service';
const pool=new Pool({max:8});
let server:Server,origin:string,config:{origin:string;flowTtlMs:number;sessionTtlMs:number;csrfSecret:string};
async function user(){
 const accountId=randomUUID();await pool.query("INSERT INTO knolstory_auth.accounts(id,status) VALUES($1,'active')",[accountId]);
 const auth=createAuthStateService(config,createPostgresAuthStatePort(pool));
 const session=await auth.issueSession(accountId);
 return {auth,session,headers:{cookie:`${authCookieNames(origin).session}=${session.token}`,origin,'x-csrf-token':session.csrf,'content-type':'application/json'}};
}
async function snapshot(format:'knolstory'|'shortstory'){
 if(format==='shortstory')return prepareJsonbSnapshot(await createAuthoringArchive({format,project:newShortStory()}));
 const raw=JSON.parse(await readFile(new URL('../../tests/fixtures/stories/rabbit-classic.json',import.meta.url),'utf8'));
 const parsed=parseStoryDocument(raw,{savedAt:'2026-10-16T00:00:00.000Z',appVersion:'document-http-integration'});
 if(!parsed.ok)throw Error('Fixture invalid.');
 return prepareJsonbSnapshot(await createAuthoringArchive({format,document:parsed.document}));
}
async function renamed(value:AuthoringJsonbSnapshot){
 const content=structuredClone(value.content);
 if(content.format==='knolstory')content.document.project.title='수정한 원고 · 한글 😀';else content.project.title='수정한 그림책 · 한글 😀';
 return prepareJsonbSnapshot(content);
}
async function body(response:Response){return await response.json();}
describe('actual document HTTP and PostgreSQL ownership',()=>{
 beforeAll(async()=>{
  await runStorageMigrations(pool);
  let handler:ReturnType<typeof createDocumentHttpService>;
  server=createServer((req,res)=>{void handler(req,res);});await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
  origin=`http://127.0.0.1:${(server.address() as {port:number}).port}`;
  config={origin,flowTtlMs:60000,sessionTtlMs:60000,csrfSecret:'document-test-only-secret-material'.repeat(2)};
  handler=createDocumentHttpService(config,pool);
 });
 afterAll(async()=>{if(server)await new Promise<void>(resolve=>{server.closeAllConnections();server.close(()=>resolve());});await pool.end();});
 it('rejects stale displayed account expectations before returning another signed-in account content',async()=>{
  const owner=await user(),other=await user(),original=await snapshot('shortstory');
  const ownerId=(await owner.auth.authenticate(owner.session.token))!.accountId;
  const otherId=(await other.auth.authenticate(other.session.token))!.accountId;
  const created=await fetch(origin+'/api/v1/documents',{method:'POST',headers:{...other.headers,'idempotency-key':randomUUID(),'x-knolstory-account-id':otherId},body:JSON.stringify({payloadVersion:1,snapshot:original})});
  expect(created.status).toBe(201);const record=(await body(created)).data;
  for(const path of ['/api/v1/documents','/api/v1/documents/'+record.recordId]){
   const denied=await fetch(origin+path,{headers:{...other.headers,'x-knolstory-account-id':ownerId}});
   expect(denied.status).toBe(409);expect(await body(denied)).toEqual({success:false,error:{code:'ACCOUNT_SESSION_CHANGED'}});
  }
  const matching=await fetch(origin+'/api/v1/documents/'+record.recordId,{headers:{...other.headers,'x-knolstory-account-id':otherId}});
  expect((await body(matching)).data.snapshot).toEqual(original);
  await owner.auth.revokeSession(owner.session.token);await other.auth.revokeSession(other.session.token);
 });
 it.each(['knolstory','shortstory'] as const)('preserves full %s through create/read/save/replay with owner isolation',async format=>{
  const owner=await user(),other=await user(),original=await snapshot(format),key=randomUUID();
  const create=()=>fetch(origin+'/api/v1/documents',{method:'POST',headers:{...owner.headers,'idempotency-key':key},body:JSON.stringify({payloadVersion:1,snapshot:original})});
  const first=await create();expect(first.status).toBe(201);const record=(await body(first)).data;
  const replay=await create();expect(replay.status).toBe(200);expect((await body(replay)).data.recordId).toBe(record.recordId);
  const url=origin+'/api/v1/documents/'+record.recordId;
  const read=await fetch(url,{headers:owner.headers});expect(read.status).toBe(200);expect((await body(read)).data.snapshot).toEqual(original);
  const denied=await fetch(url,{headers:other.headers});expect(denied.status).toBe(404);expect(JSON.stringify(await body(denied))).not.toContain('actualRevision');
  const changed=await renamed(original),saveKey=randomUUID(),saveBody={payloadVersion:1,expectedRevision:1,snapshot:changed};
  const save=()=>fetch(url,{method:'PUT',headers:{...owner.headers,'idempotency-key':saveKey},body:JSON.stringify(saveBody)});
  expect((await body(await save())).data.revision).toBe(2);expect((await body(await save())).data.replayed).toBe(true);
  const conflict=await fetch(url,{method:'PUT',headers:{...owner.headers,'idempotency-key':randomUUID()},body:JSON.stringify(saveBody)});expect(conflict.status).toBe(409);
  const latest=await fetch(url,{headers:owner.headers});expect((await body(latest)).data.snapshot).toEqual(changed);
  const otherList=await body(await fetch(origin+'/api/v1/documents',{headers:other.headers}));expect(otherList.data.documents).toEqual([]);
 });
 it.each(['knolstory','shortstory'] as const)('preserves full %s through real HTTP trash, retry, restore, and stale replay',async format=>{
  const owner=await user(),other=await user(),original=await snapshot(format);
  const created=await fetch(origin+'/api/v1/documents',{method:'POST',headers:{...owner.headers,'idempotency-key':randomUUID()},body:JSON.stringify({payloadVersion:1,snapshot:original})});
  expect(created.status).toBe(201);const record=(await body(created)).data,url=origin+'/api/v1/documents/'+record.recordId,key=randomUUID();
  const command={payloadVersion:1,expectedRevision:1,expectedStateVersion:1};
  const trash=(headers=owner.headers)=>fetch(url+'/trash',{method:'POST',headers:{...headers,'idempotency-key':key},body:JSON.stringify(command)});
  expect((await trash(other.headers)).status).toBe(404);
  expect((await trash({...owner.headers,'x-csrf-token':'invalid'})).status).toBe(403);
  const first=await trash();expect(first.status).toBe(200);const deleted=(await body(first)).data;
  expect(deleted).toMatchObject({recordId:record.recordId,revision:1,stateVersion:2,contentSha256:original.contentSha256,replayed:false});
  expect((await body(await trash())).data).toEqual({...deleted,replayed:true});
  expect((await body(await fetch(origin+'/api/v1/documents',{headers:owner.headers}))).data.documents).toEqual([]);
  expect((await body(await fetch(origin+'/api/v1/documents?state=trash',{headers:owner.headers}))).data.documents).toMatchObject([{recordId:record.recordId,stateVersion:2}]);
  const unavailable=await fetch(url,{headers:owner.headers});expect(unavailable.status).toBe(409);expect((await body(unavailable)).error.code).toBe('DOCUMENT_TRASHED');
  const restore=await fetch(url+'/restore',{method:'POST',headers:{...owner.headers,'idempotency-key':randomUUID()},body:JSON.stringify({...command,expectedStateVersion:2})});
  expect(restore.status).toBe(200);expect((await body(restore)).data).toMatchObject({recordId:record.recordId,revision:1,stateVersion:3,deletedAt:null});
  expect((await body(await fetch(url,{headers:owner.headers}))).data.snapshot).toEqual(original);
  expect((await body(await trash())).data).toEqual({...deleted,replayed:true});
  const reopened=(await body(await fetch(url,{headers:owner.headers}))).data;
  expect(reopened).toMatchObject({recordId:record.recordId,revision:1,stateVersion:3,deletedAt:null});expect(reopened.snapshot).toEqual(original);
  expect((await body(await fetch(origin+'/api/v1/documents?state=trash',{headers:owner.headers}))).data.documents).toEqual([]);
  await owner.auth.revokeSession(owner.session.token);expect((await trash()).status).toBe(401);
 });
 it('requires current session and exact Origin/CSRF before creating and after logout',async()=>{
  const owner=await user(),value=await snapshot('shortstory');
  expect((await fetch(origin+'/api/v1/documents')).status).toBe(401);
  const headers={...owner.headers,'idempotency-key':randomUUID(),origin:'https://untrusted.example'};
  expect((await fetch(origin+'/api/v1/documents',{method:'POST',headers,body:JSON.stringify({payloadVersion:1,snapshot:value})})).status).toBe(403);
  await owner.auth.revokeSession(owner.session.token);
  expect((await fetch(origin+'/api/v1/documents',{headers:owner.headers})).status).toBe(401);
 });
});
