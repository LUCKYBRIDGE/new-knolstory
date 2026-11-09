/** Read-only host inspection plus a separate disposable path fixture. Never install or create production keys. */
import {readFile,writeFile,realpath,mkdtemp,chmod,rm,lstat} from 'node:fs/promises';
import {resolve,join,dirname} from 'node:path';
import {homedir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {inspectClientProofPaths} from '../../../../../server/operations/client-proof-preflight.mjs';
const root=resolve(import.meta.dirname,'../../../../..'),base=resolve(import.meta.dirname,'..');
const label='com.knolstory.client-proof-gateway',uid=process.getuid();
const locations=JSON.parse(await readFile(join(root,'.cache/proof-managed-private-locations.json'),'utf8'));
const sealed=JSON.parse(await readFile(join(base,'sealed-bundle.json'),'utf8'));
const decoded=spawnSync('plutil',['-convert','json','-o','-',locations.plist],{encoding:'utf8',timeout:5000});
if(decoded.status!==0)throw Error('Cannot decode private draft.');
const draft=JSON.parse(decoded.stdout),env=draft.EnvironmentVariables;
const serviceQueries=['gui/'+uid,'user/'+uid,'system'].map(domain=>{
 const value=spawnSync('launchctl',['print',domain+'/'+label],{encoding:'utf8',timeout:5000});
 if(value.error||(value.status!==0&&!(value.status===113&&value.stderr.includes('Could not find service'))))throw Error('Cannot determine service absence.');
 return {domainKind:domain.split('/')[0],found:value.status===0};
});
const serviceFiles=[join(homedir(),'Library/LaunchAgents',label+'.plist'),join('/Library/LaunchAgents',label+'.plist'),join('/Library/LaunchDaemons',label+'.plist')];
const exists=async path=>{try{await lstat(path);return true;}catch(error){if(error.code==='ENOENT')return false;throw error;}};
const installedPlistExists=(await Promise.all(serviceFiles.map(exists))).some(Boolean);
const existingServiceLabels=serviceQueries.some(row=>row.found)||installedPlistExists?[label]:[];
const selected={bundleRoot:locations.destination,expectedBundleId:sealed.bundle.bundleId,nodePath:draft.ProgramArguments[0],keyFile:env.KNOLSTORY_CLIENT_PROOF_KEY_FILE,socketPath:env.KNOLSTORY_INGRESS_SOCKET,stdoutPath:draft.StandardOutPath,stderrPath:draft.StandardErrorPath,existingServiceLabels};
let writableNodeAncestors=0;
for(let path=dirname(selected.nodePath);;path=dirname(path)){const stat=await lstat(path);if((stat.mode&0o022)!==0&&(stat.mode&0o1000)===0)writableNodeAncestors++;if(path===dirname(path))break;}
const before=await Promise.all([selected.keyFile,selected.socketPath,selected.stdoutPath,selected.stderrPath].map(exists));
let proposedPathsReady=false;
try{await inspectClientProofPaths(selected);proposedPathsReady=true;}catch{/* Expected while the selected production key is intentionally absent. */}
if(proposedPathsReady||before.some(Boolean))throw Error('Review draft unexpectedly has active path artifacts.');
const fixture=await realpath(await mkdtemp(join(root,'.cache/proof-path-fixture-')));await chmod(fixture,0o700);
let fixtureSummary;
try{
 const keyFile=join(fixture,'fixture-key');await writeFile(keyFile,'ab'.repeat(32)+'\n',{mode:0o600,flag:'wx'});
 fixtureSummary=await inspectClientProofPaths({...selected,nodePath:await realpath(process.execPath),keyFile,socketPath:join(fixture,'gateway.sock'),stdoutPath:join(fixture,'stdout.log'),stderrPath:join(fixture,'stderr.log')});
}finally{await rm(fixture,{recursive:true});}
const after=await Promise.all([selected.keyFile,selected.socketPath,selected.stdoutPath,selected.stderrPath].map(exists));
if(JSON.stringify(before)!==JSON.stringify(after))throw Error('Selected paths changed during inspection.');
const report={checkedAt:new Date().toISOString(),scope:'Actual read-only service/path snapshot; separate disposable fixture tests preparation only.',serviceQueries,installedPlistExists,writableNodeAncestors,selectedDraftProbeScope:'Runs under the private fixture executable; original draft Node differs from process.execPath, so rejection alone does not isolate the ancestor guard. Writable ancestor count is a separate direct metadata observation; original-process unit wrapper proves rejection under the original Node.',proposedPathsReady,selectedArtifactsAbsent:true,selectedArtifactsPreserved:true,fixtureSummary,fixtureRemoved:!await exists(fixture),productionKeyCreated:false,productionKeyRead:false,serviceInstalled:false,limits:['Selected candidate key is intentionally absent and selected Homebrew Node ancestor permits group writes; deployment is not ready or authorized.','Service/path checks are a snapshot; recheck immediately before separately approved installation.','No launchd bootstrap, crash recovery, Tunnel UDS or real edge header behavior proven.']};
await writeFile(join(base,'preflight-host-2026-11-04.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({serviceConflict:false,selectedPathsReady:false,fixturePassed:true,productionChanged:false}));
