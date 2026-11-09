import {constants} from 'node:fs';
import {lstat,realpath,open} from 'node:fs/promises';
import {isAbsolute,resolve,dirname} from 'node:path';
import {verifyClientProofBundle} from './client-proof-bundle.mjs';

const label='com.knolstory.client-proof-gateway';
const invalid=()=>Error('Invalid client proof activation preflight; no files or services were changed.');
const absolute=path=>typeof path==='string'&&isAbsolute(path)&&resolve(path)===path&&!/[\x00-\x1f\x7f]/.test(path);
const overlaps=(a,b)=>a===b||a.startsWith(b+'/')||b.startsWith(a+'/');

async function safeAncestors(parent,uid){
 for(let ancestor=parent;;ancestor=dirname(ancestor)){
  const item=await lstat(ancestor);
  if(!item.isDirectory()||item.isSymbolicLink()||![0,uid].includes(item.uid)||((item.mode&0o022)!==0&&(item.mode&0o1000)===0))throw invalid();
  if(ancestor===dirname(ancestor))break;
 }
}

async function privateParent(path,uid){
 const parent=dirname(path),stat=await lstat(parent);
 if(!stat.isDirectory()||stat.isSymbolicLink()||stat.uid!==uid||(stat.mode&0o7777)!==0o700||await realpath(parent)!==parent)throw invalid();
 await safeAncestors(parent,uid);
}

async function maybeStat(path){
 try{return await lstat(path);}catch(error){if(error.code==='ENOENT')return undefined;throw error;}
}

async function privateFile(path,uid,key=false){
 const stat=await maybeStat(path);
 if(!stat){if(key)throw invalid();return 'absent';}
 if(!stat.isFile()||stat.isSymbolicLink()||stat.uid!==uid||(stat.mode&0o7777)!==0o600||stat.nlink!==1||await realpath(path)!==path)throw invalid();
 // Metadata only: never read the candidate key's bytes. O_NOFOLLOW and fstat
 // reject final-component replacement between lstat and descriptor inspection.
 const handle=await open(path,constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_NONBLOCK);
 try{
  const current=await handle.stat();
  if(!current.isFile()||current.dev!==stat.dev||current.ino!==stat.ino||current.uid!==uid||(current.mode&0o7777)!==0o600||current.nlink!==1||(key&&![64,65].includes(current.size)))throw invalid();
 }finally{await handle.close();}
 return 'private-file';
}

function validate(input){
 const paths=[input.keyFile,input.socketPath,input.stdoutPath,input.stderrPath];
 if(typeof process.getuid!=='function'||!absolute(input.bundleRoot)||!absolute(input.nodePath)||paths.some(path=>!absolute(path)||overlaps(path,input.bundleRoot)||overlaps(path,input.nodePath))||Buffer.byteLength(input.socketPath)>100)throw invalid();
 for(let i=0;i<paths.length;i++)for(let j=i+1;j<paths.length;j++)if(overlaps(paths[i],paths[j]))throw invalid();
 const labels=input.existingServiceLabels;
 if(!Array.isArray(labels)||labels.some(value=>typeof value!=='string'||value.length===0||/[\x00-\x20\x7f]/.test(value))||new Set(labels).size!==labels.length||labels.includes(label))throw invalid();
 return paths;
}

/** Read-only point-in-time check. Caller supplies a freshly observed service
 * inventory; this function neither queries launchd nor installs a service. */
export async function inspectClientProofPaths(input){
 try{
  const paths=validate(input),uid=process.getuid();
  if(input.nodePath!==await realpath(process.execPath)||Number(process.versions.node.split('.')[0])<22)throw invalid();
  const node=await lstat(input.nodePath);
  if(!node.isFile()||node.isSymbolicLink()||await realpath(input.nodePath)!==input.nodePath||![0,uid].includes(node.uid)||(node.mode&0o111)===0||(node.mode&0o022)!==0)throw invalid();
  await safeAncestors(dirname(input.nodePath),uid);
  const bundle=await verifyClientProofBundle({destination:input.bundleRoot,expectedBundleId:input.expectedBundleId});
  await Promise.all(paths.map(path=>privateParent(path,uid)));
  await privateFile(input.keyFile,uid,true);
  if(await maybeStat(input.socketPath))throw invalid();
  const stdout=await privateFile(input.stdoutPath,uid),stderr=await privateFile(input.stderrPath,uid);
  // Paths must remain private and the socket absent at the end of observation.
  await Promise.all(paths.map(path=>privateParent(path,uid)));
  if(await maybeStat(input.socketPath))throw invalid();
  return Object.freeze({ready:true,bundleId:bundle.manifest.bundleId,nodeVersion:process.versions.node,uid,keyContentRead:false,keyMetadataValidated:true,socketAbsent:true,stdout,stderr,serviceLabelAbsent:true,serviceInventorySource:'caller-observed snapshot',filesOrServicesChanged:false,limits:Object.freeze(['Point-in-time filesystem and caller-supplied service inventory only; recheck immediately before activation.','Metadata validates key length and permissions, not key content or equality with container keys.','Node executable ancestry is checked; dynamic libraries and operating-system loader configuration are not inspected.','Same UID and root remain trusted; later filesystem/service changes are not locked.','Existing sockets are always refused; explicit listener and stale-socket recovery is required.'])});
 }catch{throw invalid();}
}
