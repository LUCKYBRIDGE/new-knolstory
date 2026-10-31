// Same-time comparison on the live site: an empty disk profile opens the first built-in story
// with the browser's normal Accept-Encoding (gets the stored brotli copies) and with br left out
// (gets renpy.data as before; renpy.wasm then comes compressed by Cloudflare instead of br).
// Order ABBA to balance a drifting line. The first normal run also records the real progress
// events and the host progress bar, and takes one screenshot while the bar is moving.
// Produced ../live-ab-encoding.json and ../live-stage-progress.png.
import {test,chromium,type Page} from '@playwright/test';
import {mkdtempSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {flow} from './flow';

type Mode={label:string;headers?:Record<string,string>};
const now:Mode={label:'stored brotli copies'};
const old:Mode={label:'br left out',headers:{'accept-encoding':'gzip, deflate, zstd'}};

async function watchProgress(page:Page){
 await page.addInitScript(()=>{
  const w=window as unknown as {__knolEvents:{t:number;stage:string;ratio?:number}[];__knolBar:{t:number;value:string|null;text:string}[]};
  w.__knolEvents=[];w.__knolBar=[];
  addEventListener('message',event=>{const data=event.data as {type?:string;stage?:string;ratio?:number};if(data&&data.type==='loadProgress')w.__knolEvents.push({t:Math.round(performance.now()),stage:String(data.stage),ratio:data.ratio});});
  let last='';
  setInterval(()=>{const loading=document.querySelector('[data-story-loading="stage"]');if(!loading)return;const bar=loading.querySelector('[role="progressbar"]');const value=bar?bar.getAttribute('aria-valuenow'):null;const text=(loading.textContent??'').replace(/\s+/g,' ').trim();const key=value+'|'+text;if(key!==last){last=key;w.__knolBar.push({t:Math.round(performance.now()),value,text});}},200);
 });
}

test('first story open with and without the stored brotli copies',async({baseURL},info)=>{
 test.setTimeout(1800000);
 const results:unknown[]=[];
 let progress:unknown=null;
 for(const mode of [now,old,old,now]){
  const profile=mkdtempSync(join(tmpdir(),'knol-perf-ab-'));
  const context=await chromium.launchPersistentContext(profile,{baseURL,viewport:{width:1280,height:800},extraHTTPHeaders:mode.headers});
  const page=context.pages()[0]??await context.newPage();
  await page.addInitScript(()=>sessionStorage.setItem('knolstory-fullscreen-offered-v1','1'));
  const record=mode===now&&progress===null;
  let shot:Promise<unknown>=Promise.resolve();
  if(record){
   await watchProgress(page);
   shot=(async()=>{
    const bar=page.locator('[data-story-loading="stage"] [role="progressbar"]');
    for(let i=0;i<1200;i++){const value=Number(await bar.getAttribute('aria-valuenow',{timeout:100}).catch(()=>null));if(value>=40&&value<99){await page.screenshot({path:info.outputPath('live-stage-progress.png')});return value;}await page.waitForTimeout(100);}
    return null;
   })();
  }
  const started=new Date().toISOString();
  const result=await flow(page,`${mode.label} (${results.length+1})`);
  results.push({...result,startedAt:started,acceptEncoding:mode.headers?.['accept-encoding']??'browser default'});
  if(record){
   const shotAt=await shot;
   const events=await page.evaluate(()=>(window as unknown as {__knolEvents:{t:number;stage:string;ratio?:number}[]}).__knolEvents);
   const bar=await page.evaluate(()=>(window as unknown as {__knolBar:{t:number;value:string|null;text:string}[]}).__knolBar);
   const downloads=events.filter(item=>item.stage==='download');
   const monotonic=downloads.every((item,index)=>index===0||(item.ratio??0)>=(downloads[index-1]!.ratio??0));
   const startAt=events.find(item=>item.stage==='start')?.t??null;
   const first=downloads[0]?.t??null;
   const crossing=(share:number)=>{const hit=downloads.find(item=>(item.ratio??0)>=share);return hit&&first!==null?hit.t-first:null;};
   progress={events:events.length,downloadEvents:downloads.length,monotonic,lastDownloadRatio:downloads.at(-1)?.ratio??null,startAfterFirstEventMs:startAt!==null&&first!==null?startAt-first:null,
    msFromFirstEventToShare:{'25%':crossing(0.25),'50%':crossing(0.5),'75%':crossing(0.75),'99%':crossing(0.99)},
    barSamples:bar.length,barValues:[...new Set(bar.map(item=>item.value))].length,barTexts:[...new Set(bar.map(item=>item.text.replace(/\d+%/,'N%')))],screenshotAtPercent:shotAt};
  }
  await context.close();
 }
 const report={origin:baseURL,measuredAt:new Date().toISOString(),order:'ABBA',results,progress};
 writeFileSync(info.outputPath('ab-encoding.json'),JSON.stringify(report,null,1));
 console.log(JSON.stringify(report));
});
