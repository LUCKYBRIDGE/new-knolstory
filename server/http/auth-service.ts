import {createAuthStateService,type AuthStateConfig} from '../auth/auth-state';
import {createPostgresAuthStatePort} from '../auth/postgres-auth-state';
import {createPostgresAuthCompletion} from '../auth/postgres-auth-completion';
import {createOidcProvider,type OidcProviderConfig,type OidcTransport} from '../auth/oidc-provider';
import type {SqlPool} from '../storage/postgres-save-port';
import {createAuthRouter,type AuthRouterOptions} from './auth-routes';

type Provider='kakao'|'google';
export type AuthServiceConfig=AuthStateConfig & Readonly<{
 providers:Readonly<Partial<Record<Provider,Omit<OidcProviderConfig,'provider'>>>>;
 rateLimit?:AuthRouterOptions['rateLimit'];
 clientProofKey?:string;
}>;
/** Compose real HTTP, verifier and DB ports; transport injection is trusted test wiring only. */
export function createAuthService(config:AuthServiceConfig,pool:SqlPool,transport:OidcTransport={}){
 const state=createAuthStateService(config,createPostgresAuthStatePort(pool));
 const providers:Partial<Record<Provider,ReturnType<typeof createOidcProvider>>>={};
 for(const provider of ['kakao','google'] as const){
  const value=config.providers[provider];
  if(!value)continue;
  if(value.redirectUri!==`${config.origin}/api/v1/auth/${provider}/callback`)throw Error('Invalid authentication callback configuration.');
  providers[provider]=createOidcProvider({...value,provider},transport);
 }
 return createAuthRouter({origin:config.origin,authState:state,
  completionPort:createPostgresAuthCompletion(pool,{sessionTtlMs:config.sessionTtlMs}),
  providers,rateLimit:config.rateLimit,clientProofKey:config.clientProofKey,
  // One indexed read of the provider names only; subjects never leave the database.
  linkedProviders:async accountId=>{const client=await pool.connect();try{return (await client.query("SELECT provider FROM knolstory_auth.identities WHERE account_id=$1 AND provider IN ('kakao','google') ORDER BY provider",[accountId])).rows.map(row=>row.provider as Provider);}finally{client.release();}}});
}
