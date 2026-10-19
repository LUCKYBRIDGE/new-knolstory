import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
const base=process.env.KNOL_VERIFY_URL??'http://127.0.0.1:3150';
const output=process.env.KNOL_VERIFY_OUTPUT??'test-results/mobile-composition';
const fixtures=JSON.parse(await readFile(process.env.KNOL_COMPOSITION_SCENES??'.cache/sentence-pages/composition-scenes.json','utf8'));
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true});
const reports=[];
try{
 const page=await browser.newPage();
 await page.goto(base);
 await page.evaluate(()=>{window.presenterEvents=[];addEventListener('message',e=>{if(e.origin===location.origin)window.presenterEvents.push(e.data);});document.body.innerHTML='<iframe src="/runtime/index.html" style="position:fixed;inset:0;width:100%;height:100%;border:0"></iframe>';});
 await page.waitForFunction(()=>window.presenterEvents.some(e=>e.type==='ready'),null,{timeout:120000});
 for(const fixture of fixtures){
  await page.setViewportSize(fixture.display);
  // Each speaker example starts a fresh read. Reusing the same cut/text identity
  // intentionally preserves its current source offset across a layout revision.
  const scene={...fixture.scene,sceneId:`${fixture.scene.sceneId}-${fixture.who}`};
  const ids=scene.actors.map(a=>a.id);
  assert.deepEqual(ids,fixture.format==='portrait'?(fixture.who==='narration'?[]:[fixture.who]):['child','adult']);
  const before=JSON.stringify(scene);
  await page.evaluate(s=>document.querySelector('iframe').contentWindow.postMessage({protocol:1,type:'loadScene',seq:s.revision,revision:s.revision,payload:s},location.origin),scene);
  await page.waitForFunction(r=>window.presenterEvents.some(e=>e.type==='sceneRendered'&&e.revision===r),scene.revision,{timeout:30000});
  const rendered=await page.evaluate(r=>window.presenterEvents.find(e=>e.type==='sceneRendered'&&e.revision===r),scene.revision);
  const scale=fixture.display.width/scene.width;
  assert.equal(rendered.textboxRect.y+rendered.textboxRect.height,scene.textboxRect.y+scene.textboxRect.height);
  assert.ok(rendered.textboxRect.height*scale<fixture.display.height*.55);
  assert.equal(JSON.stringify(scene),before);
  await page.screenshot({path:`${output}/${fixture.format}-${fixture.who}.png`});
  if(fixture.format==='portrait'){
   await page.mouse.click((rendered.textboxRect.x+rendered.textboxRect.width-30)*scale,(rendered.textboxRect.y+rendered.textboxRect.height-24)*scale);
   await page.waitForTimeout(220);
   const expectedAdvance=process.env.KNOL_EXPECT_SINGLE_PAGE==='1'?1:0;
   assert.equal(await page.evaluate(r=>window.presenterEvents.filter(e=>e.type==='advanceRequested'&&e.revision===r).length,scene.revision),expectedAdvance,expectedAdvance?'generous portrait box displays the sample in one page':'first portrait text page keeps the same story cut');
   if(!expectedAdvance)await page.screenshot({path:`${output}/${fixture.format}-${fixture.who}-page2.png`});
  }
  reports.push({format:fixture.format,who:fixture.who,display:fixture.display,actors:scene.actors.map(a=>({id:a.id,rect:a.rect})),textbox:rendered.textboxRect,physicalTextboxHeight:rendered.textboxRect.height*scale,body:rendered.dialogueRects.body});
 }
 await writeFile(`${output}/result.json`,JSON.stringify({passed:reports.length,reports},null,2)+'\n');
 console.log(JSON.stringify({passed:reports.length,reports},null,2));
}finally{await browser.close();}
