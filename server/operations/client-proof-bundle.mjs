import {constants} from 'node:fs';
import {lstat,realpath,open,mkdir,chmod,readFile,readdir} from 'node:fs/promises';
import {isAbsolute,resolve,dirname,join} from 'node:path';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
const files=Object.freeze(['http/client-bucket-proof.mjs','operations/client-proof-gateway.mjs','operations/production-ingress.mjs','operations/trusted-ingress-socket.mjs']);
const sha=data=>createHash('sha256').update(data).digest('hex');
const invalid=()=>Error('Invalid client proof bundle preparation; existing targets are never replaced.');
const manifestOf=rows=>({format:'knolstory-client-proof-bundle-v1',bundleId:sha(JSON.stringify(rows)),entryPath:'operations/client-proof-gateway.mjs',files:rows});
function absolute(path){return typeof path==='string'&&isAbsolute(path)&&resolve(path)===path&&!/[\x00-\x1f\x7f]/.test(path);}
async function privateParent(destination){
 const parent=dirname(destination),stat=await lstat(parent),uid=process.getuid();
 if(!stat.isDirectory()||stat.isSymbolicLink()||await realpath(parent)!==parent||stat.uid!==uid||(stat.mode&0o777)!==0o700)throw invalid();
 for(let path=parent;;path=dirname(path)){
  const item=await lstat(path);
  if(!item.isDirectory()||item.isSymbolicLink()||![0,uid].includes(item.uid)||((item.mode&0o022)!==0&&(item.mode&0o1000)===0))throw invalid();
  if(path===dirname(path))break;
 }
}
async function sourceBytes(root,path,expected){
 const file=join(root,path);
 if(await realpath(file)!==file)throw invalid();
 const handle=await open(file,constants.O_RDONLY|constants.O_NOFOLLOW);
 try{
  const stat=await handle.stat();
  if(!stat.isFile()||stat.size>1024*1024)throw invalid();
  const data=await handle.readFile();
  if(data.length!==stat.size||sha(data)!==expected)throw invalid();
  return data;
 }finally{await handle.close();}
}
async function writeExclusive(path,data){
 const handle=await open(path,'wx',0o600);
 try{await handle.writeFile(data);await handle.sync();}finally{await handle.close();}
 if(sha(await readFile(path))!==sha(data))throw invalid();
 await chmod(path,0o400);
}
/** Exclusive destination, manifest-last completion. A failed owned partial is preserved, not reused. */
export async function prepareClientProofBundle(input){
 try{
  const {sourceRoot,destination,expectedSourceSha256}=input;
  if(typeof process.getuid!=='function'||!absolute(sourceRoot)||!absolute(destination)||destination===sourceRoot||destination.startsWith(sourceRoot+'/')||sourceRoot.startsWith(destination+'/'))throw invalid();
  const keys=Object.keys(expectedSourceSha256).toSorted();
  if(JSON.stringify(keys)!==JSON.stringify(files)||keys.some(key=>!/^[a-f0-9]{64}$/.test(expectedSourceSha256[key])))throw invalid();
  if(await realpath(sourceRoot)!==sourceRoot||!(await lstat(sourceRoot)).isDirectory())throw invalid();
  await privateParent(destination);
  const reviewed=await Promise.all(files.map(async path=>({path,data:await sourceBytes(sourceRoot,path,expectedSourceSha256[path])})));
  // mkdir without recursive is exclusive even if another caller creates a target after validation.
  await mkdir(destination,{mode:0o700});
  for(const folder of ['operations','http'])await mkdir(join(destination,folder),{mode:0o700});
  for(const row of reviewed)await writeExclusive(join(destination,row.path),row.data);
  // Refuse completion if reviewed input changed while the output was being written.
  await Promise.all(files.map(path=>sourceBytes(sourceRoot,path,expectedSourceSha256[path])));
  const rows=reviewed.map(row=>({path:row.path,bytes:row.data.length,sha256:sha(row.data)}));
  const manifest=manifestOf(rows);
  for(const folder of ['operations','http'])await chmod(join(destination,folder),0o500);
  await writeExclusive(join(destination,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  await chmod(destination,0o500);
  return await verifyClientProofBundle({destination,expectedBundleId:manifest.bundleId});
 }catch{throw invalid();}
}

async function sealed(path,directory=false){
 const stat=await lstat(path);
 if(stat.uid!==process.getuid()||stat.isSymbolicLink()||await realpath(path)!==path||(stat.mode&0o777)!==(directory?0o500:0o400)||(directory?!stat.isDirectory():!stat.isFile()))throw invalid();
 return stat;
}
async function manifestBytes(path){
 const stat=await sealed(path);if(stat.size>16384)throw invalid();
 const handle=await open(path,constants.O_RDONLY|constants.O_NOFOLLOW);
 try{return await handle.readFile();}finally{await handle.close();}
}
/** Verify both the externally selected identity and the sealed exact module inventory. */
export async function verifyClientProofBundle({destination,expectedBundleId}){
 try{
  if(!absolute(destination)||!/^[a-f0-9]{64}$/.test(expectedBundleId))throw invalid();
  await privateParent(destination);await sealed(destination,true);
  if(!isDeepStrictEqual((await readdir(destination)).toSorted(),['http','manifest.json','operations']))throw invalid();
  for(const folder of ['http','operations']){
   await sealed(join(destination,folder),true);
   const expected=files.filter(path=>path.startsWith(folder+'/')).map(path=>path.slice(folder.length+1)).toSorted();
   if(!isDeepStrictEqual((await readdir(join(destination,folder))).toSorted(),expected))throw invalid();
  }
  const input=JSON.parse(await manifestBytes(join(destination,'manifest.json')));
  if(!Array.isArray(input.files)||input.files.length!==files.length)throw invalid();
  const rows=await Promise.all(files.map(async(path,index)=>{
   const row=input.files[index];
   if(!row||row.path!==path||!/^[a-f0-9]{64}$/.test(row.sha256)||!Number.isSafeInteger(row.bytes)||row.bytes<0)throw invalid();
   await sealed(join(destination,path));
   const data=await sourceBytes(destination,path,row.sha256);
   if(data.length!==row.bytes)throw invalid();
   return {path,bytes:data.length,sha256:sha(data)};
  }));
  const manifest=manifestOf(rows);
  if(manifest.bundleId!==expectedBundleId||!isDeepStrictEqual(manifest,input))throw invalid();
  return {manifest,entryPath:join(destination,manifest.entryPath)};
 }catch{throw Error('Invalid client proof bundle verification.');}
}
