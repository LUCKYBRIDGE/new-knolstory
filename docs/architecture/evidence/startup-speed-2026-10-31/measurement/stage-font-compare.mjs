// Old against new runtime, same scenes: page boundaries, text box geometry and the drawn pixels.
// Each side is a static candidate served by scripts/serve-static-candidate.py; the runtime page is
// loaded alone in an iframe and driven with the same RuntimeScene messages the host sends.
// Usage, from the repository root (both servers running):
//   KNOL_OLD=http://127.0.0.1:3150 KNOL_NEW=http://127.0.0.1:3151 KNOL_OUT=.cache/font-compare \
//   node docs/architecture/evidence/startup-speed-2026-10-31/measurement/stage-font-compare.mjs
import {chromium} from '@playwright/test';
import {PNG} from 'pngjs';
import {mkdir,writeFile} from 'node:fs/promises';

const sides={old:process.env.KNOL_OLD??'http://127.0.0.1:3150',new:process.env.KNOL_NEW??'http://127.0.0.1:3151'};
const out=process.env.KNOL_OUT??'.cache/font-compare';
await mkdir(out,{recursive:true});
const cases=[
 ['short','토끼는 잠시 멈췄다.'],
 ['sentences','토끼는 자라를 바라보았다. 잠시 생각하더니 천천히 입을 열었다. “용궁에 가면 무엇을 볼 수 있나요?” 자라는 바다를 가리켰다. 토끼는 고개를 끄덕였다.'],
 ['numbers-latin','온도는 23.5도였다. 시각은 오후 3시 15분이었다. 약속 장소는 3.5km 앞이었다. Ren’Py와 KnolStory, ABC xyz 0123456789.'],
 ['punctuation','「서시」 『하늘과 바람과 별과 시』 … — · ㉠ ㈜ ㎏ ㎡ ※ ★ ♪ ← → ①②③'],
 ['paragraphs','첫 번째 문단이다. 토끼는 바다를 바라보았다.\n\n두 번째 문단은 용궁에 관한 이야기다.\n자라는 천천히 설명했다. 토끼는 끝까지 들었다.'],
 ['long',('토끼는 바닷가에서 불어오는 차가운 바람과 멀리서 들려오는 물결 소리를 느끼면서도 자라가 들려주는 신기한 용궁 이야기의 뒷부분이 너무나 궁금해서 조금도 움직이지 않고 긴 귀를 쫑긋 세운 채 끝까지 이야기를 들으려고 마음먹었다. ').repeat(4)],
 ['jamo-kana','옛한글 ᄒᆞᆫ글 ᄀᆞᄅᆞᆷ, 자모 ㄱㄴㄷ ㅏㅑㅓ, 가나 かなカナ.'],
 ['emoji','아이들은 👨‍👩‍👧‍👦 가족과 함께 🇰🇷 바닷가에 갔다. 노래에는 e\u0301라는 글자도 있었다. 토끼는 👍🏽 하고 웃었다.'],
 ['hanja','한자는 이제 무대에 없다: 同一 事件 山川.'],
];
const formats=[
 {name:'phone-portrait',display:{width:390,height:844},logical:{width:720,height:1558},font:32,box:{x:22,y:1210,width:676,height:192}},
 {name:'desktop',display:{width:1280,height:720},logical:{width:1280,height:720},font:30,box:{x:48,y:510,width:1184,height:174}},
];
async function run(base){
 const browser=await chromium.launch({headless:true});
 const results={};
 try{
  const page=await browser.newPage({viewport:formats[0].display,deviceScaleFactor:1});
  await page.goto(base);
  await page.evaluate(()=>{window.presenterEvents=[];addEventListener('message',e=>{if(e.origin===location.origin)window.presenterEvents.push(e.data);});document.body.innerHTML='<iframe src="/runtime/index.html" style="position:fixed;inset:0;width:100%;height:100%;border:0"></iframe>';});
  await page.waitForFunction(()=>window.presenterEvents.some(e=>e.type==='ready'),null,{timeout:180000});
  let revision=0;
  const rendered=(r,count)=>page.waitForFunction(([r,count])=>window.presenterEvents.filter(e=>e.type==='sceneRendered'&&e.revision===r).length>=count,[r,count],{timeout:30000});
  const last=r=>page.evaluate(r=>window.presenterEvents.filter(e=>e.type==='sceneRendered'&&e.revision===r).at(-1),r);
  const post=message=>page.evaluate(m=>document.querySelector('iframe').contentWindow.postMessage(m,location.origin),message);
  for(const format of formats){
   await page.setViewportSize(format.display);
   for(const [name,text]of [...cases,['choices','어느 길로 갈까?']]){
    const id=`${format.name}-${name}`;
    const scene={contractVersion:1,sceneId:id,revision:++revision,...format.logical,mode:'play',actors:[],dialogue:{speaker:'해설',text},choices:name==='choices'?[{id:'a',text:'바다로 간다'},{id:'b',text:'숲으로 돌아간다, 천천히 걸어서'}]:[],presentation:{effects:[]},textboxRect:format.box,dialogueStyle:{fontSize:format.font,speakerFontSize:format.font-2,padding:24}};
    await post({protocol:1,type:'loadScene',seq:scene.revision,revision:scene.revision,payload:scene});
    await rendered(scene.revision,1);await page.waitForTimeout(250);
    const pages=[];
    for(let index=0;index<12;index++){
     const report=await last(scene.revision);
     const file=`${out}/${base.endsWith('3150')?'old':'new'}-${id}-${index}.png`;
     await page.screenshot({path:file});
     pages.push({page:report.dialoguePage??null,textboxRect:report.textboxRect,dialogueRects:report.dialogueRects??null,choicesRect:report.choicesRect??null,file});
     if(!report.dialoguePage||report.dialoguePage.index>=report.dialoguePage.count-1)break;
     await post({protocol:1,type:'nextDialoguePage',sceneId:id,revision:scene.revision});
     await rendered(scene.revision,index+2);await page.waitForTimeout(200);
    }
    results[id]=pages;
   }
  }
 }finally{await browser.close();}
 return results;
}
function diff(a,b){
 const x=PNG.sync.read(a),y=PNG.sync.read(b);
 if(x.width!==y.width||x.height!==y.height)return {sizeDiffers:true};
 let changed=0,strong=0,max=0;
 for(let i=0;i<x.data.length;i+=4){const d=Math.max(Math.abs(x.data[i]-y.data[i]),Math.abs(x.data[i+1]-y.data[i+1]),Math.abs(x.data[i+2]-y.data[i+2]));if(d>0)changed++;if(d>64)strong++;if(d>max)max=d;}
 return {pixels:x.width*x.height,changed,over64:strong,max};
}
const {readFile}=await import('node:fs/promises');
const old=await run(sides.old),now=await run(sides.new);
const report=[];
for(const id of Object.keys(old)){
 const a=old[id],b=now[id];
 const samePages=JSON.stringify(a.map(p=>p.page))===JSON.stringify(b.map(p=>p.page));
 const sameBox=JSON.stringify(a.map(p=>[p.textboxRect,p.dialogueRects,p.choicesRect]))===JSON.stringify(b.map(p=>[p.textboxRect,p.dialogueRects,p.choicesRect]));
 const pixels=[];for(let i=0;i<Math.min(a.length,b.length);i++)pixels.push(diff(await readFile(a[i].file),await readFile(b[i].file)));
 report.push({id,pages:{old:a.length,new:b.length},samePageBoundaries:samePages,sameGeometry:sameBox,pixels,oldPages:a.map(p=>p.page),newPages:b.map(p=>p.page)});
}
await writeFile(`${out}/compare.json`,JSON.stringify({sides,measuredAt:new Date().toISOString(),report},null,1)+'\n');
for(const row of report)console.log(`${row.id.padEnd(30)} pages ${row.pages.old}/${row.pages.new} boundaries ${row.samePageBoundaries?'same':'DIFFERENT'} geometry ${row.sameGeometry?'same':'DIFFERENT'} pixels ${row.pixels.map(p=>p.sizeDiffers?'size!':`${p.changed}/${p.over64}/${p.max}`).join(' ')}`);
