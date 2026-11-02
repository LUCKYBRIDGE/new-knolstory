import {test,expect} from '@playwright/test';
import {readFileSync,writeFileSync} from 'node:fs';
import {enterLibrary,importShelfFile} from './library-entry';
import {parseAuthoringFile} from './authoring-file';

const source='docs/architecture/evidence/new-creation-complete-2026-11-02/new-creation.knolstory';

test('slow first preview survives a network interruption and reconnects without changing the work',async({page,context},info)=>{
 test.setTimeout(240000);
 await context.addInitScript(()=>{
  if(window!==window.top||location.protocol==='about:')return;
  sessionStorage.setItem('knolstory-fullscreen-offered-v1','1');
 });
 await context.route('**/api/**',route=>route.fulfill({status:503,body:'API unavailable'}));
 await page.goto('/');await enterLibrary(page);await importShelfFile(page,source);
 const preparation=page.getByRole('region',{name:'작품 설정',exact:true});
 await expect(preparation).toBeVisible();
 const session=await context.newCDPSession(page);
 const requests:{url:string;failure:string|null}[]=[];
 page.on('requestfailed',request=>{
  if(new URL(request.url()).pathname.startsWith('/runtime/'))requests.push({url:request.url(),failure:request.failure()?.errorText??null});
 });
 await session.send('Network.enable');await session.send('Network.setCacheDisabled',{cacheDisabled:true});
 const network={offline:false,latency:180,downloadThroughput:262144,uploadThroughput:131072};
 await session.send('Network.emulateNetworkConditions',network);
 const started=Date.now();await preparation.getByRole('button',{name:'현재 컷 쓰기',exact:true}).click();
 const loading=page.locator('[data-story-loading="stage"]');await expect(loading).toBeVisible();
 const progress=loading.getByRole('progressbar',{name:'무대 자료 받기'});
 await expect.poll(async()=>Number(await progress.getAttribute('aria-valuenow').catch(()=>0)),{timeout:60000}).toBeGreaterThan(0);
 const firstProgress=Number(await progress.getAttribute('aria-valuenow'));
 expect(firstProgress).toBeLessThan(100);
 await expect(loading).toBeVisible();
 const text='느린 망에서 준비 중에도 원고를 고쳐 파일로 보관한다.';
 await page.locator('[data-current-cut] textarea').fill(text);
 await page.locator('[data-current-cut] textarea').blur();
 await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).document.project);
 await loading.screenshot({path:info.outputPath('slow-download.png')});
 await context.setOffline(true);
 await session.send('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});
 const failedFetch=await page.evaluate(()=>fetch('/?offline-check',{cache:'no-store'}).then(()=>false).catch(()=>true));
 expect(failedFetch).toBe(true);
 await expect.poll(()=>requests.length).toBeGreaterThan(0);
 await page.locator('[data-work-menu]>summary').click();
 const pending=page.waitForEvent('download');await page.getByRole('button',{name:'작품 파일 내보내기',exact:true}).click();
 const file=info.outputPath('interrupted.knolstory');await(await pending).saveAs(file);
 expect(parseAuthoringFile(readFileSync(file,'utf8')).project).toEqual(before);
 // Use the real timeout/error path, without advancing the app's clock.
 const retry=page.getByRole('button',{name:'무대 다시 연결',exact:true});await expect(retry).toBeVisible({timeout:100000});
 await retry.screenshot({path:info.outputPath('interrupted-retry.png')});
 await context.setOffline(false);
 await session.send('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});
 await retry.click();
 const status=page.getByTestId('story-runtime-status');
 await expect.poll(()=>status.evaluate(node=>Number(node.getAttribute('data-rendered-revision'))>=0&&node.getAttribute('data-rendered-revision')===node.getAttribute('data-scene-revision')),{timeout:120000}).toBe(true);
 await expect(retry).toHaveCount(0);
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).document.project)).toEqual(before);
 await page.getByRole('button',{name:'이 컷부터 재생',exact:true}).click();
 await expect(page.getByRole('region',{name:'이야기 무대',exact:true})).toContainText(text);
 await expect.poll(()=>status.evaluate(node=>Number(node.getAttribute('data-rendered-revision'))>=0&&node.getAttribute('data-rendered-revision')===node.getAttribute('data-scene-revision'))).toBe(true);
 await page.getByTestId('story-stage-viewport').screenshot({path:info.outputPath('recovered-native.png')});
 writeFileSync(info.outputPath('network-summary.json'),JSON.stringify({network,firstProgress,failedFetch,requests,elapsedMs:Date.now()-started,realTimeout:true,manuscriptPreserved:true,downloadedFileMatches:true,actualNativeRecovered:true,limits:['Chromium network emulation, not a physical slow connection','Recovery uses unrestricted network; no uninterrupted slow-start budget claim','No long-term offline or next-deployment edge-cache claim']},null,2));
});

