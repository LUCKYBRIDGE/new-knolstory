import {it} from 'vitest';
import {createServer,request,type Server} from 'node:http';
import {mkdtemp,writeFile,realpath,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {createAuthRouter} from '../../../../../server/http/auth-routes';
import {createDocumentRouter,type DocumentRouterOptions} from '../../../../../server/http/document-routes';
import {createAuthStateService,authCookieNames,type AuthStatePort,type StoredSession} from '../../../../../server/auth/auth-state';

const origin='https://story.knolquiz.com';
const listen=(server:Server)=>new Promise<number>((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',()=>{const address=server.address();if(!address||typeof address==='string')return reject(Error('Missing isolated test address'));resolve(address.port);});});
const close=(server:Server)=>new Promise<void>(resolve=>{server.closeAllConnections();server.close(()=>resolve());});

it('records actual proxy socket aggregation and confirms forwarded headers cannot bypass either router',async()=>{
 const sessions=new Map<string,StoredSession>();
 const port:AuthStatePort={
  async createFlow(){throw Error('No provider flow is permitted in this fixture.');},
  async consumeFlow(){return null;},
  async issueSession(value){sessions.set(value.tokenHash,value);return true;},
  async findSession(hash,now){const value=sessions.get(hash);return value&&!value.revoked&&value.expiresAt>now?value:null;},
  async revokeSession(){throw Error('No logout is permitted in this fixture.');},
 };
 const state=createAuthStateService({origin,flowTtlMs:60000,sessionTtlMs:60000,csrfSecret:'isolated-rate-probe-not-a-service-secret'.repeat(2)},port,()=>1000);
 const a=await state.issueSession(randomUUID()),b=await state.issueSession(randomUUID());
 if(!await state.authenticate(a.token)||!await state.authenticate(b.token))throw Error('Synthetic sessions must both be valid before HTTP limit checks.');
 const limits={windowMs:60000,maxRequests:2,maxEntries:10};
 const auth=createAuthRouter({origin,authState:state,providers:{},completionPort:{async complete(){throw Error('No provider is configured.');}},clock:()=>1000,rateLimit:limits});
 const documents=createDocumentRouter({origin,authState:state,documents:{async list(){return {items:[],nextCursor:null};}} as unknown as DocumentRouterOptions['documents'],rateLimit:limits});
 const peers=new Set<string>(),observedClaims:string[]=[];
 const api=createServer((req,res)=>{
  peers.add(req.socket.remoteAddress??'unknown');
  observedClaims.push(String(req.headers['cf-connecting-ip']??''));
  void(req.url?.startsWith('/api/v1/documents')?documents(req,res):auth(req,res));
 });
 let ingress:Server|undefined;
 const root=await realpath(await mkdtemp(join(tmpdir(),'knolstory-rate-probe-')));
 try{
  await writeFile(join(root,'index.html'),'Isolated rate boundary fixture');
  const apiPort=await listen(api);
  const ingressFactory:{createProductionIngress:(config:{port:number;host:string;publicOrigin:string;apiOrigin:string;staticRoot:string})=>Promise<Server>}=await import(new URL('../../../../../server/operations/production-ingress.mjs',import.meta.url).href);
  ingress=await ingressFactory.createProductionIngress({port:1,host:'127.0.0.1',publicOrigin:origin,apiOrigin:`http://127.0.0.1:${apiPort}`,staticRoot:root});
  const ingressPort=await listen(ingress);
  const get=(path:string,token:string,claims:Record<string,string>={})=>new Promise<number>((resolve,reject)=>{
   const req=request({hostname:'127.0.0.1',port:ingressPort,path,headers:{host:'story.knolquiz.com',cookie:`${authCookieNames(origin).session}=${token}`,...claims}},res=>{res.resume();res.once('end',()=>resolve(res.statusCode??0));});req.once('error',reject);req.end();
  });
  const results:Record<string,number[]>={};
  for(const path of ['/api/v1/me','/api/v1/documents']){
   const statuses=[await get(path,a.token,{'cf-connecting-ip':'192.0.2.10'}),await get(path,a.token,{'cf-connecting-ip':'192.0.2.10'}),await get(path,b.token,{'cf-connecting-ip':'198.51.100.20'})];
   if(JSON.stringify(statuses)!=='[200,200,429]')throw Error('The actual isolated rate boundary no longer matches the recorded aggregation.');
   const spoofed=await get(path,b.token,{'x-forwarded-for':'203.0.113.30',forwarded:'for=203.0.113.30','x-real-ip':'203.0.113.30','cf-connecting-ip':'203.0.113.30','x-knolstory-client-proof':'synthetic-forged-proof'});
   if(spoofed!==429)throw Error('Header changes bypassed the current socket limit.');
   results[path]=[...statuses,spoofed];
  }
  if(peers.size!==1)throw Error('Unexpected upstream socket peer count.');
  if(!observedClaims.includes('192.0.2.10')||!observedClaims.includes('198.51.100.20'))throw Error('Expected synthetic header claims did not reach the API.');
  const report={proxyRateBoundary:{results,apiSocketPeerCount:peers.size,syntheticSessions:2,thirdRequestFromOtherSessionBlocked:true,changedForwardingHeadersCannotBypass:true,cfHeaderPresentButIgnored:true},limits:{...limits,productionDefaultsUnchanged:true},scope:'Actual local ingress and actual auth/document HTTP routers; synthetic in-memory sessions/list port,not realKakao,not distinctphysicalIP,not live-service stress.'};
  await writeFile(new URL('../result.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
 }finally{
  if(ingress)await close(ingress);await close(api);await rm(root,{recursive:true});
 }
});
