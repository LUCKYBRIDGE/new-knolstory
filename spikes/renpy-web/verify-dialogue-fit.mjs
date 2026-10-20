import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {PNG} from 'pngjs';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.KNOL_VERIFY_URL??'http://127.0.0.1:3150';
const output=process.env.KNOL_VERIFY_OUTPUT??'test-results/dialogue-fit';
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true});
const reports=[];
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}});
 await page.goto(base);
 await page.evaluate(()=>{
  window.presenterEvents=[];
  addEventListener('message',e=>{if(e.origin===location.origin)window.presenterEvents.push(e.data);});
  document.body.innerHTML='<iframe src="/runtime/index.html" style="position:fixed;inset:0;width:100%;height:100%;border:0"></iframe>';
 });
 await page.waitForFunction(()=>window.presenterEvents.some(e=>e.type==='ready'),null,{timeout:120000});
 let revision=0;
 const actor={id:'fixed-actor',name:'흥부',rect:{x:130,y:50,width:340,height:600},imagePath:'assets/legacy-18da4fc/heungbu.character.heungbu-swallow-care.webp',flipX:false,opacity:1,depth:0,emphasis:'normal',spectral:false};
 const scene={contractVersion:1,sceneId:'intrinsic-fit',width:1280,height:720,mode:'edit',actors:[actor],dialogue:{speaker:'해설',text:'짧은 글입니다.'},choices:[],presentation:{effects:[]},textboxRect:{x:48,y:510,width:1184,height:174},dialogueStyle:{fontSize:30,speakerFontSize:28,padding:24}};
 const send=async value=>{
  const payload={...scene,...value,revision:++revision};
  await page.evaluate(s=>document.querySelector('iframe').contentWindow.postMessage({protocol:1,type:'loadScene',seq:s.revision,revision:s.revision,payload:s},location.origin),payload);
  await page.waitForFunction(r=>window.presenterEvents.some(e=>e.type==='sceneRendered'&&e.revision===r),revision,{timeout:60000});
  return page.evaluate(r=>window.presenterEvents.find(e=>e.type==='sceneRendered'&&e.revision===r),revision);
 };
 for(const size of [{width:1280,height:720},{width:720,height:1280},{width:1280,height:600}]){
  await page.setViewportSize(size);
  const box={x:48,y:size.height-210,width:size.width-96,height:174};
  const current={width:size.width,height:size.height,textboxRect:box};
  const short=await send(current);
  const before=PNG.sync.read(await page.screenshot());
  const text=Array.from({length:7},(_,i)=>`${i+1}. 긴 한국어 해설의 마지막 줄까지 스크롤 없이 읽습니다.`).join('\n');
  const long=await send({...current,dialogue:{speaker:'해설',text}});
  assert.ok(long.textboxRect.height>short.textboxRect.height,'measured multiline text expands textbox');
  assert.equal(long.textboxRect.y+long.textboxRect.height,box.y+box.height,'same bottom anchor');
  assert.ok(long.textboxRect.y>=0);
  assert.equal(long.textboxRect.width,box.width);
  assert.ok(long.dialogueRects.body.height>=7*30,'all seven lines fit at original font size');
  const after=PNG.sync.read(await page.screenshot({path:`${output}/${size.width}x${size.height}-long.png`}));
  const top=Math.floor(Math.min(short.dialogueRects.speaker.y,long.dialogueRects.speaker.y)-5);
  let changed=0;
  for(let y=0;y<top;y++)for(let x=0;x<size.width;x++){
   const i=(y*size.width+x)*4;
   if(Math.abs(before.data[i]-after.data[i])+Math.abs(before.data[i+1]-after.data[i+1])+Math.abs(before.data[i+2]-after.data[i+2])>20)changed++;
  }
  assert.ok(changed<10,`actor pixels above textbox must stay identical (${changed})`);
  reports.push({size,short:short.textboxRect,long:long.textboxRect,body:long.dialogueRects.body,unchangedUpperActorPixels:changed});
 }
 await page.setViewportSize({width:1280,height:720});
 const extremeText=Array.from({length:60},(_,i)=>`${i+1}. 화면보다 긴 원고도 내용이 빠지지 않고 다음 글로 이어집니다.`).join('\n');
 const paged=await send({mode:'play',dialogue:{speaker:'해설',text:extremeText}});
 assert.ok(paged.textboxRect.y>=0&&paged.textboxRect.y+paged.textboxRect.height===684);
 const firstPage=PNG.sync.read(await page.screenshot({path:`${output}/overflow-page1.png`}));
 const clickNext=async()=>{
  await page.mouse.click(paged.textboxRect.x+paged.textboxRect.width-30,paged.textboxRect.y+paged.textboxRect.height-24);
  await page.waitForTimeout(180);
 };
 await clickNext();
 const secondPage=PNG.sync.read(await page.screenshot({path:`${output}/overflow-page2.png`}));
 let textDifference=0;
 for(let i=0;i<firstPage.data.length;i+=4)if(Math.abs(firstPage.data[i]-secondPage.data[i])+Math.abs(firstPage.data[i+1]-secondPage.data[i+1])+Math.abs(firstPage.data[i+2]-secondPage.data[i+2])>20)textDifference++;
 assert.ok(textDifference>1000,'native next input changes text page');
 assert.equal(await page.evaluate(r=>window.presenterEvents.filter(e=>e.type==='advanceRequested'&&e.revision===r).length,revision),0,'first text-page input must not advance story cut');
 let pageInputs=1;
 for(;pageInputs<30;pageInputs++){
  if(await page.evaluate(r=>window.presenterEvents.some(e=>e.type==='advanceRequested'&&e.revision===r),revision))break;
  await clickNext();
 }
 assert.ok(pageInputs<30,'last text page permits story advance');
 const overflow={textbox:paged.textboxRect,body:paged.dialogueRects.body,pageInputsBeforeStoryAdvance:pageInputs,firstPageAdvanceEvents:0,textDifference};
 const choiceScene=await send({sceneId:'choice-overflow',mode:'play',dialogue:{speaker:'해설',text:extremeText},choices:[{id:'first',text:'첫 번째 길'},{id:'second',text:'두 번째 길'}]});
 assert.ok(choiceScene.choicesRect.height>=140,'long choice text retains reachable choice space');
 let choiceInputs=0;
 for(;choiceInputs<25;choiceInputs++){
  await page.mouse.click(choiceScene.choicesRect.x+choiceScene.choicesRect.width/2,choiceScene.choicesRect.y+164);
  await page.waitForTimeout(100);
  if(await page.evaluate(r=>window.presenterEvents.some(e=>e.type==='choiceSelected'&&e.revision===r),revision))break;
  await page.mouse.click(choiceScene.textboxRect.x+choiceScene.textboxRect.width-30,choiceScene.textboxRect.y+choiceScene.textboxRect.height-24);
  await page.waitForTimeout(100);
 }
 assert.ok(choiceInputs>0&&choiceInputs<25,'choice only becomes actionable after text pages');
 assert.equal(await page.evaluate(r=>window.presenterEvents.find(e=>e.type==='choiceSelected'&&e.revision===r)?.choiceId,revision),'first');
 await page.screenshot({path:`${output}/overflow-choices.png`});
 const choices={rect:choiceScene.choicesRect,textbox:choiceScene.textboxRect,pagesBeforeChoice:choiceInputs};
 await writeFile(`${output}/result.json`,JSON.stringify({reports,overflow,choices},null,2)+'\n');
 console.log(JSON.stringify({passed:reports.length+2,reports,overflow,choices},null,2));
}finally{await browser.close();}
