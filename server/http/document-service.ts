import {createAuthStateService,type AuthStateConfig} from '../auth/auth-state';
import {createPostgresAuthStatePort} from '../auth/postgres-auth-state';
import {createDocumentService} from '../documents/service';
import type {SqlPool} from '../storage/postgres-save-port';
import {createDocumentRouter} from './document-routes';
import {createRoleResolver} from '../classroom/service';
import {perWorker,type RateOptions} from './rate-share';
/** Online-work requests per client address per minute, across all workers. A school shares one address. */
const DOCUMENTS_PER_MINUTE=300;

/** Authenticated personal document API; service metadata never enters authored snapshots. */
export function createDocumentHttpService(config:AuthStateConfig & Readonly<{clientProofKey?:string}> & RateOptions,pool:SqlPool,adminAccountIds:readonly string[]=[]){
 return createDocumentRouter({origin:config.origin,clientProofKey:config.clientProofKey,trustClientIp:config.trustClientIp,uploadBudget:config.uploadBudget,
  rateLimit:{windowMs:60_000,maxRequests:perWorker(DOCUMENTS_PER_MINUTE,config.workers),maxEntries:10_000},
  authState:createAuthStateService(config,createPostgresAuthStatePort(pool)),
  documents:createDocumentService(pool),roles:createRoleResolver(pool,adminAccountIds)});
}
