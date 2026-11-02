// Read-only public routing/auth guard check in a fresh anonymous browser.
import {chromium} from '@playwright/test';import {writeFileSync} from 'node:fs';
const browser=await chromium.launch();
try{
 const page=await browser.newPage();await page.goto('https://story.knolquiz.com/');
 const results=await page.evaluate(async()=>{
  const rows=[];
  for(const path of ['/api/v1/auth/config','/api/v1/documents']){
   const response=await fetch(path,{credentials:'omit',cache:'no-store'});rows.push({path,status:response.status});
  }
  return rows;
 });
 const result={origin:'https://story.knolquiz.com',checkedAt:new Date().toISOString(),scope:'fresh anonymous GET; no login, upload, DB writes or private response bodies',results,success:results[0].status===200&&results[1].status===401};
 writeFileSync('docs/architecture/evidence/api-catalog-alignment-2026-11-02/public-read-check.json',JSON.stringify(result,null,2)+'\n');console.log(result);if(!result.success)process.exitCode=1;
}finally{await browser.close();}
