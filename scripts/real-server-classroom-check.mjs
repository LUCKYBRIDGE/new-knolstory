import {execFile,spawn} from 'node:child_process';
import {createHash,randomBytes,randomUUID} from 'node:crypto';
import {closeSync,existsSync,openSync} from 'node:fs';
import {cp,mkdir,mkdtemp,readFile,rm,writeFile} from 'node:fs/promises';
import {createServer} from 'node:net';
import {tmpdir} from 'node:os';
import {dirname,join} from 'node:path';
import {setTimeout as sleep} from 'node:timers/promises';
import {fileURLToPath} from 'node:url';
import {promisify} from 'node:util';

const root=fileURLToPath(new URL('../',import.meta.url));
const run=promisify(execFile);
const id=randomBytes(8).toString('hex');
const prefix=`knolstory-real-check-${id}`;
const database=`knolstory_next_real_${id}`;
const dbUser='knolstory_real_check';
const network=prefix;
const pgContainer=`${prefix}-db`,apiContainer=`${prefix}-api`,migrationContainer=`${prefix}-migrate`;
const productionImage='knolstory-next-api:production';
const postgresImage='postgres:16-bookworm';
const dockerLabel=`knolstory.real-check=${id}`;
const gatewayPort=15401,apiPort=15400,webPort=15402;
const origin=`http://127.0.0.1:${gatewayPort}`;
const teacherId=randomUUID(),teacherToken=randomBytes(32).toString('base64url');
const tokenHash=createHash('sha256').update(teacherToken).digest('hex');
const secrets={db:randomBytes(32).toString('hex'),csrf:randomBytes(32).toString('hex'),
 classroom:randomBytes(32).toString('base64')};
const sensitive=[teacherToken,tokenHash,...Object.values(secrets)];
const processes=[];
const containers=new Set();
let directory,temporaryImage,networkCreated=false,browser,interrupted,stepName='초기화',passed=false;

const docker=(...args)=>run('docker',args,{cwd:root,timeout:120000,maxBuffer:4*1024*1024});
function redact(message){
 return sensitive.reduce((text,value)=>text.replaceAll(value,'[숨김]'),message);
}
function interrupt(signal){
 interrupted??=signal;
 void browser?.close().catch(()=>{});
}
process.once('SIGINT',()=>interrupt('SIGINT'));
process.once('SIGTERM',()=>interrupt('SIGTERM'));

async function step(name,action){
 stepName=name;
 if(interrupted)throw Error(`실행 중단 요청: ${interrupted}`);
 console.log(`→ ${name}`);
 const result=await action();
 if(interrupted)throw Error(`실행 중단 요청: ${interrupted}`);
 console.log(`✓ ${name}`);
 return result;
}

async function waitFor(probe,description,timeout=45000){
 const deadline=Date.now()+timeout;
 let last;
 while(Date.now()<deadline&&!interrupted){
  try{if(await probe())return;}catch(error){last=error.message;}
  await sleep(350);
 }
 throw Error(`${description}${last?` (${last})`:''}`);
}

async function assertLocalDocker(){
 const endpoint=process.env.DOCKER_HOST||(await docker('context','inspect','--format','{{.Endpoints.docker.Host}}')).stdout.trim();
 if(!endpoint.startsWith('unix://'))throw Error('로컬 Unix 소켓의 Docker 엔진이 필요합니다.');
 await docker('version','--format','{{.Server.Version}}');
}

async function assertFreePort(port){
 const server=createServer();
 await new Promise((resolve,reject)=>{
  server.once('error',reject);
  server.listen(port,'127.0.0.1',()=>server.close(resolve));
 });
}

function runService(name,command,args,env){
 const log=openSync(join(directory,`${name}.log`),'a',0o600);
 const child=spawn(command,args,{cwd:root,env:{...process.env,...env},stdio:['ignore',log,log],detached:true});
 closeSync(log);
 const done=new Promise(resolve=>{
  child.once('error',error=>resolve(error.message));
  child.once('exit',(code,signal)=>resolve(`종료: ${code??signal}`));
 });
 processes.push({child,done,name});
}

function bind(source,target){
 return ['--mount',`type=bind,src=${source},dst=${target},readonly`];
}

const dbSettings={
 PGHOST:'isolated-db',PGPORT:'5432',PGDATABASE:database,PGUSER:dbUser,PGPASSWORD_FILE:'/run/check/db',
};
const envArgs=values=>Object.entries(values).flatMap(([key,value])=>['--env',`${key}=${value}`]);
const identity=()=>['--user',`${process.getuid()}:${process.getgid()}`];
const secretMount=()=>bind(join(directory,'secrets'),'/run/check');

