import {describe,it,expect} from 'vitest';
import type {SqlClient} from '../storage/postgres-save-port';
import {lockPostgresRequestSession} from './postgres-request-session';
const account='01234567-1234-1234-1234-012345678901',token='t'.repeat(43);
function harness(row:Record<string,unknown>|undefined={account_id:account,expires_at:'2000',revoked:false,status:'active'}){
 const calls:{sql:string;values?:unknown[]}[]=[];let now=1000;
 const client:SqlClient={async query(sql,values){calls.push({sql,values});return {rows:calls.length===1?[{token_hash:'h'}]:row?[row]:[],rowCount:1};},release(){throw Error('caller owns release');}};
 return {client,calls,clock:()=>now,setTime:(time:number)=>{now=time;}};
}
describe('current session request authorization inside caller transaction',()=>{
 it('locks family root before current session/account and returns fresh eligibility closure',async()=>{const h=harness(),result=await lockPostgresRequestSession(h.client,{sessionToken:token,expectedAccountId:account},h.clock);expect(result.accountId).toBe(account);expect(result.expiresAt).toBe(2000);expect(h.calls[0]?.sql).toContain('FOR SHARE');expect(h.calls[0]?.sql).toContain('WITH RECURSIVE ancestry');expect(h.calls[1]?.sql).toContain('FOR SHARE OF s,a');expect(h.calls[0]?.values?.[0]).toMatch(/^[a-f0-9]{64}$/);expect(h.calls[0]?.values).not.toContain(token);expect(result.assertEligible()).toBeUndefined();h.setTime(2000);expect(()=>result.assertEligible()).toThrowError(expect.objectContaining({code:'SESSION_REQUIRED'}));expect(h.calls).toHaveLength(2);});
 it('reads the clock after lock waiting instead of using a stale request timestamp',async()=>{const h=harness(),original=h.client.query;h.client.query=async(sql,values)=>{const result=await original(sql,values);h.setTime(2000);return result;};await expect(lockPostgresRequestSession(h.client,{sessionToken:token,expectedAccountId:account},h.clock)).rejects.toMatchObject({code:'SESSION_REQUIRED'});});
 it.each([{revoked:true},{status:'inactive'},{status:'deleted'},{account_id:'another'},{expires_at:'invalid'},{expires_at:-1},{expires_at:2000.5},{revoked:'false'}])('rejects ineligible persisted state %s',async patch=>{const h=harness({account_id:account,expires_at:2000,revoked:false,status:'active',...patch});await expect(lockPostgresRequestSession(h.client,{sessionToken:token,expectedAccountId:account},h.clock)).rejects.toMatchObject({code:'SESSION_REQUIRED'});});
 it('rejects missing sessions',async()=>{const h=harness({});await expect(lockPostgresRequestSession(h.client,{sessionToken:token,expectedAccountId:account},h.clock)).rejects.toMatchObject({code:'SESSION_REQUIRED'});});
 it.each([null,undefined,{}, {sessionToken:123,expectedAccountId:account},{sessionToken:token,expectedAccountId:123},{sessionToken:'bad',expectedAccountId:account},{sessionToken:token,expectedAccountId:'bad'}])('rejects malformed input before SQL %s',async input=>{const h=harness();await expect(lockPostgresRequestSession(h.client,input as never,h.clock)).rejects.toMatchObject({code:'SESSION_REQUIRED'});expect(h.calls).toHaveLength(0);});
 it.each([NaN,Infinity,-1,1.5])('fails closed on invalid fresh clock %s',async now=>{const h=harness();h.setTime(now);await expect(lockPostgresRequestSession(h.client,{sessionToken:token,expectedAccountId:account},h.clock)).rejects.toMatchObject({code:'SESSION_REQUIRED'});});
});
