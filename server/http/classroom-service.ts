import {createAuthStateService,type AuthStateConfig} from '../auth/auth-state';
import {createPostgresAuthStatePort} from '../auth/postgres-auth-state';
import {createClassroomService} from '../classroom/service';
import {parseClassroomSecret} from '../classroom/secrets';
import type {SqlPool} from '../storage/postgres-save-port';
import {createClassroomRouter} from './classroom-routes';
import type {IncomingMessage,ServerResponse} from 'node:http';
import {perWorker,type RateOptions} from './rate-share';
/** Classroom requests per client address per minute, across all workers: a class of 30 behind one school address. */
const CLASSROOM_PER_MINUTE=1800;

export type ClassroomConfig=Readonly<{secret?:string;adminAccountIds:readonly string[]}>;
/** Classroom API. Without KNOL_CLASSROOM_SECRET every route answers 503 CLASSROOM_NOT_CONFIGURED. */
export function createClassroomHttpService(config:AuthStateConfig&Readonly<{clientProofKey?:string}>&RateOptions,classroom:ClassroomConfig,pool:SqlPool){
 if(classroom.secret===undefined){
  return async(_req:IncomingMessage,res:ServerResponse)=>{
   res.statusCode=503;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');
   res.end(JSON.stringify({success:false,error:{code:'CLASSROOM_NOT_CONFIGURED'}}));
  };
 }
 return createClassroomRouter({origin:config.origin,clientProofKey:config.clientProofKey,trustClientIp:config.trustClientIp,uploadBudget:config.uploadBudget,
  rateLimit:{maxRequests:perWorker(CLASSROOM_PER_MINUTE,config.workers)},
  // Failed-login ceilings stay the same in total however many workers share the traffic.
  loginRateLimit:{perStudent:perWorker(10,config.workers),perClient:perWorker(100,config.workers)},
  authState:createAuthStateService(config,createPostgresAuthStatePort(pool)),
  classroom:createClassroomService(pool,{secret:parseClassroomSecret(classroom.secret),adminAccountIds:classroom.adminAccountIds,origin:config.origin})});
}
