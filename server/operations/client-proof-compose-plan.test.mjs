import {test} from 'node:test';
import assert from 'node:assert/strict';
import {planClientProofCompose,verifyClientProofComposeSnapshot} from './client-proof-compose-plan.mjs';
const ports=[{mode:'ingress',host_ip:'127.0.0.1',target:8080,published:'15501',protocol:'tcp'}];
const source=()=>({name:'knolstory-next-production',services:{db:{image:'postgres:16-bookworm',volumes:[{source:'data',target:'/data'}]},migration:{image:'old-api',profiles:['tools']},api:{image:'old-api',build:{context:'review'},user:'501:20',environment:{KNOLSTORY_AUTH_ORIGIN:'https://story.knolquiz.com',PGPASSWORD_FILE:'/run/app/password'},volumes:[{source:'/private/app',target:'/run/app',read_only:true}],networks:{service:null}},ingress:{image:'old-ingress',build:{context:'review'},environment:{KNOLSTORY_PUBLIC_ORIGIN:'https://story.knolquiz.com'},ports,networks:{service:null,edge:null}}},networks:{service:{internal:true},edge:{}},volumes:{data:{}}});
const input=config=>({config:config??source(),apiImage:'sha256:'+'a'.repeat(64),ingressImage:'sha256:'+'b'.repeat(64),keyFile:'/private/proof/key',uid:501,gid:20});
test('changes only reviewed service inputs and preserves unrelated configuration immutably',()=>{
 const config=source(),before=structuredClone(config),plan=planClientProofCompose(input(config));assert.deepEqual(config,before);
 for(const name of ['db','migration'])assert.deepEqual(plan.config.services[name],before.services[name]);
 for(const key of ['networks','volumes','name'])assert.deepEqual(plan.config[key],before[key]);
 for(const name of ['api','ingress']){
  const next=plan.config.services[name];assert.equal(next.build,undefined);assert.equal(next.pull_policy,'never');assert.equal(next.user,'501:20');
  assert.deepEqual(next.volumes.at(-1),{type:'bind',source:'/private/proof/key',target:'/run/knolstory-client-proof-key',read_only:true,bind:{create_host_path:false}});
 }
 assert.equal(plan.config.services.api.environment.PGPASSWORD_FILE,'/run/app/password');assert.deepEqual(plan.config.services.ingress.ports,ports);
 assert.equal(JSON.stringify(plan.review).includes('/private/proof/key'),false);assert.equal(plan.review.changedServices,2);assert.equal(verifyClientProofComposeSnapshot(plan,before),true);
});
test('rejects mutable image names, invalid identities and paths',()=>{
 for(const change of [{apiImage:'api:latest'},{ingressImage:'sha256:no'},{uid:0},{uid:1.5},{gid:-1},{keyFile:'relative'},{keyFile:'/a/../key'},{keyFile:'/a\nkey'}])assert.throws(()=>planClientProofCompose({...input(),...change}));
});
test('refuses wrong project, API UID, origin and unexpected published paths',()=>{
 const cases=[c=>c.name='other',c=>c.services.api.user='1000:1000',c=>c.services.api.environment.KNOLSTORY_AUTH_ORIGIN='http://unsafe',c=>c.services.ingress.environment.KNOLSTORY_PUBLIC_ORIGIN='https://other.example',c=>c.services.api.ports=[{target:4000}],c=>c.services.db.ports=[{target:5432}],c=>c.services.ingress.ports=[{...ports[0],host_ip:'0.0.0.0'}]];
 for(const mutate of cases){const c=source();mutate(c);assert.throws(()=>planClientProofCompose(input(c)));}
});
test('refuses existing proof/socket modes and ambiguous key mount or missing service structure',()=>{
 for(const mutate of [c=>c.services.api.environment.KNOLSTORY_CLIENT_PROOF_KEY_FILE='/old',c=>c.services.ingress.environment.KNOLSTORY_CLIENT_PROOF_KEY_FILE='/old',c=>c.services.ingress.environment.KNOLSTORY_INGRESS_SOCKET='/old',c=>c.services.api.volumes.push({target:'/run/knolstory-client-proof-key'}),c=>c.services.api.volumes='unsafe',c=>delete c.services.db,c=>c.services.api.environment=null]){const c=source();mutate(c);assert.throws(()=>planClientProofCompose(input(c)));}
});
test('snapshot drift or mutated plan is rejected before proposed activation',()=>{
 const c=source(),plan=planClientProofCompose(input(c));c.services.ingress.image='changed';assert.throws(()=>verifyClientProofComposeSnapshot(plan,c));
 const original=source(),other=planClientProofCompose(input(original));other.config.services.db.image='changed';assert.throws(()=>verifyClientProofComposeSnapshot(other,original));
});
