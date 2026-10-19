import {chromium} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {PNG} from 'pngjs';
const directory='docs/architecture/evidence/ui-clarity';
const browser=await chromium.launch();
try {
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 const source=JSON.parse(await readFile('tests/fixtures/stories/onggojib.json','utf8'));
 await page.goto('http://127.0.0.1:3000/?view=editor');
 await page.getByText('작품 관리',{exact:true}).click();
 await page.getByLabel('작품 파일 가져오기').setInputFiles({name:'ui-proof.knolstory',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({documentType:'story-maker-project',schemaVersion:source.scores?6:5,savedAt:'2026-10-11T00:00:00.000Z',appVersion:'verification',project:source}))});
 await page.getByRole('button',{name:'내 사본으로 가져오기',exact:true}).click();
 const cut=source.lines.find(line=>line.speakerName==='시점 전환'&&line.text==='옹고집의 시점');
 await page.getByLabel('현재 장과 컷 이동').selectOption(cut.id);
 await page.getByRole('button',{name:'이 컷부터 재생',exact:true}).click();
 await page.waitForFunction(()=>{const node=document.querySelector('[data-testid="story-runtime-status"]');return Number(node?.dataset.renderedRevision)>=0&&node?.dataset.renderedRevision===node?.dataset.sceneRevision;},{},{timeout:120000});
 const data=await page.getByTestId('story-runtime-status').evaluate(node=>({...node.dataset}));
 const rects=JSON.parse(data.dialogueRects),frame=await page.getByTestId('story-runtime-frame').boundingBox(),scale=frame.width/Number(data.sceneWidth);
 const clip={x:frame.x+(rects.body.x-24)*scale,y:frame.y+(rects.speaker.y-8)*scale,width:(rects.body.width+92)*scale,height:(rects.body.y+rects.body.height+20-rects.speaker.y+8)*scale};
 // Verify native text paint as well as predicted/report geometry before keeping a screenshot.
 const bodyClip={x:frame.x+(rects.body.x+2)*scale,y:frame.y+(rects.body.y+2)*scale,width:(rects.body.width-4)*scale,height:(rects.body.height-4)*scale};
 let ink=0;
 for(let retry=0;retry<8;retry++){
  const pixels=PNG.sync.read(await page.screenshot({clip:bodyClip}));ink=0;
  for(let index=0;index<pixels.data.length;index+=4)if(pixels.data[index]<100&&pixels.data[index+1]<110&&pixels.data[index+2]<110)ink++;
  if(ink>80)break;
  await page.waitForTimeout(100);
 }
 if(ink<=80)throw Error('Native dialogue glyphs are not visible');
 await page.screenshot({path:`${directory}/viewpoint-fixed.png`,clip});
 await writeFile(`${directory}/viewpoint-fixed-geometry.json`,JSON.stringify({source:{speaker:cut.speakerName,text:cut.text},rects,scale,clip,bodyInkPixels:ink,gap:rects.body.y-rects.speaker.y-rects.speaker.height},null,2));
 console.log(JSON.stringify({ink,gap:rects.body.y-rects.speaker.y-rects.speaker.height}));
} finally {await browser.close();}
