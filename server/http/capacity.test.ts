import {describe,it,expect} from 'vitest';
import {EventEmitter} from 'node:events';
import type {IncomingMessage,ServerResponse} from 'node:http';
import {createRateClientResolver,CLIENT_IP_HEADER} from './rate-client';
import {createUploadBudget,reserveUpload,SMALL_UPLOAD_BYTES} from './upload-budget';
import {perWorker} from './rate-share';
import {loadApiConfig} from '../config';
const origin='https://story.knolquiz.com';
const request=(headers:Record<string,string>={},rawHeaders:string[]=Object.entries(headers).flat()):IncomingMessage=>({method:'GET',url:'/api/v1/me',headers,rawHeaders,socket:{remoteAddress:'172.18.0.3'}} as unknown as IncomingMessage);
describe('per-visitor rate buckets behind the ingress',()=>{
 it('uses the ingress-forwarded address only when trusted, once and well formed',()=>{
  const trusted=createRateClientResolver({origin,trustClientIp:true}),plain=createRateClientResolver({origin});
  expect(trusted(request({[CLIENT_IP_HEADER]:'203.0.113.7'}))).toBe('ip:203.0.113.7');
  expect(trusted(request({[CLIENT_IP_HEADER]:'2001:db8::1'}))).toBe('ip:2001:db8::1');
  expect(plain(request({[CLIENT_IP_HEADER]:'203.0.113.7'}))).toBe('socket:172.18.0.3');
  for(const bad of [request({[CLIENT_IP_HEADER]:'not-an-ip'}),request({[CLIENT_IP_HEADER]:'203.0.113.7'},[CLIENT_IP_HEADER,'203.0.113.7',CLIENT_IP_HEADER,'198.51.100.1']),request()])
   expect(trusted(bad)).toBe('socket:172.18.0.3');
 });
 it('splits totals across workers without dropping below one',()=>{
  expect(perWorker(300,1)).toBe(300);expect(perWorker(300,4)).toBe(75);expect(perWorker(10,4)).toBe(3);expect(perWorker(1,8)).toBe(1);
  expect(()=>perWorker(0,1)).toThrow();expect(()=>perWorker(10,0)).toThrow();
 });
});
describe('upload memory budget',()=>{
 const response=()=>Object.assign(new EventEmitter(),{}) as unknown as ServerResponse;
 const upload=(bytes:number|undefined)=>({headers:bytes===undefined?{}:{'content-length':String(bytes)}} as unknown as IncomingMessage);
 it('admits one body alone, refuses more past the budget, and frees on response end',()=>{
  const budget=createUploadBudget(10_000_000),a=response(),b=response(),c=response();
  expect(reserveUpload(budget,upload(8_000_000),a,8_000_000)).toBe(true);
  expect(reserveUpload(budget,upload(5_000_000),b,8_000_000)).toBe(false);
  expect(reserveUpload(budget,upload(SMALL_UPLOAD_BYTES),c,8_000_000)).toBe(true);
  (a as unknown as EventEmitter).emit('finish');(a as unknown as EventEmitter).emit('close');
  expect(budget.used).toBe(0);
  expect(reserveUpload(budget,upload(5_000_000),b,8_000_000)).toBe(true);
  expect(reserveUpload(budget,upload(undefined),c,8_000_000)).toBe(false);
  const single=createUploadBudget(1000);expect(single.take(5000)).not.toBeNull();
 });
});
describe('capacity configuration',()=>{
 const base={PGPASSWORD_FILE:'/p',KNOLSTORY_CSRF_SECRET_FILE:'/c'},read=(path:string)=>path==='/p'?'pw':'x'.repeat(40);
 it('reads workers, pool size and the trusted address switch strictly',()=>{
  const config=loadApiConfig({...base,KNOLSTORY_API_WORKERS:'4',KNOLSTORY_DB_POOL_MAX:'10',KNOLSTORY_TRUST_CLIENT_IP:'1'},read);
  expect(config.workers).toBe(4);expect(config.database.max).toBe(10);expect(config.auth.trustClientIp).toBe(true);
  const defaults=loadApiConfig(base,read);
  expect(defaults.workers).toBe(1);expect(defaults.database.max).toBe(5);expect(defaults.auth.trustClientIp).toBeUndefined();
  for(const env of [{KNOLSTORY_API_WORKERS:'0'},{KNOLSTORY_API_WORKERS:'17'},{KNOLSTORY_DB_POOL_MAX:'51'},{KNOLSTORY_TRUST_CLIENT_IP:'yes'}])
   expect(()=>loadApiConfig({...base,...env},read)).toThrow();
 });
});