const migrateAndSeed=`
import {readFileSync} from 'node:fs';
import pg from 'pg';
import {runStorageMigrations} from '/check/migrations/runner.ts';
const database=process.env.PGDATABASE;
if(!/^knolstory_next_real_[a-f0-9]{16}$/.test(database)||process.env.PGHOST!=='isolated-db')throw Error('Invalid isolated migration target.');
const pool=new pg.Pool({host:'isolated-db',port:5432,database,user:process.env.PGUSER,
 password:readFileSync(process.env.PGPASSWORD_FILE,'utf8').trim(),max:1,
 connectionTimeoutMillis:5000,query_timeout:15000});
try{
 await runStorageMigrations(pool);
 await pool.query("INSERT INTO knolstory_auth.accounts(id,status,role) VALUES($1,'active','teacher')",[process.env.CHECK_TEACHER_ID]);
 await pool.query('INSERT INTO knolstory_auth.sessions(token_hash,account_id,expires_at) VALUES($1,$2,$3)',
  [process.env.CHECK_TOKEN_HASH,process.env.CHECK_TEACHER_ID,Date.now()+900000]);
}finally{await pool.end();}
`;

async function ensureImage(){
 try{
  // Use the existing image by immutable ID, and never retag the production image.
  return (await docker('image','inspect','--format','{{.Id}}',productionImage)).stdout.trim();
 }catch{
  temporaryImage=`${prefix}:api`;
  const context=join(directory,'api-build');
  // Scope the build context to the inputs of server/Dockerfile.
  const inputs=[
   'server/Dockerfile','server/package.json','server/pnpm-lock.yaml','server/config.ts','server/main.ts',
   'server/auth','server/http','server/storage','server/migrations','server/documents','server/classroom',
   'server/operations/build-api.mjs','packages/story-domain/src','packages/compatibility/src',
   'packages/asset-registry/src',
  ];
  for(const path of inputs){
   const target=join(context,path);
   await mkdir(dirname(target),{recursive:true});
   await cp(join(root,path),target,{recursive:true});
  }
  await run('docker',['build','--file','server/Dockerfile','--tag',temporaryImage,'.'],
   {cwd:context,timeout:600000,maxBuffer:4*1024*1024});
  return temporaryImage;
 }
}

async function startContainer(name,args){
 containers.add(name);
 await docker('run','--detach','--name',name,'--label',dockerLabel,'--network',network,...args);
}

async function cleanup(){
 const failures=[];
 for(const {child,done,name} of processes.reverse()){
  if(!child.pid)continue;
  const stop=signal=>{try{process.kill(-child.pid,signal);}catch(error){if(error.code!=='ESRCH')throw error;}};
  try{
   stop('SIGTERM');
   await Promise.race([done,sleep(2500,undefined,{ref:false})]);
   stop('SIGKILL'); // A pnpm-launched descendant may still be in the process group.
   await done;
  }catch(error){failures.push(`${name}: ${error.message}`);}
 }
 for(const name of [...containers].reverse()){
  try{await docker('rm','--force','--volumes',name);}
  catch(error){if(!/No such container/i.test(error.stderr??''))failures.push(`${name}: 정리 실패`);}
 }
 if(networkCreated){
  try{await docker('network','rm',network);}catch{failures.push(`${network}: 네트워크 정리 실패`);}
 }
 if(temporaryImage){
  try{await docker('image','rm',temporaryImage);}
  catch(error){if(!/No such image/i.test(error.stderr??''))failures.push(`${temporaryImage}: 이미지 정리 실패`);}
 }
 if(directory){
  try{await rm(directory,{recursive:true,force:true});}catch{failures.push('임시 파일 정리 실패');}
 }
 if(failures.length)throw Error(failures.join('\n'));
}

