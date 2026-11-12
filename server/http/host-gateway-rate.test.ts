import {it,expect} from 'vitest';
import {createServer,request,type Server} from 'node:http';
import {mkdtemp,writeFile,realpath,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {createAuthRouter} from './auth-routes';
import {createDocumentRouter,type DocumentRouterOptions} from './document-routes';
import {createAuthStateService,authCookieNames,type AuthStatePort,type StoredSession} from '../auth/auth-state';
const origin='https://story.knolquiz.com',key='ab'.repeat(32);
const listen=(server:Server)=>new Promise<number>((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',()=>{const addr=server.address();if(!addr||typeof addr==='string')return reject(Error('Missing test address'));resolve(addr.port);});});
const close=(server:Server)=>new Promise<void>(resolve=>{server.closeAllConnections();server.close(()=>resolve());});

it('streams host UDS through proof-verifying TCP ingress to strict API without changing static/alias/session/CSRF boundaries',async()=>{
 const sessions=new Map<string,StoredSession>();
 const storage:AuthStatePort={async createFlow(){throw Error('No provider');},async consumeFlow(){return null;},async issueSession(v){sessions.set(v.tokenHash,v);return true;},async findSession(hash,now){const v=sessions.get(hash);return v&&!v.revoked&&v.expiresAt>now?v:null;},async revokeSession(){throw Error('No logout');}};
 const state=createAuthStateService({origin,flowTtlMs:60000,sessionTtlMs:60000,csrfSecret:'local-gateway-fixture-not-a-service-secret'.repeat(2)},storage);
 const a=await state.issueSession(randomUUID()),b=await state.issueSession(randomUUID());
 const rateLimit={windowMs:60000,maxRequests:2,maxEntries:10};
 const auth=createAuthRouter({origin,authState:state,providers:{},completionPort:{async complete(){throw Error('No provider');}},clientProofKey:key,rateLimit});
 const docs=createDocumentRouter({origin,authState:state,roles:{async roleOf(){return 'teacher' as const;}},documents:{async list(){return {items:[],nextCursor:null};}} as unknown as DocumentRouterOptions['documents'],clientProofKey:key,rateLimit});
 let apiRequests=0;
 const api=createServer((req,res)=>{apiRequests++;void(req.url?.startsWith('/api/v1/documents')?docs(req,res):auth(req,res));});
 const root=await realpath(await mkdtemp(join(tmpdir(),'kh-'))),socketPath=join(root,'g.sock');
 let ingress:Server|undefined,gateway:Server|undefined;
 try{
  await writeFile(join(root,'index.html'),'STATIC FIXTURE');
  const apiPort=await listen(api);
  const factory=await import(new URL('../operations/production-ingress.mjs',import.meta.url).href);
  const ingressServer:Server=await factory.createProductionIngress({staticRoot:root,publicOrigin:origin,redirectFromOrigin:'https://story-next.knolquiz.com',apiOrigin:`http://127.0.0.1:${apiPort}`,clientProofKey:key});
  ingress=ingressServer;
  const ingressPort=await listen(ingressServer);
  const host=await import(new URL('../operations/client-proof-gateway.mjs',import.meta.url).href);
  const config={socketPath,key,origin,aliasOrigin:'https://story-next.knolquiz.com',upstreamOrigin:`http://127.0.0.1:${ingressPort}`};
  gateway=await host.createClientProofGateway(config);await host.listenClientProofGateway(gateway,config);
  const get=(path:string,token=a.token,headers:Record<string,string>={},method='GET')=>new Promise<{status:number;body:string;headers:Record<string,unknown>}>((resolve,reject)=>{
   const req=request({socketPath,path,method,headers:{host:'story.knolquiz.com',cookie:`${authCookieNames(origin).session}=${token}`,...headers}},res=>{let body='';res.on('data',chunk=>body+=chunk);res.on('end',()=>resolve({status:res.statusCode??0,body,headers:res.headers}));res.on('error',reject);});req.on('error',reject);req.end();
  });
  const staticRead=await get('/');expect(staticRead.status).toBe(200);expect(staticRead.body).toBe('STATIC FIXTURE');
  const ranged=await get('/',a.token,{range:'bytes=2-4'});expect(ranged.status).toBe(206);expect(ranged.body).toBe('ATI');
  expect((await get('/',a.token,{},'HEAD')).body).toBe('');
  const alias=await get('/api/v1/me',a.token,{host:'story-next.knolquiz.com'});expect(alias.status).toBe(308);expect(alias.headers.location).toBe(origin+'/api/v1/me');
  expect((await get('/api/v1/documents',a.token,{host:'story-next.knolquiz.com'},'POST')).status).toBe(400);
  expect(apiRequests).toBe(0);
  for(const path of ['/api/v1/me','/api/v1/documents'])for(const [ip,token]of [['192.0.2.10',a.token],['198.51.100.20',b.token]]){
   const headers={'cf-connecting-ip':ip,'x-knolstory-client-proof':'forged','x-real-ip':'203.0.113.99'};
   expect([(await get(path,token,headers)).status,(await get(path,token,headers)).status,(await get(path,token,headers)).status]).toEqual([200,200,429]);
  }
  const csrf=await get('/api/v1/auth/logout',a.token,{'cf-connecting-ip':'203.0.113.1',origin,'x-csrf-token':'invalid'},'POST');
  expect(csrf.status).toBe(403);expect(JSON.parse(csrf.body).error.code).toBe('INVALID_CSRF');
  const documentCsrf=await get('/api/v1/documents',a.token,{'cf-connecting-ip':'203.0.113.1',origin,'x-csrf-token':'invalid'},'POST');
  expect(documentCsrf.status).toBe(403);expect(JSON.parse(documentCsrf.body).error.code).toBe('INVALID_CSRF');
  expect((await get('/api/v1/me','no-session',{'cf-connecting-ip':'203.0.113.2'})).status).toBe(401);
  const before=apiRequests;expect((await get('/api/v1/me')).status).toBe(400);expect(apiRequests).toBe(before);
 }finally{if(gateway)await close(gateway);if(ingress)await close(ingress);await close(api);await rm(root,{recursive:true});}
});
