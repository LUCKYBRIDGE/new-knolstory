import {describe,expect,it,vi} from 'vitest';
import {createPostgresAuthCompletion} from './postgres-auth-completion';
const identity={provider:'google' as const,subject:'opaque-subject'};
describe('atomic auth completion input boundary',()=>{
 it.each([0,-1,1.5,Number.MAX_SAFE_INTEGER+1,undefined])('rejects invalid session TTL %s before connecting',sessionTtlMs=>{
  const pool={connect:vi.fn()};
  expect(()=>createPostgresAuthCompletion(pool,{sessionTtlMs:sessionTtlMs as number})).toThrow('INVALID_INPUT');expect(pool.connect).not.toHaveBeenCalled();
 });
 it.each([
  {identity,purpose:'link'},
  {identity:{...identity,provider:'kakao'},purpose:'link',currentSessionToken:'x'.repeat(43),expectedAccountId:'account'},
  {identity,purpose:'link',currentSessionToken:'bad',expectedAccountId:'account'},
  {identity,purpose:'link',currentSessionToken:'x'.repeat(43)},
  {identity,purpose:'unknown'},
  {identity:{...identity,subject:''},purpose:'login'},
  {identity,purpose:'login',expectedAccountId:'account'},
 ])('rejects malformed completion before connecting (%j)',async input=>{
  const pool={connect:vi.fn()};
  await expect(createPostgresAuthCompletion(pool,{sessionTtlMs:1000}).complete(input as never)).rejects.toBeInstanceOf(Error);expect(pool.connect).not.toHaveBeenCalled();
 });
 it.each([-1,0.5,Number.MAX_SAFE_INTEGER,NaN])('rejects invalid clock/expiry %s before connecting',async now=>{
  const pool={connect:vi.fn()};
  await expect(createPostgresAuthCompletion(pool,{sessionTtlMs:1000,clock:()=>now}).complete({identity,purpose:'login'})).rejects.toMatchObject({code:'INVALID_INPUT'});expect(pool.connect).not.toHaveBeenCalled();
 });
});
