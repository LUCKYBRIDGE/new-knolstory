import {it,expect} from 'vitest';
import {createServer,request,type Server} from 'node:http';
import {mkdtemp,writeFile,realpath,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {createAuthRouter} from './auth-routes';
import {createDocumentRouter,type DocumentRouterOptions} from './document-routes';
import {createAuthStateService,authCookieNames,type AuthStatePort,type StoredSession} from '../auth/auth-state';
import {CLIENT_BUCKET_HEADER,createClientBucketSigner} from './client-bucket-proof.mjs';
const origin='https://story.knolquiz.com',key='ab'.repeat(32);
const listen=(server:Server)=>new Promise<number>((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',()=>{const address=server.address();if(!address||typeof address==='string')return reject(Error('Missing test address'));resolve(address.port);});});
const close=(server:Server)=>new Promise<void>(resolve=>{server.closeAllConnections();server.close(()=>resolve());});

it('keeps distinct clients separate through an actual protected ingress and enforces proof replay on both routers',async()=>{
 const sessions=new Map<string,StoredSession>();
 const port:AuthStatePort={async createFlow(){throw Error('No provider');},async consumeFlow(){return null;},async issueSession(value){sessions.set(value.tokenHash,value);return true;},async findSession(hash,now){const v=sessions.get(hash);return v&&!v.revoked&&v.expiresAt>now?v:null;},async revokeSession(){throw Error('No logout');}};
 const state=createAuthStateService({origin,flowTtlMs:60000,sessionTtlMs:60000,csrfSecret:'local-fixture-only-not-a-service-secret'.repeat(2)},port);
 const a=await state.issueSession(randomUUID()),b=await state.issueSession(randomUUID());
 const limits={windowMs:60000,maxRequests:2,maxEntries:10};
 const auth=createAuthRouter({origin,authState:state,providers:{},completionPort:{async complete(){throw Error('No provider');}},rateLimit:limits,clientProofKey:key});
 const documents=createDocumentRouter({origin,authState:state,roles:{async roleOf(){return 'teacher' as const;}},documents:{async list(){return {items:[],nextCursor:null};}} as unknown as DocumentRouterOptions['documents'],rateLimit:limits,clientProofKey:key});
 const api=createServer((req,res)=>{void(req.url?.startsWith('/api/v1/documents')?documents(req,res):auth(req,res));});
 const root=await realpath(await mkdtemp(join(tmpdir(),'knol-trust-'))),socketPath=join(root,'ingress.sock');
 let ingress:Server|undefined;
 try{
  await writeFile(join(root,'index.html'),'Isolated trusted-client fixture');
  const apiPort=await listen(api);
  const factory=await import(new URL('../operations/production-ingress.mjs',import.meta.url).href);
  const config={port:1,host:'127.0.0.1',publicOrigin:origin,apiOrigin:`http://127.0.0.1:${apiPort}`,staticRoot:root,trustedClient:{socketPath,key}};
  ingress=await factory.createProductionIngress(config);await factory.listenProductionIngress(ingress,config);
  const get=(path:string,token:string,headers:Record<string,string|string[]>={},direct=false)=>new Promise<number>((resolve,reject)=>{
   const req=request({...(direct?{hostname:'127.0.0.1',port:apiPort}:{socketPath}),path,headers:{host:'story.knolquiz.com',cookie:`${authCookieNames(origin).session}=${token}`,...headers}},res=>{res.resume();res.once('end',()=>resolve(res.statusCode??0));});req.once('error',reject);req.end();
  });
  for(const path of ['/api/v1/me','/api/v1/documents']){
   for(const [ip,token]of [['192.0.2.10',a.token],['198.51.100.20',b.token]]){
    const headers={'cf-connecting-ip':ip,'x-real-ip':'203.0.113.99',[CLIENT_BUCKET_HEADER]:'inherited-forged'};
    expect([await get(path,token,headers),await get(path,token,headers),await get(path,token,headers)]).toEqual([200,200,429]);
   }
   expect(await get(path,a.token,{},true)).toBe(403);
   expect(await get(path,a.token,{[CLIENT_BUCKET_HEADER]:'forged','cf-connecting-ip':'203.0.113.40'},true)).toBe(403);
   expect(await get(path,a.token,{'cf-connecting-ip':'not-an-ip'})).toBe(400);
   const proof=createClientBucketSigner({origin,key})({method:'GET',url:path},'203.0.113.30');
   expect([await get(path,a.token,{[CLIENT_BUCKET_HEADER]:proof},true),await get(path,a.token,{[CLIENT_BUCKET_HEADER]:proof},true),await get(path,a.token,{[CLIENT_BUCKET_HEADER]:proof,'x-forwarded-for':'198.51.100.2'},true)]).toEqual([200,200,429]);
   expect(await get(path,a.token,{[CLIENT_BUCKET_HEADER]:[proof,proof]},true)).toBe(403);
   const anon=createClientBucketSigner({origin,key})({method:'GET',url:path},'203.0.113.31');
   expect(await get(path,'missing-session',{[CLIENT_BUCKET_HEADER]:anon},true)).toBe(401);
  }
 }finally{if(ingress)await close(ingress);await close(api);await rm(root,{recursive:true});}
});
