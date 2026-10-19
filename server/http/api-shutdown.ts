import type {Server} from 'node:http';
type Pool=Readonly<{end:()=>Promise<void>}>;
type Options=Readonly<{exit:(code:number)=>void;timeoutMs?:number}>;
/** One deadline covers HTTP draining and pool cleanup; repeat signals share ownership. */
export function createApiShutdown(server:Server,pool:Pool,{exit,timeoutMs=10000}:Options){
 if(!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>60000)throw Error('INVALID_SHUTDOWN_CONFIG');
 let started=false,finished=false,exitCode=0;
 return (code=0)=>{
  if(finished)return;if(code!==0)exitCode=1;if(started)return;started=true;
  const complete=()=>{if(finished)return;finished=true;clearTimeout(timer);clearInterval(idle);exit(exitCode);};
  const timer=setTimeout(()=>{exitCode=1;try{server.closeAllConnections();}finally{complete();}},timeoutMs);
  const idle=setInterval(()=>server.closeIdleConnections(),Math.min(25,timeoutMs));
  const cleanup=()=>{void Promise.resolve().then(()=>pool.end()).then(complete,()=>{exitCode=1;complete();});};
  server.close(error=>{if(error)exitCode=1;cleanup();});server.closeIdleConnections();
 };
}