try{
 await step('Docker와 전용 웹·API·게이트웨이 포트 확인',async()=>{
  await assertLocalDocker();
  for(const port of [webPort,apiPort,gatewayPort])await assertFreePort(port);
  if(!existsSync(join(root,'apps/web/node_modules/next/package.json'))||
     !existsSync(join(root,'node_modules/@playwright/test/package.json'))){
   await run('pnpm',['install','--frozen-lockfile'],{cwd:root,timeout:300000,maxBuffer:4*1024*1024});
  }
 });
 const image=await step('로컬 API 이미지 준비',async()=>{
  directory=await mkdtemp(join(tmpdir(),'knolstory-real-check-'));
  return ensureImage();
 });
 await step('임시 PostgreSQL 16 시작',async()=>{
  await mkdir(join(directory,'secrets'),{mode:0o700});
  for(const [key,value] of Object.entries(secrets))await writeFile(join(directory,'secrets',key),value,{mode:0o600});
  // A bridge is required to publish the API to the loopback gateway. Postgres stays unpublished.
  await docker('network','create','--label',dockerLabel,network);
  networkCreated=true;
  await startContainer(pgContainer,['--network-alias','isolated-db','--tmpfs','/var/lib/postgresql/data',
   ...bind(join(directory,'secrets/db'),'/run/check-db-password'),
   ...envArgs({POSTGRES_DB:database,POSTGRES_USER:dbUser,POSTGRES_PASSWORD_FILE:'/run/check-db-password'}),
   postgresImage]);
  await waitFor(async()=>{
   await docker('exec',pgContainer,'pg_isready','-h','127.0.0.1','-U',dbUser,'-d',database);
   return true;
  },'임시 PostgreSQL이 응답하지 않습니다.');
 });
 await step('저장소 마이그레이션과 임시 교사 세션 생성',async()=>{
  containers.add(migrationContainer);
  await docker('run','--rm','--name',migrationContainer,'--label',dockerLabel,'--network',network,
   ...identity(),...secretMount(),...bind(join(root,'server/migrations'),'/check/migrations'),
   ...envArgs({...dbSettings,CHECK_TEACHER_ID:teacherId,CHECK_TOKEN_HASH:tokenHash}),
   image,'node','--experimental-strip-types','--input-type=module','-e',migrateAndSeed);
 });
 await step('격리 API, 웹 개발 서버와 게이트웨이 시작',async()=>{
  await startContainer(apiContainer,['--publish',`127.0.0.1:${apiPort}:4000`,...identity(),...secretMount(),
   ...envArgs({...dbSettings,PORT:'4000',KNOLSTORY_BIND_HOST:'0.0.0.0',KNOLSTORY_AUTH_ORIGIN:origin,
    KNOLSTORY_CSRF_SECRET_FILE:'/run/check/csrf',KNOL_CLASSROOM_SECRET_FILE:'/run/check/classroom'}),image]);
  await waitFor(async()=>{
   const ready=await fetch(`http://127.0.0.1:${apiPort}/health/ready`,{signal:AbortSignal.timeout(2000)});
   // This error is returned only after the API has validated the DB and migration journal.
   const body=await ready.json();
   if(ready.status===503&&body.error?.code==='AUTH_PROVIDER_NOT_CONFIGURED')return true;
   throw Error(`HTTP ${ready.status} ${body.error?.code??''}`.trim());
  },'격리 API와 현재 마이그레이션이 일치하지 않거나 API 포트가 열리지 않았습니다.',25000);
  runService('web','pnpm',['--dir','apps/web','dev','--port',String(webPort)],{NEXT_PUBLIC_KNOL_ONLINE:'1'});
  runService('gateway',process.execPath,['server/operations/web-api-proxy.mjs'],{
   KNOLSTORY_API_PORT:String(apiPort),KNOLSTORY_WEB_PORT:String(webPort),KNOLSTORY_GATEWAY_PORT:String(gatewayPort),
  });
  await waitFor(async()=>{
   const response=await fetch(origin+'/teacher',{signal:AbortSignal.timeout(3000)});
   if(!response.ok)throw Error(`HTTP ${response.status}`);
   await response.body?.cancel();
   return true;
  },'게이트웨이에서 교사 화면을 불러오지 못했습니다.',90000);
 });
 const {chromium}=await import('@playwright/test');
 browser=await step('Playwright 브라우저 준비',async()=>{
  try{return await chromium.launch();}
  catch(error){
   if(!String(error.message).includes("Executable doesn't exist"))throw error;
   await run('pnpm',['exec','playwright','install','chromium'],{cwd:root,timeout:300000,maxBuffer:4*1024*1024});
   return chromium.launch();
  }
 });
 const {runClassroomFlow}=await import('./real-server-classroom-flow.mjs');
 await runClassroomFlow({browser,origin,teacherToken,step,sensitive});
 passed=true;
}catch(error){
 console.error(`✗ ${stepName}\n${redact(error.stderr?.trim()||error.message)}`);
 if(stepName==='격리 API, 웹 개발 서버와 게이트웨이 시작'){
  const diagnostics=await Promise.allSettled([
   docker('logs','--tail','12',apiContainer).then(({stdout,stderr})=>stdout+stderr),
   ...processes.map(({name})=>readFile(join(directory,`${name}.log`),'utf8')),
  ]);
  for(const entry of diagnostics){
   if(entry.status==='fulfilled'&&entry.value.trim())console.error(redact(entry.value.trim().split('\n').slice(-12).join('\n')));
  }
 }
 process.exitCode=interrupted==='SIGINT'?130:interrupted?143:1;
}finally{
 try{await browser?.close();}
 catch{passed=false;process.exitCode??=1;console.error('✗ 브라우저 정리 실패');}
 try{
  await cleanup();
  console.log('✓ 임시 컨테이너·네트워크·프로세스·파일 정리');
 }catch(error){
  passed=false;process.exitCode??=1;
  console.error(`✗ 정리 실패: ${error.message}`);
 }
}
if(interrupted){
 passed=false;
 process.exitCode=interrupted==='SIGINT'?130:143;
}
if(passed)console.log('실제 학급 과제 흐름 전체 통과');
