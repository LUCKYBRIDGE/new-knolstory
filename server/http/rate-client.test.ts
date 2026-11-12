import {describe,it,expect} from 'vitest';
import type {IncomingMessage} from 'node:http';
import {createRateClientResolver} from './rate-client';
import {CLIENT_BUCKET_HEADER,createClientBucketSigner} from './client-bucket-proof.mjs';
const origin='https://story.knolquiz.com',key='ab'.repeat(32);
const request=(headers:Record<string,string|string[]>={},rawHeaders:string[]=[]):IncomingMessage=>({method:'GET',url:'/api/v1/me',headers,rawHeaders,socket:{remoteAddress:'127.0.0.1'}} as unknown as IncomingMessage);
describe('rate client trust boundary',()=>{
 it('defaults to socket identity and never trusts supplied claims',()=>{
  const resolve=createRateClientResolver({origin});
  expect(resolve(request({'cf-connecting-ip':'192.0.2.1',[CLIENT_BUCKET_HEADER]:'forged'}))).toBe('socket:127.0.0.1');
  expect(resolve({...request(),socket:{}} as IncomingMessage)).toBe('socket:unknown');
 });
 it('requires proof when enabled and never silently falls back',()=>{
  const resolve=createRateClientResolver({origin,key,clock:()=>1000});
  expect(resolve(request())).toBeNull();
  expect(resolve(request({[CLIENT_BUCKET_HEADER]:'forged'}))).toBeNull();
  const sign=createClientBucketSigner({origin,key,clock:()=>1000});
  const proof=sign(request(),'192.0.2.1');
  const req=request({[CLIENT_BUCKET_HEADER]:proof},[CLIENT_BUCKET_HEADER,proof]);
  expect(resolve(req)).toMatch(/^proof:[a-f0-9]{64}$/);
  expect(resolve(req)).toBe(resolve(req));
 });
 it('rejects duplicate raw header fields before verification',()=>{
  const proof=createClientBucketSigner({origin,key,clock:()=>1000})(request(),'192.0.2.1');
  const resolve=createRateClientResolver({origin,key,clock:()=>1000});
  expect(resolve(request({[CLIENT_BUCKET_HEADER]:proof},[CLIENT_BUCKET_HEADER,proof,CLIENT_BUCKET_HEADER.toUpperCase(),proof]))).toBeNull();
  expect(resolve(request({[CLIENT_BUCKET_HEADER]:[proof,proof]}))).toBeNull();
 });
});
