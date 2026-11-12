import {describe,it,expect} from 'vitest';
import {loadApiConfig} from './config';
const env={PGPASSWORD_FILE:'/secret/db',KNOLSTORY_CSRF_SECRET_FILE:'/secret/csrf',KNOLSTORY_AUTH_ORIGIN:'http://127.0.0.1:15400'};
const read=(path:string)=>path.endsWith('csrf')?'a'.repeat(64):'password';
describe('API configuration',()=>{
 it('loads disabled providers with loopback defaults',()=>{const c=loadApiConfig(env,read);expect(c.auth.providers).toEqual({});expect(c.port).toBe(4000);expect(c.host).toBe('127.0.0.1');expect(c.auth.flowTtlMs).toBe(300000);});
 it('derives exact callback URLs from complete provider pairs',()=>{const c=loadApiConfig({...env,KAKAO_CLIENT_ID_FILE:'/id',KAKAO_CLIENT_SECRET_FILE:'/secret'},read);expect(c.auth.providers.kakao?.redirectUri).toBe('http://127.0.0.1:15400/api/v1/auth/kakao/callback');});
 it.each(['PGPASSWORD_FILE','KNOLSTORY_CSRF_SECRET_FILE'] as const)('requires %s',key=>expect(()=>loadApiConfig({...env,[key]:undefined},read)).toThrow());
 it('fails closed on a partial provider pair',()=>expect(()=>loadApiConfig({...env,GOOGLE_CLIENT_ID_FILE:'/id'},read)).toThrow());
 it('does not expose read errors',()=>expect(()=>loadApiConfig(env,()=>{throw Error('private material');})).toThrow('Invalid API configuration.'));
 it.each(['http://example.com','https://example.com/','https://u:p@example.com','https://example.com/path'])('rejects unsafe origin %s',origin=>expect(()=>loadApiConfig({...env,KNOLSTORY_AUTH_ORIGIN:origin},read)).toThrow());
 it.each(['0','-1','1.5','Infinity','9007199254740992'])('rejects invalid TTL %s',value=>expect(()=>loadApiConfig({...env,KNOLSTORY_SESSION_TTL_MS:value},read)).toThrow());
 it('rejects short CSRF material',()=>expect(()=>loadApiConfig(env,()=> 'short')).toThrow());
 it.each(['0','65536','1.2'])('rejects invalid port %s',PORT=>expect(()=>loadApiConfig({...env,PORT},read)).toThrow());
});

it('keeps client-proof trust disabled unless an explicit protected key file is configured',()=>{
 expect(loadApiConfig(env,read).auth.clientProofKey).toBeUndefined();
 const configured={...env,KNOLSTORY_AUTH_ORIGIN:'https://story.knolquiz.com',KNOLSTORY_CLIENT_PROOF_KEY_FILE:'/secret/proof'};
 expect(loadApiConfig(configured,path=>path==='/secret/proof'?'ab'.repeat(32):read(path)).auth.clientProofKey).toBe('ab'.repeat(32));
 for(const value of ['', 'z'.repeat(64),'ab'.repeat(31),'ab'.repeat(33),'aa\n'+'a'.repeat(61)])expect(()=>loadApiConfig(configured,path=>path==='/secret/proof'?value:read(path))).toThrow('Invalid API configuration.');
});

describe('classroom configuration',()=>{
 const secret=Buffer.alloc(32,7).toString('base64'),admin='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',other='BBBBBBBB-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
 it('starts without classroom settings and leaves the secret unset',()=>{
  const c=loadApiConfig(env,read);expect(c.classroom).toEqual({adminAccountIds:[]});
 });
 it('accepts an inline base64 secret or a secret file and lowercases unique admin ids',()=>{
  expect(loadApiConfig({...env,KNOL_CLASSROOM_SECRET:secret,KNOL_ADMIN_ACCOUNT_IDS:` ${admin}, ${other},${admin},`},read).classroom).toEqual({secret,adminAccountIds:[admin,other.toLowerCase()]});
  expect(loadApiConfig({...env,KNOL_CLASSROOM_SECRET_FILE:'/secret/class'},path=>path.endsWith('class')?secret+'\n':read(path)).classroom.secret).toBe(secret);
 });
 it.each([['short',Buffer.alloc(16).toString('base64')],['not base64','###'],['empty','']])('fails closed on an invalid classroom secret: %s',(_,value)=>{
  expect(()=>loadApiConfig({...env,KNOL_CLASSROOM_SECRET:value},read)).toThrow('Invalid API configuration.');
 });
 it('rejects both secret sources at once and malformed admin ids',()=>{
  expect(()=>loadApiConfig({...env,KNOL_CLASSROOM_SECRET:secret,KNOL_CLASSROOM_SECRET_FILE:'/secret/class'},()=>secret)).toThrow('Invalid API configuration.');
  expect(()=>loadApiConfig({...env,KNOL_ADMIN_ACCOUNT_IDS:'not-a-uuid'},read)).toThrow('Invalid API configuration.');
 });
 it('treats the empty secret path and admin list that Compose passes as not configured',()=>{
  expect(loadApiConfig({...env,KNOL_CLASSROOM_SECRET_FILE:'',KNOL_ADMIN_ACCOUNT_IDS:''},read).classroom).toEqual({adminAccountIds:[]});
 });
});
