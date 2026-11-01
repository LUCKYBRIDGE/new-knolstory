// Read-only deployed notice verification. Run from the repository root:
// node <this-file> https://story.knolquiz.com <output.json>
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {chromium} from '@playwright/test';
const [origin,output]=process.argv.slice(2);
if(!/^https:\/\/[a-z0-9.-]+$/.test(origin??'')||!output)throw Error('Expected https origin and output path.');
const paths=['licenses/README.md','licenses/RenPy-8.5.3-LICENSE.txt'];
const expected=paths.map(path=>({path,sha256:createHash('sha256').update(readFileSync('apps/web/public/'+path)).digest('hex')}));
const browser=await chromium.launch();
try{
 const page=await browser.newPage();await page.goto(origin);
 const files=await page.evaluate(async rows=>{
  const result=[];for(const row of rows){const response=await fetch('/'+row.path,{cache:'no-store'}),data=await response.arrayBuffer();const sha256=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',data))).map(v=>v.toString(16).padStart(2,'0')).join('');result.push({...row,status:response.status,observedSha256:sha256,bytes:data.byteLength,match:response.ok&&sha256===row.sha256});}return result;
 },expected);
 const report={origin,checkedAt:new Date().toISOString(),files,success:files.every(row=>row.match)};writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({origin,files:files.length,success:report.success}));if(!report.success)process.exitCode=1;
}finally{await browser.close();}
