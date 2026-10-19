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
