import {createHmac} from 'node:crypto';
import {describe,it,expect} from 'vitest';
import {CLIENT_BUCKET_HEADER,createClientBucketSigner,createClientBucketVerifier} from './client-bucket-proof.mjs';

const key='12'.repeat(32),origin='https://story.knolquiz.com',now=1_790_000_000_000;
const config={key,origin,clock:()=>now};
const target={method:'GET',url:'/api/v1/documents?limit=10'};
const sign=createClientBucketSigner(config);
const proof=sign(target,'192.0.2.10');
const request=(value:unknown=proof,overrides:Record<string,unknown>={})=>({...target,headers:{[CLIENT_BUCKET_HEADER]:value},...overrides});
const verify=(input:ReturnType<typeof request>,overrides:Record<string,unknown>={})=>createClientBucketVerifier({...config,...overrides})(input as Parameters<ReturnType<typeof createClientBucketVerifier>>[0]);
const forge=(issued:string,id='a'.repeat(64))=>{
 const signature=createHmac('sha256',Buffer.from(key,'hex')).update(JSON.stringify(['knolstory-rate-client-proof-v1',origin,issued,id,target.method,target.url])).digest('hex');
 return `v1.${issued}.${id}.${signature}`;
};

describe('signed client rate bucket proof',()=>{
 it('emits a bounded opaque proof and never includes the raw address',()=>{
  expect(CLIENT_BUCKET_HEADER).toBe('x-knolstory-client-proof');
  expect(proof).toMatch(/^v1\.\d+\.[a-f\d]{64}\.[a-f\d]{64}$/);
  expect(proof.length).toBeLessThanOrEqual(256);
  expect(proof).not.toContain('192.0.2.10');
  expect(verify(request())).toMatch(/^[a-f\d]{64}$/);
 });
 it('keeps retries and timestamps in the same bucket while separating clients and origins',()=>{
  const bucket=verify(request());
  expect(verify(request())).toBe(bucket);
  expect(verify(request(createClientBucketSigner({...config,clock:()=>now-1000})(target,'192.0.2.10')))).toBe(bucket);
  expect(verify(request(sign(target,'198.51.100.20')))).not.toBe(bucket);
  const otherOrigin='https://story-test.knolquiz.com';
  const other=createClientBucketSigner({...config,origin:otherOrigin})(target,'192.0.2.10');
  expect(createClientBucketVerifier({...config,origin:otherOrigin})(request(other) as never)).not.toBe(bucket);
 });
 it('canonicalizes equivalent IPv6 forms and accepts valid IPv4 and IPv6 only',()=>{
  expect(sign(target,'2001:0DB8:0000:0000:0000:0000:0000:0001')).toBe(sign(target,'2001:db8::1'));
  expect(sign(target,'::ffff:192.0.2.10')).toBe(sign(target,'::ffff:c000:20a'));
  for(const ip of ['127.0.0.1','::1','2001:db8::1'])expect(verify(request(sign(target,ip)))).toBeTruthy();
 });
 it.each(['','evil','192.0.2.1, 198.51.100.2',' 192.0.2.10','192.0.2.10 ','127.1','010.0.0.1','[::1]','fe80::1%eth0','a'.repeat(4096)])('refuses to sign invalid or ambiguous IP %j',ip=>{
  expect(()=>sign(target,ip)).toThrow('Invalid client bucket input.');
 });
 it.each([undefined,null,42,[],[proof],`${proof}, ${proof}`,'',proof+'x','v2'+proof.slice(2),'x'.repeat(257)])('rejects missing, duplicate, wrong-version or malformed header %j',value=>{
  expect(verify(request(value,{headers:{[CLIENT_BUCKET_HEADER]:value}}))).toBeNull();
 });
 it('rejects altered identity or authentication tag without changing ordinary requests',()=>{
  const fields=proof.split('.');
  expect(verify(request([fields[0],fields[1],'b'.repeat(64),fields[3]].join('.')))).toBeNull();
  expect(verify(request([fields[0],fields[1],fields[2],'0'.repeat(64)].join('.')))).toBeNull();
  expect(verify(request(proof.toUpperCase()))).toBeNull();
 });
 it('binds the configured audience, key, method and exact raw path and query',()=>{
  expect(verify(request(),{key:'34'.repeat(32)})).toBeNull();
  expect(verify(request(),{origin:'https://story-test.knolquiz.com'})).toBeNull();
  for(const overrides of [{method:'POST'},{url:'/api/v1/documents?limit=11'},{url:'/api/v1/documents?limit=%31%30'},{url:'/api/v1/documents/'},{url:'/api/v1/me'}])expect(verify(request(proof,overrides))).toBeNull();
 });
 it('enforces exact freshness and future-skew boundaries',()=>{
  for(const age of [0,30_000,-5000])expect(verify(request(),{clock:()=>now+age})).toBeTruthy();
  for(const age of [30_001,-5001])expect(verify(request(),{clock:()=>now+age})).toBeNull();
 });
 it.each(['00','01','1e3','-1','1.5','9007199254740992','9'.repeat(40)])('rejects noncanonical timestamps even with a correct HMAC %s',issued=>{
  expect(verify(request(forge(issued)))).toBeNull();
 });
 it('allows timestamp zero and does not treat rate identity as account authorization',()=>{
  const zeroConfig={...config,clock:()=>0};
  const zero=createClientBucketSigner(zeroConfig)(target,'192.0.2.10');
  expect(createClientBucketVerifier(zeroConfig)(request(zero) as never)).toMatch(/^[a-f\d]{64}$/);
  expect(verify(request(proof,{headers:{[CLIENT_BUCKET_HEADER]:proof,cookie:'arbitrary',authorization:'Bearer unrelated'}}))).toBe(verify(request()));
 });
 it.each([{key:''},{key:'a'.repeat(63)},{key:'g'.repeat(64)},{key:'a'.repeat(65)},{key:42},{origin:'http://story.knolquiz.com'},{origin:'https://story.knolquiz.com/'},{origin:'https://user@story.knolquiz.com'},{origin:'https://story.knolquiz.com:443'},{origin:'https://story.knolquiz.com/path'},{origin:'https://story.knolquiz.com?x=1'},{origin:'https://story.knolquiz.com#x'},{origin:'invalid'},{clock:0}])('rejects invalid configuration with a generic message %j',invalid=>{
  expect(()=>createClientBucketSigner({...config,...invalid} as never)).toThrow('Invalid client bucket configuration.');
  expect(()=>createClientBucketVerifier({...config,...invalid} as never)).toThrow('Invalid client bucket configuration.');
 });
 it('interprets a valid hexadecimal key consistently regardless of letter case',()=>{
  const lower='ab'.repeat(32),upper=lower.toUpperCase();
  const value=createClientBucketSigner({...config,key:upper})(target,'192.0.2.10');
  expect(createClientBucketVerifier({...config,key:lower})(request(value) as never)).toBeTruthy();
 });
 it.each([undefined,'','get','GET\n','A'.repeat(17),42])('rejects unsupported method shape %j',method=>{
  expect(()=>sign({...target,method} as never,'192.0.2.10')).toThrow('Invalid client bucket input.');
  expect(verify(request(proof,{method}))).toBeNull();
 });
 it.each([undefined,'','https://evil.test/api','//evil.test','/bad path','/bad\npath','/bad\\path','/bad#fragment','/%ZZ','/path?bad=%','/'+ 'x'.repeat(8192),42])('rejects malformed raw targets %j',url=>{
  expect(()=>sign({...target,url} as never,'192.0.2.10')).toThrow('Invalid client bucket input.');
  expect(verify(request(proof,{url}))).toBeNull();
 });
 it('preserves escaped data and maximum-length targets exactly',()=>{
  for(const url of ['/api/v1/documents?cursor=%ED%95%9C%EA%B8%80&next=a+b','/'+'x'.repeat(8191)]){
   const req={method:'POST',url};const value=sign(req,'192.0.2.10');
   expect(createClientBucketVerifier(config)({...req,headers:{[CLIENT_BUCKET_HEADER]:value}})).toBeTruthy();
  }
 });
 it.each([-1,1.5,Number.NaN,Number.POSITIVE_INFINITY,Number.MAX_SAFE_INTEGER+1])('fails closed for invalid current clocks %j',time=>{
  expect(()=>createClientBucketSigner({...config,clock:()=>time})(target,'192.0.2.10')).toThrow('Invalid client bucket input.');
  expect(verify(request(),{clock:()=>time})).toBeNull();
 });
 it('fails closed when a supplied clock throws',()=>{
  const clock=()=>{throw Error('private implementation detail');};
  expect(()=>createClientBucketSigner({...config,clock})(target,'192.0.2.10')).toThrow('Invalid client bucket input.');
  expect(verify(request(),{clock})).toBeNull();
 });
});
