/** Keep one isolated real-origin browser/cache alive across the approved deployment. */
import {chromium} from '@playwright/test';
import {mkdir,readFile,writeFile,access} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';

const root=resolve(import.meta.dirname,'../../../../..');
const output=join(root,'.cache/image-preload-live-transition-20261103');
await mkdir(output);
const input=join(root,'docs/architecture/evidence/new-creation-complete-2026-11-02/new-creation-revised.knolstory');
const authored=JSON.parse(await readFile(input,'utf8')).document.project;
const sha=value=>createHash('sha256').update(value).digest('hex');
const browser=await chromium.launch();
const context=await browser.newContext({viewport:{width:1280,height:900}});
await context.addInitScript(()=>{if(window===window.top&&location.protocol!=='about:')sessionStorage.setItem('knolstory-fullscreen-offered-v1','1');});
const page=await context.newPage();page.setDefaultTimeout(20000);
const snapshots={browser:browser.version(),origin:'https://story.knolquiz.com',isolatedContext:true,cacheCleared:false};
const ready=()=>page.waitForFunction(()=>{const s=document.querySelector('[data-testid="story-runtime-status"]');return s&&Number(s.getAttribute('data-rendered-revision'))>=0&&s.getAttribute('data-rendered-revision')===s.getAttribute('data-scene-revision');},undefined,{timeout:150000});
const currentProject=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')).document.project);
const runtime=()=>page.frames().find(frame=>frame.url().includes('/runtime/'));
try{
 await page.goto('https://story.knolquiz.com/?view=editor');
 await page.getByTestId('save-status').filter({hasText:'임시 보관됨'}).waitFor();
 await page.locator('[data-work-menu]>summary').click();
 await page.getByLabel('작품 파일 가져오기',{exact:true}).setInputFiles(input);
 await page.getByRole('dialog',{name:'작품 가져오기 확인',exact:true}).getByRole('button',{name:'내 사본으로 가져오기',exact:true}).click();
 const preparation=page.getByRole('region',{name:'작품 설정',exact:true});
 if(await preparation.isVisible())await preparation.getByRole('button',{name:'현재 컷 쓰기',exact:true}).click();
 await page.getByLabel('현재 장과 컷 이동',{exact:true}).selectOption(authored.lines[0].id);
 await page.getByRole('button',{name:'이 컷부터 재생',exact:true}).click();await ready();
 const original=await currentProject();
 if(JSON.stringify(original)!==JSON.stringify(authored))throw Error('Old deployed app changed the independent test manuscript.');
 snapshots.before={projectSha256:sha(JSON.stringify(original)),runtime:await runtime().evaluate(()=>({preloadHelper:typeof window.knolImagePreload,scripts:[...document.scripts].map(script=>script.src)})),playback:await page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')).playback)};
 if(snapshots.before.runtime.preloadHelper!=='undefined')throw Error('The initial live runtime already includes image preparation; old-to-new proof is unavailable.');
 await page.getByTestId('story-stage-viewport').screenshot({path:join(output,'before.png')});
 await writeFile(join(output,'ready.json'),JSON.stringify(snapshots,null,2));
 console.log(JSON.stringify({stage:'old-live-browser-cache-ready',output:'.cache/image-preload-live-transition-20261103'}));
 const deadline=Date.now()+20*60*1000;
 while(true){
  try{await access(join(output,'continue.json'));break;}catch{}
  if(Date.now()>deadline)throw Error('Deployment barrier expired; old browser evidence preserved.');
  await new Promise(resolve=>setTimeout(resolve,1000));
 }
 const deployment=JSON.parse(await readFile(join(output,'continue.json'),'utf8'));
 await page.reload();
 const menu=page.getByRole('button',{name:'읽기 메뉴',exact:true});
 if(!await menu.count()){
  const edit=page.getByRole('button',{name:'이 컷부터 재생',exact:true});
  if(await edit.count())await edit.click();
 }
 await ready();
 const after=await currentProject();
 if(JSON.stringify(after)!==JSON.stringify(authored))throw Error('New deployed app changed the cached test manuscript.');
 const imageStatus=await runtime().evaluate(()=>window.knolImagePreload?.status());
 if(!imageStatus||imageStatus.generation<1||!imageStatus.required.length)throw Error('Cached browser did not enter the new actual image-preparation runtime.');
 const native=await runtime().evaluate(()=>window.renpy_exec('result = {"text": knol_scene["dialogue"]["text"], "images": knol_prepared_image_paths}'));
 if(native.text!==authored.lines[0].text||!native.images.length)throw Error('New native image/text state differs after cache transition.');
 snapshots.after={projectSha256:sha(JSON.stringify(after)),runtime:await runtime().evaluate(()=>({preloadHelper:typeof window.knolImagePreload,scripts:[...document.scripts].map(script=>script.src)})),imageStatus,native,playback:await page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')).playback)};
 if(JSON.stringify(snapshots.after.playback)!==JSON.stringify(snapshots.before.playback))throw Error('Reader path changed across the real deployment cache transition.');
 await menu.click();await page.getByRole('button',{name:'읽기 설정',exact:true}).click();
 if(await page.getByLabel('이미지 미리 받기',{exact:true}).inputValue()!=='upcoming'||await page.getByLabel('미리 받을 컷 수',{exact:true}).inputValue()!=='3')throw Error('New default settings differ in the old-cache browser.');
 await page.screenshot({path:join(output,'after-settings.png')});
 snapshots.deployment=deployment;snapshots.wholeManuscriptAndReaderPathPreserved=true;
 snapshots.limits=['One Chromium desktop context on the actual public origin; not a physical-device or all-browser proof.','No authentication/upload or user profile was used.'];
 await writeFile(join(output,'result.json'),JSON.stringify(snapshots,null,2));
 console.log(JSON.stringify({stage:'actual-public-old-cache-to-new-runtime-passed',manuscriptPreserved:true,pathPreserved:true,newDefault:'upcoming3'}));
}catch(error){
 await writeFile(join(output,'failure.json'),JSON.stringify({message:String(error),snapshots},null,2));
 throw error;
}finally{await context.close();await browser.close();}
