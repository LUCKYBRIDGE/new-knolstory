import {test,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,realpath,chmod,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {prepareClientProofBundle} from './client-proof-bundle.mjs';
import {createClientProofLaunchDraft} from './client-proof-launch.mjs';
const roots=[];afterEach(async()=>{for(const root of roots.splice(0)){for(const name of ['bundle','bundle/operations','bundle/http'])await chmod(join(root,name),0o700).catch(()=>{});await rm(root,{recursive:true});}});
async function fixture(){
 const root=await realpath(await mkdtemp(join(tmpdir(),'kl-')));roots.push(root);
 const sourceRoot=resolve('server'),files=['operations/client-proof-gateway.mjs','operations/production-ingress.mjs','operations/trusted-ingress-socket.mjs','http/client-bucket-proof.mjs'];
 const expectedSourceSha256=Object.fromEntries(await Promise.all(files.map(async path=>[path,createHash('sha256').update(await readFile(join(sourceRoot,path))).digest('hex')])));
 const bundleRoot=join(root,'bundle'),bundle=await prepareClientProofBundle({sourceRoot,destination:bundleRoot,expectedSourceSha256});
 return {root,bundleRoot,expectedBundleId:bundle.manifest.bundleId,nodePath:await realpath(process.execPath),keyFile:join(root,'future-key'),socketPath:join(root,'g.sock'),stdoutPath:join(root,'out.log'),stderrPath:join(root,'error.log')};
}
test('draft uses only verified absolute bundle entry, fixed label and file paths; plutil accepts it without installation',async()=>{
 const input=await fixture(),draft=await createClientProofLaunchDraft(input);
 assert.deepEqual(draft.configuration.ProgramArguments,[input.nodePath,join(input.bundleRoot,'operations/client-proof-gateway.mjs')]);assert.equal(draft.configuration.Label,'com.knolstory.client-proof-gateway');assert.equal(draft.configuration.KeepAlive,false);assert.equal(draft.configuration.RunAtLoad,true);assert.equal(draft.configuration.Umask,63);assert.equal(draft.configuration.ExitTimeOut,15);assert.equal('WorkingDirectory' in draft.configuration,false);
 assert.equal(draft.review.installed,false);assert.equal(draft.review.productionKeyRead,false);assert.equal(draft.review.recovery,'manual-after-stale-socket-check');
 assert.equal(draft.configuration.EnvironmentVariables.KNOLSTORY_CLIENT_PROOF_KEY_FILE,input.keyFile);
 const path=join(input.root,'draft.plist');await writeFile(path,draft.plist,{mode:0o600});
 const validation=spawnSync('plutil',['-lint',path],{encoding:'utf8'});if(process.platform==='darwin')assert.equal(validation.status,0,validation.stderr);
});
test('unsafe path collisions, wrong bundle identity and arbitrary executable are rejected',async()=>{
 const input=await fixture();
 for(const change of [{keyFile:input.stdoutPath},{stdoutPath:input.nodePath},{stderrPath:input.stdoutPath},{socketPath:'relative'},{nodePath:'/bin/sh'},{expectedBundleId:'0'.repeat(64)},{stdoutPath:join(input.bundleRoot,'log')},{upstreamOrigin:'http://evil.test:1234'},{origin:'https://evil.test'}])await assert.rejects(()=>createClientProofLaunchDraft({...input,...change}));
});
test('paths with XML metacharacters are escaped and contain no raw markup injection',async()=>{
 const input=await fixture(),draft=await createClientProofLaunchDraft({...input,stdoutPath:join(input.root,'a&<b>.log')});assert.match(draft.plist,/a&amp;&lt;b&gt;\.log/);assert.equal(draft.plist.includes('a&<b>.log'),false);
});
