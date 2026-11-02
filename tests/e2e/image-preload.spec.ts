import {test,expect,type Page} from '@playwright/test';
import {readFileSync,writeFileSync} from 'node:fs';
import {parseAuthoringFile,confirmAuthoringImport} from './authoring-file';
import {advanceReading} from './native-reader';
import {enterLibrary,shelfCoverButton,beginSelectedBook} from './library-entry';

const source=parseAuthoringFile(readFileSync('docs/architecture/evidence/new-creation-complete-2026-11-02/new-creation.knolstory','utf8')).project;
const backgrounds=['assets/legacy-18da4fc/BG01-valley-day.webp','assets/legacy-18da4fc/BG04-cottage-day.webp'];
async function ready(page:Page){const status=page.getByTestId('story-runtime-status');await expect.poll(()=>status.evaluate(n=>Number(n.getAttribute('data-rendered-revision'))>=0&&n.getAttribute('data-rendered-revision')===n.getAttribute('data-scene-revision')),{timeout:90000}).toBe(true);}
async function setup(page:Page,mode='upcoming',splitChapters=false){
 await page.addInitScript(({mode})=>{if(window!==window.top||location.protocol==='about:')return;sessionStorage.setItem('knolstory-fullscreen-offered-v1','1');localStorage.setItem('knolstory-reader-preferences-v1',JSON.stringify({version:1,textScale:1,autoDelaySeconds:3,format:'auto',tapMode:'next',imagePreloadMode:mode,imagePreloadCount:3}));},{mode});
 await page.route('**/api/**',r=>r.fulfill({status:503,body:'unavailable'}));
 await page.goto('/?view=editor');await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 await page.locator('[data-work-menu]>summary').click();
 const project={...source,id:'image-preload-check',lines:source.lines.map((line:Record<string,unknown>,i:number)=>({...line,...(splitChapters&&i===2?{chapterId:'image-next-chapter'}:{}),backgroundId:i===0?'seonnyeo.background.BG01-valley-day':splitChapters&&i===2?'seonnyeo.background.BG05-cottage-snow':'seonnyeo.background.BG04-cottage-day',visibility:undefined,flow:i===2?{type:'goto',targetLineId:null}:undefined,audio:undefined,presentation:undefined})),chapters:[...source.chapters.map((c:Record<string,unknown>)=>({...c,audio:undefined})),...(splitChapters?[{...source.chapters[0],id:'image-next-chapter',order:2,chapterNumber:2,title:'다음 장',audio:undefined}]:[])]};
 await page.getByLabel('작품 파일 가져오기',{exact:true}).setInputFiles({name:'image-preload.knolstory',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({documentType:'story-maker-project',schemaVersion:8,savedAt:source.updatedAt,appVersion:'test',project}))});await confirmAuthoringImport(page);
 await page.getByLabel('현재 장과 컷 이동',{exact:true}).selectOption(source.lines[0].id);
 return page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).document.project);
}
test('next-cut image bytes arrive while current is read; native decode is complete before advancing',async({page},info)=>{
 const authored=await setup(page);
 await page.getByRole('button',{name:'이 컷부터 재생',exact:true}).click();await ready(page);
 const runtime=page.frames().find(f=>f.url().includes('/runtime/'))!;
 await expect.poll(()=>runtime.evaluate(path=>(window as unknown as {knolImagePreload:{status:()=>{prepared:string[]}}}).knolImagePreload.status().prepared.includes(path),backgrounds[1]!)).toBe(true);
 await runtime.evaluate(()=>(window as unknown as {renpy_exec:(s:string)=>Promise<unknown>}).renpy_exec('renpy._knol_preload_placeholder_hits = []\nrenpy._knol_original_image_load = renpy.display.im.Image.load\ndef _knol_image_load_probe(self, *args, **kwargs):\n    if not os.path.isfile(os.path.join(config.gamedir, self.filename)) and self.filename.startswith("assets/"):\n        renpy._knol_preload_placeholder_hits.append(self.filename)\n    return renpy._knol_original_image_load(self, *args, **kwargs)\nrenpy.display.im.Image.load = _knol_image_load_probe'));
 await advanceReading(page);await ready(page);
 const evidence=await runtime.evaluate(()=>(window as unknown as {renpy_exec:(s:string)=>Promise<{paths:string[];hits:string[];text:string}>}).renpy_exec('result = {"paths": knol_prepared_image_paths, "hits": renpy._knol_preload_placeholder_hits, "text": knol_scene["dialogue"]["text"]}'));
 expect(evidence.paths).toContain(backgrounds[1]);expect(evidence.hits).toEqual([]);expect(evidence.text).toBe(source.lines[1].text);
 await page.getByTestId('story-stage-viewport').screenshot({path:info.outputPath('prepared-second-cut.png')});
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).document.project)).toEqual(authored);
 await page.getByRole('button',{name:'읽기 메뉴',exact:true}).click();await page.getByRole('button',{name:'읽기 설정',exact:true}).click();
 await expect(page.getByLabel('이미지 미리 받기',{exact:true})).toHaveValue('upcoming');
 await page.getByLabel('미리 받을 컷 수',{exact:true}).fill('0');await expect(page.getByLabel('미리 받을 컷 수',{exact:true})).toHaveAttribute('aria-invalid','true');
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-reader-preferences-v1')!).imagePreloadCount)).toBe(3);
 await page.getByLabel('미리 받을 컷 수',{exact:true}).fill('5');
 for(const mode of ['chapter','work','none','upcoming']){await page.getByLabel('이미지 미리 받기',{exact:true}).selectOption(mode);await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-reader-preferences-v1')!).imagePreloadMode)).toBe(mode);}
 await expect(page.getByLabel('미리 받을 컷 수',{exact:true})).toHaveValue('5');
});

