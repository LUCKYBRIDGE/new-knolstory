import {readFileSync} from 'node:fs';
import {validateAuthOrigin} from './auth/auth-state';
import type {AuthServiceConfig} from './http/auth-service';
type Environment=Readonly<Record<string,string|undefined>>;
function integer(value:string|undefined,fallback:number,max=Number.MAX_SAFE_INTEGER):number{
 const result=value===undefined?fallback:Number(value);
 if((value!==undefined&&!/^\d+$/.test(value))||!Number.isSafeInteger(result)||result<1||result>max)throw Error();
 return result;
}
/** Secrets are read only from explicit server-side file paths. Never serialize this object. */
export function loadApiConfig(env:Environment=process.env,read:(path:string)=>string=path=>readFileSync(path,'utf8')){
 try{
  const secret=(key:string,max:number,min=1)=>{const path=env[key];if(!path)throw Error();const value=read(path).trim();if(value.length<min||value.length>max||/[\r\n\0]/.test(value))throw Error();return value;};
  const origin=validateAuthOrigin(env.KNOLSTORY_AUTH_ORIGIN??'http://127.0.0.1:15400');
  if(origin.length>2048)throw Error();
  const providers:AuthServiceConfig['providers']={};
  const entries=(['kakao','google'] as const).flatMap(provider=>{
   const prefix=provider.toUpperCase(),id=env[`${prefix}_CLIENT_ID_FILE`],key=env[`${prefix}_CLIENT_SECRET_FILE`];
   if(!id&&!key)return [];
   if(!id||!key)throw Error();
   return [[provider,{clientId:secret(`${prefix}_CLIENT_ID_FILE`,1024),clientSecret:secret(`${prefix}_CLIENT_SECRET_FILE`,4096),redirectUri:`${origin}/api/v1/auth/${provider}/callback`}]];
  });
  const database=env.PGDATABASE??'knolstory_next_storage_test';
  if(!/^knolstory_next(?:_[a-z0-9_]+)?$/.test(database))throw Error();
  const host=env.KNOLSTORY_BIND_HOST??'127.0.0.1';
  if(!['127.0.0.1','0.0.0.0'].includes(host))throw Error();
  return {host,port:integer(env.PORT,4000,65535),auth:{origin,flowTtlMs:integer(env.KNOLSTORY_FLOW_TTL_MS,300000),sessionTtlMs:integer(env.KNOLSTORY_SESSION_TTL_MS,28800000),csrfSecret:secret('KNOLSTORY_CSRF_SECRET_FILE',4096,32),providers:{...providers,...Object.fromEntries(entries)}} satisfies AuthServiceConfig,
   database:{host:env.PGHOST??'127.0.0.1',port:integer(env.PGPORT,5432,65535),database,user:env.PGUSER??'knolstory_next_storage_test',password:secret('PGPASSWORD_FILE',4096),max:5,connectionTimeoutMillis:5000,query_timeout:5000}};
 }catch{throw Error('Invalid API configuration.');}
}
