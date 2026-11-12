import {test} from 'node:test';
import assert from 'node:assert/strict';
import {planStoryTunnelRoutes,publicStoryTunnelPlan,verifyStoryTunnelSnapshot} from './client-proof-route-plan.mjs';
const story='story.knolquiz.com',alias='story-next.knolquiz.com';
const snapshot=()=>({version:7,config:{originRequest:{connectTimeout:17},ingress:[{hostname:'other.example',service:'http://127.0.0.1:4100',originRequest:{httpHostHeader:'other.example'}},{hostname:alias,service:'http://127.0.0.1:15501',originRequest:{}},{hostname:story,service:'http://127.0.0.1:15501'},{hostname:'private.example',service:'http://127.0.0.1:4200',originRequest:{secretFixture:'must-not-be-published'}},{service:'http_status:404'}]}});
const socketPath='/private/fixture/g.sock';
test('plan changes only the two owned services and preserves caller snapshot, all other rules and order',()=>{
 const input=snapshot(),before=structuredClone(input),plan=planStoryTunnelRoutes(input,{socketPath});
 assert.deepEqual(input,before);assert.equal(plan.version,7);assert.equal(plan.config.ingress.length,5);
 assert.deepEqual(plan.config.ingress[0],input.config.ingress[0]);assert.deepEqual(plan.config.ingress[3],input.config.ingress[3]);assert.deepEqual(plan.config.ingress[4],input.config.ingress[4]);assert.deepEqual(plan.config.originRequest,input.config.originRequest);
 for(const index of [1,2])assert.deepEqual(plan.config.ingress[index],{...input.config.ingress[index],service:'unix:'+socketPath});
 const publicPlan=publicStoryTunnelPlan(plan);assert.equal(publicPlan.changedRules,2);assert.equal(publicPlan.preservedRules,3);assert.equal(publicPlan.version,7);
 assert.equal(JSON.stringify(publicPlan).includes('must-not-be-published'),false);assert.equal(JSON.stringify(publicPlan).includes('private.example'),false);assert.equal(JSON.stringify(publicPlan).includes(socketPath),false);
 assert.equal(verifyStoryTunnelSnapshot(plan,input),true);
});
test('drift in version or any unrelated config prevents applying an old plan',()=>{
 const input=snapshot(),plan=planStoryTunnelRoutes(input,{socketPath});
 assert.throws(()=>verifyStoryTunnelSnapshot(plan,{...input,version:8}),/changed/);
 const changed=structuredClone(input);changed.config.ingress[0].service='http://127.0.0.1:4300';assert.throws(()=>verifyStoryTunnelSnapshot(plan,changed),/changed/);
});
test('invalid topology and unsafe path do not produce an executable configuration',()=>{
 const cases=[undefined,{version:0,config:{}},{version:7,config:{ingress:[]}}];
 for(const input of cases)assert.throws(()=>planStoryTunnelRoutes(input,{socketPath}));
 for(const path of ['relative','/private/a/../g.sock','/private/g.sock\n','/'.repeat(101)])assert.throws(()=>planStoryTunnelRoutes(snapshot(),{socketPath:path}));
 for(const mutation of [v=>v.config.ingress.splice(1,1),v=>v.config.ingress.push({...v.config.ingress[2]}),v=>v.config.ingress[2].service='http://127.0.0.1:99',v=>v.config.ingress[2].path='/api/.*',v=>v.config.ingress.at(-1).path='/only-this',v=>v.config.ingress.unshift({service:'http_status:404'}),v=>v.config.ingress.unshift({hostname:'',service:'http_status:404'}),v=>v.config.ingress.unshift({hostname:'*.knolquiz.com',service:'http://127.0.0.1:1'})]){
  const input=snapshot();mutation(input);assert.throws(()=>planStoryTunnelRoutes(input,{socketPath}));
 }
});

test('version zero and private dot directories remain valid while mutated drafts are rejected',()=>{
 const input=snapshot();input.version=0;const plan=planStoryTunnelRoutes(input,{socketPath:'/private/.local/g.sock'});assert.equal(plan.version,0);assert.equal(verifyStoryTunnelSnapshot(plan,input),true);plan.config.ingress[0].service='http://127.0.0.1:9';assert.throws(()=>verifyStoryTunnelSnapshot(plan,input),/changed/);
});
