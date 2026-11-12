import {test,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,realpath,chmod,rm,writeFile,mkdir,symlink,lstat,link,copyFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {createServer} from 'node:net';
import {spawnSync} from 'node:child_process';
import {prepareClientProofBundle} from './client-proof-bundle.mjs';

const roots=[];
afterEach(async()=>{for(const root of roots.splice(0)){for(const name of ['bundle','bundle/operations','bundle/http'])await chmod(join(root,name),0o700).catch(()=>{});await rm(root,{recursive:true});}});
async function unsafeNodeAncestor(){
 for(let path=dirname(await realpath(process.execPath));;path=dirname(path)){
  const stat=await lstat(path);if(![0,process.getuid()].includes(stat.uid)||((stat.mode&0o022)!==0&&(stat.mode&0o1000)===0))return path;
  if(path===dirname(path))return undefined;
 }
}
async function fixture(){
 const root=await realpath(await mkdtemp(join(tmpdir(),'kp-')));roots.push(root);
 const sourceRoot=resolve('server'),files=['operations/client-proof-gateway.mjs','operations/production-ingress.mjs','operations/trusted-ingress-socket.mjs','http/client-bucket-proof.mjs'];
 const expectedSourceSha256=Object.fromEntries(await Promise.all(files.map(async path=>[path,createHash('sha256').update(await readFile(join(sourceRoot,path))).digest('hex')])));
 const bundleRoot=join(root,'bundle'),bundle=await prepareClientProofBundle({sourceRoot,destination:bundleRoot,expectedSourceSha256});
 const keyFile=join(root,'key');await writeFile(keyFile,'a'.repeat(64)+'\n',{mode:0o600});
 return {root,bundleRoot,expectedBundleId:bundle.manifest.bundleId,nodePath:await realpath(process.execPath),keyFile,socketPath:join(root,'g.sock'),stdoutPath:join(root,'out.log'),stderrPath:join(root,'error.log'),existingServiceLabels:[]};
}
const unsafeNode=await unsafeNodeAncestor();
if(unsafeNode){
 test('unsafe current Node ancestry requires private fixture executable for the full covered suite',async()=>{
  const input=await fixture();
  const nodePath=join(input.root,'fixture-node');await copyFile(process.execPath,nodePath);await chmod(nodePath,0o700);
  if(process.platform==='darwin'){
   const library='libnode.'+process.versions.modules+'.dylib';
   const source=join(dirname(dirname(await realpath(process.execPath))),'lib',library);
   if(await lstat(source).then(stat=>stat.isFile(),error=>{if(error.code==='ENOENT')return false;throw error;})){await copyFile(source,join(input.root,library));await chmod(join(input.root,library),0o400);}
  }
  const env=Object.fromEntries(Object.entries(process.env).filter(([name])=>name!=='NODE_TEST_CONTEXT'));
  const args=['--test','--experimental-test-coverage','--test-coverage-include=server/operations/client-proof-preflight.mjs','--test-coverage-lines=80','--test-coverage-branches=80','--test-coverage-functions=80',fileURLToPath(import.meta.url)];
  const child=spawnSync(nodePath,args,{encoding:'utf8',timeout:60000,env});
  assert.equal(child.status,0,child.stdout+child.stderr);
  assert.match(child.stdout,/# tests 8\b/);assert.match(child.stdout,/# pass 8\b/);
 });
}else{
const {inspectClientProofPaths}=await import('./client-proof-preflight.mjs');
test('accepts sealed bundle, private fixture paths and absent service without creating outputs or exposing paths',async()=>{
 const input=await fixture();const keyBefore=await lstat(input.keyFile);const result=await inspectClientProofPaths(input);
 assert.equal(result.ready,true);assert.equal(result.keyContentRead,false);assert.equal(result.serviceLabelAbsent,true);assert.equal(result.bundleId,input.expectedBundleId);
 assert.equal(JSON.stringify(result).includes(input.root),false);assert.equal(JSON.stringify(result).includes('a'.repeat(64)),false);assert.equal(Object.isFrozen(result),true);
 for(const path of [input.socketPath,input.stdoutPath,input.stderrPath])await assert.rejects(()=>lstat(path),{code:'ENOENT'});
 assert.equal((await lstat(input.keyFile)).mtimeMs,keyBefore.mtimeMs);
});
test('requires explicit service inventory and rejects registered gateway and malformed labels',async()=>{
 const input=await fixture();
 for(const existingServiceLabels of [undefined,null,'label',['com.knolstory.client-proof-gateway'],[''],[3],['same','same'],['contains space']])await assert.rejects(()=>inspectClientProofPaths({...input,existingServiceLabels}));
 assert.equal((await inspectClientProofPaths({...input,existingServiceLabels:['com.example.unrelated']})).ready,true);
});
test('key must be private regular current-owner single-link file of expected byte length',async()=>{
 const input=await fixture();await chmod(input.keyFile,0o644);await assert.rejects(()=>inspectClientProofPaths(input));await chmod(input.keyFile,0o600);
 await writeFile(input.keyFile,'short');await assert.rejects(()=>inspectClientProofPaths(input));await writeFile(input.keyFile,'a'.repeat(64));
 assert.equal((await inspectClientProofPaths(input)).ready,true);
 await link(input.keyFile,join(input.root,'key-hardlink'));await assert.rejects(()=>inspectClientProofPaths(input));
 await rm(join(input.root,'key-hardlink'));await rm(input.keyFile);await mkdir(input.keyFile);await assert.rejects(()=>inspectClientProofPaths(input));
});
test('rejects absent key, symlinks and nonprivate parents without changing them',async()=>{
 const input=await fixture();await assert.rejects(()=>inspectClientProofPaths({...input,keyFile:join(input.root,'missing')}));
 const alias=join(input.root,'alias');await symlink(input.keyFile,alias);await assert.rejects(()=>inspectClientProofPaths({...input,keyFile:alias}));
 const parent=join(input.root,'logs');await mkdir(parent,{mode:0o755});await assert.rejects(()=>inspectClientProofPaths({...input,stdoutPath:join(parent,'out')}));assert.equal((await lstat(parent)).mode&0o777,0o755);
 await chmod(parent,0o700);const parentAlias=join(input.root,'logs-link');await symlink(parent,parentAlias);await assert.rejects(()=>inspectClientProofPaths({...input,stdoutPath:join(parentAlias,'out')}));
});
test('existing sockets or ordinary files at socket path refuse and are preserved',async()=>{
 const input=await fixture();await writeFile(input.socketPath,'keep');await assert.rejects(()=>inspectClientProofPaths(input));assert.equal(await readFile(input.socketPath,'utf8'),'keep');await rm(input.socketPath);
 const server=createServer();await new Promise((done,fail)=>{server.once('error',fail);server.listen(input.socketPath,done);});
 try{await assert.rejects(()=>inspectClientProofPaths(input));assert.equal((await lstat(input.socketPath)).isSocket(),true);}finally{await new Promise(done=>server.close(done));}
});
test('logs may be absent or private regular files; unsafe log objects and hardlinks refuse',async()=>{
 const input=await fixture();await writeFile(input.stdoutPath,'existing',{mode:0o600});assert.equal((await inspectClientProofPaths(input)).ready,true);
 await chmod(input.stdoutPath,0o644);await assert.rejects(()=>inspectClientProofPaths(input));await chmod(input.stdoutPath,0o600);
 await link(input.stdoutPath,input.stderrPath);await assert.rejects(()=>inspectClientProofPaths(input));await rm(input.stderrPath);await symlink(input.stdoutPath,input.stderrPath);await assert.rejects(()=>inspectClientProofPaths(input));await rm(input.stderrPath);await mkdir(input.stderrPath);await assert.rejects(()=>inspectClientProofPaths(input));
});
test('rejects path collisions, traversal, oversized socket, wrong bundle and arbitrary Node path',async()=>{
 const input=await fixture();
 for(const change of [{keyFile:input.stdoutPath},{stdoutPath:input.stderrPath},{stdoutPath:input.nodePath},{keyFile:input.bundleRoot},{stdoutPath:join(input.bundleRoot,'out')},{socketPath:'relative'},{socketPath:input.root+'/a/../g.sock'},{socketPath:join(input.root,'a'.repeat(101))},{nodePath:'/bin/sh'},{expectedBundleId:'0'.repeat(64)}])await assert.rejects(()=>inspectClientProofPaths({...input,...change}));
});
test('private leaf parent does not excuse unsafe or symlinked ancestors',async()=>{
 const input=await fixture(),ancestor=join(input.root,'ancestor'),parent=join(ancestor,'private');await mkdir(ancestor,{mode:0o755});await mkdir(parent,{mode:0o700});
 const changed={...input,stdoutPath:join(parent,'out.log')};assert.equal((await inspectClientProofPaths(changed)).ready,true);
 await chmod(ancestor,0o777);await assert.rejects(()=>inspectClientProofPaths(changed));await chmod(ancestor,0o755);
 const alias=join(input.root,'ancestor-alias');await symlink(ancestor,alias);await assert.rejects(()=>inspectClientProofPaths({...input,stdoutPath:join(alias,'private','out.log')}));
});
}
