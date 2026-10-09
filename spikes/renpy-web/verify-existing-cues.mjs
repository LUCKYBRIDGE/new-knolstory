/** Exercise each exact editorial cue in existing manuscripts through the actual native engine. */
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
const base=process.env.KNOL_VERIFY_URL??'http://127.0.0.1:3000';
const output='docs/architecture/evidence/existing-story-enhancement';
const cues=JSON.parse(await readFile(`${output}/runtime-cues.json`,'utf8'));
assert.equal(cues.length,131);
await writeFile('apps/web/public/runtime/verify-existing-cues.html','<!doctype html><html><body style="margin:0"></body></html>');
const browser=await chromium.launch({channel:process.env.KNOL_BROWSER_CHANNEL || undefined,headless:true});
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}});const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${base}/runtime/verify-existing-cues.html`);
 await page.evaluate(()=>{window.cueEvents=[];addEventListener('message',e=>{if(e.origin===location.origin)window.cueEvents.push(e.data);});document.body.innerHTML='<iframe src="/runtime/index.html" width="1280" height="720" style="border:0"></iframe>';});
 await page.waitForFunction(()=>window.cueEvents.some(e=>e.type==='ready'),null,{timeout:90000});
 let revision=0;const results=[];
 async function send(scene){const payload={...scene,revision:++revision};await page.evaluate(value=>document.querySelector('iframe').contentWindow.postMessage({protocol:1,type:'loadScene',seq:value.revision,revision:value.revision,payload:value},location.origin),payload);await page.waitForFunction(r=>window.cueEvents.some(e=>e.type==='sceneRendered'&&e.revision===r),revision,{timeout:30000});return page.evaluate(r=>window.cueEvents.find(e=>e.type==='sceneRendered'&&e.revision===r),revision);}
 let previousSoundCount=0;
 for(const [index,cue] of cues.entries()){
  const scene=cue.scene;let rendered=await send(scene);
  if(!rendered.audioState.unlocked){await page.mouse.click(640,70);await page.waitForTimeout(200);}
  const transition=scene.presentation?.transition;
  assert.notEqual(transition?.mode,'confirm',`${scene.sceneId} requires explicit native confirmation`);
  if(transition)await page.waitForFunction(r=>window.cueEvents.some(e=>e.type==='presentationDone'&&e.revision===r),revision,{timeout:10000});
  await page.waitForTimeout(350);
  rendered=await send(scene);
  await page.waitForFunction(({r,music,ambience,sounds})=>{const state=window.cueEvents.filter(e=>e.type==='sceneRendered'&&e.revision===r).at(-1)?.audioState;return state&&(state.musicPath??'')===music&&(state.ambiencePath??'')===ambience&&state.soundPlayCount===sounds;},{r:revision,music:scene.audio.music.action==='play'?scene.audio.music.audioPath:'',ambience:scene.audio.ambience?.action==='play'?scene.audio.ambience.audioPath:'',sounds:previousSoundCount+scene.audio.sounds.length},{timeout:10000});
  rendered=await page.evaluate(r=>window.cueEvents.filter(e=>e.type==='sceneRendered'&&e.revision===r).at(-1),revision);
  const state=rendered.audioState;
  assert.equal(state.musicPath??'',scene.audio.music.action==='play'?scene.audio.music.audioPath:'',scene.sceneId+' music');
  assert.equal(state.ambiencePath??'',scene.audio.ambience?.action==='play'?scene.audio.ambience.audioPath:'',scene.sceneId+' ambience');
  assert.equal(state.soundPlayCount-previousSoundCount,scene.audio.sounds.length,scene.sceneId+' one-shot sound count');
  await page.waitForTimeout(80);
  const repeat=await send({...scene,dialogue:{...scene.dialogue,text:scene.dialogue.text+' '}});
  assert.equal(repeat.audioState.soundPlayCount,state.soundPlayCount,scene.sceneId+' same-entry text revision must not replay sound');
  assert.equal(repeat.audioState.musicStartCount,state.musicStartCount,scene.sceneId+' same-entry music');
  assert.equal(repeat.audioState.ambienceStartCount,state.ambienceStartCount,scene.sceneId+' same-entry ambience');
  previousSoundCount=state.soundPlayCount;
  results.push({catalogId:cue.catalogId,sceneId:scene.sceneId,intent:cue.intent,musicPath:state.musicPath,ambiencePath:state.ambiencePath,soundPaths:scene.audio.sounds.map(s=>s.audioPath),soundPlayCount:state.soundPlayCount,sameEntryNoReplay:true,presentationCompleted:true});
  if(index%20===0)console.log(`Verified ${index+1}/${cues.length}`);
 }
 assert.deepEqual(errors,[]);
 const report={browser:'Chrome',runtime:'RenPy Web 8.5.3',scope:'all 131 exact authored cue scenes; independent cut entry and same-entry revision, not all branch combinations',verifiedCuts:results.length,results};
 await writeFile(`${output}/all-cues-native.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({verifiedCuts:results.length,works:new Set(results.map(r=>r.catalogId)).size,soundEntrances:previousSoundCount}));
}finally{await browser.close();}
