import {createHash,createHmac,randomBytes,timingSafeEqual} from 'node:crypto';
export type AuthProvider='kakao'|'google';
export type AuthPurpose='login'|'link';
export type PendingFlow=Readonly<{stateHash:string;provider:AuthProvider;purpose:AuthPurpose;browserBindingHash:string;startSessionHash:string|null;verifier:string;nonce:string;expiresAt:number}>;
export type StoredSession=Readonly<{tokenHash:string;accountId:string;expiresAt:number;revoked?:boolean}>;
export type ConsumeFlowInput=Readonly<{stateHash:string;provider:AuthProvider;browserBindingHash:string;startSessionHash:string|null;now:number}>;
export interface AuthStatePort {
 createFlow(flow:PendingFlow):Promise<void>;
 /** Atomically consume only an unexpired matching flow whose starting session is active. */
 consumeFlow(input:ConsumeFlowInput):Promise<PendingFlow|null>;
 issueSession(session:StoredSession):Promise<boolean>;
 findSession(tokenHash:string,now:number):Promise<StoredSession|null>;
 revokeSession(tokenHash:string):Promise<void>;
}
export class AuthStateError extends Error {
 constructor(readonly code:'INVALID_INPUT'|'INVALID_FLOW'|'SESSION_REQUIRED'|'ACCOUNT_UNAVAILABLE'|'INVALID_CSRF'|'STORAGE_CONTRACT_VIOLATION'){super(code);this.name='AuthStateError';}
}
const tokenPattern=/^[A-Za-z0-9_-]{43}$/;
const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
const token=()=>randomBytes(32).toString('base64url');
const validToken=(value:unknown):value is string=>typeof value==='string'&&tokenPattern.test(value);
function provider(value:unknown):value is AuthProvider{return value==='kakao'||value==='google';}
export function validateAuthOrigin(value:string):string {
 let url:URL;try{url=new URL(value);}catch{throw new AuthStateError('INVALID_INPUT');}
 const loopback=['localhost','127.0.0.1','[::1]'].includes(url.hostname);
 if(url.origin!==value||url.username||url.password||(url.protocol!=='https:'&&!(url.protocol==='http:'&&loopback)))throw new AuthStateError('INVALID_INPUT');
 return url.origin;
}
export function authCookieNames(origin:string){
 const prefix=validateAuthOrigin(origin).startsWith('https:')?'__Host-':'';
 return {session:`${prefix}knolstory-next-session`,flow:`${prefix}knolstory-next-flow`};
}
export function serializeAuthCookie(origin:string,kind:'session'|'flow',value:string,maxAgeSeconds:number):string {
 const names=authCookieNames(origin);
 if((value!==''&&!validToken(value))||!Number.isSafeInteger(maxAgeSeconds)||maxAgeSeconds<0)throw new AuthStateError('INVALID_INPUT');
 return `${names[kind]}=${value}; Path=/; HttpOnly; SameSite=Lax${origin.startsWith('https:')?'; Secure':''}; Max-Age=${maxAgeSeconds}`;
}
function equal(left:string,right:string):boolean {
 const a=Buffer.from(left),b=Buffer.from(right);return a.length===b.length&&timingSafeEqual(a,b);
}
export type AuthStateConfig=Readonly<{origin:string;flowTtlMs:number;sessionTtlMs:number;csrfSecret:string}>;
export function createAuthStateService(input:AuthStateConfig,port:AuthStatePort,clock:()=>number=Date.now){
 const config={...input,origin:validateAuthOrigin(input.origin)};
 if(!Number.isSafeInteger(config.flowTtlMs)||config.flowTtlMs<=0||!Number.isSafeInteger(config.sessionTtlMs)||config.sessionTtlMs<=0||typeof config.csrfSecret!=='string'||Buffer.byteLength(config.csrfSecret)<32)throw new AuthStateError('INVALID_INPUT');
 const now=()=>{const value=clock();if(!Number.isSafeInteger(value)||value<0)throw new AuthStateError('INVALID_INPUT');return value;};
 const expires=(time:number,ttl:number)=>{const value=time+ttl;if(!Number.isSafeInteger(value))throw new AuthStateError('INVALID_INPUT');return value;};
 const csrf=(raw:string)=>createHmac('sha256',config.csrfSecret).update('knolstory-csrf\0').update(raw).digest('base64url');
 async function authenticate(raw:string){
  if(!validToken(raw))return null;
  const session=await port.findSession(hash(raw),now());
  return session?{accountId:session.accountId,expiresAt:session.expiresAt,csrf:csrf(raw)}:null;
 }
 return {
  authenticate,
  async createPendingFlow(flow:Readonly<{provider:AuthProvider;purpose:AuthPurpose;verifier:string;nonce:string;initialSessionToken?:string}>){
   const snapshot={...flow};
   if(!provider(snapshot.provider)||!['login','link'].includes(snapshot.purpose)||(snapshot.purpose==='link'&&snapshot.provider!=='google')||typeof snapshot.verifier!=='string'||! /^[A-Za-z0-9._~-]{43,128}$/.test(snapshot.verifier)||!validToken(snapshot.nonce))throw new AuthStateError('INVALID_INPUT');
   const initial=snapshot.initialSessionToken;
   if(initial!==undefined&&!await authenticate(initial))throw new AuthStateError('SESSION_REQUIRED');
   if(snapshot.purpose==='link'&&!initial)throw new AuthStateError('SESSION_REQUIRED');
   const state=token(),browserBinding=token(),expiresAt=expires(now(),config.flowTtlMs);
   await port.createFlow({stateHash:hash(state),provider:snapshot.provider,purpose:snapshot.purpose,verifier:snapshot.verifier,nonce:snapshot.nonce,browserBindingHash:hash(browserBinding),startSessionHash:initial?hash(initial):null,expiresAt});
   return {state,browserBinding,expiresAt};
  },
  async consumeFlow(input:Readonly<{state:string;provider:AuthProvider;browserBinding:string;currentSessionToken?:string}>){
   const value={...input};
   if(!validToken(value.state)||!validToken(value.browserBinding)||!provider(value.provider)||(value.currentSessionToken!==undefined&&!validToken(value.currentSessionToken)))throw new AuthStateError('INVALID_FLOW');
   const flow=await port.consumeFlow({stateHash:hash(value.state),provider:value.provider,browserBindingHash:hash(value.browserBinding),startSessionHash:value.currentSessionToken?hash(value.currentSessionToken):null,now:now()});
   if(!flow)throw new AuthStateError('INVALID_FLOW');
   const session=value.currentSessionToken?await authenticate(value.currentSessionToken):null;
   if(flow.startSessionHash&&!session)throw new AuthStateError('INVALID_FLOW');
   return {provider:flow.provider,purpose:flow.purpose,verifier:flow.verifier,nonce:flow.nonce,...(session?{accountId:session.accountId}:{})};
  },
  async issueSession(accountId:string){
   if(typeof accountId!=='string'||!accountId.trim())throw new AuthStateError('INVALID_INPUT');
   const raw=token(),expiresAt=expires(now(),config.sessionTtlMs);
   if(!await port.issueSession({tokenHash:hash(raw),accountId,expiresAt}))throw new AuthStateError('ACCOUNT_UNAVAILABLE');
   return {token:raw,csrf:csrf(raw),accountId,expiresAt};
  },
  async revokeSession(raw:string){if(validToken(raw))await port.revokeSession(hash(raw));},
  async verifyCsrf(raw:string,supplied:string,requestOrigin:string){
   if(requestOrigin!==config.origin||!validToken(supplied)||!validToken(raw)||!equal(csrf(raw),supplied)||!await authenticate(raw))throw new AuthStateError('INVALID_CSRF');
  },
 };
}
