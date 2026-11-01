// Exact same-origin bytes for the newly generated editor and progressive runtime images.
// Run from the repo root: node <this-file> https://story.knolquiz.com <output.json>
import {readFileSync,writeFileSync} from 'node:fs';
import {chromium} from '@playwright/test';
const [origin,output]=process.argv.slice(2);
if(!/^https:\/\/[a-z0-9.-]+$/.test(origin??'')||!output)throw Error('Expected HTTPS origin and output.');
const catalog=JSON.parse(readFileSync('packages/asset-registry/src/catalog.json','utf8'));
const expected=catalog.filter(a=>a.metadata.layeredStoryAsset).flatMap(a=>[a.src,'/runtime/game'+a.src].map(path=>({id:a.id,path,sha256:a.revision})));
const browser=await chromium.launch();
try{
 const page=await browser.newPage();await page.goto(origin);
 const files=await page.evaluate(async rows=>{
  const result=[];for(const row of rows){const response=await fetch(row.path,{cache:'no-store'}),data=await response.arrayBuffer();const observedSha256=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',data))).map(v=>v.toString(16).padStart(2,'0')).join('');result.push({...row,status:response.status,observedSha256,bytes:data.byteLength,match:response.ok&&observedSha256===row.sha256});}return result;
 },expected);
 const report={origin,checkedAt:new Date().toISOString(),files,success:files.every(row=>row.match)};writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({origin,files:files.length,success:report.success}));if(!report.success)process.exitCode=1;
}finally{await browser.close();}
