import {realpath,lstat} from 'node:fs/promises';
import {isAbsolute,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {verifyClientProofBundle} from './client-proof-bundle.mjs';
const label='com.knolstory.client-proof-gateway';
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const invalid=()=>Error('Invalid client proof launch draft.');
const pathOk=value=>typeof value==='string'&&isAbsolute(value)&&resolve(value)===value&&value.length<=4096&&!/[\x00-\x1f\x7f]/.test(value);
function validate(options){
 const paths=[options.keyFile,options.socketPath,options.stdoutPath,options.stderrPath];
 if(paths.some(path=>!pathOk(path)||path===options.bundleRoot||path===options.nodePath||path.startsWith(options.bundleRoot+'/'))||new Set(paths).size!==paths.length||Buffer.byteLength(options.socketPath)>100)throw invalid();
 const origin=options.origin??'https://story.knolquiz.com',alias=options.aliasOrigin??'https://story-next.knolquiz.com',upstream=options.upstreamOrigin??'http://127.0.0.1:15501';
 const validOrigin=value=>/^https:\/\/story(?:-[a-z0-9]+(?:-[a-z0-9]+)*)?\.knolquiz\.com$/.test(value)&&new URL(value).origin===value;
 if(!validOrigin(origin)||(alias!==''&&(!validOrigin(alias)||alias===origin)))throw invalid();
 const url=new URL(upstream);
 if(url.protocol!=='http:'||url.hostname!=='127.0.0.1'||!url.port||url.origin!==upstream)throw invalid();
 return {origin,alias,upstream};
}
const escape=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&apos;');
function xml(value){
 if(typeof value==='boolean')return value?'<true/>':'<false/>';
 if(typeof value==='number')return '<integer>'+value+'</integer>';
 if(typeof value==='string')return '<string>'+escape(value)+'</string>';
 if(Array.isArray(value))return '<array>'+value.map(xml).join('')+'</array>';
 return '<dict>'+Object.entries(value).map(([key,item])=>'<key>'+escape(key)+'</key>'+xml(item)).join('')+'</dict>';
}
/** Private draft only: no launchctl, installation, log creation or key reads. */
export async function createClientProofLaunchDraft(options){
 try{
  const settings=validate(options);
  if(!pathOk(options.nodePath)||options.nodePath!==await realpath(process.execPath)||Number(process.versions.node.split('.')[0])<22)throw invalid();
  const node=await lstat(options.nodePath);
  if(!node.isFile()||(node.mode&0o111)===0||![0,process.getuid()].includes(node.uid))throw invalid();
  const bundle=await verifyClientProofBundle({destination:options.bundleRoot,expectedBundleId:options.expectedBundleId});
  const configuration={Label:label,ProgramArguments:[options.nodePath,bundle.entryPath],EnvironmentVariables:{KNOLSTORY_PUBLIC_ORIGIN:settings.origin,KNOLSTORY_REDIRECT_FROM_ORIGIN:settings.alias,KNOLSTORY_INGRESS_SOCKET:options.socketPath,KNOLSTORY_CLIENT_PROOF_KEY_FILE:options.keyFile,KNOLSTORY_PROOF_GATEWAY_ORIGIN:settings.upstream},RunAtLoad:true,KeepAlive:false,ThrottleInterval:30,ExitTimeOut:15,Umask:63,StandardOutPath:options.stdoutPath,StandardErrorPath:options.stderrPath};
  const plist='<?xml version="1.0" encoding="UTF-8"?>\n<plist version="1.0">'+xml(configuration)+'</plist>\n';
  return {configuration,plist,review:{label,bundleId:bundle.manifest.bundleId,configurationSha256:hash(configuration),nodeVersion:process.versions.node,uid:process.getuid(),installed:false,productionKeyRead:false,recovery:'manual-after-stale-socket-check',automaticRestart:false,limits:['Draft does not verify future log/key/socket directory permissions or install a job.','After a crash, verify listener absence and owned stale socket before manual recovery; this draft does not delete sockets or provide automatic crash recovery.']}};
 }catch{throw invalid();}
}
