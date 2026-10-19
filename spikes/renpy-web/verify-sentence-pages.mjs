import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {PNG} from 'pngjs';
const base=process.env.KNOL_VERIFY_URL??'http://127.0.0.1:3150';
const output=process.env.KNOL_VERIFY_OUTPUT??'test-results/sentence-pages';
await mkdir(output,{recursive:true});
const cases=[
 ['short','토끼는 잠시 멈췄다.'],
 ['sentences','토끼는 자라를 바라보았다. 잠시 생각하더니 천천히 입을 열었다. “용궁에 가면 무엇을 볼 수 있나요?” 자라는 바다를 가리켰다. 토끼는 고개를 끄덕였다.'],
 ['quotes','“정말이야?” 토끼가 물었다. 자라는 “물론이지!”라고 대답했다. 하지만 마음 한편은 편하지 않았다. ‘이 이야기를 모두 해도 될까?’ 자라는 잠시 망설였다.'],
 ['numbers','온도는 23.5도였다. 시각은 오후 3시 15분이었다. 약속 장소는 3.5km 앞이었다. 토끼는 0.75L 물병을 챙겼다. 준비는 끝났다.'],
 ['ellipsis','“그건… 아니야.” 자라는 말을 멈췄다. “그렇지만... 한번 들어 봐.” 토끼는 귀를 세웠다. 바다에서는 파도 소리가 들렸다.'],
 ['paragraphs','첫 번째 문단이다. 토끼는 바다를 바라보았다.\n\n두 번째 문단은 용궁에 관한 이야기다.\n자라는 천천히 설명했다. 토끼는 끝까지 들었다.'],
 ['long-sentence','토끼는 바닷가에서 불어오는 차가운 바람과 멀리서 들려오는 물결 소리를 느끼면서도 자라가 들려주는 신기한 용궁 이야기의 뒷부분이 너무나 궁금해서 조금도 움직이지 않고 긴 귀를 쫑긋 세운 채 끝까지 이야기를 들으려고 마음먹었다.'],
 ['unicode','아이들은 👨‍👩‍👧‍👦 가족과 함께 🇰🇷 바닷가에 갔다. 노래에는 e\u0301라는 글자도 있었다. 토끼는 👍🏽 하고 웃었다. 🌊 파도가 밀려왔다. 모두 즐거운 하루였다.'],
 ['url','주소는 https://example.com/story/chapter-3.5?mode=read 이다. 링크를 확인한 뒤 이야기를 계속 읽었다.'],
 ['unbroken','긴단어'.repeat(30)+' 👩‍🚀'.repeat(12)+' 끝이다.'],
];
const formats=[
 {name:'phone-portrait',display:{width:390,height:844},logical:{width:720,height:1558},font:32,box:{x:22,y:1210,width:676,height:192}},
 {name:'phone-landscape',display:{width:844,height:390},logical:{width:1280,height:592},font:26,box:{x:179,y:330,width:922,height:198}},
 {name:'desktop',display:{width:1280,height:720},logical:{width:1280,height:720},font:30,box:{x:48,y:510,width:1184,height:174}},
];
const browser=await chromium.launch({headless:true});
const reports=[];
try{
 const page=await browser.newPage({viewport:formats[0].display});
 await page.goto(base);
 await page.evaluate(()=>{window.presenterEvents=[];addEventListener('message',e=>{if(e.origin===location.origin)window.presenterEvents.push(e.data);});document.body.innerHTML='<iframe src="/runtime/index.html" style="position:fixed;inset:0;width:100%;height:100%;border:0"></iframe>';});
 await page.waitForFunction(()=>window.presenterEvents.some(e=>e.type==='ready'),null,{timeout:120000});
 let revision=0;
 const actor={id:'hero',name:'흥부',rect:{x:120,y:100,width:330,height:650},imagePath:'assets/legacy-18da4fc/heungbu.character.heungbu-swallow-care.webp',flipX:false,opacity:1,depth:0,emphasis:'normal',spectral:false};
 const send=async(format,text,id)=>{
  const scene={contractVersion:1,sceneId:id,revision:++revision,...format.logical,mode:'play',actors:[actor],dialogue:{speaker:'해설',text},choices:[],presentation:{effects:[]},textboxRect:format.box,dialogueStyle:{fontSize:format.font,speakerFontSize:format.font-2,padding:24}};
  await page.evaluate(s=>document.querySelector('iframe').contentWindow.postMessage({protocol:1,type:'loadScene',seq:s.revision,revision:s.revision,payload:s},location.origin),scene);
  await page.waitForFunction(r=>window.presenterEvents.some(e=>e.type==='sceneRendered'&&e.revision===r),revision,{timeout:30000});
  return page.evaluate(r=>window.presenterEvents.find(e=>e.type==='sceneRendered'&&e.revision===r),revision);
 };
 for(const format of formats){
  await page.setViewportSize(format.display);
  const scale=format.display.width/format.logical.width;
  for(const [name,text]of cases){
   const report=await send(format,text,`${format.name}-${name}`);
   assert.equal(report.textboxRect.y+report.textboxRect.height,format.box.y+format.box.height);
   assert.ok(report.textboxRect.y>=0);
   if(format.name!=='desktop')assert.ok(report.textboxRect.height*scale<format.display.height*.55,'mobile text must leave the majority of stage available');
   const initial=PNG.sync.read(await page.screenshot({path:`${output}/${format.name}-${name}-first.png`}));
   let clicks=0;
   for(;clicks<80;clicks++){
    await page.mouse.click((report.textboxRect.x+report.textboxRect.width-30)*scale,(report.textboxRect.y+report.textboxRect.height-24)*scale);
    await page.waitForTimeout(110);
    if(await page.evaluate(r=>window.presenterEvents.some(e=>e.type==='advanceRequested'&&e.revision===r),revision))break;
   }
   assert.ok(clicks<80,'all text pages eventually permit actual cut advance');
   const final=PNG.sync.read(await page.screenshot());
   const top=Math.floor(Math.max(0,report.dialogueRects.speaker.y-5)*scale);
   let changed=0;
   for(let y=0;y<top;y++)for(let x=0;x<format.display.width;x++){const i=(y*format.display.width+x)*4;if(Math.abs(initial.data[i]-final.data[i])+Math.abs(initial.data[i+1]-final.data[i+1])+Math.abs(initial.data[i+2]-final.data[i+2])>20)changed++;}
   assert.ok(changed<10,'paging must not move or resize characters');
   reports.push({format:format.name,case:name,textLength:text.length,pageAdvanceClicks:clicks+1,textbox:report.textboxRect,upperActorPixelDifference:changed});
  }
 }
 await writeFile(`${output}/result.json`,JSON.stringify({passed:reports.length,reports},null,2)+'\n');
 console.log(JSON.stringify({passed:reports.length},null,2));
}finally{await browser.close();}
