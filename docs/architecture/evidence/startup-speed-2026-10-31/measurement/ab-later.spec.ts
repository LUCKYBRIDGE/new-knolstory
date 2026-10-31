// Same-time check that the stored brotli copies do not slow a later visit (browser closed and
// reopened, files in the disk cache): open the first built-in story once, reopen the browser,
// open it again. With the browser's normal Accept-Encoding and with br left out, order ABBA.
// Written on 2026-10-31 but NOT run yet: it answers the open later-visit question in ../checkpoint.json.
import {test,chromium} from '@playwright/test';
import {mkdtempSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {flow} from './flow';

type Mode={label:string;headers?:Record<string,string>};
const now:Mode={label:'stored brotli copies'};
const old:Mode={label:'br left out',headers:{'accept-encoding':'gzip, deflate, zstd'}};

test('later visit with and without the stored brotli copies',async({baseURL},info)=>{
 test.setTimeout(1800000);
 const results:unknown[]=[];
 for(const mode of [now,old,old,now]){
  const profile=mkdtempSync(join(tmpdir(),'knol-perf-ab-later-'));
  const rows=[];
  for(const visit of ['first visit','later visit']){
   const context=await chromium.launchPersistentContext(profile,{baseURL,viewport:{width:1280,height:800},extraHTTPHeaders:mode.headers});
   const page=context.pages()[0]??await context.newPage();
   await page.addInitScript(()=>sessionStorage.setItem('knolstory-fullscreen-offered-v1','1'));
   rows.push(await flow(page,`${mode.label} ${visit} (${results.length+1})`));
   await context.close();
  }
  const later=rows[1]!;
  results.push({mode:mode.label,firstStoryMs:rows[0]!.storyMs,later});
 }
 const report={origin:baseURL,measuredAt:new Date().toISOString(),order:'ABBA',results};
 writeFileSync(info.outputPath('ab-later.json'),JSON.stringify(report,null,1));
 console.log(JSON.stringify(report));
});
