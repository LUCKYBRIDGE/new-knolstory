// Actual immutable exports behind the production ingress, one browser origin/cache.
// Run from repo root: node <this-file> <old-candidate> <new-candidate> <output.json>
// Does not mutate either export, the real service, or any user browser profile.
import {createServer,request} from 'node:http';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {chromium,expect} from '@playwright/test';
import {createProductionIngress} from '../../../../../server/operations/production-ingress.mjs';
const [beforeDir,afterDir,output]=process.argv.slice(2);
if(!beforeDir||!afterDir||!output)throw Error('Expected two immutable candidates and an output file.');
const servers=[];
async function listen(server){servers.push(server);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));return server.address().port;}
let browser;
try{
 const api=await listen(createServer((_req,res)=>{res.writeHead(503,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end('{"error":"offline test"}');}));
 const ports=[];
 for(const dir of [beforeDir,afterDir])ports.push(await listen(await createProductionIngress({staticRoot:resolve(dir,'site'),publicOrigin:'https://story.knolquiz.com',apiOrigin:`http://127.0.0.1:${api}`})));
 let active=0;
 // Host adapter only; response bytes and cache headers come from the real ingress.
 const port=await listen(createServer((req,res)=>{
  const upstream=request({hostname:'127.0.0.1',port:ports[active],path:req.url,method:req.method,headers:{...req.headers,host:'story.knolquiz.com'}},response=>{res.writeHead(response.statusCode,response.headers);response.pipe(res);});
  upstream.on('error',()=>{res.writeHead(502);res.end();});req.pipe(upstream);
 }));
 browser=await chromium.launch();const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 const url=`http://127.0.0.1:${port}/?view=editor`;
 await page.goto(url);await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 const state=page.getByTestId('story-runtime-status');
 const ready=()=>expect.poll(async()=>Number(await state.getAttribute('data-rendered-revision'))>=0&&await state.getAttribute('data-rendered-revision')===await state.getAttribute('data-scene-revision'),{timeout:120000}).toBe(true);
 await ready();
 const text=page.locator('textarea[aria-label$="컷 글"]').first();await text.fill('이전 배포에서 작성한 글을 새 배포에서도 이어 씁니다.');await text.blur();await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 const stored=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')).document.project);
 const manuscript=await stored(),oldScripts=await page.evaluate(()=>[...document.scripts].map(n=>new URL(n.src,location.href).pathname).filter(p=>p.startsWith('/_next/static/')));
 const oldResources=await page.evaluate(()=>performance.getEntriesByType('resource').map(r=>({name:new URL(r.name).pathname,transferSize:r.transferSize})));active=1;
 const response=await page.reload();await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');await ready();
 expect(await stored()).toEqual(manuscript);await expect(text).toHaveValue('이전 배포에서 작성한 글을 새 배포에서도 이어 씁니다.');
 const newScripts=await page.evaluate(()=>[...document.scripts].map(n=>new URL(n.src,location.href).pathname).filter(p=>p.startsWith('/_next/static/')));
 expect(newScripts).not.toEqual(oldScripts);
 const manifest=JSON.parse(readFileSync(resolve(afterDir,'manifest.json'),'utf8')),files=new Set(manifest.files.map(row=>'/'+row.path));expect(newScripts.every(path=>files.has(path))).toBe(true);
 expect(response.headers()['cache-control']).toBe('no-cache');expect(errors).toEqual([]);
 const report={checkedAt:new Date().toISOString(),scope:'Real two-export same-origin reload behind production ingress; normal browser cache enabled; API503',beforeCommit:JSON.parse(readFileSync(resolve(beforeDir,'manifest.json'),'utf8')).sourceCommit,afterBuildCommit:manifest.sourceCommit,oldScripts,newScripts,newDocumentCache:response.headers()['cache-control'],oldResources,manuscriptPreserved:true,nativeBeforeAndAfter:true,errors,success:true};
 writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({success:true,manuscriptPreserved:true,nativeBeforeAndAfter:true,oldScripts:oldScripts.length,newScripts:newScripts.length}));
}finally{await browser?.close();for(const server of servers.reverse())await new Promise(resolve=>{server.close(resolve);server.closeAllConnections();});}
