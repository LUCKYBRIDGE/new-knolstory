// Returning reader: first visit opens one story; the second visit runs the full check once and
// remembers it; the third visit should skip it. Measures time to the first screen and the longest task.
// Produced ../live-returning-start.json (printed to the console).
import {test,expect,chromium} from '@playwright/test';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {flow} from './flow';

test('returning reader startup across visits',async({baseURL})=>{
 test.setTimeout(600000);
 const profile=mkdtempSync(join(tmpdir(),'knol-perf-visits-'));
 const first=await chromium.launchPersistentContext(profile,{baseURL,viewport:{width:1280,height:800}});
 const page=first.pages()[0]??await first.newPage();
 await page.addInitScript(()=>sessionStorage.setItem('knolstory-fullscreen-offered-v1','1'));
 const progress:unknown[]=[];
 await page.exposeFunction('__knolProgress',(value:unknown)=>{progress.push(value);});
 await page.addInitScript(()=>addEventListener('message',event=>{const data=event.data as {type?:string};if(data&&data.type==='loadProgress')(window as unknown as {__knolProgress:(v:unknown)=>void}).__knolProgress(data);}));
 const firstVisit=await flow(page,'first visit');await first.close();
 const visits=[];
 for(const label of ['second visit','third visit']){
  const later=await chromium.launchPersistentContext(profile,{baseURL,viewport:{width:1280,height:800}});
  const again=later.pages()[0]??await later.newPage();
  await again.addInitScript(()=>{sessionStorage.setItem('knolstory-fullscreen-offered-v1','1');const w=window as unknown as {__long:number[]};w.__long=[];try{new PerformanceObserver(list=>{for(const entry of list.getEntries())w.__long.push(Math.round(entry.duration));}).observe({type:'longtask',buffered:true});}catch{}});
  const started=Date.now();await again.goto('/',{waitUntil:'commit'});
  await expect.poll(()=>again.evaluate(()=>!document.querySelector('main[aria-label="화면 불러오는 중"]')&&!!document.querySelector('main')).catch(()=>false),{timeout:120000,intervals:[50]}).toBe(true);
  const firstScreenMs=Date.now()-started;
  const longestTaskMs=Math.max(0,...await again.evaluate(()=>(window as unknown as {__long:number[]}).__long));
  const checks=await again.evaluate(()=>localStorage.getItem('knolstory-workspace-checks-v1'));
  visits.push({label,firstScreenMs,longestTaskMs,checks:checks?JSON.parse(checks).fingerprints.length:0});
  await later.close();
 }
 console.log(JSON.stringify({firstVisit:{libraryMs:firstVisit.libraryMs,storyMs:firstVisit.storyMs},progress:progress.slice(0,4).concat(progress.slice(-3)),progressEvents:progress.length,visits}));
});
