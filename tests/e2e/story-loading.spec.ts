import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {PNG} from 'pngjs';
const tips=JSON.parse(readFileSync('apps/web/public/loading-stories.json','utf8')) as {id:string;workId:string;label:string;text:string;characterSrc:string;characterStillSrc:string}[];

test('branded waiting screen fits the stage, shows one short tip and yields to actual RenPy',async({page},info)=>{
 await page.route('**/api/**',route=>route.abort());
 let release!:()=>void;const held=new Promise<void>(resolve=>{release=resolve;});
 await page.route('**/runtime/game.zip',async route=>{await held;await route.continue();});
 try{
  await page.setViewportSize({width:1280,height:800});
  const html=await page.request.get('/');expect(await html.text()).toContain('이야기를 만나러 가는 중이에요');
  await page.goto('/?view=editor');await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
  const original=await page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).document.project);
  const waiting=page.locator('[data-story-loading=stage]');await expect(waiting).toBeVisible();
  const image=waiting.locator('img');await expect.poll(()=>image.evaluate(el=>(el as HTMLImageElement).naturalWidth)).toBe(480);
  const tip=waiting.locator('[data-loading-tip]');expect(tips.map(item=>item.id)).toContain(await tip.getAttribute('data-loading-tip'));
  const selectedTipId=await tip.getAttribute('data-loading-tip');const selectedTip=tips.find(item=>item.id===selectedTipId)!;await page.screenshot({path:info.outputPath('desktop-loading.png')});
  for(const size of [{width:390,height:844},{width:844,height:390}]){
   await page.setViewportSize(size);await expect(waiting).toBeVisible();
   const measure=()=>waiting.evaluate(el=>{const outer=el.getBoundingClientRect(),content=el.firstElementChild!.getBoundingClientRect();return {details:{outer:{top:outer.top,bottom:outer.bottom,width:outer.width,height:outer.height},content:{top:content.top,bottom:content.bottom,width:content.width,height:content.height}},fits:content.top>=outer.top-1&&content.bottom<=outer.bottom+1&&content.left>=outer.left-1&&content.right<=outer.right+1,overflow:el.scrollWidth>el.clientWidth};});
   await expect.poll(async()=>{const bounds=await measure();return bounds.fits&&!bounds.overflow;}).toBe(true);const currentTipId=await tip.getAttribute('data-loading-tip');const currentTip=tips.find(item=>item.id===currentTipId);expect(currentTip?.workId).toBe(selectedTip.workId);await expect(tip).toHaveCount(1);
   await page.screenshot({path:info.outputPath(`${size.width}-loading.png`)});
  }
  await page.emulateMedia({reducedMotion:'reduce'});await expect.poll(()=>image.evaluate(el=>(el as HTMLImageElement).currentSrc)).toContain(selectedTip.characterStillSrc);
  await page.getByRole('button',{name:'이 컷부터 재생',exact:true}).click();
  await page.setViewportSize({width:780,height:870});await expect(waiting).toBeVisible();await expect(waiting.locator('img')).toBeVisible();
  const artBounds=()=>waiting.evaluate(el=>{const image=el.querySelector('img')!.getBoundingClientRect(),copy=el.querySelector('[data-loading-tip]')!.getBoundingClientRect(),title=el.querySelector('[role=status]')!.getBoundingClientRect();return {bottom:image.bottom,height:image.height,title:title.top,copy:copy.top};});await page.screenshot({path:info.outputPath('reader-fit-debug.png')});await expect.poll(async()=>{const box=await artBounds();return box.bottom<=box.title&&box.bottom<=box.copy&&box.height<=230;},{message:JSON.stringify(await artBounds())}).toBe(true);
  await page.screenshot({path:info.outputPath('actual-reader-loading.png')});
  release();const status=page.getByTestId('story-runtime-status');
  await expect.poll(async()=>{const revision=await status.getAttribute('data-scene-revision');return revision!==null&&revision===await status.getAttribute('data-rendered-revision');},{timeout:120000}).toBe(true);
  await expect(waiting).toHaveCount(0);
  const gate=page.getByTestId('story-runtime-frame').contentFrame().getByRole('button',{name:'소리 켜고 시작 · Enter 또는 Space',exact:true});if(await gate.count())await gate.press('Enter');
  const next=page.getByRole('button',{name:'다음으로',exact:true});await expect(next).toBeEnabled();await next.focus();await next.press('Enter');
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).document.project)).toEqual(original);
 }finally{release();}
});

