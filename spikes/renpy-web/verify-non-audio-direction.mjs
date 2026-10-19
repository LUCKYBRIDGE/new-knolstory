/** Actual WASM screenshots prove authored duration, delay, ATL pause and same-entry editing. */
import assert from 'node:assert/strict';
import {PNG} from 'pngjs';
import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.KNOL_VERIFY_URL??'http://127.0.0.1:3000';
const output=process.env.KNOL_VERIFY_OUTPUT??'test-results/non-audio-direction';
await mkdir(output,{recursive:true});
await writeFile('apps/web/public/runtime/verify-non-audio-direction.html','<!doctype html><html><body style="margin:0"></body></html>');
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}});
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto(`${base}/runtime/verify-non-audio-direction.html`);
 await page.evaluate(()=>{window.presenterEvents=[];addEventListener('message',event=>{if(event.origin===location.origin)window.presenterEvents.push(event.data)});document.body.innerHTML='<iframe src="/runtime/index.html" width="1280" height="720" style="border:0"></iframe>'});
 await page.waitForFunction(()=>window.presenterEvents.some(e=>e.type==='ready'),null,{timeout:90000});
 let revision=0;
 const actor={id:'heungbu',name:'흥부',rect:{x:160,y:90,width:420,height:620},imagePath:'assets/legacy-18da4fc/heungbu.character.heungbu-swallow-care.webp'};
 const scene={contractVersion:1,sceneId:'timing-native',revision:0,width:1280,height:720,mode:'play',background:{imagePath:'assets/legacy-18da4fc/BG04-cottage-day.webp'},actors:[actor],dialogue:{speaker:'흥부',text:'시작 시점·지속 시간·순서를 현재 장면에서 확인합니다.'},presentation:{version:2,effects:[]}};
 const send=async changes=>{const value={...scene,...changes,revision:++revision};await page.evaluate(v=>document.querySelector('iframe').contentWindow.postMessage({protocol:1,type:'loadScene',seq:v.revision,revision:v.revision,payload:v},location.origin),value);await page.waitForFunction(r=>window.presenterEvents.some(e=>e.type==='sceneRendered'&&e.revision===r),revision,{timeout:30000});return value};
 const capture=async name=>PNG.sync.read(await page.screenshot({path:`${output}/${name}.png`}));
 const outside={x:700,y:100,width:300,height:250},actorRegion={x:160,y:90,width:420,height:400};
 const changed=(a,b,rect)=>{let count=0;for(let y=rect.y;y<rect.y+rect.height;y++)for(let x=rect.x;x<rect.x+rect.width;x++){const i=(y*a.width+x)*4;if(Math.abs(a.data[i]-b.data[i])+Math.abs(a.data[i+1]-b.data[i+1])+Math.abs(a.data[i+2]-b.data[i+2])>35)count++}return count};
 await send({});await page.waitForTimeout(200);const baseline=await capture('baseline');
 const cue={type:'flash-red',intensity:'strong',delayMs:1200,durationMs:2400,target:{kind:'background'},originEntry:'timed:0:0'};
 const timed={sceneId:'timed-effect',presentationEntry:'timed',presentation:{version:2,effects:[cue]}};
 await send(timed);await page.waitForTimeout(250);assert.ok(changed(baseline,await capture('before-effect'),outside)<100,'authored 1.2 second delay keeps background clear');
 await page.waitForTimeout(1500);assert.ok(changed(baseline,await capture('authored-long-effect'),outside)>1000,'authored duration keeps effect visible beyond old .8 second lifetime');
 await send(timed);await page.waitForTimeout(2200);assert.ok(changed(baseline,await capture('same-entry-effect-ended'),outside)<100,'same-entry revision preserves effect clock instead of restarting');
 const shake={sceneId:'long-shake',presentationEntry:'shake',presentation:{version:2,effects:[{type:'shake',intensity:'strong',durationMs:4000,originEntry:'shake:0:0'}]}};
 await send(shake);await page.waitForTimeout(1500);assert.ok(changed(baseline,await capture('long-shake'),actorRegion)>1000,'authored shake lasts beyond original .6 second limit');
 await send({...shake,reducedMotion:true});await page.waitForTimeout(100);assert.ok(changed(baseline,await capture('reduced-shake'),actorRegion)<100,'reduced motion suppresses shake');
 const motion={sceneId:'delayed-actor',presentationEntry:'motion',actors:[{...actor,motion:{version:1,type:'fade-out',durationMs:1500,delayMs:1500,offsetX:0}}]};
 await send(motion);await page.waitForTimeout(350);assert.ok(changed(baseline,await capture('actor-waits'),actorRegion)<100,'ATL waits for the authored delay before fade');
 await page.waitForTimeout(1550);assert.ok(changed(baseline,await capture('actor-fading'),actorRegion)>1000,'actor fade begins after authored pause');
 await send(motion);await page.waitForTimeout(1500);const ended=await capture('actor-final');
 await send({...motion,actors:[]});await page.waitForTimeout(150);assert.ok(changed(ended,await capture('actor-absent'),actorRegion)<100,'same-entry revision keeps final actor pose');
 const loop={sceneId:'timed-loop',presentationEntry:'loop',presentation:{version:2,effects:[{...cue,originEntry:'loop:0:0',delayMs:0,durationMs:350,repeat:'loop',periodMs:1000}]}};
 await send(loop);let bright=0,clear=0;for(let i=0;i<14;i++){await page.waitForTimeout(180);const difference=changed(baseline,await capture(`loop-${i}`),outside);if(difference>1000)bright++;if(difference<100)clear++;}
 assert.ok(bright>=2&&clear>=2,'authored loop uses duration for active phase and period for resting phase');
 await send({...loop,reducedMotion:true});await page.waitForTimeout(1200);assert.ok(changed(baseline,await capture('reduced-loop'),outside)<100,'reduced motion prevents repeating flash');
 for(const dimensions of [{width:1280,height:720},{width:720,height:1560},{width:1280,height:590}]){
  const viewport=dimensions.width<dimensions.height?{width:390,height:844}:{width:844,height:390};
  await page.setViewportSize(viewport);
  await page.evaluate(size=>{const f=document.querySelector('iframe');f.width=String(size.width);f.height=String(size.height)},viewport);
  const value=await send({...dimensions,sceneId:`confirm-${dimensions.height}`,presentationEntry:`confirm-${dimensions.height}`,presentation:{version:2,effects:[],transition:{type:'perspective-blackout',mode:'confirm',title:'선녀와 나무꾼의 시점이 바뀌는 장면에서 아주 긴 한국어 제목도 차분히 읽어 봅니다.',description:'숲을 바라보며 자신의 마음을 돌아보는 인물의 이야기를 읽습니다. '.repeat(12),actionLabel:'인물의 새로운 시점으로 이어서 읽기'}}});
  await page.waitForTimeout(180);
  const count=await page.evaluate(()=>window.presenterEvents.filter(e=>e.type==='presentationDone').length);
  await page.mouse.click(viewport.width*.85,viewport.height*.25);
  assert.equal(await page.evaluate(()=>window.presenterEvents.filter(e=>e.type==='presentationDone').length),count,'confirm transition remains locked until its button');
  await page.screenshot({path:`${output}/long-confirm-${dimensions.height}.png`});
  await page.mouse.click(viewport.width*.5,viewport.height*(dimensions.height-56)/dimensions.height);
  await page.waitForFunction(r=>window.presenterEvents.some(e=>e.type==='presentationDone'&&e.revision===r),value.revision,{timeout:10000});
 }
 assert.deepEqual(errors,[]);
 await writeFile(`${output}/result.json`,JSON.stringify({verified:['effect-delay','effect-duration','shake-duration','same-entry-clock','actor-delay-atl','actor-final-state','loop-active-rest','reduced-motion','long-korean-confirm-portrait-landscape'],samples:{bright,clear}},null,2));
 console.log('Native non-audio timing passed: effect delay/duration, shake, actor ATL pause, same-entry clocks, loop active/rest and reduced motion.');
}finally{await browser.close()}
