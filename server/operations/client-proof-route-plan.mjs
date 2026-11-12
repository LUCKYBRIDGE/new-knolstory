import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {isAbsolute,resolve} from 'node:path';
const hosts=['story.knolquiz.com','story-next.knolquiz.com'];
const previousService='http://127.0.0.1:15501';
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const invalid=()=>Error('Invalid story tunnel route snapshot or socket path.');
function validateSnapshot(input){
 try{
  if(!input||!Number.isSafeInteger(input.version)||input.version<0||!input.config||!isDeepStrictEqual(input,JSON.parse(JSON.stringify(input))))throw invalid();
  if(!Array.isArray(input.config.ingress)||input.config.ingress.length<3)throw invalid();
  const rows=input.config.ingress;
  if(rows.some(row=>!row||typeof row!=='object'||Array.isArray(row)))throw invalid();
  for(const hostname of hosts){
   const matches=rows.filter(row=>row.hostname===hostname);
   if(matches.length!==1||matches[0].service!==previousService||matches[0].path!==undefined)throw invalid();
  }
  const lastOwned=Math.max(...hosts.map(host=>rows.findIndex(row=>row.hostname===host)));
  if(rows.some((row,index)=>index<lastOwned&&(typeof row.hostname!=='string'||row.hostname===''||row.hostname.includes('*'))))throw invalid();
  const last=rows.at(-1);
  if(last.hostname!==undefined||last.path!==undefined||typeof last.service!=='string'||!/^http_status:[45]\d\d$/.test(last.service))throw invalid();
  return input;
 }catch{throw invalid();}
}
/** Pure draft only. Caller must keep full configurations private; this performs no remote write. */
export function planStoryTunnelRoutes(input,options){
 const snapshot=validateSnapshot(input),socketPath=options?.socketPath;
 if(typeof socketPath!=='string'||!isAbsolute(socketPath)||resolve(socketPath)!==socketPath||Buffer.byteLength(socketPath)>100||/[\x00-\x1f\x7f?#\\]/.test(socketPath))throw invalid();
 const config=structuredClone(snapshot.config);
 const next={...config,ingress:config.ingress.map(row=>hosts.includes(row.hostname)?{...row,service:'unix:'+socketPath}:row)};
 return {version:snapshot.version,beforeConfigSha256:hash(snapshot.config),afterConfigSha256:hash(next),socketPathSha256:hash(socketPath),config:next};
}
/** Re-fetch before a proposed update and reject observed drift. This is not remote atomic CAS. */
export function verifyStoryTunnelSnapshot(plan,input){
 try{
  const snapshot=validateSnapshot(input);
  if(snapshot.version!==plan.version||hash(snapshot.config)!==plan.beforeConfigSha256||hash(plan.config)!==plan.afterConfigSha256)throw Error();
  return true;
 }catch{throw Error('Tunnel configuration changed; create a new plan.');}
}
/** Public review data deliberately excludes raw socket paths and unrelated route contents. */
export function publicStoryTunnelPlan(plan){
 return {version:plan.version,beforeConfigSha256:plan.beforeConfigSha256,afterConfigSha256:plan.afterConfigSha256,socketPathSha256:plan.socketPathSha256,changedRules:hosts.length,preservedRules:plan.config.ingress.length-hosts.length,hostnames:[...hosts],previousService,nextServiceKind:'unix',atomicUpdateProven:false,scope:'Draft only; no remote update, credentials or process restart.'};
}
