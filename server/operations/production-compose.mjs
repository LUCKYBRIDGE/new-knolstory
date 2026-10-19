import {randomBytes} from 'node:crypto';
import {mkdirSync,lstatSync,readFileSync,writeFileSync,existsSync} from 'node:fs';
import {homedir} from 'node:os';
import {join,isAbsolute} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';

function privateFile(path,generated=false){
 if(!existsSync(path)&&generated)writeFileSync(path,randomBytes(32).toString('hex')+'\n',{flag:'wx',mode:0o600});
 const stat=lstatSync(path);
 if(!stat.isFile()||stat.isSymbolicLink()||(stat.mode&0o077)!==0||stat.uid!==process.getuid())throw Error();
 const value=readFileSync(path,'utf8').trim();
 if(!value||value.length>4096||/[\r\n\0]/.test(value)||generated&&!/^[a-f0-9]{64}$/.test(value))throw Error();
 return stat;
}
/** Local-only preparation: never serializes credential values or accepts lifecycle passthrough. */
export function prepareProduction(env=process.env){
 try{
  const origin=env.KNOLSTORY_AUTH_ORIGIN??'https://story.knolquiz.com';
  if(!/^https:\/\/story(?:-[a-z0-9]+(?:-[a-z0-9]+)*)?\.knolquiz\.com$/.test(origin))throw Error();
  const dir=env.KNOLSTORY_PRODUCTION_SECRET_DIR??join(homedir(),'.local','share','knolstory-next-production','secrets');
  if(!isAbsolute(dir))throw Error();
  mkdirSync(dir,{recursive:true,mode:0o700});
  const stat=lstatSync(dir);
  if(!stat.isDirectory()||stat.isSymbolicLink()||(stat.mode&0o077)!==0||stat.uid!==process.getuid())throw Error();
  for(const file of ['db-password','csrf-secret'])privateFile(join(dir,file),true);
  const ownerDir=dir+'-owner';
  mkdirSync(ownerDir,{recursive:true,mode:0o700});
  const owner=lstatSync(ownerDir);
  if(!owner.isDirectory()||owner.isSymbolicLink()||(owner.mode&0o077)!==0||owner.uid!==process.getuid())throw Error();
  privateFile(join(ownerDir,'db-owner-password'),true);
  const providerFiles={};
  for(const provider of ['kakao','google']){
   const id=join(dir,`${provider}-client-id`),secret=join(dir,`${provider}-client-secret`);
   const present=existsSync(id)||existsSync(secret);
   if(present){privateFile(id);privateFile(secret);}
   providerFiles[`${provider.toUpperCase()}_CLIENT_ID_FILE`]=present?`/run/knolstory-production/${provider}-client-id`:'';
   providerFiles[`${provider.toUpperCase()}_CLIENT_SECRET_FILE`]=present?`/run/knolstory-production/${provider}-client-secret`:'';
  }
  return {KNOLSTORY_PRODUCTION_SECRET_DIR:dir,KNOLSTORY_PRODUCTION_OWNER_DIR:ownerDir,KNOLSTORY_AUTH_ORIGIN:origin,KNOLSTORY_REDIRECT_FROM_ORIGIN:origin==='https://story.knolquiz.com'?'https://story-next.knolquiz.com':'',KNOLSTORY_SECRET_UID:String(stat.uid),KNOLSTORY_SECRET_GID:String(stat.gid),...providerFiles};
 }catch{throw Error('Invalid production configuration.');}
}
export function composeArguments(action){
 const actions={config:['config','--quiet'],build:['build','api','ingress'],db:['up','-d','--wait','db'],migrate:['run','--rm','--no-deps','migration','node','migrate.mjs'],start:['up','-d','--wait','api','ingress'],status:['ps']};
 if(!Object.hasOwn(actions,action))throw Error('Unsupported production action.');
 return [...actions[action]];
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{
  if(process.argv.length>3)throw Error();
  const action=process.argv[2]??'config',args=composeArguments(action),env=prepareProduction();
  const result=spawnSync('docker',['compose','--project-name','knolstory-next-production','--file',fileURLToPath(new URL('../compose.production.yml',import.meta.url)),...args],{stdio:'inherit',env:{...process.env,...env}});
  process.exitCode=result.status??1;
 }catch{console.error('Production preparation failed. Check the selected action and private configuration.');process.exitCode=1;}
}