// Separate from interruption recovery: keep the same simulated link until the
// first actual engine render, without replacing responses or changing clocks.
test('uninterrupted slow first runtime startup renders the imported work unchanged',async({browser},info)=>{
 test.setTimeout(300000);
 const context=await browser.newContext({baseURL:info.project.use.baseURL,viewport:{width:1280,height:900},serviceWorkers:'block'});
 try{
  await context.addInitScript(()=>{
   if(window===window.top&&location.protocol!=='about:')sessionStorage.setItem('knolstory-fullscreen-offered-v1','1');
  });
  await context.route('**/api/**',route=>route.fulfill({status:503,body:'API unavailable'}));
  const page=await context.newPage();await page.goto('/');await enterLibrary(page);await importShelfFile(page,source);
  const preparation=page.getByRole('region',{name:'작품 설정',exact:true});await expect(preparation).toBeVisible();
  await expect(page.getByTestId('story-runtime-frame')).toHaveCount(0);
  const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).document.project);
  type Receipt={url:string;startedMs:number;responseMs?:number;status?:number;contentLength?:string|null;finishedMs?:number;failure?:string|null};
  const requests=new Map<import('@playwright/test').Request,Receipt>();
  let started=0;
  page.on('request',request=>{
   if(new URL(request.url()).pathname.startsWith('/runtime/'))requests.set(request,{url:request.url(),startedMs:Date.now()-started});
  });
  page.on('response',response=>{
   const request=response.request(),prior=requests.get(request);
   if(prior)requests.set(request,{...prior,responseMs:Date.now()-started,status:response.status(),contentLength:response.headers()['content-length']??null});
  });
  page.on('requestfinished',request=>{
   const prior=requests.get(request);if(prior)requests.set(request,{...prior,finishedMs:Date.now()-started});
  });
  page.on('requestfailed',request=>{
   const prior=requests.get(request);if(prior)requests.set(request,{...prior,failure:request.failure()?.errorText??null});
  });
  const session=await context.newCDPSession(page);
  await session.send('Network.enable');await session.send('Network.setCacheDisabled',{cacheDisabled:true});
  const network={offline:false,latency:180,downloadThroughput:512*1024,uploadThroughput:128*1024};
  await session.send('Network.emulateNetworkConditions',network);
  await page.evaluate(()=>{
   const state={started:performance.now(),samples:[] as {elapsedMs:number;value:number}[],observer:null as MutationObserver|null};
   const collect=()=>{
    const bar=document.querySelector('[data-story-loading="stage"] [role="progressbar"][aria-label="무대 자료 받기"]');
    if(!bar)return;const value=Number(bar.getAttribute('aria-valuenow'));
    if(Number.isFinite(value)&&state.samples.at(-1)?.value!==value)state.samples.push({elapsedMs:performance.now()-state.started,value});
   };
   state.observer=new MutationObserver(collect);state.observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['aria-valuenow']});
   (window as unknown as {knolSlowStartup:typeof state}).knolSlowStartup=state;
  });
  started=Date.now();await preparation.getByRole('button',{name:'현재 컷 쓰기',exact:true}).click();
  const loading=page.locator('[data-story-loading="stage"]');await expect(loading).toBeVisible();
  const progress=loading.getByRole('progressbar',{name:'무대 자료 받기'});
  await expect.poll(async()=>Number(await progress.getAttribute('aria-valuenow').catch(()=>0)),{timeout:60000}).toBeGreaterThan(0);
  const firstProgress=Number(await progress.getAttribute('aria-valuenow'));
  expect(firstProgress).toBeLessThan(100);
  await loading.screenshot({path:info.outputPath('uninterrupted-slow-download.png')});
  const status=page.getByTestId('story-runtime-status');
  await expect.poll(()=>status.evaluate(node=>Number(node.getAttribute('data-rendered-revision'))>=0&&node.getAttribute('data-rendered-revision')===node.getAttribute('data-scene-revision')),{timeout:180000}).toBe(true);
  const firstRenderedMs=Date.now()-started;
  await expect(loading).toHaveCount(0);await expect(page.getByRole('button',{name:'무대 다시 연결',exact:true})).toHaveCount(0);
  const runtime=page.frames().find(frame=>frame.url().includes('/runtime/'));
  if(!runtime)throw Error('Actual RenPy runtime did not mount');
  const actual=await runtime.evaluate(()=>(window as unknown as {renpy_exec:(code:string)=>Promise<{sceneId:string;text:string}>}).renpy_exec('result = {"sceneId": knol_scene["sceneId"], "text": knol_scene["dialogue"]["text"]}'));
  expect(actual.sceneId).toMatch(new RegExp(`/${before.lines[0].id}$`));expect(actual.text).toBe(before.lines[0].text);
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).document.project)).toEqual(before);
  const samples=await page.evaluate(()=>{
   const state=(window as unknown as {knolSlowStartup:{observer:MutationObserver;samples:{elapsedMs:number;value:number}[]}}).knolSlowStartup;
   state.observer.disconnect();return state.samples;
  });
  expect(samples.some(sample=>sample.value>0&&sample.value<100)).toBe(true);
  // Ready can remove the loading DOM in the same mutation batch as 100%.
  // Completion is proved below by finished resources and actual native text.
  for(const sample of samples){expect(sample.value).toBeGreaterThanOrEqual(0);expect(sample.value).toBeLessThanOrEqual(100);}
  for(const [index,sample] of samples.entries())if(index)expect(sample.value).toBeGreaterThanOrEqual(samples[index-1]!.value);
  const receipts=[...requests.values()];
  const core=receipts.filter(receipt=>/\/(?:renpy\.(?:wasm|data)|game\.zip)$/.test(new URL(receipt.url).pathname));
  expect(core.some(receipt=>new URL(receipt.url).pathname.endsWith('/renpy.wasm'))).toBe(true);
  expect(core.some(receipt=>new URL(receipt.url).pathname.endsWith('/game.zip'))).toBe(true);
  for(const receipt of core){expect(receipt.status).toBe(200);expect(receipt.finishedMs).toBeDefined();expect(receipt.failure).toBeUndefined();}
  await page.getByTestId('story-stage-viewport').screenshot({path:info.outputPath('uninterrupted-slow-native.png')});
  writeFileSync(info.outputPath('uninterrupted-slow-summary.json'),JSON.stringify({network,firstProgress,firstRenderedMs,progress:samples,runtimeRequests:receipts,actualNativeScene:actual,manuscriptPreserved:true,clock:'real; no timer overrides',link:'same simulated throttle retained through first actual render',limits:['Chromium simulation, not physical network or device measurements','One first startup observation; no performance-budget or release-completion claim','Content-Length records response headers, not independently measured decoded or transferred body sizes']},null,2));
 }finally{await context.close();}
});