for(const mode of ['chapter','work','none'])test(`${mode} mode prepares exactly the selected image scope`,async({page},info)=>{
 await setup(page,mode,true);await page.getByRole('button',{name:'이 컷부터 재생',exact:true}).click();await ready(page);
 const runtime=page.frames().find(f=>f.url().includes('/runtime/'))!;
 const status=()=>runtime.evaluate(()=>(window as unknown as {knolImagePreload:{status:()=>{prepared:string[];installed:string[];nativeBytes:number;maxMemoryBytes:number}}}).knolImagePreload.status());
 const snow='assets/legacy-18da4fc/BG05-cottage-snow.webp';
 if(mode==='none'){expect((await status()).prepared).toEqual([]);expect((await status()).installed).toEqual([]);}
 else{
  await expect.poll(async()=>(await status()).prepared.includes(backgrounds[1]!)).toBe(true);
  if(mode==='work')await expect.poll(async()=>(await status()).prepared.includes(snow)).toBe(true);
  else expect((await status()).prepared).not.toContain(snow);
  const result=await status();expect(result.nativeBytes).toBeLessThanOrEqual(result.maxMemoryBytes);expect(result.installed).not.toContain(snow);
 }
 await page.getByRole('button',{name:'읽기 메뉴',exact:true}).click();await page.getByRole('button',{name:'읽기 설정',exact:true}).click();
 for(const size of [{width:390,height:844},{width:1280,height:900}]){
  await page.setViewportSize(size);await expect(page.getByLabel('이미지 미리 받기',{exact:true})).toHaveValue(mode);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.getByLabel('이미지 미리 받기',{exact:true}).scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath(`settings-${size.width}.png`)});
 }
});

test('required image failure retains old native scene and retries without losing path or manuscript',async({page})=>{
 await setup(page);let fail=true;
 await page.route('**/runtime/game/**BG04-cottage-day.webp',r=>fail?r.fulfill({status:503,body:'unavailable'}):r.continue());
 await page.getByRole('button',{name:'이 컷부터 재생',exact:true}).click();await ready(page);
 await advanceReading(page);
 await expect(page.getByRole('button',{name:'그림 다시 받기',exact:true})).toBeVisible();
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).playback.lineId)).toBe(source.lines[1].id);
 const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!));
 const runtime=page.frames().find(f=>f.url().includes('/runtime/'))!;
 expect(await runtime.evaluate(()=>(window as unknown as {renpy_exec:(s:string)=>Promise<string>}).renpy_exec('result = knol_scene["dialogue"]["text"]'))).toBe(source.lines[0].text);
 fail=false;await page.getByRole('button',{name:'그림 다시 받기',exact:true}).click();await ready(page);
 await expect(page.getByRole('button',{name:'그림 다시 받기',exact:true})).toHaveCount(0);
 const after=await page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!));
 expect(after.playback).toEqual(before.playback);expect(after.document.project).toEqual(before.document.project);
});

