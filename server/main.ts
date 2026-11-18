import cluster from 'node:cluster';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import pg from 'pg';
import {handlePoolErrors} from './http/pool-errors';
import {loadApiConfig} from './config';
import {STORAGE_MIGRATIONS} from './migrations/runner';
import {createDocumentHttpService} from './http/document-service';
import {createAuthService} from './http/auth-service';
import {createClassroomHttpService} from './http/classroom-service';
import {observeRequest} from './http/request-observation';
import {createApiShutdown} from './http/api-shutdown';
import {scheduleClassworkCleanup} from './classroom/season-retention';
import {scheduleTrashPurge} from './documents/trash-retention';
import {createUploadBudget} from './http/upload-budget';

/** Large bodies one worker may hold at once (about ten times this in heap while parsing). */
const UPLOAD_BUDGET_BYTES=24*1024*1024;

async function main(){
 const loaded=loadApiConfig(),config={...loaded,auth:{...loaded.auth,uploadBudget:createUploadBudget(UPLOAD_BUDGET_BYTES)}};
 const pool=new pg.Pool(config.database),auth=createAuthService(config.auth,pool),documents=createDocumentHttpService(config.auth,pool,config.classroom.adminAccountIds),classroom=createClassroomHttpService(config.auth,config.classroom,pool);
 handlePoolErrors(pool,message=>console.error(message));
 const migrationNames=STORAGE_MIGRATIONS;
 const checksums=await Promise.all(migrationNames.map(async name=>createHash('sha256').update(await readFile(new URL(name,import.meta.url))).digest('hex')));
 const json=(res:import('node:http').ServerResponse,status:number,data:unknown)=>{res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(data));};
 const server=createServer(async(req,res)=>{
  observeRequest(req,res,record=>console.info(JSON.stringify(record)));
  try{
   if(req.method==='GET'&&req.url==='/health/live'){json(res,200,{success:true,data:{live:true}});return;}
   if(req.method==='GET'&&req.url==='/api/v1/auth/config'){json(res,200,{success:true,data:{signupProvider:'kakao',providers:{kakao:!!config.auth.providers.kakao,google:!!config.auth.providers.google}}});return;}
   if(req.method==='GET'&&req.url==='/health/ready'){
    const database=await pool.query('SELECT current_database() AS name');
    if(database.rows[0]?.name!==config.database.database)throw Error();
    const journal=await pool.query('SELECT version,sha256 FROM knolstory_storage.migrations ORDER BY version');
    if(journal.rows.length!==checksums.length||journal.rows.some((row,index)=>row.version!==index+1||row.sha256!==checksums[index]))throw Error();
    if(!config.auth.providers.kakao){json(res,503,{success:false,error:{code:'AUTH_PROVIDER_NOT_CONFIGURED'}});return;}
    json(res,200,{success:true,data:{ready:true}});return;
   }
   const path=req.url?.split('?')[0]??'';
   if(path.startsWith('/api/v1/documents'))await documents(req,res);
   else if(path==='/api/v1/class'||path.startsWith('/api/v1/class/'))await classroom(req,res);
   else await auth(req,res);
  }catch{if(!res.headersSent)json(res,503,{success:false,error:{code:'SERVICE_UNAVAILABLE'}});else res.end();}
 });
 server.requestTimeout=100000;server.headersTimeout=10000;server.maxHeadersCount=50;
 const stop=createApiShutdown(server,pool,{exit:code=>process.exit(code)});
 process.on('SIGTERM',()=>stop());process.on('SIGINT',()=>stop());
 server.on('error',()=>{console.error('API listener failed.');stop(1);});
 server.listen(config.port,config.host,()=>{console.info('KnolStory API listening.');if(process.env.KNOLSTORY_CLASSROOM_MAINTENANCE==='1'||!cluster.isWorker){scheduleTrashPurge(pool);scheduleClassworkCleanup(pool);}});
}
/** Several workers share the port (round-robin). A crashed worker is replaced, so one bad request
 * cannot take the whole API down; the others keep serving meanwhile. */
function supervise(workers:number){
 let stopping=false,recent:number[]=[];
 const maintenanceWorkers=new Set<number>();
 const fork=(maintenance:boolean)=>{const worker=cluster.fork({KNOLSTORY_CLASSROOM_MAINTENANCE:maintenance?'1':'0'});if(maintenance)maintenanceWorkers.add(worker.id);};
 for(let i=0;i<workers;i++)fork(i===0);
 cluster.on('exit',worker=>{
  const maintenance=maintenanceWorkers.delete(worker.id);
  if(stopping){if(Object.keys(cluster.workers??{}).length===0)process.exit(0);return;}
  const now=Date.now();recent=[...recent.filter(time=>now-time<60_000),now];
  // A crash loop means a configuration problem: stop so the container restart policy and health check show it.
  if(recent.length>workers*3){console.error('API workers keep failing.');process.exit(1);}
  console.error('API worker stopped; starting a replacement.');setTimeout(()=>fork(maintenance),500);
 });
 const stop=()=>{if(stopping)return;stopping=true;for(const worker of Object.values(cluster.workers??{}))worker?.process.kill('SIGTERM');setTimeout(()=>process.exit(1),15_000).unref();};
 process.on('SIGTERM',stop);process.on('SIGINT',stop);
}
let workers=1;
try{workers=loadApiConfig().workers;}catch{/* main() reports the configuration error */}
if(workers>1&&cluster.isPrimary)supervise(workers);
else void main().catch(()=>{console.error('API startup failed.');process.exitCode=1;});
