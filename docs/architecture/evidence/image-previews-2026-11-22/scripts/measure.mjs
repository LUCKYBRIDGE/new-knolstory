import pw from '@playwright/test';const {chromium}=pw;
const BASE=process.env.BASE||'https://story.knolquiz.com';
const out=[];
async function run(label,page,action){
  const reqs=[];
  const onDone=async r=>{try{const res=await r.response();if(!res)return;const sizes=await r.sizes().catch(()=>({responseBodySize:0,responseHeadersSize:0}));const url=new URL(r.url());
    reqs.push({path:url.pathname,status:res.status(),type:r.resourceType(),bytes:sizes.responseBodySize,fromCache:res.fromServiceWorker()||false,timing:r.timing()});}catch{}};
  page.on('requestfinished',onDone);
  const t0=Date.now();await action();const ms=Date.now()-t0;
  await page.waitForTimeout(8000);
  page.off('requestfinished',onDone);
  const img=reqs.filter(r=>r.type==='image'||/\.(webp|png|jpg)$/.test(r.path));
  const sum=a=>a.reduce((s,r)=>s+r.bytes,0);
  const by=(a,k)=>a.reduce((m,r)=>(m[k(r)]=(m[k(r)]||0)+1,m),{});
  const rt=reqs.filter(r=>r.path.startsWith('/runtime/'));
  out.push({label,ms,requests:reqs.length,totalKB:Math.round(sum(reqs)/1024),images:img.length,imageKB:Math.round(sum(img)/1024),imageStatus:by(img,r=>r.status),
    imageDirs:by(img,r=>r.path.split('/').slice(0,4).join('/')),runtimeKB:Math.round(sum(rt)/1024),runtimeStatus:by(rt,r=>r.status),
    biggest:img.sort((a,b)=>b.bytes-a.bytes).slice(0,3).map(r=>`${r.path.split('/').pop()} ${Math.round(r.bytes/1024)}KB`)});
}
const browser=await chromium.launch();
for(const [w,h,name] of [[1280,860,'desktop'],[390,844,'phone']]){
  const ctx=await browser.newContext({viewport:{width:w,height:h},deviceScaleFactor:name==='phone'?3:1});
  await ctx.addInitScript(()=>{try{sessionStorage.setItem('knolstory-fullscreen-offered-v1','1');}catch{}});
  const page=await ctx.newPage();
  await run(`${name} 서재 첫 방문`,page,()=>page.goto(BASE+'/?view=library',{waitUntil:'load',timeout:60000}));
  await run(`${name} 서재 다시 방문`,page,()=>page.reload({waitUntil:'load',timeout:60000}));
  await run(`${name} 그림책 원본 읽기`,page,()=>page.goto(BASE+'/shortstory?work=rabbit',{waitUntil:'load',timeout:60000}));
  await run(`${name} 그림책 다시 방문`,page,()=>page.reload({waitUntil:'load',timeout:60000}));
  await ctx.close();
}
console.log(JSON.stringify(out,null,1));
await browser.close();
