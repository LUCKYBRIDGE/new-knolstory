import {createServer,request,type IncomingMessage,type ServerResponse} from 'node:http';
import {once} from 'node:events';
import {describe,it,expect,vi} from 'vitest';
import {observeRequest,type RequestObservation} from './request-observation';

async function exchange(url:string,method='GET',status=200){
 const records:RequestObservation[]=[];
 const server=createServer((req,res)=>{observeRequest(req,res,record=>records.push(record));res.statusCode=status;res.end('not logged: manuscript secret');});
 server.listen(0,'127.0.0.1');await once(server,'listening');
 try{
  const port=(server.address() as {port:number}).port;
  const response=await new Promise<{id:string;status:number}>(resolve=>{const req=request({hostname:'127.0.0.1',port,path:url,method,headers:{'X-Request-Id':'attacker-secret','Cookie':'session=private-token','Authorization':'Bearer private'}},res=>{res.resume();res.on('end',()=>resolve({id:String(res.headers['x-request-id']),status:res.statusCode!}));});req.end();});
  return {records,response};
 }finally{server.close();await once(server,'close');}
}
describe('private API request observations',()=>{
 it.each([['/api/v1/auth/kakao/callback?code=oauth-secret&state=private','auth'],['/api/v1/documents/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee?cursor=private','documents'],['/health/ready?token=private','health'],['/private-manuscript-name','unmatched']])('records only a bounded route family for %s',async(url,route)=>{
  const {records,response}=await exchange(url);
  expect(records).toHaveLength(1);expect(response.id).toMatch(/^[a-f\d-]{36}$/);expect(response.id).not.toBe('attacker-secret');
  expect(records[0]).toEqual({event:'http_request',requestId:response.id,method:'GET',route,status:200,outcome:'completed',durationMs:expect.any(Number)});
  expect(records[0]!.durationMs).toBeGreaterThanOrEqual(0);
  expect(JSON.stringify(records)).not.toMatch(/oauth-secret|private|attacker|cursor|manuscript|Bearer|aaaaaaa/);
 });
 it('records service failures without exception contents',async()=>{const {records}=await exchange('/api/v1/documents','POST',503);expect(records[0]).toMatchObject({status:503,method:'POST',route:'documents',outcome:'completed'});});
 it('does not classify similarly prefixed private paths as service routes',async()=>{const {records}=await exchange('/api/v1/auth-private','DELETE');expect(records[0]).toMatchObject({route:'unmatched',method:'DELETE'});});
 it('records a prematurely closed response exactly once',async()=>{
  const records:RequestObservation[]=[];const observed=vi.fn();
  const server=createServer((req,res)=>{observeRequest(req,res,record=>{records.push(record);observed();});res.writeHead(200);res.write('partial');});server.listen(0,'127.0.0.1');await once(server,'listening');
  try{const port=(server.address() as {port:number}).port;await new Promise<void>(resolve=>{request({hostname:'127.0.0.1',port},res=>{res.once('data',()=>{res.destroy();resolve();});}).end();});await vi.waitFor(()=>expect(observed).toHaveBeenCalledTimes(1));expect(records[0]).toMatchObject({outcome:'aborted',status:200});}finally{server.closeAllConnections();server.close();await once(server,'close');}
 });
 it('bounds unsupported methods and protects response completion from a failed sink',()=>{
  const req={method:'secret-method',url:'//private-host',headers:{},socket:{}} as IncomingMessage;
  const listeners=new Map<string,()=>void>(),headers=new Map();const res={statusCode:500,writableFinished:false,setHeader:(key:string,value:string)=>headers.set(key,value),once:(event:string,listener:()=>void)=>listeners.set(event,listener)} as unknown as ServerResponse;
  const sink=vi.fn<(record:RequestObservation)=>void>(()=>{throw Error('sensitive sink exception');}),failure=vi.fn();observeRequest(req,res,sink,{clock:()=>Number.NaN,onSinkFailure:failure});expect(()=>{listeners.get('close')!();listeners.get('finish')!();}).not.toThrow();expect(sink).toHaveBeenCalledOnce();expect(sink.mock.calls[0]?.[0]).toMatchObject({method:'OTHER',route:'unmatched',durationMs:0,outcome:'aborted'});expect(failure).toHaveBeenCalledExactlyOnceWith('Request observation unavailable.');
 });
});