test('native boot uses the same character and concise random tip while preserving real engine progress',async({page},info)=>{
 let release!:()=>void;const held=new Promise<void>(resolve=>{release=resolve;});
 await page.route('**/runtime/game.zip',async route=>{await held;await route.continue();});
 try{
  await page.setViewportSize({width:390,height:844});await page.goto('/runtime/index.html');
  const splash=page.locator('#presplash');await expect(splash).toContainText('이야기 무대를 준비하고 있어요');
  const character=page.locator('#knol-loading-character');await expect(character).toBeVisible();await expect.poll(()=>character.evaluate(el=>(el as HTMLImageElement).naturalWidth)).toBe(480);
  const selectedText=await page.locator('#knol-loading-tip-text').textContent();const selectedSource=await character.getAttribute('src');const selectedTip=tips.find(tip=>tip.text===selectedText&&tip.characterSrc===selectedSource)!;expect(selectedTip).toBeDefined();
  const progress=await page.locator('#statusProgress').evaluate(el=>({value:(el as HTMLProgressElement).value,max:(el as HTMLProgressElement).max}));expect(progress.max).toBeGreaterThan(0);expect(progress.value).toBeGreaterThanOrEqual(0);expect(progress.value).toBeLessThanOrEqual(progress.max);await expect(page.locator('#statusProgress')).toHaveAccessibleName('이야기 자료 다운로드');await expect(page.locator('#overlayDiv')).toHaveCount(1);
  await page.screenshot({path:info.outputPath('native-boot.png')});
  const firstFrame=PNG.sync.read(await character.screenshot({animations:'allow'}));
  await expect.poll(async()=>{
   const turnedPage=PNG.sync.read(await character.screenshot({animations:'allow'}));
   expect(turnedPage.width).toBe(firstFrame.width);expect(turnedPage.height).toBe(firstFrame.height);
   let changed=0;for(let index=0;index<firstFrame.data.length;index+=4)if(firstFrame.data.subarray(index,index+4).some((value,channel)=>Math.abs(value-turnedPage.data[index+channel]!)>12))changed++;
   return changed;
  },{intervals:[100,140,180],timeout:5000}).toBeGreaterThan(100);

  await page.setViewportSize({width:844,height:390});
  const fits=await splash.evaluate(el=>{const box=el.getBoundingClientRect(),content=el.firstElementChild!.getBoundingClientRect();return content.left>=box.left&&content.right<=box.right&&content.top>=box.top&&content.bottom<=box.bottom;});expect(fits).toBe(true);
  await page.screenshot({path:info.outputPath('native-landscape.png')});
  await page.emulateMedia({reducedMotion:'reduce'});await expect.poll(()=>character.evaluate(el=>(el as HTMLImageElement).currentSrc)).toContain(selectedTip.characterStillSrc);
 }finally{release();}
});


test('unavailable optional tips leave a readable boot screen and never delay the engine',async({page})=>{
 await page.route('**/loading-stories.json',route=>route.abort());
 await page.goto('/runtime/index.html');
 await expect(page.locator('#knol-loading-tip-text')).toHaveText('작품 파일을 기기에 저장해 두면 다른 곳에서도 이어 쓸 수 있어요.');
 await expect(page.locator('#knol-loading-character')).toBeHidden();
 await expect(page.locator('#presplash')).toHaveCount(0,{timeout:120000});
});


