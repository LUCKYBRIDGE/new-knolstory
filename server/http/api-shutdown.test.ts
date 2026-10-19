import {createServer,request} from 'node:http';
import {once} from 'node:events';
import {describe,it,expect,vi} from 'vitest';
import {createApiShutdown} from './api-shutdown';

describe('bounded API shutdown',()=>{
 it('drains an actual in-flight HTTP response before closing the pool, once',async()=>{
  let release!:()=>void;const entered=new Promise<void>(resolve=>{release=resolve;}),calls:string[]=[];let finish!:()=>void;
  const server=createServer((_req,res)=>{calls.push('request');release();finish=()=>{calls.push('response');res.end('complete');};});server.listen(0,'127.0.0.1');await once(server,'listening');
  const port=(server.address() as {port:number}).port;const response=new Promise<string>((resolve,reject)=>{const req=request({hostname:'127.0.0.1',port},res=>{let body='';res.on('data',data=>body+=data);res.on('end',()=>resolve(body));});req.on('error',reject);req.end();});await entered;
  const end=vi.fn(async()=>{calls.push('pool');}),exit=vi.fn();const stop=createApiShutdown(server,{end},{exit,timeoutMs:1000});stop();stop();
  expect(end).not.toHaveBeenCalled();await expect(fetch(`http://127.0.0.1:${port}`)).rejects.toThrow();finish();expect(await response).toBe('complete');await vi.waitFor(()=>expect(exit).toHaveBeenCalledExactlyOnceWith(0));expect(end).toHaveBeenCalledOnce();expect(calls).toEqual(['request','response','pool']);stop();expect(exit).toHaveBeenCalledOnce();
 });
 it('force-closes stuck requests on the shared deadline without reporting success later',async()=>{
  let entered!:()=>void;const accepted=new Promise<void>(resolve=>{entered=resolve;}),server=createServer((_req,res)=>{res.write('partial');entered();});server.listen(0,'127.0.0.1');await once(server,'listening');
  const req=request({hostname:'127.0.0.1',port:(server.address() as {port:number}).port},res=>{res.on('error',()=>{});res.resume();});req.on('error',()=>{});req.end();await accepted;
  const end=vi.fn(async()=>{}),exit=vi.fn();const stop=createApiShutdown(server,{end},{exit,timeoutMs:20});stop();await vi.waitFor(()=>expect(exit).toHaveBeenCalledExactlyOnceWith(1));await vi.waitFor(()=>expect(end).toHaveBeenCalledOnce());expect(exit).toHaveBeenCalledOnce();req.destroy();
 });
 it('includes pool draining in the timeout and handles rejected cleanup',async()=>{
  for(const stuck of [false,true]){
   const server=createServer();server.listen(0,'127.0.0.1');await once(server,'listening');
   let release!:()=>void;const end=vi.fn(()=>stuck?new Promise<void>(resolve=>{release=resolve;}):Promise.reject(Error('private database connection'))),exit=vi.fn();
   const stop=createApiShutdown(server,{end},{exit,timeoutMs:20});stop();await vi.waitFor(()=>expect(exit).toHaveBeenCalledExactlyOnceWith(1));if(stuck){release();await Promise.resolve();}stop();expect(end).toHaveBeenCalledOnce();expect(exit).toHaveBeenCalledOnce();
  }
 });
 it('keeps an explicit failure status and rejects unbounded configuration',async()=>{
  const server=createServer(),end=vi.fn(async()=>{}),exit=vi.fn();expect(()=>createApiShutdown(server,{end},{exit,timeoutMs:0})).toThrow('INVALID_SHUTDOWN_CONFIG');
  server.listen(0,'127.0.0.1');await once(server,'listening');const stop=createApiShutdown(server,{end},{exit,timeoutMs:1000});stop(1);await vi.waitFor(()=>expect(exit).toHaveBeenCalledExactlyOnceWith(1));
 });
});
