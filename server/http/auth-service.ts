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
  providers,rateLimit:config.rateLimit});
}
