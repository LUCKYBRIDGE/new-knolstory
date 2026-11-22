import pw from '@playwright/test';const {chromium}=pw;
const browser=await chromium.launch();const out=[];
for(const [w,h,name,dpr] of [[1280,860,'desktop',1],[390,844,'phone',3]]){
 const ctx=await browser.newContext({viewport:{width:w,height:h},deviceScaleFactor:dpr});
 await ctx.addInitScript(()=>{try{sessionStorage.setItem('knolstory-fullscreen-offered-v1','1');}catch{}});
 if(process.env.BASE)await ctx.route('**/api/**',r=>r.request().url().endsWith('/api/v1/auth/config')?r.fulfill({status:200,contentType:'application/json',body:'{"success":true,"data":{"signupProvider":"kakao","providers":{"kakao":true,"google":true}}}'}):r.fulfill({status:401,contentType:'application/json',body:'{"success":false,"error":{"code":"SESSION_REQUIRED"}}'}));
 const page=await ctx.newPage();
 await page.goto((process.env.BASE||'https://story.knolquiz.com')+'/shortstory?work=rabbit&mode=edit');
 await page.getByRole('button',{name:'놀스토리로 보내기',exact:true}).click();await page.waitForURL(/picturebook/);
 await page.locator('main > footer').getByRole('button',{name:'놀스토리로 보내기',exact:true}).click();
 await page.waitForSelector('section[aria-label="이야기 무대"] iframe',{timeout:120000});
 const offer=page.getByRole('button',{name:'지금은 그대로',exact:true});if(await offer.isVisible().catch(()=>false))await offer.click();
 for(const [btn,kind] of [[/^1컷 배경 이미지 찾기/,'배경']]){
  await page.getByRole('button',{name:btn}).first().click();await page.waitForTimeout(6000);
  const r=await page.evaluate((dpr)=>{const imgs=[...document.querySelectorAll('dialog[open] img')].filter(i=>i.complete&&i.naturalWidth);
   const shown=imgs.map(i=>({nw:i.naturalWidth,nh:i.naturalHeight,cw:i.clientWidth,ch:i.clientHeight}));
   const px=a=>a.reduce((s,x)=>s+x.nw*x.nh,0);const need=a=>a.reduce((s,x)=>s+(x.cw*dpr)*(x.ch*dpr),0);
   return {count:imgs.length,sampleNatural:shown[2],sampleShown:{w:shown[2]?.cw,h:shown[2]?.ch},decodedMB:Math.round(px(shown)*4/1048576),neededMB:Math.round(need(shown)*4/1048576)};},dpr);
  out.push({name,kind,...r});
  await page.getByRole('dialog',{name:/이미지 선택/}).getByRole('button',{name:'취소',exact:true}).click();
 }
 await ctx.close();
}
console.log(JSON.stringify(out,null,1));await browser.close();