const workTitles={rabbit:'토끼전',heungbu:'흥부전',seonnyeo:'선녀와 나무꾼',onggojib:'옹고집전'} as const;
for(const [workId,title] of Object.entries(workTitles)){
 test(`random loading can select ${workId} without fetching the other story illustrations`,async({page})=>{
  const variants=tips.filter(tip=>tip.workId===workId);expect(variants).toHaveLength(6);
  const literary=variants.find(tip=>tip.label.startsWith('작품 이야기'))!;
  expect(literary).toBeDefined();expect(literary.label).toContain(title);
  expect(new Set(variants.map(tip=>tip.characterSrc)).size).toBe(1);expect(new Set(variants.map(tip=>tip.characterStillSrc)).size).toBe(1);
  const index=tips.indexOf(literary);const random=(index+.25)/tips.length;
  await page.addInitScript(value=>{Math.random=()=>value;},random);
  await page.emulateMedia({reducedMotion:'no-preference'});
  const requested=new Set<string>();page.on('request',request=>{
   const path=new URL(request.url()).pathname;if(path.startsWith('/assets/loading/'))requested.add(path);
  });
  let release!:()=>void;const held=new Promise<void>(resolve=>{release=resolve;});
  await page.route('**/runtime/game.zip',async route=>{await held;await route.continue();});
  try{
   await page.goto('/runtime/index.html');
   const character=page.locator('#knol-loading-character');await expect(character).toBeVisible();
   await expect.poll(()=>character.evaluate(el=>(el as HTMLImageElement).currentSrc)).toContain(literary.characterSrc);
   await expect.poll(()=>character.evaluate(el=>(el as HTMLImageElement).naturalWidth)).toBe(480);
   await expect(page.locator('#knol-loading-tip-label')).toHaveText(literary.label);
   await expect(page.locator('#knol-loading-tip-text')).toHaveText(literary.text);
   expect([...requested]).toEqual([literary.characterSrc]);
   await page.setViewportSize({width:390,height:844});
   await page.setViewportSize({width:844,height:390});
   await expect(page.locator('#knol-loading-tip-text')).toHaveText(literary.text);
   await expect(character).toHaveAttribute('src',literary.characterSrc);
   expect([...requested]).toEqual([literary.characterSrc]);
   await page.emulateMedia({reducedMotion:'reduce'});
   await expect.poll(()=>character.evaluate(el=>(el as HTMLImageElement).currentSrc)).toContain(literary.characterStillSrc);
   expect([...requested].sort()).toEqual([literary.characterSrc,literary.characterStillSrc].sort());
  }finally{release();}
 });
}

for(const quoteId of ['quote-bacon-rabbit','quote-descartes-heungbu','book-alice','book-little-women','book-anne','book-secret-garden','poem-seosi-rabbit','poem-sowol-heungbu']){
 test(`verified reading quote ${quoteId} appears as one attributed short message`,async({page})=>{
  const tip=tips.find(item=>item.id===quoteId)!;expect(tip).toBeDefined();
  await page.addInitScript(value=>{Math.random=()=>value;},(tips.indexOf(tip)+.25)/tips.length);
  let release!:()=>void;const held=new Promise<void>(resolve=>{release=resolve;});
  await page.route('**/runtime/game.zip',async route=>{await held;await route.continue();});
  try{
   await page.goto('/runtime/index.html');
   await expect(page.locator('#knol-loading-tip-label')).toHaveText(tip.label);
   await expect(page.locator('#knol-loading-tip-text')).toHaveText(tip.text);
   await expect(page.locator('.knol-loading-tip')).toHaveCount(1);
  }finally{release();}
 });
}

for(const surface of ['web','native'] as const){
 test(`${surface} shows one spoiler-free message and rotates it every four seconds without changing characters`,async({page})=>{
  await page.route('**/api/**',route=>route.abort());
  await page.addInitScript(()=>{Math.random=()=>.01;});
  const requested=new Set<string>();page.on('request',request=>{const path=new URL(request.url()).pathname;if(path.startsWith('/assets/loading/'))requested.add(path);});
  let release!:()=>void;const held=new Promise<void>(resolve=>{release=resolve;});await page.route('**/runtime/game.zip',async route=>{await held;await route.continue();});
  try{
   await page.goto(surface==='web'?'/?view=editor':'/runtime/index.html');
   const area=surface==='web'?page.locator('[data-story-loading=stage]'):page.locator('#presplash');
   const text=surface==='web'?area.locator('[data-loading-tip]'):area.locator('#knol-loading-tip-text');
   const image=area.locator('img');await expect(image).toBeVisible();await expect.poll(()=>image.evaluate(el=>(el as HTMLImageElement).naturalWidth)).toBe(480);
   const first=await text.textContent(),source=await image.getAttribute('src');
   await page.waitForTimeout(1500);await expect(text).toHaveText(first!);await expect(text).toHaveCount(1);
   await expect.poll(()=>text.textContent(),{timeout:5000,intervals:[100,200]}).not.toBe(first);
   await expect(image).toHaveAttribute('src',source!);await expect(text).toHaveCount(1);
   expect([...requested]).toEqual([new URL(source!,page.url()).pathname]);
   const displayed=await text.textContent();expect(tips.filter(tip=>tip.workId==='rabbit').some(tip=>displayed?.includes(tip.text))).toBe(true);
  }finally{release();}
 });
}
