import {randomBytes} from 'node:crypto';
import {mkdirSync,openSync,closeSync,writeFileSync,statSync} from 'node:fs';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const secretDir=process.env.KNOLSTORY_STORAGE_SECRET_DIR??join(homedir(),'.local','share','knolstory-next-storage-test','secrets');
mkdirSync(secretDir,{recursive:true,mode:0o700});
const databaseFile=join(secretDir,'storage-db-password'),csrfFile=join(secretDir,'api-csrf-secret');
const database=statSync(databaseFile);
if(!database.isFile()||(database.mode&0o077)!==0)throw Error('Dedicated Next database secret must exist with mode 0600.');
try{const fd=openSync(csrfFile,'wx',0o600);try{writeFileSync(fd,`${randomBytes(32).toString('hex')}\n`);}finally{closeSync(fd);}}
catch(error){if(error.code!=='EEXIST')throw error;}
const csrf=statSync(csrfFile);
if(!csrf.isFile()||(csrf.mode&0o077)!==0||csrf.uid!==database.uid||csrf.gid!==database.gid)throw Error('API secret permissions or ownership are invalid.');
const args=process.argv.slice(2);if(!args.length)args.push('config','--quiet');
if(args.some(arg=>['down','rm','prune','--volumes','-v'].includes(arg)))throw Error('Destructive lifecycle commands are not supported.');
const result=spawnSync('docker',['compose','--project-name','knolstory-next-api-dev','--file',fileURLToPath(new URL('../compose.api.local.yml',import.meta.url)),...args],{stdio:'inherit',env:{...process.env,KNOLSTORY_STORAGE_SECRET_DIR:secretDir,KNOLSTORY_SECRET_UID:String(database.uid),KNOLSTORY_SECRET_GID:String(database.gid)}});
process.exit(result.status??1);
