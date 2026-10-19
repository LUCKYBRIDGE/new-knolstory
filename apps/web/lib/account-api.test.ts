import {describe,it,expect,vi} from 'vitest';
import {accountSession,accountConfig,accountLogout,accountGoogleLink,checkedAuthorizationUrl} from './account-api';
const response=(status:number,value:unknown)=>new Response(JSON.stringify(value),{status});
describe('same-origin account API',()=>{
 it('recognizes anonymous session but does not hide outages',async()=>{
  const fetcher=vi.fn().mockResolvedValueOnce(response(401,{success:false,error:{code:'SESSION_REQUIRED'}})).mockResolvedValueOnce(response(503,{success:false,error:{code:'AUTH_UNAVAILABLE'}}));
  expect(await accountSession(fetcher)).toBeNull();await expect(accountSession(fetcher)).rejects.toThrow();expect(fetcher.mock.calls[0][0]).toBe('/api/v1/me');
 });
 it('validates config and session envelopes',async()=>{
  const fetcher=vi.fn().mockResolvedValueOnce(response(200,{success:true,data:{signupProvider:'kakao',providers:{kakao:true,google:false}}})).mockResolvedValueOnce(response(200,{success:true,data:{accountId:'account',csrf:'csrf'}})).mockResolvedValueOnce(response(200,{success:true,data:{csrf:'csrf'}}));
  expect((await accountConfig(fetcher)).providers.google).toBe(false);expect(await accountSession(fetcher)).toEqual({accountId:'account',csrf:'csrf'});await expect(accountSession(fetcher)).rejects.toThrow();
 });
 it('sends empty CSRF commands and validates Google destination',async()=>{
  const fetcher=vi.fn().mockResolvedValueOnce(response(200,{success:true,data:{authorizationUrl:'https://accounts.google.com/o/oauth2/v2/auth?state=opaque'}})).mockResolvedValueOnce(response(200,{success:true,data:{loggedOut:true}}));
  expect(await accountGoogleLink('csrf',fetcher)).toContain('accounts.google.com');await accountLogout('csrf',fetcher);expect(fetcher.mock.calls[0][1]).toMatchObject({method:'POST',headers:{'x-csrf-token':'csrf'},redirect:'error'});
 });
 it.each(['https://evil.example/','http://accounts.google.com/o/oauth2/v2/auth','https://accounts.google.com/o/oauth2/v2/auth#token','https://user@accounts.google.com/o/oauth2/v2/auth'])('rejects unexpected destination %s',value=>{expect(()=>checkedAuthorizationUrl(value)).toThrow();});
 it('rejects invalid config, JSON and logout confirmation',async()=>{
  await expect(accountConfig(vi.fn().mockResolvedValue(response(200,{success:true,data:{providers:{kakao:true}}})))).rejects.toThrow();
  await expect(accountSession(vi.fn().mockResolvedValue(new Response('bad')))).rejects.toThrow();
  await expect(accountLogout('c',vi.fn().mockResolvedValue(response(200,{success:true,data:{loggedOut:false}})))).rejects.toThrow();
 });
});