test('downloaded images survive a fresh runtime when image requests are unavailable',async({page,context},info)=>{
 const authored=await setup(page,'work',true);
 await page.getByRole('button',{name:'이 컷부터 재생',exact:true}).click();await ready(page);
 const frame=page.frames().find(item=>item.url().includes('/runtime/'))!;
 const snow='assets/legacy-18da4fc/BG05-cottage-snow.webp';
 await expect.poll(()=>frame.evaluate(path=>(window as unknown as {knolImagePreload:{status:()=>{prepared:string[]}}}).knolImagePreload.status().prepared.includes(path),snow)).toBe(true);
 await advanceReading(page);await ready(page);
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).playback.lineId)).toBe(source.lines[1].id);
 const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).playback);
 await expect.poll(()=>page.evaluate(id=>JSON.parse(localStorage.getItem('knolstory-player-v1')??'{"works":{}}').works[id]?.auto?.playback,authored.id)).toEqual(before);
 const cacheBefore=await page.evaluate(async()=>{
  const names=(await caches.keys()).filter(name=>name.startsWith('knolstory-runtime-images-v1-'));
  return Promise.all(names.map(async name=>({name,urls:(await(await caches.open(name)).keys()).map(request=>request.url)})));
 });
 expect(cacheBefore.some(cache=>cache.urls.some(url=>url.endsWith(snow)))).toBe(true);
 await page.close();
 let networkAttempts=0;
 await context.route(/\/runtime\/game\/assets\/.*\.(webp|png|jpg|jpeg)(\?.*)?$/,route=>{networkAttempts++;return route.abort('internetdisconnected');});
 const reopened=await context.newPage();await reopened.goto('/');await enterLibrary(reopened);
 await shelfCoverButton(reopened,authored.title).click();
 await reopened.getByRole('dialog').getByRole('button',{name:'이어읽기',exact:true}).click();
 await beginSelectedBook(reopened,true);await ready(reopened);
 const fresh=reopened.frames().find(item=>item.url().includes('/runtime/'))!;
 const native=await fresh.evaluate(()=>(window as unknown as {renpy_exec:(s:string)=>Promise<{text:string;paths:string[]}>}).renpy_exec('result = {"text": knol_scene["dialogue"]["text"], "paths": knol_prepared_image_paths}'));
 expect(native.text).toBe(source.lines[1].text);expect(native.paths).toContain(backgrounds[1]);
 expect(await reopened.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).playback)).toEqual(before);
 expect(await reopened.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).document.project)).toEqual(authored);
 await advanceReading(reopened);await ready(reopened);
 const final=await fresh.evaluate(()=>(window as unknown as {renpy_exec:(s:string)=>Promise<{text:string;paths:string[]}>}).renpy_exec('result = {"text": knol_scene["dialogue"]["text"], "paths": knol_prepared_image_paths}'));
 expect(final.text).toBe(source.lines[2].text);expect(final.paths).toContain(snow);
 expect(networkAttempts).toBe(0);
 await reopened.getByTestId('story-stage-viewport').screenshot({path:info.outputPath('cached-next-chapter.png')});
 writeFileSync(info.outputPath('cache-reopen.json'),JSON.stringify({cacheBefore,networkAttempts,previousPlayback:before,nativeAfterReopen:native,nativeNextChapter:final,wholeManuscriptPreserved:true,limits:['Fresh runtime in same browser context; engine/app boot remained online','Image network was unavailable; not offline HTML/PWA startup or long-term eviction proof']},null,2));
});
