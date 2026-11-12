import {createHash} from 'node:crypto';
import {isAbsolute,resolve} from 'node:path';
import {isDeepStrictEqual} from 'node:util';
const target='/run/knolstory-client-proof-key';
const ports=[{mode:'ingress',host_ip:'127.0.0.1',target:8080,published:'15501',protocol:'tcp'}];
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const invalid=()=>Error('Invalid client proof compose draft; no lifecycle action performed.');
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
function validate(input){
 const {config,apiImage,ingressImage,keyFile,uid,gid}=input;
 if(!object(config)||config.name!=='knolstory-next-production'||![apiImage,ingressImage].every(value=>typeof value==='string'&&/^sha256:[a-f0-9]{64}$/.test(value))||!Number.isSafeInteger(uid)||uid<=0||!Number.isSafeInteger(gid)||gid<0||typeof keyFile!=='string'||!isAbsolute(keyFile)||resolve(keyFile)!==keyFile||/[\x00-\x1f\x7f]/.test(keyFile)||keyFile.length>4096)throw invalid();
 const services=config.services;
 if(!object(services)||!object(services.db)||!object(services.migration)||!object(services.api)||!object(services.ingress))throw invalid();
 const {api,ingress,db}=services;
 if(api.user!==uid+':'+gid||api.ports?.length||db.ports?.length||!isDeepStrictEqual(ingress.ports,ports))throw invalid();
 if(!object(api.environment)||!object(ingress.environment)||api.environment.KNOLSTORY_AUTH_ORIGIN!=='https://story.knolquiz.com'||ingress.environment.KNOLSTORY_PUBLIC_ORIGIN!=='https://story.knolquiz.com')throw invalid();
 for(const service of [api,ingress]){
  if(Object.hasOwn(service.environment,'KNOLSTORY_CLIENT_PROOF_KEY_FILE')||Object.hasOwn(service.environment,'KNOLSTORY_INGRESS_SOCKET')||service.volumes!==undefined&&!Array.isArray(service.volumes))throw invalid();
  if((service.volumes??[]).some(volume=>!object(volume)||volume.target===target))throw invalid();
 }
 if(!isDeepStrictEqual(config,JSON.parse(JSON.stringify(config))))throw invalid();
}
/** Pure private draft from resolved compose JSON. No key reads, writes, build or lifecycle action. */
export function planClientProofCompose(input){
 try{
  validate(input);
  const source=structuredClone(input.config);
  const services=Object.fromEntries(Object.entries(source.services).map(([name,service])=>{
   if(!['api','ingress'].includes(name))return [name,service];
   const {build,...rest}=service;void build;
   return [name,{...rest,image:name==='api'?input.apiImage:input.ingressImage,pull_policy:'never',user:input.uid+':'+input.gid,environment:{...service.environment,KNOLSTORY_CLIENT_PROOF_KEY_FILE:target},volumes:[...(service.volumes??[]),{type:'bind',source:input.keyFile,target,read_only:true,bind:{create_host_path:false}}]}];
  }));
  const config={...source,services},beforeConfigSha256=hash(input.config),afterConfigSha256=hash(config);
  return {beforeConfigSha256,afterConfigSha256,config,review:{apiImage:input.apiImage,ingressImage:input.ingressImage,uid:input.uid,gid:input.gid,keyFileSha256:hash(input.keyFile),changedServices:2,buildRemoved:true,keyMountReadOnly:true,missingKeyAutoCreation:false,databaseAndMigrationPreserved:true,scope:'Private draft only; fixed images must exist locally, actual key/permissions and separate activation approval remain required.'}};
 }catch{throw invalid();}
}
/** Point-in-time drift check; this does not lock Docker or authorize any update. */
export function verifyClientProofComposeSnapshot(plan,config){
 try{
  if(hash(config)!==plan.beforeConfigSha256||hash(plan.config)!==plan.afterConfigSha256)throw invalid();
  return true;
 }catch{throw Error('Compose configuration changed; prepare a new draft.');}
}
