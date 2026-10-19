import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
const target='docs/architecture/evidence/approved-ui';
await mkdir(`${target}/actual`,{recursive:true});
const browser=await chromium.launch({headless:true});const results=[];
try {
 for(const [device,width,height] of [['web',1440,900],['tablet',1024,768],['phone',390,844],['phone-landscape',844,390]]){
  const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage();
  page.setDefaultTimeout(15000);await page.goto('http://127.0.0.1:3000/?view=editor');
  const status=page.getByTestId('story-runtime-status');
  const rendered=()=>expectRendered(page,status);
  await rendered();await page.screenshot({path:`${target}/actual/${device}-editor.png`,fullPage:true});
  const identity=await page.getByTestId('story-runtime-frame').elementHandle();
  await page.getByText('화면·대본 설정',{exact:true}).click();await page.getByRole('button',{name:'처음부터 읽기',exact:true}).click();await rendered();
  await page.screenshot({path:`${target}/actual/${device}-reading.png`});
  if(device.startsWith('phone')){await page.getByRole('button',{name:'읽기 도구 펼치기'}).click();await rendered();}
  const labels=['지난기록','저장','불러오기','자동','빠른 저장','빠른 불러오기'],rects=[];
  for(const name of labels){const button=page.getByRole('button',{name,exact:true});rects.push({name,...await button.boundingBox()});}
  await rendered();
  if(device.startsWith('phone'))await page.screenshot({path:`${target}/actual/${device}-tools.png`});
  const sameFrame=await identity.evaluate(node=>node===document.querySelector('[data-testid="story-runtime-frame"]'));
  const last=rects.at(-1),bottomGap=height-last.y-last.height;
  if(Math.abs(bottomGap-8)>.6&&device.startsWith('phone'))throw Error(`${device}: bottom gap ${bottomGap}`);
  if(!sameFrame)throw Error('Runtime remounted');
  await page.getByRole('button',{name:'읽기 메뉴',exact:true}).click();await page.screenshot({path:`${target}/actual/${device}-menu.png`});
  results.push({device,width,height,sameFrame,bottomGap,rects,renderedRevision:await status.getAttribute('data-rendered-revision'),sceneRevision:await status.getAttribute('data-scene-revision'),engineWidth:await status.getAttribute('data-engine-width'),engineHeight:await status.getAttribute('data-engine-height'),overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)});
  await context.close();
 }
 await writeFile(`${target}/native-screens.json`,JSON.stringify({scope:'Real RenPy in Chromium viewports; not physical Samsung or screenshot pixel parity',results},null,2));console.log(JSON.stringify(results));
}finally{await browser.close()}
async function expectRendered(page,status){
 await page.waitForFunction(()=>{const el=document.querySelector('[data-testid="story-runtime-status"]');return el&&Number(el.dataset.renderedRevision)>=0&&el.dataset.renderedRevision===el.dataset.sceneRevision;},{},{timeout:120000});
}
