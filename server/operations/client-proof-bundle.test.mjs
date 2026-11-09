import {test,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,realpath,lstat,chmod,symlink,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {prepareClientProofBundle,verifyClientProofBundle} from './client-proof-bundle.mjs';
const files=['operations/client-proof-gateway.mjs','operations/production-ingress.mjs','operations/trusted-ingress-socket.mjs','http/client-bucket-proof.mjs'];
const cleanups=[];afterEach(async()=>{for(const fn of cleanups.splice(0).reverse())await fn();});
async function fixture(){
 const root=await realpath(await mkdtemp(join(tmpdir(),'kb-')));cleanups.push(async()=>{await chmod(root,0o700);for(const name of ['out','out/operations','out/http'])await chmod(join(root,name),0o700).catch(()=>{});await rm(root,{recursive:true});});
 const sourceRoot=resolve('server'),expectedSourceSha256=Object.fromEntries(await Promise.all(files.map(async name=>[name,createHash('sha256').update(await readFile(join(sourceRoot,name))).digest('hex')])));
 return {root,sourceRoot,expectedSourceSha256,destination:join(root,'out')};
}
test('writes only reviewed module bytes, relative receipt and a sealed independent module tree',async()=>{
 const input=await fixture(),result=await prepareClientProofBundle(input);
 assert.equal(result.manifest.format,'knolstory-client-proof-bundle-v1');assert.equal(result.manifest.files.length,4);
 assert.equal(JSON.stringify(result.manifest).includes(input.sourceRoot),false);assert.equal(JSON.stringify(result.manifest).includes(input.destination),false);
 assert.equal((await lstat(input.destination)).mode&0o777,0o500);
 for(const row of result.manifest.files){assert.equal(row.sha256,input.expectedSourceSha256[row.path]);assert.equal((await lstat(join(input.destination,row.path))).mode&0o777,0o400);assert.equal(createHash('sha256').update(await readFile(join(input.destination,row.path))).digest('hex'),row.sha256);}
 assert.deepEqual(JSON.parse(await readFile(join(input.destination,'manifest.json'),'utf8')),result.manifest);
 const run=spawnSync(process.execPath,['--input-type=module','-e','import {createClientProofGateway} from "./operations/client-proof-gateway.mjs"; if(typeof createClientProofGateway!=="function")process.exit(1);'],{cwd:input.destination,encoding:'utf8'});assert.equal(run.status,0,run.stderr);
 await assert.rejects(()=>prepareClientProofBundle(input));
});
test('stale, missing or extra review hashes refuse before creating a destination',async()=>{
 const input=await fixture();
 for(const expectedSourceSha256 of [{},{...input.expectedSourceSha256,'http/private-key':'a'.repeat(64)},{...input.expectedSourceSha256,[files[0]]:'0'.repeat(64)}]){
  await assert.rejects(()=>prepareClientProofBundle({...input,expectedSourceSha256}));await assert.rejects(()=>lstat(input.destination),{code:'ENOENT'});
 }
});
test('existing destination, symlink destination and unsafe parent are preserved',async()=>{
 const input=await fixture();await mkdir(input.destination);await writeFile(join(input.destination,'owner'),'kept');await assert.rejects(()=>prepareClientProofBundle(input));assert.equal(await readFile(join(input.destination,'owner'),'utf8'),'kept');
 await symlink(input.destination,join(input.root,'link'));await assert.rejects(()=>prepareClientProofBundle({...input,destination:join(input.root,'link')}));assert.equal((await lstat(join(input.root,'link'))).isSymbolicLink(),true);
 await chmod(input.root,0o755);await assert.rejects(()=>prepareClientProofBundle({...input,destination:join(input.root,'new')}));await chmod(input.root,0o700);
});
test('source links, nonfiles, unsafe paths and malformed review input refuse',async()=>{
 const input=await fixture();await symlink(input.sourceRoot,join(input.root,'source-link'));
 await assert.rejects(()=>prepareClientProofBundle({...input,sourceRoot:join(input.root,'source-link')}));
 for(const destination of ['relative',join(input.root,'a','..','b')+'/..'])await assert.rejects(()=>prepareClientProofBundle({...input,destination}));
 await assert.rejects(()=>prepareClientProofBundle({...input,expectedSourceSha256:{...input.expectedSourceSha256,[files[0]]:'not-a-hash'}}));
});

test('concurrent writers leave exactly one completed destination and do not replace it',async()=>{
 const input=await fixture();const results=await Promise.allSettled([prepareClientProofBundle(input),prepareClientProofBundle(input)]);assert.equal(results.filter(row=>row.status==='fulfilled').length,1);assert.equal(results.filter(row=>row.status==='rejected').length,1);
 const success=results.find(row=>row.status==='fulfilled').value;assert.equal((await verifyClientProofBundle({destination:input.destination,expectedBundleId:success.manifest.bundleId})).manifest.bundleId,success.manifest.bundleId);
});
test('verification rejects changed bytes, wrong identity, added files and a manifest link',async()=>{
 const input=await fixture(),result=await prepareClientProofBundle(input);
 await assert.rejects(()=>verifyClientProofBundle({destination:input.destination,expectedBundleId:'0'.repeat(64)}));
 const file=join(input.destination,files[0]),original=await readFile(file);await chmod(file,0o600);await writeFile(file,'changed');await chmod(file,0o400);await assert.rejects(()=>verifyClientProofBundle({destination:input.destination,expectedBundleId:result.manifest.bundleId}));
 await chmod(file,0o600);await writeFile(file,original);await chmod(file,0o400);
 await chmod(input.destination,0o700);await writeFile(join(input.destination,'extra'),'unexpected');await chmod(input.destination,0o500);await assert.rejects(()=>verifyClientProofBundle({destination:input.destination,expectedBundleId:result.manifest.bundleId}));
 await chmod(input.destination,0o700);await rm(join(input.destination,'extra'));await rm(join(input.destination,'manifest.json'));await symlink(file,join(input.destination,'manifest.json'));await chmod(input.destination,0o500);
 await assert.rejects(()=>verifyClientProofBundle({destination:input.destination,expectedBundleId:result.manifest.bundleId}));
});

test('individual source symlinks and directories cannot enter a reviewed bundle',async()=>{
 const input=await fixture(),sourceRoot=join(input.root,'source');await mkdir(sourceRoot);await mkdir(join(sourceRoot,'operations'));await mkdir(join(sourceRoot,'http'));
 for(const name of files)await writeFile(join(sourceRoot,name),await readFile(join(input.sourceRoot,name)));
 const target=join(sourceRoot,files[0]);await rm(target);await symlink(join(input.sourceRoot,files[0]),target);await assert.rejects(()=>prepareClientProofBundle({...input,sourceRoot}));
 await rm(target);await mkdir(target);await assert.rejects(()=>prepareClientProofBundle({...input,sourceRoot}));
 await assert.rejects(()=>lstat(input.destination),{code:'ENOENT'});
});
