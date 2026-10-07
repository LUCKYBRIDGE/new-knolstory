/** Real native presenter verification: resolved scenes only, no substitute renderer. */
import assert from 'node:assert/strict';
import { PNG } from 'pngjs';
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const base = process.env.KNOL_VERIFY_URL ?? 'http://127.0.0.1:3000';
await writeFile('apps/web/public/runtime/verify.html', '<!doctype html><html><body style="margin:0"></body></html>');
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({viewport: {width:1280,height:800}});
  const requests = [];
  page.on('request', request => { if(request.url().includes('/game/assets/')) requests.push(request.url()); });
  await page.goto(base + '/runtime/verify.html');
  await page.evaluate(() => {
    window.presenterEvents = [];
    addEventListener('message', e => { if(e.origin === location.origin) window.presenterEvents.push(e.data); });
    document.body.innerHTML = '<iframe src="/runtime/index.html" width="1280" height="720" style="border:0"></iframe>';
  });
  await page.waitForFunction(() => window.presenterEvents.some(e=>e.type==='ready'), null, {timeout:90000});
  const scene = {
    contractVersion:1, sceneId:'actual-assets',revision:1,width:1280,height:720,mode:'play', reducedMotion:false,
    background:{imagePath:'assets/legacy-18da4fc/BG04-cottage-day.webp'},
    actors:[{id:'heungbu', name:'흥부', rect:{x:160,y:90,width:420,height:620},imagePath:'assets/legacy-18da4fc/heungbu.character.heungbu-swallow-care.webp',flipX:false,opacity:1,depth:0,emphasis:'normal',spectral:false}],
    dialogue:{speaker:'흥부',text:'{color=#f00}태그가 아닌 글자{/color} [untrusted] 한국어 대사'}, choices:[],
    presentation:{effects:[],transition:{type:'perspective-blackout',durationMs:100,mode:'confirm',title:'시점 전환',actionLabel:'계속'}}
  };
  const send = async value => {
    await page.evaluate(s => document.querySelector('iframe').contentWindow.postMessage({protocol:1,type:'loadScene',seq:s.revision,revision:s.revision,payload:s},location.origin),value);
    await page.waitForFunction(r=>window.presenterEvents.some(e=>e.type==='sceneRendered'&&e.revision===r),value.revision,{timeout:30000});
  };
  await send(scene);
  await page.screenshot({path:'.cache/renpy/transition.png'});
  await page.mouse.click(640, 475);
  await page.waitForFunction(()=>window.presenterEvents.some(e=>e.type==='presentationDone'),null,{timeout:10000});
  await page.mouse.click(1140, 660);
  await page.waitForFunction(()=>window.presenterEvents.some(e=>e.type==='advanceRequested'),null,{timeout:10000});
  await mkdir('test-results/presenter',{recursive:true});
  const baselinePng = PNG.sync.read(await page.screenshot({path:'test-results/presenter/actual-assets.png'}));
  function changedPixels(buffer) {
    const actual = PNG.sync.read(buffer);
    let count = 0;
    for(let i=0;i<actual.data.length;i+=4) if(Math.abs(actual.data[i]-baselinePng.data[i])+Math.abs(actual.data[i+1]-baselinePng.data[i+1])+Math.abs(actual.data[i+2]-baselinePng.data[i+2])>30) count++;
    return count;
  }
  await send({...scene,sceneId:'choices',revision:2,presentation:{effects:[]},choices:[{id:'first',text:'선택지 {b}그대로[/b]'}, {id:'second',text:'두 번째 선택지'}]});
  await page.mouse.click(640, 155);
  await page.waitForFunction(()=>window.presenterEvents.some(e=>e.type==='choiceSelected'&&e.choiceId==='first'),null,{timeout:10000});
  let revision=2;
  for(const type of ['shake','flash-red','fade-black','crack','spotlight','flash','screen-crack']) {
    await send({...scene,sceneId:`effect-${type}`,revision:++revision,presentation:{effects:[{type,intensity:'strong',trigger:'scene-enter',delayMs:0}]}});
    await page.waitForTimeout(180);
    assert.ok(changedPixels(await page.screenshot({path:`test-results/presenter/${type}.png`})) > 1000, `${type} must change actual native rendered pixels`);
  }
  for(const type of ['shake','crack']) {
    await send({...scene,sceneId:`default-intensity-${type}`,revision:++revision,presentation:{effects:[{type}]}});
    await page.waitForTimeout(180);
    assert.ok(changedPixels(await page.screenshot({path:`test-results/presenter/default-intensity-${type}.png`})) > 1000, `${type} defaults to normal intensity`);
  }
  for(const type of ['flashback','fractured-reality']) {
    await send({...scene,sceneId:`look-${type}`,revision:++revision,presentation:{effects:[],look:{type,intensity:'normal'}},actors:scene.actors.map(a=>({...a,spectral:true,emphasis:'dim',flipX:true}))});
    assert.ok(changedPixels(await page.screenshot({path:`test-results/presenter/${type}.png`})) > 1000, `${type} must change actual native rendered pixels`);
    await send({...scene,sceneId:`look-soft-${type}`,revision:++revision,presentation:{effects:[],look:{type,intensity:'soft'}}});
    const soft = PNG.sync.read(await page.screenshot());
    await send({...scene,sceneId:`look-strong-${type}`,revision:++revision,presentation:{effects:[],look:{type,intensity:'strong'}}});
    const strong = PNG.sync.read(await page.screenshot());
    let intensityDifference = 0;
    for(let i=0;i<soft.data.length;i+=4) if(Math.abs(soft.data[i]-strong.data[i])+Math.abs(soft.data[i+1]-strong.data[i+1])+Math.abs(soft.data[i+2]-strong.data[i+2])>30) intensityDifference++;
    assert.ok(intensityDifference > 1000, `${type} honors authored look intensity`);
  }
  await send({...scene,sceneId:'reduced-motion',revision:++revision,reducedMotion:true,presentation:{effects:[{type:'shake',intensity:'strong',trigger:'scene-enter',delayMs:0}]}});
  await page.waitForTimeout(180);
  assert.ok(changedPixels(await page.screenshot()) < 1000, 'Reduced motion suppresses shaking');
  for(const type of ['white-fade','fade-black']) {
    const currentRevision = ++revision;
    await send({...scene,sceneId:`transition-${type}`,revision:currentRevision,presentation:{effects:[],transition:{type,durationMs:400,mode:'auto'}}});
    await page.waitForFunction(r=>window.presenterEvents.some(e=>e.type==='presentationDone'&&e.revision===r),currentRevision,{timeout:10000});
  }
  await send({...scene,sceneId:'contain-fit',revision:++revision,actors:[],background:{imagePath:scene.actors[0].imagePath,fit:'contain'},presentation:{effects:[]}});
  const contained = PNG.sync.read(await page.screenshot({path:'test-results/presenter/contain-fit.png'}));
  await send({...scene,sceneId:'cover-fit',revision:++revision,actors:[],background:{imagePath:scene.actors[0].imagePath,fit:'cover'},presentation:{effects:[]}});
  const covered = PNG.sync.read(await page.screenshot({path:'test-results/presenter/cover-fit.png'}));
  let fitDifference = 0;
  for(let i=0;i<contained.data.length;i+=4) if(Math.abs(contained.data[i]-covered.data[i])+Math.abs(contained.data[i+1]-covered.data[i+1])+Math.abs(contained.data[i+2]-covered.data[i+2])>30) fitDifference++;
  assert.ok(fitDifference>1000,'Native contain and cover preserve aspect with distinct image extent');
  const endingRevision = ++revision;
  await send({...scene,sceneId:'ended',revision:endingRevision,ended:true,presentation:{effects:[]}});
  await page.mouse.click(1140,660);
  await page.waitForTimeout(150);
  assert.ok(!await page.evaluate(r=>window.presenterEvents.some(e=>e.type==='advanceRequested'&&e.revision===r),endingRevision),'An ending cannot advance the native presenter');
  assert.ok(requests.length <= 2, 'Unused shared assets must remain lazy');
  console.log(JSON.stringify({events:await page.evaluate(()=>window.presenterEvents),progressiveImageRequests:requests.length},null,2));
} finally {await browser.close();}
