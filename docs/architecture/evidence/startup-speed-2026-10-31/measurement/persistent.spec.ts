// A real browser profile on disk (like a reader's Chrome), not Playwright's in-memory context:
// first visit with an empty profile, then a later visit after closing and reopening the browser.
// Produced ../live-before-deploy.json and ../live-after-deploy.json.
import {test,chromium} from '@playwright/test';
import {mkdtempSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {flow} from './flow';

test('first and later visit with a disk profile',async({baseURL},info)=>{
 test.setTimeout(900000);
 const profile=mkdtempSync(join(tmpdir(),'knol-perf-profile-'));
 const results=[];
 for(const label of ['first visit','later visit']){
  const context=await chromium.launchPersistentContext(profile,{baseURL,viewport:{width:1280,height:800}});
  const page=context.pages()[0]??await context.newPage();
  await page.addInitScript(()=>sessionStorage.setItem('knolstory-fullscreen-offered-v1','1'));
  results.push(await flow(page,label));
  await context.close();
 }
 const report={origin:baseURL,measuredAt:new Date().toISOString(),results};
 writeFileSync(info.outputPath('persistent.json'),JSON.stringify(report,null,1));
 console.log(JSON.stringify(report));
});
