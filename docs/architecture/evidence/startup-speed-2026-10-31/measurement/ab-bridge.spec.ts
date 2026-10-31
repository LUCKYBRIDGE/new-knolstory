// Before deploying a bridge change: the live site with only knol-bridge.js replaced. Both modes answer
// the bridge from a local file through the same Playwright route, so both have routing (and with it no
// HTTP cache) and differ only in the bridge. Empty disk profile each run, order ABBAABBA.
//   KNOL_BRIDGE_A=<deployed bridge.js> KNOL_BRIDGE_B=<changed bridge.js> KNOL_PERF_SPEC=ab-bridge.spec.ts ...
// Produced ../live-ab-early-game.json (A: as deployed, B: game.zip requested at once).
import {test,chromium} from '@playwright/test';
import {mkdtempSync,readFileSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {flow} from './flow';

const files={A:process.env.KNOL_BRIDGE_A,B:process.env.KNOL_BRIDGE_B};

test('first story open with the deployed and the changed bridge',async({baseURL},info)=>{
 test.setTimeout(3600000);
 if(!files.A||!files.B)throw Error('Set KNOL_BRIDGE_A and KNOL_BRIDGE_B to the two bridge files.');
 const body={A:readFileSync(files.A,'utf8'),B:readFileSync(files.B,'utf8')};
 const sha=(text:string)=>createHash('sha256').update(text).digest('hex');
 const results:unknown[]=[];
 for(const mode of ['A','B','B','A','A','B','B','A'] as const){
  const profile=mkdtempSync(join(tmpdir(),'knol-perf-ab-bridge-'));
  const context=await chromium.launchPersistentContext(profile,{baseURL,viewport:{width:1280,height:800}});
  let served=0;
  await context.route('**/runtime/knol-bridge.js*',route=>{served++;return route.fulfill({status:200,contentType:'text/javascript; charset=utf-8',headers:{'cache-control':'no-cache'},body:body[mode]});});
  const page=context.pages()[0]??await context.newPage();
  await page.addInitScript(()=>{sessionStorage.setItem('knolstory-fullscreen-offered-v1','1');const w=window as unknown as {__knolEvents:{t:number;stage:string;ratio?:number}[]};w.__knolEvents=[];addEventListener('message',event=>{const data=event.data as {type?:string;stage?:string;ratio?:number};if(data&&data.type==='loadProgress')w.__knolEvents.push({t:Math.round(performance.now()),stage:String(data.stage),ratio:data.ratio});});});
  const startedAt=new Date().toISOString();
  const result=await flow(page,`${mode} (${results.length+1})`);
  const events=await page.evaluate(()=>(window as unknown as {__knolEvents:{t:number;stage:string;ratio?:number}[]}).__knolEvents);
  const downloads=events.filter(item=>item.stage==='download');
  results.push({mode,startedAt,bridgeServed:served,...result,progress:{events:events.length,monotonic:downloads.every((item,index)=>index===0||(item.ratio??0)>=(downloads[index-1]!.ratio??0)),last:events.slice(-2).map(item=>item.stage+(item.ratio===undefined?'':':'+item.ratio))}});
  await context.close();
 }
 const report={origin:baseURL,measuredAt:new Date().toISOString(),order:'ABBAABBA',bridges:{A:{file:files.A,sha256:sha(body.A)},B:{file:files.B,sha256:sha(body.B)}},results};
 writeFileSync(info.outputPath('ab-bridge.json'),JSON.stringify(report,null,1));
 console.log(JSON.stringify(report));
});
