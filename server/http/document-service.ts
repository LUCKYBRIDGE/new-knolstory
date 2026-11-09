import {createAuthStateService,type AuthStateConfig} from '../auth/auth-state';
import {createPostgresAuthStatePort} from '../auth/postgres-auth-state';
import {createDocumentService} from '../documents/service';
import type {SqlPool} from '../storage/postgres-save-port';
import {createDocumentRouter} from './document-routes';

/** Authenticated personal document API; service metadata never enters authored snapshots. */
export function createDocumentHttpService(config:AuthStateConfig & Readonly<{clientProofKey?:string}>,pool:SqlPool){
 return createDocumentRouter({origin:config.origin,clientProofKey:config.clientProofKey,
  authState:createAuthStateService(config,createPostgresAuthStatePort(pool)),
  documents:createDocumentService(pool)});
}
