import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import pg from 'pg';
import {handlePoolErrors} from './http/pool-errors';
import {loadApiConfig} from './config';
import {STORAGE_MIGRATIONS} from './migrations/runner';
import {createDocumentHttpService} from './http/document-service';
import {createAuthService} from './http/auth-service';
import {observeRequest} from './http/request-observation';
import {createApiShutdown} from './http/api-shutdown';

async function main(){
 const config=loadApiConfig(),pool=new pg.Pool(config.database),auth=createAuthService(config.auth,pool),documents=createDocumentHttpService(config.auth,pool);
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
   if(req.url?.split('?')[0]?.startsWith('/api/v1/documents'))await documents(req,res);
   else await auth(req,res);
  }catch{if(!res.headersSent)json(res,503,{success:false,error:{code:'SERVICE_UNAVAILABLE'}});else res.end();}
 });
 server.requestTimeout=15000;server.headersTimeout=10000;server.maxHeadersCount=50;
 const stop=createApiShutdown(server,pool,{exit:code=>process.exit(code)});
 process.on('SIGTERM',()=>stop());process.on('SIGINT',()=>stop());
 server.on('error',()=>{console.error('API listener failed.');stop(1);});
 server.listen(config.port,config.host,()=>console.info('KnolStory API listening.'));
}
void main().catch(()=>{console.error('API startup failed.');process.exitCode=1;});
